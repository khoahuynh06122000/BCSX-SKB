import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Receipt, AlertTriangle, Calculator } from "lucide-react";
import { format } from "date-fns";
import type { Transaction, Product, Partner } from "../types";
import {
  DEBT_COLUMNS,
  buildDebtRow,
  invoiceUnitOf,
  PRICE_TABLE,
  type DebtRow,
} from "../lib/invoice";
import { cn, formatNumber } from "../lib/utils";

/**
 * KẾT XUẤT FILE CÔNG NỢ
 *
 * Gom toàn bộ giao dịch XUẤT KHO trong một kỳ thành bảng "Chốt" đúng như file
 * công nợ hàng tháng của bộ phận: mỗi dòng là một (đơn vị × mã vật tư), số
 * lượng cộng dồn cả kỳ.
 *
 * Cột "Số hóa đơn" để trống theo yêu cầu — kế toán điền số thật trên Excel sau
 * khi phát hành. Mọi cột tiền và thuế app tính sẵn theo công thức trong
 * src/lib/invoice.ts.
 *
 * Không gộp: mặt hàng chưa có mã vật tư (không lên được hóa đơn) và các giao
 * dịch còn đang đi đường. Cả hai đều được báo rõ trên màn hình chứ không âm
 * thầm bỏ đi.
 */

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
}

export default function DebtExport({ transactions, products, partners }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [fromDate, setFromDate] = useState(
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
  );
  const [toDate, setToDate] = useState(today);
  const [invoiceDate, setInvoiceDate] = useState(today);

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const partnerById = useMemo(() => {
    const m = new Map<string, Partner>();
    partners.forEach((p) => m.set(p.id, p));
    return m;
  }, [partners]);

  const result = useMemo(() => {
    const from = new Date(fromDate + "T00:00:00");
    const to = new Date(toDate + "T23:59:59");

    const inRange = transactions.filter((t) => {
      if (t.type !== "OUT") return false;
      const d = new Date(t.date);
      return d >= from && d <= to;
    });

    const inTransit = inRange.filter((t) => t.status === "in_transit");
    const usable = inRange.filter((t) => t.status !== "in_transit");

    // Gom theo (don vi, ma vat tu) — dung ma vat tu chu khong dung ten hang,
    // vi hai san pham co the trung ten nhung khac ma.
    const groups = new Map<
      string,
      {
        partnerName: string;
        sapCode: string;
        materialCode: string;
        productName: string;
        unit: "LIT" | "LON";
        quantity: number;
      }
    >();
    const missingCode = new Map<string, number>();

    usable.forEach((t) => {
      const product = productById.get(t.productId);
      const code = product?.materialCode;
      if (!code) {
        const name = product?.name || t.productName || "(không rõ)";
        missingCode.set(name, (missingCode.get(name) || 0) + t.quantity);
        return;
      }
      const partner = partnerById.get(t.partnerId);
      const partnerName = partner?.name || t.partnerName || "(không rõ)";
      const key = partnerName + "|" + code;
      const prev = groups.get(key);
      if (prev) {
        prev.quantity += t.quantity;
      } else {
        groups.set(key, {
          partnerName,
          sapCode: partner?.sapCode || "",
          materialCode: code,
          productName: product?.name || t.productName,
          unit: invoiceUnitOf(product?.category || t.category),
          quantity: t.quantity,
        });
      }
    });

    // Sap xep theo don vi roi theo ma vat tu, giong thu tu file goc
    const sorted = Array.from(groups.values()).sort(
      (a, b) =>
        a.partnerName.localeCompare(b.partnerName) ||
        a.materialCode.localeCompare(b.materialCode),
    );

    const period = `${format(from, "dd.MM")}-${format(to, "dd.MM")}`;
    const invDate = format(new Date(invoiceDate + "T00:00:00"), "dd.MM.yyyy");

    const rows: DebtRow[] = sorted.map((g, i) =>
      buildDebtRow({
        deliveryPeriod: period,
        invoiceDate: invDate,
        index: i + 1,
        unitName: g.partnerName,
        materialCode: g.materialCode,
        productName: g.productName,
        unit: g.unit,
        quantity: g.quantity,
        sapCode: g.sapCode,
      }),
    );

    const totals = rows.reduce(
      (s, r) => ({
        quantity: s.quantity + r["Số lượng"],
        amount: s.amount + r["Thành tiền"],
        vat: s.vat + r["VAT"],
        excise: s.excise + r["Thuế TTDB"],
        revenue: s.revenue + r["Doanh thu 511"],
      }),
      { quantity: 0, amount: 0, vat: 0, excise: 0, revenue: 0 },
    );

    return {
      rows,
      totals,
      period,
      inTransitCount: inTransit.length,
      missingCode: Array.from(missingCode.entries()).map(([name, qty]) => ({
        name,
        qty,
      })),
      sourceCount: usable.length,
    };
  }, [transactions, productById, partnerById, fromDate, toDate, invoiceDate]);

  const handleDownload = () => {
    if (!result.rows.length) return;
    const ws = XLSX.utils.json_to_sheet(result.rows, {
      header: DEBT_COLUMNS as string[],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chốt");
    XLSX.writeFile(
      wb,
      `Cong_no_${format(new Date(fromDate), "ddMM")}-${format(new Date(toDate), "ddMM.yyyy")}.xlsx`,
    );
  };

  const money = (n: number) => formatNumber(Math.round(n));

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <Receipt className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          Gom giao dịch xuất kho trong kỳ thành bảng <strong>Chốt</strong> đúng
          mẫu file công nợ: mỗi dòng một đơn vị × một mã vật tư, đủ 21 cột, tiền
          và thuế tính sẵn. Cột <strong>Số hóa đơn</strong> để trống để kế toán
          điền số thật trên Excel.
        </p>
      </div>

      {/* ----- Chọn kỳ ----- */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Từ ngày", value: fromDate, set: setFromDate },
          { label: "Đến ngày", value: toDate, set: setToDate },
          { label: "Ngày hóa đơn", value: invoiceDate, set: setInvoiceDate },
        ].map((f) => (
          <div key={f.label}>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {f.label}
            </label>
            <input
              type="date"
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
            />
          </div>
        ))}
      </div>

      {/* ----- Bảng giá đang áp dụng ----- */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-slate-400" />
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Đơn giá đang áp dụng
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
          <p>
            Bia hơi (LIT): SKB→DNC{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LIT.skbToDnc)}
            </span>{" "}
            · DNC→ĐVTV{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LIT.dncToMember)}
            </span>
          </p>
          <p>
            Bia lon (LON): SKB→DNC{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LON.skbToDnc)}
            </span>{" "}
            · DNC→ĐVTV{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LON.dncToMember)}
            </span>
          </p>
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-2 leading-relaxed">
          VAT 10% · Thuế TTDB 65% (Doanh thu 511 = Thành tiền ÷ 1,65). Giá đổi
          thì báo tôi sửa trong src/lib/invoice.ts.
        </p>
      </div>

      {/* ----- Cảnh báo ----- */}
      {result.missingCode.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 space-y-1.5">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
              {result.missingCode.length} mặt hàng chưa có mã vật tư — không lên
              hóa đơn
            </p>
          </div>
          <div className="pl-8 space-y-0.5">
            {result.missingCode.map((m) => (
              <p key={m.name} className="text-[11px] font-bold text-amber-800">
                {m.name} · {formatNumber(m.qty)}
              </p>
            ))}
          </div>
        </div>
      )}

      {result.inTransitCount > 0 && (
        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-blue-800 leading-relaxed">
            {result.inTransitCount} giao dịch còn đang đi đường, chưa tính vào
            kỳ này. Xác nhận nhận hàng xong thì số sẽ tự vào.
          </p>
        </div>
      )}

      {/* ----- Tổng kết ----- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {[
          { label: "Số dòng", value: formatNumber(result.rows.length) },
          { label: "Số lượng", value: formatNumber(result.totals.quantity) },
          { label: "Thành tiền", value: money(result.totals.amount) },
          { label: "Thuế TTDB", value: money(result.totals.excise) },
          { label: "Doanh thu 511", value: money(result.totals.revenue) },
        ].map((s) => (
          <div
            key={s.label}
            className="p-3 rounded-xl bg-white border border-slate-200"
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
            <p className="text-sm font-black text-slate-900 mt-0.5 tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ----- Bảng xem trước ----- */}
      {result.rows.length === 0 ? (
        <p className="text-center text-xs font-bold text-slate-400 py-10">
          Không có giao dịch xuất kho nào trong kỳ đã chọn.
        </p>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {[
                    "STT",
                    "Đơn vị",
                    "Mã vật tư",
                    "Tên hàng hóa",
                    "ĐVT",
                    "Số lượng",
                    "Đơn giá",
                    "Thành tiền",
                    "VAT",
                    "Mã BP",
                    "Thuế TTDB",
                    "Doanh thu 511",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr
                    key={r.STT}
                    className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                  >
                    <td className="px-3 py-1.5 text-slate-400">{r.STT}</td>
                    <td className="px-3 py-1.5 text-slate-900">
                      {r["Đơn vị"]}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{r["Mã vật tư"]}</td>
                    <td className="px-3 py-1.5">{r["Tên hàng hóa"]}</td>
                    <td className="px-3 py-1.5">{r["Đơn vị tính"]}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {formatNumber(r["Số lượng"])}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatNumber(r["SKB - TLD"])}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {money(r["Thành tiền"])}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {money(r["VAT"])}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{r["Mã BP"]}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {money(r["Thuế TTDB"])}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {money(r["Doanh thu 511"])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={result.rows.length === 0}
        className={cn(
          "px-5 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50",
        )}
      >
        <Download className="w-4 h-4" /> Tải file công nợ ({result.period})
      </button>
    </div>
  );
}

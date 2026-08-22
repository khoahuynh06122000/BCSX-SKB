import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  Receipt,
  AlertTriangle,
  Calculator,
  Plus,
  Trash2,
  CalendarRange,
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction, Product, Partner } from "../types";
import { PRICE_TABLE, invoiceUnitOf } from "../lib/invoice";
import { dungBangCongNo, type DotChot } from "../lib/congNo";
import { taoWorkbookCongNo } from "../lib/congNoExcel";
import { cn, formatNumber } from "../lib/utils";

/**
 * CÔNG NỢ · HÓA ĐƠN
 *
 * Dựng đúng sheet "Chốt" của file công nợ tháng — xem `src/lib/congNo.ts` để
 * biết từng quy tắc lấy ra từ đâu trong file thật.
 *
 * Màn hình này làm hai việc, và việc thứ hai mới là việc chính:
 *
 *   1. Kết xuất file để phát hành hóa đơn.
 *   2. THEO DÕI: đợt nào đã chốt bao nhiêu, đơn vị nào nợ bao nhiêu, và quan
 *      trọng nhất — có bia nào đã giao mà rơi ra ngoài mọi đợt không. Đó là
 *      loại sai sót không ai phát hiện ra cho tới lúc đối chiếu cuối năm.
 *
 * ĐỢT CHỐT LƯU TRÊN MÁY NÀY (localStorage), không lưu lên hệ thống. Đợt là
 * lịch phát hành hóa đơn của kế toán, một người giữ; đẩy lên Firestore thì
 * phải thêm collection, thêm quyền, thêm một chỗ nữa để lệch nhau. Đổi máy
 * thì khai lại — mất chừng một phút.
 */

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
}

const KHOA_LUU = "bcsx.congno.dot";
const KHOA_LUU_SO = "bcsx.congno.sohoadon";

function dotMacDinh(): DotChot[] {
  const now = new Date();
  const dau = new Date(now.getFullYear(), now.getMonth(), 1);
  return [
    {
      id: "d1",
      tuNgay: format(dau, "yyyy-MM-dd"),
      denNgay: format(now, "yyyy-MM-dd"),
      ngayHoaDon: format(now, "yyyy-MM-dd"),
    },
  ];
}

function docDotDaLuu(): DotChot[] {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    if (!raw) return dotMacDinh();
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || v.length === 0) return dotMacDinh();
    return v.filter(
      (d) => d && d.id && d.tuNgay && d.denNgay && d.ngayHoaDon,
    ) as DotChot[];
  } catch {
    return dotMacDinh();
  }
}

export default function DebtExport({ transactions, products, partners }: Props) {
  const [dot, setDot] = useState<DotChot[]>(docDotDaLuu);
  const [tienTo, setTienTo] = useState("C26TKB#");
  const [soBatDau, setSoBatDau] = useState<number>(() => {
    const v = Number(localStorage.getItem(KHOA_LUU_SO));
    return Number.isFinite(v) && v > 0 ? v : 1;
  });

  useEffect(() => {
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(dot));
    } catch {
      /* hết chỗ lưu thì thôi, không chặn việc kết xuất */
    }
  }, [dot]);

  const bang = useMemo(
    () =>
      dungBangCongNo({
        transactions,
        products,
        partners,
        dot,
        tienToHoaDon: tienTo,
        soHoaDonBatDau: soBatDau,
      }),
    [transactions, products, partners, dot, tienTo, soBatDau],
  );

  const themDot = () => {
    const cuoi = dot[dot.length - 1];
    const sau = cuoi
      ? format(
          new Date(new Date(cuoi.denNgay + "T00:00:00").getTime() + 86400000),
          "yyyy-MM-dd",
        )
      : format(new Date(), "yyyy-MM-dd");
    setDot([
      ...dot,
      {
        id: `d${Date.now()}`,
        tuNgay: sau,
        denNgay: sau,
        ngayHoaDon: sau,
      },
    ]);
  };

  const suaDot = (id: string, truong: keyof DotChot, giaTri: string) =>
    setDot(dot.map((d) => (d.id === id ? { ...d, [truong]: giaTri } : d)));

  const xoaDot = (id: string) => setDot(dot.filter((d) => d.id !== id));

  const handleDownload = () => {
    if (!bang.dong.length) return;
    const matHang = products
      .filter((p) => p.materialCode)
      .map((p) => ({
        maVatTu: p.materialCode as string,
        ten: p.name,
        dvt: invoiceUnitOf(p.category),
      }));
    // Danh mục đơn vị cho sheet "Đơn giá": mỗi mã SAP một dòng, vì 20 bộ phận
    // BNC dùng chung một mã và hóa đơn chỉ biết mã.
    const theoMa = new Map<string, string>();
    partners
      .filter((p) => p.sapCode && p.type !== "SUPPLIER")
      .forEach((p) => {
        const ten = p.name.split("·")[0].trim();
        if (!theoMa.has(p.sapCode)) theoMa.set(p.sapCode, ten);
      });
    const donVi = Array.from(theoMa.entries())
      .map(([maSap, ten]) => ({ ten, maSap }))
      .sort((a, b) => a.ten.localeCompare(b.ten, "vi"));

    const wb = taoWorkbookCongNo(bang, matHang, donVi);
    const dauKy = dot.reduce((a, d) => (d.tuNgay < a ? d.tuNgay : a), dot[0].tuNgay);
    XLSX.writeFile(wb, `Cong no ${format(new Date(dauKy + "T00:00:00"), "MM.yyyy")}.xlsx`);
    // Số hóa đơn kế tiếp nhớ lại cho lần sau, khỏi phải tra sổ.
    try {
      localStorage.setItem(KHOA_LUU_SO, String(bang.soHoaDonTiepTheo));
    } catch {
      /* không lưu được thì kế toán tự điền */
    }
  };

  const tien = (n: number) => formatNumber(Math.round(n));
  const nghiemTrong = (loai: string) =>
    loai === "ngoai_dot" || loai === "thieu_ma_vat_tu" || loai === "thieu_ma_bp";

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <Receipt className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          Dựng đúng sheet <strong>Chốt</strong> của file công nợ tháng: 18 cột,
          hai chặng giá cạnh nhau, một số hóa đơn cho mỗi{" "}
          <strong>đợt × đơn vị</strong>. Hai mươi bộ phận BNC gộp về một dòng
          theo mã BP <strong>AD0103</strong>, vì hóa đơn xuất cho pháp nhân chứ
          không xuất cho từng quán.
        </p>
      </div>

      {/* ----- Đợt chốt ----- */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Đợt chốt hóa đơn
            </p>
          </div>
          <button
            onClick={themDot}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Thêm đợt
          </button>
        </div>

        <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
          Một tháng thường chốt nhiều đợt dài ngắn khác nhau. Khai đủ các đợt thì
          app kiểm được có ngày xuất kho nào rơi ra ngoài không.
        </p>

        <div className="space-y-2">
          {dot.map((d, i) => (
            <div
              key={d.id}
              className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center"
            >
              <span className="text-[10px] font-black text-slate-300 w-5 text-center">
                {i + 1}
              </span>
              {(
                [
                  ["tuNgay", "Từ ngày"],
                  ["denNgay", "Đến ngày"],
                  ["ngayHoaDon", "Ngày hóa đơn"],
                ] as [keyof DotChot, string][]
              ).map(([truong, nhan]) => (
                <label key={truong} className="block">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {nhan}
                  </span>
                  <input
                    type="date"
                    value={d[truong] as string}
                    onChange={(e) => suaDot(d.id, truong, e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900"
                  />
                </label>
              ))}
              <button
                onClick={() => xoaDot(d.id)}
                disabled={dot.length <= 1}
                className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                title="Xóa đợt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          <label className="block">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Tiền tố số hóa đơn
            </span>
            <input
              value={tienTo}
              onChange={(e) => setTienTo(e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900 font-mono"
            />
          </label>
          <label className="block">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Số hóa đơn đầu kỳ
            </span>
            <input
              type="number"
              min={1}
              value={soBatDau}
              onChange={(e) => setSoBatDau(Number(e.target.value) || 1)}
              className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900 tabular-nums"
            />
          </label>
        </div>
      </div>

      {/* ----- Cảnh báo ----- */}
      {bang.canhBao.length > 0 && (
        <div className="space-y-2">
          {bang.canhBao.map((c, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-2xl border flex gap-3",
                nghiemTrong(c.loai)
                  ? "border-amber-300 bg-amber-50"
                  : "border-blue-200 bg-blue-50",
              )}
            >
              <AlertTriangle
                className={cn(
                  "w-5 h-5 shrink-0 mt-0.5",
                  nghiemTrong(c.loai) ? "text-amber-600" : "text-blue-600",
                )}
              />
              <p
                className={cn(
                  "text-[11px] font-bold leading-relaxed",
                  nghiemTrong(c.loai) ? "text-amber-800" : "text-blue-800",
                )}
              >
                {c.moTa} — <strong>{c.soDong} dòng</strong>,{" "}
                {formatNumber(c.soLuong)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ----- Tổng kỳ ----- */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        {[
          { label: "Số dòng", value: formatNumber(bang.tong.soDong) },
          { label: "Số lượng", value: formatNumber(bang.tong.soLuong) },
          { label: "SKB→DNC", value: tien(bang.tong.thanhTienSkb) },
          { label: "Sau thuế", value: tien(bang.tong.sauThueSkb) },
          { label: "Thuế TTĐB", value: tien(bang.tong.thueTtdb) },
          { label: "Doanh thu 511", value: tien(bang.tong.doanhThu511) },
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

      {/* ----- Thống kê theo đợt ----- */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Theo đợt
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                {[
                  "Ngày giao bia",
                  "Ngày hóa đơn",
                  "Dòng",
                  "Đơn vị",
                  "Số HĐ",
                  "Số lượng",
                  "Thành tiền",
                  "Sau thuế",
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
              {bang.theoDot.map((d) => (
                <tr
                  key={d.dotId}
                  className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                >
                  <td className="px-3 py-1.5 text-slate-900">
                    {d.nhanNgayGiao}
                  </td>
                  <td className="px-3 py-1.5">{d.ngayHoaDon}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soDong}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soDonVi}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soHoaDon}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                    {formatNumber(d.soLuong)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {tien(d.thanhTienSkb)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {tien(d.sauThueSkb)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----- Thống kê theo đơn vị ----- */}
      {bang.theoDonVi.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Theo đơn vị · cả kỳ
            </p>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <tbody>
                {bang.theoDonVi.map((u) => (
                  <tr
                    key={u.maBp || u.donVi}
                    className="border-t border-slate-100 text-[11px] font-bold text-slate-600 first:border-t-0"
                  >
                    <td className="px-3 py-1.5 text-slate-900">{u.donVi}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-400">
                      {u.maBp}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {u.soDong} dòng
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {formatNumber(u.soLuong)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(u.thanhTienSkb)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(u.sauThueSkb)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----- Bảng giá ----- */}
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
          VAT 10% cả hai chặng. Thuế TTĐB 65% và Doanh thu 511 chỉ hiện trên màn
          hình — file T8 của bộ phận không còn hai cột đó nên bảng kết xuất cũng
          không có. Giá đổi thì báo tôi sửa trong src/lib/invoice.ts.
        </p>
      </div>

      {/* ----- Xem trước ----- */}
      {bang.dong.length === 0 ? (
        <p className="text-center text-xs font-bold text-slate-400 py-10">
          Không có giao dịch xuất kho nào trong các đợt đã khai.
        </p>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {[
                    "STT",
                    "Ngày giao",
                    "Đơn vị",
                    "Mã vật tư",
                    "Tên hàng hóa",
                    "ĐVT",
                    "Số lượng",
                    "Đơn giá",
                    "Thành tiền",
                    "VAT",
                    "Số hóa đơn",
                    "Mã BP",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bang.dong.map((r) => (
                  <tr
                    key={r.stt}
                    className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                  >
                    <td className="px-3 py-1.5 text-slate-400">{r.stt}</td>
                    <td className="px-3 py-1.5">{r.ngayGiaoBia}</td>
                    <td className="px-3 py-1.5 text-slate-900">{r.donVi}</td>
                    <td className="px-3 py-1.5 font-mono">{r.maVatTu}</td>
                    <td className="px-3 py-1.5">{r.tenHangHoa}</td>
                    <td className="px-3 py-1.5">{r.dvt}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {formatNumber(r.soLuong)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatNumber(r.donGiaSkb)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {tien(r.thanhTienSkb)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(r.vatSkb)}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px]">
                      {r.soHoaDon}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{r.maBp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={bang.dong.length === 0}
        className="px-5 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" /> Tải file công nợ ({bang.tong.soDong}{" "}
        dòng · {dot.length} đợt)
      </button>
    </div>
  );
}

import { useMemo, useState } from "react";
import { BarChart3, Search } from "lucide-react";
import type {
  ImportSlip,
  KeHoachSanXuat,
  KiemKeBon,
  Product,
  Transaction,
} from "../types";
import type { AnhChungTu } from "../anh/moHinh";
import {
  tinhTonTheoLo,
  tongHopKeHoachVaThucXuat,
  truyXuatLo,
} from "../lib/loBia";
import { cn, formatNumber } from "../lib/utils";
import ONgay from "./ONgay";

interface Props {
  products: Product[];
  transactions: Transaction[];
  countedTransactions: Transaction[];
  slips: ImportSlip[];
  approvedSlips: Set<string>;
  anhTheoChungTu: Map<string, AnhChungTu[]>;
  keHoach: KeHoachSanXuat[];
  kiemKeBon: KiemKeBon[];
}

export default function KeToanDashboardPanel({
  products,
  transactions,
  countedTransactions,
  slips,
  approvedSlips,
  anhTheoChungTu,
  keHoach,
  kiemKeBon,
}: Props) {
  const [subTab, setSubTab] = useState<"tong-quan" | "truy-xuat">("tong-quan");
  const [filterDate, setFilterDate] = useState("");
  const [lotQuery, setLotQuery] = useState("");

  const progress = useMemo(
    () =>
      tongHopKeHoachVaThucXuat(
        keHoach,
        transactions,
        slips,
        products,
        approvedSlips,
        filterDate || undefined,
      ),
    [keHoach, transactions, slips, products, approvedSlips, filterDate],
  );

  const tonLo = useMemo(
    () => tinhTonTheoLo(countedTransactions, products),
    [countedTransactions, products],
  );

  const kpi = useMemo(() => {
    const capFactor = (pId: string) =>
      ((products.find((p) => p.id === pId)?.capacityPerUnit || 1000) / 1000);
    const totalPlanL = progress.reduce(
      (s, r) => s + r.plannedQty * capFactor(r.productId),
      0,
    );
    const totalSentL = progress.reduce(
      (s, r) => s + r.sentFromBrewery * capFactor(r.productId),
      0,
    );
    const totalRecL = progress.reduce(
      (s, r) => s + r.receivedByWarehouse * capFactor(r.productId),
      0,
    );
    const totalSoldL = progress.reduce(
      (s, r) => s + r.soldOut * capFactor(r.productId),
      0,
    );
    const totalClosingL = tonLo.reduce(
      (s, l) => s + l.closing * capFactor(l.productId),
      0,
    );
    const totalTankL = kiemKeBon.reduce((s, k) => s + (k.liters || 0), 0);
    const rate = totalPlanL > 0 ? Math.round((totalRecL / totalPlanL) * 100) : 0;
    return {
      totalPlanL,
      totalSentL,
      totalRecL,
      totalSoldL,
      totalClosingL,
      totalTankL,
      rate,
    };
  }, [progress, tonLo, kiemKeBon, products]);

  const lotTraces = useMemo(() => {
    if (lotQuery.trim()) {
      return truyXuatLo(lotQuery.trim(), countedTransactions, products);
    }
    const uniqueBatches = Array.from(
      new Set(
        tonLo
          .map((l) => l.batchNumber)
          .filter((b) => b && b !== "Chưa gắn mã lô"),
      ),
    ).slice(0, 20);
    return uniqueBatches.flatMap((b) =>
      truyXuatLo(b, countedTransactions, products),
    );
  }, [lotQuery, tonLo, countedTransactions, products]);

  return (
    <div className="space-y-6 anim-view-enter">
      {/* Sub-header & Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-900">
            Dashboard Kế Toán · Kế Hoạch Sản Xuất vs Thực Xuất & Truy Xuất Lô
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Theo dõi realtime sản lượng kế hoạch, thực nhập 2 rào, thực xuất đi các nhà hàng/đối tác và tồn bồn FST/BBT.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab("tong-quan")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all",
              subTab === "tong-quan"
                ? "bg-[#141A23] text-amber-300 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80",
            )}
          >
            1. Dashboard Kế hoạch vs Thực xuất
          </button>
          <button
            type="button"
            onClick={() => setSubTab("truy-xuat")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all",
              subTab === "truy-xuat"
                ? "bg-[#141A23] text-amber-300 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80",
            )}
          >
            2. Truy xuất Lô & Kiểm kê FST/BBT
          </button>
        </div>
      </div>

      {/* ================= TAB 1: DASHBOARD KẾ HOẠCH VS THỰC XUẤT ================= */}
      {subTab === "tong-quan" && (
        <div className="space-y-6 anim-view-enter">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-[#141A23] text-white shadow-lg card-lift">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                KẾ HOẠCH SẢN XUẤT
              </span>
              <p className="text-2xl font-black font-mono mt-1 tabular-nums">
                {formatNumber(Math.round(kpi.totalPlanL * 10) / 10)}{" "}
                <span className="text-sm font-bold text-slate-400">Lít</span>
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                Xưởng đã giao: <strong>{formatNumber(Math.round(kpi.totalSentL * 10) / 10)} L</strong>
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-emerald-200 shadow-sm card-lift">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                THỰC NHẬP KHO TỔNG (2 RÀO)
              </span>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-1 tabular-nums">
                {formatNumber(Math.round(kpi.totalRecL * 10) / 10)}{" "}
                <span className="text-sm font-bold">Lít</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Hoàn thành <strong className="text-emerald-700">{kpi.rate}%</strong> kế hoạch
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-sky-200 shadow-sm card-lift">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-700">
                THỰC XUẤT BÁN & NỘI BỘ
              </span>
              <p className="text-2xl font-black font-mono text-sky-700 mt-1 tabular-nums">
                {formatNumber(Math.round(kpi.totalSoldL * 10) / 10)}{" "}
                <span className="text-sm font-bold">Lít</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Tổng sản lượng ra khỏi kho
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-sm card-lift">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700">
                TỒN KHO + BỒN FST/BBT
              </span>
              <p className="text-2xl font-black font-mono text-slate-900 mt-1 tabular-nums">
                {formatNumber(Math.round((kpi.totalClosingL + kpi.totalTankL) * 10) / 10)}{" "}
                <span className="text-sm font-bold text-slate-400">Lít</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Kho: <strong>{formatNumber(Math.round(kpi.totalClosingL))}L</strong> · Bồn:{" "}
                <strong>{formatNumber(kpi.totalTankL)}L</strong>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Đối Chiếu Kế Hoạch Sản Xuất & Thực Xuất Theo Mặt Hàng
                  </h2>
                  <p className="text-xs text-slate-500">
                    Để trống ngày để xem toàn bộ, hoặc chọn 1 ngày để soi kế hoạch ngày đó.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ONgay
                  aria-label="Lọc theo ngày"
                  value={filterDate}
                  onChange={setFilterDate}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                />
                {filterDate && (
                  <button
                    type="button"
                    onClick={() => setFilterDate("")}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Tất cả
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {progress.length === 0 ? (
                <p className="py-10 text-center text-xs font-bold text-slate-400">
                  Chưa có dữ liệu kế hoạch hay phát sinh trong phạm vi đang chọn.
                </p>
              ) : (
                progress.map((r) => {
                  const maxVal = Math.max(
                    r.plannedQty,
                    r.sentFromBrewery,
                    r.receivedByWarehouse,
                    r.soldOut,
                    1,
                  );
                  const wPlan = Math.round((r.plannedQty / maxVal) * 100);
                  const wSent = Math.round((r.sentFromBrewery / maxVal) * 100);
                  const wRec = Math.round((r.receivedByWarehouse / maxVal) * 100);
                  const wSold = Math.round((r.soldOut / maxVal) * 100);
                  return (
                    <div
                      key={r.productId}
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          {r.productName}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg",
                            r.varianceVsPlan >= 0
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-amber-100 text-amber-900",
                          )}
                        >
                          Chênh lệch kho nhận vs KH: {r.varianceVsPlan >= 0 ? "+" : ""}
                          {formatNumber(r.varianceVsPlan)} {r.unit}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px] font-mono">
                        {[
                          { label: "Kế hoạch", w: wPlan, val: r.plannedQty, cls: "bg-slate-800", txt: "text-slate-700" },
                          { label: "Xưởng giao", w: wSent, val: r.sentFromBrewery, cls: "bg-amber-500", txt: "text-amber-800" },
                          { label: "Kho nhận (2 rào)", w: wRec, val: r.receivedByWarehouse, cls: "bg-emerald-500", txt: "text-emerald-800" },
                          { label: "Thực xuất bán", w: wSold, val: r.soldOut, cls: "bg-sky-500", txt: "text-sky-800" },
                        ].map((b) => (
                          <div key={b.label} className="flex items-center gap-2">
                            <span className={cn("w-28 font-sans font-bold", b.txt)}>
                              {b.label}:
                            </span>
                            <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={cn("h-full rounded-full bar-fill", b.cls)}
                                style={{ width: `${b.w}%` }}
                              />
                            </div>
                            <span className={cn("w-24 text-right font-bold tabular-nums", b.txt)}>
                              {formatNumber(b.val)} {r.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TRUY XUẤT LÔ & KIỂM KÊ FST/BBT ================= */}
      {subTab === "truy-xuat" && (
        <div className="space-y-6 anim-view-enter">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#141A23] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  BATCH TRACEABILITY · TRUY XUẤT REALTIME
                </span>
                <h2 className="text-base font-extrabold">
                  Truy Xuất Hành Trình Từng Lô Bia (Nhập ➔ Điểm Bán / Nhà Hàng)
                </h2>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lotQuery}
                  onChange={(e) => setLotQuery(e.target.value)}
                  placeholder="Gõ mã lô cần truy xuất..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white placeholder-slate-400 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="p-6 space-y-4">
              {lotTraces.length === 0 ? (
                <p className="py-8 text-center text-xs font-bold text-slate-400">
                  Chưa tìm thấy giao dịch nào có gắn Mã lô phù hợp.
                </p>
              ) : (
                lotTraces.map((tr) => (
                  <div
                    key={`${tr.productId}-${tr.batchNumber}`}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 card-lift"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#141A23] text-amber-300 font-mono text-xs font-black">
                          {tr.batchNumber}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {tr.productName}
                        </span>
                        {tr.sourceSlips.length > 0 && (
                          <span className="text-[11px] font-mono text-slate-500">
                            (Nguồn: {tr.sourceSlips.join(", ")})
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs font-bold flex flex-wrap gap-3 tabular-nums">
                        <span className="text-slate-600">
                          Tổng nhập: <strong>{formatNumber(tr.totalIn)}</strong>
                        </span>
                        <span className="text-sky-700">
                          Đã xuất: <strong>{formatNumber(tr.totalOut)}</strong>
                        </span>
                        <span className="text-emerald-700">
                          Còn tại kho: <strong>{formatNumber(tr.remaining)} {tr.unit}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {tr.destinations.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">
                          Lô này chưa xuất đi đâu (còn nguyên trong Kho tổng).
                        </span>
                      ) : (
                        tr.destinations.map((d) => (
                          <span
                            key={d.partnerId + d.partnerName}
                            className="px-3 py-1.5 rounded-xl bg-white border border-sky-200 text-xs font-bold text-slate-800 shadow-sm"
                          >
                            🚚 {d.partnerName}:{" "}
                            <strong className="font-mono text-sky-700">
                              {formatNumber(d.quantity)} {tr.unit}
                            </strong>
                            {d.inTransitQty > 0 && (
                              <span className="ml-1 text-[10px] text-amber-600">
                                (đang giao {formatNumber(d.inTransitQty)})
                              </span>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bảng kiểm kê bồn FST/BBT */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                Kiểm Kê Tồn Bồn FST & BBT Hàng Tháng (Kèm Ảnh Minh Chứng)
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {kiemKeBon.length === 0 ? (
                <p className="col-span-2 py-8 text-center text-xs font-bold text-slate-400">
                  Chưa có bản kiểm kê bồn FST/BBT nào.
                </p>
              ) : (
                kiemKeBon.map((kk) => {
                  const p = products.find((x) => x.id === kk.productId);
                  const anh = anhTheoChungTu.get(kk.id) || [];
                  return (
                    <div
                      key={kk.id}
                      className="p-3.5 rounded-2xl border border-slate-200 flex gap-3.5 items-center"
                    >
                      {anh[0] && (
                        <a
                          href={anh[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-28 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-300 shrink-0"
                        >
                          <img src={anh[0].url} alt={kk.tankId} className="w-full h-full object-cover" />
                        </a>
                      )}
                      <div className="text-xs space-y-1 min-w-0">
                        <div>
                          <span className="font-mono font-black text-sky-800">{kk.tankId}</span>{" "}
                          · <span className="font-mono text-amber-800 font-bold">{kk.batchNumber}</span>
                        </div>
                        <p className="font-bold text-slate-900 truncate">{p?.name || kk.productId}</p>
                        <p className="font-mono font-black text-emerald-700 tabular-nums">
                          {formatNumber(kk.liters)} Lít ·{" "}
                          <span className="font-normal text-slate-400">Tháng {kk.month}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

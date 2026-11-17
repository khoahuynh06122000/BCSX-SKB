import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import type {
  ImportSlip,
  KeHoachSanXuat,
  KiemKeBon,
  Product,
  Transaction,
} from "../types";
import type { AnhChungTu } from "../anh/moHinh";
import OAnhLuoi from "../anh/OAnhLuoi";
import {
  DANH_SACH_BON_BIA,
  quyDoiHienTrang,
  tongHopKeHoachVaThucXuat,
} from "../lib/loBia";
import { cn, formatNumber } from "../lib/utils";

export type QuanLyXuongSubTab =
  | "duyet-nhat-ky"
  | "ke-hoach"
  | "kiem-ke"
  | "nhap-le"
  | "phieu-cu";

interface Props {
  products: Product[];
  transactions: Transaction[];
  slips: ImportSlip[];
  approvedSlips: Set<string>;
  anhTheoChungTu: Map<string, AnhChungTu[]>;
  keHoach: KeHoachSanXuat[];
  kiemKeBon: KiemKeBon[];
  busy: boolean;
  onDuyetRao1: (slipCode: string) => Promise<void>;
  onTraLaiPhieu: (slipCode: string, reason: string) => Promise<void>;
  onMoBieuMau: (slipCode: string) => void;
  onLuuKeHoach: (input: {
    date: string;
    productId: string;
    targetQty: number;
    batchHint: string;
    note: string;
    source: string;
  }) => Promise<boolean>;
  onXoaKeHoach: (planId: string) => Promise<void>;
  nhapLeContent?: ReactNode;
  phieuCuContent?: ReactNode;
  phieuCuCount?: number;
  requestedSubTab?: { id: QuanLyXuongSubTab; nonce: number } | null;
  onSubTabChange?: (tab: QuanLyXuongSubTab) => void;
}

export default function QuanLyXuongPanel({
  products,
  transactions,
  slips,
  approvedSlips,
  anhTheoChungTu,
  keHoach,
  kiemKeBon,
  busy,
  onDuyetRao1,
  onTraLaiPhieu,
  onMoBieuMau,
  onLuuKeHoach,
  onXoaKeHoach,
  nhapLeContent,
  phieuCuContent,
  phieuCuCount = 0,
  requestedSubTab,
  onSubTabChange,
}: Props) {
  const [subTab, setSubTab] = useState<QuanLyXuongSubTab>("duyet-nhat-ky");

  const chonSubTab = (tab: QuanLyXuongSubTab) => {
    setSubTab(tab);
    onSubTabChange?.(tab);
  };

  useEffect(() => {
    if (requestedSubTab) {
      setSubTab(requestedSubTab.id);
    }
  }, [requestedSubTab]);

  useEffect(() => {
    onSubTabChange?.(subTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Tab 1: Duyệt Rào 1 + Nhật ký ---------- */
  const slipsWithRows = useMemo(() => {
    const byCode = new Map<string, { slip?: ImportSlip; txs: Transaction[]; code: string }>();
    slips.forEach((s) => {
      byCode.set(s.code, { code: s.code, slip: s, txs: [] });
    });
    transactions
      .filter((t) => t.type === "IN" && t.slipCode)
      .forEach((t) => {
        const code = t.slipCode!;
        const entry = byCode.get(code) || { code, txs: [] };
        entry.txs.push(t);
        byCode.set(code, entry);
      });
    return Array.from(byCode.values())
      .filter((x) => x.txs.length > 0)
      .sort((a, b) => b.code.localeCompare(a.code));
  }, [slips, transactions]);

  const pendingRao1 = useMemo(
    () => slipsWithRows.filter((x) => x.slip?.status === "cho_ql_xuong"),
    [slipsWithRows],
  );

  const stats = useMemo(() => {
    let approvedL = 0;
    let pendingL = 0;
    slipsWithRows.forEach(({ code, slip, txs }) => {
      if (slip?.status === "tra_lai") return;
      const lit = txs.reduce((s, t) => {
        const p = products.find((x) => x.id === t.productId);
        return s + (t.quantity || 0) * ((p?.capacityPerUnit || 0) / 1000);
      }, 0);
      if (approvedSlips.has(code)) approvedL += lit;
      else pendingL += lit;
    });
    return { approvedL, pendingL };
  }, [slipsWithRows, products, approvedSlips]);

  /* ---------- Tab 2: Kế hoạch sản xuất ---------- */
  const [planDate, setPlanDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [planProduct, setPlanProduct] = useState(products[0]?.id || "");
  const [planQty, setPlanQty] = useState<number>(200);
  const [planBatch, setPlanBatch] = useState("");
  const [planNote, setPlanNote] = useState("");

  const planProgress = useMemo(
    () =>
      tongHopKeHoachVaThucXuat(
        keHoach,
        transactions,
        slips,
        products,
        approvedSlips,
        planDate,
      ),
    [keHoach, transactions, slips, products, approvedSlips, planDate],
  );

  const handleAddPlan = async () => {
    if (!planProduct || planQty <= 0 || busy) return;
    const ok = await onLuuKeHoach({
      date: planDate,
      productId: planProduct,
      targetQty: planQty,
      batchHint: planBatch.trim(),
      note: planNote.trim(),
      source: "Quản lý xưởng nạp",
    });
    if (ok) {
      setPlanQty(0);
      setPlanBatch("");
      setPlanNote("");
    }
  };

  return (
    <div className="space-y-6 anim-view-enter">
      {/* Sub-header & 3 tab */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-900">
            Quản Lý Xưởng · Phê Duyệt Rào 1 & Kế Hoạch Sản Xuất
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Đối chiếu ảnh chụp Keg trước khi cho xuất xưởng và phát hành kế hoạch kế thừa xuống NV Sản xuất.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          {(
            [
              {
                id: "duyet-nhat-ky" as const,
                label: `1. Duyệt Rào 1 & Nhật ký (${pendingRao1.length})`,
              },
              { id: "ke-hoach" as const, label: "2. Kế hoạch sản xuất" },
              { id: "kiem-ke" as const, label: `3. Kiểm kê FST/BBT (${kiemKeBon.length})` },
              ...(nhapLeContent
                ? [{ id: "nhap-le" as const, label: "4. Nhập lẻ & Tồn đầu" }]
                : []),
              ...(phieuCuContent
                ? [
                    {
                      id: "phieu-cu" as const,
                      label:
                        phieuCuCount > 0
                          ? `5. Phiếu giấy cũ (${phieuCuCount})`
                          : "5. Phiếu giấy cũ",
                    },
                  ]
                : []),
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => chonSubTab(t.id)}
              className={cn(
                "px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all",
                subTab === t.id
                  ? "bg-[#141A23] text-amber-300 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= TAB 1: DUYỆT RÀO 1 & NHẬT KÝ ================= */}
      {subTab === "duyet-nhat-ky" && (
        <div className="space-y-6 anim-view-enter">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#141A23] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  RÀO KIỂM SOÁT SỐ 1 · QUẢN LÝ XƯỞNG
                </span>
                <h2 className="text-base font-extrabold">
                  Phiếu Bàn Giao Chờ Duyệt Xuất Xưởng
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-mono text-xs font-black">
                {pendingRao1.length} phiếu chờ
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {pendingRao1.length === 0 ? (
                <p className="py-8 text-center text-xs font-bold text-slate-400">
                  ✓ Không có phiếu nào tồn đọng chờ Quản lý xưởng duyệt.
                </p>
              ) : (
                pendingRao1.map(({ code, slip, txs }) => {
                  const photos = anhTheoChungTu.get(code) || [];
                  return (
                    <div
                      key={code}
                      className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/40 grid grid-cols-1 md:grid-cols-12 gap-4 items-center card-lift"
                    >
                      <div className="md:col-span-7 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-[#141A23] text-amber-300">
                            {code}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            Người lập: {slip?.creatorSig?.name || txs[0]?.createdBy}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {txs.map((t) => {
                            const p = products.find((x) => x.id === t.productId);
                            return (
                              <div
                                key={t.id}
                                className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                              >
                                <div>
                                  <span className="font-extrabold text-slate-900">
                                    {t.productName}
                                  </span>
                                  {t.batchNumber && (
                                    <span className="ml-2 font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                                      Lô: {t.batchNumber}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-black text-slate-900 shrink-0 tabular-nums">
                                  {formatNumber(t.quantity)} {p?.unit} ({quyDoiHienTrang(p, t.quantity)})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="pt-1 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onDuyetRao1(code)}
                            className="px-4 py-2 rounded-xl bg-[#141A23] hover:bg-slate-800 text-amber-300 text-xs font-extrabold transition shadow flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Duyệt Xuất Xưởng (Rào 1)
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const lyDo = window.prompt(
                                `Lý do trả lại phiếu ${code}:`,
                                "Số lượng trên ảnh hiện trạng không khớp phiếu",
                              );
                              if (lyDo?.trim()) void onTraLaiPhieu(code, lyDo.trim());
                            }}
                            className="px-3.5 py-2 rounded-xl border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-xs font-extrabold flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Trả lại
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoBieuMau(code)}
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" /> BM-SKB-01
                          </button>
                        </div>
                      </div>
                      <div className="md:col-span-5 grid grid-cols-2 gap-2">
                        {photos.map((ph) => (
                          <a
                            key={ph.id}
                            href={ph.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl overflow-hidden border border-slate-300 bg-slate-100 block"
                          >
                            <OAnhLuoi url={ph.url} alt={code} rong={400} className="w-full h-28 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Nhật ký xuất xưởng / bàn giao kho tổng */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Nhật Ký Xuất Xưởng & Trạng Thái 2 Bước Rào
                </h3>
              </div>
              <div className="flex gap-2 font-mono text-xs font-bold">
                <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Đã vào kho: {formatNumber(stats.approvedL)} L
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                  Đang chờ duyệt: {formatNumber(stats.pendingL)} L
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Số phiếu / Ngày</th>
                    <th className="py-3 px-3">Mặt hàng & Mã lô</th>
                    <th className="py-3 px-3 text-right">Số lượng (Keg)</th>
                    <th className="py-3 px-3 text-center">Ảnh</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Biểu mẫu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slipsWithRows.slice(0, 40).map(({ code, slip, txs }) => {
                    const photos = anhTheoChungTu.get(code) || [];
                    const vaoTon = approvedSlips.has(code);
                    const stBadge = vaoTon ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                        ✓ Đã vào tồn kho
                      </span>
                    ) : slip?.status === "cho_ql_xuong" ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">
                        1/2 · Chờ QL Xưởng
                      </span>
                    ) : slip?.status === "cho_kho_tong" ? (
                      <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 font-bold text-[11px]">
                        2/2 · Chờ Kho Tổng
                      </span>
                    ) : slip?.status === "tra_lai" ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                        Đã trả lại
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                        Chờ ký
                      </span>
                    );

                    return (
                      <tr key={code} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono">
                          <span className="font-black text-slate-900 block">{code}</span>
                          <span className="text-[11px] text-slate-400">
                            {slip?.date || String(txs[0]?.date).slice(0, 10)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {txs.map((t) => (
                            <div key={t.id} className="mb-1 last:mb-0">
                              <span className="font-bold text-slate-900">{t.productName}</span>
                              {t.batchNumber && (
                                <span className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                                  {t.batchNumber}
                                </span>
                              )}
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          {txs.map((t) => {
                            const p = products.find((x) => x.id === t.productId);
                            return (
                              <div key={t.id}>
                                <strong>{formatNumber(t.quantity)}</strong>{" "}
                                <span className="text-slate-500">
                                  ({quyDoiHienTrang(p, t.quantity)})
                                </span>
                              </div>
                            );
                          })}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-700">
                          {photos.length} ảnh
                        </td>
                        <td className="py-3 px-3">{stBadge}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onMoBieuMau(code)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800"
                          >
                            BM-SKB-01
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: KẾ HOẠCH SẢN XUẤT (KẾ THỪA) ================= */}
      {subTab === "ke-hoach" && (
        <div className="space-y-6 anim-view-enter">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#141A23] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  KẾ THỪA TỰ ĐỘNG SANG NV SẢN XUẤT & DASHBOARD KẾ TOÁN
                </span>
                <h2 className="text-base font-extrabold">Nạp Kế Hoạch Sản Xuất Theo Ngày</h2>
              </div>
              <CalendarPlus className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 rounded-2xl bg-amber-50/40 border border-amber-200">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Ngày kế hoạch
                  </label>
                  <input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold bg-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Mặt hàng bia
                  </label>
                  <select
                    value={planProduct}
                    onChange={(e) => setPlanProduct(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Sản lượng KH *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={planQty || ""}
                    onChange={(e) => setPlanQty(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-sm font-black bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Mã lô dự kiến
                  </label>
                  <input
                    type="text"
                    value={planBatch}
                    onChange={(e) => setPlanBatch(e.target.value)}
                    placeholder="LO-..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    disabled={busy || planQty <= 0}
                    onClick={() => void handleAddPlan()}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-extrabold transition shadow"
                  >
                    + Phát hành
                  </button>
                </div>
                <div className="sm:col-span-12">
                  <input
                    type="text"
                    value={planNote}
                    onChange={(e) => setPlanNote(e.target.value)}
                    placeholder="Ghi chú kế hoạch (VD: Ưu tiên cấp cho Lễ Hội Bia / 1901)..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  />
                </div>
              </div>

              {/* Tiến độ thực hiện kế hoạch ngày đang chọn */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Mặt hàng bia</th>
                      <th className="py-3 px-3 text-right">Kế hoạch</th>
                      <th className="py-3 px-3 text-right">Xưởng đã giao</th>
                      <th className="py-3 px-3 text-right">Kho đã nhận (2 rào)</th>
                      <th className="py-3 px-4">Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {planProgress.map((r) => (
                      <tr key={r.productId} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{r.productName}</span>
                          {r.notes[0] && (
                            <span className="block text-[11px] text-slate-400">{r.notes[0]}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 tabular-nums">
                          {formatNumber(r.plannedQty)} {r.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                          {formatNumber(r.sentFromBrewery)} {r.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {formatNumber(r.receivedByWarehouse)} {r.unit}
                        </td>
                        <td className="py-3 px-4 w-44">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full bar-fill",
                                  r.pctBrewery >= 100 ? "bg-emerald-500" : "bg-amber-500",
                                )}
                                style={{ width: `${Math.min(100, r.pctBrewery)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold w-10 text-right">
                              {r.pctBrewery}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {planProgress.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                          Chưa có kế hoạch sản xuất cho ngày {planDate}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Danh sách bản ghi kế hoạch để xoá nếu nhập nhầm */}
              {keHoach.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Các dòng kế hoạch đã lưu ({keHoach.length})
                  </p>
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                    {keHoach.map((pl) => {
                      const p = products.find((x) => x.id === pl.productId);
                      return (
                        <div
                          key={pl.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs bg-white"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-500 mr-2">
                              {pl.date}
                            </span>
                            <span className="font-bold text-slate-900">{p?.name || pl.productId}</span>
                            <span className="ml-2 font-mono font-black text-amber-700">
                              {formatNumber(pl.targetQty)} {p?.unit}
                            </span>
                            {pl.batchHint && (
                              <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100">
                                {pl.batchHint}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void onXoaKeHoach(pl.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Xoá dòng kế hoạch này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: KIỂM KÊ FST & BBT ================= */}
      {subTab === "kiem-ke" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden anim-view-enter">
          <div className="px-6 py-4 bg-[#141A23] text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                GIÁM SÁT TỒN BỒN CUỐI THÁNG
              </span>
              <h2 className="text-base font-extrabold">
                Dữ Liệu Kiểm Kê Bồn FST & BBT (Từ NV Sản Xuất)
              </h2>
            </div>
            <Database className="w-5 h-5 text-sky-400" />
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {kiemKeBon.length === 0 ? (
              <p className="col-span-2 py-8 text-center text-xs font-bold text-slate-400">
                Chưa có bản ghi kiểm kê bồn FST/BBT nào.
              </p>
            ) : (
              kiemKeBon.map((kk) => {
                const bon = DANH_SACH_BON_BIA.find((t) => t.id === kk.tankId);
                const p = products.find((x) => x.id === kk.productId);
                const anh = anhTheoChungTu.get(kk.id) || [];
                return (
                  <div
                    key={kk.id}
                    className="p-4 rounded-2xl border border-slate-200 flex gap-4 items-center card-lift"
                  >
                    {anh[0] && (
                      <a
                        href={anh[0].url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-32 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-300 shrink-0"
                      >
                        <OAnhLuoi url={anh[0].url} alt={kk.tankId} rong={400} className="w-full h-full object-cover" />
                      </a>
                    )}
                    <div className="space-y-1 text-xs min-w-0">
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-mono font-black">
                        {kk.tankId} · {kk.month}
                      </span>
                      <p className="font-extrabold text-slate-900 truncate">
                        {p?.name || kk.productId}
                      </p>
                      <p className="font-mono font-bold text-amber-700">Lô: {kk.batchNumber}</p>
                      <p className="font-mono font-black text-emerald-700 text-sm tabular-nums">
                        {formatNumber(kk.liters)} Lít{" "}
                        {bon ? `(Max ${formatNumber(bon.sucChuaLit)}L)` : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: NHẬP LẺ & TỒN ĐẦU ================= */}
      {subTab === "nhap-le" && nhapLeContent && (
        <div className="anim-view-enter">{nhapLeContent}</div>
      )}

      {/* ================= TAB 5: PHIẾU GIẤY CŨ ================= */}
      {subTab === "phieu-cu" && phieuCuContent && (
        <div className="anim-view-enter">{phieuCuContent}</div>
      )}
    </div>
  );
}

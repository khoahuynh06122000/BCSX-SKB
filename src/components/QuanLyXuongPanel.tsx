import { useMemo, useState, type ReactNode } from "react";
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
  DanhGiaSanXuat,
  ImportSlip,
  KeHoachSanXuat,
  KiemKeBon,
  KiemKeKegItem,
  KiemKeKegLit,
  Product,
  Transaction,
} from "../types";
import type { AnhChungTu } from "../anh/moHinh";
import type { TepCho } from "../anh/ChonAnh";
import OAnhLuoi from "../anh/OAnhLuoi";
import { quaTrungChuyen } from "../anh/duongDan";
import KiemKeKegLitSection from "./KiemKeKegLitSection";
import {
  DANH_SACH_BON_BIA,
  kiemKeBonCuaThang,
  quyDoiHienTrang,
  tongHopKeHoachVaThucXuat,
} from "../lib/loBia";
import { cn, formatNumber } from "../lib/utils";

export type QuanLyXuongSubTab =
  | "duyet-nhat-ky"
  | "ke-hoach"
  | "kiem-ke";

interface Props {
  products: Product[];
  transactions: Transaction[];
  slips: ImportSlip[];
  approvedSlips: Set<string>;
  anhTheoChungTu: Map<string, AnhChungTu[]>;
  keHoach: KeHoachSanXuat[];
  danhGia: DanhGiaSanXuat[];
  kiemKeBon: KiemKeBon[];
  kiemKeKeg: KiemKeKegLit[];
  isAdmin?: boolean;
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
  onDuyetDanhGia: (id: string, status: "approved" | "returned", reason?: string) => Promise<void>;
  onXoaDanhGia: (id: string) => Promise<void>;
  onDuyetKiemKeBon: (id: string, status: "approved" | "returned", reason?: string) => Promise<void>;
  onXoaKiemKeBon: (id: string) => Promise<void>;
  onDuyetKiemKeKeg: (id: string, status: "approved" | "returned", reason?: string) => Promise<void>;
  onXoaKiemKeKeg: (id: string) => Promise<void>;
  onLuuKiemKeKegLit?: (input: {
    date: string;
    shiftOrPeriod: string;
    location: "XUONG" | "KHO_TONG";
    items: KiemKeKegItem[];
    totalKegs: number;
    totalLiters: number;
    note: string;
    photos: TepCho[];
  }) => Promise<boolean>;
  nhatKyPhieuContent?: ReactNode;
  /** Ký duyệt & chốt kiểm kê tháng ở Xưởng (keg/lít, bồn): GIÁM SÁT XƯỞNG (và admin). */
  laGiamSatXuong?: boolean;
}

export default function QuanLyXuongPanel({
  products,
  transactions,
  slips,
  approvedSlips,
  anhTheoChungTu,
  keHoach,
  danhGia,
  kiemKeBon,
  kiemKeKeg,
  isAdmin = false,
  busy,
  onDuyetRao1,
  onTraLaiPhieu,
  onMoBieuMau,
  onLuuKeHoach,
  onXoaKeHoach,
  onDuyetDanhGia,
  onXoaDanhGia,
  onDuyetKiemKeBon,
  onXoaKiemKeBon,
  onDuyetKiemKeKeg,
  onXoaKiemKeKeg,
  onLuuKiemKeKegLit,
  nhatKyPhieuContent,
  laGiamSatXuong = false,
}: Props) {
  const [subTab, setSubTab] = useState<QuanLyXuongSubTab>("duyet-nhat-ky");
  const [nhatKyView, setNhatKyView] = useState<"bang" | "phieu">("bang");
  const [kkSubView, setKkSubView] = useState<"keg-lit" | "bon">("keg-lit");

  const kegXuongRecords = useMemo(
    () => kiemKeKeg.filter((r) => r.location === "XUONG"),
    [kiemKeKeg],
  );
  const pendingDanhGiaCount = useMemo(
    () => danhGia.filter((d) => !d.approvalStatus || d.approvalStatus === "pending").length,
    [danhGia],
  );
  const pendingKiemKeCount = useMemo(
    () =>
      kegXuongRecords.filter((k) => !k.approvalStatus || k.approvalStatus === "pending").length +
      kiemKeBon.filter((b) => !b.approvalStatus || b.approvalStatus === "pending").length,
    [kegXuongRecords, kiemKeBon],
  );

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
              {
                id: "ke-hoach" as const,
                label:
                  pendingDanhGiaCount > 0
                    ? `2. Kế hoạch & Đánh giá SX (${pendingDanhGiaCount})`
                    : "2. Kế hoạch & Đánh giá SX",
              },
              {
                id: "kiem-ke" as const,
                label:
                  pendingKiemKeCount > 0
                    ? `3. Duyệt Kiểm kê (${pendingKiemKeCount})`
                    : `3. Kiểm kê Keg & Bồn (${kegXuongRecords.length + kiemKeBon.length})`,
              },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
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
                            href={quaTrungChuyen(ph.url)}
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

          {/* Nhật ký xuất xưởng / bàn giao kho tổng & Toàn bộ chứng từ phiếu nhập */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Nhật Ký Xuất Xưởng, Phiếu Nhập &amp; Trạng Thái 2 Bước Rào
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold">
                <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Đã vào kho: {formatNumber(stats.approvedL)} L
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                  Đang chờ duyệt: {formatNumber(stats.pendingL)} L
                </span>
                {nhatKyPhieuContent && (
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 font-sans ml-auto sm:ml-2">
                    <button
                      type="button"
                      onClick={() => setNhatKyView("bang")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all",
                        nhatKyView === "bang"
                          ? "bg-[#141A23] text-amber-300 shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                      )}
                    >
                      Bảng Rào &amp; BM-SKB-01
                    </button>
                    <button
                      type="button"
                      onClick={() => setNhatKyView("phieu")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all",
                        nhatKyView === "phieu"
                          ? "bg-[#141A23] text-amber-300 shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                      )}
                    >
                      Chứng từ &amp; Ảnh ({slipsWithRows.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
            {nhatKyPhieuContent && nhatKyView === "phieu" ? (
              <div className="p-4 sm:p-6">{nhatKyPhieuContent}</div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Số phiếu / Ngày</th>
                    <th className="py-3 px-3">Mặt hàng &amp; Mã lô</th>
                    <th className="py-3 px-3 text-right">Số lượng (Keg)</th>
                    <th className="py-3 px-3 text-center">Ảnh</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Biểu mẫu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slipsWithRows.map(({ code, slip, txs }) => {
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
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {!vaoTon && slip?.status !== "cho_kho_tong" && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void onDuyetRao1(code)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#141A23] hover:bg-slate-800 text-amber-300 text-[11px] font-extrabold flex items-center gap-1"
                                  title="Duyệt Rào 1 (Xuất xưởng sang Kho tổng)"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt Rào 1
                                </button>
                                {slip?.status !== "tra_lai" && (
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
                                    className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-[11px] font-extrabold"
                                  >
                                    Trả lại
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => onMoBieuMau(code)}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800"
                            >
                              BM-SKB-01
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
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

          {/* Duyệt & Quản lý Đánh giá Sản lượng Ngày từ NV Sản xuất */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#141A23] text-white flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  GIÁM SÁT XƯỞNG · ĐÁNH GIÁ SẢN LƯỢNG THEO CA / NGÀY
                </span>
                <h3 className="text-base font-extrabold">
                  Duyệt &amp; Quản Lý Dữ Liệu Đánh Giá Sản Lượng ({danhGia.length})
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-mono text-xs font-black">
                {pendingDanhGiaCount} chờ duyệt
              </span>
            </div>

            {danhGia.length === 0 ? (
              <p className="py-10 text-center text-xs font-bold text-slate-400">
                Chưa có bản đánh giá sản lượng ngày nào từ Xưởng sản xuất.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {danhGia.map((ev) => {
                  const p = products.find((x) => x.id === ev.productId);
                  return (
                    <div
                      key={ev.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-extrabold",
                              ev.rating.includes("Chậm")
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800",
                            )}
                          >
                            {ev.rating}
                          </span>
                          {ev.approvalStatus === "approved" ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black">
                              ✓ QL Xưởng đã duyệt{ev.approvedBy ? ` · ${ev.approvedBy}` : ""}
                            </span>
                          ) : ev.approvalStatus === "returned" ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                              ⚠ Đã trả lại{ev.rejectedReason ? `: ${ev.rejectedReason}` : ""}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                              ⏳ Chờ duyệt
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-500">
                            {ev.date} · {ev.shift} · {ev.createdBy}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-slate-900">
                          {p?.name || ev.productId}
                        </p>
                        {ev.note && <p className="text-xs text-slate-600">{ev.note}</p>}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <div className="flex items-center gap-4 font-mono pr-2">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">KẾ HOẠCH</span>
                            <span className="text-sm font-bold text-slate-700 tabular-nums">
                              {formatNumber(ev.plannedQty)} {p?.unit}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">THỰC CHIẾT</span>
                            <span className="text-sm font-black text-amber-700 tabular-nums">
                              {formatNumber(ev.actualBrewedQty)} {p?.unit}
                            </span>
                          </div>
                        </div>
                        {ev.approvalStatus !== "approved" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onDuyetDanhGia(ev.id, "approved")}
                            className="px-3 py-1.5 rounded-xl bg-[#141A23] hover:bg-slate-800 text-amber-300 text-xs font-extrabold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                          </button>
                        )}
                        {ev.approvalStatus !== "returned" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const lyDo = window.prompt(
                                "Lý do trả lại / yêu cầu sửa đánh giá sản lượng:",
                                "Số liệu sản lượng hoặc ghi chú ca chưa khớp",
                              );
                              if (lyDo?.trim()) void onDuyetDanhGia(ev.id, "returned", lyDo.trim());
                            }}
                            className="px-3 py-1.5 rounded-xl border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-xs font-extrabold flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Trả lại
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onXoaDanhGia(ev.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Xoá bản đánh giá sản lượng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: DUYỆT & QUẢN LÝ KIỂM KÊ XƯỞNG (KEG & BỒN) ================= */}
      {subTab === "kiem-ke" && (
        <div className="space-y-5 anim-view-enter">
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
            <button
              type="button"
              onClick={() => setKkSubView("keg-lit")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-extrabold transition-colors",
                kkSubView === "keg-lit"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              Kiểm kê Keg &amp; Lít Xưởng ({kegXuongRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setKkSubView("bon")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-extrabold transition-colors",
                kkSubView === "bon"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              Kiểm kê Bồn FST &amp; BBT ({kiemKeBon.length})
            </button>
          </div>

          {kkSubView === "keg-lit" ? (
            <KiemKeKegLitSection
              location="XUONG"
              products={products}
              records={kiemKeKeg}
              anhTheoChungTu={anhTheoChungTu}
              canWrite={isAdmin && Boolean(onLuuKiemKeKegLit)}
              canApprove={laGiamSatXuong}
              tenNguoiDuyet="Giám sát xưởng"
              canDelete={true}
              busy={busy}
              onSave={onLuuKiemKeKegLit || (async () => false)}
              onApprove={onDuyetKiemKeKeg}
              onDelete={onXoaKiemKeKeg}
            />
          ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-[#141A23] text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                GIÁM SÁT TỒN BỒN CUỐI THÁNG · DUYỆT &amp; QUẢN LÝ DỮ LIỆU
              </span>
              <h2 className="text-base font-extrabold">
                Duyệt Kiểm Kê Bồn FST &amp; BBT ({kiemKeBon.length})
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
                    className="p-4 rounded-2xl border border-slate-200 space-y-3 card-lift"
                  >
                    <div className="flex gap-4 items-center">
                      {anh[0] && (
                        <a
                          href={quaTrungChuyen(anh[0].url)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-32 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-300 shrink-0"
                        >
                          <OAnhLuoi url={anh[0].url} alt={kk.tankId} rong={400} className="w-full h-full object-cover" />
                        </a>
                      )}
                      <div className="space-y-1 text-xs min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-mono font-black">
                            {kk.tankId} · {kk.month}
                          </span>
                          {kk.approvalStatus === "approved" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              ✍ Đã ký duyệt{kk.approvedBy ? ` · ${kk.approvedBy}` : ""}
                              {kiemKeBonCuaThang(kiemKeBon, kk.month).some((x) => x.id === kk.id)
                                ? ` · 📌 Chốt T${kk.month.slice(5, 7)}/${kk.month.slice(0, 4)}`
                                : ""}
                            </span>
                          ) : kk.approvalStatus === "returned" ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                              ⚠ Trả lại{kk.rejectedReason ? `: ${kk.rejectedReason}` : ""}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                              ⏳ Chờ giám sát xưởng ký duyệt
                            </span>
                          )}
                        </div>
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
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Người nhập: {kk.createdBy || "—"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {laGiamSatXuong && kk.approvalStatus !== "approved" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const daChot = kiemKeBonCuaThang(kiemKeBon, kk.month).find(
                                (x) => x.tankId === kk.tankId,
                              );
                              const hoi = daChot
                                ? `Bồn ${kk.tankId} tháng ${kk.month} đã chốt ${daChot.liters} L.\n\nKý duyệt bản này (${kk.liters} L) sẽ THAY làm số chốt tháng. Tiếp tục?`
                                : `Ký duyệt và CHỐT bồn ${kk.tankId} tháng ${kk.month}: ${kk.liters} L?`;
                              if (window.confirm(hoi)) void onDuyetKiemKeBon(kk.id, "approved");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#141A23] hover:bg-slate-800 text-amber-300 text-[11px] font-extrabold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Ký duyệt & chốt tháng
                          </button>
                        )}
                        {laGiamSatXuong && kk.approvalStatus !== "returned" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const lyDo = window.prompt(
                                `Lý do trả lại kiểm kê bồn ${kk.tankId}:`,
                                "Số đo lít bồn hoặc ảnh thước đo chưa rõ",
                              );
                              if (lyDo?.trim()) void onDuyetKiemKeBon(kk.id, "returned", lyDo.trim());
                            }}
                            className="px-2.5 py-1 rounded-lg border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-[11px] font-extrabold flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Trả lại
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onXoaKiemKeBon(kk.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Xoá bản kiểm kê bồn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Layers,
  Loader2,
  Send,
  Sparkles,
  Upload,
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
import ChonAnh, { taoTepCho, type TepCho } from "../anh/ChonAnh";
import KiemKeKegLitSection from "./KiemKeKegLitSection";
import {
  DANH_SACH_BON_BIA,
  quyDoiHienTrang,
  tongHopKeHoachVaThucXuat,
} from "../lib/loBia";
import { cn, formatNumber } from "../lib/utils";

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
  currentUserName: string;
  busy: boolean;
  onGuiPhieuGiao: (input: {
    date: string;
    items: { productId: string; quantity: number; batchNumber: string }[];
    notes: string;
    photos: TepCho[];
    editSlipCode?: string;
  }) => Promise<boolean>;
  onLuuDanhGia: (dg: Omit<DanhGiaSanXuat, "id" | "createdBy" | "createdAt">) => Promise<boolean>;
  onLuuKiemKeBon: (input: {
    month: string;
    tankId: string;
    tankGroup: "FST" | "BBT";
    productId: string;
    batchNumber: string;
    liters: number;
    statusLabel: string;
    photos: TepCho[];
  }) => Promise<boolean>;
  onLuuKiemKeKegLit: (input: {
    date: string;
    shiftOrPeriod: string;
    location: "XUONG" | "KHO_TONG";
    items: KiemKeKegItem[];
    totalKegs: number;
    totalLiters: number;
    note: string;
    photos: TepCho[];
  }) => Promise<boolean>;
}

export default function XuongSanXuatPanel({
  products,
  transactions,
  slips,
  approvedSlips,
  anhTheoChungTu,
  keHoach,
  danhGia,
  kiemKeBon,
  kiemKeKeg,
  currentUserName,
  busy,
  onGuiPhieuGiao,
  onLuuDanhGia,
  onLuuKiemKeBon,
  onLuuKiemKeKegLit,
}: Props) {
  const [subTab, setSubTab] = useState<"lap-phieu" | "danh-gia" | "kiem-ke">("lap-phieu");
  const [kkMode, setKkMode] = useState<"keg-lit" | "bon">("keg-lit");

  /* ---------- Tab 1: Lập phiếu giao bia sang Kho tổng ---------- */
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [commonBatch, setCommonBatch] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [batches, setBatches] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<TepCho[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState("");

  const returnedSlips = useMemo(() => {
    const map = new Map<string, { slip: ImportSlip; txs: Transaction[] }>();
    slips
      .filter((s) => s.status === "tra_lai")
      .forEach((s) => {
        const txs = transactions.filter((t) => t.type === "IN" && t.slipCode === s.code);
        map.set(s.code, { slip: s, txs });
      });
    return Array.from(map.values());
  }, [slips, transactions]);

  const planProgress = useMemo(
    () =>
      tongHopKeHoachVaThucXuat(
        keHoach,
        transactions,
        slips,
        products,
        approvedSlips,
        date,
      ),
    [keHoach, transactions, slips, products, approvedSlips, date],
  );

  const activeItems = useMemo(
    () =>
      products
        .filter((p) => (Number(quantities[p.id]) || 0) > 0)
        .map((p) => ({
          product: p,
          productId: p.id,
          quantity: Number(quantities[p.id]) || 0,
          batchNumber: (batches[p.id] || "").trim() || commonBatch.trim(),
        })),
    [products, quantities, batches, commonBatch],
  );

  const hasQty = activeItems.length > 0;
  const hasAllBatches = hasQty && activeItems.every((i) => !!i.batchNumber);
  const hasPhoto = photos.length > 0;
  const canSubmit = hasQty && hasAllBatches && hasPhoto && !busy;

  const prefillFromPlan = () => {
    const nextQty: Record<string, number> = { ...quantities };
    const nextBatch: Record<string, string> = { ...batches };
    let filled = 0;
    planProgress.forEach((row) => {
      const remain = Math.max(0, row.plannedQty - row.sentFromBrewery);
      if (remain > 0) {
        nextQty[row.productId] = remain;
        if (row.batchHints[0] && !nextBatch[row.productId]) {
          nextBatch[row.productId] = row.batchHints[0];
        }
        filled++;
      }
    });
    if (filled > 0) {
      setQuantities(nextQty);
      setBatches(nextBatch);
    }
  };

  const handleChonAnhGiao = async (files: FileList | null) => {
    setPhotoErr("");
    const { ds, hong } = await taoTepCho(files);
    if (hong) setPhotoErr(`Không đọc được ${hong} tệp ảnh. Anh/chị chọn lại nhé.`);
    if (ds.length) setPhotos((cu) => [...cu, ...ds]);
  };

  const loadReturnedToEdit = (slip: ImportSlip, txs: Transaction[]) => {
    const nextQ: Record<string, number> = {};
    const nextB: Record<string, string> = {};
    txs.forEach((t) => {
      nextQ[t.productId] = (nextQ[t.productId] || 0) + (t.quantity || 0);
      if (t.batchNumber) nextB[t.productId] = t.batchNumber;
    });
    setDate(slip.date || today);
    setQuantities(nextQ);
    setBatches(nextB);
    setCommonBatch("");
    setEditingCode(slip.code);
    setSubTab("lap-phieu");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitHandover = async () => {
    if (!canSubmit) return;
    const ok = await onGuiPhieuGiao({
      date,
      items: activeItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        batchNumber: i.batchNumber,
      })),
      notes: notes.trim(),
      photos,
      editSlipCode: editingCode || undefined,
    });
    if (ok) {
      setQuantities({});
      setBatches({});
      setCommonBatch("");
      setNotes("");
      setPhotos([]);
      setEditingCode(null);
    }
  };

  /* ---------- Tab 2: Đánh giá sản lượng trong ngày ---------- */
  const [evalProduct, setEvalProduct] = useState(products[0]?.id || "");
  const [evalShift, setEvalShift] = useState("Ca sáng (07:00 - 15:00)");
  const [evalActual, setEvalActual] = useState<number>(0);
  const [evalRating, setEvalRating] = useState("Đạt tiến độ");
  const [evalNote, setEvalNote] = useState("");

  const handleSaveEval = async () => {
    if (!evalProduct || evalActual <= 0 || busy) return;
    const planQty =
      planProgress.find((r) => r.productId === evalProduct)?.plannedQty || 0;
    const ok = await onLuuDanhGia({
      date,
      shift: evalShift,
      productId: evalProduct,
      plannedQty: planQty,
      actualBrewedQty: evalActual,
      rating: evalRating,
      note: evalNote.trim() || "Đã ghi nhận sản lượng thực chiết tại xưởng.",
    });
    if (ok) {
      setEvalActual(0);
      setEvalNote("");
    }
  };

  /* ---------- Tab 3: Kiểm kê tháng bồn FST & BBT ---------- */
  const [kkMonth, setKkMonth] = useState(format(new Date(), "yyyy-MM"));
  const [kkTank, setKkTank] = useState(DANH_SACH_BON_BIA[0].id);
  const [kkProduct, setKkProduct] = useState(
    products.find((p) => p.category === "Lít")?.id || products[0]?.id || "",
  );
  const [kkBatch, setKkBatch] = useState("");
  const [kkLiters, setKkLiters] = useState<number>(0);
  const [kkStatus, setKkStatus] = useState("Đang lên men / ủ bồn");
  const [kkPhotos, setKkPhotos] = useState<TepCho[]>([]);

  const handleChonAnhBon = async (files: FileList | null) => {
    const { ds } = await taoTepCho(files, {
      stampTimestamp: true,
      stampLabel: "KIỂM KÊ BỒN FST/BBT · XƯỞNG",
    });
    if (ds.length) setKkPhotos((cu) => [...cu, ...ds]);
  };

  const canSaveTank =
    !!kkTank && !!kkProduct && !!kkBatch.trim() && kkLiters >= 0 && kkPhotos.length > 0 && !busy;

  const handleSaveTank = async () => {
    if (!canSaveTank) return;
    const tank = DANH_SACH_BON_BIA.find((t) => t.id === kkTank) || DANH_SACH_BON_BIA[0];
    const ok = await onLuuKiemKeBon({
      month: kkMonth,
      tankId: tank.id,
      tankGroup: tank.nhom,
      productId: kkProduct,
      batchNumber: kkBatch.trim(),
      liters: kkLiters,
      statusLabel: kkStatus.trim(),
      photos: kkPhotos,
    });
    if (ok) {
      setKkBatch("");
      setKkLiters(0);
      setKkPhotos([]);
    }
  };

  return (
    <div className="space-y-6 anim-view-enter">
      {/* Sub-header vai trò & 3 tab công việc */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-900">
            Xưởng Sản Xuất Sun KraftBeer · {currentUserName}
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Kế thừa kế hoạch từ Quản lý xưởng, lập phiếu giao bia có ảnh hiện trạng và kiểm kê bồn FST/BBT.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          {(
            [
              { id: "lap-phieu", label: "1. Lập phiếu giao bia" },
              { id: "danh-gia", label: "2. Đánh giá sản lượng ngày" },
              { id: "kiem-ke", label: "3. Kiểm kê (Keg/Lít & Bồn)" },
            ] as const
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

      {/* ================= TAB 1: LẬP PHIẾU GIAO BIA SANG KHO TỔNG ================= */}
      {subTab === "lap-phieu" && (
        <div className="space-y-5 anim-view-enter">
          {/* Phiếu bị trả lại cần sửa */}
          {returnedSlips.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Có {returnedSlips.length} phiếu bị trả lại cần sửa & trình lại
              </div>
              {returnedSlips.map(({ slip, txs }) => (
                <div
                  key={slip.code}
                  className="p-3 rounded-xl bg-white border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="text-xs">
                    <span className="font-mono font-black text-slate-900">{slip.code}</span>
                    <span className="text-rose-700 font-bold ml-2">
                      ({slip.rejectedBy || "Quản lý"}): "{slip.rejectedReason}"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadReturnedToEdit(slip, txs)}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0"
                  >
                    Nạp lên form để sửa
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Kế hoạch sản xuất kế thừa từ Quản lý xưởng */}
          {planProgress.some((r) => r.plannedQty > 0) && (
            <div className="bg-white rounded-2xl border border-amber-300/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-[#141A23] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot" />
                  <span className="text-xs font-extrabold">
                    Kế Hoạch Sản Xuất Ngày {date.split("-").reverse().join("/")} (Kế thừa từ Quản Lý Xưởng)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={prefillFromPlan}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Điền phần còn thiếu theo Kế hoạch
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {planProgress
                  .filter((r) => r.plannedQty > 0)
                  .map((r) => {
                    const remain = Math.max(0, r.plannedQty - r.sentFromBrewery);
                    return (
                      <div
                        key={r.productId}
                        className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 card-lift"
                      >
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {r.productName}
                        </p>
                        <div className="flex items-baseline justify-between mt-1.5 font-mono">
                          <span className="text-xs font-black text-amber-800 tabular-nums">
                            {formatNumber(r.sentFromBrewery)} / {formatNumber(r.plannedQty)} {r.unit}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {r.pctBrewery}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full bar-fill",
                              r.pctBrewery >= 100 ? "bg-emerald-500" : "bg-amber-500",
                            )}
                            style={{ width: `${Math.min(100, r.pctBrewery)}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 mt-1.5">
                          {remain > 0
                            ? `Cần giao thêm: ${formatNumber(remain)} ${r.unit}`
                            : "✓ Đã giao đủ kế hoạch"}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Form Lập Phiếu Giao Bia Paperless */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#141A23] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  {editingCode ? `CHỈNH SỬA PHIẾU ${editingCode}` : "XƯỞNG SẢN XUẤT ➔ KHO TỔNG"}
                </span>
                <h2 className="text-base font-extrabold mt-0.5">
                  {editingCode
                    ? `Sửa & Trình Lại Phiếu ${editingCode}`
                    : "Lập Phiếu Bàn Giao Bia Theo Lô (Paperless)"}
                </h2>
              </div>
              {editingCode && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCode(null);
                    setQuantities({});
                    setBatches({});
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
                >
                  Huỷ chế độ sửa
                </button>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* 3 Đèn kiểm soát cửa vào */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    ok: hasQty,
                    label: "1. Số lượng & Quy đổi Keg",
                    sub: hasQty ? `${activeItems.length} mặt hàng` : "Chưa nhập số lượng",
                  },
                  {
                    ok: hasAllBatches,
                    label: "2. Mã lô sản xuất (100%)",
                    sub: hasAllBatches ? "Đủ mã lô cho mọi dòng" : "Bắt buộc mọi dòng",
                  },
                  {
                    ok: hasPhoto,
                    label: "3. Ảnh hiện trạng Keg/Thùng",
                    sub: hasPhoto ? `${photos.length} ảnh sẵn sàng` : "Không có ảnh = Chặn gửi",
                  },
                ].map((g) => (
                  <div
                    key={g.label}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl border text-xs flex items-center gap-2.5",
                      g.ok
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : "bg-rose-50/70 border-rose-200 text-rose-800",
                    )}
                  >
                    <CheckCircle2
                      className={cn("w-4 h-4 shrink-0", g.ok ? "text-emerald-600" : "text-rose-400")}
                    />
                    <div>
                      <p className="font-extrabold leading-tight">{g.label}</p>
                      <p className="text-[10px] font-semibold opacity-80">{g.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Ngày giao bia
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm font-bold bg-slate-50 focus:bg-white focus:border-amber-600 outline-none"
                  />
                </div>
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-amber-800 mb-1">
                    Mã lô chung (Tự áp cho các dòng chưa nhập lô riêng) *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Layers className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={commonBatch}
                        onChange={(e) => setCommonBatch(e.target.value)}
                        placeholder="VD: LO-261116-SKB01"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50/40 font-mono text-sm font-bold focus:bg-white focus:border-amber-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng nhập số lượng + quy đổi Keg + Mã lô */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3.5">Mặt hàng bia</th>
                        <th className="py-2.5 px-2 text-center w-14">ĐVT</th>
                        <th className="py-2.5 px-2 text-right w-28">Số lượng</th>
                        <th className="py-2.5 px-2 text-center w-32">Quy đổi hiện trạng</th>
                        <th className="py-2.5 px-3.5 w-44">Mã lô *</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((p) => {
                        const qty = Number(quantities[p.id]) || 0;
                        const ownBatch = (batches[p.id] || "").trim();
                        const effectiveBatch = ownBatch || commonBatch.trim();
                        const missingBatch = qty > 0 && !effectiveBatch;
                        return (
                          <tr
                            key={p.id}
                            className={cn(
                              "transition-colors",
                              qty > 0 ? "bg-amber-50/30" : "hover:bg-slate-50",
                            )}
                          >
                            <td className="py-2.5 px-3.5">
                              <span className="font-bold text-slate-900 block">{p.name}</span>
                              {p.materialCode && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  SAP: {p.materialCode}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                              {p.unit}
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={qty > 0 ? qty : ""}
                                placeholder="0"
                                onChange={(e) =>
                                  setQuantities((cu) => ({
                                    ...cu,
                                    [p.id]: Number(e.target.value) || 0,
                                  }))
                                }
                                className={cn(
                                  "w-24 px-2.5 py-1.5 rounded-lg border text-right font-mono tabular-nums outline-none",
                                  qty > 0
                                    ? "border-amber-500 bg-white font-extrabold text-slate-900"
                                    : "border-slate-200 bg-slate-50",
                                )}
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={cn(
                                  "inline-block px-2 py-1 rounded-lg font-mono text-[11px] font-bold",
                                  qty > 0 ? "bg-[#141A23] text-amber-300" : "text-slate-300",
                                )}
                              >
                                {quyDoiHienTrang(p, qty)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <input
                                type="text"
                                value={batches[p.id] || ""}
                                placeholder={commonBatch || (qty > 0 ? "Bắt buộc *" : "—")}
                                onChange={(e) =>
                                  setBatches((cu) => ({ ...cu, [p.id]: e.target.value }))
                                }
                                className={cn(
                                  "w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold outline-none",
                                  missingBatch
                                    ? "border-rose-400 bg-rose-50 placeholder-rose-400"
                                    : "border-slate-200 bg-white",
                                )}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ảnh chụp hiện trạng Keg/Thùng bắt buộc */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      📸 Ảnh chụp hiện trạng giao bia (Bắt buộc đủ số Keg/Thùng)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Giao 200L (10 Keg) phải chụp đủ 10 Keg. Không có ảnh hệ thống sẽ khoá nút Gửi.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="px-3.5 py-2 rounded-xl bg-[#141A23] text-white text-xs font-extrabold cursor-pointer hover:bg-slate-800 transition flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Chụp ảnh
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          void handleChonAnhGiao(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-extrabold cursor-pointer hover:bg-slate-100 transition flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Chọn ảnh
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          void handleChonAnhGiao(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                {photoErr && (
                  <p className="text-xs font-bold text-rose-600">{photoErr}</p>
                )}
                {photos.length === 0 ? (
                  <div className="py-4 text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                    ⚠️ Chưa có ảnh chụp hiện trạng. Hệ thống đang khoá nút Gửi!
                  </div>
                ) : (
                  <ChonAnh ds={photos} onDoi={setPhotos} />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Ghi chú ca sản xuất / bàn giao (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Bàn giao ca sáng sang Kho tổng..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-amber-600"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                <span className={cn("text-xs font-bold", canSubmit ? "text-emerald-700" : "text-rose-600")}>
                  {canSubmit
                    ? "✓ Đã đủ Số lượng + Mã lô + Ảnh hiện trạng. Sẵn sàng ký trình!"
                    : "🔒 Cần đủ Số lượng, Mã lô và Ảnh hiện trạng Keg để gửi."}
                </span>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void submitHandover()}
                  className={cn(
                    "px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                    canSubmit
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/25 cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed",
                  )}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editingCode ? "Cập nhật & Trình lại QL Xưởng" : "Ký Điện Tử & Gửi QL Xưởng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ĐÁNH GIÁ SẢN LƯỢNG TRONG NGÀY ================= */}
      {subTab === "danh-gia" && (
        <div className="space-y-6 anim-view-enter">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#141A23] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  ĐÁNH GIÁ CUỐI CA / CUỐI NGÀY
                </span>
                <h2 className="text-base font-extrabold">
                  Ghi Nhận & Đánh Giá Sản Lượng Sản Xuất Trong Ngày
                </h2>
              </div>
              <ClipboardCheck className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Loại bia sản xuất
                  </label>
                  <select
                    value={evalProduct}
                    onChange={(e) => setEvalProduct(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Ca sản xuất
                  </label>
                  <select
                    value={evalShift}
                    onChange={(e) => setEvalShift(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                  >
                    <option>Ca sáng (07:00 - 15:00)</option>
                    <option>Ca chiều (15:00 - 23:00)</option>
                    <option>Cả ngày (Tổng hợp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Thực chiết tại xưởng
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={evalActual || ""}
                    onChange={(e) => setEvalActual(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Kết quả đánh giá
                  </label>
                  <select
                    value={evalRating}
                    onChange={(e) => setEvalRating(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-emerald-50 text-emerald-900"
                  >
                    <option value="Đạt tiến độ">✅ Đạt kế hoạch</option>
                    <option value="Vượt kế hoạch">🚀 Vượt kế hoạch</option>
                    <option value="Chậm / Hụt sản lượng">⚠️ Chậm / Hụt sản lượng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-9">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Ghi chú kỹ thuật / Nguyên nhân chênh lệch mẻ chiết
                  </label>
                  <input
                    type="text"
                    value={evalNote}
                    onChange={(e) => setEvalNote(e.target.value)}
                    placeholder="VD: Áp suất lọc ổn định, đã giao 10 Keg ca sáng..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    disabled={busy || evalActual <= 0}
                    onClick={() => void handleSaveEval()}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-extrabold transition shadow"
                  >
                    + Lưu Đánh Giá
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                Lịch Sử Đánh Giá Sản Lượng Theo Ngày ({danhGia.length})
              </h3>
            </div>
            {danhGia.length === 0 ? (
              <p className="py-10 text-center text-xs font-bold text-slate-400">
                Chưa có bản ghi đánh giá sản lượng nào.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {danhGia.map((ev) => {
                  const p = products.find((x) => x.id === ev.productId);
                  return (
                    <div
                      key={ev.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
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
                          <span className="text-xs font-bold text-slate-500">
                            {ev.date} · {ev.shift} · {ev.createdBy}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-slate-900">
                          {p?.name || ev.productId}
                        </p>
                        <p className="text-xs text-slate-600">{ev.note}</p>
                      </div>
                      <div className="flex items-center gap-4 font-mono shrink-0">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: KIỂM KÊ XƯỞNG (KEG/LÍT & BỒN FST/BBT) ================= */}
      {subTab === "kiem-ke" && (
        <div className="space-y-6 anim-view-enter">
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
            <button
              type="button"
              onClick={() => setKkMode("keg-lit")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-extrabold transition-colors",
                kkMode === "keg-lit"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              Kiểm kê Keg &amp; Lít tại Xưởng
            </button>
            <button
              type="button"
              onClick={() => setKkMode("bon")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-extrabold transition-colors",
                kkMode === "bon"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              Kiểm kê Bồn FST &amp; BBT
            </button>
          </div>

          {kkMode === "keg-lit" ? (
            <KiemKeKegLitSection
              location="XUONG"
              products={products}
              records={kiemKeKeg}
              anhTheoChungTu={anhTheoChungTu}
              busy={busy}
              onSave={onLuuKiemKeKegLit}
            />
          ) : (
            <>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#141A23] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                  KIỂM KÊ THÁNG · BẮT BUỘC ẢNH MINH CHỨNG
                </span>
                <h2 className="text-base font-extrabold">
                  Kiểm Kê Lượng Bia Tồn Tại Bồn FST & BBT
                </h2>
              </div>
              <Database className="w-5 h-5 text-sky-400" />
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Tháng kiểm kê
                  </label>
                  <input
                    type="month"
                    value={kkMonth}
                    onChange={(e) => setKkMonth(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold bg-slate-50"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Bồn FST / BBT *
                  </label>
                  <select
                    value={kkTank}
                    onChange={(e) => setKkTank(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold bg-slate-50"
                  >
                    {DANH_SACH_BON_BIA.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.ten} (Max {t.sucChuaLit}L)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Loại bia đang chứa *
                  </label>
                  <select
                    value={kkProduct}
                    onChange={(e) => setKkProduct(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                  >
                    {products
                      .filter((p) => p.category === "Lít")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Mã lô trong bồn *
                  </label>
                  <input
                    type="text"
                    value={kkBatch}
                    onChange={(e) => setKkBatch(e.target.value)}
                    placeholder="VD: LO-FST01"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                    Số Lít đo được *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={kkLiters || ""}
                    onChange={(e) => setKkLiters(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-amber-400 font-mono text-sm font-black text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Tình trạng bồn (lên men / ủ lạnh / chờ chiết)
                </label>
                <input
                  type="text"
                  value={kkStatus}
                  onChange={(e) => setKkStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="p-4 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      📸 Ảnh chụp thước đo / đồng hồ bồn FST & BBT (Bắt buộc)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Không có ảnh minh chứng thước đo sẽ không thể lưu kiểm kê bồn.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <label className="px-3.5 py-2 rounded-xl bg-[#141A23] text-white text-xs font-extrabold cursor-pointer hover:bg-slate-800 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Chụp ảnh bồn
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          void handleChonAnhBon(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-extrabold cursor-pointer hover:bg-slate-100 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Chọn ảnh
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          void handleChonAnhBon(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                {kkPhotos.length === 0 ? (
                  <div className="py-3 text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                    Chưa có ảnh chụp thước đo bồn (Bắt buộc để lưu kiểm kê)
                  </div>
                ) : (
                  <ChonAnh ds={kkPhotos} onDoi={setKkPhotos} />
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!canSaveTank}
                  onClick={() => void handleSaveTank()}
                  className={cn(
                    "px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition",
                    canSaveTank
                      ? "bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/25 cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed",
                  )}
                >
                  {busy ? "Đang lưu..." : "✓ Lưu Kiểm Kê Bồn FST/BBT"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kiemKeBon.map((kk) => {
              const bon = DANH_SACH_BON_BIA.find((t) => t.id === kk.tankId);
              const p = products.find((x) => x.id === kk.productId);
              const pct = bon?.sucChuaLit
                ? Math.min(100, Math.round((kk.liters / bon.sucChuaLit) * 100))
                : 0;
              const anh = anhTheoChungTu.get(kk.id) || [];
              return (
                <div
                  key={kk.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm card-lift flex gap-4 items-center"
                >
                  {anh[0] ? (
                    <a
                      href={anh[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-28 h-24 rounded-xl overflow-hidden bg-slate-950 border border-slate-300 shrink-0"
                    >
                      <img src={anh[0].url} alt={kk.tankId} className="w-full h-full object-cover" />
                    </a>
                  ) : null}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md font-mono text-[11px] font-black",
                          kk.tankGroup === "FST"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-sky-100 text-sky-800",
                        )}
                      >
                        {kk.tankId} · Tháng {kk.month}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {anh.length} ảnh
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 truncate">
                      {p?.name || kk.productId}
                    </p>
                    <p className="font-mono text-[11px] font-bold text-amber-700">
                      Lô: {kk.batchNumber}
                    </p>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-black text-slate-900 tabular-nums">
                        {formatNumber(kk.liters)} / {formatNumber(bon?.sucChuaLit || 0)} L
                      </span>
                      <span className="font-bold text-emerald-700">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

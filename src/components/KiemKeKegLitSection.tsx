import { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Layers,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import type { KiemKeKegItem, KiemKeKegLit, Product } from "../types";
import type { AnhChungTu } from "../anh/moHinh";
import ChonAnh, { taoTepCho, type TepCho } from "../anh/ChonAnh";
import OAnhLuoi from "../anh/OAnhLuoi";
import { quaTrungChuyen } from "../anh/duongDan";
import { laBanGhiThuVeVoKeg } from "../lib/loBia";
import { cn, formatNumber, homNayDiaPhuong } from "../lib/utils";

interface Props {
  location: "XUONG" | "KHO_TONG";
  products: Product[];
  records: KiemKeKegLit[];
  anhTheoChungTu: Map<string, AnhChungTu[]>;
  /** Số lượng sổ sách theo productId (nếu có — dùng cho Kho tổng đối chiếu chênh lệch). */
  bookStockByProduct?: Map<string, number>;
  canWrite?: boolean;
  canApprove?: boolean;
  canDelete?: boolean;
  busy: boolean;
  onSave: (input: {
    date: string;
    shiftOrPeriod: string;
    location: "XUONG" | "KHO_TONG";
    items: KiemKeKegItem[];
    totalKegs: number;
    totalLiters: number;
    note: string;
    photos: TepCho[];
  }) => Promise<boolean>;
  onApprove?: (id: string, status: "approved" | "returned", reason?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

// Ngày theo giờ VN — `toISOString` là UTC, trước 7h sáng ra hôm qua.
const todayStr = () => homNayDiaPhuong();

function formatStampView(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Form & Lịch sử Kiểm kê Keg và Lít thực tế — dùng chung cho cả Xưởng và Kho tổng.
 * Mọi ảnh hiện trường tải lên đều được tự động đóng dấu ngày giờ thực tế rõ ràng.
 */
export default function KiemKeKegLitSection({
  location,
  products,
  records,
  anhTheoChungTu,
  bookStockByProduct,
  canWrite = true,
  canApprove = false,
  canDelete = false,
  busy,
  onSave,
  onApprove,
  onDelete,
}: Props) {
  const [date, setDate] = useState(todayStr);
  const [shiftOrPeriod, setShiftOrPeriod] = useState(
    location === "XUONG" ? "Cuối ca xưởng" : "Cuối ngày kho tổng",
  );
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<TepCho[]>([]);
  const [allowZeroConfirm, setAllowZeroConfirm] = useState(false);

  const isXuong = location === "XUONG";
  const stampLabel = isXuong
    ? "KIỂM KÊ XƯỞNG · KEG & LÍT"
    : "KIỂM KÊ KHO TỔNG · KEG & LÍT";

  const scopedRecords = useMemo(
    () => records.filter((r) => r.location === location && !laBanGhiThuVeVoKeg(r)),
    [records, location],
  );

  // Tính toán danh sách mặt hàng + quy đổi Lít hoàn toàn bằng code
  const computedRows = useMemo(() => {
    return products.map((p) => {
      const raw = qtyMap[p.id] ?? "";
      const qty = Math.max(0, Number(raw) || 0);
      const capLiters = (p.capacityPerUnit || 1000) / 1000;
      const liters = Math.round(qty * capLiters * 100) / 100;
      const bookQty = bookStockByProduct?.get(p.id);
      const diff =
        typeof bookQty === "number" ? Math.round((qty - bookQty) * 100) / 100 : undefined;
      return {
        product: p,
        qty,
        capLiters,
        liters,
        bookQty,
        diff,
      };
    });
  }, [products, qtyMap, bookStockByProduct]);

  const totals = useMemo(() => {
    let totalKegs = 0;
    let totalLiters = 0;
    let nonZeroCount = 0;
    computedRows.forEach((r) => {
      if (r.qty > 0) nonZeroCount++;
      if (r.product.category !== "Lít") {
        totalKegs += r.qty;
      }
      totalLiters += r.liters;
    });
    return {
      totalKegs: Math.round(totalKegs * 100) / 100,
      totalLiters: Math.round(totalLiters * 100) / 100,
      nonZeroCount,
    };
  }, [computedRows]);

  const handlePickPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const { ds, hong } = await taoTepCho(files, {
      stampTimestamp: true,
      stampLabel,
    });
    if (ds.length) setPhotos((prev) => [...prev, ...ds]);
    if (hong > 0) {
      alert(
        `${hong} ảnh không đọc được trên thiết bị này. Vui lòng chọn lại từng ảnh.`,
      );
    }
  };

  const handlePrefillBookStock = () => {
    if (!bookStockByProduct) return;
    const next: Record<string, string> = {};
    products.forEach((p) => {
      const v = bookStockByProduct.get(p.id) || 0;
      if (v > 0) next[p.id] = String(v);
    });
    setQtyMap(next);
  };

  const hasValidNumbers = totals.nonZeroCount > 0 || allowZeroConfirm;
  const canSave =
    canWrite && !busy && Boolean(date) && photos.length > 0 && hasValidNumbers;

  const handleSubmit = async () => {
    if (!canSave) return;
    const itemsToSave: KiemKeKegItem[] = computedRows
      .filter((r) => r.qty > 0 || (typeof r.bookQty === "number" && r.bookQty > 0))
      .map((r) => ({
        productId: r.product.id,
        productName: r.product.name,
        unit: r.product.unit,
        quantity: r.qty,
        liters: r.liters,
        ...(typeof r.bookQty === "number" ? { bookQuantity: r.bookQty } : {}),
      }));

    // Nếu kiểm kê toàn bộ bằng 0 thì vẫn ghi nhận ít nhất 1 dòng chuẩn để lưu phiếu kiểm kê bằng 0
    if (itemsToSave.length === 0 && products[0]) {
      itemsToSave.push({
        productId: products[0].id,
        productName: products[0].name,
        unit: products[0].unit,
        quantity: 0,
        liters: 0,
      });
    }

    const ok = await onSave({
      date,
      shiftOrPeriod: shiftOrPeriod.trim() || (isXuong ? "Tại Xưởng" : "Tại Kho tổng"),
      location,
      items: itemsToSave,
      totalKegs: totals.totalKegs,
      totalLiters: totals.totalLiters,
      note: note.trim(),
      photos,
    });

    if (ok) {
      setQtyMap({});
      setNote("");
      setPhotos([]);
      setAllowZeroConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {canWrite && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            className={cn(
              "px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2",
              isXuong ? "bg-[#1b1612]" : "bg-[#0f1c1a]",
            )}
          >
            <div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  isXuong ? "text-amber-400" : "text-emerald-400",
                )}
              >
                {isXuong
                  ? "KIỂM KÊ THÀNH PHẨM TẠI XƯỞNG · BẮT BUỘC ẢNH CÓ NGÀY GIỜ"
                  : "KIỂM KÊ TỒN KHO TỔNG · BẮT BUỘC ẢNH CÓ NGÀY GIỜ"}
              </span>
              <h3 className="text-base font-extrabold">
                {isXuong
                  ? "Kiểm Kê Keg & Lít Thành Phẩm Tại Xưởng"
                  : "Kiểm Kê Keg & Lít Thực Tế Tại Kho Tổng"}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 tabular-nums">
                <span className="text-white/60 mr-1.5">Keg/Thùng:</span>
                <strong className="text-amber-300">
                  {formatNumber(totals.totalKegs)}
                </strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 tabular-nums">
                <span className="text-white/60 mr-1.5">Quy đổi Lít:</span>
                <strong className="text-emerald-300">
                  {formatNumber(totals.totalLiters)} L
                </strong>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Ngày kiểm kê *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold bg-slate-50"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Đợt / Ca kiểm kê
                </label>
                <input
                  type="text"
                  value={shiftOrPeriod}
                  onChange={(e) => setShiftOrPeriod(e.target.value)}
                  placeholder="VD: Cuối ngày / Ca chiều / Chốt tháng"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Ghi chú hiện trường
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Đếm trực tiếp tại kho lạnh / dãy Keg số 2..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Bảng nhập số lượng Keg / Lít thực tế */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Nhập số lượng đếm thực tế từng mặt hàng
                </span>
                {bookStockByProduct && (
                  <button
                    type="button"
                    onClick={handlePrefillBookStock}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-[11px] font-extrabold text-emerald-700 transition-colors"
                  >
                    Điền nhanh theo số sổ sách
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white">
                      <th className="py-2.5 px-4">Sản phẩm</th>
                      <th className="py-2.5 px-3">ĐVT</th>
                      {bookStockByProduct && (
                        <th className="py-2.5 px-3 text-right">Sổ sách</th>
                      )}
                      <th className="py-2.5 px-3 text-right">Thực tế đếm</th>
                      <th className="py-2.5 px-3 text-right">Quy đổi (Lít)</th>
                      {bookStockByProduct && (
                        <th className="py-2.5 px-4 text-right">Chênh lệch</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {computedRows.map((row) => (
                      <tr key={row.product.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4">
                          <p className="font-extrabold text-slate-900">
                            {row.product.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {row.capLiters} L/{row.product.unit}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-600">
                          {row.product.unit}
                        </td>
                        {bookStockByProduct && (
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                            {formatNumber(row.bookQty || 0)}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={qtyMap[row.product.id] ?? ""}
                            onChange={(e) =>
                              setQtyMap((prev) => ({
                                ...prev,
                                [row.product.id]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-amber-500 text-right font-mono font-black tabular-nums outline-none bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-800">
                          {row.liters > 0 ? `${formatNumber(row.liters)} L` : "—"}
                        </td>
                        {bookStockByProduct && (
                          <td className="py-2.5 px-4 text-right font-mono font-black tabular-nums">
                            {typeof row.diff === "number" ? (
                              <span
                                className={cn(
                                  row.diff === 0
                                    ? "text-emerald-600"
                                    : row.diff < 0
                                      ? "text-rose-600"
                                      : "text-amber-600",
                                )}
                              >
                                {row.diff > 0 ? `+${formatNumber(row.diff)}` : formatNumber(row.diff)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totals.nonZeroCount === 0 && (
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowZeroConfirm}
                  onChange={(e) => setAllowZeroConfirm(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                />
                <span>Xác nhận kiểm kê thực tế khu vực này đang bằng 0 (trống hàng)</span>
              </label>
            )}

            {/* Khu vực tải ảnh hiện trường — tự đóng dấu ngày giờ rõ ràng */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">
                    📸 Ảnh bằng chứng hiện trường Keg &amp; Lít (Bắt buộc)
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Hệ thống tự động đóng dấu <strong className="text-amber-800">ngày &amp; giờ thực tế</strong> lên góc ảnh để đối chiếu kiểm kê minh bạch.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <label className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-extrabold cursor-pointer hover:bg-slate-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Chụp ảnh
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void handlePickPhotos(e.target.files);
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
                        void handlePickPhotos(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              {photos.length === 0 ? (
                <div className="py-3 text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                  Chưa có ảnh hiện trường — cần ít nhất 1 ảnh (có dấu ngày giờ) để lưu phiếu kiểm kê
                </div>
              ) : (
                <ChonAnh ds={photos} onDoi={setPhotos} />
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canSave}
                onClick={() => void handleSubmit()}
                className={cn(
                  "px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition",
                  canSave
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/25 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed",
                )}
              >
                {busy
                  ? "Đang tải ảnh & lưu..."
                  : `✓ Lưu Kiểm Kê ${isXuong ? "Xưởng" : "Kho Tổng"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lịch sử kiểm kê Keg & Lít */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-slate-900">
              Lịch sử kiểm kê Keg &amp; Lít — {isXuong ? "Xưởng sản xuất" : "Kho tổng"}
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-400">
            {scopedRecords.length} phiếu
          </span>
        </div>

        {scopedRecords.length === 0 ? (
          <div className="py-10 text-center text-xs font-bold text-slate-400">
            Chưa có phiếu kiểm kê Keg &amp; Lít nào tại {isXuong ? "Xưởng" : "Kho tổng"}.
          </div>
        ) : (
          <div className="space-y-4">
            {scopedRecords.map((rec) => {
              const anh = anhTheoChungTu.get(rec.id) || [];
              return (
                <div
                  key={rec.id}
                  className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-[11px] font-black">
                        {rec.date}
                      </span>
                      {rec.shiftOrPeriod && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-black">
                          {rec.shiftOrPeriod}
                        </span>
                      )}
                      {rec.approvalStatus === "approved" ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          ✓ Đã duyệt{rec.approvedBy ? ` · ${rec.approvedBy}` : ""}
                        </span>
                      ) : rec.approvalStatus === "returned" ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                          ⚠ Trả lại{rec.rejectedReason ? `: ${rec.rejectedReason}` : ""}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          ⏳ Chờ QL duyệt
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatStampView(rec.createdAt)} · {rec.createdBy}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-black text-slate-800">
                        {formatNumber(rec.totalKegs)} Keg/Thùng
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-black text-emerald-700">
                        {formatNumber(rec.totalLiters)} Lít
                      </span>
                      {canApprove && onApprove && (
                        <>
                          {rec.approvalStatus !== "approved" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onApprove(rec.id, "approved")}
                              className="px-2.5 py-1 rounded-lg bg-[#141A23] hover:bg-slate-800 text-amber-300 font-sans text-[11px] font-extrabold flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Duyệt
                            </button>
                          )}
                          {rec.approvalStatus !== "returned" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                const lyDo = window.prompt("Lý do trả lại / yêu cầu kiểm đếm lại:", "Số lượng Keg hoặc ảnh chưa khớp");
                                if (lyDo?.trim()) void onApprove(rec.id, "returned", lyDo.trim());
                              }}
                              className="px-2.5 py-1 rounded-lg border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 font-sans text-[11px] font-extrabold flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Trả lại
                            </button>
                          )}
                        </>
                      )}
                      {canDelete && onDelete && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDelete(rec.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Xoá bản kiểm kê này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {rec.note && (
                    <p className="text-xs font-semibold text-slate-600">
                      Ghi chú: {rec.note}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {rec.items
                      .filter((it) => it.quantity > 0 || typeof it.bookQuantity === "number")
                      .map((it) => (
                        <div
                          key={it.productId}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] flex items-center gap-2"
                        >
                          <span className="font-bold text-slate-700">
                            {it.productName}:
                          </span>
                          <span className="font-mono font-black text-slate-900 tabular-nums">
                            {formatNumber(it.quantity)} {it.unit}
                          </span>
                          <span className="text-slate-400 font-mono tabular-nums">
                            ({formatNumber(it.liters)} L)
                          </span>
                          {typeof it.bookQuantity === "number" && (
                            <span
                              className={cn(
                                "font-mono text-[10px] font-black",
                                it.quantity - it.bookQuantity === 0
                                  ? "text-emerald-600"
                                  : "text-rose-600",
                              )}
                            >
                              {it.quantity - it.bookQuantity === 0
                                ? "Khớp sổ"
                                : `Lệch ${it.quantity - it.bookQuantity > 0 ? "+" : ""}${formatNumber(it.quantity - it.bookQuantity)}`}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>

                  {anh.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {anh.map((a, idx) => (
                        <a
                          key={a.id}
                          href={quaTrungChuyen(a.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative w-32 h-24 rounded-xl overflow-hidden border border-slate-300 bg-slate-950 shrink-0"
                          title={`Mở ảnh hiện trường ${idx + 1} (tải lúc ${formatStampView(a.taiLuc)})`}
                        >
                          <OAnhLuoi
                            url={a.url}
                            alt={`Ảnh kiểm kê ${rec.date} #${idx + 1}`}
                            rong={400}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-amber-300 font-mono text-[9px] font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            #{idx + 1}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

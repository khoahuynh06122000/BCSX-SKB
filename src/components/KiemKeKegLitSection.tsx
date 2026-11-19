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
import {
  banChotThangKiemKe,
  KIEM_KE_CHOT_THANG,
  KIEM_KE_DOT_XUAT,
  laBanGhiThuVeVoKeg,
  laKiemKeDotXuat,
  soKegCuaDong,
  soLuongTuKien,
} from "../lib/loBia";
import { cn, formatNumber, homNayDiaPhuong } from "../lib/utils";

interface Props {
  location: "XUONG" | "KHO_TONG";
  products: Product[];
  records: KiemKeKegLit[];
  anhTheoChungTu: Map<string, AnhChungTu[]>;
  /**
   * Tồn SỔ SÁCH theo productId TÍNH ĐẾN NGÀY KIỂM (nếu có — Kho tổng đối chiếu
   * chênh lệch). Nhận ngày chứ không nhận bảng dựng sẵn: bảng của tab Sổ NXT đi
   * theo bộ lọc ngày / từ khoá của tab đó, lấy nhầm là so số kiểm hôm nay với
   * tồn cuối tháng trước, hoặc mất cả mặt hàng bị từ khoá ẩn.
   */
  tonSoDenNgay?: (ngay: string) => Map<string, number>;
  canWrite?: boolean;
  canApprove?: boolean;
  /** Ai ký duyệt & chốt kiểm kê tháng ở nơi này — Kho tổng: "Kế toán"; Xưởng: "Giám sát xưởng". */
  tenNguoiDuyet?: string;
  canDelete?: boolean;
  /** Kho tổng: được làm KIỂM KÊ ĐỘT XUẤT (kế toán, admin). */
  canKiemDotXuat?: boolean;
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
  tonSoDenNgay,
  canWrite = true,
  canApprove = false,
  tenNguoiDuyet = "Quản lý",
  canDelete = false,
  canKiemDotXuat = false,
  busy,
  onSave,
  onApprove,
  onDelete,
}: Props) {
  const [date, setDate] = useState(todayStr);
  const bookStockByProduct = useMemo(
    () => (tonSoDenNgay && date ? tonSoDenNgay(date) : undefined),
    [tonSoDenNgay, date],
  );
  const [shiftOrPeriod, setShiftOrPeriod] = useState(
    location === "XUONG" ? "Cuối ca xưởng" : "Chốt tồn cuối tháng",
  );
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  /*
   * SỐ KEG ĐẾM TAY — kiểm bia riêng, kiểm keg riêng (quy định anh Khoa
   * 19/11/2026). Không suy keg từ số lít: quy đổi lít ↔ keg chỉ dùng lúc kho
   * tổng GIAO bia cho đơn vị (để biết đã giao bao nhiêu lít, bao nhiêu keg).
   */
  const [soKegDem, setSoKegDem] = useState("");
  const [photos, setPhotos] = useState<TepCho[]>([]);
  const [allowZeroConfirm, setAllowZeroConfirm] = useState(false);

  const isXuong = location === "XUONG";
  const isKho = !isXuong;
  /*
   * KHO TỔNG có 2 loại kiểm kê — xem `KIEM_KE_CHOT_THANG` / `KIEM_KE_DOT_XUAT`.
   * Đếm theo KIỆN: keg đầy (bia Lít) / thùng (bia lon) + phần lẻ.
   */
  const [loai, setLoai] = useState<"CHOT_THANG" | "DOT_XUAT">("CHOT_THANG");
  const laDotXuat = isKho && loai === "DOT_XUAT";
  const [kienMap, setKienMap] = useState<Record<string, string>>({});
  const [leMap, setLeMap] = useState<Record<string, string>>({});
  // Đột xuất = ĐẾM MÙ: không hiện tồn app khi đang đếm.
  const hienTonApp = Boolean(bookStockByProduct) && !laDotXuat;
  const stampLabel = isXuong
    ? "KIỂM KÊ XƯỞNG · KEG & LÍT"
    : laDotXuat
      ? "KIỂM KÊ ĐỘT XUẤT · KHO TỔNG"
      : "KIỂM KÊ CHỐT THÁNG · KHO TỔNG";
  const doiLoai = (l: "CHOT_THANG" | "DOT_XUAT") => {
    setLoai(l);
    setShiftOrPeriod(l === "DOT_XUAT" ? "Kế toán kiểm đột xuất" : "Chốt tồn cuối tháng");
  };

  const scopedRecords = useMemo(
    () => records.filter((r) => r.location === location && !laBanGhiThuVeVoKeg(r)),
    [records, location],
  );
  // Bản đã ký duyệt = kiểm kê CHỐT THÁNG (mỗi tháng một bản, bản duyệt sau thay).
  const chotThang = useMemo(() => banChotThangKiemKe(scopedRecords), [scopedRecords]);
  const nhanThang = (d: string) => `${String(d).slice(5, 7)}/${String(d).slice(0, 4)}`;
  const kyDuyet = (rec: KiemKeKegLit) => {
    if (!onApprove) return;
    const thang = String(rec.date || "").slice(0, 7);
    const daChot = scopedRecords.find(
      (r) => r.id !== rec.id && r.approvalStatus === "approved" && String(r.date || "").slice(0, 7) === thang,
    );
    const hoi = daChot
      ? `Tháng ${nhanThang(thang)} đã chốt bản kiểm ngày ${daChot.date}.\n\nKý duyệt bản ngày ${rec.date} sẽ THAY làm bản chốt kiểm kê tháng. Tiếp tục?`
      : `Ký duyệt và CHỐT bản kiểm ngày ${rec.date} làm kiểm kê tháng ${nhanThang(thang)}?`;
    if (window.confirm(hoi)) void onApprove(rec.id, "approved");
  };

  // Tính toán danh sách mặt hàng + quy đổi Lít hoàn toàn bằng code
  const computedRows = useMemo(() => {
    return products.map((p) => {
      const kien = Number(kienMap[p.id]) || 0;
      const le = Number(leMap[p.id]) || 0;
      const qty = isKho
        ? soLuongTuKien(p.category, kien, le)
        : Math.max(0, Number(qtyMap[p.id] ?? "") || 0);
      const capLiters = (p.capacityPerUnit || 1000) / 1000;
      const liters = Math.round(qty * capLiters * 100) / 100;
      const bookQty = bookStockByProduct?.get(p.id);
      const diff =
        typeof bookQty === "number" ? Math.round((qty - bookQty) * 100) / 100 : undefined;
      return {
        product: p,
        kien,
        le,
        qty,
        capLiters,
        liters,
        bookQty,
        diff,
      };
    });
  }, [products, qtyMap, kienMap, leMap, isKho, bookStockByProduct]);

  const totals = useMemo(() => {
    let totalLiters = 0;
    let nonZeroCount = 0;
    computedRows.forEach((r) => {
      if (r.qty > 0) nonZeroCount++;
      totalLiters += r.liters;
    });
    // Xưởng: keg là số ĐẾM TAY ở ô riêng. Kho tổng: keg đầy + keg lẻ đếm theo từng mặt hàng.
    const keg = isKho
      ? computedRows.reduce((t, r) => t + soKegCuaDong(r.product.category, r.kien, r.le), 0)
      : Math.max(0, Math.trunc(Number(soKegDem) || 0));
    return {
      totalKegs: keg,
      totalLiters: Math.round(totalLiters * 100) / 100,
      nonZeroCount,
    };
  }, [computedRows, soKegDem, isKho]);

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
    canWrite &&
    !busy &&
    Boolean(date) &&
    photos.length > 0 &&
    hasValidNumbers &&
    (!laDotXuat || canKiemDotXuat);

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
        ...(isKho ? { kienDem: r.kien, leDem: r.le } : {}),
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
      shiftOrPeriod: (isKho ? (laDotXuat ? KIEM_KE_DOT_XUAT : KIEM_KE_CHOT_THANG) : "") +
        (shiftOrPeriod.trim() || (isXuong ? "Tại Xưởng" : "Tại Kho tổng")),
      location,
      items: itemsToSave,
      totalKegs: totals.totalKegs,
      totalLiters: totals.totalLiters,
      note: note.trim(),
      photos,
    });

    if (ok) {
      setQtyMap({});
      setKienMap({});
      setLeMap({});
      setNote("");
      setSoKegDem("");
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
                  : laDotXuat
                    ? "Kiểm Kê Đột Xuất Kho Tổng (Đếm Mù)"
                    : "Kiểm Kê Chốt Tháng Kho Tổng · Đối Chiếu Tồn App"}
              </h3>
              {isKho && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => doiLoai("CHOT_THANG")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[11px] font-extrabold border",
                      !laDotXuat ? "bg-emerald-400 text-slate-900 border-emerald-400" : "border-white/20 text-white/70 hover:bg-white/10",
                    )}
                  >
                    Chốt tháng
                  </button>
                  {canKiemDotXuat && (
                    <button
                      type="button"
                      onClick={() => doiLoai("DOT_XUAT")}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[11px] font-extrabold border",
                        laDotXuat ? "bg-rose-400 text-slate-900 border-rose-400" : "border-white/20 text-white/70 hover:bg-white/10",
                      )}
                    >
                      Đột xuất (kế toán)
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 tabular-nums">
                <span className="text-white/60 mr-1.5">Keg đếm:</span>
                <strong className="text-amber-300">
                  {formatNumber(totals.totalKegs)} Keg
                </strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 tabular-nums">
                <span className="text-white/60 mr-1.5">Tổng bia:</span>
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
              {isXuong && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Số keg đếm thực tế
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={soKegDem}
                  onChange={(e) => setSoKegDem(e.target.value)}
                  placeholder="Đếm tay"
                  title="Đếm số keg vật lý tại chỗ — không quy đổi từ số lít bia"
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-300 font-mono text-xs font-bold bg-amber-50"
                />
              </div>
              )}
              <div className={isXuong ? "sm:col-span-3" : "sm:col-span-4"}>
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
              <div className={isXuong ? "sm:col-span-4" : "sm:col-span-5"}>
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

            {isKho && (
              <div
                className={cn(
                  "px-4 py-3 rounded-2xl border text-[11px] font-semibold leading-relaxed",
                  laDotXuat ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-900",
                )}
              >
                {laDotXuat ? (
                  <>
                    <strong>Đếm mù:</strong> không hiện tồn app khi đang đếm. Đếm keg đầy / thùng nguyên kiện và phần lẻ,
                    chụp ảnh hiện trạng rồi lưu — lưu xong mới hiện chênh lệch so với tồn app tại thời điểm kiểm.
                    Bản đột xuất không thay bản chốt tháng.
                  </>
                ) : (
                  <>
                    <strong>Chốt tháng:</strong> cột Tồn app là tồn đến ngày chốt. Đếm <strong>keg đầy</strong> (× 20,6 L) và{" "}
                    <strong>thùng</strong> (× 24 lon) nguyên kiện, phần lẻ nhập ô Lẻ; chụp ảnh hiện trạng toàn bộ keg &amp; thùng.
                    Khớp tồn app thì báo ✓; kế toán ký duyệt = chốt tháng.
                  </>
                )}
              </div>
            )}

            {/* Bảng nhập số lượng Keg / Lít thực tế */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Nhập số lượng đếm thực tế từng mặt hàng
                </span>
                {bookStockByProduct && isXuong && (
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
                      {hienTonApp && (
                        <th className="py-2.5 px-3 text-right">{isKho ? "Tồn app" : "Sổ sách"}</th>
                      )}
                      <th className="py-2.5 px-3 text-right">
                        {isKho ? "Kiện đếm (keg / thùng) · Lẻ" : "Thực tế đếm"}
                      </th>
                      <th className="py-2.5 px-3 text-right">Quy đổi (Lít)</th>
                      {hienTonApp && (
                        <th className="py-2.5 px-4 text-right">{isKho ? "Đối chiếu" : "Chênh lệch"}</th>
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
                        {hienTonApp && (
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                            {formatNumber(row.bookQty || 0)}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right">
                          {isKho ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={kienMap[row.product.id] ?? ""}
                                onChange={(e) =>
                                  setKienMap((prev) => ({ ...prev, [row.product.id]: e.target.value }))
                                }
                                placeholder={row.product.category === "Lon" ? "Thùng" : "Keg đầy"}
                                title={row.product.category === "Lon" ? "Số thùng nguyên (24 lon)" : "Số keg đầy (20,6 L)"}
                                className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 focus:border-amber-500 text-right font-mono font-black tabular-nums outline-none bg-white"
                              />
                              <span className="text-[10px] font-bold text-slate-400">+</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={leMap[row.product.id] ?? ""}
                                onChange={(e) =>
                                  setLeMap((prev) => ({ ...prev, [row.product.id]: e.target.value }))
                                }
                                placeholder={row.product.category === "Lon" ? "Lon lẻ" : "Lít lẻ"}
                                className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-right font-mono font-bold tabular-nums outline-none bg-white"
                              />
                              <span className="w-20 text-right font-mono font-black text-slate-900 tabular-nums">
                                = {formatNumber(row.qty)} {row.product.unit}
                              </span>
                            </div>
                          ) : (
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
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-800">
                          {row.liters > 0 ? `${formatNumber(row.liters)} L` : "—"}
                        </td>
                        {hienTonApp && (
                          <td className="py-2.5 px-4 text-right font-mono font-black tabular-nums">
                            {isKho && typeof row.diff === "number" && Math.abs(row.diff) < 0.01 ? (
                              <span className="text-emerald-600">✓ Khớp</span>
                            ) : typeof row.diff === "number" ? (
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
                  : `✓ Lưu ${isXuong ? "Kiểm Kê Xưởng" : laDotXuat ? "Kiểm Kê Đột Xuất" : "Kiểm Kê Chốt Tháng"}`}
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
                      {laKiemKeDotXuat(rec) ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                          🕵 KIỂM KÊ ĐỘT XUẤT · không thay bản chốt tháng
                        </span>
                      ) : rec.approvalStatus === "approved" ? (
                        <>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            ✍ Đã ký duyệt{rec.approvedBy ? ` · ${rec.approvedBy}` : ""}
                            {rec.approvedAt ? ` · ${formatStampView(rec.approvedAt)}` : ""}
                          </span>
                          {chotThang.has(rec.id) && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#141A23] text-amber-300 text-[10px] font-black">
                              📌 CHỐT KIỂM KÊ THÁNG {nhanThang(chotThang.get(rec.id) || "")}
                            </span>
                          )}
                        </>
                      ) : rec.approvalStatus === "returned" ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                          ⚠ Trả lại{rec.rejectedReason ? `: ${rec.rejectedReason}` : ""}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          ⏳ Chờ {tenNguoiDuyet} ký duyệt
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatStampView(rec.createdAt)} · {rec.createdBy}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-black text-slate-800">
                        {(() => {
                          // Bản lưu trước 19/11/2026 ghi "keg" bằng tổng số LON
                          // (lỗi cũ) — nhận ra thì hiện "—" thay vì số sai.
                          const tongLon = (rec.items || []).reduce(
                            (t, it) =>
                              products.find((p) => p.id === it.productId)?.category === "Lít"
                                ? t
                                : t + (Number(it.quantity) || 0),
                            0,
                          );
                          const saiCu = tongLon > 0 && Number(rec.totalKegs) === tongLon;
                          return saiCu ? "— Keg" : `${formatNumber(rec.totalKegs)} Keg đếm`;
                        })()}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-black text-emerald-700">
                        {formatNumber(rec.totalLiters)} Lít
                      </span>
                      {canApprove && onApprove && !laKiemKeDotXuat(rec) && (
                        <>
                          {rec.approvalStatus !== "approved" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => kyDuyet(rec)}
                              className="px-2.5 py-1 rounded-lg bg-[#141A23] hover:bg-slate-800 text-amber-300 font-sans text-[11px] font-extrabold flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Ký duyệt & chốt tháng
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
                          {typeof it.kienDem === "number" && (it.kienDem > 0 || (it.leDem || 0) > 0) && (
                            <span className="text-slate-500 font-mono tabular-nums">
                              [{formatNumber(it.kienDem)} {it.unit === "Lít" || it.unit === "L" ? "keg" : "thùng"}
                              {(it.leDem || 0) > 0 ? ` + ${formatNumber(it.leDem || 0)} lẻ` : ""}]
                            </span>
                          )}
                          <span className="text-slate-400 font-mono tabular-nums">
                            ({formatNumber(it.liters)} L)
                          </span>
                          {typeof it.bookQuantity === "number" && (
                            <span
                              className={cn(
                                "font-mono text-[10px] font-black",
                                Math.abs(it.quantity - it.bookQuantity) < 0.01
                                  ? "text-emerald-600"
                                  : "text-rose-600",
                              )}
                            >
                              {Math.abs(it.quantity - it.bookQuantity) < 0.01
                                ? "Khớp tồn app"
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

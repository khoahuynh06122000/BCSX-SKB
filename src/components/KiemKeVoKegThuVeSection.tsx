import { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock,
  PackageOpen,
  RotateCcw,
  Upload,
} from "lucide-react";
import type {
  KiemKeKegItem,
  KiemKeKegLit,
  Partner,
  Product,
  Transaction,
} from "../types";
import type { AnhChungTu } from "../anh/moHinh";
import ChonAnh, { taoTepCho, type TepCho } from "../anh/ChonAnh";
import OAnhLuoi from "../anh/OAnhLuoi";
import {
  KEG_THU_VE_PREFIX,
  MA_KHO_TONG_THU_VE,
  tongHopVoKegThuVe,
} from "../lib/loBia";
import { cn, formatNumber } from "../lib/utils";

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  kiemKeKeg: KiemKeKegLit[];
  anhTheoChungTu: Map<string, AnhChungTu[]>;
  canWrite?: boolean;
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
}

const todayStr = () => new Date().toISOString().slice(0, 10);

function formatStampView(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Kiểm kê & Đối chiếu Vỏ Keg thu về tại Kho tổng.
 * Hiển thị danh sách toàn bộ ĐVTV/đơn vị đang còn giữ vỏ Keg ngay trong phiếu kiểm kê
 * để tích thu hồi một lần hoặc nhập từng đơn vị, kèm ảnh hiện trường đóng dấu ngày giờ.
 */
export default function KiemKeVoKegThuVeSection({
  transactions,
  products,
  partners,
  kiemKeKeg,
  anhTheoChungTu,
  canWrite = true,
  busy,
  onSave,
}: Props) {
  const [date, setDate] = useState(todayStr);
  const [returnMap, setReturnMap] = useState<Record<string, string>>({});
  const [generalKhoKegs, setGeneralKhoKegs] = useState<string>("");
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [damagedNote, setDamagedNote] = useState("");
  const [photos, setPhotos] = useState<TepCho[]>([]);

  const baoCaoVo = useMemo(
    () =>
      tongHopVoKegThuVe({
        transactions,
        products,
        partners,
        kiemKeKeg,
      }),
    [transactions, products, partners, kiemKeKeg],
  );

  // Danh sách ĐVTV đang giữ vỏ (kegsOutstanding > 0) lên trước; bật "Hiện tất cả" để hiện cả đơn vị đã trả hết.
  const holdingUnits = useMemo(
    () => baoCaoVo.theoDonVi.filter((d) => d.kegsOutstanding > 0),
    [baoCaoVo.theoDonVi],
  );
  const formUnits = useMemo(() => {
    if (showAllUnits || holdingUnits.length === 0) {
      if (baoCaoVo.theoDonVi.length > 0) return baoCaoVo.theoDonVi;
      // Dự phòng nếu chưa có giao dịch xuất nào
      const seen = new Set<string>();
      const out: typeof baoCaoVo.theoDonVi = [];
      partners
        .filter((p) => p.type !== "SUPPLIER" && !p.id.startsWith("SYSTEM"))
        .forEach((p) => {
          const isBnc = p.id.startsWith("AD0103");
          const uid = isBnc ? "AD0103" : p.id;
          const label = isBnc ? "BNC (Toàn khu)" : p.name;
          if (seen.has(uid)) return;
          seen.add(uid);
          out.push({
            unitId: uid,
            unitName: label,
            isStandard206: isBnc || p.id === "AC0107",
            kegsDelivered: 0,
            kegsReturned: 0,
            kegsOutstanding: 0,
          });
        });
      return out;
    }
    return holdingUnits;
  }, [showAllUnits, holdingUnits, baoCaoVo.theoDonVi, partners]);

  const draftItems = useMemo<KiemKeKegItem[]>(() => {
    const list: KiemKeKegItem[] = [];
    const lookup = new Map(baoCaoVo.theoDonVi.map((d) => [d.unitId, d]));
    Object.entries(returnMap).forEach(([unitId, raw]) => {
      const qty = Math.max(0, Math.round((Number(raw) || 0) * 100) / 100);
      if (qty <= 0) return;
      const meta = lookup.get(unitId) || formUnits.find((u) => u.unitId === unitId);
      list.push({
        productId: unitId,
        productName: meta?.unitName || unitId,
        unit: "Keg",
        quantity: qty,
        liters: 0,
        ...(meta ? { bookQuantity: meta.kegsOutstanding } : {}),
      });
    });
    const khoQty = Math.max(0, Math.round((Number(generalKhoKegs) || 0) * 100) / 100);
    if (khoQty > 0) {
      list.push({
        productId: MA_KHO_TONG_THU_VE,
        productName: "Kiểm đếm vỏ chung tại Kho tổng",
        unit: "Keg",
        quantity: khoQty,
        liters: 0,
      });
    }
    return list;
  }, [returnMap, generalKhoKegs, baoCaoVo.theoDonVi, formUnits]);

  const totalBatchKegs = useMemo(
    () =>
      Math.round(
        draftItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0) * 100,
      ) / 100,
    [draftItems],
  );

  const canSave =
    canWrite && !busy && Boolean(date) && totalBatchKegs > 0 && photos.length > 0;

  const handlePickPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const { ds, hong } = await taoTepCho(files, {
      stampTimestamp: true,
      stampLabel: "KIỂM KÊ VỎ KEG THU VỀ · KHO TỔNG",
    });
    if (ds.length) setPhotos((prev) => [...prev, ...ds]);
    if (hong > 0) {
      alert(
        `${hong} ảnh không đọc được trên thiết bị này. Vui lòng chọn lại từng ảnh.`,
      );
    }
  };

  const handleSubmit = async () => {
    if (!canSave) return;
    const summaryLabel =
      draftItems.length === 1
        ? draftItems[0].productName
        : `${draftItems.length} đơn vị (${formatNumber(totalBatchKegs)} Keg)`;
    const ok = await onSave({
      date,
      shiftOrPeriod: `${KEG_THU_VE_PREFIX}${summaryLabel}`,
      location: "KHO_TONG",
      items: draftItems,
      totalKegs: totalBatchKegs,
      totalLiters: 0,
      note: damagedNote.trim(),
      photos,
    });
    if (ok) {
      setReturnMap({});
      setGeneralKhoKegs("");
      setDamagedNote("");
      setPhotos([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 3 KPI Tổng hợp Vỏ Keg */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Tổng Keg đã giao ra
          </span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1 tabular-nums">
            {formatNumber(baoCaoVo.tongDaGiao)}{" "}
            <span className="text-xs font-bold text-slate-400">Keg</span>
          </p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            Làm tròn lên theo chuẩn từng ĐVTV
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
            Tổng vỏ Keg đã thu về
          </span>
          <p className="text-2xl font-black font-mono text-emerald-700 mt-1 tabular-nums">
            {formatNumber(baoCaoVo.tongDaThuVe)}{" "}
            <span className="text-xs font-bold text-emerald-500">Keg</span>
          </p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            {baoCaoVo.tongThuVeChungTaiKho > 0
              ? `Gồm ${formatNumber(baoCaoVo.tongThuVeChungTaiKho)} Keg kiểm đếm chung tại kho`
              : "Theo các phiếu kiểm kê vỏ có ảnh"}
          </p>
        </div>
        <div className="bg-[#141A23] text-white rounded-2xl p-4 shadow-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
            Vỏ Keg chưa thu về ({holdingUnits.length} ĐVTV đang giữ)
          </span>
          <p className="text-2xl font-black font-mono text-amber-300 mt-1 tabular-nums">
            {formatNumber(baoCaoVo.dangConNgoaiThiTruong)}{" "}
            <span className="text-xs font-bold text-amber-200/70">Keg</span>
          </p>
          <p className="text-[11px] font-semibold text-slate-300 mt-1">
            Chênh lệch Tổng Keg giao − Tổng vỏ đã kiểm kê thu về
          </p>
        </div>
      </div>

      {/* Form ghi nhận kiểm kê Vỏ Keg thu về — liệt kê trực tiếp các ĐVTV đang giữ Keg */}
      {canWrite && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-[#141A23] text-white flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                KIỂM KÊ VỎ KEG RỖNG THU HỒI · BẮT BUỘC ẢNH CÓ NGÀY GIỜ
              </span>
              <h2 className="text-base font-extrabold">
                Ghi Nhận Kiểm Kê Vỏ Keg Thu Về Kho Tổng
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono text-xs font-black">
                {holdingUnits.length} ĐVTV đang giữ vỏ
              </span>
              <PackageOpen className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
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
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                  Tình trạng vỏ (móp / kẹt van / nguyên vẹn) &amp; ghi chú chung
                </label>
                <input
                  type="text"
                  value={damagedNote}
                  onChange={(e) => setDamagedNote(e.target.value)}
                  placeholder="VD: Thu về cuối ngày đủ van, nguyên vẹn..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div className="sm:col-span-3 flex items-center justify-end gap-2">
                {baoCaoVo.theoDonVi.length > holdingUnits.length && (
                  <button
                    type="button"
                    onClick={() => setShowAllUnits((v) => !v)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-extrabold text-slate-700"
                  >
                    {showAllUnits
                      ? `Chỉ hiện ĐVTV đang giữ (${holdingUnits.length})`
                      : `Hiện cả ${baoCaoVo.theoDonVi.length} đơn vị`}
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách trực quan các ĐVTV đang còn giữ Keg để nhập số vỏ thu về */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Danh sách ĐVTV đang còn giữ Keg ({formUnits.length} đơn vị)
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Nhập số vỏ thu về ở đúng dòng ĐVTV · để trống nếu chưa trả
                </span>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4">ĐVTV / Đơn vị</th>
                      <th className="py-2.5 px-3 text-right">Đã giao</th>
                      <th className="py-2.5 px-3 text-right">Đã thu</th>
                      <th className="py-2.5 px-3 text-right text-rose-600">
                        Đang giữ (Keg)
                      </th>
                      <th className="py-2.5 px-4 text-right w-48">
                        Vỏ thu về lần này
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formUnits.map((u) => {
                      const val = returnMap[u.unitId] ?? "";
                      return (
                        <tr
                          key={u.unitId}
                          className={cn(
                            "hover:bg-emerald-50/30 transition-colors",
                            Number(val) > 0 && "bg-emerald-50/40",
                          )}
                        >
                          <td className="py-2.5 px-4">
                            <span className="font-extrabold text-slate-900">
                              {u.unitName}
                            </span>
                            <span
                              className={cn(
                                "ml-2 px-1.5 py-0.5 rounded text-[9px] font-black",
                                u.isStandard206
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-amber-100 text-amber-800",
                              )}
                            >
                              {u.isStandard206 ? "20,6L" : "20L"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-500 tabular-nums">
                            {formatNumber(u.kegsDelivered)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {u.kegsReturned > 0 ? formatNumber(u.kegsReturned) : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black tabular-nums">
                            <span
                              className={cn(
                                u.kegsOutstanding > 0
                                  ? "text-rose-600"
                                  : "text-emerald-600",
                              )}
                            >
                              {formatNumber(u.kegsOutstanding)}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={val}
                                onChange={(e) =>
                                  setReturnMap((prev) => ({
                                    ...prev,
                                    [u.unitId]: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-500 font-mono text-sm font-black text-right bg-white"
                              />
                              {u.kegsOutstanding > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReturnMap((prev) => ({
                                      ...prev,
                                      [u.unitId]: String(u.kegsOutstanding),
                                    }))
                                  }
                                  className="px-2 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-black whitespace-nowrap"
                                  title={`Điền đủ ${u.kegsOutstanding} Keg`}
                                >
                                  Đủ
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Dòng kiểm đếm vỏ rỗng chung tại Kho tổng (nếu thu gộp không tách đơn vị) */}
                    <tr className="bg-slate-50/70">
                      <td colSpan={4} className="py-2.5 px-4">
                        <span className="font-bold text-slate-700">
                          Kiểm đếm vỏ Keg chung tại Kho tổng
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Dùng khi kiểm đếm bãi vỏ tại kho chưa tách theo ĐVTV trả
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex justify-end">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={generalKhoKegs}
                            onChange={(e) => setGeneralKhoKegs(e.target.value)}
                            placeholder="0"
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-500 font-mono text-sm font-black text-right bg-white"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 bg-emerald-50/70 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-emerald-900">
                  Đã nhập thu về: {draftItems.length} mục
                </span>
                <span className="font-mono font-black text-emerald-800 tabular-nums">
                  Tổng đợt kiểm kê: {formatNumber(totalBatchKegs)} Vỏ Keg
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">
                    📸 Ảnh chụp bãi vỏ Keg thu về (Bắt buộc — tự đóng dấu ngày giờ)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Chụp hoặc tải ảnh thực tế để đối chiếu số vỏ Keg thu hồi.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <label className="px-3.5 py-2 rounded-xl bg-[#141A23] text-white text-xs font-extrabold cursor-pointer hover:bg-slate-800 flex items-center gap-1.5">
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
                  Chưa có ảnh hiện trường vỏ Keg thu về — bắt buộc ít nhất 1 ảnh có dấu ngày giờ
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
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed",
                )}
              >
                {busy
                  ? "Đang tải ảnh & lưu..."
                  : `✓ Lưu Kiểm Kê Vỏ Keg Thu Về (${formatNumber(totalBatchKegs)} Keg)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bảng tổng hợp theo dõi Vỏ Keg theo từng đơn vị */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">
              Tổng Hợp Thu Hồi Vỏ Keg Theo Đơn Vị
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Sắp xếp theo số vỏ còn nợ ngoài ĐVTV nhiều nhất
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-5">Đơn vị / ĐVTV</th>
                <th className="py-3 px-3 text-center">Quy ước biên bản</th>
                <th className="py-3 px-4 text-right">Đã giao (Keg)</th>
                <th className="py-3 px-4 text-right">Đã thu về (Keg)</th>
                <th className="py-3 px-5 text-right">Đang giữ / Nợ vỏ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {baoCaoVo.theoDonVi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                    Chưa có giao dịch xuất bia Keg nào để đối chiếu vỏ thu về.
                  </td>
                </tr>
              ) : (
                baoCaoVo.theoDonVi.map((r) => (
                  <tr key={r.unitId} className="hover:bg-slate-50/80">
                    <td className="py-3 px-5 font-extrabold text-slate-900">
                      {r.unitName}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black",
                          r.isStandard206
                            ? "bg-sky-100 text-sky-800"
                            : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {r.isStandard206 ? "20,6 L/keg" : "Ký 20L · thực 20,6L"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700 tabular-nums">
                      {formatNumber(r.kegsDelivered)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {r.kegsReturned > 0 ? formatNumber(r.kegsReturned) : "—"}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-black tabular-nums">
                      <span
                        className={cn(
                          r.kegsOutstanding > 0
                            ? "text-rose-600"
                            : r.kegsOutstanding < 0
                              ? "text-amber-600"
                              : "text-emerald-700",
                        )}
                      >
                        {formatNumber(r.kegsOutstanding)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lịch sử kiểm kê Vỏ Keg thu về */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">
            Lịch sử kiểm kê Vỏ Keg thu về
          </h3>
          <span className="text-[11px] font-mono font-bold text-slate-400">
            {baoCaoVo.lichSuThuVe.length} phiếu
          </span>
        </div>

        {baoCaoVo.lichSuThuVe.length === 0 ? (
          <div className="py-10 text-center text-xs font-bold text-slate-400">
            Chưa có phiếu kiểm kê vỏ Keg thu về nào tại Kho tổng.
          </div>
        ) : (
          <div className="space-y-4">
            {baoCaoVo.lichSuThuVe.map((rec) => {
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
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatStampView(rec.createdAt)} · {rec.createdBy}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-white border border-emerald-200 font-mono text-xs font-black text-emerald-700 tabular-nums">
                      +{formatNumber(rec.totalKegs)} Vỏ Keg thu về
                    </span>
                  </div>

                  {rec.items?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {rec.items.map((it) => (
                        <div
                          key={it.productId}
                          className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-[11px] flex items-center gap-2"
                        >
                          <span className="font-bold text-slate-700">
                            {it.productName}:
                          </span>
                          <span className="font-mono font-black text-emerald-700 tabular-nums">
                            +{formatNumber(it.quantity)} Keg
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {rec.note && (
                    <p className="text-xs font-semibold text-slate-600">
                      Ghi chú: {rec.note}
                    </p>
                  )}

                  {anh.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {anh.map((a, idx) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative w-32 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                        >
                          <OAnhLuoi
                            url={a.url}
                            alt={`Vỏ Keg thu về ${rec.date} #${idx + 1}`}
                            rong={400}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-emerald-300 font-mono text-[9px] font-bold flex items-center gap-0.5">
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

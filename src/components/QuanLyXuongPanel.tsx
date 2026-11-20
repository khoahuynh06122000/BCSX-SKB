import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  Download,
  FileSpreadsheet,
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
import { taoSheetDep, XLSXDep } from "../lib/excelDep";
import {
  COT_MAU_KE_HOACH,
  docBangKeHoach,
  hangMauKeHoach,
  type DongKeHoach,
} from "../lib/keHoachSX";
import { isoSangVn } from "../lib/oNgay";
import { KhoiKyBienBan } from "./ChuKy";
import { noiDungKiemKeBon } from "../lib/chuKy";
import ONgay from "./ONgay";

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
  /** Admin ký nháy xác nhận số trên phiếu (trước Rào 1). Không truyền = không phải admin. */
  onKyNhay?: (slipCode: string) => Promise<void>;
  onTraLaiPhieu: (slipCode: string, reason: string) => Promise<void>;
  onMoBieuMau: (slipCode: string) => void;
  /** Phát hành kế hoạch nhiều mã bia (lưới / file Excel). Sản lượng 0 = bỏ dòng. */
  onLuuKeHoach: (dong: DongKeHoach[], nguon: string) => Promise<boolean>;
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
  onKyNhay,
  onTraLaiPhieu,
  onMoBieuMau,
  onLuuKeHoach,
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

  /* ---------- Tab 2: Kế hoạch sản xuất theo từng mã bia ---------- */
  const [planDate, setPlanDate] = useState(format(new Date(), "yyyy-MM-dd"));
  /** Lưới đang điền: mã bia → ô sản lượng / ghi chú (chuỗi gõ dở). Không có mã lô — lô chỉ có khi chiết thực tế. */
  const [luoi, setLuoi] = useState<Record<string, { sl: string; ghiChu: string }>>({});
  const oFile = useRef<HTMLInputElement>(null);

  const keHoachNgay = useMemo(
    () => keHoach.filter((k) => k.date.slice(0, 10) === planDate),
    [keHoach, planDate],
  );
  /** Kế hoạch đã lưu của ngày đang chọn, theo mã bia (bản sửa sau cùng). */
  const daLuuTheoMa = useMemo(() => {
    const m = new Map<string, KeHoachSanXuat>();
    [...keHoachNgay]
      .sort((a, b) => (a.updatedAt || a.createdAt).localeCompare(b.updatedAt || b.createdAt))
      .forEach((k) => m.set(k.productId, k));
    return m;
  }, [keHoachNgay]);

  // Đổi ngày, hoặc kế hoạch đã lưu đổi (vừa phát hành) → lưới nạp lại từ bản lưu.
  const khoaDaLuu = JSON.stringify([...daLuuTheoMa.values()].map((k) => [k.id, k.targetQty, k.note]));
  useEffect(() => {
    const m: Record<string, { sl: string; ghiChu: string }> = {};
    daLuuTheoMa.forEach((k, pid) => {
      m[pid] = { sl: String(k.targetQty ?? ""), ghiChu: k.note || "" };
    });
    setLuoi(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planDate, khoaDaLuu]);

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
  const tienDoTheoMa = useMemo(
    () => new Map(planProgress.map((r) => [r.productId, r])),
    [planProgress],
  );

  /** Các dòng lưới khác bản đã lưu — chỉ những dòng này được gửi đi. */
  const dongThayDoi = useMemo<DongKeHoach[]>(() => {
    const ra: DongKeHoach[] = [];
    products.forEach((p) => {
      const o = luoi[p.id];
      const cu = daLuuTheoMa.get(p.id);
      const sl = o && o.sl.trim() !== "" ? Math.max(0, Number(o.sl.replace(",", ".")) || 0) : 0;
      const ghiChu = (o?.ghiChu || "").trim();
      if (!cu && sl <= 0) return;
      if (cu && Number(cu.targetQty) === sl && (cu.note || "") === ghiChu) return;
      ra.push({ date: planDate, productId: p.id, targetQty: sl, note: ghiChu });
    });
    return ra;
  }, [products, luoi, daLuuTheoMa, planDate]);

  const doiO = (pid: string, truong: "sl" | "ghiChu", v: string) =>
    setLuoi((cu) => ({
      ...cu,
      [pid]: { sl: "", ghiChu: "", ...cu[pid], [truong]: v },
    }));

  const handlePhatHanh = async () => {
    if (!dongThayDoi.length || busy) return;
    await onLuuKeHoach(dongThayDoi, "Giám sát xưởng lập trên app");
  };

  /** File mẫu: đủ mọi mã bia của ngày đang chọn, điền sẵn kế hoạch đã có. */
  const taiFileMau = () => {
    const wb = XLSXDep.utils.book_new();
    XLSXDep.utils.book_append_sheet(
      wb,
      taoSheetDep({
        tieuDeTren: ["KẾ HOẠCH SẢN XUẤT THEO MÃ BIA", `Ngày ${isoSangVn(planDate)} · Sun KraftBeer`],
        tieuDe: [...COT_MAU_KE_HOACH],
        cot: [{ rong: 12 }, { rong: 13 }, { rong: 38 }, { rong: 7 }, { rong: 14, kieu: "so" }, { rong: 30 }],
        hang: hangMauKeHoach(products, planDate, keHoach),
      }),
      "KeHoach",
    );
    XLSXDep.utils.book_append_sheet(
      wb,
      XLSXDep.utils.aoa_to_sheet([
        ["HƯỚNG DẪN ĐIỀN KẾ HOẠCH SẢN XUẤT"],
        [""],
        ["1. Mỗi dòng là MỘT mã bia của MỘT ngày. Điền cột \"Sản lượng KH\" (theo ĐVT) và ghi chú nếu có. Không có mã lô — mã lô ghi khi chiết thực tế."],
        ["2. KHÔNG sửa cột Mã SAP / Tên bia — app khớp mã bia theo hai cột này."],
        ["3. Muốn lập nhiều ngày: chép thêm dòng, đổi cột Ngày (dd/MM/yyyy)."],
        ["4. Để TRỐNG sản lượng = không đụng kế hoạch đã có của dòng đó. Ghi 0 = bỏ kế hoạch dòng đó."],
        ["5. Nạp lại file nhiều lần không bị trùng: mỗi ngày × mã bia chỉ một dòng kế hoạch, nạp lại là ghi đè."],
      ]),
      "HuongDan",
    );
    XLSXDep.writeFile(wb, `Ke-hoach-SX-${planDate}.xlsx`);
  };

  const napFile = async (f: File) => {
    try {
      const wb = XLSXDep.read(await f.arrayBuffer(), { type: "array", cellDates: true });
      const ten = wb.SheetNames.includes("KeHoach") ? "KeHoach" : wb.SheetNames[0];
      const aoa = XLSXDep.utils.sheet_to_json<unknown[]>(wb.Sheets[ten], { header: 1, raw: true });
      const kq = docBangKeHoach(aoa, products, planDate);
      if (!kq.dong.length) {
        alert(`Không đọc được dòng kế hoạch nào từ "${f.name}".\n\n${kq.loi.slice(0, 10).join("\n") || "File không có dòng nào điền sản lượng."}`);
        return;
      }
      if (
        kq.loi.length &&
        !window.confirm(
          `File có ${kq.loi.length} dòng KHÔNG nạp được:\n${kq.loi.slice(0, 10).join("\n")}${kq.loi.length > 10 ? `\n… và ${kq.loi.length - 10} dòng nữa` : ""}\n\nVẫn nạp ${kq.dong.length} dòng đọc được?`,
        )
      )
        return;
      await onLuuKeHoach(kq.dong, `Nạp file ${f.name}`.slice(0, 128));
    } catch (e) {
      alert("Không đọc được file Excel: " + (e instanceof Error ? e.message : String(e)));
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
                          {slip?.nhaySig ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              ✓ {slip.nhaySig.name} đã ký nháy xác nhận số
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                              Chưa có ký nháy của admin
                            </span>
                          )}
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
                          {onKyNhay && !slip?.nhaySig && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onKyNhay(code)}
                              className="px-4 py-2 rounded-xl border border-emerald-400 bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-extrabold flex items-center gap-1.5"
                              title="Admin ký nháy: đã đối chiếu số trên phiếu"
                            >
                              ✍ Ký nháy xác nhận số
                            </button>
                          )}
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
                            {slip?.nhaySig && (
                              <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black" title={`Ký nháy: ${slip.nhaySig.name}`}>
                                ✓ Đã ký nháy
                              </span>
                            )}
                            {onKyNhay && !slip?.nhaySig && !vaoTon && slip?.status === "cho_ql_xuong" && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void onKyNhay(code)}
                                className="px-2.5 py-1.5 rounded-lg border border-emerald-400 text-emerald-700 hover:bg-emerald-50 text-[11px] font-extrabold"
                                title="Admin ký nháy xác nhận số"
                              >
                                ✍ Ký nháy
                              </button>
                            )}
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
                <h2 className="text-base font-extrabold">Kế Hoạch Sản Xuất Theo Mã Bia</h2>
              </div>
              <CalendarPlus className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-end gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày kế hoạch</p>
                  <div className="w-44">
                    <ONgay
                      aria-label="Ngày kế hoạch"
                      value={planDate}
                      onChange={(v) => v && setPlanDate(v)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={taiFileMau}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 hover:border-slate-400 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải file mẫu
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => oFile.current?.click()}
                    className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-extrabold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Nạp file Excel
                  </button>
                  <input
                    ref={oFile}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void napFile(f);
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy || !dongThayDoi.length}
                    onClick={() => void handlePhatHanh()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-extrabold shadow"
                  >
                    Phát hành kế hoạch{dongThayDoi.length ? ` (${dongThayDoi.length} dòng)` : ""}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Mã bia</th>
                      <th className="py-3 px-2">ĐVT</th>
                      <th className="py-3 px-2 text-right">Sản lượng KH</th>
                      <th className="py-3 px-2">Ghi chú</th>
                      <th className="py-3 px-3 text-right">Xưởng đã giao</th>
                      <th className="py-3 px-3 text-right">Kho đã nhận</th>
                      <th className="py-3 px-4">Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const o = luoi[p.id] || { sl: "", ghiChu: "" };
                      const td = tienDoTheoMa.get(p.id);
                      const doi = dongThayDoi.some((d) => d.productId === p.id);
                      const coKH = (Number(o.sl) || 0) > 0;
                      return (
                        <tr key={p.id} className={cn(doi ? "bg-amber-50/60" : coKH ? "" : "text-slate-400")}>
                          <td className="py-2 px-4">
                            <p className={cn("font-bold", coKH ? "text-slate-900" : "text-slate-500")}>{p.name}</p>
                            {p.materialCode && (
                              <p className="text-[10px] font-mono text-slate-400">{p.materialCode}</p>
                            )}
                          </td>
                          <td className="py-2 px-2 font-bold">{p.unit}</td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={o.sl}
                              onChange={(e) => doiO(p.id, "sl", e.target.value)}
                              placeholder="—"
                              className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 focus:border-amber-500 text-right font-mono font-black tabular-nums outline-none bg-white text-slate-900"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={o.ghiChu}
                              maxLength={2000}
                              onChange={(e) => doiO(p.id, "ghiChu", e.target.value)}
                              placeholder="Ghi chú"
                              className="w-60 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold outline-none bg-white text-slate-900"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                            {td ? formatNumber(td.sentFromBrewery) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {td ? formatNumber(td.receivedByWarehouse) : "—"}
                          </td>
                          <td className="py-2 px-4 w-40">
                            {td && td.plannedQty > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full bar-fill",
                                      td.pctBrewery >= 100 ? "bg-emerald-500" : "bg-amber-500",
                                    )}
                                    style={{ width: `${Math.min(100, td.pctBrewery)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[11px] font-bold w-10 text-right">{td.pctBrewery}%</span>
                              </div>
                            ) : (
                              <span className="text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Điền sản lượng cho mã bia cần sản xuất ngày {isoSangVn(planDate)} (dòng đổi tô vàng), rồi bấm Phát hành.
                Xoá trống / ghi 0 một dòng đã phát hành = bỏ kế hoạch mã bia đó. Nhiều ngày một lúc: tải file mẫu, điền, nạp lại.
              </p>
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
                    <KhoiKyBienBan
                      noiDung={noiDungKiemKeBon(kk)}
                      cot={[
                        { nhan: "Người kiểm kê", sig: kk.nguoiLapSig },
                        { nhan: "Giám sát xưởng ký duyệt", sig: kk.approvalStatus === "approved" ? kk.duyetSig : null },
                      ]}
                    />
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

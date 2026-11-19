import { useCallback, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import type {
  ImportSlip,
  KiemKeKegItem,
  KiemKeKegLit,
  Partner,
  Product,
  Transaction,
} from "../types";
import type { AnhChungTu } from "../anh/moHinh";
import type { TepCho } from "../anh/ChonAnh";
import OAnhLuoi from "../anh/OAnhLuoi";
import { quaTrungChuyen } from "../anh/duongDan";
import KiemKeKegLitSection from "./KiemKeKegLitSection";
import KiemKeVoKegThuVeSection from "./KiemKeVoKegThuVeSection";
import { dungBangTonKy } from "../lib/tonKho";
import { quyDoiHienTrang, tinhTonTheoLo } from "../lib/loBia";
import { pendingSlipTransactions } from "../lib/slip";
import { cn, formatNumber } from "../lib/utils";
import ONgay from "./ONgay";

interface Props {
  products: Product[];
  partners: Partner[];
  transactions: Transaction[];
  countedTransactions: Transaction[];
  slips: ImportSlip[];
  approvedSlips: Set<string>;
  anhTheoChungTu: Map<string, AnhChungTu[]>;
  kiemKeKeg: KiemKeKegLit[];
  canApproveGate2: boolean;
  canExport: boolean;
  canWriteInventory: boolean;
  isAdmin?: boolean;
  /** Ký duyệt & chốt kiểm kê tháng ở Kho tổng: KẾ TOÁN (và admin). */
  canApproveKiemKe?: boolean;
  busy: boolean;
  onDuyetRao2: (slipCode: string) => Promise<void>;
  onTraLaiPhieu: (slipCode: string, reason: string) => Promise<void>;
  onMoBieuMau: (slipCode: string) => void;
  onDiToiXuatKho: () => void;
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
  onDuyetKiemKeKeg?: (id: string, status: "approved" | "returned", reason?: string) => Promise<void>;
  onXoaKiemKeKeg?: (id: string) => Promise<void>;
}

export default function KhoTongNxtPanel({
  products,
  partners,
  transactions,
  countedTransactions,
  slips,
  approvedSlips,
  anhTheoChungTu,
  kiemKeKeg,
  canApproveGate2,
  canExport,
  canWriteInventory,
  isAdmin = false,
  canApproveKiemKe,
  busy,
  onDuyetRao2,
  onTraLaiPhieu,
  onMoBieuMau,
  onDiToiXuatKho,
  onLuuKiemKeKegLit,
  onDuyetKiemKeKeg,
  onXoaKiemKeKeg,
}: Props) {
  const [subTab, setSubTab] = useState<
    "nxt" | "nhan-bia" | "kiem-ke" | "thu-ve-keg"
  >("nxt");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [lotSearch, setLotSearch] = useState("");

  /* ---------- Phiếu chờ Kho tổng nhận (Rào 2) ---------- */
  const pendingRao2 = useMemo(() => {
    const byCode = new Map<string, { slip: ImportSlip; txs: Transaction[]; code: string }>();
    slips
      .filter((s) => s.status === "cho_kho_tong")
      .forEach((s) => {
        byCode.set(s.code, { code: s.code, slip: s, txs: [] });
      });
    transactions
      .filter((t) => t.type === "IN" && t.slipCode)
      .forEach((t) => {
        const entry = byCode.get(t.slipCode!);
        if (entry) entry.txs.push(t);
      });
    return Array.from(byCode.values())
      .filter((x) => x.txs.length > 0)
      .sort((a, b) => b.code.localeCompare(a.code));
  }, [slips, transactions]);

  /* ---------- Sổ Nhập · Xuất · Tồn từ nguồn chuẩn dungBangTonKy ---------- */
  const giaoDichChoKy = useMemo(
    () => pendingSlipTransactions(transactions, approvedSlips),
    [transactions, approvedSlips],
  );

  // Loại trừ in_transit như flowSummary hay vẫn tính đã rời kho?
  // Tồn kho trừ ngay khi rời kho (cả in_transit), khớp với tonTheoMatHang trong App.tsx!
  const bangTon = useMemo(
    () =>
      dungBangTonKy({
        giaoDichTinhTon: countedTransactions,
        giaoDichChoKy,
        products,
        tuNgay,
        denNgay,
        tuKhoa,
      }),
    [countedTransactions, giaoDichChoKy, products, tuNgay, denNgay, tuKhoa],
  );

  const tonTheoLo = useMemo(
    () =>
      tinhTonTheoLo(countedTransactions, products).filter((l) => {
        if (!lotSearch.trim()) return true;
        const q = lotSearch.trim().toLowerCase();
        return (
          l.batchNumber.toLowerCase().includes(q) ||
          l.productName.toLowerCase().includes(q)
        );
      }),
    [countedTransactions, products, lotSearch],
  );

  const kpiLiters = useMemo(() => {
    const capMap = new Map(products.map((p) => [p.id, (p.capacityPerUnit || 1000) / 1000]));
    const sumL = (pick: (d: (typeof bangTon.dong)[number]) => number) =>
      bangTon.dong.reduce((s, d) => s + pick(d) * (capMap.get(d.productId) || 1), 0);
    return {
      dauKy: sumL((d) => d.dauKy),
      nhap: sumL((d) => d.nhap),
      xuat: sumL((d) => d.xuatBan),
      cuoiKy: sumL((d) => d.cuoiKy),
    };
  }, [bangTon, products]);

  // Tồn sổ cho kiểm kê: tính đến ĐÚNG ngày kiểm, mọi mặt hàng — KHÔNG theo bộ
  // lọc ngày / từ khoá đang đặt ở tab Sổ NXT.
  const tonSoDenNgay = useCallback(
    (ngay: string) => {
      const b = dungBangTonKy({
        giaoDichTinhTon: countedTransactions,
        giaoDichChoKy,
        products,
        tuNgay: "",
        denNgay: ngay,
        tuKhoa: "",
      });
      const m = new Map<string, number>();
      b.dong.forEach((d) => m.set(d.productId, d.cuoiKy));
      return m;
    },
    [countedTransactions, giaoDichChoKy, products],
  );

  return (
    <div className="space-y-6 anim-view-enter">
      {/* Sub-header & Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-900">
            Kho Tổng Bà Nà · Nhập · Xuất · Tồn & Nhận Bia Từ Xưởng (Rào 2)
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Số liệu tồn kho theo mặt hàng và theo từng Mã lô cập nhật realtime ngay khi Kho tổng ký nhận Rào 2.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab("nxt")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all",
              subTab === "nxt"
                ? "bg-[#141A23] text-amber-300 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80",
            )}
          >
            1. Sổ Nhập · Xuất · Tồn & Tồn Lô
          </button>
          <button
            type="button"
            onClick={() => setSubTab("nhan-bia")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5",
              subTab === "nhan-bia"
                ? "bg-[#141A23] text-amber-300 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80",
            )}
          >
            <span>2. Chờ nhận từ xưởng (Rào 2)</span>
            {pendingRao2.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-sky-500 text-white font-mono">
                {pendingRao2.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab("kiem-ke")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all",
              subTab === "kiem-ke"
                ? "bg-[#141A23] text-amber-300 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80",
            )}
          >
            3. Kiểm kê Keg &amp; Lít
          </button>
          <button
            type="button"
            onClick={() => setSubTab("thu-ve-keg")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all",
              subTab === "thu-ve-keg"
                ? "bg-[#141A23] text-amber-300 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80",
            )}
          >
            4. Kiểm kê Vỏ Keg thu về
          </button>
        </div>
      </div>

      {/* ================= TAB 1: NHẬP · XUẤT · TỒN & TỒN LÔ ================= */}
      {subTab === "nxt" && (
        <div className="space-y-6 anim-view-enter">
          {/* 4 KPI Cards (Lít quy đổi) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm card-lift">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Tồn Đầu Kỳ (Quy đổi)
              </span>
              <p className="text-xl font-black font-mono text-slate-900 mt-1 tabular-nums">
                {formatNumber(Math.round(kpiLiters.dauKy * 10) / 10)} L
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm card-lift">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                Nhập Đã Duyệt (2 Rào)
              </span>
              <p className="text-xl font-black font-mono text-emerald-700 mt-1 tabular-nums">
                +{formatNumber(Math.round(kpiLiters.nhap * 10) / 10)} L
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm card-lift">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                Xuất Bán & Nội Bộ
              </span>
              <p className="text-xl font-black font-mono text-amber-700 mt-1 tabular-nums">
                -{formatNumber(Math.round(kpiLiters.xuat * 10) / 10)} L
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#141A23] text-white shadow-md card-lift">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                Tồn Cuối Kỳ Kho Tổng
              </span>
              <p className="text-xl font-black font-mono text-emerald-400 mt-1 tabular-nums">
                {formatNumber(Math.round(kpiLiters.cuoiKy * 10) / 10)} L
              </p>
            </div>
          </div>

          {/* Bộ lọc kỳ NXT */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Sổ Nhập · Xuất · Tồn Kho Tổng
                </h2>
                <p className="text-xs text-slate-500">
                  Cột Chờ duyệt tách riêng những phiếu chưa qua đủ 2 rào (không cộng vào Tồn cuối kỳ).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ONgay
                  aria-label="Từ ngày"
                  value={tuNgay}
                  max={denNgay || undefined}
                  onChange={setTuNgay}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                />
                <span className="text-slate-400 font-bold">—</span>
                <ONgay
                  aria-label="Đến ngày"
                  value={denNgay}
                  min={tuNgay || undefined}
                  onChange={setDenNgay}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                />
                <input
                  type="text"
                  value={tuKhoa}
                  onChange={(e) => setTuKhoa(e.target.value)}
                  placeholder="Tìm tên hoặc mã SAP..."
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none focus:border-amber-600"
                />
                {canExport && (
                  <button
                    type="button"
                    onClick={onDiToiXuatKho}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition"
                  >
                    Xuất kho FIFO <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Mặt hàng bia</th>
                    <th className="py-3 px-2 text-center">ĐVT</th>
                    <th className="py-3 px-3 text-right">Đầu kỳ</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Nhập kho</th>
                    <th className="py-3 px-3 text-right text-amber-700">Chờ duyệt</th>
                    <th className="py-3 px-3 text-right text-sky-700">Xuất bán</th>
                    <th className="py-3 px-3 text-right text-rose-600">Hao hụt</th>
                    <th className="py-3 px-4 text-right">Tồn cuối kỳ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {bangTon.dong.map((d) => (
                    <tr key={d.productId} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        {d.tenHang}
                      </td>
                      <td className="py-3 px-2 text-center font-sans text-slate-500">
                        {d.unit}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {formatNumber(d.dauKy)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {d.nhap > 0 ? `+${formatNumber(d.nhap)}` : "0"}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-600">
                        {d.choKy > 0 ? formatNumber(d.choKy) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-sky-700">
                        {d.xuatBan > 0 ? `-${formatNumber(d.xuatBan)}` : "0"}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600">
                        {d.haoHut > 0 ? `-${formatNumber(d.haoHut)}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        {formatNumber(d.cuoiKy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tồn chi tiết theo Lô bia */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Tồn Kho Chi Tiết Theo Từng Mã Lô (FIFO)
                </h3>
              </div>
              <input
                type="text"
                value={lotSearch}
                onChange={(e) => setLotSearch(e.target.value)}
                placeholder="Lọc theo mã lô..."
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none focus:border-amber-600"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Mã lô</th>
                    <th className="py-3 px-3">Mặt hàng</th>
                    <th className="py-3 px-3 text-center">Ngày đầu tiên</th>
                    <th className="py-3 px-3 text-right">Tổng vào lô</th>
                    <th className="py-3 px-3 text-right">Đã xuất + hao hụt</th>
                    <th className="py-3 px-4 text-right">Còn tồn lại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {tonTheoLo
                    .filter((l) => l.closing > 0 || l.imported > 0)
                    .slice(0, 60)
                    .map((l) => (
                      <tr key={`${l.productId}-${l.batchNumber}`} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black">
                            {l.batchNumber}
                          </span>
                          {l.slipCodes.length > 0 && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {l.slipCodes.slice(0, 2).join(", ")}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans font-bold text-slate-900">
                          {l.productName}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500">
                          {l.earliestDate}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {formatNumber(l.opening + l.imported)} {l.unit}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-700">
                          -{formatNumber(l.exported + l.loss)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                          {formatNumber(l.closing)} {l.unit}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CHỜ NHẬN TỪ XƯỞNG (RÀO 2) ================= */}
      {subTab === "nhan-bia" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden anim-view-enter">
          <div className="px-6 py-4 bg-[#141A23] text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                RÀO KIỂM SOÁT SỐ 2 · KHO TỔNG NHẬN BIA
              </span>
              <h2 className="text-base font-extrabold">
                Phiếu Quản Lý Xưởng Đã Duyệt ➔ Chờ Kho Tổng Ký Nhận
              </h2>
            </div>
            <PackageCheck className="w-5 h-5 text-sky-400" />
          </div>

          <div className="p-6 space-y-4">
            {pendingRao2.length === 0 ? (
              <p className="py-10 text-center text-xs font-bold text-slate-400">
                Không có chuyến bia nào đang chờ Kho tổng ký nhận.
              </p>
            ) : (
              pendingRao2.map(({ code, slip, txs }) => {
                const photos = anhTheoChungTu.get(code) || [];
                return (
                  <div
                    key={code}
                    className="p-4 sm:p-5 rounded-2xl border border-sky-200 bg-sky-50/40 grid grid-cols-1 md:grid-cols-12 gap-4 items-center card-lift"
                  >
                    <div className="md:col-span-7 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-[#141A23] text-amber-300">
                          {code}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          ✓ QL Xưởng đã duyệt ({slip.managerSig?.name || "Quản lý"})
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
                        {canApproveGate2 && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onDuyetRao2(code)}
                              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Xác Nhận Đủ Hàng Vào Tồn (Rào 2)
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                const lyDo = window.prompt(
                                  `Lý do trả lại phiếu ${code} (Kho tổng đếm lệch):`,
                                  "Thực tế nhận lệch số Keg so với phiếu",
                                );
                                if (lyDo?.trim()) void onTraLaiPhieu(code, lyDo.trim());
                              }}
                              className="px-3.5 py-2 rounded-xl border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-xs font-extrabold flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Trả lại (Lệch thực tế)
                            </button>
                          </>
                        )}
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
      )}

      {/* ================= TAB 3: KIỂM KÊ KEG & LÍT KHO TỔNG ================= */}
      {subTab === "kiem-ke" && (
        <div className="anim-view-enter">
          <KiemKeKegLitSection
            location="KHO_TONG"
            products={products}
            records={kiemKeKeg}
            anhTheoChungTu={anhTheoChungTu}
            tonSoDenNgay={tonSoDenNgay}
            canWrite={canWriteInventory}
            canApprove={canApproveKiemKe ?? isAdmin}
            canKiemDotXuat={canApproveKiemKe ?? isAdmin}
            tenNguoiDuyet="Kế toán"
            canDelete={isAdmin}
            busy={busy}
            onSave={onLuuKiemKeKegLit}
            onApprove={onDuyetKiemKeKeg}
            onDelete={onXoaKiemKeKeg}
          />
        </div>
      )}

      {/* ================= TAB 4: KIỂM KÊ VỎ KEG THU VỀ ================= */}
      {subTab === "thu-ve-keg" && (
        <div className="anim-view-enter">
          <KiemKeVoKegThuVeSection
            transactions={transactions}
            products={products}
            partners={partners}
            kiemKeKeg={kiemKeKeg}
            anhTheoChungTu={anhTheoChungTu}
            canWrite={canWriteInventory}
            canDelete={isAdmin}
            busy={busy}
            onSave={onLuuKiemKeKegLit}
            onDelete={onXoaKiemKeKeg}
          />
        </div>
      )}
    </div>
  );
}

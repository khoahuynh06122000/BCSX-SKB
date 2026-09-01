import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Download,
  FileWarning,
  Hash,
  Search,
  Wand2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { ImportSlip, Transaction } from "../types";
import {
  DAU_SO,
  TEN_LOAI,
  canTroHuy,
  laLoaiHuy,
  locSoPhieu,
  ngayGioVn,
  ngayVn,
  soPhieuHuy,
  tomTatSoPhieu,
  type BoLocSoPhieu,
  type GhiSoPhieu,
  type LoaiPhieu,
} from "../lib/soPhieu";
import { taoSheetDep, XLSXDep, type BangDep } from "../lib/excelDep";
import { cn, formatNumber } from "../lib/utils";

/**
 * SỔ SỐ PHIẾU
 *
 * Mỗi phiếu nhập / xuất kho một số cố định, không đổi. Quy tắc đánh số và lý do
 * từng quyết định nằm ở `src/lib/soPhieu.ts`; phần cấp số chống trùng ở
 * `src/lib/soPhieuKho.ts`.
 *
 * Màn hình này làm ba việc:
 *
 *   1. TRA SỔ — số phiếu nào, của chứng từ nào, ngày biên bản (Document Date)
 *      và ngày thật sự vào hệ thống (Entered On).
 *   2. HỦY PHIẾU — sinh phiếu hủy ghi âm, giữ nguyên phiếu gốc.
 *   3. CẤP BÙ — chứng từ đã lưu mà chưa có số thì cấp cho đủ.
 *
 * Ô "Số phiếu bị đứt quãng" là thứ đáng nhìn nhất: sổ chứng từ nhảy số là câu
 * hỏi đầu tiên của kiểm toán, và nó luôn có nguyên nhân — thường là một chứng
 * từ đã bị xoá sau khi cấp số.
 */

interface ChungTuChuaCoSo {
  loai: "NHAP" | "XUAT";
  nguon: string;
  documentDate: string;
  donVi: string;
  soDong: number;
  soLuong: number;
}

interface Props {
  soPhieu: GhiSoPhieu[];
  transactions: Transaction[];
  slips: ImportSlip[];
  /** Được phép hủy phiếu và cấp bù số không. */
  duocGhi: boolean;
  onHuy: (soGoc: string, documentDate: string, lyDo: string) => Promise<void>;
  onCapBu: (ds: ChungTuChuaCoSo[]) => Promise<void>;
}

export default function SoPhieu({
  soPhieu,
  transactions,
  slips,
  duocGhi,
  onHuy,
  onCapBu,
}: Props) {
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [loai, setLoai] = useState<LoaiPhieu | "TAT_CA">("TAT_CA");
  const [chiConHieuLuc, setChiConHieuLuc] = useState(false);
  const [dangHuy, setDangHuy] = useState<GhiSoPhieu | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [ngayHuy, setNgayHuy] = useState(format(new Date(), "yyyy-MM-dd"));
  const [banRon, setBanRon] = useState(false);
  /** Chỉ cấp bù cho chứng từ từ ngày này trở đi. */
  const [capBuTuNgay, setCapBuTuNgay] = useState(format(new Date(), "yyyy-MM-dd"));

  const loc: BoLocSoPhieu = { tuNgay, denNgay, tuKhoa, loai, chiConHieuLuc };
  const ds = useMemo(() => locSoPhieu(soPhieu, loc), [soPhieu, tuNgay, denNgay, tuKhoa, loai, chiConHieuLuc]);
  const tomTat = useMemo(() => tomTatSoPhieu(ds), [ds]);

  /** Nguồn chứng từ đã có số — để biết cái nào còn thiếu. */
  const nguonDaCoSo = useMemo(() => {
    const m = new Set<string>();
    soPhieu.forEach((g) => {
      if (!laLoaiHuy(g.loai) && g.nguon) m.add(`${g.loai}|${g.nguon}`);
    });
    return m;
  }, [soPhieu]);

  /**
   * Chứng từ đã lưu nhưng chưa có số phiếu.
   *
   * Gồm cả những lượt nhập / xuất nạp từ tệp Excel, vốn không đi qua màn hình
   * nhập tay nên không được cấp số lúc lưu.
   *
   * `OPENING` không tính: tồn đầu kỳ là số dư mang sang, không có lượt giao
   * nhận nào để in ra một tờ phiếu.
   */
  const chuaCoSo = useMemo(() => {
    const gom = new Map<string, ChungTuChuaCoSo>();
    const tu = capBuTuNgay.slice(0, 10);

    transactions.forEach((t) => {
      const ngay = String(t.date || "").slice(0, 10);
      if (!ngay || ngay < tu) return;

      let loaiCt: "NHAP" | "XUAT" | null = null;
      let nguon = "";
      if (t.type === "IN" && t.slipCode) {
        loaiCt = "NHAP";
        nguon = t.slipCode;
      } else if (t.type === "OUT" || t.type === "LOSS") {
        loaiCt = "XUAT";
        nguon = t.referenceGroupId || t.id;
      }
      if (!loaiCt || !nguon) return;
      if (nguonDaCoSo.has(`${loaiCt}|${nguon}`)) return;

      const k = `${loaiCt}|${nguon}`;
      const cu = gom.get(k);
      if (cu) {
        cu.soDong += 1;
        cu.soLuong += Number(t.quantity) || 0;
        // Chứng từ lấy ngày SỚM NHẤT trong nhóm — đó là ngày trên biên bản.
        if (ngay < cu.documentDate) cu.documentDate = ngay;
      } else {
        gom.set(k, {
          loai: loaiCt,
          nguon,
          documentDate: ngay,
          donVi: t.partnerName || "",
          soDong: 1,
          soLuong: Number(t.quantity) || 0,
        });
      }
    });

    /* Xếp theo ngày tăng dần: cấp bù phải đi từ chứng từ cũ tới mới, không thì
       số phiếu chạy ngược so với ngày. */
    return Array.from(gom.values()).sort((a, b) =>
      a.documentDate.localeCompare(b.documentDate),
    );
  }, [transactions, nguonDaCoSo, capBuTuNgay]);

  void slips;

  const daLoc = Boolean(tuNgay || denNgay || tuKhoa || loai !== "TAT_CA" || chiConHieuLuc);

  const handleXuatExcel = () => {
    if (!ds.length) return;
    const bang: BangDep = {
      tieuDeTren: [
        "SỔ SỐ PHIẾU NHẬP - XUẤT KHO",
        `${ds.length} phiếu · xuất lúc ${format(new Date(), "HH:mm dd/MM/yyyy")}`,
      ],
      tieuDe: [
        "Số phiếu",
        "Loại",
        "Document Date",
        "Entered On",
        "Đơn vị",
        "Chứng từ gốc",
        "Số dòng",
        "Số lượng",
        "Trạng thái",
        "Hủy bởi / Hủy cho",
        "Lý do hủy",
        "Người lập",
      ],
      cot: [
        { rong: 13 },
        { rong: 17 },
        { rong: 15, kieu: "giua" },
        { rong: 19, kieu: "giua" },
        { rong: 18 },
        { rong: 20 },
        { rong: 9, kieu: "so" },
        { rong: 13, kieu: "so" },
        { rong: 13, kieu: "giua" },
        { rong: 15 },
        { rong: 28 },
        { rong: 22 },
      ],
      hang: ds.map((g) => [
        g.soPhieu,
        TEN_LOAI[g.loai],
        ngayVn(g.documentDate),
        ngayGioVn(g.enteredOn),
        g.donVi || "",
        g.nguon,
        g.soDong,
        g.soLuong,
        g.trangThai === "da_huy" ? "Đã hủy" : "Còn hiệu lực",
        g.huyBoi || g.huyCho || "",
        g.lyDoHuy || "",
        g.createdBy,
      ]),
      dongTong: [
        "TỔNG CỘNG",
        "",
        "",
        "",
        "",
        "",
        ds.reduce((t, g) => t + (Number(g.soDong) || 0), 0),
        tomTat.soLuong,
        "",
        "",
        "",
        "",
      ],
    };
    const wb = XLSXDep.utils.book_new();
    XLSXDep.utils.book_append_sheet(wb, taoSheetDep(bang), "Sổ số phiếu");
    XLSXDep.writeFile(
      wb,
      `So so phieu ${format(new Date(), "dd.MM.yyyy")}.xlsx`,
    );
  };

  const xacNhanHuy = async () => {
    if (!dangHuy) return;
    setBanRon(true);
    try {
      await onHuy(dangHuy.soPhieu, ngayHuy, lyDo.trim());
      setDangHuy(null);
      setLyDo("");
    } finally {
      setBanRon(false);
    }
  };

  const chayCapBu = async () => {
    if (!chuaCoSo.length) return;
    if (
      !window.confirm(
        `Cấp số cho ${chuaCoSo.length} chứng từ chưa có số phiếu?\n\n` +
          `Chứng từ từ ngày ${ngayVn(capBuTuNgay)} trở đi, cấp theo thứ tự ngày tăng dần.\n\n` +
          `Số đã cấp thì KHÔNG thu hồi được — chỉ hủy bằng phiếu hủy.`,
      )
    )
      return;
    setBanRon(true);
    try {
      await onCapBu(chuaCoSo);
    } finally {
      setBanRon(false);
    }
  };

  const oTong = (nhan: string, giaTri: string, phu?: string) => (
    <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl">
      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">
        {nhan}
      </p>
      <p className="text-base font-black text-slate-900 mt-1.5 leading-none">
        {giaTri}
      </p>
      {phu && (
        <p className="text-[9px] font-bold text-slate-400 mt-1 leading-none">
          {phu}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------ bộ lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tra số phiếu / đơn vị / mã chứng từ..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all"
          />
          {tuKhoa && (
            <button
              onClick={() => setTuKhoa("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-40">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              aria-label="Ngày chứng từ từ"
              value={tuNgay}
              max={denNgay || undefined}
              onChange={(e) => setTuNgay(e.target.value)}
              className="w-full pl-10 pr-2 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all text-slate-700"
            />
          </div>
          <span className="text-slate-300 font-black shrink-0">—</span>
          <div className="relative flex-1 lg:w-40">
            <input
              type="date"
              aria-label="Ngày chứng từ đến"
              value={denNgay}
              min={tuNgay || undefined}
              onChange={(e) => setDenNgay(e.target.value)}
              className="w-full px-3 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all text-slate-700"
            />
          </div>
          {daLoc && (
            <button
              onClick={() => {
                setTuNgay("");
                setDenNgay("");
                setTuKhoa("");
                setLoai("TAT_CA");
                setChiConHieuLuc(false);
              }}
              className="px-3 py-3 rounded-2xl border border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-primary hover:text-primary transition-all shrink-0 premium-shadow"
            >
              Tất cả
            </button>
          )}
        </div>

        <button
          onClick={handleXuatExcel}
          disabled={!ds.length}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shrink-0"
        >
          <Download className="w-4 h-4" />
          Xuất sổ
        </button>
      </div>

      {/* Chọn loại phiếu — cả bốn đầu số, kèm chính con số để dễ nhớ. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: "TAT_CA", ten: "Tất cả", ma: "" },
            { id: "NHAP", ten: "Nhập kho", ma: DAU_SO.NHAP },
            { id: "XUAT", ten: "Xuất kho", ma: DAU_SO.XUAT },
            { id: "HUY_NHAP", ten: "Hủy nhập", ma: DAU_SO.HUY_NHAP },
            { id: "HUY_XUAT", ten: "Hủy xuất", ma: DAU_SO.HUY_XUAT },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setLoai(t.id)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
              loai === t.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-400 border-slate-100 hover:text-slate-900",
            )}
          >
            {t.ten}
            {t.ma && (
              <span className="ml-1.5 font-mono opacity-50">{t.ma}</span>
            )}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-100 cursor-pointer">
          <input
            type="checkbox"
            checked={chiConHieuLuc}
            onChange={(e) => setChiConHieuLuc(e.target.checked)}
            className="w-4 h-4 text-primary rounded border-slate-300"
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Ẩn phiếu đã hủy
          </span>
        </label>
      </div>

      {/* ---------------------------------------------------- tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {oTong(
          "Tổng phiếu",
          formatNumber(tomTat.tongPhieu),
          `${tomTat.soNhap} nhập · ${tomTat.soXuat} xuất`,
        )}
        {oTong(
          "Phiếu hủy",
          formatNumber(tomTat.soHuy),
          `${tomTat.daHuy} phiếu đã bị hủy`,
        )}
        {oTong("Số lượng ròng", formatNumber(tomTat.soLuong), "đã trừ phiếu hủy")}
        {oTong(
          "Vào sổ trễ",
          `${tomTat.ngayTrungBinhVaoSo} ngày`,
          "trung bình từ ngày biên bản",
        )}
      </div>

      {/* ------------------------------------------- số bị đứt quãng */}
      {tomTat.thieuSo.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <FileWarning className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-black text-rose-900 uppercase tracking-widest">
                {tomTat.thieuSo.length} số phiếu bị đứt quãng
              </p>
              <p className="text-[11px] text-rose-800 font-medium mt-1 leading-snug">
                Những số này nằm giữa dãy nhưng không có trong sổ — thường là
                chứng từ đã bị xoá sau khi cấp số. Sổ chứng từ nhảy số là câu
                hỏi đầu tiên của kiểm toán, nên cần tìm ra lý do.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tomTat.thieuSo.slice(0, 40).map((so) => (
                  <span
                    key={so}
                    className="px-2 py-1 bg-white border border-rose-200 rounded-lg text-[10px] font-black font-mono text-rose-900"
                  >
                    {so}
                  </span>
                ))}
                {tomTat.thieuSo.length > 40 && (
                  <span className="px-2 py-1 text-[10px] font-bold text-rose-700">
                    và {tomTat.thieuSo.length - 40} số nữa
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------- cấp bù số phiếu */}
      {duocGhi && (
        <div className="p-4 bg-white border border-slate-100 rounded-2xl premium-shadow">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Wand2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                  Chứng từ chưa có số phiếu: {chuaCoSo.length}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">
                  Gồm cả lượt nhập / xuất nạp từ tệp Excel, vốn không đi qua màn
                  hình nhập tay nên chưa được cấp số. Cấp theo thứ tự ngày tăng
                  dần để số phiếu không chạy ngược so với ngày.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Từ ngày
              </label>
              <input
                type="date"
                value={capBuTuNgay}
                onChange={(e) => setCapBuTuNgay(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              />
              <button
                onClick={chayCapBu}
                disabled={!chuaCoSo.length || banRon}
                className="px-4 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                {banRon ? "Đang cấp..." : "Cấp số"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- bảng sổ */}
      {ds.length === 0 ? (
        <div className="py-16 text-center">
          <Hash className="w-8 h-8 text-slate-200 mx-auto" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3">
            {daLoc ? "Không có phiếu nào khớp" : "Sổ số phiếu còn trống"}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-1.5 max-w-md mx-auto leading-snug">
            {daLoc
              ? "Thử bỏ bớt bộ lọc, hoặc bấm “Tất cả”."
              : "Mỗi lượt nhập kho hoặc xuất kho mới sẽ tự nhận một số. Chứng từ đã lưu trước đó thì bấm “Cấp số” ở trên."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 overflow-hidden premium-shadow bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[980px]">
              <colgroup>
                <col className="w-[104px]" />
                <col className="w-[124px]" />
                <col className="w-[104px]" />
                <col className="w-[136px]" />
                <col />
                <col className="w-[132px]" />
                <col className="w-[92px]" />
                <col className="w-[128px]" />
                <col className="w-[92px]" />
              </colgroup>
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Số phiếu",
                    "Loại",
                    "Document Date",
                    "Entered On",
                    "Đơn vị",
                    "Chứng từ gốc",
                    "Số lượng",
                    "Trạng thái",
                    "",
                  ].map((t, i) => (
                    <th
                      key={i}
                      className={cn(
                        "py-2.5 px-3 font-black text-[9px] text-slate-400 uppercase tracking-widest",
                        i === 6 && "text-right",
                        i === 7 && "text-center",
                      )}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ds.map((g) => {
                  const huy = laLoaiHuy(g.loai);
                  const daHuy = g.trangThai === "da_huy";
                  return (
                    <tr
                      key={g.soPhieu}
                      className={cn(
                        "transition-colors",
                        daHuy && "bg-slate-50/70",
                        huy && "bg-rose-50/40",
                      )}
                    >
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            "font-mono font-black text-[12px]",
                            huy ? "text-rose-700" : "text-slate-900",
                            daHuy && "line-through text-slate-400",
                          )}
                        >
                          {g.soPhieu}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                            huy
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : g.loai === "NHAP"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200",
                          )}
                        >
                          {TEN_LOAI[g.loai]}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-mono font-bold text-slate-700">
                        {ngayVn(g.documentDate)}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-mono text-slate-400">
                        {ngayGioVn(g.enteredOn)}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-bold text-slate-700 leading-tight">
                        {g.donVi || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] font-mono text-slate-400 truncate">
                        {g.nguon}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 px-3 text-[11px] font-mono font-black text-right",
                          g.soLuong < 0 ? "text-rose-600" : "text-slate-900",
                        )}
                      >
                        {formatNumber(g.soLuong)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {daHuy ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Đã hủy bởi
                            <span className="block font-mono text-[10px] text-slate-500">
                              {g.huyBoi}
                            </span>
                          </span>
                        ) : huy ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">
                            Hủy cho
                            <span className="block font-mono text-[10px] text-rose-600">
                              {g.huyCho}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Hiệu lực
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {duocGhi && !canTroHuy(g) && (
                          <button
                            onClick={() => {
                              setDangHuy(g);
                              setLyDo("");
                              setNgayHuy(format(new Date(), "yyyy-MM-dd"));
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all inline-flex items-center gap-1.5"
                          >
                            <Ban className="w-3 h-3" />
                            Hủy
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------- hộp thoại hủy */}
      {dangHuy && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => !banRon && setDangHuy(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 uppercase leading-tight">
                  Hủy phiếu {dangHuy.soPhieu}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {TEN_LOAI[dangHuy.loai]} · {dangHuy.donVi || "không rõ đơn vị"}
                </p>
              </div>
              <button
                onClick={() => !banRon && setDangHuy(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-900 font-medium leading-snug">
                  Sẽ sinh phiếu hủy{" "}
                  <strong className="font-mono">
                    {soPhieuHuy(dangHuy.soPhieu)}
                  </strong>{" "}
                  ghi âm {formatNumber(dangHuy.soLuong)}. Phiếu gốc{" "}
                  <strong>không bị xoá</strong> — nó đã in ra giấy nên phải còn
                  dấu vết, chỉ đánh dấu là đã hủy.
                </p>
              </div>

              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Ngày chứng từ của phiếu hủy
                </span>
                <input
                  type="date"
                  value={ngayHuy}
                  onChange={(e) => setNgayHuy(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
                />
              </label>

              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Lý do hủy
                </span>
                <input
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value)}
                  placeholder="Ví dụ: ghi nhầm số lượng, giao lại đơn khác..."
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-300"
                />
                <span className="block text-[9px] font-bold text-slate-400 mt-1">
                  Không bắt buộc, nhưng ba tháng sau chính mình sẽ cần đọc lại.
                </span>
              </label>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setDangHuy(null)}
                disabled={banRon}
                className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-40"
              >
                Thôi
              </button>
              <button
                onClick={xacNhanHuy}
                disabled={banRon}
                className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 disabled:opacity-40 transition-all"
              >
                {banRon ? "Đang hủy..." : "Hủy phiếu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

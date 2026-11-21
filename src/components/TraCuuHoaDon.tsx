import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileSearch,
  ImageDown,
  Replace,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Partner, Product, Transaction } from "../types";
import type { HoaDonGhiNhan } from "../lib/hoaDon";
import { invoiceUnitOf } from "../lib/invoice";
import { ngayCham } from "../lib/oNgay";
import { taoWorkbookCongNo } from "../lib/congNoExcel";
import { XLSXDep } from "../lib/excelDep";
import {
  locTraCuu,
  nenTraCuu,
  tenTepTraCuu,
  type HoaDonDaXuat,
} from "../lib/traCuuHoaDon";
import { nhanNgayGiao } from "../lib/congNo";
import type { KetQuaThayThe, ToHoaDon } from "../lib/hoaDonThayThe";
import LapHoaDonThayThe from "./LapHoaDonThayThe";
import { formatNumber, homNayDiaPhuong } from "../lib/utils";
import BangChotHoaDon from "./BangChotHoaDon";
import type { AnhChungTu } from "../anh/moHinh";
import { anhCuaHoaDon, boTepNhieuHoaDon, tenAnhTrongBo, tenGocHoaDon } from "../anh/anhHoaDon";
import { taiBoAnh } from "../anh/taiBoAnh";

import ONgay from "./ONgay";

/**
 * TRA CỨU HÓA ĐƠN ĐÃ XUẤT
 *
 * Bước cuối của vòng làm việc: đã phát hành hóa đơn trên hệ thống khác, đã điền
 * số và ngày vào app, giờ cần xem lại. Xem `src/lib/traCuuHoaDon.ts` để biết vì
 * sao màn hình này KHÔNG cần ai khai lại biên đợt.
 *
 * Mặc định lọc THÁNG HIỆN TẠI (anh Khoa 21/11/2026); "Tất cả" bỏ lọc.
 *
 * HÓA ĐƠN THAY THẾ: tờ bị thay thế tô đỏ, ô ảnh ghi "bị thay thế bởi …"; tờ
 * thay thế ghi "thay thế cho …" và mang ảnh của tờ cũ. Lọc riêng được hai loại.
 *
 * Tệp tải về đi qua đúng `taoWorkbookCongNo()` mà lúc phát hành đã dùng, nên
 * mở lên giống hệt sheet "Chốt" của file tháng — kể cả hai dải màu hai chặng
 * giá và định dạng số. Không dựng thêm một bộ ghi tệp thứ hai: hai bộ thì sớm
 * muộn lệch nhau, và người nhận sẽ thấy hai tệp cùng tên mà khác nhau.
 */

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  hoaDon: HoaDonGhiNhan[];
  /**
   * Xoá một bản ghi hóa đơn MỒ CÔI. Không truyền thì không hiện nút xoá.
   *
   * Chỉ chủ sở hữu mới được truyền vào — xem `handleXoaHoaDon` ở `App.tsx`.
   */
  onXoaMoCoi?: (h: HoaDonGhiNhan) => void;
  /**
   * Ảnh chứng từ theo mã chứng từ — truyền vào thì mỗi tờ có nút tải ảnh phiếu
   * xuất (kế toán, DNC, admin). Không truyền thì không có cột ảnh.
   */
  anhTheoChungTu?: ReadonlyMap<string, readonly AnhChungTu[]>;
  bao?: (chu: string, kieu?: "success" | "error") => void;
  /** Lập hóa đơn thay thế (kế toán, admin). Không truyền thì không có nút. */
  onThayThe?: (kq: KetQuaThayThe) => Promise<boolean>;
  /** Tên người đang dùng — ghi vào tờ bị thay thế. */
  nguoi?: string;
}

/** Ngày đầu và ngày cuối của tháng hiện tại, giờ Việt Nam (yyyy-MM-dd). */
function thangHienTai(): { tu: string; den: string } {
  const homNay = homNayDiaPhuong();
  const [n, t] = homNay.split("-").map(Number);
  const cuoi = new Date(Date.UTC(n, t, 0)).getUTCDate();
  const thang = homNay.slice(0, 7);
  return { tu: `${thang}-01`, den: `${thang}-${String(cuoi).padStart(2, "0")}` };
}

export default function TraCuuHoaDon({
  onXoaMoCoi,
  anhTheoChungTu,
  bao,
  onThayThe,
  nguoi = "",
  transactions,
  products,
  partners,
  hoaDon,
}: Props) {
  /* Mặc định THÁNG HIỆN TẠI (01 → ngày cuối tháng), không mở toàn bộ — anh
     Khoa 21/11/2026. Muốn xem hết thì bấm "Tất cả". */
  const [tuNgay, setTuNgay] = useState(() => thangHienTai().tu);
  const [denNgay, setDenNgay] = useState(() => thangHienTai().den);
  const [tuKhoa, setTuKhoa] = useState("");
  const [loai, setLoai] = useState<"" | "thayThe" | "biThayThe">("");
  /** Id bản ghi của tờ đang mở khung lập hóa đơn thay thế. */
  const [dangThay, setDangThay] = useState("");

  /*
   * Hai bước, hai memo — CỐ Ý. Bước dựng lại dòng chi tiết phải đi qua toàn bộ
   * sổ xuất kho, nên chỉ chạy lại khi dữ liệu đổi. Gõ vào ô tìm kiếm thì chỉ
   * bước lọc chạy lại; gộp chung một memo là mỗi ký tự dựng lại cả bảng.
   */
  const nen = useMemo(
    () => nenTraCuu({ hoaDon, transactions, products, partners }),
    [hoaDon, transactions, products, partners],
  );

  const kq = useMemo(
    () => locTraCuu(nen, { tuNgay, denNgay, tuKhoa, loai }),
    [nen, tuNgay, denNgay, tuKhoa, loai],
  );

  const daLoc = Boolean(tuNgay || denNgay || tuKhoa || loai);

  /* ------------------------------------------- hóa đơn thay thế */
  /** Tờ đang hiệu lực của (đợt × mã BP), kèm dòng hàng hiện tại. */
  const toCua = (tu: string, den: string, maBp: string): ToHoaDon | undefined => {
    const ban = nen.daCoSo.find(
      (h) =>
        String(h.tuNgay).slice(0, 10) === tu &&
        String(h.denNgay).slice(0, 10) === den &&
        (h.maBp || h.donVi) === maBp,
    );
    if (!ban) return undefined;
    return { ban, dong: nen.theoKhoa.get(`${nhanNgayGiao(tu, den)}|${maBp}`) || [] };
  };
  const soDaCo = useMemo(
    () =>
      new Set(
        hoaDon
          .flatMap((h) => [h.soHoaDon, ...(h.thayTheCho || []).map((x) => x.soHoaDon)])
          .map((x) => String(x || "").trim().toUpperCase())
          .filter(Boolean),
      ),
    [hoaDon],
  );
  const banDangThay = dangThay ? nen.daCoSo.find((h) => h.id === dangThay) : undefined;
  const toDangThay = banDangThay
    ? toCua(
        String(banDangThay.tuNgay).slice(0, 10),
        String(banDangThay.denNgay).slice(0, 10),
        banDangThay.maBp || banDangThay.donVi,
      )
    : undefined;
  const ghiChuThayThe = (h: HoaDonDaXuat) =>
    h.biThayTheBoi ? (
      <span className="text-[11px] font-black text-rose-600">
        Bị thay thế bởi {h.biThayTheBoi.soHoaDon}
        {h.biThayTheBoi.maBp !== h.maBp ? ` (${h.biThayTheBoi.donVi})` : ""}
      </span>
    ) : h.thayTheCho?.length ? (
      <span className="text-[11px] font-black text-amber-700">
        Thay thế cho{" "}
        {h.thayTheCho
          .map((x) => (x.maBp !== h.maBp ? `${x.soHoaDon} (${x.donVi})` : x.soHoaDon))
          .join(", ")}
      </span>
    ) : null;

  /* ------------------------------------------- ảnh chứng từ của từng tờ */
  const khoaCua = (h: { soHoaDon: string; maBp: string; nhanDot: string }) =>
    `${h.soHoaDon}|${h.maBp}|${h.nhanDot}`;
  const giaoDichTheoId = useMemo(
    () => new Map(transactions.map((t) => [t.id, t])),
    [transactions],
  );
  const anhTheoKhoa = useMemo(() => {
    const m = new Map<string, AnhChungTu[]>();
    if (!anhTheoChungTu) return m;
    kq.hoaDon.forEach((h) =>
      m.set(
        khoaCua(h),
        h.biThayTheBoi ? [] : anhCuaHoaDon(h.dong, giaoDichTheoId, anhTheoChungTu),
      ),
    );
    return m;
  }, [kq.hoaDon, giaoDichTheoId, anhTheoChungTu]);
  const tongAnh = useMemo(
    () => [...anhTheoKhoa.values()].reduce((n, ds) => n + ds.length, 0),
    [anhTheoKhoa],
  );
  const [dangTai, setDangTai] = useState<{ khoa: string; xong: number; tong: number } | null>(null);

  const chayTai = async (
    khoa: string,
    tep: { ten: string; url: string }[],
    tenZip: string,
    luonZip = false,
  ) => {
    if (dangTai || !tep.length) return;
    setDangTai({ khoa, xong: 0, tong: tep.length });
    try {
      const kqTai = await taiBoAnh(
        tep,
        tenZip,
        (xong, tong) => setDangTai({ khoa, xong, tong }),
        luonZip,
      );
      if (!kqTai.daTai) bao?.("Không tải được tấm ảnh nào. Kiểm tra lại mạng.", "error");
      else if (kqTai.hong.length)
        bao?.(
          `Đã tải ${kqTai.daTai} ảnh — ${kqTai.hong.length} tấm KHÔNG lấy được: ${kqTai.hong.join(", ")}`,
          "error",
        );
      else bao?.(`Đã tải ${kqTai.daTai} ảnh`);
    } catch (e) {
      bao?.(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setDangTai(null);
    }
  };

  const soCu = (h: HoaDonDaXuat) => (h.thayTheCho || []).map((x) => x.soHoaDon);
  const taiAnhMotTo = (h: HoaDonDaXuat) => {
    const anh = anhTheoKhoa.get(khoaCua(h)) || [];
    const goc = tenGocHoaDon(h.soHoaDon, h.donVi, soCu(h));
    const urls = anh.map((a) => a.url);
    const ten = tenAnhTrongBo(goc, urls);
    return chayTai(khoaCua(h), urls.map((url, i) => ({ ten: ten[i], url })), `${goc}.zip`);
  };

  const taiAnhTatCa = () => {
    const tep = boTepNhieuHoaDon(
      kq.hoaDon.map((h) => ({
        soHoaDon: h.soHoaDon,
        donVi: h.donVi,
        thayTheCho: soCu(h),
        anh: anhTheoKhoa.get(khoaCua(h)) || [],
      })),
    );
    if (tep.length > 300 && !window.confirm(`Sắp tải ${tep.length} ảnh vào một tệp ZIP, có thể mất vài phút. Tiếp tục?`)) return;
    const ngay = kq.hoaDon.map((h) => h.ngayHoaDon).filter(Boolean).sort();
    const ten = tenTepTraCuu(ngay[0] || tuNgay, ngay[ngay.length - 1] || denNgay).replace(/\.xlsx$/i, "");
    return chayTai("*", tep, `Anh ${ten}.zip`, true);
  };

  const handleDownload = () => {
    if (!kq.bang.dong.length) return;
    const matHang = products
      .filter((p) => p.materialCode)
      .map((p) => ({
        maVatTu: p.materialCode as string,
        ten: p.name,
        dvt: invoiceUnitOf(p.category),
      }));
    const theoMa = new Map<string, string>();
    partners
      .filter((p) => p.sapCode && p.type !== "SUPPLIER")
      .forEach((p) => {
        const ten = p.name.split("·")[0].trim();
        if (!theoMa.has(p.sapCode)) theoMa.set(p.sapCode, ten);
      });
    const donVi = Array.from(theoMa.entries())
      .map(([maSap, ten]) => ({ ten, maSap }))
      .sort((a, b) => a.ten.localeCompare(b.ten, "vi"));

    /*
     * Tên tệp lấy theo KHOẢNG NGÀY THẬT của phần đang xem, không lấy theo hai ô
     * lọc: không lọc gì mà tệp tên "Hoa don da xuat.xlsx" thì lưu vài tháng là
     * không phân biệt được tệp nào của kỳ nào.
     */
    const ngay = kq.hoaDon.map((h) => h.ngayHoaDon).filter(Boolean).sort();
    const wb = taoWorkbookCongNo(kq.bang, matHang, donVi);
    XLSXDep.writeFile(
      wb,
      tenTepTraCuu(ngay[0] || tuNgay, ngay[ngay.length - 1] || denNgay),
    );
  };

  const oTong = (nhan: string, giaTri: string, phu?: string) => (
    <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl">
      <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">
        {nhan}
      </p>
      <p className="text-base font-black text-slate-900 mt-1.5 leading-none">
        {giaTri}
      </p>
      {phu && (
        <p className="text-[11px] font-bold text-slate-400 mt-1 leading-none">
          {phu}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------- bộ lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tra số hóa đơn / tên đơn vị / mã BP..."
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

        {/* Lọc theo NGÀY HÓA ĐƠN, không phải ngày giao bia — người hỏi lại
            luôn cầm tờ hóa đơn trong tay và chỉ biết ngày trên tờ đó. */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-40">
            <ONgay
              aria-label="Ngày hóa đơn từ"
              value={tuNgay}
              max={denNgay || undefined}
              onChange={(v: string) => setTuNgay(v)}
              className="w-full px-3 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all text-slate-700"
            />
          </div>
          <span className="text-slate-300 font-black shrink-0">—</span>
          <div className="relative flex-1 lg:w-40">
            <ONgay
              aria-label="Ngày hóa đơn đến"
              value={denNgay}
              min={tuNgay || undefined}
              onChange={(v: string) => setDenNgay(v)}
              className="w-full px-3 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none premium-shadow transition-all text-slate-700"
            />
          </div>
          {daLoc && (
            <button
              onClick={() => {
                setTuNgay("");
                setDenNgay("");
                setTuKhoa("");
                setLoai("");
              }}
              className="px-3 py-3 rounded-2xl border border-slate-100 bg-white text-[11px] font-black uppercase tracking-widest text-slate-500 hover:border-primary hover:text-primary transition-all shrink-0 premium-shadow"
            >
              Tất cả
            </button>
          )}
        </div>

        <select
          aria-label="Loại hóa đơn"
          value={loai}
          onChange={(e) => setLoai(e.target.value as typeof loai)}
          className="px-3 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:border-primary focus:outline-none premium-shadow text-slate-700 shrink-0"
        >
          <option value="">Mọi hóa đơn</option>
          <option value="thayThe">Hóa đơn thay thế</option>
          <option value="biThayThe">Hóa đơn bị thay thế</option>
        </select>

        <button
          onClick={handleDownload}
          disabled={!kq.bang.dong.length}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shrink-0"
        >
          <Download className="w-4 h-4" />
          Xuất mẫu Chốt
        </button>

        {anhTheoChungTu && (
          <button
            onClick={taiAnhTatCa}
            disabled={!tongAnh || !!dangTai}
            title="Tải ảnh phiếu xuất của mọi hóa đơn đang hiện — mỗi hóa đơn một thư mục"
            className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shrink-0"
          >
            <ImageDown className="w-4 h-4" />
            {dangTai?.khoa === "*"
              ? `Đang tải ${dangTai.xong}/${dangTai.tong}`
              : `Tải ảnh (${formatNumber(tongAnh)})`}
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- tổng quan */}
      {/* Bốn ô, không có Thuế TTĐB và Doanh thu 511: file bộ phận đã bỏ hai
          cột đó nên app cũng không hiện. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {oTong(
          "Số hóa đơn",
          formatNumber(kq.tong.soHoaDon),
          `${kq.tong.soDong} dòng hàng`,
        )}
        {oTong("Số lượng", formatNumber(kq.tong.soLuong), "lít + lon")}
        {oTong(
          "Tiền SKB → DNC",
          formatNumber(Math.round(kq.tong.thanhTienSkb)),
          `sau thuế ${formatNumber(Math.round(kq.tong.sauThueSkb))}`,
        )}
        {oTong(
          "Tiền DNC → ĐVTV",
          formatNumber(Math.round(kq.tong.thanhTienDnc)),
          `sau thuế ${formatNumber(Math.round(kq.tong.sauThueDnc))}`,
        )}
      </div>

      {/* ------------------------------------- hóa đơn mất dòng bên dưới */}
      {kq.thieuDong.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-black text-amber-900 uppercase tracking-widest">
                {kq.thieuDong.length} hóa đơn không dựng lại được dòng hàng
              </p>
              <p className="text-[13px] text-amber-800 font-medium mt-1 leading-snug">
                Số hóa đơn đã ghi nhưng giao dịch xuất kho bên dưới đã bị sửa,
                bị xoá, hoặc đơn vị đã mất mã BP sau khi hóa đơn phát hành. Cần
                xem lại vì tờ hóa đơn vẫn đang có hiệu lực với cơ quan thuế.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {kq.thieuDong.map((h) => (
                  <span
                    key={h.id}
                    className="pl-2 pr-1 py-1 bg-white border border-amber-200 rounded-lg text-[12px] font-black font-mono text-amber-900 inline-flex items-center gap-1.5"
                  >
                    {h.soHoaDon} · {h.donVi} · {ngayCham(h.ngayHoaDon)}
                    {/*
                      Nút xoá CHỈ hiện ở đây — tức là chỉ ở hóa đơn mồ côi, và
                      chỉ với chủ sở hữu. Hóa đơn còn dựng được dòng hàng thì
                      không có đường nào xoá trên giao diện.
                    */}
                    {onXoaMoCoi && (
                      <button
                        onClick={() => onXoaMoCoi(h)}
                        title="Xoá bản ghi hóa đơn mồ côi này"
                        className="p-1 rounded text-amber-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {onXoaMoCoi && (
                <p className="text-[12px] font-bold text-amber-700/80 mt-2 leading-snug">
                  Chỉ xoá khi chắc đây là số thử nghiệm. Hóa đơn đã phát hành
                  thật thì nạp lại dữ liệu xuất kho của kỳ đó để dòng hàng nối
                  lại — đừng xoá.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- danh sách */}
      {kq.hoaDon.length === 0 ? (
        <div className="py-16 text-center">
          <FileSearch className="w-8 h-8 text-slate-200 mx-auto" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3">
            {daLoc
              ? "Không có hóa đơn nào khớp"
              : "Chưa có hóa đơn nào được điền số"}
          </p>
          <p className="text-[13px] text-slate-400 font-medium mt-1.5 max-w-md mx-auto leading-snug">
            {daLoc
              ? "Thử bỏ bớt bộ lọc, hoặc bấm “Tất cả”."
              : "Sang thẻ “Kết xuất · điền số”, phát hành hóa đơn rồi điền số và ngày thật vào bảng. Điền xong thì hóa đơn hiện ở đây."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/*
            BẢNG CHỐT BÀY THẲNG RA, không phải mở từng tờ mới thấy.
            Người tra cứu thường cần rà cả loạt dòng cùng lúc — đối chiếu với
            tệp Excel, cộng lại một cột — mà thẻ xếp gập thì phải mở từng tờ.
            Dùng CHUNG component với thẻ "Đã xuất hóa đơn" nên hai màn hình
            không bao giờ lệch nhau.
          */}
          {onThayThe && toDangThay && (
            <LapHoaDonThayThe
              key={toDangThay.ban.id}
              goc={toDangThay}
              toCua={toCua}
              giaoDichTheoId={giaoDichTheoId}
              partners={partners}
              soDaCo={soDaCo}
              nguoi={nguoi}
              onLuu={onThayThe}
              onDong={() => setDangThay("")}
            />
          )}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <p className="text-[13px] font-black text-slate-700 tracking-tight">
                Bảng Chốt · {kq.hoaDon.length} hóa đơn ·{" "}
                {kq.hoaDon.reduce((n, h) => n + h.dong.length, 0)} dòng
              </p>
            </div>
            <BangChotHoaDon
              khoi={kq.hoaDon.map((h) => ({
                khoa: khoaCua(h),
                soHoaDon: h.soHoaDon,
                ngayHoaDon: h.ngayHoaDon,
                dong: h.dong,
                biThayThe: !!h.biThayTheBoi,
                ghiChu: ghiChuThayThe(h),
              }))}
              oThaoTac={
                onThayThe
                  ? (k) => {
                      const h = kq.hoaDon.find((x) => khoaCua(x) === k.khoa);
                      if (!h || h.biThayTheBoi) return null;
                      return (
                        <button
                          onClick={() => setDangThay(dangThay === h.id ? "" : h.id)}
                          title="Lập hóa đơn thay thế cho tờ này"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide text-amber-700 hover:bg-amber-50"
                        >
                          <Replace className="w-3.5 h-3.5" />
                          Thay thế
                        </button>
                      );
                    }
                  : undefined
              }
              oAnh={
                anhTheoChungTu
                  ? (k) => {
                      const h = kq.hoaDon.find((x) => khoaCua(x) === k.khoa);
                      const n = anhTheoKhoa.get(k.khoa)?.length || 0;
                      if (!h) return null;
                      if (h.biThayTheBoi)
                        return (
                          <span className="text-[11px] font-black text-rose-600 whitespace-normal">
                            Hóa đơn bị thay thế
                            <br />
                            bởi {h.biThayTheBoi.soHoaDon}
                          </span>
                        );
                      const dang = dangTai?.khoa === k.khoa;
                      return (
                        <button
                          onClick={() => taiAnhMotTo(h)}
                          disabled={!n || !!dangTai}
                          title={
                            n
                              ? `Tải ${n} ảnh phiếu xuất — lưu tên ${tenGocHoaDon(h.soHoaDon, h.donVi, soCu(h))}`
                              : "Chưa có ảnh phiếu xuất cho hóa đơn này"
                          }
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] font-black text-slate-500 hover:text-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ImageDown className="w-4 h-4" />
                          {dang ? `${dangTai!.xong}/${dangTai!.tong}` : n}
                          {h.thayTheCho?.length ? (
                            <span className="text-[10px] font-black text-amber-700">
                              · ảnh của {soCu(h).join(", ")}
                            </span>
                          ) : null}
                        </button>
                      );
                    }
                  : undefined
              }
            />
          </div>

        </div>
      )}
    </div>
  );
}

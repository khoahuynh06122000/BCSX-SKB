import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Download,
  FileSearch,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Partner, Product, Transaction } from "../types";
import type { HoaDonGhiNhan } from "../lib/hoaDon";
import { invoiceUnitOf } from "../lib/invoice";
import { ngayVietNam } from "../lib/congNo";
import { taoWorkbookCongNo } from "../lib/congNoExcel";
import { XLSXDep } from "../lib/excelDep";
import {
  locTraCuu,
  nenTraCuu,
  tenTepTraCuu,
  type HoaDonDaXuat,
} from "../lib/traCuuHoaDon";
import { cn, formatNumber } from "../lib/utils";

/**
 * TRA CỨU HÓA ĐƠN ĐÃ XUẤT
 *
 * Bước cuối của vòng làm việc: đã phát hành hóa đơn trên hệ thống khác, đã điền
 * số và ngày vào app, giờ cần xem lại. Xem `src/lib/traCuuHoaDon.ts` để biết vì
 * sao màn hình này KHÔNG cần ai khai lại biên đợt.
 *
 * Mặc định KHÔNG lọc ngày — mở ra là thấy toàn bộ hóa đơn đã xuất, mới nhất
 * trước. Đặt sẵn tháng hiện tại thì đầu tháng mở ra thấy bảng trống, dễ tưởng
 * là mất dữ liệu.
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
}

export default function TraCuuHoaDon({
  transactions,
  products,
  partners,
  hoaDon,
}: Props) {
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  /** Hóa đơn đang mở xem chi tiết. Mở một tờ tại một lúc. */
  const [dangMo, setDangMo] = useState<string>("");

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
    () => locTraCuu(nen, { tuNgay, denNgay, tuKhoa }),
    [nen, tuNgay, denNgay, tuKhoa],
  );

  const daLoc = Boolean(tuNgay || denNgay || tuKhoa);

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
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              aria-label="Ngày hóa đơn từ"
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
              aria-label="Ngày hóa đơn đến"
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
              }}
              className="px-3 py-3 rounded-2xl border border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest text-slate-500 hover:border-primary hover:text-primary transition-all shrink-0 premium-shadow"
            >
              Tất cả
            </button>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={!kq.bang.dong.length}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shrink-0"
        >
          <Download className="w-4 h-4" />
          Xuất mẫu Chốt
        </button>
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
              <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest">
                {kq.thieuDong.length} hóa đơn không dựng lại được dòng hàng
              </p>
              <p className="text-[11px] text-amber-800 font-medium mt-1 leading-snug">
                Số hóa đơn đã ghi nhưng giao dịch xuất kho bên dưới đã bị sửa,
                bị xoá, hoặc đơn vị đã mất mã BP sau khi hóa đơn phát hành. Cần
                xem lại vì tờ hóa đơn vẫn đang có hiệu lực với cơ quan thuế.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {kq.thieuDong.map((h) => (
                  <span
                    key={h.id}
                    className="px-2 py-1 bg-white border border-amber-200 rounded-lg text-[10px] font-black font-mono text-amber-900"
                  >
                    {h.soHoaDon} · {h.donVi} · {ngayVietNam(h.ngayHoaDon)}
                  </span>
                ))}
              </div>
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
          <p className="text-[11px] text-slate-400 font-medium mt-1.5 max-w-md mx-auto leading-snug">
            {daLoc
              ? "Thử bỏ bớt bộ lọc, hoặc bấm “Tất cả”."
              : "Sang thẻ “Kết xuất · điền số”, phát hành hóa đơn rồi điền số và ngày thật vào bảng. Điền xong thì hóa đơn hiện ở đây."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {kq.hoaDon.map((h) => (
            <TheHoaDon
              key={`${h.soHoaDon}|${h.maBp}|${h.nhanDot}`}
              h={h}
              mo={dangMo === `${h.soHoaDon}|${h.maBp}|${h.nhanDot}`}
              onToggle={() =>
                setDangMo((cu) => {
                  const k = `${h.soHoaDon}|${h.maBp}|${h.nhanDot}`;
                  return cu === k ? "" : k;
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Một tờ hóa đơn: bấm để xem các dòng hàng bên trong. */
function TheHoaDon({
  h,
  mo,
  onToggle,
}: {
  h: HoaDonDaXuat;
  mo: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-white border rounded-2xl overflow-hidden transition-all",
        mo ? "border-primary/40 premium-shadow" : "border-slate-100",
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50/60 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Receipt className="w-4 h-4 text-amber-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-mono font-black text-sm text-slate-900 leading-none">
              {h.soHoaDon}
            </span>
            <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-tighter text-slate-700">
              {h.donVi}
            </span>
            {h.maBp && (
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {h.maBp}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              HĐ {ngayVietNam(h.ngayHoaDon)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              giao {h.nhanDot}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {h.dong.length} mặt hàng · {formatNumber(h.soLuong)}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-mono font-black text-sm text-slate-900 leading-none">
            {formatNumber(Math.round(h.thanhTienSkb))}
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">
            sau thuế {formatNumber(Math.round(h.sauThueSkb))}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-300 shrink-0 transition-transform",
            mo && "rotate-180",
          )}
        />
      </button>

      {mo && (
        <div className="border-t border-slate-100">
          {/* Bảng ngang nhiều cột nên cho cuộn trong khung của chính nó,
              không để cả trang phải lướt ngang. */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                {/* Hai khối giá tô hai màu như trong tệp — hai bộ cột giống
                    hệt nhau, không phân biệt thì rất dễ đọc nhầm chặng. */}
                <tr>
                  <th colSpan={4} className="bg-slate-50" />
                  <th
                    colSpan={4}
                    className="py-1.5 px-3 font-black text-[9px] text-white uppercase tracking-widest bg-[#1F4E5F] text-center whitespace-nowrap"
                  >
                    SKB - DNC
                  </th>
                  <th
                    colSpan={4}
                    className="py-1.5 px-3 font-black text-[9px] text-white uppercase tracking-widest bg-[#6B4E71] text-center whitespace-nowrap"
                  >
                    DNC xuất BNC và ĐVTV
                  </th>
                </tr>
                <tr className="bg-slate-50">
                  {[
                    "Mã vật tư",
                    "Tên hàng hóa",
                    "ĐVT",
                    "Số lượng",
                    "Đơn giá",
                    "Thành tiền",
                    "VAT",
                    "Sau thuế",
                    "Đơn giá",
                    "Thành tiền",
                    "VAT",
                    "Sau thuế",
                  ].map((t, i) => (
                    <th
                      key={i}
                      className={cn(
                        "py-2.5 px-3 font-black text-[9px] uppercase tracking-widest whitespace-nowrap",
                        i >= 3 && "text-right",
                        i >= 4 && i <= 7
                          ? "bg-[#1F4E5F]/10 text-[#1F4E5F]"
                          : i >= 8
                            ? "bg-[#6B4E71]/10 text-[#6B4E71]"
                            : "text-slate-400",
                      )}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {h.dong.map((d) => (
                  <tr key={`${d.maVatTu}|${d.dvt}`}>
                    <td className="py-2.5 px-3 text-[11px] font-mono font-bold text-slate-500 whitespace-nowrap">
                      {d.maVatTu || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-bold text-slate-800">
                      {d.tenHangHoa}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase">
                      {d.dvt}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono font-black text-slate-900 text-right whitespace-nowrap">
                      {formatNumber(d.soLuong)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono text-slate-500 text-right whitespace-nowrap">
                      {formatNumber(d.donGiaSkb)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono font-bold text-slate-800 text-right whitespace-nowrap">
                      {formatNumber(Math.round(d.thanhTienSkb))}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono text-slate-500 text-right whitespace-nowrap">
                      {formatNumber(Math.round(d.vatSkb))}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono font-bold text-slate-800 text-right whitespace-nowrap">
                      {formatNumber(Math.round(d.sauThueSkb))}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono text-slate-400 text-right whitespace-nowrap bg-[#6B4E71]/5">
                      {formatNumber(d.donGiaDnc)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono font-bold text-slate-800 text-right whitespace-nowrap bg-[#6B4E71]/5">
                      {formatNumber(Math.round(d.thanhTienDnc))}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono text-slate-500 text-right whitespace-nowrap bg-[#6B4E71]/5">
                      {formatNumber(Math.round(d.vatDnc))}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono font-bold text-slate-800 text-right whitespace-nowrap bg-[#6B4E71]/5">
                      {formatNumber(Math.round(d.sauThueDnc))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td
                    colSpan={3}
                    className="py-2.5 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest"
                  >
                    Tổng tờ này
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono font-black text-slate-900 text-right whitespace-nowrap">
                    {formatNumber(h.soLuong)}
                  </td>
                  <td />
                  <td className="py-2.5 px-3 text-[11px] font-mono font-black text-slate-900 text-right whitespace-nowrap">
                    {formatNumber(Math.round(h.thanhTienSkb))}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono font-black text-slate-700 text-right whitespace-nowrap">
                    {formatNumber(Math.round(h.vatSkb))}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono font-black text-slate-900 text-right whitespace-nowrap">
                    {formatNumber(Math.round(h.sauThueSkb))}
                  </td>
                  <td />
                  <td className="py-2.5 px-3 text-[11px] font-mono font-black text-slate-900 text-right whitespace-nowrap">
                    {formatNumber(Math.round(h.thanhTienDnc))}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono font-black text-slate-700 text-right whitespace-nowrap">
                    {formatNumber(Math.round(h.vatDnc))}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono font-black text-slate-900 text-right whitespace-nowrap">
                    {formatNumber(Math.round(h.sauThueDnc))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Ai điền số vào app và điền lúc nào — để truy khi số bị sai. */}
          {(h.ghiBoi || h.ghiLuc) && (
            <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Số điền bởi {h.ghiBoi || "không rõ"}
                {h.ghiLuc
                  ? ` · ${format(new Date(h.ghiLuc), "HH:mm dd/MM/yyyy")}`
                  : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  Download,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Partner, Product, Transaction } from "../types";
import { dungBangBNC, laBoPhanBNC, type DonBNC as DonBNCType } from "../lib/bnc";
import { taoSheetDep, XLSXDep } from "../lib/excelDep";
import { cn, formatNumber } from "../lib/utils";

/**
 * ĐƠN BNC — THEO DÕI BIA ĐI TỚI ĐÂU TRONG KHU
 *
 * File công nợ chỉ có đúng một dòng "BNC" cho mỗi mặt hàng, vì với SAP thì cả
 * khu là một khách hàng mã AD0103. Nhìn vào đó không ai biết quán nào uống bao
 * nhiêu. Màn hình này tách ngược lại tới từng bộ phận.
 *
 * Phép tính nằm ở `src/lib/bnc.ts` để chạy thử được bằng dữ liệu giả.
 *
 * ĐƠN Ở ĐÂY LÀ CÙNG MỘT THỨ với đơn ở tab Đơn đi đường và với đơn sinh ra khi
 * nạp file BBGN: một `referenceGroupId`, tức một chuyến giao. Ba màn hình đếm
 * ra cùng một con số, không ai phải hỏi "sao chỗ này 15 chỗ kia 20".
 */

interface Props {
  transactions: Transaction[];
  products: Product[];
  /** Danh mục đơn vị đã ghép, để lấy tên bộ phận. */
  partners: Partner[];
}

export default function DonBNC({ transactions, products, partners }: Props) {
  const [tuNgay, setTuNgay] = useState(() =>
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
  );
  const [denNgay, setDenNgay] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [boPhan, setBoPhan] = useState("");
  /** Đơn đang mở khung xem ảnh biên bản; `null` là đang đóng. */
  const [donDangXem, setDonDangXem] = useState<DonBNCType | null>(null);

  const dsBoPhan = useMemo(
    () => partners.filter((p) => laBoPhanBNC(p.id)),
    [partners],
  );

  const tenBoPhan = useMemo(() => {
    const m = new Map<string, string>();
    dsBoPhan.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [dsBoPhan]);

  const bang = useMemo(
    () =>
      dungBangBNC({
        transactions,
        products,
        tuNgay,
        denNgay,
        boPhan,
        tenBoPhan,
      }),
    [transactions, products, tuNgay, denNgay, boPhan, tenBoPhan],
  );

  const taiExcel = () => {
    if (!bang.don.length) return;
    const wb = XLSXDep.utils.book_new();
    const lam1 = (n: number) => Math.round(n * 10) / 10;

    XLSXDep.utils.book_append_sheet(
      wb,
      taoSheetDep({
        tieuDeTren: [
          "ĐƠN BNC — THEO BỘ PHẬN",
          `Từ ${tuNgay || "đầu"} đến ${denNgay || "nay"} · ${bang.tong.soDon} đơn`,
        ],
        tieuDe: [
          "STT",
          "Bộ phận",
          "Số đơn",
          "Lít hơi",
          "Lon",
          "Lít quy đổi",
          "Hao hụt (lít)",
          "Đơn chưa xong",
          "Lần nhận cuối",
        ],
        cot: [
          { rong: 6, kieu: "giua" },
          { rong: 26 },
          { rong: 10, kieu: "so" },
          { rong: 12, kieu: "so" },
          { rong: 10, kieu: "so" },
          { rong: 14, kieu: "so" },
          { rong: 14, kieu: "so" },
          { rong: 15, kieu: "so" },
          { rong: 15, kieu: "giua" },
        ],
        hang: bang.theoBoPhan.map((o, i) => [
          i + 1,
          o.boPhan,
          o.soDon,
          lam1(o.soLuongLit),
          o.soLuongLon,
          lam1(o.litQuyDoi),
          lam1(o.haoHut),
          o.donChuaXong,
          o.lanCuoi,
        ]),
        dongTong: [
          "",
          "TỔNG CỘNG",
          bang.tong.soDon,
          lam1(bang.tong.soLuongLit),
          bang.tong.soLuongLon,
          lam1(bang.tong.litQuyDoi),
          lam1(bang.tong.haoHut),
          bang.tong.donChuaXong,
          "",
        ],
      }),
      "Theo bộ phận",
    );

    XLSXDep.utils.book_append_sheet(
      wb,
      taoSheetDep({
        tieuDeTren: [
          "ĐƠN BNC — TỪNG ĐƠN",
          `Từ ${tuNgay || "đầu"} đến ${denNgay || "nay"}`,
        ],
        tieuDe: [
          "STT",
          "Ngày",
          "Bộ phận",
          "Mặt hàng",
          "Lít hơi",
          "Lon",
          "Lít quy đổi",
          "Hao hụt",
          "Trạng thái",
          "Có ảnh",
          "Ghi chú",
        ],
        cot: [
          { rong: 6, kieu: "giua" },
          { rong: 12, kieu: "giua" },
          { rong: 26 },
          { rong: 11, kieu: "so" },
          { rong: 12, kieu: "so" },
          { rong: 10, kieu: "so" },
          { rong: 13, kieu: "so" },
          { rong: 11, kieu: "so" },
          { rong: 16, kieu: "giua" },
          { rong: 9, kieu: "giua" },
          { rong: 44 },
        ],
        hang: bang.don.map((d, i) => [
          i + 1,
          d.ngay,
          d.boPhan,
          d.soMatHang,
          lam1(d.soLuongLit),
          d.soLuongLon,
          lam1(d.litQuyDoi),
          lam1(d.haoHut),
          d.trangThai === "di_duong" ? "Đang đi đường" : "Đã ghi nhận",
          d.coAnh ? "Có" : "Chưa",
          d.ghiChu,
        ]),
      }),
      "Từng đơn",
    );

    XLSXDep.writeFile(wb, `Don BNC ${tuNgay} den ${denNgay}.xlsx`);
  };

  const so = (n: number) => formatNumber(Math.round(n * 10) / 10);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          Hóa đơn xuất cho BNC là một khách hàng duy nhất mã{" "}
          <strong>AD0103</strong>, nên file công nợ chỉ có một dòng "BNC". Màn
          hình này tách ngược lại tới <strong>từng bộ phận</strong> để biết bia
          đi tới quán nào. Một đơn ở đây là một chuyến giao, đúng như tab Đơn đi
          đường.
        </p>
      </div>

      {/* ----- Bộ lọc ----- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Từ ngày
          </span>
          <div className="relative mt-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={tuNgay}
              max={denNgay || undefined}
              onChange={(e) => setTuNgay(e.target.value)}
              className="w-full pl-10 pr-2 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Đến ngày
          </span>
          <input
            type="date"
            value={denNgay}
            min={tuNgay || undefined}
            onChange={(e) => setDenNgay(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
          />
        </label>
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Bộ phận
          </span>
          <select
            value={boPhan}
            onChange={(e) => setBoPhan(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
          >
            <option value="">Tất cả {dsBoPhan.length} bộ phận</option>
            {dsBoPhan.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ----- Tổng ----- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {[
          { nhan: "Số đơn", giaTri: formatNumber(bang.tong.soDon) },
          { nhan: "Bộ phận nhận", giaTri: formatNumber(bang.tong.soBoPhan) },
          { nhan: "Lít hơi", giaTri: so(bang.tong.soLuongLit) },
          { nhan: "Lon", giaTri: formatNumber(bang.tong.soLuongLon) },
          { nhan: "Lít quy đổi", giaTri: so(bang.tong.litQuyDoi) },
        ].map((o) => (
          <div
            key={o.nhan}
            className="p-3 rounded-xl bg-white border border-slate-200"
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {o.nhan}
            </p>
            <p className="text-sm font-black text-slate-900 mt-0.5 tabular-nums">
              {o.giaTri}
            </p>
          </div>
        ))}
      </div>

      {/* ----- Việc còn tồn ----- */}
      {(bang.tong.donChuaXong > 0 ||
        bang.tong.donThieuAnh > 0 ||
        bang.tong.haoHut > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {bang.tong.donChuaXong > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-2">
              <Truck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                <strong>{bang.tong.donChuaXong} đơn</strong> còn đi đường, chờ
                ảnh biên bản
              </p>
            </div>
          )}
          {bang.tong.donThieuAnh > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-rose-800 leading-relaxed">
                <strong>{bang.tong.donThieuAnh} đơn</strong> đã ghi nhận mà
                không có ảnh — thiếu chứng từ
              </p>
            </div>
          )}
          {bang.tong.haoHut > 0 && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                Hao hụt <strong>{so(bang.tong.haoHut)} lít</strong> — không tính
                vào sản lượng giao
              </p>
            </div>
          )}
        </div>
      )}

      {/* ----- Theo bộ phận ----- */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Theo bộ phận · xếp theo sản lượng
          </p>
        </div>
        {bang.theoBoPhan.length === 0 ? (
          <p className="py-10 text-center text-xs font-bold text-slate-400">
            Không có đơn nào của BNC trong khoảng ngày này.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr>
                  {[
                    "Bộ phận",
                    "Đơn",
                    "Lít hơi",
                    "Lon",
                    "Quy đổi",
                    "Hao hụt",
                    "Nhận cuối",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bang.theoBoPhan.map((o) => (
                  <tr
                    key={o.partnerId}
                    className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                  >
                    <td className="px-3 py-1.5 text-slate-900">
                      {o.boPhan}
                      {o.donChuaXong > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black uppercase">
                          {o.donChuaXong} chờ
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {o.soDon}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {so(o.soLuongLit)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatNumber(o.soLuongLon)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {so(o.litQuyDoi)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {o.haoHut > 0 ? so(o.haoHut) : "—"}
                    </td>
                    <td className="px-3 py-1.5">{o.lanCuoi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----- Từng đơn ----- */}
      {bang.don.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Từng đơn · {formatNumber(bang.don.length)} đơn
            </p>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {[
                    "Ngày",
                    "Bộ phận",
                    "Mặt hàng",
                    "Lít hơi",
                    "Lon",
                    "Trạng thái",
                    "Biên bản",
                    "Ghi chú",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bang.don.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                  >
                    <td className="px-3 py-1.5">{d.ngay}</td>
                    <td className="px-3 py-1.5 text-slate-900">{d.boPhan}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {d.soMatHang}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {so(d.soLuongLit)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {d.soLuongLon ? formatNumber(d.soLuongLon) : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1",
                          d.trangThai === "di_duong"
                            ? "bg-amber-100 text-amber-700"
                            : d.coAnh
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700",
                        )}
                      >
                        {d.trangThai === "di_duong" ? (
                          <>
                            <Truck className="w-2.5 h-2.5" /> Đi đường
                          </>
                        ) : d.coAnh ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" /> Đã nhận
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-2.5 h-2.5" /> Thiếu ảnh
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      {d.anh.length > 0 ? (
                        <button
                          onClick={() => setDonDangXem(d)}
                          className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-125 inline-flex items-center gap-1"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Xem {d.anh.length}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 max-w-xs truncate">
                      {d.ghiChu}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/*
        KHUNG XEM ẢNH BIÊN BẢN.

        Ảnh to, giữ nguyên tỉ lệ, mỗi tấm một hàng — đây là tờ giấy viết tay,
        người xem phải đọc được con số trên đó rồi dò với số lượng của đơn.
        Cắt vuông cho gọn thì chữ số ở mép tờ giấy mất luôn.

        Đầu khung ghi lại ngày, bộ phận và số lượng của chính đơn đó, để đối
        chiếu ngay tại chỗ mà không phải nhớ hay cuộn về bảng.
      */}
      {donDangXem && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setDonDangXem(null)}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-black text-slate-900 uppercase leading-tight">
                  Biên bản giao nhận
                </h3>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {donDangXem.ngay} · {donDangXem.boPhan}
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {donDangXem.soMatHang} mặt hàng ·{" "}
                  {donDangXem.soLuongLit > 0
                    ? `${so(donDangXem.soLuongLit)} lít`
                    : ""}
                  {donDangXem.soLuongLit > 0 && donDangXem.soLuongLon > 0
                    ? " · "
                    : ""}
                  {donDangXem.soLuongLon > 0
                    ? `${formatNumber(donDangXem.soLuongLon)} lon`
                    : ""}
                </p>
              </div>
              <button
                onClick={() => setDonDangXem(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 shrink-0"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              {donDangXem.ghiChu && (
                <p className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
                  {donDangXem.ghiChu}
                </p>
              )}
              {donDangXem.anh.map((url, i) => (
                <div
                  key={url}
                  className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <img
                    src={url}
                    alt={`Biên bản ${i + 1}`}
                    /* KHÔNG dùng loading="lazy": người ta bấm mở khung này ra
                       đúng là để xem ảnh ngay, hoãn tải chẳng được gì mà thêm
                       một đường hỏng — đã gặp cảnh ảnh không bao giờ tải. */
                    className="w-full max-h-[70vh] object-contain"
                  />
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-900/70 text-white text-[9px] font-black uppercase tracking-widest">
                    Ảnh {i + 1}/{donDangXem.anh.length}
                  </span>
                  {/* Mở tấm gốc ở tab mới khi cần phóng to đọc chữ nhỏ. */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 px-2.5 py-1.5 rounded-lg bg-white/90 text-slate-700 text-[9px] font-black uppercase tracking-widest hover:bg-white"
                  >
                    Mở ảnh gốc
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <button
        onClick={taiExcel}
        disabled={bang.don.length === 0}
        className="px-5 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" /> Tải Excel ({bang.don.length} đơn)
      </button>
    </div>
  );
}

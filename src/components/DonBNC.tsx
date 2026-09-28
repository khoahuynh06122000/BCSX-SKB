import { useMemo, useState } from "react";
import {
  Building2,
  Download,
  Truck,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import type { Partner, Product, Transaction } from "../types";
import { dungBangBNC, laBoPhanBNC } from "../lib/bnc";
import {
  nhomCuaBoPhan,
  NHOM_BNC,
  phaiChonBoPhan,
  tenNhomBNC,
  type MaNhomBNC,
} from "../lib/nhomBNC";
import { taoSheetDep, XLSXDep } from "../lib/excelDep";
import { ngayVn } from "../lib/soPhieu";
import mauDieuChuyenUrl from "../assets/mau-dieu-chuyen.xlsx?url";
import { dungFileDieuChuyen, tomTatDieuChuyen } from "../lib/dieuChuyen";
import {
  boCalcChainDc,
  boSheetPhu,
  HANG_DAU_DU_LIEU,
  lamDepSheet,
  MUC_BO_DC,
  SHEET_PHU,
  suaSheetVaChuDc,
  tenTepDieuChuyen,
} from "../lib/dieuChuyenXml";
import { themKieuDep } from "../lib/dieuChuyenKieu";
import { docZip, giaiNen, suaXlsx } from "../lib/zipXlsx";
import { cn, formatNumber } from "../lib/utils";

import ONgay from "./ONgay";
import { isoSangVn } from "../lib/oNgay";

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
  /** Lọc theo một trong bốn phần của BNC; rỗng là lấy hết. */
  /*
   * BỐN PHẦN CỦA BNC LÀ BỐN THẺ, không phải một ô lọc.
   *
   * Bốn phần này theo dõi tách bạch: Nội bộ là bia bán trong khu, Ngoại giao
   * là biếu tặng, HTKD là hợp tác kinh doanh, Chi phí khác là phần còn lại.
   * Gộp cả bốn vào một bảng rồi lọc bằng ô chọn thì mở màn hình ra là thấy một
   * bảng trộn đủ thứ — đúng cái "nhìn mà loạn".
   *
   * Mặc định mở Nội bộ: đó là phần đông đơn nhất và là phần duy nhất có việc
   * phải làm tiếp (xuất tệp điều chuyển).
   *
   * KHÔNG CÒN LỰA CHỌN "cả bốn phần": cộng chung bốn phần ra một con số không
   * dùng được vào việc gì — bia biếu tặng và bia bán trong khu không cộng lại
   * với nhau được.
   */
  const [nhom, setNhom] = useState<MaNhomBNC>("NB");
  /** Đơn đang mở khung xem ảnh biên bản; `null` là đang đóng. */

  /*
   * Bộ phận đang bung chi tiết. Mở được NHIỀU cùng lúc — việc thường làm là so
   * hai điểm bán với nhau, mở cái này mà cái kia tự đóng thì phải nhớ số trong
   * đầu rồi bấm qua bấm lại.
   */
  /**
   * Lọc chi tiết RIÊNG CHO TỪNG ĐIỂM BÁN đang mở, tra theo mã bộ phận.
   *
   * Không dùng một bộ lọc chung cho cả bảng: mở hai điểm bán cùng lúc để so
   * với nhau là việc thường làm, mà bộ lọc chung thì soi được một bên là bên
   * kia đổi theo — không so được nữa.
   */
  const [locChiTiet, setLocChiTiet] = useState<
    Record<string, { ngay: string; bia: string }>
  >({});
  const locCua = (id: string) => locChiTiet[id] ?? { ngay: "", bia: "" };
  const datLoc = (id: string, truong: "ngay" | "bia", giaTri: string) =>
    setLocChiTiet((cu) => ({
      ...cu,
      [id]: { ...(cu[id] ?? { ngay: "", bia: "" }), [truong]: giaTri },
    }));

  const [boPhanMo, setBoPhanMo] = useState<Set<string>>(new Set());
  const batBoPhan = (id: string) =>
    setBoPhanMo((cu) => {
      const m = new Set(cu);
      if (m.has(id)) m.delete(id);
      else m.add(id);
      return m;
    });

  /**
   * Bỏ tiền tố "BNC · " khỏi tên bộ phận.
   *
   * Cả bảng này đã nằm trong màn hình Đơn BNC, dưới một thẻ ghi rõ đang xem
   * phần nào — nhắc lại "BNC" ở đầu mỗi dòng chỉ đẩy tên quán lùi vào trong.
   */
  const tenGon = (ten: string) => ten.replace(/^BNC\s*·\s*/i, "").trim();

  const dsBoPhan = useMemo(
    () => partners.filter((p) => laBoPhanBNC(p.id)),
    [partners],
  );

  /**
   * Bộ phận bày trong ô chọn — chỉ những bộ phận thuộc nhóm đang lọc.
   *
   * Lọc nhóm Ngoại giao rồi ô bộ phận vẫn bày cả 17 điểm bán thì chọn vào là ra
   * bảng trống, người xem tưởng mất dữ liệu.
   */
  const boPhanTheoNhom = useMemo(
    () => (nhom ? dsBoPhan.filter((p) => nhomCuaBoPhan(p.id) === nhom) : dsBoPhan),
    [dsBoPhan, nhom],
  );

  const tenBoPhan = useMemo(() => {
    const m = new Map<string, string>();
    dsBoPhan.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [dsBoPhan]);

  /*
   * Ngày giao và tên bia CÓ THẬT trong khoảng đang xem — dựng từ chính dữ liệu
   * chứ không liệt kê cả danh mục. Bày một loại bia chưa hề giao thì chọn vào
   * là ra bảng trống, người xem tưởng mất dữ liệu.
   */
  const bangGoc = useMemo(
    () =>
      dungBangBNC({
        transactions,
        products,
        tuNgay,
        denNgay,
        boPhan,
        nhom,
        tenBoPhan,
      }),
    [transactions, products, tuNgay, denNgay, boPhan, nhom, tenBoPhan],
  );

  const taiExcel = () => {
    /*
     * TỆP XUẤT RA LẤY BẢNG GỐC, không theo hai ô lọc của khối Theo bộ phận.
     *
     * Hai ô đó là cách soi nhanh trên màn hình. Tệp thì luôn là báo cáo đầy đủ
     * của khoảng ngày đang xem — nếu không, sheet "theo bộ phận" bị lọc còn
     * sheet "từng đơn" thì không, và người mở tệp thấy hai sheet không khớp
     * nhau mà không hiểu vì sao.
     */
    const bang = bangGoc;
    if (!bang.don.length) return;
    const wb = XLSXDep.utils.book_new();
    const lam1 = (n: number) => Math.round(n * 10) / 10;

    XLSXDep.utils.book_append_sheet(
      wb,
      taoSheetDep({
        tieuDeTren: [
          "ĐƠN BNC — THEO BỘ PHẬN",
          `Từ ${isoSangVn(tuNgay) || "đầu"} đến ${isoSangVn(denNgay) || "nay"} · ${bang.tong.soDon} đơn`,
        ],
        tieuDe: [
          "STT",
          "Phần",
          "Bộ phận",
          "Số đơn",
          "Lít hơi",
          "Lon",
          "Lít quy đổi",
          "Hao hụt (lít)",
          "Đơn chưa xong",
          "Ngày nhận gần nhất",
        ],
        cot: [
          { rong: 6, kieu: "giua" },
          { rong: 14 },
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
          tenNhomBNC(o.nhom),
          o.boPhan,
          o.soDon,
          lam1(o.soLuongLit),
          o.soLuongLon,
          lam1(o.litQuyDoi),
          lam1(o.haoHut),
          o.donChuaXong,
          o.lanCuoi ? ngayVn(o.lanCuoi) : "",
        ]),
        dongTong: [
          "",
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
          `Từ ${isoSangVn(tuNgay) || "đầu"} đến ${isoSangVn(denNgay) || "nay"}`,
        ],
        tieuDe: [
          "STT",
          "Ngày",
          "Phần",
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
          { rong: 14 },
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
          isoSangVn(d.ngay) || d.ngay,
          tenNhomBNC(d.nhom),
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

  const bang = bangGoc;

  const so = (n: number) => formatNumber(Math.round(n * 10) / 10);

  /**
   * Dữ liệu tệp điều chuyển của phần NỘI BỘ trong khoảng ngày đang xem.
   *
   * Luôn tính theo phần Nội bộ, bất kể ô lọc "Phần của BNC" đang chọn gì: ba
   * phần còn lại không có kho riêng nên không điều chuyển. Nhưng VẪN tôn trọng
   * ô lọc bộ phận, để xuất riêng một điểm bán khi cần.
   */
  const tepDieuChuyen = useMemo(
    () =>
      dungFileDieuChuyen({
        transactions,
        products,
        tuNgay,
        denNgay,
        boPhan: nhomCuaBoPhan(boPhan) === "NB" ? boPhan : "",
        tenBoPhan,
      }),
    [transactions, products, tuNgay, denNgay, boPhan, tenBoPhan],
  );

  const [dangTaiDc, setDangTaiDc] = useState(false);

  /**
   * Tải tệp điều chuyển: mở ĐÚNG TỆP MẪU của bộ phận ra, chỉ điền dữ liệu.
   *
   * Nhờ vậy toàn bộ định dạng của tệp mẫu đi theo tệp xuất ra, không phải dựng
   * lại. Hai sheet hướng dẫn thì bỏ, và phần nhìn được chỉnh cho gọn — xem
   * `boSheetPhu` và `lamDepSheet`.
   */
  const taiTepDieuChuyen = async () => {
    if (dangTaiDc) return;
    const f = tepDieuChuyen;
    if (!f.dong.length) {
      alert(`Không có dòng nào để điều chuyển.

${tomTatDieuChuyen(f)}`);
      return;
    }
    // Có điểm bán bị giữ lại thì HỎI trước khi tải: tệp thiếu mà không ai nói
    // thì người dùng nạp lên rồi tưởng đã chuyển hết.
    if (f.thieuMaKho.length || f.thieuMaVatTu.length) {
      const ok = window.confirm(
        `${tomTatDieuChuyen(f)}

Những dòng bị giữ lại KHÔNG có trong tệp. Vẫn tải tệp cho phần còn lại?`,
      );
      if (!ok) return;
    }

    setDangTaiDc(true);
    try {
      const goc = new Uint8Array(
        await (await fetch(mauDieuChuyenUrl)).arrayBuffer(),
      );
      const muc = docZip(goc);
      const doc = async (ten: string) => {
        const m = muc.find((x) => x.ten === ten);
        if (!m) throw new Error(`Tệp mẫu thiếu ${ten}`);
        return new TextDecoder().decode(await giaiNen(m));
      };

      // Thêm bộ kiểu riêng vào bảng kiểu trước, rồi mới dùng chỉ số kiểu đó.
      const { stylesXml, kieu } = themKieuDep(await doc("xl/styles.xml"));
      const { sheetXml, chuXml } = suaSheetVaChuDc(
        await doc("xl/worksheets/sheet1.xml"),
        await doc("xl/sharedStrings.xml"),
        f.oDong,
        kieu,
        f.toNen,
      );
      const boCC = boCalcChainDc(
        await doc("[Content_Types].xml"),
        await doc("xl/_rels/workbook.xml.rels"),
      );
      // Bỏ hai sheet hướng dẫn rồi mới chỉnh phần nhìn của sheet dữ liệu.
      const bo = boSheetPhu(
        await doc("xl/workbook.xml"),
        boCC.rels,
        boCC.contentTypes,
        await doc("docProps/app.xml"),
        HANG_DAU_DU_LIEU + f.oDong.length - 1,
      );

      const blob = await suaXlsx(
        goc,
        {
          "xl/worksheets/sheet1.xml": lamDepSheet(sheetXml, kieu),
          "xl/styles.xml": stylesXml,
          "xl/sharedStrings.xml": chuXml,
          "xl/workbook.xml": bo.workbookXml,
          "docProps/app.xml": bo.appXml,
          "[Content_Types].xml": bo.contentTypes,
          "xl/_rels/workbook.xml.rels": bo.relsXml,
        },
        [...MUC_BO_DC, ...SHEET_PHU],
      );

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = tenTepDieuChuyen(tuNgay, denNgay);
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(
        `Không tạo được tệp điều chuyển: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDangTaiDc(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          Hóa đơn xuất cho BNC là một khách hàng duy nhất mã{" "}
          <strong>AD0103</strong>, nên file công nợ chỉ có một dòng "BNC". Màn
          hình này tách ngược lại: BNC chia{" "}
          <strong>bốn phần — Nội bộ, Ngoại giao, HTKD, Chi phí khác</strong>,
          trong đó Nội bộ tách tiếp tới từng điểm bán để biết bia đi tới quán
          nào. Một đơn ở đây là một chuyến giao, đúng như tab Đơn đi đường.
        </p>
      </div>

      {/*
        BỐN THẺ ĐỨNG TRƯỚC BỘ LỌC NGÀY.

        Thứ tự đọc đúng với thứ tự nghĩ: chọn đang xem phần nào của BNC trước,
        rồi mới khoanh khoảng ngày trong phần đó. Đặt bộ lọc lên trên thì người
        dùng chọn ngày xong mới phát hiện mình đang ở nhầm phần, phải làm lại
        từ đầu — mà đổi thẻ còn xoá luôn điểm bán đang lọc.
      */}
      {/* ----- Bốn thẻ theo dõi riêng ----- */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/60 rounded-2xl border border-slate-200/60 w-fit">
        {NHOM_BNC.map((n) => (
          <button
            key={n.ma}
            onClick={() => {
              // Đổi thẻ thì bỏ điểm bán đang lọc: điểm bán cũ thuộc thẻ khác,
              // để lại là ra bảng trống mà không hiểu vì sao.
              setNhom(n.ma);
              setBoPhan("");
            }}
            className={cn(
              "px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
              nhom === n.ma
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "text-slate-500 hover:text-slate-900 hover:bg-white",
            )}
            title={n.moTa}
          >
            {n.ten}
          </button>
        ))}
      </div>

      {/* ----- Bộ lọc ----- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Từ ngày
          </span>
          <div className="relative mt-1">
            <ONgay
              value={tuNgay}
              max={denNgay || undefined}
              onChange={(v: string) => setTuNgay(v)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Đến ngày
          </span>
          <ONgay
            value={denNgay}
            min={tuNgay || undefined}
            onChange={(v: string) => setDenNgay(v)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
          />
        </label>
        {/*
          Ô CHỌN ĐIỂM BÁN CHỈ CÓ Ở NỘI BỘ.

          Ba phần kia mỗi phần đúng MỘT bộ phận (`boPhan` khai sẵn trong
          `NHOM_BNC`), nên một ô chọn chỉ có một dòng là ô vô nghĩa.
        */}
        {phaiChonBoPhan(nhom) && (
          <label className="block sm:col-span-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Điểm bán
            </span>
            <select
              value={boPhan}
              onChange={(e) => setBoPhan(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
            >
              <option value="">
                Tất cả {boPhanTheoNhom.length} điểm bán
              </option>
              {boPhanTheoNhom.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
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

      {/*
        BẢNG "Bốn phần của BNC" ĐÃ BỎ (28/09/2026).

        Nó là bảng tổng bốn dòng, mỗi dòng một phần, bấm vào để lọc. Từ khi bốn
        phần thành bốn thẻ ngay đầu màn hình thì nó chỉ còn nói lại đúng thứ
        thanh thẻ đã nói, và cái nút bấm-để-lọc thành đường thứ hai làm cùng
        một việc.
      */}

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
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-3 py-2 w-9" />
                  {[
                    "Bộ phận",
                    "Bia lít",
                    "Bia lon",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400",
                        i > 0 && "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bang.theoBoPhan.map((o) => {
                  const mo = boPhanMo.has(o.partnerId);
                  return [
                    <tr
                      key={o.partnerId}
                      className={cn(
                        "border-t border-slate-100 text-[12px] font-bold text-slate-600 hover:bg-slate-50/70 transition-colors",
                        mo && "bg-slate-50",
                      )}
                    >
                      <td className="pl-3 pr-1 py-2">
                        <button
                          onClick={() => batBoPhan(o.partnerId)}
                          title={mo ? "Thu lại" : "Xem từng lần nhận"}
                          className="p-1 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
                        >
                          <ChevronRight
                            className={cn(
                              "w-4 h-4 transition-transform",
                              mo && "rotate-90",
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-slate-900">
                        {tenGon(o.boPhan)}
                        {o.donChuaXong > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-black uppercase">
                            {o.donChuaXong} chờ
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-black">
                        {o.soLuongLit > 0 ? so(o.soLuongLit) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-black">
                        {o.soLuongLon > 0 ? formatNumber(o.soLuongLon) : "—"}
                      </td>
                    </tr>,

                    mo &&
                      (() => {
                        /*
                          BỘ LỌC NẰM TRONG CHI TIẾT CỦA TỪNG ĐIỂM BÁN.

                          Mỗi điểm bán một bộ lọc riêng: mở hai điểm bán cùng
                          lúc để so với nhau là việc thường làm, mà một bộ lọc
                          dùng chung thì soi được một bên là bên kia đổi theo.

                          Danh sách chọn dựng từ chính chi tiết của điểm bán
                          này — bày một loại bia nó chưa hề nhận thì chọn vào là
                          ra bảng trống.
                        */
                        const l = locCua(o.partnerId);
                        const dsNgay = Array.from(
                          new Set(o.chiTiet.map((c) => c.ngay)),
                        ).sort((a, b) => b.localeCompare(a));
                        const dsBia = Array.from(
                          new Set(o.chiTiet.map((c) => c.tenHang)),
                        ).sort((a, b) => a.localeCompare(b));
                        const ds = o.chiTiet.filter(
                          (c) =>
                            (!l.ngay || c.ngay === l.ngay) &&
                            (!l.bia || c.tenHang === l.bia),
                        );

                        return (
                          <tr
                            key={`${o.partnerId}-ct`}
                            className="bg-slate-50/60"
                          >
                            <td />
                            <td colSpan={3} className="px-3 pb-3">
                              {o.chiTiet.length === 0 ? (
                                <p className="py-3 text-[12px] font-bold text-slate-400">
                                  Không có lần nhận nào trong khoảng ngày này.
                                </p>
                              ) : (
                                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                  <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                    <label className="block">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        Ngày giao
                                      </span>
                                      <select
                                        value={l.ngay}
                                        onChange={(e) =>
                                          datLoc(
                                            o.partnerId,
                                            "ngay",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900"
                                      >
                                        <option value="">
                                          Tất cả {dsNgay.length} ngày
                                        </option>
                                        {dsNgay.map((n) => (
                                          <option key={n} value={n}>
                                            {ngayVn(n)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="block">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        Tên bia
                                      </span>
                                      <select
                                        value={l.bia}
                                        onChange={(e) =>
                                          datLoc(
                                            o.partnerId,
                                            "bia",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900"
                                      >
                                        <option value="">
                                          Tất cả {dsBia.length} loại bia
                                        </option>
                                        {dsBia.map((t) => (
                                          <option key={t} value={t}>
                                            {t}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    {(l.ngay || l.bia) && (
                                      <button
                                        onClick={() =>
                                          setLocChiTiet((cu) => ({
                                            ...cu,
                                            [o.partnerId]: {
                                              ngay: "",
                                              bia: "",
                                            },
                                          }))
                                        }
                                        className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                                      >
                                        Bỏ lọc
                                      </button>
                                    )}
                                  </div>

                                  {ds.length === 0 ? (
                                    <p className="py-6 text-center text-[12px] font-bold text-slate-400">
                                      Không có lần nhận nào khớp bộ lọc.
                                    </p>
                                  ) : (
                                    <table className="w-full text-left text-[12px] font-bold text-slate-600">
                                      <thead className="bg-slate-50">
                                        <tr>
                                          {[
                                            "Ngày giao",
                                            "Tên bia",
                                            "Số lượng",
                                            "Đơn vị tính",
                                          ].map((h, i) => (
                                            <th
                                              key={h}
                                              className={cn(
                                                "px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200",
                                                i === 2 && "text-right",
                                              )}
                                            >
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {ds.map((c, i) => (
                                          <tr
                                            key={`${c.ngay}-${c.tenHang}-${i}`}
                                            className="border-t border-slate-100"
                                          >
                                            <td className="px-3 py-2 font-mono whitespace-nowrap">
                                              {ngayVn(c.ngay)}
                                            </td>
                                            <td className="px-3 py-2 text-slate-900">
                                              {c.tenHang}
                                            </td>
                                            {/* Số đứng một mình trong ô của nó,
                                                đơn vị sang cột riêng — số nào
                                                cũng kết thúc ở cùng một mép thì
                                                đọc cột dọc mới nhanh. */}
                                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-slate-900">
                                              {c.dvt === "Lon"
                                                ? formatNumber(c.soLuong)
                                                : so(c.soLuong)}
                                            </td>
                                            <td className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase whitespace-nowrap">
                                              {c.dvt}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })(),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/*
        BẢNG "TỪNG ĐƠN" ĐÃ BỎ (28/09/2026), theo yêu cầu của Khoa.

        Nó liệt kê từng chuyến giao với ngày, bộ phận, số lượng và trạng thái.
        Từ khi bảng Theo bộ phận bung ra được từng lần nhận — ngày, loại bia,
        số lượng, giữ nguyên từng giao dịch — thì nó nói lại đúng cùng một
        chuyện, chỉ khác cách xếp.

        Khung xem ảnh biên bản đi theo nó: đó là đường DUY NHẤT mở khung ấy.
        Ảnh biên bản vẫn xem được đầy đủ ở Thư viện ảnh, lọc theo chiều xuất.
      */}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={taiExcel}
          disabled={bang.don.length === 0}
          className="px-5 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Tải Excel ({bang.don.length} đơn)
        </button>

        {/*
          TỆP ĐIỀU CHUYỂN CHỈ THUỘC THẺ NỘI BỘ.

          Ba phần còn lại của BNC không có kho riêng nên không điều chuyển được.
          Trước đây nút vẫn hiện ở mọi phần — lý do lúc đó là "ẩn đi thì người
          đang lọc Ngoại giao tưởng app không có chức năng này". Nay bốn phần
          thành bốn thẻ tách bạch, nút nằm đúng thẻ của nó là rõ nghĩa hơn: ở
          thẻ Ngoại giao mà thấy nút "File điều chuyển · Nội bộ" mới là thứ khó
          hiểu.
        */}
        {nhom === "NB" && (
        <button
          onClick={taiTepDieuChuyen}
          disabled={dangTaiDc || tepDieuChuyen.dong.length === 0}
          title={
            tepDieuChuyen.dong.length === 0
              ? tomTatDieuChuyen(tepDieuChuyen)
              : `Điều chuyển bia về kho từng điểm bán · ${tomTatDieuChuyen(tepDieuChuyen)}`
          }
          className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Truck className="w-4 h-4" /> File điều chuyển (
          {tepDieuChuyen.dong.length} dòng)
        </button>
        )}
      </div>

      {/*
        Điểm bán bị giữ lại phải hiện NGAY CẠNH nút, không đợi bấm mới biết:
        thiếu mã kho là thiếu vĩnh viễn cho tới khi bộ phận cấp mã, mà tệp xuất
        ra thì trông vẫn bình thường.
      */}
      {nhom === "NB" && tepDieuChuyen.ngoaiNoiBo.length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex gap-2 items-start">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="text-[11px] font-bold text-slate-500 leading-relaxed">
            <p>
              Không điều chuyển vì không thuộc phần Nội bộ — đúng theo thiết kế,
              nhưng nói ra để khỏi tưởng app bỏ sót:
            </p>
            <ul className="mt-1 space-y-0.5">
              {tepDieuChuyen.ngoaiNoiBo.map((o) => (
                <li key={o.ten}>
                  · <strong>{o.ten}</strong> — {o.soDong} dòng, {so(o.soLuong)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {nhom === "NB" &&
        (tepDieuChuyen.thieuMaKho.length > 0 ||
          tepDieuChuyen.thieuMaVatTu.length > 0) && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] font-bold text-amber-800 leading-relaxed">
            <p>Không điều chuyển được, đã giữ lại ngoài tệp:</p>
            <ul className="mt-1 space-y-0.5">
              {tepDieuChuyen.thieuMaKho.map((o) => (
                <li key={o.ten}>
                  · <strong>{o.ten}</strong> — chưa có mã kho nhận hàng ·{" "}
                  {o.soDong} dòng, {so(o.soLuong)}
                </li>
              ))}
              {tepDieuChuyen.thieuMaVatTu.map((o) => (
                <li key={o.ten}>
                  · <strong>{o.ten}</strong> — chưa có mã vật tư · {o.soDong}{" "}
                  dòng, {so(o.soLuong)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

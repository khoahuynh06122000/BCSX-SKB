import { useMemo, useState } from "react";
import {
  Building2,
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
import {
  nhomCuaBoPhan,
  NHOM_BNC,
  phaiChonBoPhan,
  tenNhomBNC,
  type MaNhomBNC,
} from "../lib/nhomBNC";
import { taoSheetDep, XLSXDep } from "../lib/excelDep";
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
  const [donDangXem, setDonDangXem] = useState<DonBNCType | null>(null);

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

  const bang = useMemo(
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
          "Lần nhận cuối",
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
          o.lanCuoi,
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

      {/* ----- Theo bốn phần của BNC ----- */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Bốn phần của BNC
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                {["Phần", "Bộ phận", "Đơn", "Lít hơi", "Lon", "Quy đổi", "Hao hụt"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {bang.theoNhom.map((n) => {
                /*
                  Bấm vào một phần là lọc luôn — bảng bốn dòng thì thao tác tự
                  nhiên nhất là bấm thẳng vào dòng, không phải kéo lên ô chọn.
                  Bấm lại vào phần đang lọc thì bỏ lọc.
                */
                const dangLoc = nhom === n.nhom;
                return (
                  <tr
                    key={n.nhom}
                    onClick={() => {
                      // Bấm một dòng là SANG thẻ đó. Trước đây bấm lại để
                      // bỏ lọc, nhưng nay bốn phần là bốn thẻ — không có
                      // trạng thái "không thẻ nào".
                      setNhom(n.nhom);
                      setBoPhan("");
                    }}
                    className={cn(
                      "border-t border-slate-100 text-[11px] font-bold cursor-pointer",
                      dangLoc
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <td
                      className={cn(
                        "px-3 py-1.5 font-black",
                        dangLoc ? "text-white" : "text-slate-900",
                      )}
                    >
                      {n.ten}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatNumber(n.soBoPhan)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatNumber(n.soDon)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right tabular-nums",
                        dangLoc ? "text-white" : "text-slate-900",
                      )}
                    >
                      {so(n.soLuongLit)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatNumber(n.soLuongLon)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right tabular-nums",
                        dangLoc ? "text-white" : "text-slate-900",
                      )}
                    >
                      {so(n.litQuyDoi)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {n.haoHut > 0 ? so(n.haoHut) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                    "Phần",
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
                    <td className="px-3 py-1.5 text-slate-400">
                      {tenNhomBNC(o.nhom)}
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
                    <td className="px-3 py-1.5">{isoSangVn(d.ngay) || d.ngay}</td>
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
                  {isoSangVn(donDangXem.ngay) || donDangXem.ngay} ·{" "}
                  {donDangXem.boPhan}
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

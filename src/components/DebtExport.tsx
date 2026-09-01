import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Receipt,
  AlertTriangle,
  Calculator,
  Plus,
  Trash2,
  CalendarRange,
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction, Product, Partner } from "../types";
import { PRICE_TABLE, invoiceUnitOf } from "../lib/invoice";
import {
  dungBangCongNo,
  nhanNgayGiao,
  type DongCongNo,
  type DotChot,
} from "../lib/congNo";
import {
  dongCanDienHoaDon,
  bangHoaDon,
  type HoaDonGhiNhan,
} from "../lib/hoaDon";
import { stableHash } from "../lib/hash";
import { taoWorkbookCongNo } from "../lib/congNoExcel";
// Ghi bang XLSXDep chu khong phai `xlsx`: dung `xlsx` thi workbook da gan dinh
// dang van bi ghi ra trang tron, vi ban cong dong khong ghi thuoc tinh `s`.
import { XLSXDep } from "../lib/excelDep";
import {
  CAU_HINH_MAC_DINH,
  dungTepSap,
  kiemCanChungTu,
  type CauHinhSap,
  type DongHangSap,
} from "../lib/sapTemplate";
import duongTepMauSap from "../assets/mau-template-sap.xlsx?url";
import {
  boCalcChain,
  MUC_BO,
  suaSheetVaChu,
} from "../lib/sapTemplateXml";
import { docZip, giaiNen, suaXlsx } from "../lib/zipXlsx";
import { cn, formatNumber } from "../lib/utils";

/**
 * CÔNG NỢ · HÓA ĐƠN
 *
 * Dựng đúng sheet "Chốt" của file công nợ tháng — xem `src/lib/congNo.ts` để
 * biết từng quy tắc lấy ra từ đâu trong file thật.
 *
 * Màn hình này làm hai việc, và việc thứ hai mới là việc chính:
 *
 *   1. Kết xuất file để phát hành hóa đơn.
 *   2. THEO DÕI: đợt nào đã chốt bao nhiêu, đơn vị nào nợ bao nhiêu, và quan
 *      trọng nhất — có bia nào đã giao mà rơi ra ngoài mọi đợt không. Đó là
 *      loại sai sót không ai phát hiện ra cho tới lúc đối chiếu cuối năm.
 *
 * ĐỢT CHỐT LƯU TRÊN MÁY NÀY (localStorage), không lưu lên hệ thống. Đợt là
 * lịch phát hành hóa đơn của kế toán, một người giữ; đẩy lên Firestore thì
 * phải thêm collection, thêm quyền, thêm một chỗ nữa để lệch nhau. Đổi máy
 * thì khai lại — mất chừng một phút.
 */

interface Props {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  /** Hóa đơn đã phát hành, do người dùng điền lại. */
  hoaDon: HoaDonGhiNhan[];
  onSaveHoaDon: (ds: HoaDonGhiNhan[]) => Promise<void>;
}

/*
 * Cột nào canh phải, theo chỉ số của bảng 13 cột TRÊN MÀN HÌNH (không phải 18
 * cột của tệp):
 *
 *   0 STT · 1 Mã vật tư · 2 Tên hàng hóa · 3 ĐVT · 4 Số lượng
 *   5..8  Đơn giá / Thành tiền / VAT / Sau thuế — chặng SKB → DNC
 *   9..12 Đơn giá / Thành tiền / VAT / Sau thuế — chặng DNC → ĐVTV
 */
const COT_SO = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const KHOA_LUU = "bcsx.congno.dot";
const KHOA_LUU_SO = "bcsx.congno.sohoadon";

function dotMacDinh(): DotChot[] {
  const now = new Date();
  const dau = new Date(now.getFullYear(), now.getMonth(), 1);
  return [
    {
      id: "d1",
      tuNgay: format(dau, "yyyy-MM-dd"),
      denNgay: format(now, "yyyy-MM-dd"),
      ngayHoaDon: format(now, "yyyy-MM-dd"),
    },
  ];
}

function docDotDaLuu(): DotChot[] {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    if (!raw) return dotMacDinh();
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || v.length === 0) return dotMacDinh();
    return v.filter(
      (d) => d && d.id && d.tuNgay && d.denNgay && d.ngayHoaDon,
    ) as DotChot[];
  } catch {
    return dotMacDinh();
  }
}

export default function DebtExport({
  transactions,
  products,
  partners,
  hoaDon,
  onSaveHoaDon,
}: Props) {
  const [dot, setDot] = useState<DotChot[]>(docDotDaLuu);
  const [tienTo, setTienTo] = useState("C26TKB#");
  /** Đang dựng tệp TEMPLATE. Chặn bấm hai lần vì phải tải tệp mẫu về trước. */
  const [dangTaiSap, setDangTaiSap] = useState(false);
  const [soBatDau, setSoBatDau] = useState<number>(() => {
    const v = Number(localStorage.getItem(KHOA_LUU_SO));
    return Number.isFinite(v) && v > 0 ? v : 1;
  });

  useEffect(() => {
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(dot));
    } catch {
      /* hết chỗ lưu thì thôi, không chặn việc kết xuất */
    }
  }, [dot]);

  /** Số hóa đơn thật đã lưu, tra theo `<tuNgay>|<denNgay>|<maBp>`. */
  const hoaDonThat = useMemo(() => {
    const m = new Map<string, { soHoaDon: string; ngayHoaDon: string }>();
    hoaDon.forEach((h) => {
      if (!h.soHoaDon) return;
      m.set([h.tuNgay, h.denNgay, h.maBp].join("|"), {
        soHoaDon: h.soHoaDon,
        ngayHoaDon: h.ngayHoaDon,
      });
    });
    return m;
  }, [hoaDon]);

  const bang = useMemo(
    () =>
      dungBangCongNo({
        transactions,
        products,
        partners,
        dot,
        tienToHoaDon: tienTo,
        soHoaDonBatDau: soBatDau,
        hoaDonThat,
      }),
    [transactions, products, partners, dot, tienTo, soBatDau, hoaDonThat],
  );

  /*
   * Danh sách hóa đơn cần điền: mỗi (đợt × đơn vị) một dòng.
   *
   * Kèm tổng tiền để người điền đối chiếu với tờ hóa đơn đang cầm trước khi gõ
   * số vào — gõ nhầm số sang đơn vị khác thì đối chiếu thuế sau này mới lộ.
   */
  /**
   * Gom các dòng của cùng MỘT hóa đơn lại thành một khối.
   *
   * Sheet "Chốt" lặp lại năm cột trên từng dòng — ngày giao, ngày hóa đơn, đơn
   * vị, số hóa đơn, mã BP — vì Excel không có cách nào khác. Trên màn hình thì
   * không cần: năm cột ấy giống hệt nhau trong cả một hóa đơn, mà chúng ăn gần
   * một nửa bề ngang và đẩy khối giá chặng DNC ra ngoài màn hình.
   *
   * Đưa năm cột đó lên một dải đầu khối, bảng còn 13 cột và vừa màn hình, không
   * phải kéo ngang lần nào. TỆP TẢI VỀ KHÔNG ĐỔI — vẫn đúng 18 cột phẳng như
   * file bộ phận.
   *
   * Gom theo dòng LIỀN KỀ chứ không gom bằng Map: bảng đã xếp sẵn theo đợt rồi
   * tới đơn vị, gom bằng Map sẽ kéo hai đợt cách xa nhau về chung một khối và
   * hỏng thứ tự file gốc.
   */
  const khoiHoaDon = useMemo(() => {
    const ra: { khoa: string; dau: DongCongNo; dong: DongCongNo[] }[] = [];
    bang.dong.forEach((d) => {
      const khoa = `${d.ngayGiaoBia}|${d.maBp || d.donVi}|${d.soHoaDon}`;
      const cuoi = ra[ra.length - 1];
      if (cuoi && cuoi.khoa === khoa) cuoi.dong.push(d);
      else ra.push({ khoa, dau: d, dong: [d] });
    });
    return ra;
  }, [bang.dong]);

  const daGhi = useMemo(() => bangHoaDon(hoaDon), [hoaDon]);
  const canDien = useMemo(
    () =>
      dongCanDienHoaDon(
        bang.dong,
        dot.map((d) => ({
          tuNgay: d.tuNgay,
          denNgay: d.denNgay,
          nhan: nhanNgayGiao(d.tuNgay, d.denNgay),
        })),
        daGhi,
        stableHash,
      ),
    [bang.dong, dot, daGhi],
  );

  /** Chữ đang gõ trong bảng, chưa bấm lưu. */
  const [nhap, setNhap] = useState<
    Record<string, { soHoaDon: string; ngayHoaDon: string }>
  >({});
  const [dangLuu, setDangLuu] = useState(false);

  const oCuaDong = (d: (typeof canDien)[0]) =>
    nhap[d.khoa] ?? { soHoaDon: d.soDaGhi, ngayHoaDon: d.ngayDaGhi };

  const suaO = (
    khoa: string,
    truong: "soHoaDon" | "ngayHoaDon",
    giaTri: string,
    d: (typeof canDien)[0],
  ) =>
    setNhap((t) => ({
      ...t,
      [khoa]: { ...oCuaDongTrong(t, d), [truong]: giaTri },
    }));

  const oCuaDongTrong = (
    t: Record<string, { soHoaDon: string; ngayHoaDon: string }>,
    d: (typeof canDien)[0],
  ) => t[d.khoa] ?? { soHoaDon: d.soDaGhi, ngayHoaDon: d.ngayDaGhi };

  /** Điền sẵn số app gợi ý vào những ô còn trống, chạy tuần tự. */
  const dienGoiY = () => {
    const t = { ...nhap };
    canDien.forEach((d) => {
      const o = oCuaDongTrong(t, d);
      if (!o.soHoaDon.trim()) {
        t[d.khoa] = {
          soHoaDon: d.soGoiY,
          ngayHoaDon: o.ngayHoaDon || d.denNgay,
        };
      }
    });
    setNhap(t);
  };

  const luuHoaDon = async () => {
    const ds: HoaDonGhiNhan[] = canDien
      .map((d) => {
        const o = oCuaDong(d);
        return { d, o };
      })
      .filter(({ d, o }) => {
        const doi =
          o.soHoaDon.trim() !== d.soDaGhi ||
          (o.ngayHoaDon || "") !== d.ngayDaGhi;
        return doi && o.soHoaDon.trim();
      })
      .map(({ d, o }) => ({
        id: d.khoa,
        tuNgay: d.tuNgay,
        denNgay: d.denNgay,
        maBp: d.maBp,
        donVi: d.donVi,
        soHoaDon: o.soHoaDon.trim(),
        ngayHoaDon: o.ngayHoaDon || d.denNgay,
      }));

    if (!ds.length) {
      alert("Không có ô nào thay đổi.");
      return;
    }
    setDangLuu(true);
    try {
      await onSaveHoaDon(ds);
      setNhap({});
    } finally {
      setDangLuu(false);
    }
  };

  const themDot = () => {
    const cuoi = dot[dot.length - 1];
    const sau = cuoi
      ? format(
          new Date(new Date(cuoi.denNgay + "T00:00:00").getTime() + 86400000),
          "yyyy-MM-dd",
        )
      : format(new Date(), "yyyy-MM-dd");
    setDot([
      ...dot,
      {
        id: `d${Date.now()}`,
        tuNgay: sau,
        denNgay: sau,
        ngayHoaDon: sau,
      },
    ]);
  };

  const suaDot = (id: string, truong: keyof DotChot, giaTri: string) =>
    setDot(dot.map((d) => (d.id === id ? { ...d, [truong]: giaTri } : d)));

  const xoaDot = (id: string) => setDot(dot.filter((d) => d.id !== id));

  const handleDownload = () => {
    if (!bang.dong.length) return;
    const matHang = products
      .filter((p) => p.materialCode)
      .map((p) => ({
        maVatTu: p.materialCode as string,
        ten: p.name,
        dvt: invoiceUnitOf(p.category),
      }));
    // Danh mục đơn vị cho sheet "Đơn giá": mỗi mã SAP một dòng, vì 20 bộ phận
    // BNC dùng chung một mã và hóa đơn chỉ biết mã.
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

    const wb = taoWorkbookCongNo(bang, matHang, donVi);
    const dauKy = dot.reduce((a, d) => (d.tuNgay < a ? d.tuNgay : a), dot[0].tuNgay);
    XLSXDep.writeFile(wb, `Cong no ${format(new Date(dauKy + "T00:00:00"), "MM.yyyy")}.xlsx`);
    // Số hóa đơn kế tiếp nhớ lại cho lần sau, khỏi phải tra sổ.
    try {
      localStorage.setItem(KHOA_LUU_SO, String(bang.soHoaDonTiepTheo));
    } catch {
      /* không lưu được thì kế toán tự điền */
    }
  };

  /* -------- Tệp TEMPLATE để xuất hóa đơn trên hệ thống khác -------- */

  const [ngayChungTu, setNgayChungTu] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [cauHinhSap, setCauHinhSap] = useState<CauHinhSap>(CAU_HINH_MAC_DINH);
  const [moCauHinh, setMoCauHinh] = useState(false);

  /*
   * Dòng hàng cho tệp TEMPLATE, lấy thẳng từ bảng Chốt.
   *
   * Không tính lại tiền: bảng Chốt đã là số đi phát hành hóa đơn, nên hai tệp
   * bắt buộc phải khớp nhau từng đồng. Tính lại ở đây là mở đường cho hai con
   * số khác nhau cùng nói về một lần bán.
   */
  const tepSap = useMemo(() => {
    const dong: DongHangSap[] = bang.dong.map((r) => ({
      khoaDot: r.ngayGiaoBia,
      maBp: r.maBp,
      donVi: r.donVi,
      tenHangHoa: r.tenHangHoa,
      dvt: r.dvt,
      soLuong: r.soLuong,
      thanhTien: r.thanhTienSkb,
    }));
    return dungTepSap({ dong, ngayChungTu, cauHinh: cauHinhSap });
  }, [bang.dong, ngayChungTu, cauHinhSap]);

  /**
   * Tải tệp TEMPLATE: mở ĐÚNG TỆP MẪU của bộ phận ra, chỉ điền dữ liệu vào.
   *
   * Không tự dựng lại tệp bằng thư viện Excel nữa. Thư viện bỏ hết những ô
   * trống mà có kẻ viền — tệp mẫu 117 cột thì phần lớn là ô như thế — nên tệp
   * dựng lại mất gần hết định dạng. Mở tệp mẫu ra sửa thì kẻ ô, tô màu, gộp ô,
   * ghi chú, vùng in, tên sheet đều còn nguyên xi.
   */
  const taiTepSap = async () => {
    if (!tepSap.oDong.length || dangTaiSap) return;
    const lech = kiemCanChungTu(tepSap);
    if (lech.length) {
      alert(
        `Có ${lech.length} chứng từ không cân (Nợ khác Có). Không tải xuống để tránh hệ thống bên kia từ chối cả tệp.`,
      );
      return;
    }
    setDangTaiSap(true);
    try {
      const goc = new Uint8Array(
        await (await fetch(duongTepMauSap)).arrayBuffer(),
      );
      const muc = docZip(goc);
      const doc = async (ten: string) => {
        const m = muc.find((x) => x.ten === ten);
        if (!m) throw new Error(`Tệp mẫu thiếu ${ten}`);
        return new TextDecoder().decode(await giaiNen(m));
      };

      const { sheetXml, chuXml } = suaSheetVaChu(
        await doc("xl/worksheets/sheet1.xml"),
        await doc("xl/sharedStrings.xml"),
        tepSap,
      );
      const boCC = boCalcChain(
        await doc("[Content_Types].xml"),
        await doc("xl/_rels/workbook.xml.rels"),
      );

      const blob = await suaXlsx(
        goc,
        {
          "xl/worksheets/sheet1.xml": sheetXml,
          "xl/sharedStrings.xml": chuXml,
          "[Content_Types].xml": boCC.contentTypes,
          "xl/_rels/workbook.xml.rels": boCC.rels,
        },
        MUC_BO,
      );

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `TEMPLATE xuat hoa don ${ngayChungTu}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(
        `Không tạo được tệp TEMPLATE: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDangTaiSap(false);
    }
  };

  const suaCauHinh = (truong: keyof CauHinhSap, giaTri: string) =>
    setCauHinhSap((c) => ({ ...c, [truong]: giaTri }));

  const tien = (n: number) => formatNumber(Math.round(n));
  const nghiemTrong = (loai: string) =>
    loai === "ngoai_dot" || loai === "thieu_ma_vat_tu" || loai === "thieu_ma_bp";

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <Receipt className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          Dựng đúng sheet <strong>Chốt</strong> của file công nợ tháng: 18 cột,
          hai chặng giá cạnh nhau, một số hóa đơn cho mỗi{" "}
          <strong>đợt × đơn vị</strong>. Hai mươi bộ phận BNC gộp về một dòng
          theo mã BP <strong>AD0103</strong>, vì hóa đơn xuất cho pháp nhân chứ
          không xuất cho từng quán.
        </p>
      </div>

      {/* ----- Đợt chốt ----- */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Đợt chốt hóa đơn
            </p>
          </div>
          <button
            onClick={themDot}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Thêm đợt
          </button>
        </div>

        <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
          Một tháng thường chốt nhiều đợt dài ngắn khác nhau. Khai đủ các đợt thì
          app kiểm được có ngày xuất kho nào rơi ra ngoài không.
        </p>

        <div className="space-y-2">
          {dot.map((d, i) => (
            <div
              key={d.id}
              className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center"
            >
              <span className="text-[10px] font-black text-slate-300 w-5 text-center">
                {i + 1}
              </span>
              {(
                [
                  ["tuNgay", "Từ ngày"],
                  ["denNgay", "Đến ngày"],
                  ["ngayHoaDon", "Ngày hóa đơn"],
                ] as [keyof DotChot, string][]
              ).map(([truong, nhan]) => (
                <label key={truong} className="block">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {nhan}
                  </span>
                  <input
                    type="date"
                    value={d[truong] as string}
                    onChange={(e) => suaDot(d.id, truong, e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900"
                  />
                </label>
              ))}
              <button
                onClick={() => xoaDot(d.id)}
                disabled={dot.length <= 1}
                className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                title="Xóa đợt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          <label className="block">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Tiền tố số hóa đơn
            </span>
            <input
              value={tienTo}
              onChange={(e) => setTienTo(e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900 font-mono"
            />
          </label>
          <label className="block">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              Số hóa đơn đầu kỳ
            </span>
            <input
              type="number"
              min={1}
              value={soBatDau}
              onChange={(e) => setSoBatDau(Number(e.target.value) || 1)}
              className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-900 tabular-nums"
            />
          </label>
        </div>
      </div>

      {/* ----- Cảnh báo ----- */}
      {bang.canhBao.length > 0 && (
        <div className="space-y-2">
          {bang.canhBao.map((c, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-2xl border flex gap-3",
                nghiemTrong(c.loai)
                  ? "border-amber-300 bg-amber-50"
                  : "border-blue-200 bg-blue-50",
              )}
            >
              <AlertTriangle
                className={cn(
                  "w-5 h-5 shrink-0 mt-0.5",
                  nghiemTrong(c.loai) ? "text-amber-600" : "text-blue-600",
                )}
              />
              <p
                className={cn(
                  "text-[11px] font-bold leading-relaxed",
                  nghiemTrong(c.loai) ? "text-amber-800" : "text-blue-800",
                )}
              >
                {c.moTa} — <strong>{c.soDong} dòng</strong>,{" "}
                {formatNumber(c.soLuong)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ----- Tổng kỳ ----- */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        {[
          { label: "Số dòng", value: formatNumber(bang.tong.soDong) },
          { label: "Số lượng", value: formatNumber(bang.tong.soLuong) },
          { label: "SKB→DNC", value: tien(bang.tong.thanhTienSkb) },
          { label: "Sau thuế SKB", value: tien(bang.tong.sauThueSkb) },
          { label: "DNC→ĐVTV", value: tien(bang.tong.thanhTienDnc) },
          { label: "Sau thuế DNC", value: tien(bang.tong.sauThueDnc) },
        ].map((s) => (
          <div
            key={s.label}
            className="p-3 rounded-xl bg-white border border-slate-200"
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
            <p className="text-sm font-black text-slate-900 mt-0.5 tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ----- Thống kê theo đợt ----- */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Theo đợt
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                {[
                  "Ngày giao bia",
                  "Ngày hóa đơn",
                  "Dòng",
                  "Đơn vị",
                  "Số HĐ",
                  "Số lượng",
                  "Thành tiền",
                  "Sau thuế",
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
              {bang.theoDot.map((d) => (
                <tr
                  key={d.dotId}
                  className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                >
                  <td className="px-3 py-1.5 text-slate-900">
                    {d.nhanNgayGiao}
                  </td>
                  <td className="px-3 py-1.5">{d.ngayHoaDon}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soDong}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soDonVi}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {d.soHoaDon}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                    {formatNumber(d.soLuong)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {tien(d.thanhTienSkb)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {tien(d.sauThueSkb)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----- Điền số hóa đơn thật ----- */}
      {canDien.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Số hóa đơn đã phát hành · {canDien.length} hóa đơn
              </p>
              <div className="flex gap-2">
                <button
                  onClick={dienGoiY}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200"
                >
                  Điền số gợi ý
                </button>
                <button
                  onClick={luuHoaDon}
                  disabled={dangLuu}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-125 disabled:opacity-40"
                >
                  {dangLuu ? "Đang lưu..." : "Lưu số hóa đơn"}
                </button>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
              Phát hành hóa đơn xong thì điền số và ngày thật vào đây. Số app tự
              đánh chỉ là gợi ý — ghi một số không có thật vào sổ thì đối chiếu
              với cơ quan thuế sau này không lần ra được gì.
            </p>
          </div>

          {bang.chuaCoSoThat > 0 && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
              <p className="text-[11px] font-bold text-amber-800">
                <strong>{bang.chuaCoSoThat}</strong> hóa đơn chưa có số thật —
                file kết xuất đang dùng số app tự đánh cho những dòng đó.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr>
                  {[
                    "Đợt",
                    "Đơn vị",
                    "Mã BP",
                    "Dòng",
                    "Thành tiền",
                    "Số hóa đơn",
                    "Ngày hóa đơn",
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
                {canDien.map((d) => {
                  const o = oCuaDong(d);
                  const chuaCo = !o.soHoaDon.trim();
                  return (
                    <tr
                      key={d.khoa}
                      className={cn(
                        "border-t border-slate-100 text-[11px] font-bold text-slate-600",
                        chuaCo && "bg-amber-50/40",
                      )}
                    >
                      <td className="px-3 py-1.5">{d.nhanDot}</td>
                      <td className="px-3 py-1.5 text-slate-900">{d.donVi}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-400">
                        {d.maBp}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {d.soDong}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                        {tien(d.thanhTien)}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={o.soHoaDon}
                          onChange={(e) =>
                            suaO(d.khoa, "soHoaDon", e.target.value, d)
                          }
                          placeholder={d.soGoiY}
                          className={cn(
                            "w-44 px-2 py-1.5 rounded-lg border bg-white text-[12px] font-black font-mono outline-none focus:border-primary",
                            chuaCo
                              ? "border-amber-300 placeholder:text-amber-400"
                              : "border-slate-200",
                          )}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="date"
                          value={o.ngayHoaDon}
                          onChange={(e) =>
                            suaO(d.khoa, "ngayHoaDon", e.target.value, d)
                          }
                          className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold outline-none focus:border-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ----- Thống kê theo đơn vị ----- */}
      {bang.theoDonVi.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Theo đơn vị · cả kỳ
            </p>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap">
              <tbody>
                {bang.theoDonVi.map((u) => (
                  <tr
                    key={u.maBp || u.donVi}
                    className="border-t border-slate-100 text-[11px] font-bold text-slate-600 first:border-t-0"
                  >
                    <td className="px-3 py-1.5 text-slate-900">{u.donVi}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-400">
                      {u.maBp}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {u.soDong} dòng
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                      {formatNumber(u.soLuong)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(u.thanhTienSkb)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(u.sauThueSkb)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----- Bảng giá ----- */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-slate-400" />
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Đơn giá đang áp dụng
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
          <p>
            Bia hơi (LIT): SKB→DNC{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LIT.skbToDnc)}
            </span>{" "}
            · DNC→ĐVTV{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LIT.dncToMember)}
            </span>
          </p>
          <p>
            Bia lon (LON): SKB→DNC{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LON.skbToDnc)}
            </span>{" "}
            · DNC→ĐVTV{" "}
            <span className="text-slate-900">
              {formatNumber(PRICE_TABLE.LON.dncToMember)}
            </span>
          </p>
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-2 leading-relaxed">
          VAT 10% cả hai chặng. Bảng đúng 18 cột của file bộ phận — không có
          &quot;Đơn vị xuất&quot;, &quot;Thuế TTĐB&quot;, &quot;Doanh thu
          511&quot;. Giá đổi thì báo tôi sửa trong src/lib/invoice.ts.
        </p>
      </div>

      {/* ----- Xem trước ----- */}
      {bang.dong.length === 0 ? (
        <p className="text-center text-xs font-bold text-slate-400 py-10">
          Không có giao dịch xuất kho nào trong các đợt đã khai.
        </p>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          {/* Chỉ còn cuộn DỌC. Bảng đã vừa bề ngang nên bỏ overflow-x. */}
          <div className="max-h-[520px] overflow-y-auto">
            {/*
              MÀN HÌNH GOM THEO HÓA ĐƠN, TỆP THÌ VẪN PHẲNG 18 CỘT.

              Sheet "Chốt" lặp lại ngày giao, ngày hóa đơn, đơn vị, số hóa đơn
              và mã BP trên TỪNG dòng — Excel không có cách nào khác. Nhưng năm
              cột ấy chiếm gần nửa bề ngang, đẩy cả khối giá chặng DNC ra ngoài
              màn hình, nên đọc một dòng phải kéo ngang rồi kéo ngược về.

              Nay năm cột đó thành một dải đầu mỗi hóa đơn, bảng còn 13 cột và
              vừa màn hình. Không mất thông tin nào — chỉ thôi lặp lại thứ vốn
              giống hệt nhau trong cả một hóa đơn.

              Hai khối giá vẫn tô hai màu như trong tệp: hai bộ cột Đơn giá /
              Thành tiền / VAT / Sau thuế giống hệt nhau, mà hai chặng chỉ lệch
              vài phần trăm nên đọc nhầm cũng không lộ ra.
            */}
            <table className="w-full text-left table-fixed">
              <colgroup>
                <col className="w-10" />
                <col className="w-[86px]" />
                <col />
                <col className="w-12" />
                <col className="w-20" />
                <col className="w-[62px]" />
                <col className="w-[92px]" />
                <col className="w-[82px]" />
                <col className="w-[96px]" />
                <col className="w-[62px]" />
                <col className="w-[92px]" />
                <col className="w-[82px]" />
                <col className="w-[96px]" />
              </colgroup>
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th colSpan={5} className="bg-slate-50" />
                  <th
                    colSpan={4}
                    className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-white bg-[#1F4E5F] text-center"
                  >
                    SKB - DNC
                  </th>
                  <th
                    colSpan={4}
                    className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-white bg-[#6B4E71] text-center"
                  >
                    DNC xuất BNC và ĐVTV
                  </th>
                </tr>
                <tr>
                  {[
                    "STT",
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
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-2 py-2 text-[9px] font-black uppercase tracking-widest",
                        COT_SO.includes(i) && "text-right",
                        i >= 5 && i <= 8
                          ? "bg-[#1F4E5F]/10 text-[#1F4E5F]"
                          : i >= 9
                            ? "bg-[#6B4E71]/10 text-[#6B4E71]"
                            : "text-slate-400",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              {khoiHoaDon.map((k) => (
                <tbody key={k.khoa} className="border-t-2 border-slate-200">
                  {/* Dải đầu hóa đơn: năm cột không lặp lại nữa. */}
                  <tr className="bg-slate-100/70">
                    <td
                      colSpan={13}
                      className="px-2 py-1.5 text-[10px] font-black text-slate-600"
                    >
                      <span className="text-slate-900">{k.dau.donVi}</span>
                      <span className="text-slate-300 mx-1.5">·</span>
                      <span className="font-mono text-slate-500">
                        {k.dau.maBp || "chưa có mã BP"}
                      </span>
                      <span className="text-slate-300 mx-1.5">·</span>
                      <span className="font-mono text-[10px] text-slate-700">
                        {k.dau.soHoaDon}
                      </span>
                      <span className="text-slate-300 mx-1.5">·</span>
                      <span className="font-normal text-slate-400">
                        giao {k.dau.ngayGiaoBia} · HĐ {k.dau.ngayHoaDon}
                      </span>
                    </td>
                  </tr>

                  {k.dong.map((r) => (
                    <tr
                      key={r.stt}
                      className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                    >
                      <td className="px-2 py-1.5 text-slate-400">{r.stt}</td>
                      <td className="px-2 py-1.5 font-mono text-[10px]">
                        {r.maVatTu}
                      </td>
                      {/* Cột duy nhất co giãn, và là cột duy nhất được xuống
                          dòng — tên bia dài nhất cũng chỉ ăn hai dòng. */}
                      <td className="px-2 py-1.5 leading-tight">
                        {r.tenHangHoa}
                      </td>
                      <td className="px-2 py-1.5 text-slate-400">{r.dvt}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-900">
                        {formatNumber(r.soLuong)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums bg-[#1F4E5F]/5">
                        {formatNumber(r.donGiaSkb)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-900 bg-[#1F4E5F]/5">
                        {tien(r.thanhTienSkb)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums bg-[#1F4E5F]/5">
                        {tien(r.vatSkb)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-900 bg-[#1F4E5F]/5">
                        {tien(r.sauThueSkb)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums bg-[#6B4E71]/5">
                        {formatNumber(r.donGiaDnc)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-900 bg-[#6B4E71]/5">
                        {tien(r.thanhTienDnc)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums bg-[#6B4E71]/5">
                        {tien(r.vatDnc)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-900 bg-[#6B4E71]/5">
                        {tien(r.sauThueDnc)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}

              <tfoot className="sticky bottom-0">
                <tr className="bg-slate-100 border-t-2 border-slate-300 text-[11px] font-black text-slate-900">
                  <td colSpan={4} className="px-2 py-2">
                    TỔNG CỘNG
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatNumber(bang.tong.soLuong)}
                  </td>
                  <td />
                  <td className="px-2 py-2 text-right tabular-nums">
                    {tien(bang.tong.thanhTienSkb)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {tien(bang.tong.vatSkb)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {tien(bang.tong.sauThueSkb)}
                  </td>
                  <td />
                  <td className="px-2 py-2 text-right tabular-nums">
                    {tien(bang.tong.thanhTienDnc)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {tien(bang.tong.vatDnc)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {tien(bang.tong.sauThueDnc)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ----- Tệp TEMPLATE để xuất hóa đơn trên hệ thống khác ----- */}
      {tepSap.oDong.length > 0 && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Tệp TEMPLATE xuất hóa đơn · {tepSap.tong.soChungTu} chứng từ ·{" "}
              {tepSap.oDong.length} dòng
            </p>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
              Tệp bút toán đúng khuôn mẫu bộ phận gửi, để nạp lên hệ thống kế
              toán. Mỗi <strong>đợt × đơn vị</strong> là một chứng từ: một dòng
              Nợ phải thu, mỗi mặt hàng một dòng doanh thu, và một dòng thuế
              GTGT. Số lấy thẳng từ bảng Chốt ở trên nên hai tệp luôn khớp nhau.
            </p>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Ngày chứng từ
                </span>
                <input
                  type="date"
                  value={ngayChungTu}
                  onChange={(e) => setNgayChungTu(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
                />
                <span className="block text-[9px] font-bold text-slate-400 mt-1">
                  Ngày hạch toán, không phải ngày giao bia
                </span>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Tiêu đề chứng từ
                </span>
                <input
                  value={cauHinhSap.tieuDeChungTu}
                  onChange={(e) => suaCauHinh("tieuDeChungTu", e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900 font-mono"
                />
                <span className="block text-[9px] font-bold text-slate-400 mt-1">
                  Nối thêm tên đơn vị: {cauHinhSap.tieuDeChungTu}BNC
                </span>
              </label>
            </div>

            <button
              onClick={() => setMoCauHinh(!moCauHinh)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary"
            >
              {moCauHinh ? "Ẩn" : "Sửa"} mã cố định (tài khoản, mã thuế, công ty)
            </button>

            {moCauHinh && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                {(
                  [
                    ["docType", "Doc. type"],
                    ["compCode", "Comp. Code"],
                    ["currency", "Currency"],
                    ["businessPlace", "Business Place"],
                    ["taxCode", "Tax Code"],
                    ["paymentTerm", "Payment Term"],
                    ["profitCenter", "Profit Center"],
                    ["taiKhoanPhaiThu", "TK phải thu"],
                    ["taiKhoanDoanhThu", "TK doanh thu"],
                    ["taiKhoanThue", "TK thuế GTGT"],
                  ] as [keyof CauHinhSap, string][]
                ).map(([k, nhan]) => (
                  <label key={k} className="block">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      {nhan}
                    </span>
                    <input
                      value={cauHinhSap[k]}
                      onChange={(e) => suaCauHinh(k, e.target.value)}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-bold font-mono text-slate-900"
                    />
                  </label>
                ))}
                {/* Chú thích ở sheet 1 ghi TO2 còn tệp mẫu ghi O2 — nói ra chứ
                    không tự chọn hộ. */}
                <p className="col-span-2 sm:col-span-4 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                  Mã thuế: tệp mẫu ghi <strong>O2</strong>, còn chú thích ở
                  sheet 1 ghi <strong>TO2</strong>. Em để mặc định theo tệp mẫu
                  vì đó là tệp đã dùng được — anh xem lại rồi sửa nếu cần.
                </p>
              </div>
            )}

            {/* Bảng tóm tắt từng chứng từ để soát trước khi tải. */}
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Chứng từ",
                      "Mã BP",
                      "Mặt hàng",
                      "Trước thuế",
                      "VAT",
                      "Tổng cộng",
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
                  {tepSap.chungTu.map((x, i) => (
                    <tr
                      key={`${x.maBp}-${i}`}
                      className="border-t border-slate-100 text-[11px] font-bold text-slate-600"
                    >
                      <td className="px-3 py-1.5 text-slate-900 font-mono text-[10px]">
                        {x.tieuDe}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-slate-400">
                        {x.maBp}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {x.soDongHang}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {tien(x.truocThue)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {tien(x.vat)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">
                        {tien(x.tongCong)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 text-[11px] font-black text-slate-900 bg-slate-50">
                    <td className="px-3 py-1.5" colSpan={3}>
                      Tổng
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(tepSap.tong.truocThue)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(tepSap.tong.vat)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {tien(tepSap.tong.tongCong)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {tepSap.vuotDoDai.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                  {tepSap.vuotDoDai.length} tên hàng dài hơn 25 ký tự, mà cột
                  Header Text khai C(25). Tệp mẫu của anh cũng vậy và vẫn dùng
                  được nên em giữ nguyên, không cắt.
                </p>
              </div>
            )}

            <button
              onClick={taiTepSap}
              className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Tải tệp TEMPLATE (
              {tepSap.tong.soChungTu} chứng từ)
            </button>
          </div>
        </div>
      )}


      <button
        onClick={handleDownload}
        disabled={bang.dong.length === 0}
        className="px-5 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" /> Tải file công nợ ({bang.tong.soDong}{" "}
        dòng · {dot.length} đợt)
      </button>
    </div>
  );
}

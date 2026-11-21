import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Receipt,
  AlertTriangle,
  Plus,
  Trash2,
  CalendarRange,
  CheckCircle2,
  FileClock,
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction, Product, Partner } from "../types";
import { invoiceUnitOf } from "../lib/invoice";
import {
  dungBangCongNo,
  nhanNgayGiao,
  type DongCongNo,
  type DotChot,
} from "../lib/congNo";
import {
  dongCanDienHoaDon,
  bangHoaDon,
  boDauKetXuat,
  danhDauKetXuat,
  type HoaDonGhiNhan,
} from "../lib/hoaDon";
import { stableHash } from "../lib/hash";
import { taoWorkbookCongNo } from "../lib/congNoExcel";
// Ghi bang XLSXDep chu khong phai `xlsx`: dung `xlsx` thi workbook da gan dinh
// dang van bi ghi ra trang tron, vi ban cong dong khong ghi thuoc tinh `s`.
import { XLSXDep } from "../lib/excelDep";
import {
  CAU_HINH_MAC_DINH,
  dienThang,
  dungTepSap,
  thangCuaNhanDot,
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

import ONgay from "./ONgay";
import BangChotHoaDon from "./BangChotHoaDon";
import DieuChinhCongNo from "./DieuChinhCongNo";
import type { DongGhiDieuChinh } from "../lib/dieuChinhCongNo";

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
  /**
   * Thẻ đang xem: `"chua"` là đơn còn phải xuất hóa đơn, `"da"` là sổ theo dõi
   * đơn đã xuất.
   *
   * Cùng một component vẽ cả hai vì chúng dùng chung biên đợt, chung phép tính
   * tiền và chung ô nhập số hóa đơn. Tách thành hai component thì phải nhấc
   * toàn bộ trạng thái ấy lên trên, và biên đợt vốn lưu ở localStorage sẽ có
   * hai chỗ đọc ghi.
   */
  phan?: "chua" | "da";
  /** Hóa đơn đã phát hành, do người dùng điền lại. */
  hoaDon: HoaDonGhiNhan[];
  onSaveHoaDon: (ds: HoaDonGhiNhan[]) => Promise<void>;
  /** Ghi một lần điều chỉnh công nợ. Không truyền = vai trò chỉ xem. */
  onGhiDieuChinh?: (dong: DongGhiDieuChinh[]) => Promise<boolean>;
  /** Xoá một lần điều chỉnh (cả cặp). Chỉ admin. */
  onXoaDieuChinh?: (nhom: string) => Promise<void>;
}

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
    },
  ];
}

function docDotDaLuu(): DotChot[] {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    if (!raw) return dotMacDinh();
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || v.length === 0) return dotMacDinh();
    return v.filter((d) => d && d.id && d.tuNgay && d.denNgay) as DotChot[];
  } catch {
    return dotMacDinh();
  }
}

export default function DebtExport({
  phan = "chua",
  transactions,
  products,
  partners,
  hoaDon,
  onSaveHoaDon,
  onGhiDieuChinh,
  onXoaDieuChinh,
}: Props) {
  const [dot, setDot] = useState<DotChot[]>(docDotDaLuu);
  /*
   * Tiền tố và số bắt đầu của số hóa đơn GỢI Ý — không còn ô để chỉnh.
   *
   * Giữ lại giá trị vì số gợi ý vẫn điền sẵn vào ô cho người dùng sửa. Bỏ ô
   * chỉnh vì số thật do người điền sau lúc phát hành, nên gần như không ai
   * đụng tới hai ô ấy — mà chúng lại làm khối khai đợt trông rắc rối.
   */
  const [tienTo] = useState("C26TKB#");
  /** Đang dựng tệp TEMPLATE. Chặn bấm hai lần vì phải tải tệp mẫu về trước. */
  const [dangTaiSap, setDangTaiSap] = useState(false);
  const [soBatDau] = useState<number>(() => {
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
      // Đơn vị chưa có mã BP: khoá hóa đơn (và `dungBangCongNo`) dùng TÊN đơn
      // vị thay mã — chỉ mục ở đây cũng phải vậy, không thì số thật không bao
      // giờ lên sheet Chốt và hai đơn vị thiếu mã đè nhau ở khoá `tu|den|`.
      m.set([h.tuNgay, h.denNgay, h.maBp || h.donVi].join("|"), {
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

  /**
   * TÁCH LÀM HAI NHÓM: đơn CHƯA có số hóa đơn, và đơn ĐÃ có.
   *
   * Hai việc khác hẳn nhau nên phải nằm hai chỗ: nhóm chưa xuất là việc sắp
   * phải làm — tải tệp TEMPLATE, đi xuất hóa đơn, rồi quay về điền số. Nhóm đã
   * xuất là sổ theo dõi — chỉ xem lại số nào ngày nào, thỉnh thoảng sửa một
   * chỗ gõ nhầm. Trộn chung một bảng thì nhìn vào không biết còn bao nhiêu đơn
   * phải xuất, mà đó mới là câu hỏi mở màn hình này ra để trả lời.
   *
   * MỐC CHUYỂN LÀ LÚC TẢI TỆP TEMPLATE, không phải lúc điền số hóa đơn. Tải
   * tệp về là mang sang hệ thống hóa đơn để phát hành — kể từ lúc ấy đơn đã đi
   * khỏi tay, dù số hóa đơn thật vài hôm sau mới có. Lấy số hóa đơn làm mốc
   * thì suốt quãng giữa đơn vẫn nằm ở "chưa xuất", và lần kết xuất sau sẽ gom
   * nó vào tệp lần nữa — xuất trùng hóa đơn.
   */
  const chuaXuat = useMemo(
    () => canDien.filter((d) => !d.daKetXuat),
    [canDien],
  );
  const daXuat = useMemo(() => canDien.filter((d) => d.daKetXuat), [canDien]);

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
  /**
   * TỆP TEMPLATE CHỈ GOM ĐƠN CHƯA KẾT XUẤT.
   *
   * Không lọc thì lần kết xuất thứ hai trong cùng một kỳ sẽ gom lại cả những
   * đơn đã mang đi phát hành lần trước — mang tệp đó sang hệ thống hóa đơn là
   * xuất trùng, mà hóa đơn trùng thì phải làm hóa đơn điều chỉnh, không xoá
   * được.
   *
   * Khớp theo (nhãn đợt × mã BP) vì đó đúng là thứ `khoaHoaDon` băm ra — một
   * hóa đơn là một (đợt × đơn vị).
   */
  const khoaDaKetXuat = useMemo(
    () => new Set(daXuat.map((d) => `${d.nhanDot}|${d.maBp || d.donVi}`)),
    [daXuat],
  );

  const tepSap = useMemo(() => {
    const dong: DongHangSap[] = bang.dong
      .filter(
        (r) => !khoaDaKetXuat.has(`${r.ngayGiaoBia}|${r.maBp || r.donVi}`),
      )
      .map((r) => ({
        khoaDot: r.ngayGiaoBia,
        thang: thangCuaNhanDot(r.ngayGiaoBia),
        maBp: r.maBp,
        donVi: r.donVi,
        tenHangHoa: r.tenHangHoa,
        dvt: r.dvt,
        soLuong: r.soLuong,
        thanhTien: r.thanhTienSkb,
      }));
    return dungTepSap({ dong, ngayChungTu, cauHinh: cauHinhSap });
  }, [bang.dong, khoaDaKetXuat, ngayChungTu, cauHinhSap]);

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

      /*
       * TẢI XONG LÀ ĐÁNH DẤU ĐÃ KẾT XUẤT.
       *
       * Đánh dấu SAU khi tệp đã tải thật, không phải lúc bấm nút: dựng tệp có
       * thể hỏng giữa chừng (tải tệp mẫu về không được chẳng hạn), mà đánh dấu
       * trước thì đơn nhảy sang tab kia trong khi trong tay chưa có tệp nào.
       */
      if (chuaXuat.length > 0) {
        await onSaveHoaDon(danhDauKetXuat(chuaXuat, new Date().toISOString()));
      }
    } catch (e) {
      alert(
        `Không tạo được tệp TEMPLATE: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDangTaiSap(false);
    }
  };

  /**
   * Đưa một đơn ngược về "chưa xuất".
   *
   * Bấm nhầm nút tải tệp là cả loạt đơn nhảy sang tab kia; không có đường lui
   * thì phải đi sửa thẳng dữ liệu. Chặn khi đơn đã có số hóa đơn — lúc đó hóa
   * đơn đã phát hành thật, đưa về "chưa xuất" là mời gọi xuất trùng.
   */
  const boKetXuat = async (d: (typeof canDien)[0]) => {
    if (String(d.soDaGhi || "").trim()) {
      alert(
        `Đơn ${d.donVi} đã có số hóa đơn ${d.soDaGhi} — không đưa về "chưa xuất" được.\n\n` +
          `Hóa đơn đã phát hành thật rồi; đưa về là lần kết xuất sau gom nó vào tệp lần nữa và xuất trùng. ` +
          `Muốn bỏ thật thì xoá số hóa đơn trước.`,
      );
      return;
    }
    if (
      !window.confirm(
        `Đưa đơn ${d.donVi} (${d.nhanDot}) về "Chưa xuất hóa đơn"?\n\n` +
          `Đơn sẽ được gom vào tệp TEMPLATE của lần kết xuất sau.`,
      )
    )
      return;
    await onSaveHoaDon([boDauKetXuat(d)]);
  };

  /*
   * BỎ CẢ LOẠT ĐƠN CHỜ ĐIỀN SỐ — kết xuất xong mới thấy số liệu sai.
   *
   * Chỉ bỏ đơn CHƯA CÓ SỐ hóa đơn (đúng những đơn đang nằm ở bảng chờ). Đơn
   * quay về "Chưa xuất hóa đơn": sửa số liệu xuất kho xong, kết xuất lại là
   * tệp mới mang số đúng. Tệp TEMPLATE đã tải về máy thì anh tự bỏ đi — app
   * không với tới được tệp trên máy.
   */
  const boNhieuKetXuat = async (ds: (typeof canDien)[0][]) => {
    const bo = ds.filter((d) => !String(d.soDaGhi || "").trim());
    if (!bo.length) return;
    if (
      !window.confirm(
        `Bỏ ${bo.length} đơn đang chờ điền số hóa đơn?\n\n` +
          bo.map((d) => `· ${d.donVi} (${d.nhanDot})`).join("\n") +
          `\n\nCác đơn quay về "Chưa xuất hóa đơn". Sửa số liệu xong thì ` +
          `kết xuất TEMPLATE lại. Tệp đã tải về máy lần trước thì bỏ đi, đừng ` +
          `mang đi phát hành.`,
      )
    )
      return;
    await onSaveHoaDon(bo.map(boDauKetXuat));
  };

  /*
   * KHÔNG lọc và KHÔNG liệt kê hóa đơn cũ ở đây nữa.
   *
   * Bảng dưới đây chỉ là đơn của đợt đang khai — thường vài chục dòng, để điền
   * cho xong. Việc tra lại hóa đơn cũ thuộc về phần Tra cứu ngay bên dưới
   * trong cùng thẻ: ở đó có lọc theo ngày, theo số, có tổng từng tờ và in được
   * mẫu Chốt.
   */

  /** Tra đơn (đợt × đơn vị) từ một dòng của bảng công nợ. */
  const donTheoNhan = useMemo(() => {
    const m = new Map<string, (typeof canDien)[0]>();
    canDien.forEach((d) => m.set(`${d.nhanDot}|${d.maBp || d.donVi}`, d));
    return m;
  }, [canDien]);

  /**
   * Các khối hóa đơn ĐÃ XUẤT, kèm bộ lọc ngày hóa đơn và số hóa đơn.
   *
   * Giữ nguyên khối — một hóa đơn gồm nhiều dòng hàng — để số hóa đơn và ngày
   * hóa đơn gộp ô đúng như trong sheet, thay vì lặp lại trên từng dòng.
   */
  const khoiDaXuat = useMemo(
    () =>
      khoiHoaDon
        .map((k) => ({
          ...k,
          don: donTheoNhan.get(
            `${k.dau.ngayGiaoBia}|${k.dau.maBp || k.dau.donVi}`,
          ),
        }))
        .filter((k) => k.don?.daKetXuat),
    [khoiHoaDon, donTheoNhan],
  );

  /**
   * ĐIỀN XONG SỐ HÓA ĐƠN THÌ ĐƠN RỜI KHỎI BẢNG NÀY.
   *
   * Bảng trên là danh sách VIỆC CÒN PHẢI LÀM: đã kết xuất tệp, mang đi phát
   * hành rồi, giờ chờ điền số thật. Điền xong là xong việc — để nó nằm lại thì
   * mỗi kỳ bảng dài thêm, và không nhìn ra còn mấy tờ chưa điền.
   *
   * Không mất đi đâu: hóa đơn đã điền số nằm ở phần Tra cứu ngay bên dưới,
   * cùng thẻ này.
   *
   * CHIA THEO SỐ ĐÃ LƯU, không theo chữ đang gõ — gõ được nửa số mà dòng biến
   * mất thì con trỏ mất tiêu.
   */
  const [hienCaDaDien, setHienCaDaDien] = useState(false);
  const khoiChoDien = useMemo(
    () => khoiDaXuat.filter((k) => !String(k.don?.soDaGhi || "").trim()),
    [khoiDaXuat],
  );
  const khoiHienRa = hienCaDaDien ? khoiDaXuat : khoiChoDien;

  const suaCauHinh = (truong: keyof CauHinhSap, giaTri: string) =>
    setCauHinhSap((c) => ({ ...c, [truong]: giaTri }));

  const tien = (n: number) => formatNumber(Math.round(n));

  /**
   * Bảng dòng hóa đơn, dùng chung cho cả hai khối.
   *
   * Cùng một bộ cột, chỉ khác ô nhập có được tô cảnh báo hay không — chép
   * thành hai bảng riêng thì sửa một cột phải nhớ sửa cả hai chỗ, và quên một
   * chỗ là hai bảng lệch nhau mà không có gì báo.
   */
  const bangDongHoaDon = (ds: typeof canDien, kieu: "chua" | "da") => (
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
              ...(kieu === "da" ? ["Số hóa đơn", "Ngày hóa đơn", ""] : []),
            ].map((h, i) => (
              <th
                key={h || `c${i}`}
                className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ds.map((d) => {
            const o = oCuaDong(d);
            const chuaCoSo = !o.soHoaDon.trim();
            return (
              <tr
                key={d.khoa}
                className="border-t border-slate-100 text-[13px] font-bold text-slate-600"
              >
                <td className="px-3.5 py-2.5">{d.nhanDot}</td>
                <td className="px-3.5 py-2.5 text-slate-900">{d.donVi}</td>
                <td className="px-3.5 py-2.5 font-mono text-slate-400">
                  {d.maBp}
                </td>
                <td className="px-3.5 py-2.5 text-right tabular-nums">
                  {d.soDong}
                </td>
                <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-900">
                  {tien(d.thanhTien)}
                </td>
                {kieu === "da" && (
                  <>
                    <td className="px-3.5 py-2.5">
                      <input
                        value={o.soHoaDon}
                        onChange={(e) =>
                          suaO(d.khoa, "soHoaDon", e.target.value, d)
                        }
                        placeholder={d.soGoiY}
                        className={cn(
                          "w-44 px-3 py-2.5 rounded-lg border bg-white text-[14px] font-black font-mono outline-none focus:border-primary",
                          chuaCoSo
                            ? "border-amber-300 placeholder:text-amber-400"
                            : "border-slate-200",
                        )}
                      />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <ONgay
                        value={o.ngayHoaDon}
                        onChange={(v: string) =>
                          suaO(d.khoa, "ngayHoaDon", v, d)
                        }
                        className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-[14px] font-bold outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {/* Đường lui cho người bấm nhầm nút tải tệp. Chỉ hiện khi
                          đơn chưa có số hóa đơn — có số rồi thì hóa đơn đã
                          phát hành thật. */}
                      {chuaCoSo && !String(d.soDaGhi || "").trim() && (
                        <button
                          onClick={() => boKetXuat(d)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                        >
                          Đưa về chưa xuất
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  const nghiemTrong = (loai: string) =>
    loai === "ngoai_dot" || loai === "thieu_ma_vat_tu" || loai === "thieu_ma_bp";

  return (
    <div className="space-y-4">
      {/* Lời dẫn nói về việc kết xuất, nên chỉ thuộc thẻ "Chưa xuất". */}
      {phan === "chua" && (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3">
        <Receipt className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[13px] font-bold text-slate-500 leading-relaxed">
          Dựng đúng sheet <strong>Chốt</strong> của file công nợ tháng: 18 cột,
          hai chặng giá cạnh nhau, một số hóa đơn cho mỗi{" "}
          <strong>đợt × đơn vị</strong>. Hai mươi bộ phận BNC gộp về một dòng
          theo mã BP <strong>AD0103</strong>, vì hóa đơn xuất cho pháp nhân chứ
          không xuất cho từng quán.
        </p>
      </div>
      )}

      {/*
        ĐỢT CHỐT, CẢNH BÁO VÀ TỔNG KỲ CHỈ THUỘC THẺ "CHƯA XUẤT".

        Khai biên đợt là việc của lượt kết xuất: gom xuất kho tới ngày nào thì
        cắt. Thẻ "Đã xuất" là sổ theo dõi hóa đơn đã phát hành — bày lại ô khai
        đợt ở đó chỉ làm người dùng tưởng phải khai gì thêm mới tra được.
      */}
      {phan === "chua" && (
      <>
      {/* ----- Đợt chốt ----- */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <p className="text-[13px] font-black text-slate-700 tracking-tight">
              Gom xuất kho thành hóa đơn
            </p>
          </div>
          <button
            onClick={themDot}
            className="px-3.5 py-2.5 rounded-lg bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Thêm đợt
          </button>
        </div>

        {/*
          NÓI THẲNG NÓ LÀM GÌ, đừng bắt người dùng đoán nghĩa "đợt chốt".
          Câu cũ không cho biết khai cái này ra thì được gì; câu mới nói đúng
          hệ quả: khoảng ngày này quyết định cắt hóa đơn ở đâu.
        */}
        <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
          Khoảng ngày này quyết định <strong>cắt hóa đơn ở đâu</strong>: mỗi
          khoảng × mỗi đơn vị gom thành <strong>một</strong> hóa đơn. Ví dụ khai
          17.09–21.09 thì cả chín dòng bia giao cho BNC trong năm ngày đó nằm
          chung một tờ. Một tháng chốt nhiều lần thì bấm{" "}
          <strong>Thêm đợt</strong> — khai đủ thì app báo được ngày xuất kho nào
          rơi ra ngoài.
        </p>

        <div className="space-y-2">
          {dot.map((d, i) => (
            <div
              key={d.id}
              className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center"
            >
              <span className="text-[12px] font-black text-slate-300 w-5 text-center">
                {i + 1}
              </span>
              {(
                [
                  ["tuNgay", "Từ ngày"],
                  ["denNgay", "Đến ngày"],
                ] as [keyof DotChot, string][]
              ).map(([truong, nhan]) => (
                <label key={truong} className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {nhan}
                  </span>
                  <ONgay
                    value={d[truong] as string}
                    onChange={(v: string) => suaDot(d.id, truong, v)}
                    className="w-full mt-0.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-[14px] font-bold text-slate-900"
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

        {/*
          ĐÃ BỎ "Tiền tố số hóa đơn" và "Số hóa đơn đầu kỳ".

          Hai ô đó chỉ để app TỰ ĐÁNH một số gợi ý. Từ khi số hóa đơn thật do
          người điền sau lúc phát hành, số gợi ý gần như không ai dùng tới — mà
          hai ô cấu hình nằm ngay dưới biên đợt lại làm cả khối trông như phải
          khai gì đó phức tạp. Số gợi ý vẫn còn, chỉ là thôi cho chỉnh.
        */}
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
                  "text-[13px] font-bold leading-relaxed",
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
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
            <p className="text-sm font-black text-slate-900 mt-0.5 tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>
      </>
      )}

      {phan === "chua" && (
      <>
      {/*
        KHỐI PHỤ THU GỌN LẠI, BUNG RA KHI CẦN.

        Bảy khối số liệu xếp liền nhau thành một trang dài dằng dặc, và thứ
        người dùng mở màn hình này ra để tìm — còn bao nhiêu đơn phải xuất hóa
        đơn — thì lẫn vào giữa. Số liệu không bỏ đi đâu, chỉ thôi bày sẵn ra
        cùng một lúc.
      */}
      <details className="rounded-2xl border border-slate-200 bg-white overflow-hidden group">
        <summary className="px-4 py-3.5 cursor-pointer list-none flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
          <span className="text-[13px] font-black text-slate-700 tracking-tight">
            Số liệu theo đợt
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-open:hidden">
            Bung ra
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 hidden group-open:inline">
            Thu lại
          </span>
        </summary>
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
      {/* ----- Thống kê theo đợt ----- */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Theo đợt
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                {[
                  "Ngày giao bia",
                  "Dòng",
                  "Đơn vị",
                  "Số HĐ",
                  "Số lượng",
                  "Thành tiền",
                  "Sau thuế",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400"
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
                  className="border-t border-slate-100 text-[13px] font-bold text-slate-600"
                >
                  <td className="px-3.5 py-2.5 text-slate-900">
                    {d.nhanNgayGiao}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">
                    {d.soDong}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">
                    {d.soDonVi}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">
                    {d.soHoaDon}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-900">
                    {formatNumber(d.soLuong)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">
                    {tien(d.thanhTienSkb)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">
                    {tien(d.sauThueSkb)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        </div>
      </details>
      </>
      )}


      {/* ================================================================
          HAI PHẦN, CHIA THEO VIỆC CÒN PHẢI LÀM HAY ĐÃ XONG.

          Bản trước dồn tất cả vào một bảng "Số hóa đơn đã phát hành", nên mở
          màn hình ra không trả lời được câu hỏi đầu tiên: còn bao nhiêu đơn
          phải đi xuất hóa đơn? Nay đơn chưa có số nằm riêng ở trên, kèm luôn
          nút tải tệp TEMPLATE — đúng việc tiếp theo phải làm. Đơn đã có số
          xuống dưới thành sổ theo dõi.
      ================================================================= */}

      {phan === "chua" && (
      <div className="rounded-2xl border-2 border-amber-300 overflow-hidden">
        <div className="px-4 py-3.5 bg-amber-50 border-b-2 border-amber-200 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <FileClock className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-[15px] font-black text-amber-900 tracking-tight">
                Chưa xuất hóa đơn · {chuaXuat.length} đơn
              </p>
            </div>
            {tepSap.oDong.length > 0 && (
              <button
                onClick={taiTepSap}
                disabled={dangTaiSap}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-black uppercase tracking-widest hover:brightness-125 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {dangTaiSap
                  ? "Đang dựng tệp..."
                  : `Tải tệp TEMPLATE (${tepSap.tong.soChungTu} chứng từ)`}
              </button>
            )}
          </div>
          <p className="text-[12px] font-bold text-amber-700 leading-relaxed">
            Đây là những đơn <strong>chưa mang đi xuất hóa đơn</strong>. Bấm
            <strong> Tải tệp TEMPLATE</strong> để lấy tệp mang sang hệ thống hóa
            đơn — tải xong là cả {chuaXuat.length} đơn này chuyển sang thẻ{" "}
            <strong>Đã xuất hóa đơn</strong>, và anh điền số hóa đơn, ngày hóa
            đơn ở thẻ đó.
          </p>
          <p className="text-[12px] font-bold text-amber-700/80 leading-relaxed">
            Bấm nhầm thì ở thẻ kia có nút <strong>Đưa về chưa xuất</strong> cho
            từng đơn, miễn là đơn đó chưa điền số hóa đơn.
          </p>
          {/* Thông số tệp TEMPLATE nằm ngay cạnh nút tải — trước đây giấu trong
              khung "Chi tiết số liệu" bên dưới nên dễ tải tệp với ngày chứng
              từ mặc định. Khung đó (thống kê theo đơn vị, bảng giá, xem trước
              18 cột, tóm tắt chứng từ) đã bỏ: bảng đơn ngay dưới đã đủ. */}
          {tepSap.oDong.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Ngày chứng từ
                </span>
                <ONgay
                  value={ngayChungTu}
                  onChange={(v: string) => setNgayChungTu(v)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[15px] font-bold text-slate-900"
                />
                <span className="block text-[11px] font-bold text-slate-400 mt-1">
                  Ngày hạch toán, không phải ngày giao bia
                </span>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Tiêu đề chứng từ
                </span>
                <input
                  value={cauHinhSap.tieuDeChungTu}
                  onChange={(e) => suaCauHinh("tieuDeChungTu", e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[15px] font-bold text-slate-900 font-mono"
                />
                <span className="block text-[11px] font-bold text-slate-400 mt-1">
                  <strong>{"{T}"}</strong> tự đổi theo tháng giao của từng
                  đợt. Ví dụ đơn giao tháng 10:{" "}
                  {dienThang(cauHinhSap.tieuDeChungTu, 10)}BNC
                </span>
              </label>
            </div>

            <button
              onClick={() => setMoCauHinh(!moCauHinh)}
              className="text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-primary"
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {nhan}
                    </span>
                    <input
                      value={cauHinhSap[k]}
                      onChange={(e) => suaCauHinh(k, e.target.value)}
                      className="w-full mt-0.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-[14px] font-bold font-mono text-slate-900"
                    />
                  </label>
                ))}
                {/* Chú thích ở sheet 1 ghi TO2 còn tệp mẫu ghi O2 — nói ra chứ
                    không tự chọn hộ. */}
                <p className="col-span-2 sm:col-span-4 text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                  Mã thuế: tệp mẫu ghi <strong>O2</strong>, còn chú thích ở
                  sheet 1 ghi <strong>TO2</strong>. Em để mặc định theo tệp mẫu
                  vì đó là tệp đã dùng được — anh xem lại rồi sửa nếu cần.
                </p>
              </div>
            )}

          </div>
          )}
        </div>

        {chuaXuat.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] font-bold text-slate-400">
            Mọi đơn trong kỳ đã được kết xuất.
          </p>
        ) : (
          bangDongHoaDon(chuaXuat, "chua")
        )}
      </div>
      )}

      {phan === "da" && (
      <div className="rounded-2xl border-2 border-emerald-200 overflow-hidden">
        <div className="px-4 py-3.5 bg-emerald-50 border-b-2 border-emerald-200 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[15px] font-black text-emerald-900 tracking-tight">
                {hienCaDaDien
                  ? `Đã xuất hóa đơn · ${khoiDaXuat.length} đơn`
                  : `Chờ điền số hóa đơn · ${khoiChoDien.length} đơn`}
              </p>
              {/* Nói rõ đang xem đợt nào, vì ô khai đợt đã chuyển hẳn sang thẻ
                  "Chưa xuất" — không có dòng này thì danh sách rỗng nhìn giống
                  mất dữ liệu. */}
              <p className="text-[11px] font-bold text-emerald-700/70 mt-0.5">
                Đợt đang khai:{" "}
                {dot.length === 0
                  ? "chưa khai đợt nào — khai ở thẻ Chưa xuất hóa đơn"
                  : dot
                      .map((d) => nhanNgayGiao(d.tuNgay, d.denNgay))
                      .join(" · ")}
              </p>
            </div>
          </div>
          <p className="text-[12px] font-bold text-emerald-700 leading-relaxed">
            Những đơn <strong>đã kết xuất tệp TEMPLATE</strong> và mang đi phát
            hành, đang <strong>chờ điền số hóa đơn</strong>. Điền số và ngày rồi
            bấm Lưu là đơn rời khỏi bảng này — xem lại ở phần{" "}
            <strong>Tra cứu</strong> bên dưới.
          </p>
          {/* Đường quay lại để sửa một số đã lưu bị gõ nhầm. */}
          {khoiDaXuat.length > khoiChoDien.length && (
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={hienCaDaDien}
                onChange={(e) => setHienCaDaDien(e.target.checked)}
                className="w-4 h-4 shrink-0 text-primary rounded border-emerald-300 focus:ring-emerald-200"
              />
              <span className="text-[12px] font-bold text-emerald-700">
                Hiện cả {khoiDaXuat.length - khoiChoDien.length} đơn đã điền số
                (để sửa chỗ gõ nhầm)
              </span>
            </label>
          )}

          <p className="text-[12px] font-bold text-emerald-700/80 leading-relaxed">
            Số app tự đánh chỉ là <strong>gợi ý</strong> điền sẵn — ghi một số
            không có thật vào sổ thì sau này đối chiếu với cơ quan thuế không
            lần ra được gì.
          </p>
        </div>

        {khoiHienRa.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] font-bold text-slate-400">
            {daXuat.length === 0
              ? "Chưa kết xuất đơn nào trong kỳ này."
              : "Đã điền số hóa đơn cho mọi đơn đã kết xuất. Xem lại ở phần Tra cứu bên dưới."}
          </p>
        ) : (
          <>
            <BangChotHoaDon
              khoi={khoiHienRa.map((k) => {
                const d = k.don!;
                const o = oCuaDong(d);
                return {
                  khoa: d.khoa,
                  soHoaDon: o.soHoaDon,
                  ngayHoaDon: o.ngayHoaDon,
                  dong: k.dong,
                };
              })}
              onSua={(khoa, truong, giaTri) => {
                const d = canDien.find((x) => x.khoa === khoa);
                if (d) suaO(khoa, truong, giaTri, d);
              }}
              goiYSo={(khoa) =>
                canDien.find((x) => x.khoa === khoa)?.soGoiY || ""
              }
              onBo={(khoa) => {
                const d = canDien.find((x) => x.khoa === khoa);
                if (d) void boKetXuat(d);
              }}
            />
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end flex-wrap">
              {khoiChoDien.length > 0 && (
                <button
                  onClick={() =>
                    boNhieuKetXuat(
                      khoiChoDien
                        .map((k) => k.don)
                        .filter((d): d is (typeof canDien)[0] => !!d),
                    )
                  }
                  className="mr-auto px-3.5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50"
                >
                  Bỏ cả {khoiChoDien.length} đơn chờ
                </button>
              )}
              <button
                onClick={dienGoiY}
                className="px-3.5 py-2.5 rounded-lg bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200"
              >
                Điền số gợi ý
              </button>
              <button
                onClick={luuHoaDon}
                disabled={dangLuu}
                className="px-3.5 py-2.5 rounded-lg bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-125 disabled:opacity-40"
              >
                {dangLuu ? "Đang lưu..." : "Lưu số hóa đơn"}
              </button>
            </div>
          </>
        )}
      </div>
      )}

      {/*
        Kho hóa đơn cũ ở đây đã bỏ: phần Tra cứu ngay bên dưới trong cùng thẻ
        làm đúng việc đó mà đầy đủ hơn — có lọc, có tổng từng tờ, in được mẫu
        Chốt. Hai danh sách hóa đơn chồng nhau trên một màn hình chỉ làm người
        đọc phải so xem hai bên có khớp không.
      */}

      {phan === "chua" && (
      <>
      {/*
        ĐIỀU CHỈNH CÔNG NỢ — xuất nhầm đơn vị mà hóa đơn đã phát hành: cân
        lại ở lượt hóa đơn kế tiếp. Dùng chung biên đợt của màn hình này để
        chặn ghi vào đợt đã xuất. Xem `src/lib/dieuChinhCongNo.ts`.
      */}
      <DieuChinhCongNo
        transactions={transactions}
        products={products}
        partners={partners}
        dot={dot}
        hoaDon={hoaDon}
        onGhi={onGhiDieuChinh}
        onXoa={onXoaDieuChinh}
      />

      </>
      )}


      {phan === "chua" && (
      <button
        onClick={handleDownload}
        disabled={bang.dong.length === 0}
        className="px-5 py-3 rounded-xl bg-primary text-white text-[12px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" /> Tải file công nợ ({bang.tong.soDong}{" "}
        dòng · {dot.length} đợt)
      </button>
      )}
    </div>
  );
}

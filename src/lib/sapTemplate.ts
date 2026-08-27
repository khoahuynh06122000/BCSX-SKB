/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DỰNG FILE TEMPLATE ĐỂ XUẤT HÓA ĐƠN TRÊN HỆ THỐNG KHÁC
 *
 * Đây là tệp bút toán kế toán (FI journal entry) dạng bảng phẳng, đọc ra từ
 * tệp mẫu `TEMPLATE.xlsx` bộ phận gửi — mẫu đó chính là đơn công nợ giao
 * 21–22/08/2026, nên mọi con số dưới đây đã đối chiếu khớp từng đồng với số
 * app tính ra từ file BBGN cùng kỳ.
 *
 * MỖI ĐƠN VỊ LÀ MỘT CHỨNG TỪ, gồm ba loại dòng theo đúng thứ tự:
 *
 *   1. NỢ phải thu   — Posting Key `01`, tài khoản `AK0101`.
 *      Số tiền = tổng ĐÃ GỒM VAT. Không có số lượng, không có Customer.
 *   2. CÓ doanh thu  — Posting Key `50`, tài khoản `5111526200`.
 *      Mỗi mặt hàng một dòng, tiền TRƯỚC VAT, kèm số lượng và đơn vị tính.
 *   3. CÓ thuế GTGT  — Posting Key `50`, tài khoản `3331110000`.
 *      Số tiền = VAT; thêm Tax Amt và Tax Base.
 *
 * Bút toán phải cân: dòng 1 = tổng các dòng 2 + dòng 3. Lệch một đồng là hệ
 * thống bên kia từ chối cả chứng từ, nên VAT tính TRÊN TỔNG rồi mới cộng, chứ
 * không cộng VAT của từng dòng — làm kiểu kia thì sai số làm tròn dồn lại.
 *
 * NGÀY LÀ NGÀY LÀM VIỆC HÔM NAY, không phải ngày giao bia: tệp mẫu ghi
 * 23/08 trong khi hàng giao 21–22/08. Đây là ngày hạch toán chứng từ.
 *
 * Định dạng ô bám đúng tệp mẫu: ngày là CHUỖI `DDMMYYYY` (ghi thành số thì
 * 23082026 mất số 0 đứng đầu ở những ngày mùng 1–9), Posting Key là chuỗi để
 * giữ `01`, còn tiền và số lượng là số thật.
 */

import { VAT_RATE, type InvoiceUnit } from "./invoice";

/**
 * NĂM HÀNG TIÊU ĐỀ CỦA TỆP MẪU, chép nguyên xi, đủ cả 117 cột.
 *
 * Phải đủ 117 cột chứ không phải chỉ 29 cột ta dùng. Hệ thống bên kia đọc theo
 * VỊ TRÍ CỘT: BSCHL phải nằm ở cột N, WRBTR ở cột S, MENGE ở cột CN. Bản trước
 * xếp 29 trường ta dùng nằm liền nhau từ A tới AC, nên trường nào cũng lệch
 * cột và tệp bị từ chối ngay khi nạp lên.
 *
 * Sinh từ `D:\coder\_file-le\TEMPLATE đúng.xlsx`. Muốn dựng lại thì đọc năm
 * hàng đầu của tệp ấy ra mảng, đừng gõ tay.
 */
export const NHOM_TRUONG_1: string[] = [
  "DOCUMENT HEADER", "", "", "", "", "", "", "", "", "", "", "", "", "DOCUMENT LINE ITEM", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
];

export const NHOM_TRUONG_2: string[] = [
  "", "", "", "", "", "", "", "", "", "", "", "", "", "ACCOUNT", "", "", "", "", "DOCUMENT CURRENCY", "", "", "", "LOCAL CURRENCY", "", "", "PAYMENT/CASHFLOW", "", "", "COPA OBJECTS", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "CO OBJECTS", "", "", "REFERENCE/TEXT", "", "", "", "", "", "", "", "", "One-time Posting", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
];

export const MA_TRUONG_SAP: string[] = [
  "BLDAT", "BUDAT", "BLART", "BUKRS", "WAERS", "BUPLA", "XBLNR", "BKTXT", "VATBPN", "VATBPA", "VATBPR", "PAYER", "PAYERA", "BSCHL", "HKONT", "WW024_PA", "ALT_HKONT", "UMSKZ", "WRBTR", "MWSKZ", "WMWST", "FWBAS", "DMBTR", "MWSTS", "HWBAS", "VALUT", "ZTERM", "ZFBDT", "COPA_KNDNR", "COPA_ARTNR", "COPA_FKART", "COPA_KAUFN", "COPA_KDPOS", "COPA_RKAUFNR", "COPA_WERKS", "COPA_FKBER", "COPA_SEGMENT", "COPA_VKORG", "COPA_VTWEG", "COPA_KOSTL", "COPA_KSTRG", "COPA_PRCTR", "COPA_PPRCTR", "COPA_ARTNRG", "COPA_KDGRP", "COPA_KMBRND", "COPA_KUNRE", "COPA_KUNWE", "COPA_LAND1", "COPA_MATKL", "COPA_PARTNER", "COPA_PRODH", "COPA_SAISJ", "COPA_SAISO", "COPA_VKBUR", "COPA_VKGRP", "COPA_GEBIE", "COPA_BRSCH", "COPA_BZIRK", "COPA_KMVTNR", "COPA_KMWNHG", "COPA_KMZONE", "COPA_WW010", "COPA_WW020", "COPA_WW030", "COPA_WW040", "COPA_ABTNR", "COPA_AUART", "COPA_BWTAR", "COPA_KONDA", "COPA_KONDM", "COPA_KUNNR", "COPA_LGORT", "COPA_PLTYP", "COPA_VKAUS", "COPA_VSTEL", "COPA_WW050", "COPA_WW060", "COPA_WW070", "COPA_WW080", "COPA_AUGRU", "PRCTR", "KOSTL", "AUFNR", "ZUONR", "SGTXT", "FIPOS", "XREF1", "XREF2", "XREF3", "MATNR", "MENGE", "MEINS", "Title", "NAME1", "NAME_2", "NAME_3", "NAME_4", "ORT01", "COUNTRY", "REGION", "STCEG", "KOKRS", "GSBER", "SPART", "WW011", "VERTN", "VPTNR", "BVTYP", "XNEGP", "REBZG", "REBZJ", "REBZZ", "PO_NUMBER", "PO_ITEM", "FUNDS_CTR", "",
];

export const KIEU_TRUONG_SAP: string[] = [
  "DDMMYYYY", "DDMMYYYY", "C(2)", "C(4)", "C(5)", "C(6)", "C(16)", "C(25)", "(C30)", "(C30)", "(C30)", "(C30)", "(C30)", "C(2)", "C(017)", "C(6)", "C(010)", "C(1)", "DEC(13,2)\r\nXXXXXXXX.YY", "C(2)", "DEC(13,2)\r\nXXXXXXXX.YY", "DEC(13,2)\r\nXXXXXXXX.YY", "DEC(13,2)\r\nXXXXXXXX.YY", "DEC(13,2)\r\nXXXXXXXX.YY", "DEC(13,2)\r\nXXXXXXXX.YY", "DDMMYYYY", "C(4)", "DDMMYYYY", "C(10)", "C(40)", "C(4)", "C(10)", "Num(6)", "C(12)", "C(4)", "C(16)", "C(10)", "C(4)", "C(2)", "C(10)", "C(12)", "C(10)", "C(10)", "C(40)", "C(2)", "C(2)", "C(10)", "C(10)", "C(3)", "C(9)", "C(10)", "C(18)", "C(4)", "C(4)", "C(4)", "C(3)", "C(4)", "C(4)", "C(6)", "C(8)", "C(2)", "C(5)", "C(4)", "C(4)", "C(4)", "C(4)", "C(4)", "C(4)", "C(10)", "C(2)", "C(2)", "C(10)", "C(4)", "C(2)", "C(3)", "C(4)", "C(3)", "C(5)", "C(3)", "C(3)", "C(3)", "C(10)", "C(10)", "C(10)", "C(18)", "C(50)", "C(14)", "C(12)", "C(12)", "C(20)", "", "", "", "C(15)", "C(35)", "C(35)", "C(35)", "C(35)", "C(35)", "C(3)", "C(3)", "C(20)", "C(4)", "C(4)", "C(2)", "C(18)", "C(13)", "C(13)", "C(4)", "C(1)", "C(10)", "C(4)", "C(3)", "C(10)", "C(5)", "C(16)", "",
];

export const TEN_TRUONG_SAP: string[] = [
  "Document Date", "Posting Date", "Doc. type", "Comp. Code", "Currency", "Business Place", "Reference Doc", "Header Text", "VAT Business partner name", "VAT Business partner address", "VAT Business partner VAT Reg.N", "Payer/Payee", "Payer/Payee address", "Posting Key", "Account", "Trading Partner", "Alternative Reconciliatn A/C", "Special G/L Ind.", "Amount\r\n(Doc Curr)", "Tax Code", "Tax Amt\r\n(Doc Curr)", "Tax Base\r\n(Doc Curr)", "Amount\r\n(Local Curr)", "Tax Amt\r\n(Local Curr)", "Tax Base\r\n(Local Curr)", "Value Date", "Payment Term", "Baseline Date", "Customer", "Product", "Billing Type", "Sales Order", "Sales ord. item", "Order", "Plant", "COPA-Functional area (chiều phân tích doanh thu)", "Segment", "Sales Org.", "Distr. Channel", "Cost center", "Cost Object", "Profit Center", "Partner PC", "Generic Article", "Customer Group", "Brand", "Bill-to party", "Ship-to party", "Country", "Material Group", "Partner", "Prod.hierarchy", "Season Year", "Season", "Sales Office", "Sales Group", "Area", "Industry", "Sales District", "Sales employee", "Main material group", "Zone", "Sale Transaction Typ", "Discount Type", "Tender Type", "Financial Trasn.Type", "Department", "Sales doc. type", "Valuation Type", "Price Group", "Mat. Price Grp", "Sold-to party", "Stor. location", "Price List", "Usage", "Shipping Point", "Region", "Branch Code", "Return Reason", "Refund Code", "Order Reason", "Profit Center", "Cost center", "Order", "Assignment", "Text", "Commitment Item", "Reference Key 1", "Reference Key 2", "Reference Key 3", "Material", "Quantity", "Base Unit", "TITLE", "Name 1", "Name 2", "Name 3", "Name 4", "City", "COUNTRY", "REGION", "Tax Number ", "Controlling area", "Business area", "Division", "Khối", "Hợp đồng (Functional area)", "Partner (BP parner)", "Partner bank type", "Negative posting", "Document No. Relevant Invoice", "Fiscal Year of the Relevant Invoice", "Line Item in the Relevant Invoice", "PO Number", "PO Items", "Fund center", "",
];

/** Số cột của tệp mẫu. */
export const SO_COT_SAP = MA_TRUONG_SAP.length;

/**
 * Vị trí cột của một mã trường, ví dụ `viTriCot("WRBTR")` ra 18 (cột S).
 *
 * Tra theo mã chứ không viết số cứng: mã trường đọc là hiểu ngay, còn con số
 * thì phải đếm cột mới biết đúng sai.
 */
export function viTriCot(ma: string): number {
  const i = MA_TRUONG_SAP.indexOf(ma);
  if (i < 0) throw new Error(`Tệp mẫu SAP không có trường ${ma}`);
  return i;
}

/**
 * Những giá trị cố định, đọc từ tệp mẫu và từ phần chú thích ở sheet 1.
 *
 * Để sửa được vì mỗi kỳ hoặc mỗi công ty có thể khác: tất cả hiện thành ô nhập
 * trên màn hình, mặc định lấy đúng giá trị trong tệp mẫu.
 */
export interface CauHinhSap {
  /** `DR` — loại chứng từ. */
  docType: string;
  /** `S132` — mã công ty. */
  compCode: string;
  /** `VND`. */
  currency: string;
  /** `B182` — địa điểm kinh doanh. */
  businessPlace: string;
  /**
   * Mã thuế. Tệp mẫu ghi `O2`, còn chú thích ở sheet 1 ghi `TO2`.
   *
   * Hai chỗ nói khác nhau nên KHÔNG tự chọn hộ: mặc định lấy `O2` vì đó là giá
   * trị trong tệp thật đã dùng được, và để thành ô sửa được.
   */
  taxCode: string;
  /** `T000` — điều khoản thanh toán. */
  paymentTerm: string;
  /** `SX182001` — dùng cho cả hai cột Profit Center. */
  profitCenter: string;
  /** `AK0101` — tài khoản phải thu, cũng là mã Customer trên dòng doanh thu. */
  taiKhoanPhaiThu: string;
  /** `5111526200` — tài khoản doanh thu. */
  taiKhoanDoanhThu: string;
  /** `3331110000` — tài khoản thuế GTGT phải nộp. */
  taiKhoanThue: string;
  /** Tiền tố tiêu đề chứng từ, ví dụ `CN Beer SKB T8_`. */
  tieuDeChungTu: string;
}

export const CAU_HINH_MAC_DINH: CauHinhSap = {
  docType: "DR",
  compCode: "S026",
  currency: "VND",
  businessPlace: "B046",
  taxCode: "O2",
  paymentTerm: "T000",
  profitCenter: "SX182001",
  taiKhoanPhaiThu: "AK0101",
  taiKhoanDoanhThu: "5111526200",
  taiKhoanThue: "3331110000",
  tieuDeChungTu: "CN Beer SKB T8_",
};

/** Một dòng hàng đã gộp, đầu vào của phép dựng. */
export interface DongHangSap {
  /**
   * Đợt chốt của dòng này. Mỗi (đợt × đơn vị) là MỘT chứng từ, đúng bằng một
   * hóa đơn. Để trống thì cả kỳ gộp về một chứng từ cho mỗi đơn vị — đúng như
   * tệp mẫu, vốn là một đợt 21–22/08.
   */
  khoaDot?: string;
  maBp: string;
  donVi: string;
  tenHangHoa: string;
  dvt: InvoiceUnit;
  soLuong: number;
  /** Thành tiền TRƯỚC VAT, chặng SKB→DNC. */
  thanhTien: number;
}

/** Một ô của tệp: giữ nguyên kiểu để ghi ra Excel cho đúng. */
export type OSap = { t: "s" | "n"; v: string | number };

const chu = (v: string): OSap => ({ t: "s", v });
const so = (v: number): OSap => ({ t: "n", v });
const trong: OSap = { t: "s", v: "" };

/** `2026-08-23` → `23082026`. Rỗng nếu ngày không đọc được. */
export function ngayDDMMYYYY(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}${m[2]}${m[1]}` : "";
}

/**
 * Giới hạn ký tự khai ở hàng "kiểu dữ liệu" của tệp mẫu.
 *
 * CỐ Ý KHÔNG CẮT. Tệp mẫu bộ phận gửi ghi nguyên "Bia Golden Bridge Helles
 * Lager" (30 ký tự) vào ô khai C(25), và tệp đó dùng được. Cắt hộ thì tên bia
 * trên chứng từ khác với tên trong tệp anh vẫn làm tay, đối chiếu sau này lại
 * phải giải thích. Thay vào đó đếm lại và báo ra để người dùng tự quyết.
 */
export const GIOI_HAN_BKTXT = 25;
export const GIOI_HAN_SGTXT = 50;

export interface DungTepSapInput {
  dong: DongHangSap[];
  /** Ngày hạch toán, `yyyy-MM-dd`. Mặc định là hôm nay ở nơi gọi. */
  ngayChungTu: string;
  cauHinh: CauHinhSap;
}

export interface ChungTuSap {
  maBp: string;
  donVi: string;
  tieuDe: string;
  soDongHang: number;
  truocThue: number;
  vat: number;
  tongCong: number;
}

export interface TepSap {
  /** Các dòng dữ liệu, mỗi dòng 29 ô. */
  oDong: OSap[][];
  chungTu: ChungTuSap[];
  tong: { soChungTu: number; truocThue: number; vat: number; tongCong: number };
  /** Chữ dài hơn giới hạn khai trong tệp mẫu — không cắt, chỉ báo. */
  vuotDoDai: { truong: string; chu: string; doDai: number; gioiHan: number }[];
}

/**
 * Dựng toàn bộ dòng dữ liệu của tệp.
 *
 * Gộp theo mã BP: BNC có 20 bộ phận trong app nhưng với hệ thống kế toán vẫn
 * là một khách hàng, đúng như tệp mẫu chỉ có một chứng từ "BNC".
 */
export function dungTepSap(input: DungTepSapInput): TepSap {
  const { cauHinh: c } = input;
  const ngay = ngayDDMMYYYY(input.ngayChungTu);

  const theoDonVi = new Map<string, DongHangSap[]>();
  input.dong.forEach((d) => {
    const k = `${d.khoaDot ?? ""}|${d.maBp || d.donVi}`;
    const ds = theoDonVi.get(k);
    if (ds) ds.push(d);
    else theoDonVi.set(k, [d]);
  });

  const oDong: OSap[][] = [];
  const chungTu: ChungTuSap[] = [];

  /**
   * Dựng một dòng đủ 117 ô, đặt từng trường vào ĐÚNG CỘT của nó.
   *
   * Điền theo mã trường chứ không xếp liền nhau: hệ thống nạp lên đọc theo vị
   * trí cột, nên BSCHL phải nằm ở cột N chứ không phải cột thứ chín. Ô nào
   * không dùng thì để trống, đúng như tệp mẫu.
   */
  const khung = (
    tieuDe: string,
    postingKey: string,
    taiKhoan: string,
    tien: number,
    opt: {
      customer?: string;
      taxAmt?: number;
      taxBase?: number;
      soLuong?: number;
      dvt?: string;
    } = {},
  ): OSap[] => {
    const o: OSap[] = new Array(SO_COT_SAP).fill(trong);
    const dat = (ma: string, v: OSap) => {
      o[viTriCot(ma)] = v;
    };
    dat("BLDAT", chu(ngay));
    dat("BUDAT", chu(ngay));
    dat("BLART", chu(c.docType));
    dat("BUKRS", chu(c.compCode));
    dat("WAERS", chu(c.currency));
    dat("BUPLA", chu(c.businessPlace));
    // BKTXT khai C(25) nhưng tệp mẫu ghi nguyên cả câu, xem ghi chú ở dưới.
    dat("BKTXT", chu(tieuDe));
    dat("BSCHL", chu(postingKey));
    dat("HKONT", chu(taiKhoan));
    dat("WRBTR", so(tien));
    dat("MWSKZ", chu(c.taxCode));
    if (opt.taxAmt !== undefined) dat("WMWST", so(opt.taxAmt));
    if (opt.taxBase !== undefined) dat("FWBAS", so(opt.taxBase));
    // Cùng đồng tiền nên số tiền nội tệ bằng số tiền chứng từ.
    dat("DMBTR", so(tien));
    dat("ZTERM", chu(c.paymentTerm));
    dat("ZFBDT", chu(ngay));
    // Dòng nợ phải thu để trống ô khách hàng, dòng doanh thu và thuế thì điền.
    dat("COPA_KNDNR", chu(opt.customer ?? ""));
    dat("COPA_PRCTR", chu(c.profitCenter));
    dat("PRCTR", chu(c.profitCenter));
    dat("SGTXT", chu(tieuDe));
    if (opt.soLuong !== undefined) dat("MENGE", so(opt.soLuong));
    if (opt.dvt) dat("MEINS", chu(opt.dvt));
    return o;
  };

  theoDonVi.forEach((ds) => {
    const donVi = ds[0].donVi;
    const maBp = ds[0].maBp || donVi;
    const tieuDe = `${c.tieuDeChungTu}${donVi}`;

    // Làm tròn từng dòng về đồng trước, rồi mới cộng — cộng số lẻ rồi làm tròn
    // thì tổng lệch với các dòng chi tiết, và chứng từ không cân.
    const dongTron = ds.map((d) => ({ ...d, tien: Math.round(d.thanhTien) }));
    const truocThue = dongTron.reduce((s, d) => s + d.tien, 0);
    const vat = Math.round(truocThue * VAT_RATE);
    const tongCong = truocThue + vat;

    // 1. Nợ phải thu — tổng đã gồm thuế.
    oDong.push(khung(tieuDe, "01", c.taiKhoanPhaiThu, tongCong));

    // 2. Có doanh thu — mỗi mặt hàng một dòng.
    dongTron.forEach((d) => {
      oDong.push(
        khung(d.tenHangHoa, "50", c.taiKhoanDoanhThu, d.tien, {
          customer: c.taiKhoanPhaiThu,
          soLuong: d.soLuong,
          dvt: d.dvt,
        }),
      );
    });

    // 3. Có thuế GTGT.
    oDong.push(
      khung(tieuDe, "50", c.taiKhoanThue, vat, {
        customer: c.taiKhoanPhaiThu,
        taxAmt: vat,
        taxBase: truocThue,
      }),
    );

    chungTu.push({
      maBp,
      donVi,
      tieuDe,
      soDongHang: dongTron.length,
      truocThue,
      vat,
      tongCong,
    });
  });

  const vuotDoDai: TepSap["vuotDoDai"] = [];
  const daBao = new Set<string>();
  const soatDoDai = (chuNoiDung: string) => {
    if (chuNoiDung.length <= GIOI_HAN_BKTXT || daBao.has(chuNoiDung)) return;
    daBao.add(chuNoiDung);
    vuotDoDai.push({
      truong: "BKTXT",
      chu: chuNoiDung,
      doDai: chuNoiDung.length,
      gioiHan: GIOI_HAN_BKTXT,
    });
  };
  chungTu.forEach((x) => soatDoDai(x.tieuDe));
  input.dong.forEach((d) => soatDoDai(d.tenHangHoa));

  return {
    oDong,
    chungTu,
    vuotDoDai,
    tong: {
      soChungTu: chungTu.length,
      truocThue: chungTu.reduce((s, x) => s + x.truocThue, 0),
      vat: chungTu.reduce((s, x) => s + x.vat, 0),
      tongCong: chungTu.reduce((s, x) => s + x.tongCong, 0),
    },
  };
}

/**
 * Kiểm bút toán có cân không.
 *
 * Dòng Nợ phải bằng tổng các dòng Có. Đây là điều kiện hệ thống bên kia bắt
 * buộc; lệch thì nó từ chối cả chứng từ mà không nói rõ dòng nào sai.
 */
export function kiemCanChungTu(t: TepSap): { maBp: string; lech: number }[] {
  return t.chungTu
    .map((x) => ({ maBp: x.maBp, lech: x.tongCong - (x.truocThue + x.vat) }))
    .filter((x) => x.lech !== 0);
}

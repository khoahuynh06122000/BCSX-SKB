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

/** 29 mã trường của tệp mẫu, đúng thứ tự cột A→AC. */
export const MA_TRUONG_SAP: string[] = [
  "BLDAT", "BUDAT", "BLART", "BUKRS", "WAERS", "BUPLA", "XBLNR", "BKTXT",
  "BSCHL", "HKONT", "WW024_PA", "ALT_HKONT", "UMSKZ", "WRBTR", "MWSKZ",
  "WMWST", "FWBAS", "DMBTR", "MWSTS", "HWBAS", "VALUT", "ZTERM", "ZFBDT",
  "COPA_KNDNR", "COPA_PRCTR", "PRCTR", "SGTXT", "MENGE", "MEINS",
];

/** Hàng 4 của tệp mẫu — kiểu dữ liệu từng cột, chép nguyên. */
export const KIEU_TRUONG_SAP: string[] = [
  "DDMMYYYY", "DDMMYYYY", "C(2)", "C(4)", "C(5)", "C(6)", "C(16)", "C(25)",
  "C(2)", "C(017)", "C(6)", "C(010)", "C(1)", "DEC(13,2)\r\nXXXXXXXX.YY",
  "C(2)", "DEC(13,2)\r\nXXXXXXXX.YY", "DEC(13,2)\r\nXXXXXXXX.YY",
  "DEC(13,2)\r\nXXXXXXXX.YY", "DEC(13,2)\r\nXXXXXXXX.YY",
  "DEC(13,2)\r\nXXXXXXXX.YY", "DDMMYYYY", "C(4)", "DDMMYYYY", "C(10)",
  "C(10)", "C(10)", "C(50)", "", "",
];

/** Hàng 5 của tệp mẫu — tên tiếng Anh của từng cột. */
export const TEN_TRUONG_SAP: string[] = [
  "Document Date", "Posting Date", "Doc. type", "Comp. Code", "Currency",
  "Business Place", "Reference Doc", "Header Text", "Posting Key", "Account",
  "Trading Partner", "Alternative Reconciliatn A/C", "Special G/L Ind.",
  "Amount\r\n(Doc Curr)", "Tax Code", "Tax Amt\r\n(Doc Curr)",
  "Tax Base\r\n(Doc Curr)", "Amount\r\n(Local Curr)", "Tax Amt\r\n(Local Curr)",
  "Tax Base\r\n(Local Curr)", "Value Date", "Payment Term", "Baseline Date",
  "Customer", "Profit Center", "Profit Center", "Text", "Quantity", "Base Unit",
];

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
  compCode: "S132",
  currency: "VND",
  businessPlace: "B182",
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
  ): OSap[] => [
    chu(ngay), // BLDAT
    chu(ngay), // BUDAT
    chu(c.docType),
    chu(c.compCode),
    chu(c.currency),
    chu(c.businessPlace),
    trong, // XBLNR — tệp mẫu để trống
    chu(tieuDe), // BKTXT — khai C(25) nhưng tệp mẫu ghi nguyên, xem ghi chú
    chu(postingKey),
    chu(taiKhoan),
    trong, // WW024_PA
    trong, // ALT_HKONT
    trong, // UMSKZ
    so(tien), // WRBTR
    chu(c.taxCode),
    opt.taxAmt === undefined ? trong : so(opt.taxAmt), // WMWST
    opt.taxBase === undefined ? trong : so(opt.taxBase), // FWBAS
    so(tien), // DMBTR — cùng đồng tiền nên bằng WRBTR
    trong, // MWSTS
    trong, // HWBAS
    trong, // VALUT
    chu(c.paymentTerm),
    chu(ngay), // ZFBDT
    opt.customer ? chu(opt.customer) : trong, // COPA_KNDNR
    chu(c.profitCenter),
    chu(c.profitCenter),
    chu(tieuDe), // SGTXT
    opt.soLuong === undefined ? trong : so(opt.soLuong), // MENGE
    opt.dvt ? chu(opt.dvt) : trong, // MEINS
  ];

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

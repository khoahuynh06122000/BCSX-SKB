/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỔ SỐ PHIẾU — MỖI PHIẾU NHẬP / XUẤT MỘT SỐ, KHÔNG ĐỔI
 *
 * QUY TẮC ĐANG DÙNG (Khoa chốt 15/09/2026):
 *
 *   PN-YYMMDD-NN       →  phiếu NHẬP kho          (PN-260911-01)
 *   PX-YYMMDD-NN       →  phiếu XUẤT kho          (PX-260911-01)
 *   PN-YYMMDD-NN-HUY   →  HỦY một phiếu nhập
 *   PX-YYMMDD-NN-HUY   →  HỦY một phiếu xuất
 *
 * VÌ SAO ĐỔI. Trước đây một tờ phiếu nhập mang HAI số khác nhau: mã phiếu in
 * trên giấy là `PN-260911-01` (xem `slip.ts`), còn sổ số phiếu cấp riêng một số
 * `51260001`. Hai số cho cùng một tờ giấy thì người đối chiếu phải nhớ số nào
 * đi với số nào, và hỏi "phiếu nào" là câu không có một câu trả lời.
 *
 * Nay sổ lấy ĐÚNG mã phiếu làm số phiếu. Phiếu xuất trước giờ chưa có mã nào
 * in ra giấy nên nhận một mã đối xứng `PX-`.
 *
 * SỐ PHIẾU HỦY BÁM THEO SỐ GỐC, không chạy dãy riêng: hủy `PN-260911-01` thì
 * phiếu hủy là `PN-260911-01-HUY`. Nhìn số hủy là biết ngay nó hủy phiếu nào,
 * không phải mở ra xem. Đổi lại, mỗi phiếu chỉ hủy được MỘT LẦN — đúng về
 * nghiệp vụ, vì phiếu đã hủy thì không còn gì để hủy nữa.
 *
 * CÒN ĐỌC ĐƯỢC SỐ KIỂU CŨ (`51260001`, `52260001`, `60…`, `61…`). Những số đã
 * cấp trước ngày đổi vẫn nằm trong sổ và vẫn in trên giấy đã gửi đi — sửa lại
 * số của một chứng từ đã phát hành là tự làm mất khả năng đối chiếu. Nên sổ
 * đọc được cả hai kiểu, chỉ cấp mới theo kiểu mới.
 *
 * PHIẾU HỦY GHI ÂM SỐ LƯỢNG của phiếu gốc. Không xoá phiếu gốc: chứng từ đã in
 * ra giấy và đã gửi đi thì phải còn dấu vết, xoá đi là sổ nhảy số.
 *
 * VÌ SAO PHẢI CÓ SỔ NÀY. Trước đây phiếu xuất kho KHÔNG có số nào được lưu — con
 * số "Phiếu 298" trên màn hình chỉ là số đếm tính lại mỗi lần tải trang, nên xoá
 * một đơn cũ là mọi số phía sau nhảy hết. Một số chứng từ mà đổi được thì không
 * đối chiếu với ai được.
 *
 * NĂM LẤY THEO NGÀY CHỨNG TỪ (Document Date), không lấy theo ngày ghi lên hệ
 * thống. Phiếu giao ngày 30/12/2026 mà tới 02/01/2027 mới nhập vào app thì vẫn
 * là chứng từ của năm 2026 và phải nằm trong dãy số 2026 — đánh nó thành
 * 51270001 là năm sau có hai phiếu số 0001, một của tháng 12 năm trước.
 *
 * THỨ TỰ ĐẾM LẠI TỪ 0001 MỖI NĂM, và đếm riêng từng đầu số.
 *
 * Toàn bộ tệp này là phép tính thuần, không đụng Firestore — phần cấp số có
 * khoá chống trùng nằm ở `src/lib/soPhieuKho.ts`.
 */

/** Đầu số hai chữ số. */
export const DAU_SO = {
  NHAP: "51",
  HUY_NHAP: "52",
  XUAT: "60",
  HUY_XUAT: "61",
} as const;

export type LoaiPhieu = keyof typeof DAU_SO;

/** Mã của kiểu đánh số ĐANG DÙNG. Khớp `SLIP_PREFIX` bên `slip.ts`. */
export const MA_LOAI = {
  NHAP: "PN",
  XUAT: "PX",
} as const;

/** Đuôi gắn thêm để thành số phiếu hủy. */
export const DUOI_HUY = "-HUY";

/** Mã → loại phiếu gốc. */
const LOAI_CUA_MA: Record<string, LoaiPhieu> = {
  [MA_LOAI.NHAP]: "NHAP",
  [MA_LOAI.XUAT]: "XUAT",
};

/** Đầu số nào hủy đầu số nào. Chỉ dùng cho số kiểu cũ. */
const HUY_CUA: Record<string, string> = {
  [DAU_SO.NHAP]: DAU_SO.HUY_NHAP,
  [DAU_SO.XUAT]: DAU_SO.HUY_XUAT,
};

/** Đầu số → loại phiếu. */
const LOAI_CUA_DAU_SO: Record<string, LoaiPhieu> = {
  [DAU_SO.NHAP]: "NHAP",
  [DAU_SO.HUY_NHAP]: "HUY_NHAP",
  [DAU_SO.XUAT]: "XUAT",
  [DAU_SO.HUY_XUAT]: "HUY_XUAT",
};

/** Tên loại phiếu để hiện lên màn hình. */
export const TEN_LOAI: Record<LoaiPhieu, string> = {
  NHAP: "Phiếu nhập kho",
  XUAT: "Phiếu xuất kho",
  HUY_NHAP: "Hủy phiếu nhập",
  HUY_XUAT: "Hủy phiếu xuất",
};

/** Loại này có phải phiếu hủy không. */
export function laLoaiHuy(loai: LoaiPhieu): boolean {
  return loai === "HUY_NHAP" || loai === "HUY_XUAT";
}

/**
 * Ngày `yyyy-MM-dd` → `yyMMdd` để nhét vào số phiếu.
 *
 * Cắt chuỗi chứ không đi qua `new Date()`: chuỗi `yyyy-MM-dd` đưa vào `Date` bị
 * hiểu là giờ UTC, in ra theo giờ Việt Nam có thể LÙI MỘT NGÀY. Số phiếu lệch
 * ngày là lỗi không ai nhìn ra cho tới lúc đối chiếu giấy tờ.
 */
export function maNgay(ngay: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ngay ?? ""));
  return m ? `${m[1].slice(2)}${m[2]}${m[3]}` : "";
}

/**
 * Ghép số phiếu kiểu đang dùng: `PN-260911-01`.
 *
 * Thứ tự đệm 0 cho đủ 2 chữ số. Quá 99 phiếu một ngày thì số DÀI RA thành 3
 * chữ số chứ không quay về 01 — số trùng nhau là hỏng cả sổ, còn số dài hơn
 * một chữ số thì chỉ là trông lạ mắt.
 */
export function dungSoPhieu(
  maLoai: string,
  ngayMa: string,
  thuTu: number,
): string {
  const n = Math.max(1, Math.trunc(Number(thuTu) || 0));
  return `${maLoai}-${ngayMa}-${String(n).padStart(2, "0")}`;
}

/**
 * Ghép số phiếu KIỂU CŨ: đầu số + năm + 4 chữ số thứ tự.
 *
 * Không dùng để cấp số mới nữa. Giữ lại vì phần dò chỗ đứt quãng phải dựng lại
 * được số của những phiếu cũ đã biến mất khỏi sổ.
 */
export function dungSoPhieuCu(
  dauSo: string,
  namHai: string,
  thuTu: number,
): string {
  const n = Math.max(1, Math.trunc(Number(thuTu) || 0));
  return `${dauSo}${namHai}${String(n).padStart(4, "0")}`;
}

export interface SoPhieuTachRa {
  loai: LoaiPhieu;
  /** `moi` = `PN-260911-01`; `cu` = `51260001`. */
  kieu: "moi" | "cu";
  /** `PN`/`PX` với số kiểu mới, `51`/`52`/`60`/`61` với số kiểu cũ. */
  dauSo: string;
  /** Hai chữ số năm — có ở cả hai kiểu, để lọc và xếp theo năm. */
  namHai: string;
  /** `yyMMdd`. Chuỗi rỗng với số kiểu cũ (số cũ chỉ đếm theo năm). */
  ngayMa: string;
  /** Thứ tự trong DÃY ĐẾM: trong ngày với kiểu mới, trong năm với kiểu cũ. */
  thuTu: number;
  /**
   * Khoá dãy đếm. Các số cùng khoá này chạy liên tục 1, 2, 3…
   *
   * Nhờ nó mà phần dò đứt quãng và bộ đếm không cần biết số thuộc kiểu nào.
   */
  kyDem: string;
}

const RE_MOI = /^(PN|PX)-(\d{6})-(\d{2,})(-HUY)?$/;
const RE_CU = /^(\d{2})(\d{2})(\d{4,})$/;

/** Tách một số phiếu ra từng phần. Trả `null` nếu không đúng khuôn nào cả. */
export function docSoPhieu(so: string): SoPhieuTachRa | null {
  const s = String(so ?? "").trim().toUpperCase();

  const m = RE_MOI.exec(s);
  if (m) {
    const goc = LOAI_CUA_MA[m[1]];
    if (!goc) return null;
    const thuTu = Number(m[3]);
    if (!Number.isFinite(thuTu) || thuTu <= 0) return null;
    const laHuy = !!m[4];
    return {
      loai: laHuy ? (loaiHuyCua(goc) as LoaiPhieu) : goc,
      kieu: "moi",
      dauSo: m[1],
      namHai: m[2].slice(0, 2),
      ngayMa: m[2],
      thuTu,
      kyDem: `${m[1]}|${m[2]}`,
    };
  }

  const c = RE_CU.exec(s);
  if (!c) return null;
  const loai = LOAI_CUA_DAU_SO[c[1]];
  if (!loai) return null;
  const thuTu = Number(c[3]);
  if (!Number.isFinite(thuTu) || thuTu <= 0) return null;
  return {
    loai,
    kieu: "cu",
    dauSo: c[1],
    namHai: c[2],
    ngayMa: "",
    thuTu,
    kyDem: `${c[1]}|${c[2]}`,
  };
}

/** Dựng lại số từ khoá dãy đếm và thứ tự — ngược với `docSoPhieu`. */
export function dungLaiSo(kyDem: string, thuTu: number): string {
  const [a, b] = String(kyDem ?? "").split("|");
  if (a === MA_LOAI.NHAP || a === MA_LOAI.XUAT) return dungSoPhieu(a, b, thuTu);
  return dungSoPhieuCu(a, b, thuTu);
}

/**
 * Số phiếu hủy của một phiếu gốc.
 *
 * Kiểu mới thì gắn thêm đuôi `-HUY`; kiểu cũ thì đổi đầu số như quy tắc cũ —
 * phiếu cấp theo kiểu nào thì hủy theo kiểu ấy, để số hủy còn nhìn ra số gốc.
 *
 * Trả `null` khi phiếu gốc không hủy được: số sai khuôn, hoặc chính nó đã là
 * phiếu hủy (hủy một phiếu hủy thì về đúng phiếu gốc, vô nghĩa).
 */
export function soPhieuHuy(soGoc: string): string | null {
  const p = docSoPhieu(soGoc);
  if (!p) return null;
  if (laLoaiHuy(p.loai)) return null;

  if (p.kieu === "moi") {
    return `${dungSoPhieu(p.dauSo, p.ngayMa, p.thuTu)}${DUOI_HUY}`;
  }
  const dauSoHuy = HUY_CUA[p.dauSo];
  if (!dauSoHuy) return null;
  return dungSoPhieuCu(dauSoHuy, p.namHai, p.thuTu);
}

/** Một dòng trong sổ số phiếu. Khoá tài liệu Firestore = `soPhieu`. */
export interface GhiSoPhieu {
  /** = soPhieu. */
  id: string;
  soPhieu: string;
  loai: LoaiPhieu;
  /**
   * NGÀY CHỨNG TỪ — ngày xuất/nhập kho ghi trên biên bản giấy. `yyyy-MM-dd`.
   */
  documentDate: string;
  /**
   * NGÀY GHI LÊN HỆ THỐNG — thời điểm thật sự bấm lưu trong app. ISO đầy đủ.
   *
   * Hai ngày này lệch nhau là chuyện bình thường (biên bản ngày 30, ba hôm sau
   * mới nhập), và chính khoảng lệch đó là thứ cần theo dõi.
   */
  enteredOn: string;
  /**
   * Chứng từ gốc bên dưới: `slipCode` với phiếu nhập, `referenceGroupId` với
   * phiếu xuất. Để mở ra xem chi tiết hàng hóa.
   */
  nguon: string;
  /** Tên đơn vị giao/nhận, chỉ để đọc. */
  donVi?: string;
  soDong: number;
  /** Tổng số lượng. Phiếu hủy ghi ÂM. */
  soLuong: number;
  /** `hieu_luc` hoặc `da_huy`. Phiếu hủy luôn `hieu_luc`. */
  trangThai: "hieu_luc" | "da_huy";
  /** Số phiếu đã hủy nó (chỉ có ở phiếu gốc đã bị hủy). */
  huyBoi?: string;
  /** Số phiếu gốc mà nó hủy (chỉ có ở phiếu hủy). */
  huyCho?: string;
  lyDoHuy?: string;
  createdBy: string;
}

/**
 * Thứ tự kế tiếp suy từ những số đã có trong sổ.
 *
 * Chỉ là PHƯƠNG ÁN DỰ PHÒNG cho lúc bộ đếm chưa dựng hoặc bị lệch. Cấp số thật
 * phải đi qua bộ đếm có khoá (`soPhieuKho.ts`): tính max+1 từ danh sách đang
 * cầm trên tay thì hai người bấm lưu cùng lúc sẽ ra cùng một số.
 */
export function thuTuKeTiep(ds: GhiSoPhieu[], kyDem: string): number {
  let max = 0;
  (ds || []).forEach((g) => {
    const p = docSoPhieu(g?.soPhieu);
    if (p && p.kyDem === kyDem && p.thuTu > max) max = p.thuTu;
  });
  return max + 1;
}

/** Vì sao phiếu này chưa hủy được. Chuỗi rỗng = hủy được. */
export function canTroHuy(g: GhiSoPhieu | undefined | null): string {
  if (!g) return "Không tìm thấy phiếu này trong sổ.";
  if (laLoaiHuy(g.loai))
    return "Đây đã là phiếu hủy. Hủy một phiếu hủy thì quay về phiếu gốc, không có ý nghĩa.";
  if (g.trangThai === "da_huy")
    return `Phiếu này đã bị hủy bởi ${g.huyBoi || "một phiếu hủy"}.`;
  if (!soPhieuHuy(g.soPhieu)) return "Số phiếu không đúng khuôn, không sinh được số hủy.";
  return "";
}

/** Loại của phiếu hủy tương ứng. */
export function loaiHuyCua(loai: LoaiPhieu): LoaiPhieu | null {
  if (loai === "NHAP") return "HUY_NHAP";
  if (loai === "XUAT") return "HUY_XUAT";
  return null;
}

/**
 * Dựng dòng sổ cho phiếu hủy, từ phiếu gốc.
 *
 * Số lượng lấy ÂM của phiếu gốc — đó là cả ý nghĩa của phiếu hủy: cộng hai
 * phiếu lại thì bằng 0, tồn kho không đổi.
 */
export function dungPhieuHuy(
  goc: GhiSoPhieu,
  opt: { documentDate: string; enteredOn: string; createdBy: string; lyDo?: string },
): GhiSoPhieu | null {
  const so = soPhieuHuy(goc.soPhieu);
  const loai = loaiHuyCua(goc.loai);
  if (!so || !loai) return null;
  return {
    id: so,
    soPhieu: so,
    loai,
    documentDate: opt.documentDate || goc.documentDate,
    enteredOn: opt.enteredOn,
    nguon: goc.nguon,
    donVi: goc.donVi,
    soDong: goc.soDong,
    soLuong: -Math.abs(Number(goc.soLuong) || 0),
    trangThai: "hieu_luc",
    huyCho: goc.soPhieu,
    lyDoHuy: opt.lyDo,
    createdBy: opt.createdBy,
  };
}

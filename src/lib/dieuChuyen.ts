/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FILE ĐIỀU CHUYỂN BIA VỀ KHO CỦA TỪNG ĐIỂM BÁN
 *
 * Bia xuất cho BNC thì rời kho tổng, nhưng trong hệ thống nó vẫn phải nằm ở
 * đúng kho của quán đã nhận. Việc chuyển kho đó làm bằng một tệp nạp lên hệ
 * thống, dùng movement type **Z55** (chuyển kho), mỗi dòng là một lần chuyển.
 *
 * CHỈ ĐƠN NỘI BỘ. Ba phần còn lại của BNC — Ngoại giao, HTKD, Chi phí khác —
 * không có kho riêng nên không điều chuyển; xem `nhomBNC.ts`.
 *
 * Dựng theo tệp mẫu `D:\coder\_file-le\file điều chuyển.xlsx`: sheet "file đc"
 * là dữ liệu, Sheet3 giải thích 28 cột, Sheet4 là mã kho từng điểm. Tệp mẫu đã
 * được nhúng vào app ở `src/assets/mau-dieu-chuyen.xlsx` và tệp xuất ra là
 * chính tệp ấy được điền thêm dữ liệu, nên định dạng giữ nguyên xi.
 *
 * MỖI LẦN XUẤT LÀ MỘT DÒNG, KHÔNG CỘNG DỒN CẢ NGÀY. Trong tệp thật của bộ phận,
 * cùng một ngày + cùng một điểm + cùng một mã vật tư xuất hiện hai dòng (ví dụ
 * 28.07 LHB mã 10174040) — nghĩa là mỗi chuyến giao đứng riêng. Cộng dồn lại thì
 * gọn hơn nhưng không còn đối chiếu được với biên bản từng chuyến.
 *
 * KHÔNG ĐOÁN MÃ KHO. Điểm bán chưa có mã kho thì KHÔNG xuất dòng nào cho nó và
 * phải hiện ra để người dùng biết; đoán một mã kho là chuyển bia vào kho của
 * quán khác, và sai đó không lộ ra ở bất kỳ tổng nào.
 */

import type { Product, Transaction } from "../types";
import { nhomCuaBoPhan } from "./nhomBNC";

/** Mã kho nhận hàng của một điểm bán. */
export interface KhoDiemBan {
  /** Receipt Plant — cột Z. */
  plant: string;
  /** Receipt Storage Location — cột AA. */
  slog: string;
  /**
   * Chữ viết trong tiêu đề chứng từ: `ĐC Bia <viết> <dd.MM>`.
   *
   * Lấy đúng chữ bộ phận đang dùng trong tệp thật, kể cả khi không nhất quán
   * (LHB, 4SS, KAVKAZ, HỘI AN, GA 10) — người bên kia đọc tiêu đề để biết
   * chứng từ của quán nào, đổi cách viết là họ phải đoán lại.
   */
  viet: string;
}

/**
 * BẢNG MÃ KHO CỦA TỪNG ĐIỂM BÁN — theo Sheet4 của tệp mẫu.
 *
 * Cặp (plant, slog) mới xác định được một điểm, không phải riêng plant: Cầu
 * Vàng và Ga 10 dùng chung plant 1050, khác nhau ở slog (2037 / 2036). Hội An
 * và Cổng Thành 1 cũng chung plant 1052.
 *
 * Năm điểm KHÔNG có trong Sheet4 — Bulgogi, Rosa Gà Rán, Arapang, Lâu Đài,
 * Shushi Rosa — do bộ phận gửi bổ sung ngày 27/08/2026. Ghi ra đây để sau này biết chúng
 * không đến từ Sheet4 mà đến từ đâu.
 *
 * Điểm nào chưa có trong bảng này thì đơn của nó bị giữ lại và báo ra, chứ
 * không xuất bừa — xem `CHUA_CO_MA_KHO` ngay dưới.
 */
export const KHO_DIEM_BAN: Record<string, KhoDiemBan> = {
  "AD0103-1901": { plant: "2329", slog: "1000", viet: "1901" },
  "AD0103-LHB": { plant: "1048", slog: "2025", viet: "LHB" },
  "AD0103-PLAZA": { plant: "1035", slog: "2007", viet: "PLAZA" },
  "AD0103-KAV": { plant: "1040", slog: "2017", viet: "KAVKAZ" },
  "AD0103-4M": { plant: "2228", slog: "2001", viet: "4SS" },
  "AD0103-HOIAN": { plant: "1052", slog: "2049", viet: "HỘI AN" },
  "AD0103-CT1": { plant: "1052", slog: "2044", viet: "CỔNG THÀNH 1" },
  "AD0103-B8": { plant: "1038", slog: "2013", viet: "B8" },
  "AD0103-TAIGA": { plant: "1983", slog: "2202", viet: "TAIGA" },
  "AD0103-GASTRO": { plant: "2218", slog: "2025", viet: "GASTROBUP" },
  "AD0103-CV": { plant: "1050", slog: "2037", viet: "CV" },
  "AD0103-GA10": { plant: "1050", slog: "2036", viet: "GA 10" },
  "AD0103-SBVH": { plant: "2255", slog: "2001", viet: "SBVH" },
  "AD0103-BULGOGI": { plant: "2336", slog: "1000", viet: "BULGOGI" },
  "AD0103-ROSA": { plant: "2116", slog: "2001", viet: "ROSA GÀ RÁN" },
  "AD0103-ARAPANG": { plant: "1032", slog: "2001", viet: "ARAPANG" },
  "AD0103-LAUDAI": { plant: "2118", slog: "2000", viet: "LÂU ĐÀI" },
  "AD0103-SUSHI": { plant: "2117", slog: "2000", viet: "SHUSHI ROSA" },
};

/**
 * ĐIỂM BÁN NỘI BỘ ĐANG CHỜ BỘ PHẬN CẤP MÃ KHO.
 *
 * Ghi ra thành danh sách chứ không để nó lặng lẽ thiếu: bộ kiểm đối chiếu danh
 * mục đơn vị với bảng mã kho, điểm nào thiếu mà KHÔNG có tên ở đây thì bộ kiểm
 * đỏ. Nhờ vậy mở quán mới mà quên xin mã kho là biết ngay, còn quán đang chờ
 * mã thì không làm bộ kiểm đỏ oan.
 *
 * Xin được mã thì thêm vào `KHO_DIEM_BAN` và xoá tên khỏi đây.
 *
 * Hiện đang rỗng: cả 18 điểm bán Nội bộ đều có mã kho.
 */
export const CHUA_CO_MA_KHO: string[] = [];

/**
 * Những giá trị cố định của tệp, theo đúng phần giải thích ở Sheet3.
 *
 * Để thành một bảng chứ không rải rác trong mã: bộ phận đổi một mã nào đó thì
 * sửa một chỗ, và đọc bảng này là biết tệp đang khai những gì.
 */
export const CO_DINH = {
  /** Executable Action — cột C. `A07` là Goods issue. */
  execAction: "A07",
  /** Loại chứng từ — cột D. `R10` là Others. */
  loaiChungTu: "R10",
  /** Movement type — cột F. `Z55` là chuyển kho. */
  movement: "Z55",
  /** Cơ sở xuất hàng — cột M. Kho tổng. */
  plantXuat: "1263",
  /** Kho xuất hàng — cột N. */
  khoXuat: "2143",
  /** Mã lô — cột O, và Batch nhận hàng — cột AB. */
  batch: "1368",
} as const;

/** Số cột của tệp mẫu (A..AB). */
export const SO_COT_DC = 28;

/** Cột nào ở vị trí nào, đếm từ 0. Theo hàng tiêu đề của tệp mẫu. */
export const COT = {
  ngayChungTu: 0,
  ngayNhapXuat: 1,
  execAction: 2,
  loaiChungTu: 3,
  tieuDe: 4,
  movement: 5,
  maVatTu: 9,
  soLuong: 10,
  plantXuat: 12,
  khoXuat: 13,
  maLo: 14,
  tieuDe2: 16,
  plantNhan: 25,
  slogNhan: 26,
  batchNhan: 27,
} as const;

export type ODc = { t: "s"; v: string } | { t: "n"; v: number };

/** Một dòng điều chuyển, dạng đọc được để bày lên màn hình trước khi tải. */
export interface DongDieuChuyen {
  /** `yyyy-MM-dd`. */
  ngay: string;
  partnerId: string;
  diemBan: string;
  maVatTu: string;
  tenHang: string;
  soLuong: number;
  dvt: string;
  plant: string;
  slog: string;
  tieuDe: string;
}

/** Điểm bán hoặc mặt hàng bị giữ lại vì thiếu dữ liệu để điều chuyển. */
export interface MucThieu {
  ten: string;
  /** Số dòng lẽ ra phải có nếu đủ dữ liệu. */
  soDong: number;
  /** Tổng số lượng bị giữ lại, để biết mức độ. */
  soLuong: number;
}

export interface FileDieuChuyen {
  dong: DongDieuChuyen[];
  /** Dữ liệu 28 cột cho từng dòng, xếp đúng thứ tự `dong`. */
  oDong: ODc[][];
  /**
   * Dòng nào tô nền nhạt, xếp đúng thứ tự `dong`.
   *
   * So le theo CHỨNG TỪ chứ không theo dòng: một chứng từ có mấy mặt hàng thì
   * mấy dòng liền nhau, tô so le từng dòng thì cắt ngang giữa chứng từ và không
   * còn nhìn ra đâu là hết một chứng từ.
   */
  toNen: boolean[];
  /** Điểm bán chưa có mã kho trong `KHO_DIEM_BAN`. */
  thieuMaKho: MucThieu[];
  /** Mặt hàng chưa có mã vật tư trong danh mục. */
  thieuMaVatTu: MucThieu[];
  /**
   * Bộ phận BNC bị loại vì KHÔNG thuộc Nội bộ, gom theo phần.
   *
   * Loại đúng theo thiết kế, nhưng phải nói ra. Tháng 8/2026 đã mất công dò:
   * "Shushi Rosa" trong sheet T Kho được gán vào Chi phí khác nên biến mất khỏi
   * tệp mà không chỗ nào nhắc — nhìn tệp thì tưởng app bỏ sót.
   */
  ngoaiNoiBo: MucThieu[];
  /** Số đơn (chuyến giao) đã gom được. */
  soDon: number;
}

export interface DungFileDieuChuyenInput {
  transactions: Transaction[];
  products: Product[];
  /** `yyyy-MM-dd`, để trống là không chặn. */
  tuNgay: string;
  denNgay: string;
  /** Chỉ một điểm bán; để trống là lấy hết điểm bán Nội bộ. */
  boPhan?: string;
  /** Tên điểm bán theo mã, lấy từ danh mục đơn vị. */
  tenBoPhan?: Map<string, string>;
}

const ngayCua = (iso: string): string => String(iso ?? "").slice(0, 10);

/**
 * `2026-08-27` → `27.08.2026`, đúng định dạng Sheet3 yêu cầu.
 *
 * Cắt chuỗi chứ không dựng `Date`: dựng Date rồi format lại thì lệch một ngày ở
 * hai đầu biên vì múi giờ, mà ngày chứng từ lệch một ngày là sai kỳ hạch toán.
 */
export function ngayDDMMYYYY(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

/** Tiêu đề chứng từ: `ĐC Bia LHB 28.07`, đúng công thức trong tệp mẫu. */
export function tieuDeChungTu(viet: string, iso: string): string {
  return `ĐC Bia ${viet} ${ngayDDMMYYYY(iso).slice(0, 5)}`;
}

const chu = (v: string): ODc => ({ t: "s", v });
const so = (v: number): ODc => ({ t: "n", v });

/** Dựng một dòng đủ 28 ô, đặt từng giá trị vào đúng cột của nó. */
export function khungDong(d: DongDieuChuyen): ODc[] {
  const o: ODc[] = new Array(SO_COT_DC).fill(chu(""));
  const ngay = ngayDDMMYYYY(d.ngay);
  o[COT.ngayChungTu] = chu(ngay);
  o[COT.ngayNhapXuat] = chu(ngay);
  o[COT.execAction] = chu(CO_DINH.execAction);
  o[COT.loaiChungTu] = chu(CO_DINH.loaiChungTu);
  o[COT.tieuDe] = chu(d.tieuDe);
  o[COT.movement] = chu(CO_DINH.movement);
  // Mã vật tư ghi thành SỐ, đúng như tệp mẫu. Ghi thành chữ thì hệ thống bên
  // kia có thể đọc ra một mã khác, mà mã vật tư sai là chuyển sai mặt hàng.
  o[COT.maVatTu] = so(Number(d.maVatTu));
  o[COT.soLuong] = so(d.soLuong);
  o[COT.plantXuat] = so(Number(CO_DINH.plantXuat));
  o[COT.khoXuat] = so(Number(CO_DINH.khoXuat));
  o[COT.maLo] = so(Number(CO_DINH.batch));
  o[COT.tieuDe2] = chu(d.tieuDe);
  o[COT.plantNhan] = so(Number(d.plant));
  o[COT.slogNhan] = so(Number(d.slog));
  o[COT.batchNhan] = so(Number(CO_DINH.batch));
  return o;
}

function themThieu(m: Map<string, MucThieu>, ten: string, soLuong: number) {
  const o = m.get(ten) ?? { ten, soDong: 0, soLuong: 0 };
  o.soDong += 1;
  o.soLuong += soLuong;
  m.set(ten, o);
}

/**
 * Dựng dữ liệu tệp điều chuyển từ giao dịch xuất kho.
 *
 * Gom theo (chuyến giao × mã vật tư): một chuyến có thể tách nhiều lô của cùng
 * một mặt hàng, mà tệp điều chuyển dùng mã lô cố định nên hai dòng lô ấy về
 * cùng một dòng. Hai chuyến khác nhau thì vẫn là hai dòng.
 */
export function dungFileDieuChuyen(
  input: DungFileDieuChuyenInput,
): FileDieuChuyen {
  const sanPham = new Map<string, Product>();
  input.products.forEach((p) => sanPham.set(p.id, p));

  const tu = input.tuNgay.trim();
  const den = input.denNgay.trim();

  // Bộ phận BNC không thuộc Nội bộ: đếm lại để nói ra, rồi mới loại.
  const ngoai = new Map<string, MucThieu>();
  input.transactions.forEach((t) => {
    if (t.type !== "OUT") return;
    const n = nhomCuaBoPhan(t.partnerId);
    if (!n || n === "NB") return;
    const sl = Number(t.quantity) || 0;
    if (sl <= 0) return;
    const ngay = ngayCua(t.date);
    if (tu && ngay < tu) return;
    if (den && ngay > den) return;
    themThieu(
      ngoai,
      input.tenBoPhan?.get(t.partnerId) || t.partnerName || t.partnerId,
      sl,
    );
  });

  const cua = input.transactions.filter((t) => {
    if (t.type !== "OUT") return false;
    if (nhomCuaBoPhan(t.partnerId) !== "NB") return false;
    if (input.boPhan && t.partnerId !== input.boPhan) return false;
    const n = ngayCua(t.date);
    if (tu && n < tu) return false;
    if (den && n > den) return false;
    return true;
  });

  const thieuKho = new Map<string, MucThieu>();
  const thieuMa = new Map<string, MucThieu>();
  /** Khoá gom: chuyến giao + mã vật tư. */
  const gom = new Map<string, DongDieuChuyen>();
  const don = new Set<string>();

  cua.forEach((t) => {
    const sl = Number(t.quantity) || 0;
    if (sl <= 0) return;

    const ten =
      input.tenBoPhan?.get(t.partnerId) || t.partnerName || t.partnerId;
    const kho = KHO_DIEM_BAN[t.partnerId];
    if (!kho) {
      themThieu(thieuKho, ten, sl);
      return;
    }

    const sp = sanPham.get(t.productId);
    // Khớp mặt hàng bằng MÃ VẬT TƯ, không khớp theo tên: "Bia Wings Dark Lager"
    // nằm trọn trong tên bia lon "Bia Wings Dark Lager 330ml".
    const maVatTu = String(sp?.materialCode ?? "").trim();
    if (!maVatTu) {
      themThieu(thieuMa, sp?.name || t.productName || t.productId, sl);
      return;
    }

    const chuyen = t.referenceGroupId || t.id;
    don.add(chuyen);
    const khoa = `${chuyen}|${maVatTu}`;
    const co = gom.get(khoa);
    if (co) {
      co.soLuong += sl;
      return;
    }
    const ngay = ngayCua(t.date);
    gom.set(khoa, {
      ngay,
      partnerId: t.partnerId,
      diemBan: ten,
      maVatTu,
      tenHang: sp?.name || t.productName,
      soLuong: sl,
      dvt: sp?.unit || "",
      plant: kho.plant,
      slog: kho.slog,
      tieuDe: tieuDeChungTu(kho.viet, ngay),
    });
  });

  // Làm tròn về ba số lẻ SAU KHI cộng dồn. Cộng 41,2 với 20,6 trong số thực
  // ra 61,800000000000004; ghi nguyên con số ấy vào tệp thì hệ thống bên kia
  // nhận một số lượng không ai đọc được, mà tệp mẫu cũng chỉ hiện ba số lẻ.
  gom.forEach((d) => {
    d.soLuong = Math.round(d.soLuong * 1000) / 1000;
  });

  // Xếp theo ngày rồi theo điểm bán rồi theo mã vật tư — đúng thứ tự tệp mẫu,
  // để người bên kia đọc tệp thấy từng chứng từ nằm liền nhau.
  const dong = Array.from(gom.values()).sort(
    (a, b) =>
      a.ngay.localeCompare(b.ngay) ||
      a.diemBan.localeCompare(b.diemBan, "vi") ||
      a.maVatTu.localeCompare(b.maVatTu),
  );

  const xepThieu = (m: Map<string, MucThieu>) =>
    Array.from(m.values()).sort((a, b) => b.soLuong - a.soLuong);

  // Đánh số chứng từ theo thứ tự đã xếp: cùng ngày cùng điểm bán là một chứng
  // từ, dù có mấy mặt hàng.
  let soChungTu = -1;
  let khoaTruoc = "";
  const toNen = dong.map((d) => {
    const khoa = `${d.ngay}|${d.partnerId}`;
    if (khoa !== khoaTruoc) {
      khoaTruoc = khoa;
      soChungTu += 1;
    }
    return soChungTu % 2 === 1;
  });

  return {
    dong,
    oDong: dong.map(khungDong),
    toNen,
    thieuMaKho: xepThieu(thieuKho),
    thieuMaVatTu: xepThieu(thieuMa),
    ngoaiNoiBo: xepThieu(ngoai),
    soDon: don.size,
  };
}

/** Câu tóm tắt, nói rõ có gì bị giữ lại hay không. */
export function tomTatDieuChuyen(f: FileDieuChuyen): string {
  if (!f.dong.length && !f.thieuMaKho.length && !f.thieuMaVatTu.length) {
    return "Không có đơn Nội bộ nào trong khoảng ngày này.";
  }
  const d: string[] = [
    `${f.dong.length} dòng điều chuyển từ ${f.soDon} chuyến giao`,
  ];
  if (f.thieuMaKho.length) {
    d.push(
      `giữ lại ${f.thieuMaKho.reduce((n, o) => n + o.soDong, 0)} dòng của ${f.thieuMaKho.length} điểm bán chưa có mã kho (${f.thieuMaKho.map((o) => o.ten).join(", ")})`,
    );
  }
  if (f.thieuMaVatTu.length) {
    d.push(
      `giữ lại ${f.thieuMaVatTu.reduce((n, o) => n + o.soDong, 0)} dòng của ${f.thieuMaVatTu.length} mặt hàng chưa có mã vật tư`,
    );
  }
  return d.join(", ") + ".";
}

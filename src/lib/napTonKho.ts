/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NẠP EXCEL TỒN KHO — ĐỒNG BỘ SỐ TỔNG THEO MẶT HÀNG, KHÔNG NHÂN ĐÔI.
 *
 * Tệp là một bảng tổng theo mặt hàng: Tồn đầu · Tổng nhập · Tổng xuất (· Hao
 * hụt). Bản cũ của nút này đặt mã tài liệu bằng `Date.now()` + `Math.random()`,
 * nên NẠP LẠI CÙNG TỆP LÀ SINH THÊM MỘT BỘ GIAO DỊCH MỚI — số liệu nhân đôi,
 * nhân ba, và vì mã ngẫu nhiên, ghi chú rỗng nên không còn cách nào biết dòng
 * nào thuộc lần nạp nào để gỡ bớt. Bản cũ còn mắc thêm ba lỗi:
 *
 *   · Cộng TỒN ĐẦU vào dòng NHẬP. App ghi tồn đầu bằng loại `OPENING` riêng;
 *     gộp vào nhập thì "Báo cáo Nhập" phình đúng bằng số tồn đầu.
 *   · Khớp mặt hàng bằng TÊN hạ chữ thường — tên lệch một dấu cách là dòng bị
 *     bỏ qua mà không ai biết.
 *   · Đọc cột "Tổng Nhập" chữ N hoa, trong khi chính tệp xuất từ Báo cáo tổng
 *     hợp của app ghi "Tổng nhập" — nạp lại tệp của chính app ra số 0.
 *
 * CÁCH LÀM BÂY GIỜ — mỗi (mặt hàng × loại số) có ĐÚNG MỘT dòng đồng bộ, mã
 * suy từ chính hai thứ đó: `dongbo-in-<mã mặt hàng>`. Nạp lại là ghi đè lên
 * chính nó; về mặt cấu trúc không thể sinh ra bản thứ hai.
 *
 * Dữ liệu chia ba nhóm, đúng quy tắc nạp tệp của dự án:
 *
 *   giống hết  đã có y nguyên              → bỏ qua, đếm để báo lại
 *   ghi mới    mặt hàng × loại chưa có      → ghi thẳng
 *   lệch       đã có nhưng số khác, hoặc    → HỎI người dùng một lần
 *              đang có nhiều dòng (bản trùng
 *              do lỗi cũ để lại)
 *
 * Nhóm lệch không tự quyết: thay nhầm là mất số, giữ nhầm là số cũ còn đó.
 *
 * Tất cả nằm ở đây, là hàm thuần — phép kiểm gọi đúng mã này, không cần mạng.
 */

import type { Product, Transaction } from "../types";
import { matchRevenueProduct, normalizeKey } from "./reconcile";
/*
 * Đọc số bằng ĐÚNG hàm của đường nạp tệp xuất kho, để cả app chỉ có một quy
 * ước: dấu phẩy là thập phân, dấu chấm ngăn nghìn — "12,345" là 12,345 lít.
 * Ngày 14/10/2026 nút này từng dùng một hàm khác hiểu "12,345" là mười hai
 * nghìn: hai đường nạp đọc cùng một ô ra hai số chênh nhau nghìn lần.
 */
import { toTkhoNumber } from "./tkhoXuat";

/** Mã đối tác của mọi dòng đồng bộ — cả dòng do bản cũ để lại cũng mang mã này. */
export const DOI_TAC_DONG_BO = "SYSTEM_SYNC";

/** Bốn loại số trong bảng tồn kho, theo đúng loại giao dịch của app. */
export type LoaiDongBo = "OPENING" | "IN" | "OUT" | "LOSS";

const LOAI: LoaiDongBo[] = ["OPENING", "IN", "OUT", "LOSS"];

export const TEN_LOAI: Record<LoaiDongBo, string> = {
  OPENING: "Tồn đầu",
  IN: "Nhập",
  OUT: "Xuất",
  LOSS: "Hao hụt",
};

/** Một dòng đọc được từ tệp, chưa khớp danh mục. */
export interface DongTep {
  /** Số dòng trong Excel (dòng tiêu đề là 1), để báo người dùng tìm. */
  dongExcel: number;
  sanPham: string;
  maVatTu: string;
  donViTinh: string;
  so: Record<LoaiDongBo, number>;
}

/**
 * Tên cột chấp nhận cho từng trường, so sau khi bỏ dấu và hạ chữ thường —
 * "Tổng nhập", "Tổng Nhập", "TONG NHAP" là một.
 *
 * ĐƠN VỊ TÍNH: ưu tiên "Đơn vị tính" / "ĐVT". Chỉ lấy "Đơn vị" khi không có
 * hai cột kia — ở tệp khác, "Đơn vị" là mã đơn vị thụ hưởng (BNC, BNG), đọc
 * nhầm thành đơn vị đo là quy đổi sai cả bảng. Bảng tồn kho thì không có cột
 * đơn vị thụ hưởng nào, nên "Đơn vị" ở đây đúng là đơn vị đo.
 */
const COT: Record<string, string[]> = {
  sanPham: ["Sản phẩm", "Product", "Tên hàng", "Tên sản phẩm", "Mặt hàng", "Tên bia"],
  maVatTu: ["Mã vật tư", "Mã VT", "Material Code", "Mã hàng"],
  donViTinh: ["Đơn vị tính", "ĐVT", "Unit", "Đơn vị"],
  OPENING: ["Tồn đầu", "Tồn đầu kỳ", "Opening Stock"],
  IN: ["Tổng nhập", "Nhập", "Total Import"],
  OUT: ["Tổng xuất", "Xuất", "Total Export"],
  LOSS: ["Hao hụt", "Tổng hao hụt", "Loss"],
};

function layCot(dong: Record<string, unknown>, truong: string): unknown {
  const khoa = Object.keys(dong);
  for (const ten of COT[truong]) {
    const can = normalizeKey(ten);
    const k = khoa.find((x) => normalizeKey(x) === can);
    if (k !== undefined && dong[k] !== undefined && dong[k] !== "") return dong[k];
  }
  return undefined;
}

/**
 * Đọc sheet (mảng hai chiều, `sheet_to_json(ws, { header: 1 })`) thành dòng tệp.
 *
 * TỰ DÒ DÒNG TIÊU ĐỀ: dòng đầu tiên có cột tên sản phẩm (hoặc mã vật tư). Tệp
 * xuất từ Báo cáo tổng hợp của chính app có mấy dòng tiêu đề lớn ở trên cùng;
 * lấy cứng dòng 1 làm tiêu đề là đọc ra toàn ô rỗng.
 *
 * Bỏ dòng không có tên sản phẩm lẫn mã vật tư (dòng trống, dòng tổng cộng).
 */
export function docBangTonKho(aoa: readonly (readonly unknown[])[]): DongTep[] {
  const laTieuDe = (dong: readonly unknown[]) =>
    dong.some((o) =>
      [...COT.sanPham, ...COT.maVatTu].some(
        (ten) => normalizeKey(ten) === normalizeKey(o),
      ),
    );
  const viTri = aoa.findIndex((d) => Array.isArray(d) && laTieuDe(d));
  if (viTri < 0) return [];
  const tieuDe = aoa[viTri].map((o) => String(o ?? "").trim());

  const ra: DongTep[] = [];
  aoa.slice(viTri + 1).forEach((dong, i) => {
    const r: Record<string, unknown> = {};
    tieuDe.forEach((ten, j) => {
      if (ten) r[ten] = dong?.[j];
    });
    const sanPham = String(layCot(r, "sanPham") ?? "").trim();
    const maVatTu = String(layCot(r, "maVatTu") ?? "").trim();
    if (!sanPham && !maVatTu) return;
    if (/^t[oổ]ng\s*c[oộ]ng$/i.test(sanPham)) return;
    const so = {} as Record<LoaiDongBo, number>;
    LOAI.forEach((l) => {
      so[l] = toTkhoNumber(layCot(r, l));
    });
    ra.push({
      dongExcel: viTri + i + 2,
      sanPham,
      maVatTu,
      donViTinh: String(layCot(r, "donViTinh") ?? "").trim(),
      so,
    });
  });
  return ra;
}

/** Mã tài liệu của dòng đồng bộ — suy từ (loại × mặt hàng), không gì khác. */
export function maDongBo(loai: LoaiDongBo, productId: string): string {
  return `dongbo-${loai.toLowerCase()}-${productId}`;
}

/** Một dòng sẽ ghi xuống. `soLuong` đã quy về đơn vị kho. */
export interface DongDongBo {
  id: string;
  loai: LoaiDongBo;
  productId: string;
  productName: string;
  soLuong: number;
}

export interface KeHoachDongBo {
  ghiMoi: DongDongBo[];
  /** Đã có y nguyên — không ghi lại. */
  giongHet: DongDongBo[];
  /**
   * Đã có mà khác. `moi.soLuong` = 0 nghĩa là tệp nay ghi 0: thay thế tức là
   * gỡ hẳn dòng cũ. `cu` là MỌI dòng đồng bộ đang có của (mặt hàng × loại) —
   * kể cả bản trùng do lỗi mã ngẫu nhiên để lại, thay là gỡ hết chúng.
   */
  lech: { moi: DongDongBo; cu: Transaction[] }[];
  /** Không khớp được danh mục — báo ra cho người dùng sửa, không đoán. */
  khongKhop: DongTep[];
  /**
   * Khớp được mặt hàng nhưng ĐƠN VỊ TÍNH trong tệp khác đơn vị kho (tệp ghi
   * "Thùng", kho đếm theo "Lon"). Không tự quy đổi — đoán sai hệ số là sai cả
   * cột mà vẫn ra số đẹp. Bỏ qua và báo ra.
   */
  lechDonVi: { d: DongTep; donViKho: string }[];
  /** Cùng mặt hàng xuất hiện hai lần trong tệp với số khác nhau — bỏ qua cả hai. */
  xungDot: string[];
  /** Dòng lặp y hệt trong tệp — đã bỏ. */
  lapTrongTep: number;
  /**
   * Mặt hàng sắp ghi số tổng mà app ĐÃ CÓ giao dịch chi tiết (nhập tay, nạp
   * BBGN / T Kho, xuất kho). Khoá theo nội dung chặn được nạp lại cùng tệp,
   * nhưng không chặn được kiểu nhân đôi này: số tổng cộng lên trên chính các
   * giao dịch đã làm ra nó — chuyện xảy ra ngay nếu nạp lại tệp Báo cáo tổng
   * hợp xuất từ chính app. Không tự chặn (có thể anh cố ý), nhưng phải nói.
   */
  daCoChiTiet: { productName: string; soDong: number }[];
}

const BANG = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * Đơn vị trong tệp có khớp đơn vị kho không. Tệp không ghi đơn vị thì coi như
 * đúng đơn vị kho.
 *
 * Bản cũ có quy tắc "bia lon mà tệp ghi lon thì chia cho hệ số quy đổi". Danh
 * mục hiện đếm bia lon theo LON với hệ số 1, nên phép chia ấy không đổi gì —
 * nhưng hễ ai đặt hệ số 24 là nó lặng lẽ chia sai cả cột. Bỏ: không khớp đơn
 * vị thì báo ra, không đoán.
 */
function dungDonViKho(p: Product, donViTinh: string): boolean {
  const tep = normalizeKey(donViTinh);
  return !tep || tep === normalizeKey(p.unit);
}

export function lapKeHoachDongBo(
  dongTep: readonly DongTep[],
  products: readonly Product[],
  transactions: readonly Transaction[],
): KeHoachDongBo {
  const kh: KeHoachDongBo = {
    ghiMoi: [],
    giongHet: [],
    lech: [],
    khongKhop: [],
    lechDonVi: [],
    xungDot: [],
    lapTrongTep: 0,
    daCoChiTiet: [],
  };

  // 1. Khớp danh mục, gom theo mặt hàng để bắt dòng lặp / xung đột trong tệp.
  const theoMatHang = new Map<string, { p: Product; d: DongTep; so: Record<LoaiDongBo, number> }>();
  const xungDot = new Set<string>();
  dongTep.forEach((d) => {
    const p = matchRevenueProduct(products as Product[], {
      materialCode: d.maVatTu,
      productName: d.sanPham,
    });
    if (!p) {
      kh.khongKhop.push(d);
      return;
    }
    if (!dungDonViKho(p, d.donViTinh)) {
      kh.lechDonVi.push({ d, donViKho: p.unit });
      return;
    }
    const so = { ...d.so };
    const co = theoMatHang.get(p.id);
    if (!co) {
      theoMatHang.set(p.id, { p, d, so });
      return;
    }
    if (LOAI.every((l) => BANG(co.so[l], so[l]))) kh.lapTrongTep += 1;
    else xungDot.add(p.id);
  });
  xungDot.forEach((id) => {
    kh.xungDot.push(theoMatHang.get(id)!.p.name);
    theoMatHang.delete(id);
  });

  // 2. So với dòng đồng bộ đang có.
  theoMatHang.forEach(({ p, so }) => {
    const chiTiet = transactions.filter(
      (t) =>
        t.productId === p.id &&
        t.partnerId !== DOI_TAC_DONG_BO &&
        (LOAI as string[]).includes(t.type),
    ).length;
    if (chiTiet > 0 && LOAI.some((l) => so[l] > 0)) {
      kh.daCoChiTiet.push({ productName: p.name, soDong: chiTiet });
    }
    LOAI.forEach((loai) => {
      const moi: DongDongBo = {
        id: maDongBo(loai, p.id),
        loai,
        productId: p.id,
        productName: p.name,
        soLuong: so[loai],
      };
      const cu = transactions.filter(
        (t) =>
          t.partnerId === DOI_TAC_DONG_BO &&
          t.productId === p.id &&
          t.type === loai,
      );
      if (!cu.length) {
        if (moi.soLuong > 0) kh.ghiMoi.push(moi);
        return;
      }
      const giong =
        cu.length === 1 &&
        cu[0].id === moi.id &&
        BANG(Number(cu[0].quantity) || 0, moi.soLuong);
      if (giong) kh.giongHet.push(moi);
      else kh.lech.push({ moi, cu });
    });
  });

  return kh;
}

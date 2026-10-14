/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KHỚP MỘT DÒNG TRONG TỆP VỚI MẶT HÀNG TRONG DANH MỤC.
 *
 * Tách ra khỏi `reconcile.ts` (bộ đối soát doanh thu) khi phân hệ Doanh thu
 * gỡ hẳn — hai hàm này là phần duy nhất của tệp đó còn sống, dùng cho nút Nạp
 * Excel tồn kho. Tên cũ `matchRevenueProduct` không còn đúng việc nữa.
 */

import type { Product } from "../types";

/**
 * Chuẩn hóa chuỗi để so khớp: bỏ dấu, bỏ khoảng trắng và ký tự đặc biệt, hạ
 * chữ thường. "Bia Wings Dark Lager 330ml" → "biawingsdarklager330ml".
 *
 * Chữ "đ" phải xử lý riêng: nó là một chữ cái Latin độc lập (U+0111) chứ không
 * phải "d" cộng dấu, nên normalize("NFD") KHÔNG tách ra được. Bỏ qua thì
 * "Bia Đặc Biệt" thành "biaacbiet" (mất luôn chữ d) và mặt hàng có chữ "đ" bị
 * báo sai là chưa khớp danh mục.
 *
 * Đây là MỘT hàm chuẩn hóa cho cả app: `chuanTen` (ghi chú) và
 * `normalizeDiemBan` (khoá bảng điểm bán) đều gọi về đây — trước 14/10/2026
 * mỗi chỗ tự viết một bản.
 */
export const normalizeKey = (s: unknown): string =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");

/**
 * Tìm mặt hàng trong danh mục cho một dòng tệp.
 *
 * KHẮT KHE CÓ CHỦ Ý: chỉ khớp bằng MÃ VẬT TƯ, hoặc bằng TÊN đã chuẩn hóa trùng
 * tuyệt đối. KHÔNG khớp "chứa chuỗi con", vì tên bia hơi ("Bia Wings Dark
 * Lager") nằm trọn trong tên bia lon ("Bia Wings Dark Lager 330ml") — khớp mờ
 * sẽ gán sản lượng sang sai mặt hàng mà không tổng nào lộ ra. Dòng không khớp
 * được thì báo ra cho người dùng sửa, không đoán.
 */
export const khopMatHang = (
  products: readonly Product[],
  row: { materialCode?: string; productName?: string },
): Product | undefined => {
  const code = String(row.materialCode || "").trim();
  if (code) {
    const byCode = products.find(
      (p) => String(p.materialCode || "").trim() === code,
    );
    if (byCode) return byCode;
  }
  const name = normalizeKey(row.productName);
  if (!name) return undefined;
  return products.find((p) => normalizeKey(p.name) === name);
};

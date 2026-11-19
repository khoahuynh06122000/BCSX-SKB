/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KHỚP TÊN BIA AI ĐỌC TRÊN PHIẾU VỚI DÒNG ĐƠN ĐI ĐƯỜNG — KHẮT KHE CÓ CHỦ Ý.
 *
 * Bản cũ coi là khớp khi hai tên chung BẤT KỲ một chữ nào: phiếu chỉ ghi
 * "Bia Wings Dark Lager" mà "Golden Bridge Helles Lager" cũng sáng "ĐÃ KHỚP"
 * vì chung chữ "lager"; lại bỏ chữ "lon" nên keg và lon 330ml cùng loại khớp
 * lẫn nhau. Bấm xác nhận là hoàn tất cả dòng KHÔNG có trên tờ phiếu — đúng
 * cái bước đối chiếu tay muốn chặn.
 *
 * Nay:
 *   1. Chỉ xét CHỮ RIÊNG của tên bia (Golden Bridge, Wings, Lunar Castle…),
 *      bỏ chữ kiểu bia dùng chung (lager, ale, dark, wheat, dry hop…). Mọi chữ
 *      riêng của dòng đơn phải có mặt trên tên AI đọc.
 *   2. Phân biệt DẠNG ĐÓNG GÓI: lon / 330ml khác keg. Lệch dạng thì không
 *      khớp — trừ khi trong đơn chỉ có ĐÚNG MỘT dòng mang tên bia đó (không
 *      có gì để lẫn), vì phiếu giấy hay viết tắt bỏ chữ "lon".
 * Không khớp được thì người kho tự tích — chậm hơn chứ không sai.
 */

const CHU_CHUNG = new Set([
  "bia", "beer", "vo", "keg", "kegs", "lon", "thung", "chai", "lit", "l",
  "va", "loai", "so", "luong", "ml", "vn",
  "lager", "ale", "pale", "dark", "light", "wheat", "dry", "hop", "hops",
  "helles", "ipa", "stout", "pilsner", "craft", "kraft",
]);

function boDau(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

/** Các chữ riêng của tên bia (đã bỏ dấu, bỏ chữ chung, bỏ số). */
export function chuRieng(ten: string): string[] {
  return boDau(ten)
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^lon(?=\d)/, "").replace(/\d+ml$/, ""))
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !CHU_CHUNG.has(w));
}

/** Dạng đóng gói: "lon" nếu tên có chữ lon / 330ml / can, còn lại "keg". */
export function dangDongGoi(ten: string): "lon" | "keg" {
  const s = boDau(ten);
  return /\blon\b|lon\d|\b330\b|330ml|\bcan\b|\bcans\b/.test(s) ? "lon" : "keg";
}

/**
 * Các dòng trong đơn khớp với một tên AI đọc được.
 * `dong` là các dòng của đơn đang xác nhận (chỉ cần `productName`).
 */
export function dongKhopTenQuet<T extends { productName: string }>(
  tenQuet: string,
  dong: readonly T[],
): T[] {
  const tuQuet = new Set(chuRieng(tenQuet));
  if (!tuQuet.size) return [];
  const cungTen = dong.filter((d) => {
    const r = chuRieng(d.productName);
    return r.length > 0 && r.every((w) => tuQuet.has(w));
  });
  if (!cungTen.length) return [];
  const dangQuet = dangDongGoi(tenQuet);
  const cungDang = cungTen.filter((d) => dangDongGoi(d.productName) === dangQuet);
  if (cungDang.length) return cungDang;
  // Lệch dạng: chỉ chấp nhận khi tên bia đó chỉ ứng với MỘT mặt hàng trong đơn.
  const mh = new Set(cungTen.map((d) => d.productName));
  return mh.size === 1 ? cungTen : [];
}

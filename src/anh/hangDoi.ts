/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HÀNG ĐỢI TẢI ẢNH — bốn tấm một lúc.
 *
 * Lưới vài trăm ô mà cùng xin ảnh một nhịp thì Cloudinary chặn tạm (429), ô
 * xám hàng loạt trông như mất ảnh. Bốn tấm một lúc thì không bị chặn mà lưới
 * vẫn hiện đủ nhanh.
 */

export const SUC_CHUA = 4;

let dangChay = 0;
const cho: (() => void)[] = [];

/** Xin một lượt; xin rồi PHẢI trả, kể cả khi tải hỏng hay ô bị gỡ. */
export function xinLuot(): Promise<void> {
  if (dangChay < SUC_CHUA) {
    dangChay++;
    return Promise.resolve();
  }
  return new Promise((ok) => cho.push(ok));
}

/** Trả lượt: có người chờ thì chuyển thẳng cho họ. */
export function traLuot(): void {
  const tiep = cho.shift();
  if (tiep) tiep();
  else dangChay = Math.max(0, dangChay - 1);
}

/** Cho phép kiểm. */
export const trangThaiHangDoi = () => ({ dangChay, dangCho: cho.length });
export function datLaiHangDoi(): void {
  dangChay = 0;
  cho.length = 0;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Đường dẫn ảnh thu nhỏ của Cloudinary — phép tính thuần.
 *
 * Cloudinary nhận phép biến đổi ngay trong đường dẫn, chen sau `/upload/`:
 *   .../image/upload/v1789640255/abc.jpg
 *   .../image/upload/f_auto,q_auto,w_400,c_limit/v1789640255/abc.jpg
 * `c_limit` chỉ thu nhỏ, không phóng to.
 */

const MOC = "/image/upload/";

/**
 * Bản thu nhỏ rộng tối đa `rong` px (`f_auto,q_auto,w_N,c_limit`).
 * Không phải ảnh Cloudinary gốc thì trả nguyên — không dựng đường dẫn sai.
 */
export function anhThuNho(url: string, rong = 400): string {
  const u = String(url ?? "").trim();
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(u)) return u;
  const i = u.indexOf(MOC);
  if (i < 0) return u;
  const sau = u.slice(i + MOC.length);
  const khuc = sau.split("/")[0] ?? "";
  // Đã có phép biến đổi rồi thì để yên, không chồng hai tầng.
  if (!/^v\d+$/.test(khuc) && (khuc.includes("_") || khuc.includes(","))) return u;
  return `${u.slice(0, i + MOC.length)}f_auto,q_auto,w_${Math.max(1, Math.trunc(rong))},c_limit/${sau}`;
}

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

/** Chuẩn hoá URL ảnh (bỏ khoảng trắng thừa, nâng `http://res.cloudinary.com` -> `https://`). */
export function chuanHoaUrlAnh(url: string): string {
  const u = String(url ?? "").trim();
  return u.replace(/^http:\/\/(res\.cloudinary\.com\/)/i, "https://$1");
}

/**
 * Bản thu nhỏ rộng tối đa `rong` px (`f_auto,q_auto,w_N,c_limit`).
 * Không phải ảnh Cloudinary gốc thì trả nguyên — không dựng đường dẫn sai.
 */
export function anhThuNho(url: string, rong = 400): string {
  const u = chuanHoaUrlAnh(url);
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(u)) return u;
  const i = u.indexOf(MOC);
  if (i < 0) return u;
  const sau = u.slice(i + MOC.length);
  const khuc = sau.split("/")[0] ?? "";
  // Đã có phép biến đổi rồi thì để yên, không chồng hai tầng.
  if (!/^v\d+$/.test(khuc) && (khuc.includes("_") || khuc.includes(","))) return u;
  return `${u.slice(0, i + MOC.length)}f_auto,q_auto,w_${Math.max(1, Math.trunc(rong))},c_limit/${sau}`;
}

/**
 * TRUNG CHUYỂN ẢNH QUA DOMAIN APP (`/api/anh/xem/...`).
 *
 * Mạng văn phòng Sun World chặn `res.cloudinary.com`, nên máy kế toán thấy
 * Firestore tải đủ mà ảnh nào cũng "Lỗi mạng / bị chặn". Trình duyệt gọi
 * đường dẫn cùng domain app; Vercel (luật `rewrites` trong `vercel.json`) và
 * `server.ts` lúc chạy tại máy đi lấy ảnh ở Cloudinary thay.
 *
 * Chỉ nhận ảnh thuộc kho của app — `KHO_ANH` phải khớp `vercel.json`. Ảnh kho
 * khác, ảnh trên máy (`blob:`, `data:`) thì trả nguyên. Phép biến đổi
 * (`f_auto,w_400…`) nằm trong đường dẫn nên đi qua nguyên vẹn.
 */
export const KHO_ANH = "zjtjeyqd";
export const GOC_TRUNG_CHUYEN = "/api/anh/xem/";

export function quaTrungChuyen(url: string): string {
  const u = chuanHoaUrlAnh(url);
  const tienTo = `https://res.cloudinary.com/${KHO_ANH}${MOC}`;
  if (!u.toLowerCase().startsWith(tienTo.toLowerCase())) return u;
  const sau = u.slice(tienTo.length);
  return sau ? GOC_TRUNG_CHUYEN + sau : u;
}

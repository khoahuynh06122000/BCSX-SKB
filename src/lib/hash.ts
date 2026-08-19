/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BĂM CHUỖI THÀNH KHOÁ NGẮN, ỔN ĐỊNH GIỮA CÁC LẦN CHẠY
 *
 * Trước đây nằm trong `revenueKey.ts` cùng bộ khoá chống nạp trùng file doanh
 * thu. Doanh thu nay tính thẳng từ xuất kho nên không còn việc nạp file để mà
 * chống trùng, nhưng phép băm thì vẫn cần: lệnh xuất hóa đơn SAP dùng nó để
 * suy khoá lệnh từ chính tập dòng trong lệnh (xem `sapExport.ts`).
 */

/** FNV-1a 32 bit. */
const fnv1a = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** djb2 32 bit. */
const djb2 = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
};

/**
 * Ghép hai hàm băm khác họ (~64 bit) để xác suất hai chuỗi khác nhau ra cùng
 * khoá là không đáng kể ở quy mô vài chục nghìn dòng. Không dùng crypto vì cần
 * chạy đồng bộ ở trình duyệt và không cần chống cố ý tấn công — đây chỉ là
 * khoá chống trùng.
 */
export const stableHash = (s: string): string =>
  fnv1a(s).toString(36) + djb2(s).toString(36);

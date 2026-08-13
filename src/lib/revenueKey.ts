/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KHOÁ ĐỊNH DANH DÒNG DOANH THU — chống nạp trùng
 *
 * Bản cũ đặt tên biến là `deterministicId` nhưng lại ghép `Date.now()` và
 * `Math.random()` vào, nên mỗi lần nạp cùng một file lại sinh ra khoá mới và
 * dữ liệu nhân đôi. Lớp chống trùng duy nhất còn lại là "đã thấy số hóa đơn
 * này thì bỏ qua cả tờ" — hở ở hai chỗ: dòng không có số hóa đơn thì nạp bao
 * nhiêu lần cũng vào, và hóa đơn nạp lần trước bị thiếu dòng thì không bổ sung
 * được.
 *
 * Cách làm ở đây: khoá tài liệu suy ra từ CHÍNH NỘI DUNG dòng. Nạp lại cùng
 * một dòng thì ghi đè lên đúng tài liệu đó, không thể sinh bản thứ hai.
 */

import { normalizeKey } from "./reconcile";

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
 * Băm chuỗi thành khoá ngắn, ổn định giữa các lần chạy.
 *
 * Ghép hai hàm băm khác họ (~64 bit) để xác suất hai dòng khác nhau ra cùng
 * khoá là không đáng kể ở quy mô vài chục nghìn dòng. Không dùng crypto vì
 * cần chạy đồng bộ ở trình duyệt và không cần chống cố ý tấn công — đây chỉ
 * là khoá chống trùng.
 */
export const stableHash = (s: string): string =>
  fnv1a(s).toString(36) + djb2(s).toString(36);

export interface RevenueKeyInput {
  date?: string;
  invoiceNumber?: string;
  materialCode?: string;
  productName?: string;
  partnerName?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
}

/** Ngày dạng yyyy-MM-dd; giờ phút bị bỏ để nạp lại không lệch vì lệch giờ. */
const dayKey = (date?: string): string => {
  if (!date) return "nodate";
  const s = String(date);
  // ISO thì cắt luôn, tránh lệch múi giờ khi đổi qua Date
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return "nodate";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Chữ ký nội dung của một dòng doanh thu.
 *
 * Có cả tên đối tác: cùng một mặt hàng, cùng số lượng, cùng ngày nhưng bán cho
 * hai khách khác nhau và cả hai đều không ghi số hóa đơn thì vẫn phải là hai
 * dòng riêng, không được gộp thành một.
 */
export const revenueSignature = (r: RevenueKeyInput): string =>
  [
    dayKey(r.date),
    String(r.invoiceNumber || "").trim().toUpperCase() || "noinv",
    String(r.materialCode || "").trim() || normalizeKey(r.productName),
    Number(r.quantity) || 0,
    Number(r.unitPrice) || 0,
    Number(r.totalAmount) || 0,
    normalizeKey(r.partnerName),
  ].join("|");

/** Khoá tài liệu Firestore cho một dòng doanh thu. */
export const revenueDocId = (r: RevenueKeyInput): string =>
  `rev-${stableHash(revenueSignature(r))}`;

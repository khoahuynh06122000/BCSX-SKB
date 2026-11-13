/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Luật thuần cho máy chủ, tách ra để chạy kiểm tra không cần mạng.
 * Phần đi hỏi Cloudinary và Firestore nằm ở api/anh/xoa.ts.
 */

/** Tệp tải lên quá lâu thì không còn là "vừa tải". */
export const HAN_VUA_TAI_MS = 24 * 60 * 60 * 1000;

/**
 * Có được xoá một tệp VỪA TẢI không (lô ghi chứng từ hỏng ngay sau khi tải).
 * Trả về lý do GIỮ; rỗng là được xoá.
 */
export function lyDoGiuTepVuaTai(x: {
  nguoiGoi: string;
  /** uid ghi trong ngữ cảnh tệp lúc tải. */
  nguoiTai: string;
  /** `created_at` của Cloudinary, ISO. */
  taoLuc: string;
  bayGio: number;
  daCoBanGhi: boolean;
}): string {
  if (!x.nguoiGoi) return "không rõ người gọi";
  if (!x.nguoiTai) return "tệp không mang dấu người tải";
  if (x.nguoiTai !== x.nguoiGoi) return "tệp do người khác tải";
  const t = Date.parse(x.taoLuc);
  if (!Number.isFinite(t)) return "không rõ lúc tải";
  if (x.bayGio - t > HAN_VUA_TAI_MS) return "tệp tải đã quá 24 giờ";
  if (x.daCoBanGhi) return "tệp đã gắn vào chứng từ";
  return "";
}

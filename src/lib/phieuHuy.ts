/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHIẾU ĐÃ HỦY THÌ HÀNG CỦA NÓ KHÔNG CÒN TÍNH.
 *
 * Trước đây `huyPhieu` chỉ ghi vào sổ số phiếu: sinh một dòng phiếu hủy và
 * đánh dấu phiếu gốc `da_huy`. Cả hai đều nằm trong bảng `so_phieu`, còn hàng
 * hóa thì không ai đụng tới — nên một phiếu nhập đã hủy vẫn nằm nguyên trong
 * tồn kho và vẫn hiện ở Báo cáo nhập. Sổ nói đã hủy, kho nói còn hàng.
 *
 * SUY RA TỪ SỔ, KHÔNG LƯU THÊM CỜ. Danh sách chứng từ đã hủy được dựng lại mỗi
 * lần từ sổ số phiếu, nên những phiếu hủy TỪ TRƯỚC cũng tự đúng theo mà không
 * phải chạy một lượt sửa dữ liệu nào. Lưu cờ vào từng giao dịch thì phải nhớ
 * cập nhật ở mọi đường ghi, và quên một đường là số liệu lệch âm thầm.
 */

import type { GhiSoPhieu } from "./soPhieu";

/** Chỉ cần bấy nhiêu để tìm ra chứng từ gốc của một giao dịch. */
export interface GiaoDichCoNguon {
  type?: string;
  id?: string;
  slipCode?: string;
  referenceGroupId?: string;
}

/**
 * Chứng từ gốc nằm dưới một giao dịch — cùng giá trị với `nguon` trong sổ.
 *
 * Phải khớp ĐÚNG cách sổ số phiếu ghi `nguon` lúc cấp số: phiếu nhập lấy
 * `slipCode`, phiếu xuất lấy `referenceGroupId`. Lệch một bên là phép đối chiếu
 * không bao giờ khớp, và phiếu hủy thành ra chẳng bỏ được gì.
 *
 * Trả về chuỗi rỗng khi giao dịch không thuộc chứng từ nào — tồn đầu kỳ chẳng
 * hạn: nó là số dư mang sang, không có tờ phiếu nào để mà hủy.
 */
export function nguonCuaGiaoDich(t: GiaoDichCoNguon): string {
  if (t.type === "IN") return String(t.slipCode || "");
  if (t.type === "OUT" || t.type === "LOSS" || t.type === "DAMAGE") {
    return String(t.referenceGroupId || t.id || "");
  }
  return "";
}

/**
 * Các chứng từ đang mang dấu đã hủy trong sổ.
 *
 * Chỉ lấy phiếu GỐC bị đánh dấu `da_huy`. Bản thân tờ phiếu hủy mang
 * `trangThai: "hieu_luc"` và cùng `nguon` với phiếu gốc, nên đọc theo trạng
 * thái là đủ, không sợ đếm hai lần.
 */
export function nguonPhieuDaHuy(soPhieu: GhiSoPhieu[]): Set<string> {
  const s = new Set<string>();
  (soPhieu || []).forEach((g) => {
    if (g?.trangThai !== "da_huy") return;
    const n = String(g.nguon || "").trim();
    if (n) s.add(n);
  });
  return s;
}

/**
 * Bỏ khỏi danh sách mọi giao dịch thuộc một chứng từ đã hủy.
 *
 * Dùng cho MỌI phép tính tồn kho và báo cáo. Tab Lịch sử cố ý không dùng — ở
 * đó vẫn phải thấy được dòng đã hủy, kèm nhãn, để còn tra lại.
 */
export function boGiaoDichPhieuDaHuy<T extends GiaoDichCoNguon>(
  transactions: T[],
  daHuy: Set<string>,
): T[] {
  if (!daHuy || daHuy.size === 0) return transactions;
  return transactions.filter((t) => !daHuy.has(nguonCuaGiaoDich(t)));
}

/** Giao dịch này thuộc một chứng từ đã hủy. */
export function laGiaoDichDaHuy(
  t: GiaoDichCoNguon,
  daHuy: Set<string>,
): boolean {
  if (!daHuy || daHuy.size === 0) return false;
  const n = nguonCuaGiaoDich(t);
  return !!n && daHuy.has(n);
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * QUYẾT ĐỊNH GHI GÌ / XOÁ GÌ KHI NẠP FILE DOANH THU
 *
 * Tách khỏi App.tsx để chạy thử được bằng dữ liệu giả — đây là chỗ dễ mất số
 * nhất trong cả module doanh thu, nên phải kiểm được mà không cần mở app.
 *
 * Nhờ khoá tài liệu suy từ nội dung dòng (xem revenueKey.ts), nạp lại đúng một
 * dòng là ghi đè lên chính nó nên không thể nhân đôi. Chỉ còn một tình huống
 * không tự quyết được: hóa đơn đã có trên hệ thống nhưng nội dung trong file
 * lần này KHÁC. Hàm này chia dữ liệu thành ba nhóm để nơi gọi đi hỏi người
 * dùng, rồi dựng danh sách ghi/xoá theo lựa chọn đó.
 */

import type { RevenueRecord } from "../types";

export interface ParsedRevenueRow {
  /** Khoá tài liệu, do revenueDocId() sinh ra từ nội dung dòng. */
  id: string;
  /** Số hóa đơn đã chuẩn hóa (bỏ khoảng trắng, in hoa); rỗng nếu không có. */
  invoiceKey: string;
  record: RevenueRecord;
}

export interface RevenueImportPlan {
  /** Đã có y nguyên trên hệ thống — không cần làm gì. */
  identical: ParsedRevenueRow[];
  /** Thuộc hóa đơn đã có nhưng nội dung khác — phải hỏi thay hay giữ. */
  conflicting: ParsedRevenueRow[];
  /** Hoàn toàn mới — ghi thẳng. */
  fresh: ParsedRevenueRow[];
  /** Danh sách số hóa đơn bị lệch nội dung, để hiện trong câu hỏi. */
  conflictInvoices: string[];
}

const invoiceKeyOf = (r: { invoiceNumber?: string }): string =>
  String(r.invoiceNumber || "")
    .trim()
    .toUpperCase();

/** Gom các dòng đã có trên hệ thống theo số hóa đơn. */
const indexByInvoice = (
  existing: RevenueRecord[],
): Map<string, RevenueRecord[]> => {
  const map = new Map<string, RevenueRecord[]>();
  existing.forEach((r) => {
    const inv = invoiceKeyOf(r);
    if (!inv) return;
    const list = map.get(inv) || [];
    list.push(r);
    map.set(inv, list);
  });
  return map;
};

export function planRevenueImport(
  existing: RevenueRecord[],
  incoming: ParsedRevenueRow[],
): RevenueImportPlan {
  const existingIds = new Set(existing.map((r) => r.id));
  const byInvoice = indexByInvoice(existing);

  const identical: ParsedRevenueRow[] = [];
  const conflicting: ParsedRevenueRow[] = [];
  const fresh: ParsedRevenueRow[] = [];

  incoming.forEach((p) => {
    if (existingIds.has(p.id)) identical.push(p);
    else if (p.invoiceKey && byInvoice.has(p.invoiceKey)) conflicting.push(p);
    else fresh.push(p);
  });

  return {
    identical,
    conflicting,
    fresh,
    conflictInvoices: Array.from(new Set(conflicting.map((c) => c.invoiceKey))),
  };
}

export interface RevenueImportActions {
  toWrite: ParsedRevenueRow[];
  /** Khoá của những dòng cũ phải gỡ đi. */
  toDelete: string[];
}

/**
 * Dựng danh sách ghi/xoá từ kết quả phân loại.
 *
 * @param replaceConflicts người dùng đã đồng ý thay nội dung hóa đơn cũ chưa
 */
export function resolveRevenueImport(
  existing: RevenueRecord[],
  incoming: ParsedRevenueRow[],
  plan: RevenueImportPlan,
  replaceConflicts: boolean,
): RevenueImportActions {
  const toWrite = replaceConflicts
    ? [...plan.fresh, ...plan.conflicting]
    : plan.fresh;

  const toDelete: string[] = [];
  if (replaceConflicts) {
    // Giữ lại MỌI dòng có trong file lần này, kể cả dòng không đổi (nằm ở nhóm
    // `identical` nên không có trong toWrite). Nếu chỉ dựa vào toWrite thì dòng
    // không đổi của hóa đơn được thay sẽ bị xoá mà không ghi lại — mất số.
    const keepIds = new Set(incoming.map((p) => p.id));
    const byInvoice = indexByInvoice(existing);
    plan.conflictInvoices.forEach((inv) => {
      (byInvoice.get(inv) || []).forEach((old) => {
        if (!keepIds.has(old.id)) toDelete.push(old.id);
      });
    });
  }

  return { toWrite, toDelete };
}

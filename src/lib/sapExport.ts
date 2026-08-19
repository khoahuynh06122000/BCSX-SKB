/**
 * XUẤT HÓA ĐƠN LÊN SAP — PHẦN LÕI
 *
 * Luồng làm việc (giai đoạn 1, bấm tay):
 *
 *   1. Trong tab Doanh thu, chủ sở hữu chọn kỳ → app dựng một LỆNH XUẤT gồm
 *      danh sách dòng cần lên hóa đơn.
 *   2. App tải về máy một tệp `.json` chứa đúng các dòng đó.
 *   3. Người dùng tự đăng nhập SAP, bấm tệp `.bat`; script trên máy đọc tệp
 *      `.json`, nạp lên SAP, rồi DỪNG trước nút Duyệt.
 *   4. Người xem lại số rồi tự bấm Duyệt, sau đó vào app xác nhận đã xong.
 *
 * Vì sao máy chạy script KHÔNG đọc Firestore: làm vậy phải cấp khoá tài khoản
 * dịch vụ cho máy — thêm một bí mật nữa phải quản, đặt sai là mất quyền cả
 * project. Đi qua tệp `.json` thì máy không cần bí mật nào.
 *
 * Vì sao app KHÔNG dựng luôn tệp đúng khuôn SAP: khuôn tệp là hiểu biết về
 * SAP, nó thuộc về script trên máy. Đổi khuôn thì sửa script, không phải sửa
 * app rồi chờ Vercel build lại.
 */

import type { Product, Transaction } from "../types";
import { stableHash } from "./revenueKey";

/**
 * Vòng đời một lệnh xuất.
 *
 * `awaiting_approval` là trạng thái quan trọng nhất: script đã nạp tệp lên SAP
 * nhưng CỐ Ý dừng trước nút Duyệt. Duyệt hóa đơn là hành vi có hậu quả pháp lý
 * — hóa đơn đã phát hành là đã lên cơ quan thuế, hủy phải làm biên bản. Nên
 * bước đó phải do người bấm.
 */
export type SapJobStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "done"
  | "failed"
  | "cancelled";

export const SAP_JOB_STATUS_LABEL: Record<SapJobStatus, string> = {
  queued: "Chờ chạy",
  running: "Đang nạp lên SAP",
  awaiting_approval: "Chờ người duyệt",
  done: "Đã xuất hóa đơn",
  failed: "Lỗi",
  cancelled: "Đã huỷ",
};

/**
 * Trạng thái nào còn "đang mở" — tức là các dòng trong lệnh đó ĐANG hoặc ĐÃ
 * được đưa sang SAP, không được đưa lần nữa.
 */
export function isJobOpen(status: SapJobStatus): boolean {
  return (
    status === "queued" ||
    status === "running" ||
    status === "awaiting_approval" ||
    status === "done"
  );
}

/**
 * Chuyển trạng thái nào là hợp lệ.
 *
 * `queued` đi thẳng được sang `awaiting_approval` vì ở giai đoạn 1 script trên
 * máy KHÔNG tự báo trạng thái về (máy không có quyền ghi Firestore, cố ý như
 * vậy để không phải giữ khoá tài khoản dịch vụ). Người dùng nạp tệp lên SAP
 * xong thì tự bấm xác nhận, nên app không bao giờ thấy `running`. Trạng thái đó
 * để dành cho giai đoạn 2, khi script tự cập nhật được.
 */
const ALLOWED_NEXT: Record<SapJobStatus, SapJobStatus[]> = {
  queued: ["running", "awaiting_approval", "cancelled", "failed"],
  running: ["awaiting_approval", "failed", "cancelled"],
  awaiting_approval: ["done", "failed"],
  // Ba trạng thái cuối là điểm dừng: đã xuất hóa đơn rồi thì không quay lại
  // được, vì hóa đơn ngoài SAP không biến mất theo trạng thái trong app.
  done: [],
  failed: [],
  cancelled: [],
};

export function canTransition(from: SapJobStatus, to: SapJobStatus): boolean {
  return ALLOWED_NEXT[from].includes(to);
}

/**
 * MỘT DÒNG CẦN LÊN HÓA ĐƠN.
 *
 * Nguồn là XUẤT KHO: xuất kho là gốc, doanh thu sinh ra từ đó. Cố ý vẫn là kiểu
 * riêng chứ không dùng thẳng `Transaction`, để chỗ nào phía sau cũng chỉ biết
 * đúng những trường cần cho hóa đơn.
 */
export interface SapSourceRow {
  /** Khoá của dòng gốc — dùng để không xuất trùng. */
  id: string;
  /** ISO date */
  date: string;
  productName: string;
  materialCode?: string;
  partnerName: string;
  partnerId?: string;
  unit?: string;
  quantity: number;
  /** Số lô, để tra lại được lô nào đã lên hóa đơn nào. */
  batchNumber?: string;
  unitPrice: number;
  /** Tiền TRƯỚC thuế. */
  amountBeforeVat: number;
  vatAmount?: number;
  amountAfterVat?: number;
  /**
   * Đơn giá chỉ là giá danh mục trong `constants.ts`, KHÔNG phải giá hợp đồng
   * của khách này.
   *
   * Xuất kho không mang giá bán: nó ghi hàng đi ra, không ghi bán bao nhiêu.
   * Nên tiền ở đây là để người xem ước lượng độ lớn cho khỏi xuất nhầm kỳ, chứ
   * không phải số để lên hóa đơn. SAP có bảng giá riêng và tự tính lại.
   */
  priceEstimated?: boolean;
}

/**
 * Chuyển một dòng xuất kho sang dòng chờ xuất hóa đơn.
 *
 * Số lượng giữ nguyên đơn vị của kho (bom / thùng / két) kèm tên đơn vị, chưa
 * quy đổi: chưa biết SAP nhận đơn vị nào. Quy đổi sớm rồi SAP lại nhận đơn vị
 * gốc thì sai số lượng mà không có gì báo — chờ tệp mẫu rồi quy đổi một lần cho
 * đúng.
 */
export function transactionToSapRow(
  t: Transaction,
  product?: Product,
): SapSourceRow {
  const unitPrice = product?.price || 0;
  const quantity = t.quantity || 0;
  return {
    id: t.id,
    date: t.date,
    productName: t.productName || product?.name || "",
    materialCode: product?.materialCode,
    partnerName: t.partnerName,
    partnerId: t.partnerId,
    unit: product?.unit,
    quantity,
    batchNumber: t.batchNumber,
    unitPrice,
    amountBeforeVat: quantity * unitPrice,
    // Thuế để SAP tính: thuế suất phụ thuộc mặt hàng và thời kỳ, app đoán thì
    // chỉ tạo ra một con số trông có vẻ đúng.
    priceEstimated: true,
  };
}

/**
 * Các dòng xuất kho được phép lên hóa đơn.
 *
 * Chỉ `OUT`, và bỏ hàng còn `in_transit`: hàng đang trên đường chưa giao xong,
 * xuất hóa đơn trước là xuất cho việc chưa hoàn thành. Hao hụt và hàng hỏng
 * (`LOSS`, `DAMAGE`) không phải bán, nên cũng không lên hóa đơn.
 */
export function billableTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    (t) => t.type === "OUT" && t.status !== "in_transit",
  );
}

/** Phần của một lệnh xuất mà phép tính ở đây cần biết. */
export interface SapJobLike {
  status: SapJobStatus;
  sourceIds: string[];
}

/**
 * MỘT LỆNH XUẤT HÓA ĐƠN, lưu ở collection `sap_jobs`.
 *
 * Cố ý khai ở đây chứ không ở `types.ts`: vòng đời trạng thái và tệp giao cho
 * script nằm cùng một chỗ thì sửa một lần là xong, không phải nhớ hai nơi.
 *
 * KHÔNG lưu lại toàn bộ số liệu từng dòng trong tài liệu này — chỉ lưu khoá
 * dòng (`sourceIds`) và số tổng. Số liệu chi tiết đã nằm trong tệp `.json` tải
 * về; nhồi thêm vào đây thì một lệnh vài nghìn dòng sẽ vượt giới hạn 1 MB của
 * một tài liệu Firestore và việc tạo lệnh sẽ thất bại đúng lúc cần nhất.
 */
export interface SapJob {
  /** = sapJobId(sourceIds) */
  id: string;
  status: SapJobStatus;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  period: { from: string; to: string };
  /** Khoá của các dòng gốc đã đưa vào lệnh này. */
  sourceIds: string[];
  summary: SapJobSummary;
  fileName: string;
  /** Ghi chú của người dùng, hoặc lý do huỷ / nội dung lỗi. */
  note?: string;
  /** Người bấm Duyệt trên SAP và thời điểm xác nhận. */
  approvedBy?: string;
  approvedAt?: string;
}

/**
 * Các dòng ĐÃ được đưa sang SAP ở một lệnh nào đó còn hiệu lực.
 *
 * Đây là hàng chắn quan trọng nhất của cả tính năng: xuất trùng một dòng là
 * phát hành hai hóa đơn cho cùng một lần bán, và sửa việc đó là làm biên bản
 * với cơ quan thuế chứ không phải bấm Undo. Lệnh ĐÃ HUỶ thì không tính, vì
 * hàng đó chưa từng lên SAP.
 */
export function alreadySentIds(jobs: SapJobLike[]): Set<string> {
  const s = new Set<string>();
  jobs.forEach((j) => {
    if (!isJobOpen(j.status)) return;
    j.sourceIds.forEach((id) => s.add(id));
  });
  return s;
}

export interface PickResult {
  /** Các dòng sẽ vào lệnh mới. */
  rows: SapSourceRow[];
  /** Các dòng bị bỏ vì đã xuất ở lệnh khác — hiện ra cho người dùng biết. */
  skipped: SapSourceRow[];
}

/**
 * Chọn dòng cho một kỳ, bỏ những dòng đã xuất rồi.
 *
 * `from`/`to` là ngày dạng yyyy-MM-dd, tính theo bao trùm cả hai đầu. So sánh
 * bằng cách cắt 10 ký tự đầu của chuỗi ISO chứ không đi qua `new Date()`: dòng
 * ghi 2026-08-31T17:30:00Z mà quy về giờ Việt Nam là sang 01/09, đưa qua Date
 * sẽ rơi khỏi kỳ tháng 8 một cách khó hiểu.
 */
export function pickRowsForPeriod(
  rows: SapSourceRow[],
  from: string,
  to: string,
  sent: Set<string>,
): PickResult {
  const inPeriod = rows.filter((r) => {
    const day = (r.date || "").slice(0, 10);
    return day >= from && day <= to;
  });

  return {
    rows: inPeriod.filter((r) => !sent.has(r.id)),
    skipped: inPeriod.filter((r) => sent.has(r.id)),
  };
}

export interface SapJobSummary {
  count: number;
  totalBeforeVat: number;
  totalVat: number;
  totalAfterVat: number;
  totalQuantity: number;
  partnerCount: number;
  /** Dòng thiếu mã vật tư — SAP không nhận được, phải sửa trước khi xuất. */
  missingMaterialCode: number;
  /** Số dòng có thuế thật; 0 nghĩa là để SAP tính thuế. */
  rowsWithVat: number;
  /** Số dòng dùng đơn giá tạm tính theo giá danh mục. */
  estimatedPriceRows: number;
}

/**
 * Cộng số cho người xem trước khi tạo lệnh.
 *
 * Đếm riêng dòng thiếu mã vật tư vì đó là lỗi chặn: SAP khớp mặt hàng bằng mã,
 * không bằng tên. Để lọt xuống script thì nó chỉ báo lỗi lúc đã mở SAP, muộn
 * hơn hẳn so với báo ngay tại đây.
 */
export function summarizeSapRows(rows: SapSourceRow[]): SapJobSummary {
  let totalBeforeVat = 0;
  let totalVat = 0;
  let totalAfterVat = 0;
  let totalQuantity = 0;
  let missingMaterialCode = 0;
  let rowsWithVat = 0;
  let estimatedPriceRows = 0;
  const partners = new Set<string>();

  rows.forEach((r) => {
    const before = r.amountBeforeVat || 0;
    const vat = r.vatAmount || 0;
    totalBeforeVat += before;
    totalVat += vat;
    totalAfterVat += r.amountAfterVat ?? before + vat;
    totalQuantity += r.quantity || 0;
    partners.add(r.partnerId || r.partnerName || "");
    if (!r.materialCode?.trim()) missingMaterialCode++;
    if (r.vatAmount !== undefined) rowsWithVat++;
    if (r.priceEstimated) estimatedPriceRows++;
  });

  return {
    count: rows.length,
    totalBeforeVat,
    totalVat,
    totalAfterVat,
    totalQuantity,
    partnerCount: partners.size,
    missingMaterialCode,
    rowsWithVat,
    estimatedPriceRows,
  };
}

/**
 * Khoá của lệnh xuất, suy ra từ CHÍNH tập dòng trong lệnh.
 *
 * Nhờ vậy bấm hai lần liên tiếp không tạo hai lệnh: lần thứ hai ghi vào đúng
 * tài liệu cũ. Đây là cùng một cách chống trùng đã dùng cho việc nạp file
 * doanh thu — xem `revenueDocId`.
 */
export function sapJobId(sourceIds: string[]): string {
  return "sap-" + stableHash([...sourceIds].sort().join("|"));
}

/** Tên tệp tải về cho script trên máy đọc. */
export function sapJobFileName(jobId: string, from: string, to: string): string {
  return `sap-job-${from}_${to}-${jobId}.json`;
}

/**
 * Nội dung tệp giao cho script trên máy.
 *
 * Có `schema` để sau này đổi khuôn thì script cũ nhận ra ngay là tệp lạ, thay
 * vì đọc sai vài trường rồi nạp số sai lên SAP.
 */
export interface SapJobFile {
  schema: "bcsx-sap-job/1";
  jobId: string;
  createdAt: string;
  createdBy: string;
  period: { from: string; to: string };
  summary: SapJobSummary;
  rows: SapSourceRow[];
}

export function buildSapJobFile(input: {
  jobId: string;
  createdAt: string;
  createdBy: string;
  from: string;
  to: string;
  rows: SapSourceRow[];
}): SapJobFile {
  return {
    schema: "bcsx-sap-job/1",
    jobId: input.jobId,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    period: { from: input.from, to: input.to },
    summary: summarizeSapRows(input.rows),
    rows: input.rows,
  };
}

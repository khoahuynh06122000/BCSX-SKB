/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DOANH THU SINH TỪ XUẤT KHO
 *
 * Trước đây doanh thu vào hệ thống bằng cách nạp file Excel hàng tháng. Nay bỏ
 * hẳn: xuất kho là gốc, doanh thu suy ra từ đó. Hàng rời kho và đã giao xong
 * thì đó là một lần bán, không cần ai nạp lại số vào lần nữa.
 *
 * Đổi lại một điều phải nhớ: doanh thu KHÔNG còn là dữ liệu lưu trong Firestore
 * nữa mà là SỐ TÍNH RA. Sửa một phiếu xuất là doanh thu kỳ đó đổi theo ngay.
 * Đó là cái giá của việc chỉ có một nguồn sự thật, và là cái giá đáng trả:
 * trước kia kho và doanh thu lệch nhau thì không ai biết bên nào đúng.
 *
 * GIÁ VÀ THUẾ không đặt ở đây. Toàn bộ nằm trong `invoice.ts`, lấy từ file
 * công nợ của bộ phận và đã đối chiếu khớp đến từng đồng. Chỗ này chỉ chọn
 * chặng bán nào.
 *
 * CHẶNG ĐANG DÙNG: SKB → DNC (30.000/lít, 14.000/lon). Đây cũng đúng là chặng
 * mà thuế tiêu thụ đặc biệt được bóc ra để có Doanh thu 511.
 */

import type { Partner, Product, RevenueRecord, Transaction } from "../types";
import {
  breakdown,
  exciseSplit,
  invoiceUnitOf,
  PRICE_TABLE,
} from "./invoice";
import { billableTransactions } from "./sapExport";

/**
 * Khoá của dòng doanh thu, suy thẳng từ dòng xuất kho sinh ra nó.
 *
 * Một dòng xuất kho ↔ một dòng doanh thu, không gộp. Gộp theo kỳ thì mất dấu
 * lô và không tra ngược được dòng doanh thu này đến từ lần giao nào.
 */
export const revenueIdOf = (transactionId: string): string =>
  `dt-${transactionId}`;

/** Dòng xuất kho không dựng được thành doanh thu đúng, kèm lý do. */
export interface RevenueIssue {
  transactionId: string;
  productName: string;
  quantity: number;
  reason: "missing_material_code" | "unit_not_one_to_one";
}

export interface RevenueFromStockResult {
  records: RevenueRecord[];
  /**
   * Dòng thiếu mã vật tư. VẪN được tính vào doanh thu — bán rồi là bán rồi —
   * nhưng không lên được hóa đơn cho tới khi bổ sung mã, nên phải hiện ra.
   */
  missingMaterialCode: RevenueIssue[];
  /**
   * Sản phẩm có `conversionFactor` khác 1: đơn vị kho không còn bằng đơn vị
   * hóa đơn, nên nhân thẳng số lượng với đơn giá là SAI TIỀN.
   *
   * Hiện danh mục không có sản phẩm nào như vậy. Để đây làm chốt chặn: ngày
   * nào thêm sản phẩm bán theo két hay thùng, nó báo ngay thay vì âm thầm ra
   * một con số nhỏ hơn thực tế nhiều lần.
   */
  unitMismatch: RevenueIssue[];
}

/**
 * Dựng toàn bộ dòng doanh thu từ danh sách giao dịch.
 *
 * Lấy dòng nào: dùng chung `billableTransactions()` với phần xuất hóa đơn SAP —
 * chỉ `OUT` đã giao xong. Hàng đang đi đường chưa giao xong nên chưa phải doanh
 * thu; hao hụt và hàng hỏng không phải bán. Dùng chung một hàm để hai chỗ không
 * bao giờ hiểu khác nhau về câu "dòng nào là một lần bán".
 */
export function revenueFromStockOut(input: {
  transactions: Transaction[];
  products: Product[];
  partners?: Partner[];
}): RevenueFromStockResult {
  const productById = new Map<string, Product>();
  input.products.forEach((p) => productById.set(p.id, p));

  const partnerById = new Map<string, Partner>();
  (input.partners || []).forEach((p) => partnerById.set(p.id, p));

  const records: RevenueRecord[] = [];
  const missingMaterialCode: RevenueIssue[] = [];
  const unitMismatch: RevenueIssue[] = [];

  billableTransactions(input.transactions).forEach((t) => {
    const product = productById.get(t.productId);
    const partner = partnerById.get(t.partnerId);
    const productName = product?.name || t.productName || "(không rõ)";
    const quantity = Number(t.quantity) || 0;

    const unit = invoiceUnitOf(product?.category || t.category);
    const unitPrice = PRICE_TABLE[unit].skbToDnc;
    const { amount, vat, amountWithVat } = breakdown(quantity, unitPrice);
    const { revenue511, exciseTax } = exciseSplit(amount);

    if (!product?.materialCode) {
      missingMaterialCode.push({
        transactionId: t.id,
        productName,
        quantity,
        reason: "missing_material_code",
      });
    }

    // Đơn vị kho phải bằng đơn vị hóa đơn thì mới nhân thẳng được.
    if (product && (product.conversionFactor || 1) !== 1) {
      unitMismatch.push({
        transactionId: t.id,
        productName,
        quantity,
        reason: "unit_not_one_to_one",
      });
    }

    records.push({
      id: revenueIdOf(t.id),
      date: t.date,
      productName,
      materialCode: product?.materialCode,
      unit,
      quantity,
      unitPrice,
      totalAmount: amount,
      amountBeforeVat: amount,
      vatAmount: vat,
      amountAfterVat: amountWithVat,
      exciseTax,
      revenue511,
      // Chưa phát hành hóa đơn thì chưa có số. Số thật do SAP cấp, điền vào
      // sau khi lệnh xuất chạy xong — không bịa ra một số tạm ở đây.
      invoiceNumber: "",
      partnerName: partner?.name || t.partnerName || "(không rõ)",
      partnerId: t.partnerId,
      deptCode: partner?.sapCode,
      sourceTransactionId: t.id,
      batchNumber: t.batchNumber,
    });
  });

  return { records, missingMaterialCode, unitMismatch };
}

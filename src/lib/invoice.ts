/**
 * BẢNG GIÁ VÀ CÔNG THỨC THUẾ CHO FILE CÔNG NỢ
 *
 * Toàn bộ con số ở đây lấy từ file "công nợ T07.2026.xlsx" của bộ phận. Gom
 * về một chỗ để khi giá đổi thì chỉ sửa đúng một nơi, không phải dò khắp app.
 *
 * Hàng bia đi qua HAI CHẶNG BÁN, mỗi chặng một mức giá:
 *
 *   SKB ──(giá SKB→DNC)──▶ DNC ──(giá DNC→ĐVTV)──▶ BNC và các đơn vị thành viên
 *
 * File công nợ ghi cả hai chặng cạnh nhau nên bảng kết xuất có hai khối cột
 * tiền giống hệt nhau, chỉ khác đơn giá.
 *
 * VỀ THUẾ (đã đối chiếu với số thật trong file, khớp đến từng đồng):
 *
 *   Thành tiền = số lượng × đơn giá        (đây là giá ĐÃ GỒM thuế TTDB)
 *   Doanh thu 511 = Thành tiền ÷ 1,65      (bóc thuế tiêu thụ đặc biệt 65%)
 *   Thuế TTDB = Thành tiền − Doanh thu 511
 *   VAT = Thành tiền × 10%
 *
 * Ví dụ kiểm chứng — dòng đầu file T7: 3.311 lít × 30.000 = 99.330.000;
 * 99.330.000 ÷ 1,65 = 60.200.000 (đúng cột "Doanh thu 511");
 * phần dư 39.130.000 đúng cột "Thuế TTDB".
 *
 * LƯU Ý: file T8.2026 BỎ hai cột "Thuế TTDB" và "Doanh thu 511", chỉ còn 18
 * cột. Hai số đó vẫn tính (kế toán cần cho bút toán 511) nhưng không ghi vào
 * sheet nữa — xem `congNo.ts`. Đã đối chiếu lại giá với file T8: khớp.
 */
import type { Category } from '../types';

/** Thuế giá trị gia tăng. */
export const VAT_RATE = 0.1;

/** Thuế tiêu thụ đặc biệt với bia. */
export const EXCISE_RATE = 0.65;

/** Đơn vị tính ghi trên hóa đơn — chỉ có hai loại. */
export type InvoiceUnit = 'LIT' | 'LON';

/** Đơn giá theo từng chặng bán, chưa gồm VAT. */
export const PRICE_TABLE: Record<
  InvoiceUnit,
  { skbToDnc: number; dncToMember: number }
> = {
  LIT: { skbToDnc: 30_000, dncToMember: 32_000 },
  LON: { skbToDnc: 14_000, dncToMember: 15_458 },
};

/** Bia lon ghi LON, còn lại (bia hơi, chai) ghi LIT như file gốc. */
export function invoiceUnitOf(category: Category): InvoiceUnit {
  return category === 'Lon' ? 'LON' : 'LIT';
}

export interface AmountBreakdown {
  /** Số lượng × đơn giá. */
  amount: number;
  vat: number;
  /** Thành tiền sau thuế = thành tiền + VAT. */
  amountWithVat: number;
}

export function breakdown(quantity: number, unitPrice: number): AmountBreakdown {
  const amount = quantity * unitPrice;
  const vat = amount * VAT_RATE;
  return { amount, vat, amountWithVat: amount + vat };
}

/** Bóc thuế tiêu thụ đặc biệt ra khỏi thành tiền chặng SKB→DNC. */
export function exciseSplit(amount: number): {
  revenue511: number;
  exciseTax: number;
} {
  const revenue511 = amount / (1 + EXCISE_RATE);
  return { revenue511, exciseTax: amount - revenue511 };
}

/**
 * Hình dạng bảng công nợ (18 cột, chia đợt, cấp số hóa đơn) nằm ở `congNo.ts`.
 * Ở đây chỉ giữ GIÁ và CÔNG THỨC THUẾ, để đổi giá không phải đụng vào bảng.
 */

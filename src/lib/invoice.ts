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
 * Ví dụ kiểm chứng — dòng đầu file gốc: 3.311 lít × 30.000 = 99.330.000;
 * 99.330.000 ÷ 1,65 = 60.200.000 (đúng cột "Doanh thu 511");
 * phần dư 39.130.000 đúng cột "Thuế TTDB".
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
 * Một dòng của sheet "Chốt" trong file công nợ.
 *
 * Thứ tự các trường ở đây CHÍNH LÀ thứ tự 21 cột trong file gốc — đừng đảo,
 * vì hàm kết xuất ghi thẳng theo thứ tự này để dán được vào file tháng.
 */
export interface DebtRow {
  'Ngày giao bia': string;
  'Ngày hóa đơn (ngày nhận)': string;
  STT: number;
  'Đơn vị': string;
  'Mã vật tư': string;
  'Tên hàng hóa': string;
  'Đơn vị tính': InvoiceUnit;
  'Số lượng': number;
  'SKB - TLD': number;
  'Thành tiền': number;
  VAT: number;
  'Thành tiền sau thuế': number;
  'Số hóa đơn': string;
  'Đơn giá': number;
  'Thành tiền ': number;
  'VAT ': number;
  'Thành tiền sau thuế ': number;
  'Mã BP': string;
  'Đơn vị xuất': string;
  'Thuế TTDB': number;
  'Doanh thu 511': number;
}

/** Tên cột đúng thứ tự file gốc, dùng cho cả tiêu đề lẫn thứ tự ghi. */
export const DEBT_COLUMNS: (keyof DebtRow)[] = [
  'Ngày giao bia',
  'Ngày hóa đơn (ngày nhận)',
  'STT',
  'Đơn vị',
  'Mã vật tư',
  'Tên hàng hóa',
  'Đơn vị tính',
  'Số lượng',
  'SKB - TLD',
  'Thành tiền',
  'VAT',
  'Thành tiền sau thuế',
  'Số hóa đơn',
  'Đơn giá',
  'Thành tiền ',
  'VAT ',
  'Thành tiền sau thuế ',
  'Mã BP',
  'Đơn vị xuất',
  'Thuế TTDB',
  'Doanh thu 511',
];

/** Bên đứng tên xuất hàng, ghi cố định ở cột "Đơn vị xuất" như file gốc. */
export const ISSUING_PARTY = 'DNC';

export interface BuildRowInput {
  deliveryPeriod: string;
  invoiceDate: string;
  index: number;
  unitName: string;
  materialCode: string;
  productName: string;
  unit: InvoiceUnit;
  quantity: number;
  sapCode: string;
  invoiceNumber?: string;
}

/** Dựng một dòng công nợ hoàn chỉnh từ số lượng đã tổng hợp. */
export function buildDebtRow(input: BuildRowInput): DebtRow {
  const price = PRICE_TABLE[input.unit];
  const skb = breakdown(input.quantity, price.skbToDnc);
  const member = breakdown(input.quantity, price.dncToMember);
  const { revenue511, exciseTax } = exciseSplit(skb.amount);

  return {
    'Ngày giao bia': input.deliveryPeriod,
    'Ngày hóa đơn (ngày nhận)': input.invoiceDate,
    STT: input.index,
    'Đơn vị': input.unitName,
    'Mã vật tư': input.materialCode,
    'Tên hàng hóa': input.productName,
    'Đơn vị tính': input.unit,
    'Số lượng': input.quantity,
    'SKB - TLD': price.skbToDnc,
    'Thành tiền': skb.amount,
    VAT: skb.vat,
    'Thành tiền sau thuế': skb.amountWithVat,
    'Số hóa đơn': input.invoiceNumber || '',
    'Đơn giá': price.dncToMember,
    'Thành tiền ': member.amount,
    'VAT ': member.vat,
    'Thành tiền sau thuế ': member.amountWithVat,
    'Mã BP': input.sapCode,
    'Đơn vị xuất': ISSUING_PARTY,
    'Thuế TTDB': exciseTax,
    'Doanh thu 511': revenue511,
  };
}

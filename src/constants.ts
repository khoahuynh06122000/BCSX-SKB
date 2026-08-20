import { Product, Partner } from './types';

/**
 * Danh mục bia — 11 mặt hàng, chốt theo danh sách bộ phận gửi 20/08/2026.
 *
 * `materialCode` là mã vật tư SAP. Đây là chìa khoá thật của mặt hàng: nạp file
 * BBGN và kết xuất hóa đơn đều khớp bằng MÃ, cố ý không khớp theo tên — vì tên
 * trong file bộ phận viết mỗi chỗ một kiểu ("Bia Gorlden Zest", "Bia Atlas Wings
 * Dark Lager") và "Bia Wings Dark Lager" thì nằm trọn trong "Bia Wings Dark
 * Lager 330ml", khớp mờ theo tên là gán sai sản lượng sang sai mặt hàng.
 *
 * `category` quyết định ĐƠN GIÁ: hàng Lít 30.000, hàng Lon 14.000 (xem
 * `invoice.ts`). Khai nhầm loại là tiền sai hơn gấp đôi, nên lấy đúng theo cột
 * ĐVT trong danh sách bộ phận chứ không suy từ tên.
 */
export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p12', name: 'Bia Eclipse Plaza Dry Hop Wheat VN', materialCode: '10191539', category: 'Lít', unit: 'Lít', price: 54000, conversionFactor: 1, capacityPerUnit: 1000 },
  { id: 'p1', name: 'Bia Golden Bridge Helles Lager', materialCode: '10168107', category: 'Lít', unit: 'Lít', price: 45000, conversionFactor: 1, capacityPerUnit: 1000 },
  { id: 'p4', name: 'Bia Golden Bridge Helles Lager lon330ml', materialCode: '10168110', category: 'Lon', unit: 'Lon', price: 15833, conversionFactor: 1, capacityPerUnit: 330 },
  { id: 'p11', name: 'Bia Helios Wheat Lager', materialCode: '10191541', category: 'Lít', unit: 'Lít', price: 53000, conversionFactor: 1, capacityPerUnit: 1000 },
  { id: 'p15', name: 'Bia Lunar Castle Dry hop Pale Ale', materialCode: '10174040', category: 'Lít', unit: 'Lít', price: 55000, conversionFactor: 1, capacityPerUnit: 1000 },
  { id: 'p17', name: 'Bia Lunar Castle Dry hop Pale Ale 330ml', materialCode: '10174039', category: 'Lon', unit: 'Lon', price: 17500, conversionFactor: 1, capacityPerUnit: 330 },
  { id: 'p10', name: 'Bia Volcano Kiss dry hop lager', materialCode: '10186383', category: 'Lít', unit: 'Lít', price: 58000, conversionFactor: 1, capacityPerUnit: 1000 },
  { id: 'p2', name: 'Bia Wings Dark Lager', materialCode: '10168108', category: 'Lít', unit: 'Lít', price: 48000, conversionFactor: 1, capacityPerUnit: 1000 },
  { id: 'p5', name: 'Bia Wings Dark Lager 330ml', materialCode: '10168111', category: 'Lon', unit: 'Lon', price: 17083, conversionFactor: 1, capacityPerUnit: 330 },
  { id: 'p18', name: 'Bia Rosa Garden Light Lager', materialCode: '10218490', category: 'Lít', unit: 'Lít', price: 45000, conversionFactor: 1, capacityPerUnit: 1000 },
  { id: 'p14', name: 'BNC_ Bia Tail 20 lít/ bom', materialCode: '10224742', category: 'Lít', unit: 'Lít', price: 47000, conversionFactor: 1, capacityPerUnit: 1000 },
];

export const INITIAL_PARTNERS: Partner[] = [
  { id: 'SKB-BNC', sapCode: 'SKB-BNC', name: 'SKB-BNC', type: 'SUPPLIER' },
  { id: 'AD0104', sapCode: 'AD0104', name: 'APC', type: 'AGENT' },
  { id: 'AC0118', sapCode: 'AC0118', name: 'BNG', type: 'AGENT' },
  { id: 'AC0132', sapCode: 'AC0132', name: 'Capella', type: 'AGENT' },
  { id: 'AC0107', sapCode: 'AC0107', name: 'FV', type: 'AGENT' },
  { id: 'AD0106', sapCode: 'AD0106', name: 'HTI', type: 'AGENT' },
  { id: 'AC0103', sapCode: 'AC0103', name: 'ITC', type: 'AGENT' },
  { id: 'AC0104', sapCode: 'AC0104', name: 'NVT', type: 'AGENT' },
  { id: 'AC0129', sapCode: 'AC0129', name: 'CCP', type: 'AGENT' },
  { id: 'AC0105', sapCode: 'AC0105', name: 'PVD', type: 'AGENT' },
  { id: 'AD0114', sapCode: 'AD0114', name: 'Hà Nam', type: 'AGENT' },
  { id: 'AD0103', sapCode: 'AD0103', name: 'BNC', type: 'AGENT' },
  { id: 'AC0128', sapCode: 'AC0128', name: 'OHL', type: 'AGENT' },
  { id: 'AC0102', sapCode: 'AC0102', name: 'MGS', type: 'AGENT' },
  { id: 'AD0101', sapCode: 'AD0101', name: 'Cát Bà', type: 'AGENT' },
  { id: 'AB0117', sapCode: 'AB0117', name: 'SHD', type: 'AGENT' },
  { id: 'AB0125', sapCode: 'AB0125', name: 'PQC', type: 'AGENT' },
  { id: 'AC0130', sapCode: 'AC0130', name: 'Serena', type: 'AGENT' },
  { id: 'AA0101', sapCode: 'AA0101', name: 'SPA', type: 'AGENT' },
  { id: 'AD0100', sapCode: 'AD0100', name: 'HLS', type: 'AGENT' },
  { id: 'AD0115', sapCode: 'AD0115', name: 'SVT', type: 'AGENT' },
  { id: 'AD0112', sapCode: 'AD0112', name: 'FSS', type: 'AGENT' },
  { id: 'Ngiao', sapCode: '', name: 'Khách ngoại giao', type: 'AGENT' },
  { id: 'SYSTEM_SYNC', sapCode: 'SYNC', name: 'Tin Tin (Hệ thống)', type: 'AGENT' },
];

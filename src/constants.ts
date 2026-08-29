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

/**
 * Đơn vị nhận bia — chốt theo danh sách bộ phận gửi 20/08/2026.
 *
 * BNC ĐƯỢC CHIA LÀM 21 BỘ PHẬN, theo danh mục bộ phận gửi ngày 22/08/2026 và
 * bổ sung "Shushi Rosa" ngày 27/08/2026.
 * Cả 20 cùng mã SAP `AD0103` vì với SAP thì đó vẫn là một khách hàng; chia ở
 * đây để biết bia đi tới đâu trong khu:
 *
 *   18 điểm bán       — 1901, Plaza, Lễ Hội Bia, 4 Mùa, Kavkaz, Taiga, Hội An,
 *                       Cổng Thành 1, Sunbun Vạn Hoa, Cầu Vàng, Ga 10,
 *                       Rosa Gà Rán, Shushi Rosa, B8, Lâu Đài, Bulgogi,
 *                       Arapang, Gastrobup
 *   BNC · Ngoại giao  — hàng đối ngoại, biếu tặng
 *   BNC · HTKD        — điểm hợp tác kinh doanh (El Fresco, Mini Mart)
 *   BNC · Chi phí khác — phần không thuộc các bộ phận trên
 *
 * Trước đây các điểm bán trên bị gom hết vào một mục "Nội bộ" — nhìn báo cáo
 * chỉ thấy một dòng 53.026 lít mà không biết quán nào uống bao nhiêu. Tách ra
 * thì mỗi điểm bán là một dòng riêng.
 *
 * Không còn mục "BNC" trơn: mọi lần xuất cho BNC đều thuộc đúng một bộ phận.
 *
 * Cả 21 cố ý xếp liền nhau trong mảng — ô chọn đơn vị gộp chúng thành một dòng
 * "BNC" đặt đúng vị trí này, rồi hiện bộ phận thành các nút bên dưới.
 */
export const INITIAL_PARTNERS: Partner[] = [
  // Nhà máy — nguồn hàng nhập, không phải đơn vị nhận.
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

  // BNC — 21 bộ phận, cùng mã SAP AD0103. Thứ tự theo danh mục bộ phận gửi.
  { id: 'AD0103-1901', sapCode: 'AD0103', name: 'BNC · 1901', type: 'AGENT' },
  { id: 'AD0103-PLAZA', sapCode: 'AD0103', name: 'BNC · Plaza', type: 'AGENT' },
  { id: 'AD0103-LHB', sapCode: 'AD0103', name: 'BNC · Lễ Hội Bia', type: 'AGENT' },
  { id: 'AD0103-4M', sapCode: 'AD0103', name: 'BNC · 4 Mùa', type: 'AGENT' },
  { id: 'AD0103-KAV', sapCode: 'AD0103', name: 'BNC · Kavkaz', type: 'AGENT' },
  { id: 'AD0103-TAIGA', sapCode: 'AD0103', name: 'BNC · Taiga', type: 'AGENT' },
  { id: 'AD0103-HOIAN', sapCode: 'AD0103', name: 'BNC · Hội An', type: 'AGENT' },
  { id: 'AD0103-CT1', sapCode: 'AD0103', name: 'BNC · Cổng Thành 1', type: 'AGENT' },
  { id: 'AD0103-SBVH', sapCode: 'AD0103', name: 'BNC · Sunbun Vạn Hoa', type: 'AGENT' },
  { id: 'AD0103-CV', sapCode: 'AD0103', name: 'BNC · Cầu Vàng', type: 'AGENT' },
  { id: 'AD0103-GA10', sapCode: 'AD0103', name: 'BNC · Ga 10', type: 'AGENT' },
  { id: 'AD0103-ROSA', sapCode: 'AD0103', name: 'BNC · Rosa Gà Rán', type: 'AGENT' },
  { id: 'AD0103-SUSHI', sapCode: 'AD0103', name: 'BNC · Shushi Rosa', type: 'AGENT' },
  { id: 'AD0103-B8', sapCode: 'AD0103', name: 'BNC · B8', type: 'AGENT' },
  { id: 'AD0103-LAUDAI', sapCode: 'AD0103', name: 'BNC · Lâu Đài', type: 'AGENT' },
  { id: 'AD0103-BULGOGI', sapCode: 'AD0103', name: 'BNC · Bulgogi', type: 'AGENT' },
  { id: 'AD0103-ARAPANG', sapCode: 'AD0103', name: 'BNC · Arapang', type: 'AGENT' },
  { id: 'AD0103-GASTRO', sapCode: 'AD0103', name: 'BNC · Gastrobup', type: 'AGENT' },
  { id: 'AD0103-NG', sapCode: 'AD0103', name: 'BNC · Ngoại giao', type: 'AGENT' },
  { id: 'AD0103-HTKD', sapCode: 'AD0103', name: 'BNC · HTKD', type: 'AGENT' },
  { id: 'AD0103-CPK', sapCode: 'AD0103', name: 'BNC · Chi phí khác', type: 'AGENT' },

  { id: 'AC0128', sapCode: 'AC0128', name: 'OHL', type: 'AGENT' },
  { id: 'AC0102', sapCode: 'AC0102', name: 'MGS', type: 'AGENT' },
  { id: 'AD0101', sapCode: 'AD0101', name: 'Cát bà', type: 'AGENT' },
  { id: 'AB0117', sapCode: 'AB0117', name: 'SHD', type: 'AGENT' },
  { id: 'AB0125', sapCode: 'AB0125', name: 'PQC', type: 'AGENT' },
  { id: 'AC0130', sapCode: 'AC0130', name: 'Serena', type: 'AGENT' },
  { id: 'AA0101', sapCode: 'AA0101', name: 'SPA', type: 'AGENT' },
  { id: 'AD0100', sapCode: 'AD0100', name: 'HLS', type: 'AGENT' },
  { id: 'AD0115', sapCode: 'AD0115', name: 'SVT', type: 'AGENT' },
  { id: 'AD0112', sapCode: 'AD0112', name: 'FSS', type: 'AGENT' },
  { id: 'AA0100', sapCode: 'AA0100', name: 'SAIR', type: 'AGENT' },

  // Đối tác hệ thống, không phải đơn vị nhận hàng thật.
  { id: 'SYSTEM_SYNC', sapCode: 'SYNC', name: 'Tin Tin (Hệ thống)', type: 'AGENT' },
];

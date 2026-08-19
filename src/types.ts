/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Lon' | 'Lít' | 'Chai';
export type TransactionType = 'IN' | 'OUT' | 'OPENING' | 'LOSS' | 'DAMAGE';
/** PENDING = đã đăng nhập Google nhưng chủ sở hữu chưa duyệt. */
export type UserRole = 'OWNER' | 'STAFF' | 'VIEWER' | 'PENDING';

/**
 * Hồ sơ người dùng, lưu ở collection `users`, khoá là Firebase Auth UID.
 *
 * Không còn trường `password`/`pin`/`recoveryCode` như bản cũ: mật khẩu do
 * Google quản lý, app không giữ gì cả. Vai trò chỉ chủ sở hữu mới sửa được
 * (xem firestore.rules).
 */
export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  photoURL?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
  /** Email của người đã duyệt tài khoản này. */
  approvedBy?: string;
  /**
   * Mã PIN đã băm bằng PBKDF2 (xem src/lib/pin.ts) — KHÔNG lưu số thật.
   * Đây là lớp khoá màn hình cho máy dùng chung, không thay thế đăng nhập.
   */
  pinHash?: string;
  pinUpdatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  /**
   * Mã vật tư SAP (ví dụ 10168107). Dùng để khớp khi nạp file BBGN và để
   * xuất ra file công nợ. Sản phẩm chưa có mã thì không lên được hóa đơn.
   */
  materialCode?: string;
  category: Category;
  unit: string; // e.g., 'Thùng', 'Bom', 'Két'
  price: number; // Giá trị ước tính trên mỗi đơn vị (VNĐ)
  conversionFactor?: number; // e.g., số lượng đơn vị quy đổi (1 thùng = 24 lon, hoặc 1 lít = 1000ml)
  capacityPerUnit: number; // Trong ml (ví dụ: 330(ml) cho lon, 20000(ml) cho bom bia hơi)
  /**
   * Định mức tồn tối thiểu; dưới mức này thì báo "sắp hết".
   *
   * Không đặt thì dùng ngưỡng chung DEFAULT_MIN_STOCK. Trước đây trường này
   * không có trong kiểu nhưng code vẫn đọc `p.minStock`, nên định mức luôn là
   * undefined và phép so `stock <= undefined` luôn sai — danh sách "sắp hết
   * hàng" vì vậy chưa bao giờ hiện được sản phẩm nào.
   */
  minStock?: number;
}

export interface Partner {
  id: string;
  sapCode?: string; // Mã SAP
  name: string;
  phone?: string;
  address?: string;
  type: 'SUPPLIER' | 'AGENT' | 'RESTAURANT' | 'INDIVIDUAL';
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  type: TransactionType;
  productId: string;
  productName: string; // Denormalized for storage/history
  category: Category;
  quantity: number;
  partnerId: string;
  partnerName: string; // Denormalized
  notes?: string;
  batchNumber?: string; // Số lô
  evidencePhotoUrl?: string; // Ảnh biên bản
  evidencePhotoUrls?: string[]; // Multiple evidence photos
  createdBy: string; // Người thực hiện
  referenceGroupId?: string; // To group split transactions (e.g., one export split into multiple batches)
  status?: 'completed' | 'in_transit'; // Default: completed
  originalQuantity?: number; // Store original qty if reported as loss
  deliveryDate?: string; // Date when actually received
  /**
   * Mã phiếu nhập kho của LƯỢT GIAO NHẬN này, dạng `PN-YYMMDD-NN`.
   *
   * Chỉ giao dịch NHẬP điền tay mới có. Có mã nghĩa là số lượng này chỉ vào tồn
   * kho khi phiếu đó đã có ảnh ký tươi — xem `src/lib/slip.ts`. Nhập từ file
   * Excel và tồn đầu kỳ không có mã, nên vào tồn ngay.
   */
  slipCode?: string;
}

export interface BatchInfo {
  batchNumber: string;
  productId: string;
  productName: string;
  category: Category;
  stock: number;
  importDate: string;
  lastExportDate?: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  category: Category;
  unit: string;
  stock: number;
  totalLiters: number;
  minStock: number;
  /**
   * Số đã điền nhưng chưa có ảnh phiếu ký — CHƯA nằm trong `stock`.
   *
   * Để riêng chứ không cộng vào `stock`: cộng vào là mất lớp kiểm soát chữ ký.
   * Chỉ dùng để hiển thị cho thấy hàng vừa nhập, không dùng cho phép tính nào.
   */
  pendingStock: number;
}

/**
 * PHIẾU NHẬP KHO — MỘT LƯỢT GIAO NHẬN LÀ MỘT PHIẾU.
 *
 * Chỉ lưu phần "vỏ" (trạng thái, ảnh đã ký, thời điểm in). Nội dung các dòng
 * hàng KHÔNG lưu ở đây mà suy ra từ các `transactions` có cùng `slipCode` —
 * nhờ vậy sửa giao dịch thì phiếu tự khớp theo, không bị lệch hai nguồn.
 *
 * Mã phiếu dùng luôn làm khoá tài liệu, dạng `PN-YYMMDD-NN` (ví dụ
 * PN-260818-02 là lượt giao thứ hai trong ngày 18/08/2026). Toàn bộ phép tính
 * quanh mã phiếu và việc duyệt nằm ở `src/lib/slip.ts`.
 *
 * `signed` (đã có ảnh ký) là điều kiện để số lượng trên phiếu VÀO TỒN KHO.
 */
export type SlipStatus = 'draft' | 'printed' | 'signed';

export interface ImportSlip {
  /** = code, dạng PN-YYMMDD-NN */
  id: string;
  code: string;
  /** Ngày nhập kho của phiếu, dạng yyyy-MM-dd */
  date: string;
  status: SlipStatus;
  printedAt?: string;
  /** Ảnh phiếu giấy đã ký tươi, lưu trên Cloudinary. */
  signedPhotoUrls?: string[];
  signedAt?: string;
  signedBy?: string;
  note?: string;
  updatedAt?: string;
}

/**
 * MỘT DÒNG HÀNG TRÊN HÓA ĐƠN BÁN.
 *
 * Về tiền: file Excel của các đơn vị không thống nhất cột nào là trước thuế,
 * cột nào là sau thuế. Bản cũ đọc "Thành tiền sau thuế", không có thì lấy
 * "Thành tiền" (trước thuế) và nhồi cả hai vào `totalAmount` — nạp hai file
 * khác định dạng là tổng doanh thu lệch đúng phần VAT mà không ai thấy.
 *
 * Nay lưu tách bạch ba số. `totalAmount` giữ nguyên tên (nhiều nơi đang đọc)
 * nhưng luôn mang nghĩa DOANH THU TRƯỚC VAT — đúng nghĩa doanh thu.
 */
export interface RevenueRecord {
  id: string;
  date: string;
  productName: string;
  materialCode?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  /** Doanh thu trước VAT. Đây là số dùng cho mọi báo cáo doanh thu. */
  totalAmount: number;
  vatAmount?: number;
  /** = totalAmount, để dành đọc cho rõ nghĩa khi viết code mới. */
  amountBeforeVat?: number;
  /** Tổng tiền khách trả (trước VAT + VAT). */
  amountAfterVat?: number;
  invoiceNumber?: string;
  partnerName: string;
  partnerId?: string;
  deptCode?: string;
  /** Thuế tiêu thụ đặc biệt đã bóc ra khỏi thành tiền. */
  exciseTax?: number;
  /** Thành tiền sau khi bóc thuế TTĐB — số ghi vào tài khoản 511. */
  revenue511?: number;
  /**
   * Dòng xuất kho đã sinh ra dòng doanh thu này.
   *
   * Doanh thu là số TÍNH RA từ xuất kho, không phải dữ liệu nạp vào, nên luôn
   * tra ngược được về lần giao hàng gốc. Xem `src/lib/revenueFromStock.ts`.
   */
  sourceTransactionId?: string;
  batchNumber?: string;
}

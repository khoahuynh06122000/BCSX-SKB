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
}

/**
 * PHIẾU NHẬP KHO — gộp toàn bộ giao dịch nhập trong một ngày thành một phiếu.
 *
 * Chỉ lưu phần "vỏ" (trạng thái, ảnh đã ký, thời điểm in). Nội dung các dòng
 * hàng KHÔNG lưu ở đây mà suy ra từ `transactions` có type IN trong ngày —
 * nhờ vậy sửa giao dịch thì phiếu tự khớp theo, không bị lệch hai nguồn.
 *
 * Mã phiếu dùng luôn làm khoá tài liệu, dạng `PN-YYMMDD` (ví dụ PN-260811).
 */
export type SlipStatus = 'draft' | 'printed' | 'signed';

/**
 * Kết quả AI đối soát ảnh phiếu đã ký với số liệu trong hệ thống.
 *
 * Đây là CẢNH BÁO ĐỂ NGƯỜI XEM LẠI, không phải kết luận giám định. AI có thể
 * bỏ sót sửa đổi tinh vi, hoặc báo nhầm khi ảnh mờ / chữ viết xấu.
 */
export interface SlipVerification {
  checkedAt: string;
  checkedBy?: string;
  /** ok = đã ký và số khớp · warning = lệch số hoặc nghi bị sửa · unsigned = chưa ký */
  verdict: 'ok' | 'warning' | 'unsigned';
  signaturePresent: boolean;
  signedBoxes?: string[];
  mismatchCount: number;
  rows?: {
    name: string;
    expectedQuantity?: number;
    paperQuantity?: number;
    matched: boolean;
  }[];
  alterationSuspected: boolean;
  alterationNotes?: string;
  imageQualityNote?: string;
}

export interface ImportSlip {
  /** = code, dạng PN-YYMMDD */
  id: string;
  code: string;
  /** Ngày của phiếu, dạng yyyy-MM-dd */
  date: string;
  status: SlipStatus;
  printedAt?: string;
  /** Ảnh phiếu giấy đã ký tươi, lưu trên Cloudinary. */
  signedPhotoUrls?: string[];
  signedAt?: string;
  signedBy?: string;
  /** Kết quả AI đối soát ảnh phiếu ký với số trong hệ thống. */
  verification?: SlipVerification;
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
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Lon' | 'Lít' | 'Chai';
export type TransactionType = 'IN' | 'OUT' | 'OPENING' | 'LOSS' | 'DAMAGE';
/**
 * Vai trò người dùng.
 *
 * PENDING = đã đăng nhập Google nhưng chủ sở hữu chưa duyệt. Đây là cánh cửa
 * thật của hệ thống: tài khoản Google nào cũng đăng nhập được, nhưng PENDING
 * thì không đọc ghi được gì cho tới khi được duyệt.
 *
 * KE_TOAN = kế toán, làm được mọi việc nghiệp vụ kể cả THAO TÁC DOANH THU
 * (tạo lệnh xuất hóa đơn lên SAP, dọn số liệu). Các vai trò còn lại vẫn XEM
 * được doanh thu — số liệu kinh doanh thì cả bộ phận cùng nhìn — nhưng không
 * đụng vào được, vì phát hành hóa đơn là việc có hậu quả pháp lý.
 *
 * Đổi vai trò người dùng thì vẫn chỉ chủ sở hữu làm được, kể cả kế toán: mở
 * ra thì người vừa được duyệt lại đi duyệt người khác, cánh cửa duy nhất còn
 * lại tự nó mở toang.
 */
/**
 * Vai trò của tài khoản.
 *
 * `NHAP_KHO` và `XUAT_KHO` là hai vai trò MỘT CHIỀU: xem được hết nhưng chỉ ghi
 * được đúng chiều của mình. `DNC` là khối cung ứng — chỉ XEM, và chỉ xem được
 * dữ liệu chiều xuất. Xem `src/lib/quyen.ts`.
 *
 * Hai vai trò cũ `STAFF` và `VIEWER` đã bỏ ngày 30/08/2026 (không tài khoản nào
 * mang chúng). Tài liệu nào còn ghi hai tên đó là tài liệu cũ.
 */
export type UserRole =
  | 'OWNER'
  | 'KE_TOAN'
  | 'QUAN_LY_XUONG'
  | 'SAN_XUAT'
  | 'NHAP_KHO'
  | 'XUAT_KHO'
  | 'DNC'
  | 'PENDING';

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
  pinHash?: string | null;
  /** Muối ngẫu nhiên theo người dùng (16 bytes hex) dùng cùng PBKDF2-310k. */
  pinSalt?: string | null;
  pinUpdatedAt?: string | null;
  /** Số lần nhập sai PIN liên tiếp (lưu trên máy chủ, 0..5). */
  pinFailCount?: number;
  /** True khi nhập sai PIN 5 lần — chỉ mở khóa sau khi đăng nhập lại Google hoặc chủ sở hữu đặt lại. */
  pinLocked?: boolean;
  /** True khi vừa được chủ sở hữu cấp mã PIN tạm — bắt buộc đổi PIN mới sau khi mở khóa. */
  pinMustChange?: boolean;
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
  /**
   * Mã lô sản xuất của dòng NHẬP — chỉ để ghi nhận và truy nguồn (in lên phiếu,
   * hiện trong báo cáo nhập). Tồn kho KHÔNG tính theo lô. Không bắt buộc.
   */
  batchNumber?: string;
  /**
   * Dòng ĐIỀU CHỈNH CÔNG NỢ (xuất nhầm đơn vị, hóa đơn đã phát hành) — luôn đi
   * thành cặp âm / dương cùng `referenceGroupId`, cộng lại bằng 0 nên tồn kho
   * không đổi. Xem `src/lib/dieuChinhCongNo.ts`.
   */
  dieuChinh?: {
    ngayGoc: string;
    lyDo: string;
    tuDoiTac: string;
    sangDoiTac: string;
  };
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
 * Chỉ lưu phần "vỏ" (trạng thái, thời điểm in, người ký). Nội dung các dòng
 * hàng KHÔNG lưu ở đây mà suy ra từ các `transactions` có cùng `slipCode` —
 * nhờ vậy sửa giao dịch thì phiếu tự khớp theo, không bị lệch hai nguồn.
 *
 * Mã phiếu dùng luôn làm khoá tài liệu, dạng `PN-YYMMDD-NN` (ví dụ
 * PN-260818-02 là lượt giao thứ hai trong ngày 18/08/2026). Toàn bộ phép tính
 * quanh mã phiếu và việc duyệt nằm ở `src/lib/slip.ts`.
 *
 * Ảnh tờ phiếu đã ký nằm ở bảng ảnh chứng từ (src/anh), gắn theo mã phiếu.
 * Có ảnh ký là điều kiện để số lượng trên phiếu VÀO TỒN KHO; `status` =
 * `signed` đi cùng lô với ảnh để luật máy chủ biết phiếu đã ký.
 */
export type SlipStatus =
  | 'draft'
  | 'printed'
  | 'cho_ql_xuong'
  | 'cho_kho_tong'
  | 'tra_lai'
  | 'signed';

export interface ChuKyDienTu {
  name: string;
  email: string;
  uid?: string;
  signedAt: string;
  token: string;
  note?: string;
  /** Mẫu chữ ký vẽ tay đã dùng (bảng `chu_ky_mau`, bất biến). */
  chuKyId?: string;
  /** SHA-256 nội dung chứng từ lúc ký — xem `lib/chuKy.ts`. */
  bamNoiDung?: string;
  /** Cách xác thực người ký lúc ký, ví dụ "GOOGLE+PIN". */
  xacThuc?: string;
}

export interface ImportSlip {
  /** = code, dạng PN-YYMMDD-NN */
  id: string;
  code: string;
  /** Ngày nhập kho của phiếu, dạng yyyy-MM-dd */
  date: string;
  status: SlipStatus;
  printedAt?: string;
  signedAt?: string;
  signedBy?: string;
  note?: string;
  updatedAt?: string;
  /** Chữ ký điện tử theo luồng Paperless 2 bước rào */
  creatorSig?: ChuKyDienTu;
  managerSig?: ChuKyDienTu;
  warehouseSig?: ChuKyDienTu;
  /** Thông tin trả lại khi rào 1 hoặc rào 2 phát hiện lệch thực tế / thiếu ảnh */
  rejectedBy?: string;
  rejectedReason?: string;
  rejectedAt?: string;
}

/** Kế hoạch sản xuất (Quản lý xưởng nạp -> kế thừa sang NV Sản xuất & Dashboard Kế toán). */
export interface KeHoachSanXuat {
  id: string;
  date: string; // yyyy-MM-dd
  productId: string;
  targetQty: number;
  batchHint?: string;
  source: string;
  note?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type SupervisionApprovalStatus = 'pending' | 'approved' | 'returned';

/** Đánh giá sản lượng sản xuất theo ca / ngày tại Xưởng. */
export interface DanhGiaSanXuat {
  id: string;
  date: string; // yyyy-MM-dd
  shift: string;
  productId: string;
  plannedQty: number;
  actualBrewedQty: number;
  rating: string;
  note: string;
  createdBy: string;
  createdAt: string;
  approvalStatus?: SupervisionApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

/** Kiểm kê lượng bia còn tồn tại bồn lên men (FST) và bồn thành phẩm (BBT) hàng tháng. */
export interface KiemKeBon {
  id: string;
  month: string; // yyyy-MM
  tankId: string;
  tankGroup: 'FST' | 'BBT';
  productId: string;
  batchNumber: string;
  liters: number;
  statusLabel?: string;
  createdBy: string;
  createdAt: string;
  approvalStatus?: SupervisionApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface KiemKeKegItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  liters: number;
  bookQuantity?: number;
  /** Kho tổng: số KIỆN đếm được — keg đầy (bia Lít) hoặc thùng (bia lon). */
  kienDem?: number;
  /** Kho tổng: phần LẺ — lít trong keg lẻ (bia Lít) hoặc lon lẻ (bia lon). */
  leDem?: number;
}

/** Kiểm kê Keg & Lít thực tế kèm ảnh hiện trường đóng dấu ngày giờ (Xưởng & Kho tổng). */
export interface KiemKeKegLit {
  id: string;
  date: string; // yyyy-MM-dd
  shiftOrPeriod?: string;
  location: 'XUONG' | 'KHO_TONG';
  items: KiemKeKegItem[];
  totalKegs: number;
  totalLiters: number;
  note?: string;
  createdBy: string;
  createdAt: string;
  approvalStatus?: SupervisionApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}


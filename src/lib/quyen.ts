/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * VAI TRÒ LÀM ĐƯỢC NHỮNG GÌ
 *
 * Một nơi duy nhất trả lời câu "vai trò này bấm được nút nào". Trước đây câu
 * trả lời rải trong giao diện dưới dạng `role === "OWNER" || role === "..."`,
 * nên mỗi lần thêm vai trò là phải đi tìm hết mọi chỗ so sánh — sót một chỗ thì
 * người dùng thấy nút, bấm vào, rồi bị máy chủ từ chối.
 *
 * PHẢI KHỚP ĐÚNG VỚI `firestore.rules`. Luật mới là chỗ chặn thật; bảng này chỉ
 * để giao diện hiện đúng. Lệch bên nào cũng sinh lỗi:
 *   · luật chặt hơn giao diện → người dùng làm xong mới bị từ chối
 *   · luật rộng hơn giao diện → mở DevTools là làm được thứ màn hình không cho
 *
 * HAI VAI TRÒ MỘT CHIỀU (27/08/2026). Trước đây mọi tài khoản đã duyệt đều
 * nhập kho và xuất kho được — `isStaff()` và `isViewer()` trong luật đều bằng
 * `isApproved()`. Nay tách: `NHAP_KHO` chỉ ghi chiều nhập, `XUAT_KHO` chỉ ghi
 * chiều xuất. Cả hai VẪN XEM ĐƯỢC HẾT: tồn kho, báo cáo, lịch sử đều trộn cả
 * hai chiều, chặn xem thì người nhập kho không tra nổi một lô hàng.
 *
 * BA VAI TRÒ CŨ GIỮ NGUYÊN QUYỀN. `VIEWER`, `STAFF`, `KE_TOAN` vẫn ghi được cả
 * hai chiều như trước — hạ quyền một tài khoản đang chạy việc thì hôm sau có
 * người không làm được việc mà không hiểu vì sao. Muốn siết ai thì đổi vai trò
 * người đó sang một trong hai vai trò mới.
 */

import type { UserRole } from "../types";

/** Loại giao dịch, đúng như trường `type` của tài liệu `transactions`. */
export type LoaiGiaoDich = "IN" | "OPENING" | "OUT" | "LOSS";

/**
 * Giao dịch thuộc chiều NHẬP: nhập kho và tồn đầu kỳ.
 *
 * Tồn đầu kỳ tính là nhập vì nó cũng làm tăng tồn, và người nhập kho là người
 * dựng số đầu kỳ.
 */
export function laChieuNhap(type: string): boolean {
  return type === "IN" || type === "OPENING";
}

/**
 * Giao dịch thuộc chiều XUẤT: xuất kho và hao hụt.
 *
 * Hao hụt để bên xuất kho theo yêu cầu của bộ phận: keg giao thực tế 20,6 lít
 * mà biên bản ghi tròn 20 — phần lẻ ấy phát sinh đúng lúc giao hàng.
 */
export function laChieuXuat(type: string): boolean {
  return type === "OUT" || type === "LOSS";
}

export interface Quyen {
  /** Đọc mọi số liệu. Ai đã được duyệt đều xem được. */
  xem: boolean;
  /** Ghi giao dịch chiều nhập, tạo phiếu nhập và tải ảnh phiếu đã ký. */
  ghiNhap: boolean;
  /** Ghi giao dịch chiều xuất, hao hụt, và sửa đối tác / điểm bán. */
  ghiXuat: boolean;
  /** Doanh thu, hóa đơn, lệnh xuất hóa đơn lên SAP. */
  doanhThu: boolean;
  /**
   * Nạp tệp Excel hàng loạt (BBGN, T Kho, doanh thu).
   *
   * Riêng kế toán và chủ sở hữu: nạp tệp là đổ hàng loạt vào sổ, sai một lần
   * là hỏng nhiều dòng cùng lúc và phải dò ngược từng dòng để gỡ.
   */
  napFile: boolean;
  /** Duyệt người dùng, đổi vai trò, xoá dữ liệu. */
  quanTri: boolean;
}

const KHONG: Quyen = {
  xem: false,
  ghiNhap: false,
  ghiXuat: false,
  doanhThu: false,
  napFile: false,
  quanTri: false,
};

/**
 * Vai trò này làm được những gì.
 *
 * Vai trò lạ (dữ liệu cũ, hoặc người gõ tay vào Firestore) coi như CHƯA DUYỆT —
 * không cho gì cả. Đoán rộng ra là mở cửa cho một chuỗi ký tự bất kỳ.
 */
export function quyenCua(role: UserRole | string): Quyen {
  switch (role) {
    case "OWNER":
      return {
        xem: true,
        ghiNhap: true,
        ghiXuat: true,
        doanhThu: true,
        napFile: true,
        quanTri: true,
      };
    case "KE_TOAN":
      return { ...KHONG, xem: true, ghiNhap: true, ghiXuat: true, doanhThu: true, napFile: true };
    // Hai vai trò cũ: ghi được cả hai chiều, không đụng doanh thu.
    case "STAFF":
    case "VIEWER":
      return { ...KHONG, xem: true, ghiNhap: true, ghiXuat: true };
    case "NHAP_KHO":
      return { ...KHONG, xem: true, ghiNhap: true };
    case "XUAT_KHO":
      return { ...KHONG, xem: true, ghiXuat: true };
    default:
      return KHONG;
  }
}

/** Vai trò này có ghi được loại giao dịch đó không. */
export function ghiDuocGiaoDich(
  role: UserRole | string,
  type: string,
): boolean {
  const q = quyenCua(role);
  if (laChieuNhap(type)) return q.ghiNhap;
  if (laChieuXuat(type)) return q.ghiXuat;
  // Loại lạ thì không ai ghi, trừ chủ sở hữu.
  return q.quanTri;
}

/** Chữ bày lên ô chọn vai trò, kèm câu mô tả đúng quyền thật. */
export interface NhanVaiTro {
  ma: UserRole;
  ten: string;
  moTa: string;
}

/**
 * Danh sách vai trò để chủ sở hữu chọn.
 *
 * Câu mô tả cố ý viết đúng QUYỀN THẬT, không viết theo tên gọi. Nhãn cũ ghi
 * "VIEWER — Chỉ xem" trong khi luật cho vai trò đó ghi được cả sổ kho; ai đọc
 * nhãn mà cấp quyền thì cấp rộng hơn mình tưởng.
 */
export const DANH_SACH_VAI_TRO: NhanVaiTro[] = [
  {
    ma: "PENDING",
    ten: "Chờ duyệt",
    moTa: "Đăng nhập được nhưng không xem và không ghi được gì.",
  },
  {
    ma: "NHAP_KHO",
    ten: "Nhân viên nhập kho",
    moTa: "Xem hết. Chỉ ghi được chiều nhập: nhập kho, tồn đầu kỳ, phiếu nhập và ảnh phiếu đã ký.",
  },
  {
    ma: "XUAT_KHO",
    ten: "Nhân viên xuất kho",
    moTa: "Xem hết. Chỉ ghi được chiều xuất: xuất kho, hao hụt, đối tác và điểm bán.",
  },
  {
    ma: "KE_TOAN",
    ten: "Kế toán",
    moTa: "Ghi được cả hai chiều, thêm doanh thu, hóa đơn, lệnh SAP và nạp tệp Excel.",
  },
  {
    ma: "OWNER",
    ten: "Chủ sở hữu",
    moTa: "Toàn quyền, kể cả duyệt người dùng và xoá dữ liệu.",
  },
  {
    ma: "STAFF",
    ten: "STAFF (cũ) — ghi cả hai chiều",
    moTa: "Vai trò cũ, ghi được cả nhập lẫn xuất. Nên đổi sang một trong hai vai trò một chiều.",
  },
  {
    ma: "VIEWER",
    ten: "VIEWER (cũ) — ghi cả hai chiều",
    moTa: "Tên là 'chỉ xem' nhưng thực tế ghi được cả sổ kho. Nên đổi sang vai trò khác.",
  },
];

/** Tên vai trò để hiện lên màn hình. */
export function tenVaiTro(role: UserRole | string): string {
  return DANH_SACH_VAI_TRO.find((v) => v.ma === role)?.ten ?? String(role);
}

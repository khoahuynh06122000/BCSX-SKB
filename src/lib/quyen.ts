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
 * HAI VAI TRÒ MỘT CHIỀU. `NHAP_KHO` chỉ ghi chiều nhập, `XUAT_KHO` chỉ ghi
 * chiều xuất. Cả hai VẪN XEM ĐƯỢC HẾT: tồn kho, báo cáo, lịch sử đều trộn cả
 * hai chiều, chặn xem thì người nhập kho không tra nổi một lô hàng.
 *
 * VAI TRÒ DNC — KHỐI CUNG ỨNG (30/08/2026). Đây là vai trò đầu tiên bị chặn cả
 * phần XEM: chỉ thấy dữ liệu chiều xuất, không thấy tồn kho và nhập kho.
 *
 * DNC là bên nhận hóa đơn bia từ kho tổng rồi xuất tiếp cho từng đơn vị, nên
 * thường xuyên phải đối chiếu lại đơn hàng và biên bản giao nhận của các đơn
 * vị. Trước đây họ hỏi thì người quản trị kho phải đi tìm trong nhóm chat rồi
 * gửi lại; cấp vai trò này thì họ tự tra được. Nhưng số tồn và số nhập của kho
 * tổng không phải việc của họ.
 *
 * Nên quyền XEM tách làm hai: `xemKho` và `xemXuat`. Đây cũng là chỗ luật
 * Firestore phải cẩn thận — xem ghi chú ở `firestore.rules`.
 *
 * Hai vai trò cũ `STAFF` và `VIEWER` đã bỏ ngày 30/08/2026: tên gọi nói một
 * đằng (VIEWER là "chỉ xem") mà quyền thật cho ghi cả sổ kho, ai đọc nhãn mà
 * cấp quyền thì cấp rộng hơn mình tưởng. Không tài khoản nào đang mang chúng.
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
  /**
   * Xem dữ liệu chiều XUẤT: lịch sử xuất kho, ảnh biên bản giao nhận, Đơn BNC,
   * công nợ và hóa đơn.
   */
  xemXuat: boolean;
  /**
   * Xem dữ liệu KHO: bảng điều khiển, tồn kho, nhập kho, phiếu nhập, báo cáo.
   *
   * Tách khỏi `xemXuat` vì DNC chỉ được xem chiều xuất. Mọi vai trò khác đã
   * duyệt thì có cả hai — chặn xem của người trong kho là họ không tra nổi một
   * lô hàng.
   */
  xemKho: boolean;
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
  xemXuat: false,
  xemKho: false,
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
        xemXuat: true,
        xemKho: true,
        ghiNhap: true,
        ghiXuat: true,
        doanhThu: true,
        napFile: true,
        quanTri: true,
      };
    case "KE_TOAN":
      return {
        ...KHONG,
        xemXuat: true,
        xemKho: true,
        ghiNhap: true,
        ghiXuat: true,
        doanhThu: true,
        napFile: true,
      };
    case "NHAP_KHO":
      return { ...KHONG, xemXuat: true, xemKho: true, ghiNhap: true };
    case "XUAT_KHO":
      return { ...KHONG, xemXuat: true, xemKho: true, ghiXuat: true };
    // Khối cung ứng: CHỈ XEM, và chỉ xem chiều xuất.
    case "DNC":
      return { ...KHONG, xemXuat: true };
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
    moTa: "Đăng nhập được nhưng không xem và không ghi được gì. Đây là trạng thái của tài khoản mới, và cũng là cách thu hồi quyền của một tài khoản cũ.",
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
    ma: "DNC",
    ten: "DNC — khối cung ứng",
    moTa: "CHỈ XEM, và chỉ xem dữ liệu chiều xuất: lịch sử xuất kho, ảnh biên bản, Đơn BNC, công nợ và hóa đơn. Không thấy tồn kho, nhập kho và bảng điều khiển.",
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
];

/** Tên vai trò để hiện lên màn hình. */
export function tenVaiTro(role: UserRole | string): string {
  return DANH_SACH_VAI_TRO.find((v) => v.ma === role)?.ten ?? String(role);
}

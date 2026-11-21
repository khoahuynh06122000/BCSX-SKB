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
 * chiều xuất.
 *
 * CẢ HAI KHÔNG CÒN XEM PHẦN TIỀN. `NHAP_KHO` bỏ trước (02/09/2026),
 * `XUAT_KHO` bỏ theo (16/09/2026). Trước đây hai vai trò này thấy cả Công nợ ·
 * Hóa đơn, Đơn BNC, Doanh thu và nhóm Dữ liệu — toàn bộ là việc của bên kế
 * toán. Người trong kho mở app lên để ghi hàng vào và hàng ra; bày thêm sáu
 * phân hệ không phải việc của họ thì vừa rối vừa cho họ thấy số công nợ và
 * doanh thu không cần thiết.
 *
 * NHƯNG VẪN XEM ĐƯỢC TỒN KHO VÀ BÁO CÁO, và hai bảng đó trộn cả hai chiều —
 * tồn bằng nhập trừ xuất. Nên `xemXuat` CHỈ LÀ CỜ HIỆN MENU, không phải cờ
 * chặn đọc dữ liệu: quyền đọc trong `firestore.rules` đi theo `xemKho()`.
 * Đừng đem `xemXuat` ra chặn truy vấn, làm thế là tồn kho của người trong kho
 * hụt đi đúng phần của chiều bên kia.
 *
 * GHI ĐỐI TÁC VÀ ĐIỂM BÁN THÌ VẪN ĐƯỢC. `ghiXuat` không đổi, chỉ có màn hình
 * Đối tác là không bày trên menu nữa — ô chọn đơn vị nhận trong màn hình Xuất
 * kho, và bước gán điểm bán khi nạp tệp, vẫn chạy như cũ.
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
   * Bày các phân hệ CHIỀU XUẤT trên menu: Công nợ · Hóa đơn, Đơn BNC, Doanh
   * thu, và nhóm Dữ liệu (thư viện ảnh, đối tác, lịch sử).
   *
   * ĐÂY LÀ CỜ HIỆN MENU, KHÔNG PHẢI CỜ CHẶN ĐỌC. Quyền đọc giao dịch trong
   * `firestore.rules` đi theo `xemKho()`, nên `NHAP_KHO` tuy không có cờ này
   * vẫn đọc đủ cả hai chiều để tính tồn kho và báo cáo.
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
  /**
   * Xem THƯ VIỆN ẢNH.
   *
   * Tách khỏi `xemXuat` (14/10/2026): người xuất kho là người chụp và tải ảnh
   * biên bản giao hàng lên, nên phải xem lại được ảnh của chính mình — nhưng
   * KHÔNG vì thế mà thấy luôn Công nợ · Hóa đơn và Đơn BNC, vốn đi theo
   * `xemXuat`. Một cờ cho một màn hình thì mở cái này không kéo theo cái kia.
   *
   * Luật Firestore không phải sửa: Thư viện đọc giao dịch, phiếu nhập và sổ
   * ảnh, mà ba bảng đó ai `xemKho` cũng đã đọc được.
   */
  xemAnh: boolean;
  /** Ghi giao dịch chiều nhập, tạo phiếu nhập và tải ảnh phiếu đã ký. */
  ghiNhap: boolean;
  /** Ghi giao dịch chiều xuất, hao hụt, và sửa đối tác / điểm bán. */
  ghiXuat: boolean;
  /** Doanh thu, hóa đơn, lệnh xuất hóa đơn lên SAP. */
  /**
   * Thao tác trên doanh thu (sửa, xoá, nạp lại).
   *
   * KHÔNG CÒN MÀN HÌNH NÀO ĐỌC CỜ NÀY từ 25/09/2026 — phân hệ Doanh thu đã gỡ.
   * Giữ lại vì doanh thu vẫn là số tính ra được từ xuất kho: nếu có ngày dựng
   * lại màn hình đó thì luật phân quyền còn nguyên, không phải nghĩ lại ai
   * được sửa. Đừng dựa vào cờ này để mở một màn hình mới mà không nối lại chỗ
   * kiểm.
   */
  doanhThu: boolean;
  /** Nạp tệp Excel hàng loạt (BBGN, T Kho, doanh thu). */
  napFile: boolean;
  /** Lập phiếu giao bia từ xưởng sang kho tổng, đánh giá ngày, kiểm kê FST/BBT. */
  lapPhieuXuong: boolean;
  /** Quản lý xưởng: duyệt Rào 1 (xuất xưởng) và nạp Kế hoạch sản xuất. */
  duyetXuong: boolean;
  /** Kho tổng: duyệt Rào 2 xác nhận nhận bia vào tồn kho. */
  duyetKhoTong: boolean;
  /** Xem Dashboard đối chiếu Kế hoạch vs Thực xuất & Truy xuất Lô. */
  xemKeHoachDashboard: boolean;
  /** Duyệt người dùng, đổi vai trò, xoá dữ liệu. */
  quanTri: boolean;
}

const KHONG: Quyen = {
  xemXuat: false,
  xemAnh: false,
  xemKho: false,
  ghiNhap: false,
  ghiXuat: false,
  doanhThu: false,
  napFile: false,
  lapPhieuXuong: false,
  duyetXuong: false,
  duyetKhoTong: false,
  xemKeHoachDashboard: false,
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
        xemAnh: true,
        xemKho: true,
        ghiNhap: true,
        ghiXuat: true,
        doanhThu: true,
        napFile: true,
        lapPhieuXuong: true,
        duyetXuong: true,
        duyetKhoTong: true,
        xemKeHoachDashboard: true,
        quanTri: true,
      };
    case "KE_TOAN":
      return {
        ...KHONG,
        xemXuat: true,
        xemAnh: true,
        xemKho: true,
        ghiNhap: true,
        ghiXuat: true,
        doanhThu: true,
        napFile: true,
        lapPhieuXuong: true,
        duyetXuong: true,
        duyetKhoTong: true,
        xemKeHoachDashboard: true,
      };
    case "QUAN_LY_XUONG":
      return {
        ...KHONG,
        xemKho: true,
        xemAnh: true,
        ghiNhap: true,
        lapPhieuXuong: true,
        duyetXuong: true,
        xemKeHoachDashboard: true,
      };
    /*
     * NHÂN VIÊN XƯỞNG = NHÂN VIÊN NHẬP KHO (anh Khoa 20/11/2026): cùng một
     * nhóm người, cùng một bộ quyền — lập phiếu giao bia, ghi chiều nhập,
     * ký nhận Rào 2 vào kho tổng, xem ảnh. Mã cũ `NHAP_KHO` giữ lại cho tài
     * khoản đang mang nó, quyền y hệt `SAN_XUAT`.
     *
     * Tách nhiệm KHÔNG mất: một người không ký hai ô trên cùng phiếu (giao
     * diện chặn theo tài khoản) — người trình phiếu không tự ký nhận Rào 2.
     */
    case "SAN_XUAT":
    case "NHAP_KHO":
      return {
        ...KHONG,
        xemKho: true,
        xemAnh: true,
        ghiNhap: true,
        lapPhieuXuong: true,
        duyetKhoTong: true,
      };
    // Cung khong co `xemXuat` nhu NHAP_KHO: hai vai tro mot chieu deu chi lam
    // viec trong kho, khong dinh toi phan tien.
    case "XUAT_KHO":
      // Xem ảnh chứng từ: họ là người tải ảnh biên bản lên (14/10/2026).
      return { ...KHONG, xemKho: true, ghiXuat: true, napFile: true, xemAnh: true };
    // Khối cung ứng: CHỈ XEM, và chỉ xem chiều xuất.
    case "DNC":
      return { ...KHONG, xemXuat: true, xemAnh: true };
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
    ma: "SAN_XUAT",
    ten: "Nhân viên xưởng · nhập kho",
    moTa: "Lập phiếu giao bia (kèm mã lô và ảnh hiện trạng keg), ghi chiều nhập, ký nhận Rào 2 vào kho tổng, đánh giá sản lượng ngày, kiểm kê Keg & Lít và bồn FST/BBT. Không duyệt Rào 1, không tự ký nhận phiếu chính mình trình, không thấy phần tiền.",
  },
  {
    ma: "QUAN_LY_XUONG",
    ten: "Quản lý xưởng",
    moTa: "Duyệt Rào 1 (xuất xưởng) cho phiếu bàn giao, lập Kế hoạch sản xuất kế thừa xuống nhân viên sản xuất, xem nhật ký nhập, kiểm kê FST/BBT và dashboard sản lượng.",
  },
  {
    ma: "NHAP_KHO",
    ten: "Nhân viên xưởng · nhập kho (mã cũ)",
    moTa: "Mã vai trò cũ — quyền Y HỆT \"Nhân viên xưởng · nhập kho\". Nên đổi tài khoản sang vai trò đó cho gọn.",
  },
  {
    ma: "XUAT_KHO",
    ten: "Nhân viên xuất kho",
    moTa: "Chỉ ghi được chiều xuất: xuất kho, hao hụt, đối tác và điểm bán. Nạp được tệp BBGN. Xem được tồn kho, báo cáo và sổ số phiếu. KHÔNG thấy công nợ, hóa đơn, Đơn BNC, doanh thu và nhóm Dữ liệu.",
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

/**
 * Vai trò bày ra để CHỌN (cấp quyền, xem như): bỏ mã cũ `NHAP_KHO` — trừ khi
 * tài khoản đang mang đúng mã đó (để ô chọn không hiện sai vai trò hiện tại).
 */
export function vaiTroDeChon(hienTai?: UserRole | string): NhanVaiTro[] {
  return DANH_SACH_VAI_TRO.filter((v) => v.ma !== "NHAP_KHO" || hienTai === "NHAP_KHO");
}

/**
 * Vai trò PHẢI có chữ ký điện tử (anh Khoa 21/11/2026): giám sát xưởng, nhân
 * viên xưởng · nhập kho, xuất kho, kế toán, admin — những người ký phiếu và
 * biên bản. DNC (chỉ xem) và tài khoản chờ duyệt không cần đăng ký chữ ký.
 * Ghi thẳng danh sách, không suy từ quyền xem kho, để đổi quyền xem về sau
 * không âm thầm bắt / bỏ bắt ai ký.
 */
export const VAI_TRO_CAN_CHU_KY: readonly UserRole[] = [
  "OWNER",
  "KE_TOAN",
  "QUAN_LY_XUONG",
  "SAN_XUAT",
  "NHAP_KHO",
  "XUAT_KHO",
];
export function canChuKy(role: UserRole | string): boolean {
  return (VAI_TRO_CAN_CHU_KY as readonly string[]).includes(String(role));
}

/** Tên vai trò để hiện lên màn hình. */
export function tenVaiTro(role: UserRole | string): string {
  return DANH_SACH_VAI_TRO.find((v) => v.ma === role)?.ten ?? String(role);
}

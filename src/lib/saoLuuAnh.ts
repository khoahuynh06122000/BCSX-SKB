/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SAO LƯU ẢNH MINH CHỨNG RA MỘT TỆP NÉN
 *
 * Ảnh biên bản là CHỨNG TỪ, mà hiện nó chỉ có một bản duy nhất nằm trên máy chủ
 * ảnh của người khác, không có bản sao nào. Tháng 8/2026 đã mất một loạt ảnh
 * kiểu đó: đường dẫn còn nguyên trong hệ thống nhưng tệp không còn ở đầu bên
 * kia, và không có chỗ nào lấy lại được.
 *
 * Nút "Tải tất cả" vốn có thì chưa đủ để sao lưu:
 *
 *   · Chỉ gói ĐÚNG MỘT CHIỀU đang xem. Sao lưu bằng tay thì phải nhớ đổi tab
 *     rồi tải lần thứ hai, quên là mất trắng một chiều mà không ai biết.
 *   · Không để lại DANH SÁCH. Tấm nào lỗi thì nó lặng lẽ bỏ qua; ba tháng sau
 *     mở tệp nén ra không biết là thiếu, càng không biết thiếu tấm nào.
 *
 * Ở đây gói CẢ HAI CHIỀU vào một tệp, chia hai thư mục, kèm một tệp danh sách
 * ghi đủ mọi tấm — KỂ CẢ TẤM TẢI KHÔNG ĐƯỢC. Tấm mất thì ít nhất còn lại dòng
 * ghi nó từng tồn tại, của đơn vị nào, ngày nào, mặt hàng gì; đủ để đi tìm lại
 * tờ biên bản giấy.
 *
 * Chỉ có phần dựng tên và dựng danh sách, không có phần tải — tách ra thì chạy
 * test được mà không cần mạng.
 */

import { tenTrongZip } from "./taiHangLoat";
import type { AnhThuVien } from "./thuVienAnh";

export type ChieuAnh = "IN" | "OUT";

/** Thư mục trong tệp nén cho từng chiều. */
export const THU_MUC: Record<ChieuAnh, string> = {
  IN: "nhap-kho",
  OUT: "xuat-kho",
};

/** Tên tệp danh sách nằm trong tệp nén. */
export const TEN_DANH_SACH = "danh-sach.csv";

/**
 * Tên tệp nén: có khoảng ngày trong tên để cất nhiều tháng cạnh nhau.
 *
 * Không dùng ngày hôm nay: sao lưu tháng 7 vào tháng 9 thì tên mang tháng 9 là
 * cất vào chỗ sai. Khoảng ngày mới là thứ nói tệp này chứa gì.
 */
export function tenTepSaoLuu(tuNgay: string, denNgay: string): string {
  const tu = String(tuNgay ?? "").trim() || "dau";
  const den = String(denNgay ?? "").trim() || "nay";
  return `sao-luu-anh-minh-chung ${tu} den ${den}.zip`;
}

/** Đường dẫn của một tấm bên trong tệp nén, đã có thư mục theo chiều. */
export function duongDanTrongZip(
  chieu: ChieuAnh,
  stt: number,
  anh: AnhThuVien,
): string {
  return `${THU_MUC[chieu]}/${tenTrongZip(stt, anh)}`;
}

/** Một dòng của tệp danh sách. */
export interface DongDanhSach {
  chieu: ChieuAnh;
  stt: number;
  anh: AnhThuVien;
  /** Tải được hay không. Không tải được vẫn phải có dòng. */
  duoc: boolean;
}

/**
 * Bọc một ô cho tệp CSV.
 *
 * Luôn bọc trong ngoặc kép, không chỉ bọc khi cần: tên hàng có dấu phẩy, ghi
 * chú có dấu chấm phẩy, đường dẫn có dấu bằng — bọc hết thì không phải nhớ ô
 * nào cần ô nào không. Dấu ngoặc kép bên trong nhân đôi theo đúng chuẩn CSV.
 */
function o(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/**
 * Dựng tệp danh sách.
 *
 * Có dấu BOM ở đầu để Excel mở ra đúng chữ tiếng Việt — thiếu nó thì Excel đọc
 * theo bảng mã hệ thống và "Cầu Vàng" thành một dãy ký tự lạ.
 */
export function dungDanhSachCsv(ds: DongDanhSach[]): string {
  const d: string[] = [
    [
      "STT",
      "Chiều",
      "Ngày",
      "Đơn vị",
      "Tiêu đề",
      "Chú thích",
      "Số mặt hàng dùng chung ảnh",
      "Tệp trong bộ nén",
      "Trạng thái",
      "Đường dẫn gốc",
    ]
      .map(o)
      .join(","),
  ];
  ds.forEach((x) => {
    d.push(
      [
        o(x.stt),
        o(x.chieu === "IN" ? "Nhập kho" : "Xuất kho"),
        o(String(x.anh.date ?? "").slice(0, 10)),
        o(x.anh.donVi),
        o(x.anh.tieuDe),
        o(x.anh.phu),
        o(x.anh.soDongDungChung ?? 1),
        // Tấm không tải được thì không có tệp trong bộ nén, để trống chứ không
        // ghi một cái tên không tồn tại.
        o(x.duoc ? duongDanTrongZip(x.chieu, x.stt, x.anh) : ""),
        o(x.duoc ? "Đã lưu" : "KHÔNG TẢI ĐƯỢC"),
        o(x.anh.url),
      ].join(","),
    );
  });
  return "\ufeff" + d.join("\r\n") + "\r\n";
}

/** Câu tóm tắt sau khi sao lưu xong, nói rõ có thiếu hay không. */
export function tomTatSaoLuu(ds: DongDanhSach[]): string {
  const tong = ds.length;
  const hong = ds.filter((x) => !x.duoc).length;
  const nhap = ds.filter((x) => x.chieu === "IN" && x.duoc).length;
  const xuat = ds.filter((x) => x.chieu === "OUT" && x.duoc).length;
  if (!tong) return "Không có ảnh nào trong khoảng ngày này.";
  const phan = `${nhap} ảnh nhập kho, ${xuat} ảnh xuất kho`;
  if (!hong) return `Đã sao lưu đủ ${tong} ảnh (${phan}).`;
  return `Đã sao lưu ${tong - hong}/${tong} ảnh (${phan}). ${hong} tấm không tải được — xem cột Trạng thái trong ${TEN_DANH_SACH}.`;
}

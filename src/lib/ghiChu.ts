/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DỌN GHI CHÚ TRƯỚC KHI BÀY RA MÀN HÌNH.
 *
 * Ô Ghi chú trong báo cáo đã tích lại một lớp chữ máy sinh ra qua nhiều đời:
 *
 *     [Lô 2/2] Chuyến 1/2 · Điểm nhận: NH 1901 · 1901 · Nạp từ file BBGN
 *     (Tin đã khớp và cập nhật mã lô FIFO)
 *
 * Trong đó gần như không còn gì để đọc: số lô đã bỏ, "Nạp từ file BBGN" lặp
 * trên mọi dòng của cùng một lần nạp, "Tin đã khớp" chỉ nói lại điều mà cột
 * Trạng thái đã nói, và tên điểm nhận thì trùng với cột Đối tác ngay bên cạnh.
 * Chữ nhiều quá thì mắt bỏ qua cả ô — kể cả dòng ghi chú thật sự cần đọc.
 *
 * LỌC LÚC HIỂN THỊ, KHÔNG SỬA DỮ LIỆU ĐÃ LƯU. Ghi chú cũ nằm trong hàng nghìn
 * bản ghi; sửa chúng là một lượt ghi đè không lấy lại được, chỉ để cho đẹp.
 * Lọc khi vẽ thì dòng cũ và dòng mới cùng sạch, mà bản gốc vẫn còn nguyên nếu
 * sau này cần tra.
 */

/** Những mẩu chữ máy tự thêm, nay không còn nghĩa gì với người đọc. */
const RAC: RegExp[] = [
  // Dấu vết của FIFO — đã bỏ theo dõi theo lô.
  /\[Lô\s*\d+\s*\/\s*\d+\]/gi,
  // Xác nhận đơn đi đường: cột Trạng thái đã nói rồi.
  /\(Tin đã khớp[^)]*\)/gi,
  /\(Xác nhận hàng loạt[^)]*\)/gi,
  // Nguồn dữ liệu: lặp y hệt trên mọi dòng của cùng một lần nạp.
  /Nạp từ (?:file|tệp) BBGN/gi,
];

/**
 * Bỏ phần máy sinh, giữ lại phần người viết.
 *
 * Dọn luôn mấy dấu `·` mồ côi còn lại sau khi cắt — nếu không thì một ô chỉ
 * toàn chữ máy sẽ hiện ra thành " · · · " chứ không rỗng, và trông còn khó
 * hiểu hơn lúc chưa dọn.
 */
export function donGhiChu(notes?: string | null): string {
  let s = String(notes ?? "");
  if (!s) return "";
  RAC.forEach((re) => {
    s = s.replace(re, " ");
  });
  return s
    .replace(/\s+/g, " ")
    // Gộp các dấu chấm giữa liền nhau thành một.
    .replace(/(?:\s*·\s*)+/g, " · ")
    // Bỏ dấu chấm giữa ở hai đầu.
    .replace(/^(?:\s*·\s*)+|(?:\s*·\s*)+$/g, "")
    .trim();
}

/**
 * Ghi chú để HIỂN THỊ, đã bỏ luôn phần trùng với cột Đối tác bên cạnh.
 *
 * "Điểm nhận: Kavkaz" nằm cạnh một cột đã ghi "BNC · KAVKAZ" là đọc hai lần
 * cùng một thứ. Chỉ bỏ khi TRÙNG THẬT — điểm nhận khác tên đối tác thì đó là
 * thông tin duy nhất cho biết bia đi tới đâu, bỏ đi là mất.
 */
export function ghiChuHienThi(
  notes?: string | null,
  tenDoiTac?: string | null,
): string {
  const s = donGhiChu(notes);
  if (!s) return "";

  /*
   * Tên đối tác thường là tên ghép: "BNC · KAVKAZ" — nhóm BNC, điểm bán
   * KAVKAZ. So nguyên chuỗi thì không bao giờ khớp với "Điểm nhận: Kavkaz",
   * nên phải tách ra so từng mảnh.
   */
  const ten = new Set(
    [tenDoiTac ?? "", ...String(tenDoiTac ?? "").split("·")]
      .map(chuanTen)
      .filter(Boolean),
  );
  if (ten.size === 0) return s;

  return s
    .split(" · ")
    .filter((manh) => {
      const m = manh.replace(/^Điểm nhận:\s*/i, "");
      return !ten.has(chuanTen(m));
    })
    .join(" · ")
    .trim();
}

/** Bỏ dấu, bỏ khoảng trắng thừa, về chữ thường — để so tên cho khớp. */
export function chuanTen(x?: string | null): string {
  return String(x ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NGÀY GÕ VÀO VÀ NGÀY HIỆN RA — LUÔN LÀ NGÀY/THÁNG/NĂM
 *
 * `<input type="date">` của trình duyệt hiện ngày theo NGÔN NGỮ CỦA TRÌNH
 * DUYỆT, không theo ngôn ngữ của trang web. Máy cài tiếng Anh thì ô ngày hiện
 * `mm/dd/yyyy` dù trang có khai `lang="vi"`, và KHÔNG có thuộc tính HTML hay
 * luật CSS nào đổi được. Muốn đổi thì phải tự vẽ ô ngày.
 *
 * Với sổ kho thì đây không phải chuyện thẩm mỹ: đọc nhầm ngày với tháng là
 * ghi sai ngày chứng từ. `09/10` là mùng 9 tháng 10 hay mùng 10 tháng 9 —
 * người nhập và người đọc lại có thể hiểu hai kiểu, và chỉ mấy ngày trong
 * tháng lớn hơn 12 mới lộ ra là đã hiểu sai.
 *
 * DẠNG LƯU VẪN LÀ `yyyy-MM-dd`, không đổi. Đó là dạng Firestore đang giữ, là
 * dạng mọi phép lọc đem ra so, và là dạng so sánh chuỗi cũng ra đúng thứ tự
 * thời gian. Chỉ phần NGƯỜI DÙNG NHÌN THẤY mới là ngày/tháng/năm.
 */

/** Ngày hợp lệ thật, không phải chỉ đúng khuôn: loại 31/02, 31/04… */
function coThat(ngay: number, thang: number, nam: number): boolean {
  if (nam < 1000 || nam > 9999) return false;
  if (thang < 1 || thang > 12) return false;
  if (ngay < 1) return false;
  // Ngày 0 của tháng sau chính là ngày cuối của tháng này.
  const cuoiThang = new Date(nam, thang, 0).getDate();
  return ngay <= cuoiThang;
}

const hai = (n: number) => String(n).padStart(2, "0");

/**
 * `2026-09-15` → `15/09/2026`. Chuỗi rỗng hoặc sai khuôn thì trả về rỗng.
 *
 * Cắt bằng biểu thức chứ không qua `new Date()`: `new Date("2026-09-15")` là
 * mốc UTC, nên máy ở múi giờ âm sẽ lùi về ngày 14.
 */
export function isoSangVn(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? "").trim());
  if (!m) return "";
  const nam = Number(m[1]);
  const thang = Number(m[2]);
  const ngay = Number(m[3]);
  if (!coThat(ngay, thang, nam)) return "";
  return `${hai(ngay)}/${hai(thang)}/${nam}`;
}

/**
 * `15/09/2026` → `2026-09-15`. Không đọc được thì trả về rỗng.
 *
 * Nhận cả `15-09-2026` và `15.09.2026`: người dùng gõ quen tay dấu nào cũng
 * ra đúng, thay vì báo lỗi một cách vô ích.
 */
export function vnSangIso(vn: string): string {
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(String(vn ?? "").trim());
  if (!m) return "";
  const ngay = Number(m[1]);
  const thang = Number(m[2]);
  const nam = Number(m[3]);
  if (!coThat(ngay, thang, nam)) return "";
  return `${nam}-${hai(thang)}-${hai(ngay)}`;
}

/**
 * Dọn lại chuỗi người dùng đang gõ, tự chèn dấu `/`.
 *
 * Gõ `15092026` ra `15/09/2026` mà không phải bấm dấu gạch. Giữ nguyên thứ tự
 * chữ số đã gõ, chỉ bỏ ký tự lạ và cắt phần thừa — KHÔNG sửa số: người đang gõ
 * dở `3` (định gõ 30) mà bị sửa thành `03` thì gõ tiếp ra `03/0…`, rất khó chịu.
 */
export function goNgay(raw: string): string {
  const so = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  if (so.length <= 2) return so;
  if (so.length <= 4) return `${so.slice(0, 2)}/${so.slice(2)}`;
  return `${so.slice(0, 2)}/${so.slice(2, 4)}/${so.slice(4)}`;
}

/**
 * Đã gõ đủ một ngày hoàn chỉnh chưa.
 *
 * Dùng để biết lúc nào báo giá trị mới ra ngoài: báo ngay từng ký tự thì bộ
 * lọc chạy trên một ngày dở dang như `01/01/0002`.
 */
export function goXong(vn: string): boolean {
  return vnSangIso(vn) !== "";
}

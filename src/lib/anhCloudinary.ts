/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐỔI MỘT ĐƯỜNG DẪN CLOUDINARY THÀNH BẢN THU NHỎ.
 *
 * Trước đây ô ảnh thu nhỏ trong Thư viện tải thẳng `secure_url` — tải nguyên
 * tấm để nhét vào một ô rộng chừng 245px.
 *
 * SỐ ĐO THẬT trên một tờ biên bản của kho (641x854, đo ngày 02/10/2026):
 *
 *     gốc                  46.967 B  jpeg
 *     f_auto,q_auto,w_400  23.190 B  webp   ← dùng cái này
 *     f_auto,q_auto,w_64    1.024 B  webp   ← dùng cho phép soát
 *
 * Tức nhẹ đi khoảng một nửa, không phải mười lần — ảnh gốc đã nén sẵn, mà
 * ảnh chụp giấy có chữ thì webp cũng không ăn được nhiều. Cả lưới 91 tấm đi
 * từ ~4,3 MB xuống ~2,1 MB.
 *
 * Nửa phần băng thông là phần nhỏ. Phần lớn nằm ở chỗ khác: mỗi tấm nhẹ đi
 * thì cơn yêu cầu dồn một lúc cũng nhẹ theo, nên máy chủ ảnh bớt chặn. Việc
 * giới hạn SỐ yêu cầu cùng lúc mới là phép chữa chính — xem `hangDoiAnh.ts`.
 *
 * Cloudinary nhận phép biến đổi ngay trong đường dẫn, chen vào sau `/upload/`:
 *
 *     .../image/upload/v1789640255/abc.jpg
 *     .../image/upload/f_auto,q_auto,w_480,c_limit/v1789640255/abc.jpg
 *
 *   f_auto   trả webp/avif cho trình duyệt nào hiểu, jpeg cho máy cũ
 *   q_auto   tự chọn mức nén vừa mắt
 *   c_limit  CHỈ thu nhỏ, không bao giờ phóng to — ảnh vốn đã bé thì để yên,
 *            không kéo giãn cho vỡ hạt
 *
 * Phép biến đổi đầu tiên tốn một lượt dựng; từ lượt thứ hai trở đi Cloudinary
 * trả bản đã dựng sẵn trong bộ đệm.
 */

/** Khúc nhận ra một đường dẫn tải ảnh của Cloudinary. */
const MOC_UPLOAD = "/image/upload/";

/**
 * Đường dẫn này có phải ảnh Cloudinary đang nằm ở dạng gốc, chưa biến đổi?
 *
 * Phải xét cả hai vế. Vế một: đúng là Cloudinary — đường dẫn của nhà khác
 * chen chuỗi `f_auto,...` vào là hỏng hẳn. Vế hai: CHƯA có phép biến đổi nào
 * — nếu đã có rồi mà chen thêm thì ra hai tầng biến đổi chồng nhau, Cloudinary
 * tính tiền hai lượt dựng cho đúng một tấm.
 */
export function laAnhCloudinaryGoc(url: string): boolean {
  const u = String(url ?? "").trim();
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(u)) return false;
  const i = u.indexOf(MOC_UPLOAD);
  if (i < 0) return false;
  const sau = u.slice(i + MOC_UPLOAD.length);
  if (!sau) return false;
  /*
   * Khúc ngay sau `/upload/` là bản (`v1789640255`) hoặc thẳng tên tệp thì
   * đây là đường dẫn gốc. Bất cứ thứ gì khác — `w_480`, `f_auto`, `c_fill` —
   * nghĩa là đã có phép biến đổi rồi, để yên.
   */
  const khuc = sau.split("/")[0] ?? "";
  if (/^v\d+$/.test(khuc)) return true;
  return !khuc.includes("_") && !khuc.includes(",");
}

/**
 * Bản thu nhỏ của một tấm ảnh, rộng tối đa `rong` điểm ảnh.
 *
 * Đường dẫn không phải Cloudinary gốc thì TRẢ NGUYÊN — ảnh cũ nhúng thẳng
 * (`data:`), đường dẫn tạm (`blob:`), ảnh của nhà khác, hay ảnh đã mang sẵn
 * phép biến đổi. Thà hiện ảnh to còn hơn dựng một đường dẫn sai rồi không
 * hiện gì.
 */
export function anhThuNho(url: string, rong = 400): string {
  const u = String(url ?? "").trim();
  if (!laAnhCloudinaryGoc(u)) return u;
  const r = Math.max(1, Math.trunc(rong) || 1);
  const i = u.indexOf(MOC_UPLOAD) + MOC_UPLOAD.length;
  return `${u.slice(0, i)}f_auto,q_auto,w_${r},c_limit/${u.slice(i)}`;
}

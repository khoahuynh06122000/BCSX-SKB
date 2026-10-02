/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HÀNG ĐỢI TẢI ẢNH — chỉ cho phép vài tấm đi cùng lúc.
 *
 * Lưới Thư viện dựng ra cả 91 thẻ `<img>` một lượt. `loading="lazy"` chỉ hoãn
 * những tấm nằm ngoài tầm nhìn, mà cuộn một cái là tới tầm nhìn hết; còn
 * HTTP/2 thì KHÔNG giới hạn sáu kết nối một tên miền như HTTP/1.1 — nó mở
 * hàng chục luồng song song trên cùng một kết nối. Kết quả: máy chủ ảnh nhận
 * một cơn vài chục yêu cầu trong một nhịp, chặn bớt, và người dùng thấy một
 * nhúm ô xám "chưa tải được ảnh". Bấm Thử lại thì ra — đúng dấu hiệu của bị
 * chặn tạm chứ không phải ảnh đã mất.
 *
 * Hàng đợi này không làm tải nhanh hơn. Nó làm tải ĐỦ: bốn tấm một lúc thì
 * không tấm nào bị chặn, nên không có ô xám nào phải đoán già đoán non.
 */

/**
 * Bốn tấm một lúc.
 *
 * Một hay hai thì lưới hiện ra chậm thấy rõ. Tám trở lên thì bắt đầu gặp lại
 * đúng cơn chặn đang muốn tránh. Bốn là chỗ đứng được của cả hai phía.
 */
const TOI_DA = 4;

let dangChay = 0;
const hangCho: (() => void)[] = [];

/**
 * Xin một lượt tải. Chờ tới khi có chỗ trống.
 *
 * Xin rồi thì PHẢI trả — dù tải xong, tải hỏng, hay thẻ ảnh bị gỡ khỏi màn
 * hình giữa chừng. Giữ một lượt không trả là chặn vĩnh viễn những tấm đứng
 * sau, mà triệu chứng của nó (lưới đứng im một nửa) nhìn y hệt cái lỗi đang
 * đi sửa.
 */
export function xinLuot(): Promise<void> {
  if (dangChay < TOI_DA) {
    dangChay += 1;
    return Promise.resolve();
  }
  return new Promise<void>((cho) => {
    hangCho.push(cho);
  });
}

/**
 * Trả lượt đã xin.
 *
 * Có người đang chờ thì CHUYỂN THẲNG lượt cho họ, không hạ `dangChay` rồi để
 * họ tự xin lại: hạ xuống rồi tăng lên có một khoảnh khắc ở giữa mà một người
 * thứ ba chen vào được, và lúc đó số tấm chạy cùng lúc vượt quá mức đã đặt.
 */
export function traLuot(): void {
  const tiep = hangCho.shift();
  if (tiep) {
    tiep();
    return;
  }
  dangChay = Math.max(0, dangChay - 1);
}

/** Số lượt đang chạy — để phép kiểm soi vào, và để gỡ lỗi. */
export function soDangChay(): number {
  return dangChay;
}

/** Số người đang xếp hàng. */
export function soDangCho(): number {
  return hangCho.length;
}

/** Sức chứa tối đa, bày ra cho phép kiểm khỏi chép lại con số. */
export const SUC_CHUA = TOI_DA;

/**
 * Xoá sạch hàng đợi.
 *
 * Chỉ dùng cho phép kiểm: mỗi phép kiểm phải bắt đầu từ hàng đợi rỗng, không
 * thì phép kiểm chạy trước làm lệch phép kiểm chạy sau.
 */
export function datLaiHangDoi(): void {
  dangChay = 0;
  hangCho.length = 0;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LĂN CHUỘT KHÔNG ĐƯỢC LÀM ĐỔI SỐ LƯỢNG
 *
 * Trình duyệt cho lăn chuột để tăng giảm giá trị của `<input type="number">`
 * khi ô đang được chọn. Nghe thì tiện, nhưng ở đây là một cái bẫy: người dùng
 * bấm vào ô số lượng, gõ xong, rồi lăn chuột để xem tiếp danh sách bên dưới —
 * và con số vừa gõ đổi đi vài đơn vị mà không có gì báo. Số vẫn trông bình
 * thường, chỉ sai.
 *
 * Cùng một loại rủi ro với hai mũi tên tăng giảm đã bỏ ở `index.css`, nhưng
 * dễ dính hơn nhiều, vì lăn chuột là việc người ta làm mà không nghĩ.
 *
 * CÁCH XỬ LÝ: BỎ CHỌN Ô, KHÔNG CHẶN CUỘN.
 *
 * Chặn thẳng sự kiện (`preventDefault`) thì đúng là số không đổi, nhưng trang
 * cũng đứng im — người dùng lăn mãi mà màn hình không nhúc nhích, còn khó chịu
 * hơn. Bỏ chọn ô thì trình duyệt hết cớ để đổi số, và cú lăn ấy quay về đúng
 * việc của nó là cuộn trang.
 *
 * Mất con trỏ khỏi ô là cái giá phải trả, và là cái giá đúng: đã lăn chuột để
 * đi xem chỗ khác thì thường cũng gõ xong ô đó rồi.
 */

/**
 * Gắn một lần lúc app khởi động.
 *
 * Nghe ở `document` thay vì gắn vào từng ô: ô số sinh ra và mất đi liên tục
 * theo từng dòng hàng, gắn lẻ thì sót là chuyện sớm muộn.
 *
 * Trả về hàm gỡ, để nơi gọi dọn được nếu cần.
 */
export function chanLanChuotDoiSo(doc: Document = document): () => void {
  const khiLan = (e: Event) => {
    const o = doc.activeElement;
    if (!(o instanceof HTMLInputElement)) return;
    if (o.type !== "number") return;
    // Chỉ khi con trỏ đang nằm TRÊN CHÍNH ô đang chọn. Lăn ở chỗ khác trong
    // trang thì trình duyệt không đổi số, không việc gì phải bỏ chọn ô.
    if (e.target !== o) return;
    o.blur();
  };

  // `passive: true` vì không hề gọi `preventDefault` — báo trước cho trình
  // duyệt thì nó không phải chờ, cuộn trang mượt hơn.
  doc.addEventListener("wheel", khiLan, { passive: true });
  return () => doc.removeEventListener("wheel", khiLan);
}

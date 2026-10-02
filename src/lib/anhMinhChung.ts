/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GIỮ ẢNH MINH CHỨNG KHI GHI ĐÈ MỘT DÒNG GIAO DỊCH.
 *
 * Hai chỗ trong app ghi đè lên dòng giao dịch đã có, và cả hai đều kèm theo
 * một danh sách ảnh RỖNG:
 *
 *   · Nạp lại tệp xuất kho / nhập kho. Mã dòng cố định theo nội dung, cố ý để
 *     lần nạp sau đè lên đúng dòng của lần trước thay vì đẻ thêm bản ghi
 *     trùng. Đè đúng dòng thật — nhưng `evidencePhotoUrls: []` đè luôn cả tờ
 *     biên bản đã gắn vào sau đó.
 *
 *   · Xác nhận đơn đi đường mà không đính ảnh mới. Chỗ đó ghi thẳng
 *     `evidencePhotoUrls: photoUrls`, mà `photoUrls` rỗng thì ảnh cũ thành
 *     rỗng theo.
 *
 * Cả hai đều âm thầm: không báo gì, không hỏi gì, và vì ảnh nằm ở màn hình
 * khác nên vài hôm sau mở Thư viện mới thấy thiếu — lúc đó không ai còn nối
 * được chuyện thiếu ảnh với việc đã nạp lại tệp.
 *
 * Luật đặt ở đây, một chỗ duy nhất, có phép kiểm đi kèm:
 *
 *     KHÔNG BAO GIỜ ghi một danh sách ảnh rỗng đè lên danh sách đang có.
 */

/** Phần ảnh minh chứng của một dòng giao dịch, đã chuẩn hoá để ghi xuống. */
export interface OAnhMinhChung {
  /** Tấm đầu tiên — trường cũ, nhiều màn hình còn đọc. `null` là không có. */
  evidencePhotoUrl: string | null;
  /** Toàn bộ các tấm. Luôn là mảng, không bao giờ `undefined`. */
  evidencePhotoUrls: string[];
}

/** Dòng giao dịch, chỉ xét phần ảnh — nhận cả bản ghi thiếu trường. */
export interface CoAnhMinhChung {
  evidencePhotoUrl?: string | null;
  evidencePhotoUrls?: string[] | null;
}

/**
 * Gom mọi đường dẫn ảnh của một bản ghi thành một danh sách sạch.
 *
 * Bỏ ô rỗng và bỏ trùng, giữ nguyên thứ tự gặp. Phải gom cả trường cũ
 * (`evidencePhotoUrl`) lẫn trường mới (`evidencePhotoUrls`): bản ghi từ thời
 * đầu chỉ có trường cũ, mà bỏ sót nó thì chính phép "giữ ảnh" này lại là thứ
 * xoá mất ảnh.
 */
export function gomAnh(ban?: CoAnhMinhChung | null): string[] {
  const ra: string[] = [];
  const them = (x: unknown) => {
    const u = String(x ?? "").trim();
    if (u && !ra.includes(u)) ra.push(u);
  };
  them(ban?.evidencePhotoUrl);
  const ds = ban?.evidencePhotoUrls;
  if (Array.isArray(ds)) ds.forEach(them);
  return ra;
}

/** Dựng phần ảnh để ghi xuống, từ một danh sách đường dẫn đã gom. */
function dungO(ds: string[]): OAnhMinhChung {
  return { evidencePhotoUrl: ds[0] ?? null, evidencePhotoUrls: ds };
}

/**
 * Ảnh để ghi khi NẠP LẠI TỆP: giữ nguyên ảnh của dòng cũ.
 *
 * Tệp Excel không mang theo ảnh nào, nên lần nạp lại không có gì để nói về
 * ảnh cả. Không nói gì thì không được đổi gì.
 */
export function giuAnhCu(cu?: CoAnhMinhChung | null): OAnhMinhChung {
  return dungO(gomAnh(cu));
}

/**
 * Ảnh để ghi khi NGƯỜI DÙNG ĐÍNH ẢNH: có ảnh mới thì thay, không có thì giữ.
 *
 * Vì sao THAY chứ không gộp thêm: đính lại ảnh là việc người ta làm khi tấm
 * cũ sai — chụp mờ, chụp nhầm tờ. Gộp thêm thì tấm sai nằm lại mãi mà màn
 * hình không có đường nào gỡ nó ra.
 *
 * Vì sao danh sách rỗng thì GIỮ: rỗng không có nghĩa là "xoá hết ảnh đi". Nó
 * chỉ có nghĩa là lần bấm này người ta không đính gì — thường là xác nhận một
 * đơn đã có ảnh từ trước, hoặc bấm xác nhận lần thứ hai. Muốn xoá ảnh thì
 * phải có một nút nói đúng chữ "xoá ảnh", và app đang không có nút đó.
 */
export function ghiDeAnh(
  moi: readonly string[] | null | undefined,
  cu?: CoAnhMinhChung | null,
): OAnhMinhChung {
  const sach: string[] = [];
  (moi ?? []).forEach((x) => {
    const u = String(x ?? "").trim();
    if (u && !sach.includes(u)) sach.push(u);
  });
  if (sach.length) return dungO(sach);
  return dungO(gomAnh(cu));
}

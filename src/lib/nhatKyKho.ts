/**
 * Lọc giao dịch cho hai bảng "Chi tiết nhật ký nhập/xuất kho" trong Báo cáo.
 *
 * VÌ SAO TÁCH RA ĐÂY. Phép lọc này trước nằm chép tay ở BA chỗ trong `App.tsx`:
 * thân bảng, dòng "chưa có dữ liệu", và nút Xuất Báo Cáo. Ba bản chép thì sửa
 * một chỗ quên hai chỗ kia, và đúng chuyện đó đã xảy ra với hao hụt.
 */

/** Chỉ cần đủ để lọc — không buộc phải là `Transaction` đầy đủ. */
export interface DongNhatKy {
  type: string;
  status?: string;
}

/**
 * Giao dịch này có hiện trong nhật ký NHẬP không.
 *
 * Tồn đầu kỳ (`OPENING`) tính là nhập ở bảng này: nó là hàng có sẵn trong kho
 * lúc bắt đầu, và cột Tổng nhập của bảng tổng hợp cũng tính nó.
 */
export function trongNhatKyNhap(t: DongNhatKy): boolean {
  return t.type === "IN" || t.type === "OPENING";
}

/**
 * Giao dịch này có hiện trong nhật ký XUẤT không.
 *
 * HAO HỤT LÀ HÀNG XUẤT. `LOSS` và `DAMAGE` cũng là bia đã ra khỏi kho và tồn
 * kho đã trừ chúng — bỏ chúng khỏi bảng này thì cột tồn cuối giảm mà không
 * dòng nào trên bảng giải thích được, người xem chỉ thấy "hao hụt đâu không
 * thấy". Chỗ hiển thị phải ghi rõ chúng KHÔNG lên công nợ, chứ không phải giấu
 * đi.
 *
 * Đơn đang đi đường thì chưa: hàng chưa tới tay đối tác, và bảng này phải khớp
 * với tồn kho vốn cũng chưa đếm chúng.
 */
export function trongNhatKyXuat(t: DongNhatKy): boolean {
  if (t.status === "in_transit") return false;
  return t.type === "OUT" || t.type === "LOSS" || t.type === "DAMAGE";
}

/** Dòng này là hao hụt/hư hại — phần mình chịu, không ghi công nợ. */
export function laDongHaoHut(t: DongNhatKy): boolean {
  return t.type === "LOSS" || t.type === "DAMAGE";
}

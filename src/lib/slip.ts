/**
 * PHIẾU NHẬP KHO — MÃ PHIẾU VÀ VIỆC DUYỆT SỐ LIỆU
 *
 * Luồng làm việc thật:
 *
 *   1. Bộ phận sản xuất làm ra thành phẩm, điền thẳng số vào app.
 *   2. Giao cho kho. Kho đếm, đối chiếu với số đã điền.
 *   3. Số khớp thì in phiếu ra giấy, hai bên ký tươi.
 *   4. Chụp ảnh tờ phiếu đã ký, đưa vào đúng phiếu đó trên app.
 *   5. Có ảnh ký = phiếu được duyệt = hàng mới CHÍNH THỨC VÀO TỒN KHO.
 *
 * Vì bước 5, hàng đã điền mà chưa có ảnh ký thì KHÔNG cộng vào tồn và KHÔNG
 * xuất bán được. Chữ ký giấy vì vậy không còn là thủ tục lưu trữ mà là cái
 * khoá thật: không ai làm tăng tồn kho một mình được.
 *
 * MỖI LƯỢT GIAO NHẬN MỘT PHIẾU, không gộp cả ngày. Một ngày sản xuất giao 2–3
 * đợt là bình thường; gộp cả ngày thì một tờ ảnh ký sẽ duyệt luôn cả những đợt
 * chưa ai kiểm, và dòng điền thêm sau khi đã ký sẽ âm thầm nhập vào phiếu đã
 * duyệt. Mã phiếu vì thế mang cả số thứ tự trong ngày: PN-260818-01, -02...
 *
 * Vẫn tra cứu được theo ngày nhập kho như cũ, vì ngày nằm ngay trong mã phiếu.
 */

import type { ImportSlip, Transaction } from "../types";

/** Mã phiếu luôn bắt đầu bằng cụm này. */
export const SLIP_PREFIX = "PN-";

/** Số thứ tự trong ngày gồm 2 chữ số: 01..99. */
const SEQ_WIDTH = 2;

const SLIP_CODE_RE = /^PN-(\d{2})(\d{2})(\d{2})-(\d{2,})$/;
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Ngày dạng yyyy-MM-dd → tiền tố mã phiếu dạng PN-YYMMDD.
 *
 * Cố ý cắt chuỗi thay vì đi qua `new Date()`: chuỗi yyyy-MM-dd mà đưa vào
 * Date sẽ được hiểu là giờ UTC, in ra theo giờ Việt Nam có thể lùi một ngày —
 * mã phiếu lệch ngày là lỗi không ai nhìn ra cho tới lúc đối chiếu giấy tờ.
 */
export function slipPrefixForDate(dateKey: string): string {
  const m = DATE_KEY_RE.exec(dateKey);
  if (!m) throw new Error(`Ngày không đúng dạng yyyy-MM-dd: ${dateKey}`);
  const [, yyyy, mm, dd] = m;
  return `${SLIP_PREFIX}${yyyy.slice(2)}${mm}${dd}`;
}

/**
 * Tách mã phiếu thành ngày và số thứ tự trong ngày.
 *
 * Trả về null nếu mã không đúng dạng — dùng để bỏ qua dữ liệu rác thay vì
 * để nó làm sai phép đếm mã kế tiếp.
 */
export function parseSlipCode(
  code: string | undefined | null,
): { dateKey: string; seq: number } | null {
  if (!code) return null;
  const m = SLIP_CODE_RE.exec(code.trim());
  if (!m) return null;
  const [, yy, mm, dd, seq] = m;
  const seqNum = Number(seq);
  if (!Number.isFinite(seqNum) || seqNum < 1) return null;
  // Hai chữ số năm: quy về 20xx. App bắt đầu dùng từ 2025, không có dữ liệu
  // thế kỷ trước nên không cần xử lý mốc cắt nào phức tạp hơn.
  return { dateKey: `20${yy}-${mm}-${dd}`, seq: seqNum };
}

/**
 * Mã phiếu kế tiếp cho một ngày.
 *
 * Lấy số lớn nhất đang có rồi cộng 1, KHÔNG dùng số lượng phiếu: nếu một phiếu
 * bị xoá thì đếm theo số lượng sẽ cấp lại mã cũ, và ảnh ký của phiếu cũ sẽ
 * dính vào lô hàng hoàn toàn khác.
 */
export function nextSlipCode(
  dateKey: string,
  existingCodes: Iterable<string | undefined | null>,
): string {
  const prefix = slipPrefixForDate(dateKey);
  let maxSeq = 0;
  for (const code of existingCodes) {
    const parsed = parseSlipCode(code);
    if (!parsed || parsed.dateKey !== dateKey) continue;
    if (parsed.seq > maxSeq) maxSeq = parsed.seq;
  }
  return `${prefix}-${String(maxSeq + 1).padStart(SEQ_WIDTH, "0")}`;
}

/**
 * Tập mã phiếu ĐÃ DUYỆT — tức là đã có ít nhất một ảnh tờ phiếu ký tươi.
 *
 * Duyệt suy ra từ sự tồn tại của ảnh, không lưu thêm cờ `approved` nào. Nhờ
 * vậy không bao giờ lệch hai nguồn: gỡ hết ảnh là số liệu tự quay về chờ duyệt.
 */
export function approvedSlipCodes(slips: ImportSlip[]): Set<string> {
  const s = new Set<string>();
  slips.forEach((sl) => {
    if (sl.signedPhotoUrls?.length && sl.code) s.add(sl.code);
  });
  return s;
}

/**
 * Giao dịch này có nằm trong luồng in–ký hay không.
 *
 * Chỉ giao dịch NHẬP do người dùng điền tay mới có mã phiếu, và chỉ những
 * giao dịch đó cần chữ ký. Các nguồn còn lại cố ý miễn:
 *
 * - `OPENING` (tồn đầu kỳ): số khai lúc dựng sổ, không có lượt giao nhận nào
 *   để hai bên ký.
 * - Nhập từ file Excel tồn kho: là việc đồng bộ số liệu, cũng không có giao nhận.
 *
 * Miễn ở đây nghĩa là VÀO TỒN NGAY. Đổi lại, chỗ nào tạo giao dịch nhập tay
 * cũng phải gán mã phiếu — thiếu mã là hàng vào tồn mà không cần ai ký.
 */
export function needsSlipApproval(t: Transaction): boolean {
  return t.type === "IN" && !!t.slipCode;
}

/** Giao dịch này đã được tính vào tồn kho chưa. */
export function isCountedInStock(
  t: Transaction,
  approved: Set<string>,
): boolean {
  if (!needsSlipApproval(t)) return true;
  return approved.has(t.slipCode!);
}

/**
 * Lọc ra các giao dịch được phép tác động đến tồn kho.
 *
 * Mọi phép tính tồn — tồn theo lô, FIFO, tồn đầu/cuối kỳ, thẻ thống kê, đồ
 * thị — đều phải chạy trên danh sách này chứ không phải `transactions` gốc.
 * Chỉ cần một chỗ dùng danh sách gốc là con số ở chỗ đó sẽ cao hơn các chỗ
 * khác, và không có gì báo lỗi.
 */
export function stockTransactions(
  transactions: Transaction[],
  approved: Set<string>,
): Transaction[] {
  return transactions.filter((t) => isCountedInStock(t, approved));
}

/** Các giao dịch nhập đang chờ ảnh ký — đã điền nhưng chưa vào tồn. */
export function pendingSlipTransactions(
  transactions: Transaction[],
  approved: Set<string>,
): Transaction[] {
  return transactions.filter((t) => !isCountedInStock(t, approved));
}

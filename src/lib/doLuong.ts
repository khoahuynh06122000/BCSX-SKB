/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BỘ ĐO LƯỢT GỌI FIREBASE — đếm thật, không ước tính.
 *
 * Rủi ro "sập trong một ngày" của app nằm ở LƯỢT ĐỌC, không ở dung lượng: mỗi
 * lần mở app là đọc TRỌN tám bảng, nên một ngày nhiều người mở, tải lại nhiều
 * lần là số lượt đọc phình theo cấp nhân. Thẻ "Sức khỏe hệ thống" cũ chỉ ước
 * tính từ số dòng đang có, không biết hôm nay thật sự đã gọi bao nhiêu.
 *
 * Bộ đo này đếm đúng từng lượt app gửi lên Firestore, theo cách Firestore tính:
 *
 *   · Mở một bảng lần đầu        → tính bằng số dòng trả về (bảng rỗng tính 1)
 *   · Bảng đang mở có dòng đổi   → chỉ tính dòng thêm / sửa
 *   · Dữ liệu lấy từ đệm trên máy → không tính
 *   · Tiếng vọng của chính lệnh ghi vừa gửi (chưa lên máy chủ) → không tính
 *
 * Mỗi máy cộng dồn rồi vài phút gửi lên một lần vào `do_luong/<ngày>`, nên
 * admin thấy TỔNG của mọi người, mọi máy trong ngày.
 *
 * NGÀY TÍNH THEO GIỜ MỸ (Los Angeles), vì hạn mức Firestore đặt lại lúc nửa
 * đêm giờ đó — tức 14h hoặc 15h chiều giờ Việt Nam tuỳ mùa. Đếm theo ngày Việt
 * Nam thì con số sẽ lệch khỏi chính cái hạn mức nó đem ra so.
 */

export type LoaiGoi = "doc" | "ghi" | "xoa";

export interface SoLuot {
  doc: number;
  ghi: number;
  xoa: number;
}

/**
 * Mốc so sánh: hạn mức miễn phí mỗi ngày của Firestore bản Standard.
 *
 * Cơ sở dữ liệu của app là bản ENTERPRISE — hạn mức và cách tính tiền có thể
 * khác. Đây là MỐC THAM CHIẾU để thấy mình đang ở đâu, không phải con số hợp
 * đồng. Muốn biết chính xác, xem Firebase Console → Usage and billing.
 */
export const MOC_THAM_CHIEU: SoLuot = { doc: 50_000, ghi: 20_000, xoa: 20_000 };

/** Bảng Firestore lưu bộ đo. */
export const KHO_DO_LUONG = "do_luong";

const VUNG_GIO_HAN_MUC = "America/Los_Angeles";

function phanNgay(now: Date): { y: string; m: string; d: string; h: number; p: number } {
  const ph = new Intl.DateTimeFormat("en-CA", {
    timeZone: VUNG_GIO_HAN_MUC,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const lay = (t: string) => ph.find((x) => x.type === t)?.value ?? "0";
  return { y: lay("year"), m: lay("month"), d: lay("day"), h: Number(lay("hour")), p: Number(lay("minute")) };
}

/** Ngày của hạn mức, `yyyy-MM-dd` theo giờ Los Angeles. */
export function ngayHanMuc(now: Date = new Date()): string {
  const { y, m, d } = phanNgay(now);
  return `${y}-${m}-${d}`;
}

/** Số phút đã trôi qua trong ngày hạn mức. */
export function phutDaQua(now: Date = new Date()): number {
  const { h, p } = phanNgay(now);
  return h * 60 + p;
}

/** N ngày hạn mức gần nhất, mới nhất trước. */
export function cacNgayGanNhat(n: number, now: Date = new Date()): string[] {
  const ra: string[] = [];
  for (let i = 0; ra.length < n && i < n * 2; i++) {
    const k = ngayHanMuc(new Date(now.getTime() - i * 86_400_000));
    if (!ra.includes(k)) ra.push(k);
  }
  return ra;
}

export type MucDo = "an-toan" | "chu-y" | "nguy";

/** Dưới 50% là an toàn, 50–80% là chú ý, từ 80% là nguy. */
export function mucDo(daDung: number, moc: number): MucDo {
  if (moc <= 0) return "an-toan";
  const t = daDung / moc;
  return t >= 0.8 ? "nguy" : t >= 0.5 ? "chu-y" : "an-toan";
}

/**
 * Dự báo cuối ngày nếu cứ giữ nhịp hiện tại.
 *
 * Chặn mẫu số tối thiểu 60 phút: mới qua nửa đêm 5 phút mà đã có 500 lượt thì
 * nhân lên ra 144.000 — một con số doạ người vô cớ. Sau một tiếng thì nhịp đã
 * đủ để chiếu.
 */
export function duBaoCuoiNgay(daDung: number, phut: number): number {
  return Math.round((daDung * 1440) / Math.max(60, phut));
}

/** Phần siêu dữ liệu của một snapshot Firestore mà bộ đo cần đọc. */
export interface SnapshotDem {
  metadata: { fromCache: boolean; hasPendingWrites: boolean };
  size?: number;
  docChanges?: () => { type: string }[];
}

/**
 * Số lượt đọc Firestore tính cho một snapshot.
 *
 * `lanDau` = đây là lần ĐẦU snapshot của trình nghe này về từ máy chủ — lúc đó
 * Firestore tính cả bảng. Những lần sau chỉ tính dòng thêm / sửa; dòng bị xoá
 * khỏi kết quả không tính.
 */
export function soDocCuaSnapshot(s: SnapshotDem, lanDau: boolean): number {
  if (s.metadata.fromCache) return 0;
  if (typeof s.docChanges === "function") {
    if (lanDau) return Math.max(1, s.size ?? 0);
    if (s.metadata.hasPendingWrites) return 0;
    return s.docChanges().filter((c) => c.type !== "removed").length;
  }
  // Một tài liệu đơn.
  return s.metadata.hasPendingWrites && !lanDau ? 0 : 1;
}

/**
 * Bộ cộng dồn của một máy. `layVaXoa` lấy phần chưa gửi lên; `tongPhien` giữ
 * tổng từ lúc mở app để bày ngay trên màn hình, không phải đợi lần gửi sau.
 */
export class BoDem {
  private choGui: SoLuot = { doc: 0, ghi: 0, xoa: 0 };
  readonly tongPhien: SoLuot = { doc: 0, ghi: 0, xoa: 0 };

  them(loai: LoaiGoi, n: number): void {
    const k = Math.max(0, Math.trunc(Number(n) || 0));
    if (!k) return;
    this.choGui[loai] += k;
    this.tongPhien[loai] += k;
  }

  /** Lấy phần chưa gửi và đặt về 0. Gửi hỏng thì `traLai` để lần sau gửi tiếp. */
  layVaXoa(): SoLuot {
    const ra = { ...this.choGui };
    this.choGui = { doc: 0, ghi: 0, xoa: 0 };
    return ra;
  }

  traLai(s: SoLuot): void {
    this.choGui.doc += s.doc;
    this.choGui.ghi += s.ghi;
    this.choGui.xoa += s.xoa;
  }
}

/** Bộ đếm dùng chung của cả app trên máy này. */
export const BO_DEM = new BoDem();

/**
 * Khoá của một người trong bảng đo — email bỏ ký tự đặc biệt.
 *
 * Tên trường Firestore không nên chứa dấu chấm (nó là dấu phân cấp đường dẫn),
 * mà email nào cũng có dấu chấm.
 */
export function khoaNguoi(email: string): string {
  return (
    String(email ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "khong_ro"
  );
}

/** Một ngày trong bảng đo, như đọc về từ Firestore. */
export interface NgayDoLuong extends SoLuot {
  ngay: string;
  capNhat?: string;
  nguoi?: Record<string, Partial<SoLuot>>;
}

/** Người gọi nhiều nhất trong ngày, xếp theo lượt đọc. */
export function xepNguoi(n?: NgayDoLuong["nguoi"]): { khoa: string; so: SoLuot }[] {
  return Object.entries(n ?? {})
    .map(([khoa, s]) => ({
      khoa,
      so: { doc: Number(s?.doc) || 0, ghi: Number(s?.ghi) || 0, xoa: Number(s?.xoa) || 0 },
    }))
    .sort((a, b) => b.so.doc - a.so.doc);
}

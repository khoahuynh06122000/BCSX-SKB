/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CHỮ KÝ ĐIỆN TỬ TRÊN CHỨNG TỪ — phần tính thuần (không đụng Firestore).
 *
 * Ba mảnh ghép, mỗi mảnh trả lời một câu hỏi pháp lý:
 *
 *   1. AI KÝ — chữ ký MẪU vẽ tay, đăng ký một lần theo tài khoản (`chu_ky_mau`).
 *      Mẫu không sửa, không xoá: đổi chữ ký là thêm một mẫu mới, nên chứng từ
 *      cũ vẫn hiện đúng nét chữ ký lúc người đó ký. Người ký phải đăng nhập
 *      Google (email đã xác minh) và nhập lại mã PIN ngay lúc ký.
 *   2. KÝ CÁI GÌ — mã băm SHA-256 của nội dung chứng từ lúc ký (`bamNoiDung`).
 *      Mở chứng từ ra là băm lại: khác thì báo "nội dung đã đổi sau khi ký".
 *   3. KÝ LÚC NÀO — giờ ký ghi cùng lần ghi; luật Firestore buộc `uid` của chữ
 *      ký là chính người đang ghi, và mẫu chữ ký phải là mẫu của người đó.
 */

export interface Diem {
  x: number;
  y: number;
}

/** Một mẫu chữ ký đã đăng ký. Id = `${uid}_${yyyyMMddHHmmss}`. */
export interface ChuKyMau {
  id: string;
  uid: string;
  email: string;
  /** Họ tên in dưới chữ ký. */
  ten: string;
  /** Nét vẽ dạng đường SVG (`M x y L x y ...`), toạ độ trong khung rong × cao. */
  net: string;
  rong: number;
  cao: number;
  /** SHA-256 của `ten|net` — để soát mẫu không bị sửa. */
  bam: string;
  taoLuc: string;
}

/** Cách xác thực người ký lúc ký. */
export const XAC_THUC_KY = "GOOGLE+PIN";

const hai = (n: number) => String(n).padStart(2, "0");

/** Id mẫu chữ ký: `${uid}_${yyyyMMddHHmmss}` theo giờ máy. */
export function idChuKyMau(uid: string, luc: Date = new Date()): string {
  return (
    `${uid}_${luc.getFullYear()}${hai(luc.getMonth() + 1)}${hai(luc.getDate())}` +
    `${hai(luc.getHours())}${hai(luc.getMinutes())}${hai(luc.getSeconds())}`
  );
}

/** Mẫu này có phải của tài khoản `uid` không (đúng khuôn id). */
export function laMauCua(chuKyId: string, uid: string): boolean {
  return !!uid && chuKyId.startsWith(`${uid}_`) && /^_\d{14}$/.test(chuKyId.slice(uid.length));
}

const lam1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Các nét vẽ → đường SVG. Nét chỉ có một điểm (chấm) vẽ thành vạch rất ngắn
 * để vẫn hiện ra. Bỏ nét rỗng.
 */
export function netTuDiem(cacNet: readonly (readonly Diem[])[]): string {
  return cacNet
    .filter((n) => n.length > 0)
    .map((n) => {
      const [dau, ...sau] = n;
      const duoi = sau.length ? sau : [{ x: dau.x + 0.5, y: dau.y }];
      return (
        `M${lam1(dau.x)} ${lam1(dau.y)}` +
        duoi.map((p) => `L${lam1(p.x)} ${lam1(p.y)}`).join("")
      );
    })
    .join("");
}

/**
 * Chữ ký đủ dùng chưa: phải có ít nhất `toiThieu` điểm vẽ và trải ra đủ rộng
 * (một chấm hay một gạch ngắn không phải chữ ký).
 */
export function chuKyDuNet(
  cacNet: readonly (readonly Diem[])[],
  rong: number,
  toiThieu = 12,
): boolean {
  const diem = cacNet.flat();
  if (diem.length < toiThieu) return false;
  const xs = diem.map((p) => p.x);
  return Math.max(...xs) - Math.min(...xs) >= rong * 0.15;
}

/** Mẫu mới nhất của một tài khoản (id có giờ tạo nên so chuỗi là đủ). */
export function mauMoiNhat(ds: readonly ChuKyMau[], uid: string): ChuKyMau | null {
  let tot: ChuKyMau | null = null;
  ds.forEach((m) => {
    if (m.uid === uid && laMauCua(m.id, uid) && (!tot || m.id > tot.id)) tot = m;
  });
  return tot;
}

/* ------------------------------------------------------------------ */
/* Nội dung chứng từ → mã băm                                          */
/* ------------------------------------------------------------------ */

export interface DongPhieuNhap {
  productId: string;
  quantity: number;
}

/**
 * Nội dung PHIẾU NHẬP đem băm: mã phiếu, ngày, và từng dòng mặt hàng × số
 * lượng (xếp theo mặt hàng rồi số lượng — thứ tự lưu không làm đổi mã băm).
 *
 * Cố ý KHÔNG gồm mã lô: mã lô điền bổ sung sau được (chỉ để ghi nhận), không
 * đổi số lượng hay tồn kho — gồm vào thì điền mã lô là báo "đã sửa sau khi ký".
 */
export function noiDungPhieuNhap(
  code: string,
  ngay: string,
  dong: readonly DongPhieuNhap[],
): string {
  const ds = dong
    .map((d) => `${String(d.productId).trim()}=${Math.round((Number(d.quantity) || 0) * 1000) / 1000}`)
    .sort();
  return `PHIEU_NHAP|${code.trim()}|${ngay.slice(0, 10)}|${ds.join(";")}`;
}

/** SHA-256 dạng hex (Web Crypto — có cả trên trình duyệt lẫn Node 18+). */
export async function bamSha256(s: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Mã băm rút gọn để in lên chứng từ: 16 ký tự đầu, chia nhóm 4. */
export function maBamNgan(bam: string): string {
  return (bam || "").slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, "$1-");
}

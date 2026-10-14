/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỔ ẢNH MINH CHỨNG — ẢNH CÓ CHỖ ĐỨNG RIÊNG, KHÔNG SỐNG NHỜ DÒNG GIAO DỊCH.
 *
 * NGUYÊN NHÂN GỐC CỦA MỌI LẦN MẤT ẢNH TRƯỚC ĐÂY là một chỗ thiết kế: đường
 * dẫn ảnh CHỈ nằm bên trong tài liệu giao dịch / phiếu nhập. Nên bất cứ thao
 * tác nào ghi đè hay xoá tài liệu ấy cũng ngầm là một thao tác lên ảnh, dù
 * người bấm không hề nghĩ tới ảnh:
 *
 *   · Tháng 8/2026  ảnh base64 nhét thẳng vào tài liệu, tài liệu chạm trần
 *                   1 MiB thì khối ảnh bị cắt cụt.
 *   · Nạp lại tệp   `batch.set` không merge kèm `evidencePhotoUrls: []` — xoá
 *                   sạch ảnh của mọi đơn trong tệp. (Chặn 02/10/2026.)
 *   · Xác nhận đơn  không đính ảnh mới thì ghi rỗng đè ảnh cũ. (Chặn 02/10.)
 *   · Xoá rồi nạp   xoá giao dịch là mất đường nối duy nhất tới tệp ảnh trên
 *                   Cloudinary; nạp lại tệp Excel không mang theo ảnh nào để
 *                   gắn lại.
 *
 * Bốn lỗi trông khác nhau, cùng một gốc. Vá từng chỗ thì chỗ thứ năm sẽ tới —
 * chỉ cần ai đó viết thêm một đường ghi giao dịch mới mà quên chuyện ảnh.
 *
 * Nên ảnh có SỔ RIÊNG: bảng `anh_minh_chung`, mỗi tấm một tài liệu, khoá theo
 * mã ảnh trên Cloudinary. Sổ này:
 *
 *   · Là TRƯỜNG MÓC ĐÚNG TẤM ẢNH: mã ảnh Cloudinary (`publicId`). Dữ liệu và
 *     ảnh đi một cụm — xoá dữ liệu thì app lấy đúng mã này xoá luôn tệp trên
 *     Cloudinary (`api/anh/xoa`, chỉ admin). Không còn trạng thái lửng lơ
 *     "tệp còn mà không ai thấy".
 *   · CỤM LÀ CẢ CHUYẾN, không phải từng dòng: một tờ biên bản gắn chín dòng
 *     cùng lượt giao. Xoá một dòng thì ảnh ở lại cho tám dòng kia; xoá dòng
 *     cuối cùng thì ảnh đi theo. Xem `anhSeMatLienKet`.
 *   · Mang KHOÁ NHÓM (`nhom`) của lượt giao. NẠP ĐÈ một tệp đã nạp (không xoá
 *     trước) thì lệnh nạp tự dọn dòng cũ rồi ghi lại — dòng nào đổi mã, ảnh
 *     của nó vẫn tự về đúng chuyến nhờ khoá này. Nạp đè không phải xoá, nên
 *     không bao giờ làm mất ảnh.
 *   · Thư viện đọc cả từ sổ: tấm nào dữ liệu không còn trỏ tới mà chưa bị
 *     xoá thật (gỡ ảnh khỏi phiếu, thay ảnh khi xác nhận đơn, hay lượt xoá
 *     trên Cloudinary bị hỏng) vẫn hiện ra, admin xoá nốt được.
 *
 * Ở đây chỉ có phần tính thuần, chạy phép kiểm không cần mạng. Phần ghi nằm ở
 * nơi gọi.
 */

import type { ImportSlip, Transaction } from "../types";

/** Bảng Firestore của sổ ảnh. */
export const KHO_SO_ANH = "anh_minh_chung";

/**
 * NHÃN DÁN LÊN MỌI ẢNH APP NÀY TẢI LÊN CLOUDINARY.
 *
 * Kho Cloudinary của anh Khoa DÙNG CHUNG với một web app khác. Nhãn này để
 * mở trang Cloudinary ra lọc được ngay ảnh nào của app nào. App không dựa vào
 * nhãn để xoá — xoá luôn đi theo mã ảnh lưu trong chính dữ liệu của app.
 */
export const NHAN_ANH_APP = "bcsx-skb";

/** Chiều của ảnh. Rỗng là ảnh tìm lại từ Cloudinary, chưa biết thuộc đơn nào. */
export type ChieuAnh = "XUAT" | "NHAP" | "";

/** Một dòng trong sổ ảnh. */
export interface BanGhiAnh {
  /** Mã tài liệu Firestore — mã ảnh Cloudinary đã thay `/` cho hợp lệ. */
  id: string;
  url: string;
  /** Mã ảnh trên Cloudinary, cần để xoá tệp thật. */
  publicId: string;
  chieu: ChieuAnh;
  /** Ngày giao / ngày nhập, `yyyy-MM-dd`. */
  ngay: string;
  partnerId: string;
  partnerName: string;
  /**
   * KHOÁ NHÓM — lượt giao mà tấm ảnh này làm chứng.
   *
   * Xuất: `referenceGroupId` (một chuyến giao, một tờ biên bản). Nhập: mã phiếu
   * `PN-...`, hoặc mã dòng khi dòng không thuộc phiếu nào. Đây là thứ để gắn
   * lại ảnh vào đơn sau khi xoá rồi nạp lại.
   */
  nhom: string;
  /** Tên mặt hàng / phiếu để Thư viện có chữ hiện khi đơn đã bị xoá. */
  tieuDe: string;
  /** Ảnh vào sổ từ đâu. */
  nguon: "giao-dich" | "phieu";
  /** Lúc ghi vào sổ, ISO. */
  vaoSoLuc: string;
  vaoSoBoi: string;
}

/** Khúc nhận ra đường dẫn tải ảnh Cloudinary. */
const MOC_UPLOAD = "/image/upload/";

/** Một khúc đường dẫn có phải là phép biến đổi (`w_400`, `f_auto,q_auto`…). */
function laPhepBienDoi(khuc: string): boolean {
  return (
    khuc.length > 0 &&
    khuc.split(",").every((p) => /^[a-z]{1,3}_[^/]+$/.test(p))
  );
}

/**
 * Lấy mã ảnh (`public_id`) từ đường dẫn Cloudinary.
 *
 *     .../image/upload/v1789640255/qzzyesrmtcoubozvyrt3.jpg  → qzzyesrmtcoubozvyrt3
 *     .../image/upload/f_auto,w_400/v1/thu-muc/abc.jpg       → thu-muc/abc
 *
 * Gặp khúc phiên bản `v123…` thì mọi thứ phía sau là mã ảnh — đường dẫn do
 * Cloudinary trả về luôn có khúc này. Không có thì bỏ những khúc trông như
 * phép biến đổi, nhưng LUÔN giữ khúc cuối: mã ảnh có thể chứa dấu `_`.
 *
 * Không phải ảnh Cloudinary thì trả rỗng — không đoán.
 */
export function publicIdTuUrl(url: string): string {
  const u = String(url ?? "").trim();
  if (!/^https?:\/\/res\.cloudinary\.com\//i.test(u)) return "";
  const i = u.indexOf(MOC_UPLOAD);
  if (i < 0) return "";
  const khuc = u
    .slice(i + MOC_UPLOAD.length)
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean);
  if (!khuc.length) return "";

  const v = khuc.findIndex((k) => /^v\d+$/.test(k));
  let con: string[];
  if (v >= 0) {
    con = khuc.slice(v + 1);
  } else {
    con = [...khuc];
    while (con.length > 1 && laPhepBienDoi(con[0])) con.shift();
  }
  if (!con.length) return "";

  const cuoi = con[con.length - 1];
  const cham = cuoi.lastIndexOf(".");
  con[con.length - 1] = cham > 0 ? cuoi.slice(0, cham) : cuoi;
  return con.join("/");
}

/**
 * Mã tài liệu Firestore cho một mã ảnh.
 *
 * Mã tài liệu không được chứa `/`, mà mã ảnh Cloudinary có thể có thư mục.
 * Thay bằng `~` — ký tự Cloudinary không dùng trong mã ảnh.
 */
export function idSoAnh(publicId: string): string {
  return String(publicId ?? "").replace(/\//g, "~");
}

function lamSach(u: unknown): string {
  return String(u ?? "").trim();
}

/** Khoá nhóm của một dòng giao dịch. Xem `BanGhiAnh.nhom`. */
export function nhomCuaGiaoDich(t: Pick<Transaction, "id" | "referenceGroupId" | "slipCode">): string {
  return lamSach(t.referenceGroupId) || lamSach(t.slipCode) || lamSach(t.id);
}

function chieuCuaLoai(type: string): ChieuAnh {
  if (type === "OUT" || type === "LOSS" || type === "DAMAGE") return "XUAT";
  if (type === "IN" || type === "OPENING") return "NHAP";
  return "";
}

/**
 * Mọi tấm ảnh đang được dữ liệu sống trỏ tới, dựng thành dòng sổ.
 *
 * Mỗi mã ảnh một dòng: tờ biên bản gắn chín dòng cùng lượt giao thì vẫn là
 * một tấm. Giữ dòng ĐẦU TIÊN gặp — phiếu trước giao dịch, vì phiếu nói đúng
 * tờ giấy hơn từng dòng hàng.
 *
 * Bỏ qua ảnh không phải Cloudinary (ảnh base64 cũ, đường dẫn tạm): không có mã
 * ảnh thì không có gì để khoá, cũng không có gì để xoá trên máy chủ. Những
 * tấm đó vẫn hiện trong Thư viện qua đường cũ.
 */
export function dongSoTuDuLieu(
  transactions: readonly Transaction[],
  slips: readonly ImportSlip[],
  nguoi: string,
  luc: string,
  /**
   * Tên kho Cloudinary của app. Có thì chỉ nhận ảnh của đúng kho này — ảnh mẫu
   * công khai của Cloudinary (kho `demo`) hay ảnh kho khác không vào sổ, vì
   * máy chủ cũng không xoá được chúng.
   */
  chiKho = "",
): BanGhiAnh[] {
  const ra = new Map<string, BanGhiAnh>();
  const tienTo = chiKho ? `https://res.cloudinary.com/${chiKho}/` : "";
  const them = (b: Omit<BanGhiAnh, "id" | "publicId" | "vaoSoLuc" | "vaoSoBoi">) => {
    if (tienTo && !b.url.startsWith(tienTo)) return;
    const publicId = publicIdTuUrl(b.url);
    if (!publicId) return;
    const id = idSoAnh(publicId);
    if (ra.has(id)) return;
    ra.set(id, { ...b, id, publicId, vaoSoLuc: luc, vaoSoBoi: nguoi });
  };

  const theoPhieu = new Map<string, Transaction>();
  transactions.forEach((t) => {
    if (t.slipCode && !theoPhieu.has(t.slipCode)) theoPhieu.set(t.slipCode, t);
  });

  slips.forEach((s) => {
    const dau = theoPhieu.get(s.code);
    (s.signedPhotoUrls || []).forEach((u) =>
      them({
        url: lamSach(u),
        chieu: "NHAP",
        ngay: lamSach(dau?.date || s.date).slice(0, 10),
        partnerId: dau?.partnerId || "",
        partnerName: dau?.partnerName || "",
        nhom: s.code,
        tieuDe: `Phiếu ${s.code}`,
        nguon: "phieu",
      }),
    );
  });

  transactions.forEach((t) => {
    const ds = [t.evidencePhotoUrl, ...(t.evidencePhotoUrls || [])];
    ds.forEach((u) =>
      them({
        url: lamSach(u),
        chieu: chieuCuaLoai(t.type),
        ngay: lamSach(t.date).slice(0, 10),
        partnerId: t.partnerId || "",
        partnerName: t.partnerName || "",
        nhom: nhomCuaGiaoDich(t),
        tieuDe: t.productName || "",
        nguon: "giao-dich",
      }),
    );
  });

  return Array.from(ra.values());
}

/**
 * Dòng nào CHƯA có trong sổ — chỉ ghi thêm những dòng này.
 *
 * Không bao giờ ghi lại dòng đã có: dòng trong sổ là bản ghi gốc lúc ảnh mới
 * vào, ghi đè bằng bản dựng lại từ dữ liệu sống thì mất thông tin của đơn đã
 * xoá (ngày, đối tác, khoá nhóm cũ).
 */
export function dongChuaVaoSo(
  tuDuLieu: readonly BanGhiAnh[],
  so: readonly Pick<BanGhiAnh, "id">[],
): BanGhiAnh[] {
  const co = new Set(so.map((b) => b.id));
  return tuDuLieu.filter((b) => !co.has(b.id));
}

/**
 * Đường dẫn ảnh theo khoá nhóm — để gắn lại vào đơn khi nạp lại tệp.
 *
 * Bỏ ảnh chưa rõ chiều: ảnh tìm lại từ Cloudinary chưa thuộc đơn nào, gắn bừa
 * vào một khoá nhóm trùng tên là gắn sai chứng từ.
 */
export function anhTheoNhom(so: readonly BanGhiAnh[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  so.forEach((b) => {
    if (!b.chieu || !b.nhom || !b.url) return;
    const ds = m.get(b.nhom);
    if (!ds) m.set(b.nhom, [b.url]);
    else if (!ds.includes(b.url)) ds.push(b.url);
  });
  return m;
}

/**
 * Những tài liệu đang trỏ tới một tấm ảnh — để báo trước khi xoá ảnh, và để
 * gỡ đường dẫn khỏi đúng những chỗ ấy sau khi xoá.
 */
export function noiDangDungAnh(
  url: string,
  transactions: readonly Transaction[],
  slips: readonly ImportSlip[],
): { giaoDich: Transaction[]; phieu: ImportSlip[] } {
  const u = lamSach(url);
  return {
    giaoDich: transactions.filter((t) =>
      [t.evidencePhotoUrl, ...(t.evidencePhotoUrls || [])].some(
        (x) => lamSach(x) === u,
      ),
    ),
    phieu: slips.filter((s) =>
      (s.signedPhotoUrls || []).some((x) => lamSach(x) === u),
    ),
  };
}

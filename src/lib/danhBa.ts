/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DANH BẠ NHÂN VIÊN (anh Khoa 23/11/2026) — kéo nguyên cách làm danh bạ của
 * app Kiểm kê F&B (Cost-master-sigma, bản 16/11/2026).
 *
 * Nguồn: danh bạ MySun, CHỈ địa điểm "Vp Bà Nà" (Sếp đã duyệt phạm vi). Agent
 * `danh_ba_mysun.py` trên máy anh Khoa kéo mỗi Chủ nhật 17h, gửi app Kiểm kê,
 * rồi ghi thẳng vào Firestore của app này (bảng `nhan_su`, id = mã NV) bằng
 * phiên Firebase trên máy — máy chủ Vercel không giữ khoá nào.
 *
 * Chỉ giữ: mã NV, họ tên, email công ty, SĐT công việc, bộ phận, chức danh,
 * cấp độ, chuỗi quản lý (sơ đồ vị trí). KHÔNG ngày sinh, email cá nhân, giới
 * tính, ảnh.
 *
 * GẮN TÀI KHOẢN APP: lưu NGAY TRÊN hồ sơ nhân viên (`uid`, `emailTaiKhoan`,
 * `coTaiKhoan`), không đụng bảng `users`. Một nhân viên ↔ một tài khoản. Tự
 * gắn khi email đăng nhập trùng email công ty, hoặc họ tên trùng ĐÚNG CẢ DẤU
 * với đúng một người đang làm ("Lê Thị Ly" ≠ "Lê Thị Lý").
 *
 * Quyền xem (luật Firestore): admin thấy toàn bộ; người khác chỉ thấy nhân
 * viên đã có tài khoản app (`coTaiKhoan == true`).
 *
 * Hồ sơ KHAI TAY (`nguon: "app"`, mã `NB-…`): người không có trên MySun Vp Bà
 * Nà (VD kế toán). Admin khai; agent không cập nhật, không đánh dấu nghỉ.
 */

export interface QuanLy {
  ma_nv: string;
  ho_ten: string;
  chuc_danh: string;
  /** Số người quản lý trực tiếp. */
  so_duoi: number;
}

export interface NhanSu {
  ma_nv: string;
  ho_ten: string;
  email_cty?: string | null;
  sdt?: string | null;
  bo_phan?: string | null;
  chuc_danh?: string | null;
  cap_do?: string | null;
  dang_lam?: boolean;
  /** Chuỗi quản lý, cấp cao nhất trước. */
  quan_ly?: QuanLy[] | null;
  so_cap_duoi?: number | null;
  /** "mysun" (agent kéo) | "app" (admin khai tay). */
  nguon?: "mysun" | "app";
  cap_nhat_luc?: string;
  /** Tài khoản app đã gắn. */
  uid?: string;
  emailTaiKhoan?: string;
  coTaiKhoan?: boolean;
  ganLuc?: string;
  ganBoi?: string;
}

/** Bỏ dấu, bỏ hoa/thường, bỏ khoảng trắng — để TÌM, không để gắn. */
export function vnNorm(x: unknown): string {
  return String(x ?? "")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, "");
}

/** Họ tên chuẩn để GẮN: giữ dấu (NFC), chỉ bỏ hoa/thường và khoảng trắng thừa. */
export function tenChuan(x: unknown): string {
  return String(x ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Chuỗi tìm kiếm của một nhân viên. */
export function khoaTim(r: NhanSu): string {
  return vnNorm(
    [r.ho_ten, r.ma_nv, r.email_cty, r.sdt, r.bo_phan, r.chuc_danh, r.cap_do].join(" "),
  );
}

/** Mọi từ gõ vào (đã bỏ dấu) đều phải có trong chuỗi tìm kiếm. */
export function khopTim(r: NhanSu, q: string): boolean {
  const tu = String(q || "")
    .split(/\s+/)
    .map(vnNorm)
    .filter(Boolean);
  if (!tu.length) return true;
  const k = khoaTim(r);
  return tu.every((t) => k.includes(t));
}

/** Màu avatar theo tên — cùng bảng màu app Kiểm kê. */
export function mauTen(ten: string): string {
  let h = 0;
  String(ten || "")
    .split("")
    .forEach((c) => {
      h = (h * 31 + c.charCodeAt(0)) >>> 0;
    });
  return ["#0E5C55", "#1F6F8B", "#7A4CA0", "#B5523B", "#2F7D4F", "#9A6A14", "#3F5AA8", "#A23E6A"][h % 8];
}

/** Hai chữ cái đầu: chữ đầu của từ đầu và từ cuối. */
export function chuCaiDau(ten: string): string {
  const w = String(ten || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  const a = w[0][0] || "";
  const b = w.length > 1 ? w[w.length - 1][0] || "" : "";
  return (a + b).toUpperCase();
}

export interface TaiKhoanGan {
  uid: string;
  email: string;
  name?: string;
  role: string;
}

/** Tài khoản đang hoạt động (đã duyệt). */
export const taiKhoanHoatDong = (t: TaiKhoanGan) => !!t.role && t.role !== "PENDING";

/**
 * Gợi ý CHẮC CHẮN cho một tài khoản: email trùng email công ty (đúng một
 * người), hoặc họ tên trùng đúng cả dấu với đúng một người đang làm.
 */
export function goiYGan(
  t: TaiKhoanGan,
  ds: readonly NhanSu[],
): { r: NhanSu; lyDo: "email" | "tên" } | null {
  const dangLam = ds.filter((r) => r.dang_lam !== false);
  const em = String(t.email || "").toLowerCase().trim();
  if (em) {
    const a = dangLam.filter((r) => String(r.email_cty || "").toLowerCase().trim() === em);
    if (a.length === 1) return { r: a[0], lyDo: "email" };
  }
  const tn = tenChuan(t.name);
  if (!tn) return null;
  const b = dangLam.filter((r) => tenChuan(r.ho_ten) === tn);
  return b.length === 1 ? { r: b[0], lyDo: "tên" } : null;
}

/**
 * Lý do một tài khoản KHÔNG tự gắn được + người để bấm chọn: trùng tên nhiều
 * người, tên gần giống (khác dấu), hoặc không có trong danh bạ.
 */
export function viSaoChuaGan(
  t: TaiKhoanGan,
  ds: readonly NhanSu[],
): { lyDo: string; chon: NhanSu[] } {
  const dangLam = ds.filter((r) => r.dang_lam !== false);
  const cung = dangLam.filter((r) => tenChuan(r.ho_ten) === tenChuan(t.name));
  if (cung.length > 1)
    return { lyDo: `Danh bạ có ${cung.length} người cùng tên — bấm đúng người để gắn:`, chon: cung };
  const gan = dangLam.filter((r) => vnNorm(r.ho_ten) === vnNorm(t.name) && vnNorm(t.name));
  if (gan.length)
    return { lyDo: "Danh bạ có tên gần giống (khác dấu) — bấm nếu đúng người:", chon: gan };
  return {
    lyDo:
      "Không có trong danh bạ Vp Bà Nà — thường là thời vụ, sinh viên thực tập, đã nghỉ việc hoặc làm ở địa điểm khác.",
    chon: [],
  };
}

/**
 * Các cặp TỰ GẮN được ngay: tài khoản đang hoạt động, chưa gắn, có gợi ý chắc
 * chắn, và nhân viên đó chưa gắn với tài khoản nào khác. Mỗi nhân viên chỉ
 * nhận một tài khoản trong cùng lượt.
 */
export function capTuGan(
  taiKhoan: readonly TaiKhoanGan[],
  ds: readonly NhanSu[],
): { t: TaiKhoanGan; r: NhanSu }[] {
  const daGanUid = new Set(ds.filter((r) => r.uid).map((r) => r.uid as string));
  const daDungMa = new Set(ds.filter((r) => r.uid).map((r) => r.ma_nv));
  const ra: { t: TaiKhoanGan; r: NhanSu }[] = [];
  taiKhoan.forEach((t) => {
    if (!taiKhoanHoatDong(t) || daGanUid.has(t.uid)) return;
    const g = goiYGan(t, ds);
    if (!g || daDungMa.has(g.r.ma_nv)) return;
    daDungMa.add(g.r.ma_nv);
    daGanUid.add(t.uid);
    ra.push({ t, r: g.r });
  });
  return ra;
}

/**
 * Số người dưới quyền trực tiếp: số MySun báo + số hồ sơ khai tay đang làm
 * có quản lý trực tiếp là người này.
 */
export function soDuoiQuyen(ma: string, goc: number | null | undefined, ds: readonly NhanSu[]): number {
  const n = ds.filter(
    (r) =>
      r.nguon === "app" &&
      r.dang_lam !== false &&
      Array.isArray(r.quan_ly) &&
      r.quan_ly.length > 0 &&
      String(r.quan_ly[r.quan_ly.length - 1].ma_nv) === String(ma),
  ).length;
  return (Number(goc) || 0) + n;
}

/** Chuỗi quản lý cho hồ sơ khai tay dưới một người: chuỗi của người đó + chính họ. */
export function chuoiQuanLyDuoi(me: NhanSu): QuanLy[] {
  return (Array.isArray(me.quan_ly) ? me.quan_ly : []).concat([
    {
      ma_nv: me.ma_nv,
      ho_ten: me.ho_ten,
      chuc_danh: me.chuc_danh || "",
      so_duoi: Number(me.so_cap_duoi) || 0,
    },
  ]);
}

/** Kiểm form khai tay. Rỗng = hợp lệ; `canhBao` = cần hỏi lại (email không đuôi công ty). */
export function kiemKhaiTay(v: {
  ho_ten: string;
  email_cty: string;
  sdt: string;
}): { loi: string; canhBao: string } {
  if (!v.ho_ten.trim()) return { loi: "Nhập họ tên.", canhBao: "" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email_cty.trim()))
    return { loi: "Nhập email công ty hợp lệ.", canhBao: "" };
  if (!/^[\d+ .]{8,15}$/.test(v.sdt.trim())) return { loi: "Nhập số điện thoại hợp lệ.", canhBao: "" };
  const canhBao = /@(banahills\.com\.vn|sungroup\.com\.vn)$/i.test(v.email_cty.trim())
    ? ""
    : "Email không phải đuôi công ty (@banahills.com.vn / @sungroup.com.vn). Vẫn lưu?";
  return { loi: "", canhBao };
}

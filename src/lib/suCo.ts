/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HỆ BÁO SỰ CỐ — học theo app Kiểm kê (Cost-master-sigma, 16/11/2026), anh Khoa
 * 27/11/2026: "tích hợp vào app để tránh mắc lỗi tương tự".
 *
 * Bốn khối:
 *   1. App tự ghi lỗi người dùng gặp → bảng `loi_app` (src/lib/ghiLoi.ts).
 *   2. Bot trên máy anh Khoa (agent/canh_bao.py, 17h hằng ngày) kiểm app + dữ liệu,
 *      mở sự cố ở bảng `su_co`, nhắn Telegram theo mức S1/S2/S3.
 *   3. Tab "Sự cố hệ thống" (admin): sự cố đang mở, lỗi 24 giờ, thông báo cho
 *      bộ phận (`thong_bao_app`), sổ tay & bài học (`so_tay`).
 *   4. Sổ tay bài học: commit sửa lỗi có dòng `Sua-loi:` → bot sinh bài học,
 *      canh TÁI PHÁT theo `khoaNhanDien`, xuất docs/SO-TAY-SU-CO.md.
 *
 * File này chỉ chứa phép tính thuần (gộp lỗi, phân mức, che dữ liệu nhạy cảm,
 * nhận diện tái phát) để test được và để bot Python làm y hệt.
 */

export type MucSuCo = "S1" | "S2" | "S3";

export const TEN_MUC: Record<MucSuCo, string> = {
  S1: "🔴 KHẨN",
  S2: "🟠 NẶNG",
  S3: "🟡 NHẸ",
};

/** Một lỗi người dùng gặp, app ghi xuống `loi_app`. */
export interface LoiApp {
  id?: string;
  /** ISO giờ máy người dùng. */
  luc: string;
  /** "js" | "promise" | "firestore" | "thongbao" */
  loai: string;
  thongDiep: string;
  /** Mã lỗi (permission-denied, …) nếu có. */
  ma?: string;
  chiTiet?: string;
  /** Mã build app lúc gặp lỗi (__BUILD_ID__). */
  ban?: string;
  /** Tab đang mở. */
  man?: string;
  /** Mã máy ngẫu nhiên lưu ở trình duyệt — đếm số máy, không phải danh tính. */
  may?: string;
  loaiMay?: string;
  vaiTro?: string;
  uid: string;
  ten?: string;
  daXuLy?: boolean;
}

export interface SuCo {
  id: string;
  muc: MucSuCo;
  tieuDe: string;
  dauHieu: string;
  lyDo?: string[];
  canLam?: string;
  traO?: string;
  moLuc: string;
  capNhatLuc: string;
  dongLuc?: string;
  daXuLy?: boolean;
  /** Khớp bài học cũ → id bài học. */
  taiPhat?: string;
}

export type LoaiSoTay = "huong_dan" | "bai_hoc";

export interface MucSoTay {
  id: string;
  loai: LoaiSoTay;
  tieuDe: string;
  muc: MucSuCo;
  trieuChung?: string;
  nguyenNhan?: string;
  kiemTra?: string;
  xuLy?: string;
  chanTaiPhat?: string;
  /** Chuỗi trong câu lỗi / đầu mã sự cố để nhận ra lỗi quay lại (cách nhau bằng "|"). */
  khoaNhanDien?: string;
  maSuCo?: string;
  /** Commit / ngày sửa. */
  banSua?: string;
  ngaySua?: string;
  taiPhatLan?: number;
  capNhatBoi?: string;
  capNhatLuc?: string;
}

/** Dải thông báo cho bộ phận, admin bật trong tab Sự cố. */
export interface ThongBaoApp {
  id: string;
  /** "dang_loi" | "da_sua" */
  kieu: "dang_loi" | "da_sua";
  phan: string;
  noiDung: string;
  bat: boolean;
  luc: string;
  boi?: string;
}

/* ------------------------------------------------------------------ */
/*  Che dữ liệu nhạy cảm trước khi ghi lỗi                              */
/* ------------------------------------------------------------------ */

/**
 * Bỏ khoá / token / thẻ HTML khỏi câu lỗi. Câu lỗi có thể dính khoá API
 * Firebase (AIza…), JWT (eyJ…), "Bearer …", hoặc mã PIN người dùng gõ.
 */
export function cheLoi(s: unknown, toiDa = 600): string {
  return String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[khoá]")
    .replace(/eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]*/g, "[jwt]")
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, "Bearer [ẩn]")
    .replace(/\b(pin|mã pin|password|mật khẩu)\s*[:=]\s*\S+/gi, "$1: [ẩn]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, toiDa);
}

/**
 * Khoá GỘP: cùng một lỗi ở hai người thường chỉ khác số / mã. Thay số dài,
 * mã phiếu, id ngẫu nhiên bằng "#" để gộp được.
 */
export function khoaGop(thongDiep: string): string {
  return cheLoi(thongDiep, 300)
    .toLowerCase()
    .replace(/[0-9a-f]{8,}/g, "#")
    .replace(/\d+([.,]\d+)*/g, "#")
    .replace(/#(\s*#)+/g, "#")
    .slice(0, 160);
}

/** Lỗi rớt mạng / người dùng tự huỷ — không phải lỗi app, không ghi. */
export function laLoiMang(thongDiep: string): boolean {
  return /failed to fetch|networkerror|network request failed|load failed|the user aborted|aborterror|client is offline|unavailable|resizeobserver loop/i.test(
    thongDiep,
  );
}

/* ------------------------------------------------------------------ */
/*  Gộp + phân mức lỗi người dùng                                      */
/* ------------------------------------------------------------------ */

export interface NhomLoi {
  khoa: string;
  thongDiep: string;
  loai: string;
  ma: string;
  soLan: number;
  soNguoi: number;
  soMay: number;
  man: string[];
  ban: string[];
  dau: string;
  cuoi: string;
  ids: string[];
  daXuLy: boolean;
}

export function gopLoi(ds: readonly LoiApp[]): NhomLoi[] {
  const m = new Map<string, NhomLoi & { _nguoi: Set<string>; _may: Set<string> }>();
  ds.forEach((l) => {
    const k = khoaGop(l.thongDiep);
    let n = m.get(k);
    if (!n) {
      n = {
        khoa: k,
        thongDiep: l.thongDiep,
        loai: l.loai,
        ma: l.ma || "",
        soLan: 0,
        soNguoi: 0,
        soMay: 0,
        man: [],
        ban: [],
        dau: l.luc,
        cuoi: l.luc,
        ids: [],
        daXuLy: true,
        _nguoi: new Set(),
        _may: new Set(),
      };
      m.set(k, n);
    }
    n.soLan += 1;
    n._nguoi.add(l.uid);
    if (l.may) n._may.add(l.may);
    if (l.man && !n.man.includes(l.man)) n.man.push(l.man);
    if (l.ban && !n.ban.includes(l.ban)) n.ban.push(l.ban);
    if (l.luc < n.dau) n.dau = l.luc;
    if (l.luc > n.cuoi) n.cuoi = l.luc;
    if (l.id) n.ids.push(l.id);
    if (!l.daXuLy) n.daXuLy = false;
  });
  return Array.from(m.values())
    .map(({ _nguoi, _may, ...n }) => ({ ...n, soNguoi: _nguoi.size, soMay: _may.size }))
    .sort((a, b) => b.soNguoi - a.soNguoi || b.soLan - a.soLan);
}

/**
 * Mức của một nhóm lỗi. App BCSX chỉ ~10 tài khoản (Kiểm kê hàng trăm), nên
 * ngưỡng hạ xuống: 4 người cùng lỗi đã là gần nửa xưởng.
 *   S1: ≥ 4 người, hoặc ≥ 30 lần, hoặc lỗi ghi bị TỪ CHỐI ở ≥ 2 người.
 *   S2: ≥ 2 người, hoặc ≥ 8 lần.
 *   S3: còn lại.
 */
export function mucNhomLoi(n: Pick<NhomLoi, "soNguoi" | "soLan" | "ma">): MucSuCo {
  const tuChoi = /permission-denied|failed-precondition|resource-exhausted/.test(n.ma);
  if (n.soNguoi >= 4 || n.soLan >= 30 || (tuChoi && n.soNguoi >= 2)) return "S1";
  if (n.soNguoi >= 2 || n.soLan >= 8 || (tuChoi && n.soLan >= 3)) return "S2";
  return "S3";
}

/** Mức hạn mức lượt đọc Firestore trong ngày (50.000 lượt / ngày). */
export function mucHanMuc(daDung: number, duBao: number, moc: number): MucSuCo | null {
  if (daDung >= moc) return "S1";
  if (duBao >= moc || daDung >= moc * 0.8) return "S2";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Tái phát                                                           */
/* ------------------------------------------------------------------ */

/**
 * Bài học nào khớp dấu hiệu này? `khoaNhanDien` có thể chứa nhiều chuỗi cách
 * nhau bằng "|"; khớp khi câu lỗi CHỨA một chuỗi (không phân biệt hoa thường)
 * hoặc mã sự cố BẮT ĐẦU bằng chuỗi đó. Chuỗi < 4 ký tự bỏ qua (khớp bừa).
 */
export function khopBaiHoc(
  dauHieu: { thongDiep?: string; maSuCo?: string },
  soTay: readonly MucSoTay[],
): MucSoTay | null {
  const cau = String(dauHieu.thongDiep || "").toLowerCase();
  const ma = String(dauHieu.maSuCo || "").toLowerCase();
  for (const b of soTay) {
    const ds = String(b.khoaNhanDien || "")
      .split("|")
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x.length >= 4);
    if (ds.some((x) => (cau && cau.includes(x)) || (ma && ma.startsWith(x)))) return b;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Câu "làm tạm" cho bộ phận                                          */
/* ------------------------------------------------------------------ */

/** Phần app bị lỗi → câu làm tạm điền sẵn khi admin soạn thông báo. */
export const PHAN_LAM_TAM: { phan: string; lamTam: string }[] = [
  { phan: "Lưu phiếu nhập / xuất", lamTam: "Ghi tạm số lượng ra giấy hoặc chụp ảnh biên bản, CHƯA nhập lại — kế toán báo khi dùng lại được, tránh ghi kho hai lần." },
  { phan: "Tải / xem ảnh minh chứng", lamTam: "Cứ chụp ảnh bằng điện thoại và giữ trong máy; lưu phiếu không kèm ảnh thì chưa lưu, chờ báo." },
  { phan: "Ký điện tử", lamTam: "Chưa ký lại nhiều lần; phiếu vẫn nằm chờ đúng chỗ, sửa xong ký tiếp." },
  { phan: "Kiểm kê", lamTam: "Ghi số đếm ra giấy và chụp ảnh hiện trạng; sửa xong nhập lại một lần." },
  { phan: "Công nợ · hóa đơn", lamTam: "Chưa tải tệp TEMPLATE / chưa điền số hóa đơn — tránh xuất trùng; chờ báo." },
  { phan: "Đăng nhập / mã PIN", lamTam: "Chờ thông báo, đừng tạo tài khoản mới." },
  { phan: "App chạy bản cũ", lamTam: "Đóng hẳn app (vuốt tắt) rồi mở lại; máy tính bấm Ctrl+Shift+R." },
];

/** Soạn sẵn nội dung thông báo cho bộ phận. */
export function soanThongBao(kieu: "dang_loi" | "da_sua", phan: string, tuGio = ""): string {
  const lt = PHAN_LAM_TAM.find((x) => x.phan === phan)?.lamTam || "Chờ kế toán báo khi dùng lại được.";
  return kieu === "dang_loi"
    ? `⚠ App đang lỗi phần ${phan}${tuGio ? ` từ ${tuGio}` : ""}. Các phần khác vẫn dùng bình thường. Trong lúc chờ: ${lt}`
    : `✅ Phần ${phan} đã dùng lại được. Đóng hẳn app rồi mở lại để lên bản mới. Phiếu nào làm trong lúc lỗi mà chưa thấy trên app thì báo kế toán.`;
}

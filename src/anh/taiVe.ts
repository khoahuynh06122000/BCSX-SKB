/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TẢI ẢNH VỀ: tên tệp theo `ngày giao-điểm nhận-đối tác` (Khoa chốt
 * 21/10/2026) và gói nhiều tấm vào một ZIP "xếp nguyên" (không nén — ảnh JPEG
 * đã nén sẵn, và máy công ty chặn tải thư viện nén từ mạng ngoài).
 *
 *   BNC · 1901, giao 16/10/2026     → 16.10.26-1901-BNC.jpg
 *   OHL, điểm nhận Oakwood Hạ Long  → 16.10.26-Oakwood-Ha-Long-OHL.jpg
 *   FV                              → 16.10.26-FV.jpg
 *   Phiếu nhập PN-261016-01         → 16.10.26-PN-261016-01-<đơn vị>.jpg
 */

import { crc32 } from "../lib/crc32";

/** Bỏ dấu tiếng Việt và ký tự Windows không cho đặt tên tệp. */
export function tenAnToan(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^0-9A-Za-z._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Đuôi tệp suy từ đường dẫn; không rõ thì `.jpg`. */
export function duoiTep(url: string): string {
  const m = String(url ?? "").split(/[?#]/)[0].match(/\.(png|jpe?g|webp|gif|heic|bmp)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

export interface ThongTinTen {
  date: string;
  donVi: string;
  diemNhan?: string;
  /** Mã phiếu nhập khi là ảnh nhập kho. */
  maPhieu?: string;
}

/** Tên gốc (chưa đuôi) của một tấm. */
export function tenGoc(o: ThongTinTen): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(o.date ?? ""));
  const ngay = m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : "khong-ngay";
  // "BNC · 1901": trước dấu · là đối tác, sau là điểm nhận.
  const [doiTac, ...sau] = String(o.donVi ?? "").split("·").map((x) => x.trim());
  const diem = sau.join(" ") || String(o.diemNhan ?? "").trim() || String(o.maPhieu ?? "").trim();
  return [ngay, diem, doiTac].map(tenAnToan).filter(Boolean).join("-") || "anh";
}

/** Tên cho cả bộ, giữ thứ tự; trùng thì thêm `-2`, `-3`… (ZIP trùng tên là mất tấm). */
export function tenCaBo(ds: readonly (ThongTinTen & { url: string })[]): string[] {
  const goc = ds.map(tenGoc);
  const tong = new Map<string, number>();
  goc.forEach((g) => tong.set(g, (tong.get(g) || 0) + 1));
  const dem = new Map<string, number>();
  return ds.map((o, i) => {
    const g = goc[i];
    const n = (dem.get(g) || 0) + 1;
    dem.set(g, n);
    return `${(tong.get(g) || 0) > 1 && n > 1 ? `${g}-${n}` : g}.${duoiTep(o.url)}`;
  });
}

export interface TepZip {
  ten: string;
  duLieu: Uint8Array;
}

const GIOI_HAN_ZIP = 0xffffffff;

/** Gói tệp thành ZIP kiểu xếp nguyên. Quá 4 GB thì báo lỗi rõ ràng. */
export function taoZip(tep: readonly TepZip[]): Blob {
  const ma = new TextEncoder();
  const so = (v: number, byte: 2 | 4) => {
    const a = new Uint8Array(byte);
    const dv = new DataView(a.buffer);
    if (byte === 2) dv.setUint16(0, v & 0xffff, true);
    else dv.setUint32(0, v >>> 0, true);
    return a;
  };
  const khoi: BlobPart[] = [];
  const muc: { ten: Uint8Array; crc: number; co: number; viTri: number }[] = [];
  let viTri = 0;
  for (const t of tep) {
    const ten = ma.encode(t.ten);
    const crc = crc32(t.duLieu);
    const co = t.duLieu.length;
    if (viTri + co > GIOI_HAN_ZIP) throw new Error("Bộ ảnh vượt quá 4 GB, không gói vào một tệp ZIP được.");
    // Đầu mục cục bộ; cờ 0x0800 = tên UTF-8; phương thức 0 = không nén.
    khoi.push(so(0x04034b50, 4), so(20, 2), so(0x0800, 2), so(0, 2), so(0, 2), so(0, 2),
      so(crc, 4), so(co, 4), so(co, 4), so(ten.length, 2), so(0, 2), ten, t.duLieu);
    muc.push({ ten, crc, co, viTri });
    viTri += 30 + ten.length + co;
  }
  const dauMucLuc = viTri;
  for (const m of muc) {
    khoi.push(so(0x02014b50, 4), so(20, 2), so(20, 2), so(0x0800, 2), so(0, 2), so(0, 2), so(0, 2),
      so(m.crc, 4), so(m.co, 4), so(m.co, 4), so(m.ten.length, 2), so(0, 2), so(0, 2), so(0, 2),
      so(0, 2), so(0, 4), so(m.viTri, 4), m.ten);
    viTri += 46 + m.ten.length;
  }
  khoi.push(so(0x06054b50, 4), so(0, 2), so(0, 2), so(muc.length, 2), so(muc.length, 2),
    so(viTri - dauMucLuc, 4), so(dauMucLuc, 4), so(0, 2));
  return new Blob(khoi, { type: "application/zip" });
}

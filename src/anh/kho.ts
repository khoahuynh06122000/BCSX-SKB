/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GHI / XOÁ ẢNH CHỨNG TỪ — phần chạy trong trình duyệt.
 *
 * Ba việc, mỗi việc một đường duy nhất:
 *
 *   1. LƯU: tải tệp lên Cloudinary rồi ghi bản ghi `anh_chung_tu` CÙNG LÔ với
 *      dữ liệu nghiệp vụ (xác nhận đơn, ký phiếu). Lô hỏng thì xoá ngay những
 *      tệp vừa tải — không để tệp nằm lại mà không chứng từ nào trỏ tới.
 *   2. XOÁ CHỨNG TỪ (admin): ảnh không còn chứng từ nào thì xoá tệp + bản ghi;
 *      ảnh còn chứng từ khác thì chỉ gỡ chứng từ đã mất.
 *   3. XOÁ MỘT TẤM (admin, ở Thư viện).
 *
 * Không có bước dọn chạy ngầm nào: mọi lần xoá đều do một người bấm.
 */

import type { WriteBatch } from "firebase/firestore";
import { auth, db, doc, writeBatch } from "../firebase";
import { compressFile } from "../lib/image";
import { KHO_CLOUDINARY, taiAnhLen } from "./cloudinary";
import {
  idTuMaTep,
  khoCuaUrl,
  KHO_ANH_CHUNG_TU,
  type AnhChungTu,
  type LoaiAnh,
  type ViecAnhKhiXoa,
} from "./moHinh";

/** Gọi API máy chủ kèm thẻ đăng nhập. */
async function goiMayChu(path: string, body: unknown): Promise<Response> {
  const nguoi = auth.currentUser;
  if (!nguoi) throw new Error("Chưa đăng nhập.");
  const token = await nguoi.getIdToken();
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export interface ThongTinGan {
  chungTu: string[];
  loai: LoaiAnh;
  ngay: string;
  maDoiTac: string;
  doiTac: string;
  taiBoi: string;
}

/**
 * Nén rồi tải từng tệp lên, dựng sẵn bản ghi để ghi cùng lô.
 *
 * Hỏng giữa chừng thì xoá luôn những tấm đã lên rồi ném lỗi — người dùng thử
 * lại từ đầu, không có tấm nào nằm lửng.
 */
export async function taiAnhChoChungTu(
  tep: readonly (File | Blob)[],
  tt: ThongTinGan,
): Promise<AnhChungTu[]> {
  if (!tt.chungTu.length) throw new Error("Ảnh phải gắn vào ít nhất một chứng từ.");
  const uid = auth.currentUser?.uid || "";
  const ra: AnhChungTu[] = [];
  try {
    for (const t of tep) {
      const nen = await compressFile(t, 2000, 2000, 0.85);
      const { url, publicId } = await taiAnhLen(nen);
      ra.push({
        id: idTuMaTep(publicId),
        url,
        publicId,
        chungTu: [...new Set(tt.chungTu)],
        loai: tt.loai,
        ngay: tt.ngay,
        maDoiTac: tt.maDoiTac,
        doiTac: tt.doiTac,
        taiLuc: new Date().toISOString(),
        taiBoi: tt.taiBoi,
        uid,
      });
    }
  } catch (e) {
    await boTepVuaTai(ra);
    throw e;
  }
  return ra;
}

/** Ghi các bản ghi ảnh vào một lô đang dựng (cùng lô với dữ liệu nghiệp vụ). */
export function ghiAnhVaoLo(lo: WriteBatch, anh: readonly AnhChungTu[]): void {
  anh.forEach(({ id, ...duLieu }) => lo.set(doc(db, KHO_ANH_CHUNG_TU, id), duLieu));
}

/**
 * Lô ghi hỏng sau khi đã tải tệp: xoá ngay tệp vừa tải.
 *
 * Máy chủ chỉ xoá tệp do CHÍNH người gọi tải trong 24 giờ và CHƯA có bản ghi
 * `anh_chung_tu` nào — xem api/anh/xoa.ts. Hỏng mạng thì thôi: tệp nằm lại
 * nhưng không gắn chứng từ nào, không làm sai số liệu.
 */
export async function boTepVuaTai(anh: readonly Pick<AnhChungTu, "url">[]): Promise<void> {
  const urls = anh.map((a) => a.url).filter(Boolean);
  if (!urls.length) return;
  try {
    await goiMayChu("/api/anh/xoa", { urls, vuaTai: true });
  } catch {
    /* mất mạng: bỏ qua */
  }
}

export interface KetQuaXoaTep {
  tong: number;
  daXoa: number;
  loi: string;
}

/** Admin: xoá tệp trên Cloudinary, 100 tấm một lượt. Không ném lỗi. */
export async function xoaTepTrenMayChu(urls: readonly string[]): Promise<KetQuaXoaTep> {
  const ds = [...new Set(urls.map((u) => String(u ?? "").trim()).filter(Boolean))];
  let daXoa = 0;
  let loi = "";
  for (let i = 0; i < ds.length; i += 100) {
    const phan = ds.slice(i, i + 100);
    try {
      const r = await goiMayChu("/api/anh/xoa", { urls: phan });
      const d: any = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || `Máy chủ trả về lỗi ${r.status}.`);
      const xong = (d?.ketQua || []).filter(
        (k: any) => k?.ketQua === "deleted" || k?.ketQua === "not_found",
      ).length;
      daXoa += xong;
      if (xong < phan.length && !loi) loi = `${phan.length - xong} tấm Cloudinary không xác nhận đã xoá.`;
    } catch (e) {
      loi = e instanceof Error ? e.message : String(e);
    }
  }
  return { tong: ds.length, daXoa, loi };
}

/** Admin: thử khoá xoá ảnh trên máy chủ (không xoá gì). */
export async function kiemTraKhoaXoa(): Promise<void> {
  const r = await goiMayChu("/api/anh/xoa", { kiemTra: true });
  const d: any = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.error || `Máy chủ trả về lỗi ${r.status}.`);
}

/**
 * Admin: làm theo `viecAnhKhiXoa` SAU KHI dữ liệu đã xoá xong.
 *
 * Tệp nào xoá được trên Cloudinary thì mới xoá bản ghi — tệp xoá hỏng thì bản
 * ghi còn đó, vẫn hiện ở Thư viện (chứng từ "đã xoá") để admin xoá lại.
 */
export async function lamViecAnhKhiXoa(viec: ViecAnhKhiXoa): Promise<KetQuaXoaTep> {
  // Ảnh không nằm ở kho của app (ảnh mẫu `demo` của dữ liệu thử) thì không có
  // tệp nào để xoá — chỉ xoá bản ghi.
  const coTep = viec.xoa.filter((a) => khoCuaUrl(a.url) === KHO_CLOUDINARY);
  const kq = coTep.length
    ? await xoaTepTrenMayChu(coTep.map((a) => a.url))
    : { tong: 0, daXoa: 0, loi: "" };
  const xoaDuoc = kq.daXoa >= kq.tong ? viec.xoa : viec.xoa.filter((a) => !coTep.includes(a));
  const viecGhi: ((lo: WriteBatch) => void)[] = [
    ...xoaDuoc.map((a) => (lo: WriteBatch) => lo.delete(doc(db, KHO_ANH_CHUNG_TU, a.id))),
    ...viec.go.map(({ anh, conLai }) => (lo: WriteBatch) =>
      lo.update(doc(db, KHO_ANH_CHUNG_TU, anh.id), { chungTu: conLai }),
    ),
  ];
  try {
    for (let i = 0; i < viecGhi.length; i += 400) {
      const lo = writeBatch(db);
      viecGhi.slice(i, i + 400).forEach((f) => f(lo));
      await lo.commit();
    }
  } catch (e) {
    return { ...kq, loi: kq.loi || (e instanceof Error ? e.message : String(e)) };
  }
  return kq;
}

/** Câu báo kèm sau "Đã xoá ...". */
export const chuAnhDaXoa = (kq: { daXoa: number }) =>
  kq.daXoa > 0 ? ` và ${kq.daXoa} ảnh trên Cloudinary` : "";

/** Báo lại khi còn ảnh chưa xoá được — dữ liệu đã xoá rồi. */
export function baoAnhChuaXoa(kq: KetQuaXoaTep): void {
  if (kq.daXoa >= kq.tong && !kq.loi) return;
  alert(
    `Dữ liệu đã xoá, nhưng ${Math.max(0, kq.tong - kq.daXoa)}/${kq.tong} ảnh CHƯA xoá được trên Cloudinary.\n\n` +
      `${kq.loi}\n\nNhững ảnh này vẫn hiện trong Thư viện ảnh (ghi "chứng từ đã xoá"). Admin mở từng tấm và bấm xoá lại.`,
  );
}

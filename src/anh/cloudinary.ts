/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TẢI ẢNH LÊN CLOUDINARY VÀ DỰNG ĐƯỜNG DẪN THU NHỎ — phần chạy trong trình duyệt.
 *
 * Tải bằng "unsigned preset": chỉ cần tên kho và tên preset, không có khoá bí
 * mật. Xoá thì cần khoá, nên chỉ đi qua máy chủ (`api/anh/xoa`).
 *
 * ẢNH CHỈ LÊN CLOUDINARY LÚC BẤM LƯU. Trước đó ảnh nằm trên máy để xem trước
 * (`ChonAnh`), nên không còn loại "ảnh tải lên rồi mà chưa lưu" phải đi dọn.
 */

import { auth } from "../firebase";
import { SUC_KHOE } from "../lib/sucKhoe";
import { KHOA_NGUOI_TAI, maTepTuUrl, NHAN_ANH } from "./moHinh";

const KHO = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "");
const PRESET = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "");

/** Tên kho Cloudinary app đang dùng. */
export const KHO_CLOUDINARY = KHO;

export interface TepDaTai {
  url: string;
  publicId: string;
}

/** Tải một tấm (data URI hoặc Blob) lên, trả về đường dẫn và mã tệp. */
export async function taiAnhLen(du: string | Blob): Promise<TepDaTai> {
  if (!KHO || !PRESET) {
    throw new Error(
      "Chưa cấu hình kho ảnh (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET).",
    );
  }
  try {
    const kq = await guiLen(du);
    SUC_KHOE.baoAnh(true);
    return kq;
  } catch (e) {
    SUC_KHOE.baoAnh(false, e instanceof Error ? e.message.slice(0, 80) : "");
    throw e;
  }
}

async function guiLen(du: string | Blob): Promise<TepDaTai> {
  const gui = (coNhan: boolean) => {
    const f = new FormData();
    f.append("file", du);
    f.append("upload_preset", PRESET);
    if (coNhan) {
      f.append("tags", NHAN_ANH);
      const uid = auth.currentUser?.uid;
      // uid người tải: lưu hỏng ngay sau khi tải thì chính người đó được xoá tệp.
      if (uid) f.append("context", `${KHOA_NGUOI_TAI}=${uid}`);
    }
    return fetch(`https://api.cloudinary.com/v1_1/${KHO}/image/upload`, {
      method: "POST",
      body: f,
    });
  };
  // Preset từ chối nhãn thì gửi lại không nhãn: lượt đầu hỏng chưa tạo tệp nào.
  let r = await gui(true);
  if (!r.ok && r.status >= 400 && r.status < 500) r = await gui(false);
  if (!r.ok) {
    const chiTiet = await r.text().catch(() => "");
    throw new Error(`Cloudinary từ chối tải ảnh (${r.status}): ${chiTiet.slice(0, 200)}`);
  }
  const d = (await r.json()) as { secure_url?: string; public_id?: string };
  const url = String(d.secure_url || "");
  const publicId = String(d.public_id || maTepTuUrl(url));
  if (!url || !publicId) throw new Error("Cloudinary không trả về đường dẫn ảnh.");
  return { url, publicId };
}

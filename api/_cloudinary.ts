/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GỌI CLOUDINARY BẰNG KHOÁ BÍ MẬT — CHỈ CHẠY Ở MÁY CHỦ.
 *
 * Trình duyệt tải ảnh lên bằng "unsigned preset": chỉ cần tên kho và tên
 * preset, không có khoá bí mật. Nhưng XOÁ và LIỆT KÊ thì Cloudinary bắt buộc
 * ký bằng `api_secret`. Khoá ấy mà nằm trong mã trình duyệt thì ai mở F12
 * cũng lấy được — và lấy được là xoá sạch kho ảnh. Nên hai việc này chỉ đi
 * qua đây, sau cửa `requireOwner`.
 *
 * Biến môi trường (đặt trên Vercel, KHÔNG có tiền tố VITE_ để không lọt ra
 * trình duyệt):
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 * Tên kho dùng lại `VITE_CLOUDINARY_CLOUD_NAME` vốn đã có.
 */

import { createHash } from "node:crypto";

export class ThieuCauHinh extends Error {}

function cauHinh() {
  const cloud =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    throw new ThieuCauHinh(
      "Máy chủ chưa có khoá Cloudinary. Vào Vercel → Settings → Environment " +
        "Variables, thêm CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET (lấy ở " +
        "Cloudinary → Settings → API Keys), rồi Redeploy.",
    );
  }
  return { cloud, key, secret };
}

/**
 * Chữ ký Cloudinary: sha1 của các tham số xếp theo tên, nối `&`, rồi nối liền
 * khoá bí mật. Không ký `api_key`, `file`, `resource_type`.
 */
export function kyThamSo(
  thamSo: Record<string, string | number>,
  secret: string,
): string {
  const chuoi = Object.keys(thamSo)
    .sort()
    .map((k) => `${k}=${thamSo[k]}`)
    .join("&");
  return createHash("sha1").update(chuoi + secret).digest("hex");
}

/**
 * Xoá thật một tấm ảnh trên Cloudinary.
 *
 * `invalidate=true` để xoá luôn bản đệm ở mạng phân phối — không có thì đường
 * dẫn cũ còn tải được thêm vài ngày, nhìn như chưa xoá.
 *
 * Trả `ok` khi xoá được, `not found` khi tệp vốn đã không còn. Cả hai đều là
 * kết quả mong muốn: sau lượt này tệp chắc chắn không còn trên máy chủ.
 */
export async function xoaAnhCloudinary(publicId: string): Promise<string> {
  const { cloud, key, secret } = cauHinh();
  const thamSo = {
    invalidate: "true",
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(thamSo).map(([k, v]) => [k, String(v)])),
    api_key: key,
    signature: kyThamSo(thamSo, secret),
  });
  const r = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/destroy`,
    { method: "POST", body },
  );
  const d: any = await r.json().catch(() => null);
  if (!r.ok) {
    throw new Error(
      `Cloudinary từ chối xoá (${r.status}): ${d?.error?.message || "không rõ lý do"}`,
    );
  }
  return String(d?.result || "");
}

export interface TepTrenMayChu {
  publicId: string;
  url: string;
  taoLuc: string;
}

/**
 * Liệt kê ảnh trên Cloudinary tải lên từ `tuNgay` trở đi.
 *
 * Có mốc ngày vì kho Cloudinary có thể dùng chung với việc khác; lấy từ ngày
 * app bắt đầu có ảnh thì không kéo ảnh của chỗ khác vào. Tối đa 20 trang × 500
 * tấm — vượt mức đó là dấu hiệu gọi nhầm kho, dừng lại còn hơn kéo cả vạn tấm.
 */
export async function lietKeAnhCloudinary(
  tuNgay: string,
): Promise<{ tep: TepTrenMayChu[]; conNua: boolean }> {
  const { cloud, key, secret } = cauHinh();
  const xacThuc = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
  const tep: TepTrenMayChu[] = [];
  let con = "";
  for (let trang = 0; trang < 20; trang++) {
    const q = new URLSearchParams({ max_results: "500" });
    if (/^\d{4}-\d{2}-\d{2}$/.test(tuNgay)) q.set("start_at", `${tuNgay}T00:00:00Z`);
    if (con) q.set("next_cursor", con);
    const r = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image/upload?${q}`,
      { headers: { Authorization: xacThuc } },
    );
    const d: any = await r.json().catch(() => null);
    if (!r.ok) {
      throw new Error(
        `Cloudinary từ chối liệt kê (${r.status}): ${d?.error?.message || "không rõ lý do"}`,
      );
    }
    (d?.resources || []).forEach((x: any) =>
      tep.push({
        publicId: String(x.public_id || ""),
        url: String(x.secure_url || ""),
        taoLuc: String(x.created_at || ""),
      }),
    );
    con = String(d?.next_cursor || "");
    if (!con) return { tep, conNua: false };
  }
  return { tep, conNua: true };
}

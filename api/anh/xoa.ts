/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * POST /api/anh/xoa  { url }  — XOÁ THẬT một tấm ảnh trên Cloudinary.
 *
 * Chỉ admin (xem `requireOwner`). Máy chủ tự lấy mã ảnh từ đường dẫn chứ
 * không nhận mã ảnh do trình duyệt gửi: nhận thẳng mã thì một lời gọi giả có
 * thể xoá bất kỳ tệp nào trong kho, kể cả tệp không thuộc app này. Đường dẫn
 * còn phải đúng tên kho của app.
 *
 * Chỉ xoá TỆP. Gỡ đường dẫn khỏi Firestore là phần của trình duyệt, chạy sau
 * khi lượt này trả về thành công — có luật Firestore chặn riêng, cũng chỉ admin.
 */

import { requireOwner } from "../_auth";
import { ThieuCauHinh, xoaAnhCloudinary } from "../_cloudinary";
import { publicIdTuUrl } from "../../src/lib/soAnh";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireOwner(req, res);
  if (!user) return;

  const url = String(req.body?.url || "").trim();
  const cloud =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "";
  if (!cloud || !url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)) {
    return res.status(400).json({ error: "Đường dẫn này không thuộc kho ảnh của app." });
  }
  const publicId = publicIdTuUrl(url);
  if (!publicId) {
    return res.status(400).json({ error: "Không đọc được mã ảnh từ đường dẫn." });
  }

  try {
    const ketQua = await xoaAnhCloudinary(publicId);
    if (ketQua !== "ok" && ketQua !== "not found") {
      return res.status(502).json({ error: `Cloudinary trả về "${ketQua}", chưa chắc đã xoá.` });
    }
    console.log(`Xoa anh ${publicId} (${ketQua}) boi ${user.email}`);
    return res.status(200).json({ ok: true, publicId, ketQua });
  } catch (e: any) {
    const ma = e instanceof ThieuCauHinh ? 500 : 502;
    return res.status(ma).json({ error: e?.message || "Không xoá được ảnh." });
  }
}

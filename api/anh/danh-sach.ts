/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * POST /api/anh/danh-sach  { tuNgay }  — liệt kê ảnh trên Cloudinary.
 *
 * Để TÌM LẠI ảnh mồ côi: tệp còn trên máy chủ ảnh nhưng đường nối trong
 * Firestore đã mất từ những lần xoá trước khi có sổ ảnh. Liệt kê ra rồi trình
 * duyệt ghi những tấm sổ chưa biết vào mục "Chưa gắn đơn" của Thư viện.
 *
 * Chỉ admin: danh sách này là toàn bộ kho ảnh.
 */

import { requireOwner } from "../_auth";
import { lietKeAnhCloudinary, ThieuCauHinh } from "../_cloudinary";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    const tuNgay = String(req.body?.tuNgay || "").trim();
    const kq = await lietKeAnhCloudinary(tuNgay);
    return res.status(200).json(kq);
  } catch (e: any) {
    const ma = e instanceof ThieuCauHinh ? 500 : 502;
    return res.status(ma).json({ error: e?.message || "Không liệt kê được ảnh." });
  }
}

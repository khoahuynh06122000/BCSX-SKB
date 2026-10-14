/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * POST /api/anh/xoa  { urls: string[] }  — XOÁ THẬT ảnh trên Cloudinary.
 *
 * Dữ liệu và ảnh đi một cụm: xoá dữ liệu thì trình duyệt gọi vào đây để xoá
 * luôn những tấm ảnh không còn dòng nào dùng. Admin xoá một tấm trong Thư viện
 * ảnh cũng đi đường này.
 *
 * Chỉ admin (xem `requireOwner`). Máy chủ tự lấy mã ảnh từ đường dẫn chứ
 * không nhận mã ảnh do trình duyệt gửi, và đường dẫn phải đúng tên kho của
 * app. Kho Cloudinary dùng chung với web app khác — nhận thẳng mã ảnh thì một
 * lời gọi sai có thể xoá ảnh của app kia.
 *
 * Chỉ xoá TỆP. Gỡ đường dẫn khỏi Firestore là phần của trình duyệt, có luật
 * Firestore chặn riêng, cũng chỉ admin.
 */

import { requireOwner } from "../_auth";
import {
  cauHinhCloudinary,
  ThieuCauHinh,
  TOI_DA_MOT_LUOT,
  xoaNhieuAnhCloudinary,
} from "../_cloudinary";
import { publicIdTuUrl } from "../../src/lib/soAnh";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireOwner(req, res);
  if (!user) return;

  let cloud: string;
  try {
    cloud = cauHinhCloudinary().cloud;
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Thiếu cấu hình." });
  }

  const vao: unknown[] = Array.isArray(req.body?.urls)
    ? req.body.urls
    : req.body?.url
      ? [req.body.url]
      : [];
  const urls = [...new Set(vao.map((u) => String(u ?? "").trim()).filter(Boolean))];
  if (!urls.length) {
    return res.status(400).json({ error: "Không có đường dẫn ảnh nào." });
  }
  if (urls.length > TOI_DA_MOT_LUOT) {
    return res
      .status(400)
      .json({ error: `Mỗi lượt xoá tối đa ${TOI_DA_MOT_LUOT} tấm.` });
  }

  const tienTo = `https://res.cloudinary.com/${cloud}/image/upload/`;
  const theoMa = new Map<string, string>();
  for (const u of urls) {
    const pid = u.startsWith(tienTo) ? publicIdTuUrl(u) : "";
    if (!pid) {
      return res
        .status(400)
        .json({ error: `Đường dẫn không thuộc kho ảnh của app: ${u.slice(0, 120)}` });
    }
    theoMa.set(pid, u);
  }

  try {
    const kq = await xoaNhieuAnhCloudinary([...theoMa.keys()]);
    const ketQua = [...theoMa.entries()].map(([pid, url]) => ({
      url,
      publicId: pid,
      ketQua: kq[pid] || "khong-ro",
    }));
    console.log(
      `Xoa ${ketQua.length} anh boi ${user.email}: ` +
        ketQua.map((k) => `${k.publicId}=${k.ketQua}`).join(", "),
    );
    return res.status(200).json({ ok: true, ketQua });
  } catch (e: any) {
    const ma = e instanceof ThieuCauHinh ? 500 : 502;
    return res.status(ma).json({ error: e?.message || "Không xoá được ảnh." });
  }
}

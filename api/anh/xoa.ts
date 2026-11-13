/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * POST /api/anh/xoa — XOÁ TỆP ẢNH TRÊN CLOUDINARY (dựng lại 13/11/2026).
 *
 *   { kiemTra: true }        admin — chỉ thử khoá, không xoá gì.
 *   { urls }                 admin — xoá tệp. Trình duyệt gọi SAU KHI đã xoá
 *                            chứng từ, với đúng những tấm không còn chứng từ nào.
 *   { urls, vuaTai: true }   mọi người đã đăng nhập — tệp VỪA TẢI mà lô ghi
 *                            chứng từ hỏng. Từng tấm phải đủ ba điều: do chính
 *                            người gọi tải, tải trong 24 giờ, và CHƯA có bản
 *                            ghi `anh_chung_tu` nào (hỏi Firestore bằng quyền
 *                            của người gọi; hỏi không ra thì giữ tệp).
 *
 * Máy chủ tự lấy mã tệp từ đường dẫn và chỉ nhận đường dẫn thuộc kho của app —
 * kho Cloudinary dùng chung với web app khác, nhận thẳng mã tệp thì một lời
 * gọi sai có thể xoá ảnh của app kia.
 */

import { gocFirestore, requireOwner, xacMinhDangNhap } from "../_auth.js";
import {
  cauHinhCloudinary,
  kiemTraKhoaCloudinary,
  thongTinAnh,
  ThieuCauHinh,
  TOI_DA_MOT_LUOT,
  xoaNhieuAnhCloudinary,
} from "../_cloudinary.js";
import { idTuMaTep, KHO_ANH_CHUNG_TU, KHOA_NGUOI_TAI, maTepTuUrl } from "../../src/anh/moHinh.js";
import { lyDoGiuTepVuaTai } from "../../src/anh/mayChu.js";

const TOI_DA_VUA_TAI = 20;

/** Tấm này đã có bản ghi chứng từ chưa. Hỏi hỏng → coi như ĐÃ CÓ (không xoá khi chưa chắc). */
async function daCoBanGhi(publicId: string, token: string): Promise<boolean> {
  const r = await fetch(
    `${gocFirestore()}/${KHO_ANH_CHUNG_TU}/${encodeURIComponent(idTuMaTep(publicId))}`,
    { headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => null);
  return !r || r.status !== 404;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const vuaTai = req.body?.vuaTai === true;
  let nguoiGoi: { uid: string; email: string };
  let token = "";
  if (vuaTai) {
    const xm = await xacMinhDangNhap(req, res);
    if (!xm) return;
    nguoiGoi = xm.user;
    token = xm.token;
  } else {
    const u = await requireOwner(req, res);
    if (!u) return;
    nguoiGoi = u;
    if (req.body?.kiemTra === true) {
      try {
        return res.status(200).json({ ok: true, kho: await kiemTraKhoaCloudinary() });
      } catch (e: any) {
        return res.status(e instanceof ThieuCauHinh ? 500 : 502).json({ error: e?.message || "Không kiểm được khoá." });
      }
    }
  }

  let kho: string;
  try {
    kho = cauHinhCloudinary().cloud;
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Thiếu cấu hình." });
  }

  const vao: unknown[] = Array.isArray(req.body?.urls) ? req.body.urls : [];
  const urls = [...new Set(vao.map((u) => String(u ?? "").trim()).filter(Boolean))];
  if (!urls.length) return res.status(400).json({ error: "Không có đường dẫn ảnh nào." });
  const toiDa = vuaTai ? TOI_DA_VUA_TAI : TOI_DA_MOT_LUOT;
  if (urls.length > toiDa) return res.status(400).json({ error: `Mỗi lượt xoá tối đa ${toiDa} tấm.` });

  const tienTo = `https://res.cloudinary.com/${kho}/image/upload/`;
  const theoMa = new Map<string, string>();
  for (const u of urls) {
    const pid = u.startsWith(tienTo) ? maTepTuUrl(u) : "";
    if (!pid) return res.status(400).json({ error: `Đường dẫn không thuộc kho ảnh của app: ${u.slice(0, 120)}` });
    theoMa.set(pid, u);
  }

  try {
    const giu: Record<string, string> = {};
    if (vuaTai) {
      for (const pid of [...theoMa.keys()]) {
        const tt = await thongTinAnh(pid);
        if (!tt) continue; // không còn trên Cloudinary
        const lyDo = lyDoGiuTepVuaTai({
          nguoiGoi: nguoiGoi.uid,
          nguoiTai: String(tt.ngucanh[KHOA_NGUOI_TAI] || ""),
          taoLuc: tt.taoLuc,
          bayGio: Date.now(),
          daCoBanGhi: await daCoBanGhi(pid, token),
        });
        if (lyDo) {
          giu[pid] = lyDo;
          theoMa.delete(pid);
        }
      }
    }
    const kq = theoMa.size ? await xoaNhieuAnhCloudinary([...theoMa.keys()]) : {};
    const ketQua = [
      ...[...theoMa.entries()].map(([pid, url]) => ({ url, publicId: pid, ketQua: kq[pid] || "khong-ro" })),
      ...Object.entries(giu).map(([pid, lyDo]) => ({ url: "", publicId: pid, ketQua: "giu-lai", lyDo })),
    ];
    console.log(
      `Xoa ${theoMa.size} anh${vuaTai ? " vua tai" : ""} boi ${nguoiGoi.email}: ` +
        ketQua.map((k) => `${k.publicId}=${k.ketQua}`).join(", "),
    );
    return res.status(200).json({ ok: true, ketQua });
  } catch (e: any) {
    return res.status(e instanceof ThieuCauHinh ? 500 : 502).json({ error: e?.message || "Không xoá được ảnh." });
  }
}

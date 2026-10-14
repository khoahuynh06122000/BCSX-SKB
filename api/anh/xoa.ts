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
 * `{ urls, treo: true }` — ẢNH CHỜ: tải lên rồi nhưng chưa gắn vào dữ liệu
 * (đóng khung không lưu, gỡ một tấm). MỌI người đã đăng nhập gọi được, nhưng
 * từng tấm phải qua đủ ba điều — do chính người gọi tải, tải trong 24 giờ, và
 * KHÔNG có dòng dữ liệu / sổ ảnh nào trỏ tới (hỏi Firestore bằng quyền của
 * chính người gọi). Thiếu một điều là để nguyên tấm đó. Xem src/lib/anhCho.ts.
 *
 * Chỉ xoá TỆP. Gỡ đường dẫn khỏi Firestore là phần của trình duyệt, có luật
 * Firestore chặn riêng, cũng chỉ admin.
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
import { idSoAnh, KHO_SO_ANH, publicIdTuUrl } from "../../src/lib/soAnh.js";
import { KHOA_NGUOI_TAI, lyDoKhongXoaAnhCho } from "../../src/lib/anhCho.js";

/** Giới hạn ảnh chờ mỗi lượt: mỗi tấm tốn 3-4 lượt hỏi, hàm có hạn thời gian. */
const TOI_DA_ANH_CHO = 20;

/**
 * Có dòng dữ liệu nào đang trỏ tới tấm ảnh này không — hỏi bằng token của
 * người gọi. Hỏi hỏng (mạng, quyền) thì coi như ĐANG DÙNG: không xoá khi chưa
 * chắc.
 */
async function anhDangDung(
  url: string,
  publicId: string,
  token: string,
): Promise<boolean> {
  const goc = gocFirestore();
  const tieuDe = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const so = await fetch(
    `${goc}/${KHO_SO_ANH}/${encodeURIComponent(idSoAnh(publicId))}`,
    { headers: tieuDe },
  );
  if (so.status === 200) return true;
  if (so.status !== 404) return true;

  for (const [kho, truong] of [
    ["transactions", "evidencePhotoUrls"],
    ["slips", "signedPhotoUrls"],
  ]) {
    const r = await fetch(`${goc}:runQuery`, {
      method: "POST",
      headers: tieuDe,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: kho }],
          where: {
            fieldFilter: {
              field: { fieldPath: truong },
              op: "ARRAY_CONTAINS",
              value: { stringValue: url },
            },
          },
          limit: 1,
        },
      }),
    });
    if (!r.ok) return true;
    const d: any = await r.json().catch(() => null);
    if (!Array.isArray(d) || d.some((x) => x?.document)) return true;
  }
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const laAnhCho = req.body?.treo === true;
  let nguoiGoi: { uid: string; email: string };
  let token = "";
  if (laAnhCho) {
    const xm = await xacMinhDangNhap(req, res);
    if (!xm) return;
    nguoiGoi = xm.user;
    token = xm.token;
  } else {
    const user = await requireOwner(req, res);
    if (!user) return;
    nguoiGoi = user;
  }

  // `{ kiemTra: true }` — chỉ thử khoá, KHÔNG xoá gì. Đi chung cửa admin.
  if (!laAnhCho && req.body?.kiemTra === true) {
    try {
      const kho = await kiemTraKhoaCloudinary();
      return res.status(200).json({ ok: true, kho });
    } catch (e: any) {
      const ma = e instanceof ThieuCauHinh ? 500 : 502;
      return res.status(ma).json({ error: e?.message || "Không kiểm được khoá." });
    }
  }

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
  const toiDa = laAnhCho ? TOI_DA_ANH_CHO : TOI_DA_MOT_LUOT;
  if (urls.length > toiDa) {
    return res.status(400).json({ error: `Mỗi lượt xoá tối đa ${toiDa} tấm.` });
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
    /* Ảnh chờ: lọc từng tấm qua đủ ba điều; tấm không qua thì giữ nguyên. */
    const tuChoi: Record<string, string> = {};
    if (laAnhCho) {
      for (const [pid, url] of [...theoMa.entries()]) {
        const tt = await thongTinAnh(pid);
        if (!tt) continue; // không còn trên Cloudinary: xoá cũng như không
        const lyDo = lyDoKhongXoaAnhCho({
          nguoiGoi: nguoiGoi.uid,
          nguoiTai: String(tt.ngucanh[KHOA_NGUOI_TAI] || ""),
          taoLuc: tt.taoLuc,
          bayGio: Date.now(),
          dangDung: await anhDangDung(url, pid, token),
        });
        if (lyDo) {
          tuChoi[pid] = lyDo;
          theoMa.delete(pid);
        }
      }
    }

    const kq = theoMa.size ? await xoaNhieuAnhCloudinary([...theoMa.keys()]) : {};
    const ketQua = [
      ...[...theoMa.entries()].map(([pid, url]) => ({
        url,
        publicId: pid,
        ketQua: kq[pid] || "khong-ro",
      })),
      ...Object.entries(tuChoi).map(([pid, lyDo]) => ({
        url: "",
        publicId: pid,
        ketQua: "giu-lai",
        lyDo,
      })),
    ];
    console.log(
      `Xoa ${theoMa.size} anh${laAnhCho ? " cho" : ""} boi ${nguoiGoi.email}: ` +
        ketQua.map((k) => `${k.publicId}=${k.ketQua}`).join(", "),
    );
    return res.status(200).json({ ok: true, ketQua });
  } catch (e: any) {
    const ma = e instanceof ThieuCauHinh ? 500 : 502;
    return res.status(ma).json({ error: e?.message || "Không xoá được ảnh." });
  }
}

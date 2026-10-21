/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GỌI CLOUDINARY BẰNG KHOÁ BÍ MẬT — CHỈ CHẠY Ở MÁY CHỦ.
 *
 * Trình duyệt tải ảnh lên bằng "unsigned preset": chỉ cần tên kho và tên
 * preset, không có khoá bí mật. Nhưng XOÁ thì Cloudinary bắt buộc khoá
 * `api_secret`. Khoá ấy mà nằm trong mã trình duyệt thì ai mở F12 cũng lấy
 * được — và lấy được là xoá sạch kho ảnh, kể cả ảnh của web app khác dùng
 * chung kho. Nên việc xoá chỉ đi qua đây, sau cửa `requireOwner`.
 *
 * Biến môi trường (đặt trên Vercel, KHÔNG có tiền tố VITE_ để không lọt ra
 * trình duyệt):
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 * Tên kho dùng lại `VITE_CLOUDINARY_CLOUD_NAME` vốn đã có.
 */

export class ThieuCauHinh extends Error {}

/**
 * Kho ảnh của app. Tên kho không phải bí mật — nó nằm ngay trong mọi đường
 * dẫn ảnh (`res.cloudinary.com/zjtjeyqd/...`). Để sẵn làm mặc định vì biến
 * `VITE_CLOUDINARY_CLOUD_NAME` chỉ chắc chắn có lúc BUILD giao diện; hàm máy
 * chủ chạy lúc khác và có thể không thấy nó — đúng chuyện 21/10/2026: khoá đã
 * đặt mà app vẫn báo "chưa có khoá".
 */
const KHO_MAC_DINH = "zjtjeyqd";

/**
 * Máy chủ đang chạy là bản nào, của dự án Vercel nào — để biết biến đặt ĐÚNG
 * DỰ ÁN chưa. Chỉ nói tên miền bản build, môi trường và biến nào CÓ / KHÔNG,
 * không bao giờ in giá trị khoá.
 */
function dauMayChu(): string {
  const co = (k: string) => (String(process.env[k] || "").trim() ? "có" : "KHÔNG");
  return (
    `[Máy chủ: ${process.env.VERCEL_URL || "không rõ"} · môi trường ` +
    `${process.env.VERCEL_ENV || "không rõ"} · VITE_FIREBASE_API_KEY ${co("VITE_FIREBASE_API_KEY")} · ` +
    `CLOUDINARY_API_KEY ${co("CLOUDINARY_API_KEY")} · CLOUDINARY_API_SECRET ${co("CLOUDINARY_API_SECRET")}]`
  );
}

export function cauHinhCloudinary() {
  const cloud =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.VITE_CLOUDINARY_CLOUD_NAME ||
    KHO_MAC_DINH;
  const key = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const secret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  const thieu = [
    !key && "CLOUDINARY_API_KEY",
    !secret && "CLOUDINARY_API_SECRET",
  ].filter(Boolean);
  if (thieu.length) {
    throw new ThieuCauHinh(
      `Máy chủ không đọc được ${thieu.join(" và ")}. Vào Vercel → Settings → ` +
        "Environment Variables: biến phải tích môi trường Production, rồi vào " +
        "Deployments bấm Redeploy bản mới nhất (biến thêm sau lần build chỉ có " +
        "hiệu lực từ lần build sau). " +
        dauMayChu(),
    );
  }
  return { cloud, key, secret };
}

/**
 * KIỂM TRA KHOÁ MÀ KHÔNG XOÁ GÌ.
 *
 * Gọi lệnh `ping` của Admin API bằng đúng khoá sẽ dùng để xoá. Khoá sai thì
 * Cloudinary trả 401 ở đây, ngay lúc kiểm — chứ không phải lúc admin xoá một
 * đơn thật rồi mới biết ảnh không xoá được.
 */
export async function kiemTraKhoaCloudinary(): Promise<string> {
  const { cloud, key, secret } = cauHinhCloudinary();
  const r = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/ping`,
    {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
      },
    },
  );
  const d: any = await r.json().catch(() => null);
  if (r.status === 401 || r.status === 403) {
    throw new Error(
      `Cloudinary từ chối khoá (${r.status}). Kiểm tra lại CLOUDINARY_API_KEY và ` +
        `CLOUDINARY_API_SECRET trên Vercel có đúng của kho "${cloud}" không, rồi Redeploy.`,
    );
  }
  if (!r.ok) {
    throw new Error(
      `Cloudinary trả lỗi ${r.status}: ${d?.error?.message || "không rõ lý do"}`,
    );
  }
  return cloud;
}

/**
 * Thông tin một tấm ảnh: lúc tải và ngữ cảnh gắn lúc tải (uid người tải).
 * Không có ảnh thì trả null.
 */
export async function thongTinAnh(
  publicId: string,
): Promise<{ taoLuc: string; ngucanh: Record<string, string> } | null> {
  const { cloud, key, secret } = cauHinhCloudinary();
  const duong = publicId.split("/").map(encodeURIComponent).join("/");
  const r = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image/upload/${duong}`,
    {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
      },
    },
  );
  if (r.status === 404) return null;
  const d: any = await r.json().catch(() => null);
  if (!r.ok) {
    throw new Error(
      `Cloudinary trả lỗi ${r.status}: ${d?.error?.message || "không rõ lý do"}`,
    );
  }
  return {
    taoLuc: String(d?.created_at || ""),
    ngucanh: (d?.context?.custom as Record<string, string>) || {},
  };
}

/** Tối đa mỗi lượt gọi — giới hạn của Cloudinary cho lệnh xoá theo danh sách. */
export const TOI_DA_MOT_LUOT = 100;

/**
 * Xoá thật nhiều tấm ảnh trên Cloudinary trong một lượt.
 *
 * Dùng lệnh xoá theo danh sách mã ảnh của Admin API: xoá cả chuyến hay xoá
 * toàn bộ dữ liệu thì một lượt gọi là xong, không phải gọi từng tấm — hàm máy
 * chủ có giới hạn thời gian chạy.
 *
 * `invalidate=true` để xoá luôn bản đệm ở mạng phân phối — không có thì đường
 * dẫn cũ còn tải được thêm vài ngày, nhìn như chưa xoá.
 *
 * Trả về kết quả từng mã: `deleted` hoặc `not_found`. Cả hai đều là điều mong
 * muốn — sau lượt này tệp chắc chắn không còn trên máy chủ.
 */
export async function xoaNhieuAnhCloudinary(
  publicIds: string[],
): Promise<Record<string, string>> {
  const { cloud, key, secret } = cauHinhCloudinary();
  if (!publicIds.length) return {};
  if (publicIds.length > TOI_DA_MOT_LUOT) {
    throw new Error(`Mỗi lượt xoá tối đa ${TOI_DA_MOT_LUOT} tấm.`);
  }
  const q = new URLSearchParams({ invalidate: "true" });
  publicIds.forEach((p) => q.append("public_ids[]", p));
  const r = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image/upload?${q}`,
    {
      method: "DELETE",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
      },
    },
  );
  const d: any = await r.json().catch(() => null);
  if (!r.ok) {
    throw new Error(
      `Cloudinary từ chối xoá (${r.status}): ${d?.error?.message || "không rõ lý do"}`,
    );
  }
  const ra: Record<string, string> = {};
  Object.entries(d?.deleted || {}).forEach(([k, v]) => {
    ra[k] = String(v);
  });
  return ra;
}

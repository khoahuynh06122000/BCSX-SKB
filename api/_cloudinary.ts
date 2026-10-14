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

export function cauHinhCloudinary() {
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

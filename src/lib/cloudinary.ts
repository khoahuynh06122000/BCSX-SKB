/**
 * Upload ảnh lên Cloudinary bằng "unsigned upload preset".
 *
 * Trước đây app nén ảnh thành base64 rồi nhét thẳng vào document Firestore
 * (rủi ro phình document, vượt giới hạn kích thước). Nay ta upload ảnh đã nén
 * lên Cloudinary và chỉ lưu lại URL (https://res.cloudinary.com/...).
 *
 * Cloudinary chấp nhận trực tiếp chuỗi data URI base64 làm tham số "file",
 * nên hàm này nhận đúng chuỗi base64 mà compressImage() đang tạo ra — giữ
 * nguyên chữ ký (base64 vào, URL ra) để các điểm gọi thay đổi tối thiểu.
 */

import { NHAN_ANH_APP } from './soAnh';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  // Chi canh bao: app van chay binh thuong, chi rieng tinh nang tai anh
  // minh chung se khong dung duoc cho toi khi dien du 2 bien nay.
  console.warn(
    'Chua cau hinh Cloudinary (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET). ' +
      'Tinh nang tai anh minh chung se tam thoi khong dung duoc. Cac chuc nang khac van hoat dong binh thuong.',
  );
}

/**
 * @param fileOrDataUri Chuỗi data URI base64 (từ FileReader/compressImage) hoặc một Blob/File.
 * @returns secure_url của ảnh trên Cloudinary.
 */
export async function uploadToCloudinary(
  fileOrDataUri: string | Blob,
): Promise<string> {
  const guiLen = (coNhan: boolean) => {
    const formData = new FormData();
    formData.append('file', fileOrDataUri);
    formData.append('upload_preset', UPLOAD_PRESET);
    // Dán nhãn của app: kho Cloudinary dùng chung với web app khác, có nhãn
    // thì mở trang Cloudinary ra lọc được ảnh của app này. Xem `NHAN_ANH_APP`.
    if (coNhan) formData.append('tags', NHAN_ANH_APP);
    return fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData },
    );
  };

  /*
   * Gửi kèm nhãn trước; preset từ chối nhãn thì gửi lại không nhãn.
   *
   * Lượt đầu hỏng thì chưa có tệp nào được tạo, nên gửi lại không đẻ bản
   * trùng. Thà ảnh không có nhãn còn hơn biên bản không lên được — không có
   * ảnh thì đơn đi đường không xác nhận được.
   */
  let res = await guiLen(true);
  if (!res.ok && res.status >= 400 && res.status < 500) {
    res = await guiLen(false);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload thất bại (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url || data.url;
  if (!url) throw new Error('Cloudinary không trả về URL ảnh.');
  return url;
}

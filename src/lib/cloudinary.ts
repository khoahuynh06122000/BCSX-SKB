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

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.error(
    'Thiếu VITE_CLOUDINARY_CLOUD_NAME hoặc VITE_CLOUDINARY_UPLOAD_PRESET. Hãy điền vào file .env.local.',
  );
}

/**
 * @param fileOrDataUri Chuỗi data URI base64 (từ FileReader/compressImage) hoặc một Blob/File.
 * @returns secure_url của ảnh trên Cloudinary.
 */
export async function uploadToCloudinary(
  fileOrDataUri: string | Blob,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', fileOrDataUri);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload thất bại (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url || data.url;
  if (!url) throw new Error('Cloudinary không trả về URL ảnh.');
  return url;
}

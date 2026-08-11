/**
 * Nén ảnh trước khi gửi đi.
 *
 * Dùng cho việc gửi ảnh phiếu đã ký lên máy chủ để AI đối soát: ảnh chụp từ
 * điện thoại thường 4–8 MB, trong khi hàm serverless của Vercel chỉ nhận
 * khoảng 4,5 MB cho cả yêu cầu. Nén xuống ~1600px là đủ nét để đọc chữ số
 * viết tay mà dung lượng chỉ còn vài trăm KB.
 */

/** Đọc File thành chuỗi data URI base64. */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Thu nhỏ và nén lại ảnh.
 *
 * Mặc định để 1600px/chất lượng 0.8 — cao hơn mức dùng cho ảnh minh chứng
 * thông thường, vì ở đây AI cần đọc được chữ số viết tay.
 */
export function compressDataUrl(
  dataUrl: string,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    // Ảnh lỗi thì trả nguyên bản, không chặn luồng làm việc
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function compressFile(
  file: File | Blob,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8,
): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  return compressDataUrl(dataUrl, maxWidth, maxHeight, quality);
}

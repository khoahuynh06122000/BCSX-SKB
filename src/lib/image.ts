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

export interface TimestampWatermarkOptions {
  /** Bật đóng dấu ngày giờ thực tế lên góc dưới phải ảnh. */
  enabled?: boolean;
  /** Nhãn khu vực / nghiệp vụ (vd: "KIỂM KÊ XƯỞNG", "KIỂM KÊ KHO TỔNG"). */
  label?: string;
  /** Thời điểm chụp/tải ảnh (mặc định là thời điểm hiện tại). */
  timestamp?: Date;
}

function formatDateTimeStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function drawTimestampWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: TimestampWatermarkOptions,
) {
  const dtStr = formatDateTimeStamp(opts.timestamp ?? new Date());
  const label = (opts.label || 'KIỂM KÊ HIỆN TRƯỜNG · SKB').trim();

  const fontSize = Math.max(15, Math.min(34, Math.round(width * 0.024)));
  const subFontSize = Math.max(11, Math.round(fontSize * 0.68));
  const padX = Math.round(fontSize * 0.85);
  const padY = Math.round(fontSize * 0.6);
  const margin = Math.max(14, Math.round(width * 0.02));
  const gap = Math.round(fontSize * 0.25);

  ctx.save();
  ctx.font = `800 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  const wMain = ctx.measureText(dtStr).width;
  ctx.font = `700 ${subFontSize}px system-ui, -apple-system, sans-serif`;
  const wSub = ctx.measureText(label).width;

  const boxW = Math.ceil(Math.max(wMain, wSub) + padX * 2);
  const boxH = Math.ceil(subFontSize + gap + fontSize + padY * 2);
  const x = Math.max(margin, width - boxW - margin);
  const y = Math.max(margin, height - boxH - margin);
  const radius = Math.max(8, Math.round(fontSize * 0.45));

  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.92)';
  ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.1));
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, radius);
  ctx.fill();
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.font = `700 ${subFontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(label, x + padX, y + padY);

  ctx.font = `800 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(dtStr, x + padX, y + padY + subFontSize + gap);
  ctx.restore();
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
  watermark?: TimestampWatermarkOptions,
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
      if (watermark?.enabled) {
        drawTimestampWatermark(ctx, width, height, watermark);
      }
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
  watermark?: TimestampWatermarkOptions,
): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  return compressDataUrl(dataUrl, maxWidth, maxHeight, quality, watermark);
}

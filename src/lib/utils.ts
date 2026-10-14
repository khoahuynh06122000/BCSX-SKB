import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Giờ GIẢ mà hai đường nạp tệp gán cho mọi dòng: nhập `07:00Z`, xuất `08:00Z`
 * (14:00 và 15:00 giờ Việt Nam). Tệp của bộ phận chỉ có ngày, không có giờ.
 */
const GIO_GIA_KHI_NAP = /T0[78]:00:00\.000Z$/;

/**
 * Ngày giờ để HIỂN THỊ: `14:35 14/10/2026`.
 *
 * KHÔNG BỊA GIỜ. Bản cũ đưa thẳng mọi chuỗi vào `Date` rồi in kèm giờ, nên:
 *   · dòng nạp từ tệp hiện "15:00" — giờ giả gán lúc nạp, không ai giao lúc đó;
 *   · ngày không giờ (`2026-10-14`) hiện "07:00";
 *   · ô trống hiện nguyên chữ "Invalid Date" lên màn hình.
 * Nay hai loại đầu chỉ hiện NGÀY (cắt chuỗi, không qua múi giờ); ô trống hay
 * chuỗi hỏng hiện "—". Giờ thật (nhập tay, quét phiếu) vẫn hiện như cũ.
 */
export function formatDate(dateString: string) {
  const s = String(dateString ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m && (s.length === 10 || GIO_GIA_KHI_NAP.test(s))) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = new Date(s);
  if (!s || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatNumber(num: number | string | null | undefined) {
  if (num === null || num === undefined) return "0";
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed)) return "0";
  // Round to at most 4 decimal places to discard double precision floating point noise, e.g. 5728.800000000001 -> 5728.8
  const rounded = Math.round(parsed * 10000) / 10000;
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 4,
  }).format(rounded);
}

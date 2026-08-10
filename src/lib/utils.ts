import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
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

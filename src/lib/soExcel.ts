/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐỌC SỐ TRONG Ô EXCEL KIỂU VIỆT NAM.
 *
 * Dấu phẩy thập phân (`432,6`), dấu chấm ngăn nghìn (`1.234.567`), số âm
 * trong ngoặc đơn (`(1.500)`). Ô rỗng và ô chữ trả 0 chứ không phải NaN.
 *
 * Chuyển ra khỏi App.tsx (14/10/2026) để phép kiểm gọi được đúng mã thật —
 * thân hàm giữ nguyên.
 */
export const parseExcelNumberSafe = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  const trimmed = String(val).trim().replace(/\s/g, "");
  if (!trimmed) return 0;

  let isNegative = false;
  let clean = trimmed;
  if (clean.startsWith("(") && clean.endsWith(")")) {
    isNegative = true;
    clean = clean.slice(1, -1);
  } else if (clean.startsWith("-")) {
    isNegative = true;
    clean = clean.slice(1);
  }

  if (clean.includes(".") && clean.includes(",")) {
    if (clean.indexOf(".") < clean.indexOf(",")) {
      clean = clean.replace(/\./g, "").replace(/,/g, ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    const parts = clean.split(",");
    if (parts.length > 2) {
      clean = clean.replace(/,/g, "");
    } else {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3 && parts[0] !== "0") {
        clean = clean.replace(/,/g, "");
      } else {
        clean = clean.replace(/,/g, ".");
      }
    }
  } else if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length > 2) {
      clean = clean.replace(/\./g, "");
    } else {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3 && parts[0] !== "0") {
        clean = clean.replace(/\./g, "");
      }
    }
  }

  const parsed = parseFloat(clean);
  const finalVal = isNaN(parsed) ? 0 : parsed;
  return isNegative ? -finalVal : finalVal;
};

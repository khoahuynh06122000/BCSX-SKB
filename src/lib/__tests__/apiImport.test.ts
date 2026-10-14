/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HÀM MÁY CHỦ TRÊN VERCEL PHẢI GHI ĐUÔI `.js` KHI IMPORT TƯƠNG ĐỐI.
 *
 * Dự án đặt `"type": "module"`. Vercel dịch TỪNG TỆP trong `api/` sang `.js`
 * rồi để Node nạp, không gộp lại — mà Node chạy ESM thì KHÔNG tự đoán đuôi
 * tệp. `import ... from "../_auth"` vì thế sập ngay lúc khởi động với
 * `ERR_MODULE_NOT_FOUND`, Vercel trả `FUNCTION_INVOCATION_FAILED`.
 *
 * Ở máy anh Khoa không lộ ra gì: `tsx` tự đoán đuôi, nên chạy tại máy vẫn
 * ngon. Ngày 14/10/2026 phát hiện cả hàm quét phiếu AI lẫn hàm xoá ảnh đều
 * sập trên Vercel vì đúng chuyện này — hàm AI đã hỏng từ trước mà không ai
 * biết.
 *
 * Phép kiểm này đọc mã nguồn, không cần mạng: thấy một import tương đối
 * thiếu đuôi là báo đỏ trước khi đẩy lên.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
let fail = 0;

function moiTep(thuMuc: string): string[] {
  return readdirSync(thuMuc).flatMap((ten) => {
    const p = join(thuMuc, ten);
    if (statSync(p).isDirectory()) return moiTep(p);
    return p.endsWith(".ts") ? [p] : [];
  });
}

/** Import / export tương đối (`./` hoặc `../`) mà không kết thúc bằng `.js`. */
const THIEU_DUOI =
  /(?:import|export)[^'"]*from\s*['"](\.{1,2}\/[^'"]+?)['"]/g;

for (const tep of moiTep("api")) {
  const ma = readFileSync(tep, "utf8");
  for (const m of ma.matchAll(THIEU_DUOI)) {
    const duongDan = m[1];
    if (duongDan.endsWith(".js")) {
      pass++;
    } else {
      fail++;
      console.log(
        `SAI  ${tep}: import "${duongDan}" thieu duoi .js — tren Vercel ham nay se sap luc khoi dong`,
      );
    }
  }
}

// Phai thuc su doc duoc it nhat vai import, khong thi phep kiem nay dang
// chay rong ma van bao xanh.
if (pass === 0) {
  fail++;
  console.log("SAI  khong tim thay import tuong doi nao trong api/ — phep kiem dang chay rong");
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HIỂN THỊ NGÀY GIỜ — KHÔNG BỊA GIỜ.
 *
 * Hai đường nạp tệp gán giờ giả 07:00Z / 08:00Z cho mọi dòng; bản cũ của
 * `formatDate` in giờ đó ra thành "14:00" / "15:00" trên Báo cáo, Đơn đi
 * đường và Thư viện ảnh — giờ không ai giao hàng lúc đó.
 */

import { formatDate } from "../utils";
import { ngayCham } from "../oNgay";

let pass = 0;
let fail = 0;
const eq = (ten: string, a: unknown, b: unknown) => {
  const s = (x: unknown) => JSON.stringify(x);
  if (s(a) === s(b)) pass++;
  else {
    fail++;
    console.log(`SAI  ${ten}\n     thuc te: ${s(a)}\n     mong doi: ${s(b)}`);
  }
};

eq("dong nap xuat (gio gia 08:00Z) chi hien ngay", formatDate("2026-09-25T08:00:00.000Z"), "25/09/2026");
eq("dong nap nhap (gio gia 07:00Z) chi hien ngay", formatDate("2026-09-25T07:00:00.000Z"), "25/09/2026");
eq("ngay khong gio khong bi gan 07:00", formatDate("2026-10-14"), "14/10/2026");
eq("o trong khong hien Invalid Date", formatDate(""), "—");
eq("chuoi hong khong hien Invalid Date", formatDate("rac"), "—");
eq("null khong vo", formatDate(null as unknown as string), "—");

// Gio THAT (nhap tay co mili giay, quet phieu) van phai hien gio.
{
  const s = formatDate("2026-10-14T07:35:12.348Z");
  eq("gio that van hien gio va phut", /\d{2}:\d{2}/.test(s), true);
  eq("gio that van dung ngay", s.includes("14/10/2026"), true);
}

// Mot ham ngay co cham duy nhat cua app.
eq("ngayCham", ngayCham("2026-08-27T15:00:00.000Z"), "27.08.2026");
eq("ngayCham rong", ngayCham(""), "");
eq("ngayCham khong dung dang", ngayCham("27/08/2026"), "");

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ẢNH CHỜ: người thường chỉ xoá được ảnh CỦA MÌNH, VỪA TẢI, CHƯA GẮN.
 * Sai một điều là máy chủ phải giữ nguyên tấm ảnh.
 */

import { HAN_ANH_CHO_MS, lyDoKhongXoaAnhCho } from "../anhCho";

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

const bayGio = Date.parse("2026-10-14T10:00:00Z");
const ok = {
  nguoiGoi: "uid-a",
  nguoiTai: "uid-a",
  taoLuc: "2026-10-14T09:55:00Z",
  bayGio,
  dangDung: false,
};

eq("du ba dieu thi duoc xoa", lyDoKhongXoaAnhCho(ok), "");
eq("anh nguoi khac tai", lyDoKhongXoaAnhCho({ ...ok, nguoiTai: "uid-b" }) !== "", true);
eq("anh khong mang dau nguoi tai", lyDoKhongXoaAnhCho({ ...ok, nguoiTai: "" }) !== "", true);
eq("khong ro nguoi goi", lyDoKhongXoaAnhCho({ ...ok, nguoiGoi: "" }) !== "", true);
eq("anh da gan vao du lieu", lyDoKhongXoaAnhCho({ ...ok, dangDung: true }) !== "", true);
eq(
  "anh qua 24 gio",
  lyDoKhongXoaAnhCho({ ...ok, taoLuc: new Date(bayGio - HAN_ANH_CHO_MS - 1000).toISOString() }) !== "",
  true,
);
eq(
  "vua dung 24 gio van duoc",
  lyDoKhongXoaAnhCho({ ...ok, taoLuc: new Date(bayGio - HAN_ANH_CHO_MS).toISOString() }),
  "",
);
eq("ngay tai hong", lyDoKhongXoaAnhCho({ ...ok, taoLuc: "rac" }) !== "", true);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

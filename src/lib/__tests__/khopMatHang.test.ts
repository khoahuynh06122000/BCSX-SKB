/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KHỚP MẶT HÀNG — mang sang từ phép kiểm của bộ đối soát doanh thu cũ.
 *
 * Phép kiểm đắt nhất: KHÔNG khớp mờ — tên bia hơi không được ăn vào tên bia
 * lon có cùng phần đầu.
 */

import type { Product } from "../../types";
import { chuanTen } from "../ghiChu";
import { normalizeDiemBan } from "../diemBan";
import { khopMatHang, normalizeKey } from "../khopMatHang";

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

const P = (o: Partial<Product>): Product =>
  ({
    id: "x",
    name: "",
    materialCode: "",
    category: "Lít",
    unit: "Lít",
    price: 0,
    conversionFactor: 1,
    capacityPerUnit: 1000,
    ...o,
  }) as Product;

const products: Product[] = [
  P({ id: "hoi", name: "Bia Golden Bridge Helles Lager", materialCode: "10168107" }),
  P({ id: "lon", name: "Bia Wings Dark Lager 330ml", materialCode: "10168111", category: "Lon", unit: "Lon", capacityPerUnit: 330 }),
  P({ id: "dac", name: "Bia Đặc Biệt" }),
];

eq("bo dau + hoa thuong", normalizeKey(" Bia HƠI Đặc Biệt "), "biahoidacbiet");
eq("chu Đ hoa cung thanh d", normalizeKey("ĐÔNG DU"), "dongdu");
eq("rong", normalizeKey(undefined), "");

eq(
  "khop bang ma vat tu du ten khac",
  khopMatHang(products, { materialCode: "10168111", productName: "TEN GHI SAI HOAN TOAN" })?.id,
  "lon",
);
eq("khop bang ten khi khong co ma", khopMatHang(products, { productName: "bia   golden bridge helles lager" })?.id, "hoi");
eq("khop ten co chu đ", khopMatHang(products, { productName: "bia dac biet" })?.id, "dac");
eq(
  "KHONG khop mo: ten bia hoi khong an vao ten bia lon",
  khopMatHang(products, { productName: "Bia Wings Dark Lager" }),
  undefined,
);
eq("ma la va ten rong thi khong khop", khopMatHang(products, { materialCode: "99999999" }), undefined);

/*
 * MOT HAM CHUAN HOA CHO CA APP. `chuanTen` va `normalizeDiemBan` (khoa tai
 * lieu bang diem_ban tren Firestore!) phai ra Y HET normalizeKey — lech mot ky
 * tu la diem ban da gan tu truoc khong con tim thay.
 */
for (const mau of ["BNC · 1901", "Cầu Vàng", "ĐẶC BIỆT  Bia", "Nhà hàng Ẩm Thực Á–Âu", "  ", "KAVKAZ (Ga 3)"]) {
  eq(`chuanTen trung normalizeKey: ${mau}`, chuanTen(mau), normalizeKey(mau));
  eq(`normalizeDiemBan trung normalizeKey: ${mau}`, normalizeDiemBan(mau), normalizeKey(mau));
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

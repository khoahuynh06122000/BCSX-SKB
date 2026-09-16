/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NHẬT KÝ NHẬP/XUẤT — kiểm cả hai vế: cái gì hiện VÀ cái gì bị ẩn.
 *
 * Lỗi thật đã gặp: bảng nhật ký xuất lọc đúng `type === "OUT"`, nên mọi dòng
 * hao hụt biến mất khỏi báo cáo. Tồn kho đã trừ chúng rồi, nên cột tồn cuối
 * giảm mà không dòng nào trên bảng giải thích được.
 */

import {
  laDongHaoHut,
  trongNhatKyNhap,
  trongNhatKyXuat,
} from "../nhatKyKho";

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

// ------------------------------------------------------------------ nhat ky nhap

eq("nhap kho hien o bang nhap", trongNhatKyNhap({ type: "IN" }), true);
eq("ton dau ky hien o bang nhap", trongNhatKyNhap({ type: "OPENING" }), true);
eq("xuat kho khong hien o bang nhap", trongNhatKyNhap({ type: "OUT" }), false);
eq("hao hut khong hien o bang nhap", trongNhatKyNhap({ type: "LOSS" }), false);

// ------------------------------------------------------------------ nhat ky xuat

eq("xuat kho hien o bang xuat", trongNhatKyXuat({ type: "OUT" }), true);

/*
 * VE QUAN TRONG NHAT CUA TEP NAY.
 *
 * Hao hut la bia da ra khoi kho that va ton kho da tru no. An no di thi nguoi
 * xem chi thay "ton cuoi giam ma khong dong nao giai thich".
 */
eq("hao hut hien o bang xuat", trongNhatKyXuat({ type: "LOSS" }), true);
eq("hu hai hien o bang xuat", trongNhatKyXuat({ type: "DAMAGE" }), true);

eq("nhap kho khong hien o bang xuat", trongNhatKyXuat({ type: "IN" }), false);
eq(
  "ton dau ky khong hien o bang xuat",
  trongNhatKyXuat({ type: "OPENING" }),
  false,
);

/*
 * DON DANG DI DUONG THI CHUA TINH — ca hai loai.
 *
 * Hang chua toi tay doi tac, va bang nay phai khop voi ton kho von cung chua
 * dem chung.
 */
eq(
  "don dang di duong chua hien",
  trongNhatKyXuat({ type: "OUT", status: "in_transit" }),
  false,
);
eq(
  "hao hut dang di duong cung chua hien",
  trongNhatKyXuat({ type: "LOSS", status: "in_transit" }),
  false,
);
eq(
  "xuat da hoan tat thi hien",
  trongNhatKyXuat({ type: "OUT", status: "completed" }),
  true,
);

// Loai la thi khong hien o bang nao — de mot loai moi them sau nay khong lang
// le lot vao ca hai bang.
eq("loai la khong hien o bang nhap", trongNhatKyNhap({ type: "TRANSFER" }), false);
eq("loai la khong hien o bang xuat", trongNhatKyXuat({ type: "TRANSFER" }), false);

// ------------------------------------------------------------------ nhan hao hut

eq("LOSS la hao hut", laDongHaoHut({ type: "LOSS" }), true);
eq("DAMAGE la hao hut", laDongHaoHut({ type: "DAMAGE" }), true);
eq("OUT khong phai hao hut", laDongHaoHut({ type: "OUT" }), false);
eq("IN khong phai hao hut", laDongHaoHut({ type: "IN" }), false);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

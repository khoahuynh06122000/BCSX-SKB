/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GOC_SANG,
  NUA_CUNG,
  NUA_HOA,
  TRAN_NEN,
  bangChieu,
  bangRong,
  doSang,
  trongSo,
  veVong,
} from "../lonXoay";

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
const gan = (ten: string, a: number, b: number, sai = 1e-9) => {
  if (Math.abs(a - b) <= sai) pass++;
  else {
    fail++;
    console.log(`SAI  ${ten}\n     thuc te: ${a}\n     mong doi: ${b} (+-${sai})`);
  }
};
const dung = (ten: string, x: boolean) => eq(ten, x, true);

const PI = Math.PI;

// -------------------------------------------------------- do sang

gan("dinh sang dung tai huong nguon sang", doSang(GOC_SANG), 1);
dung(
  "khong cho nao sang hon dinh",
  [...Array(721)].every((_, i) => doSang(-PI + (i * PI) / 360) <= 1 + 1e-12),
);
dung(
  "luon duong",
  [...Array(721)].every((_, i) => doSang(-PI + (i * PI) / 360) > 0),
);
dung("chinh dien sang hon mep", doSang(0) > doSang(PI / 2));

// Chi dung phan giua moi tam nen he so khu bong khong duoc lon qua. Ban cu co
// cho doi keo sang gap ba, keo len la bet trang.
{
  let toiDa = 0;
  for (let i = 0; i <= 200; i++) {
    const lech = -(NUA_CUNG + NUA_HOA) + (i * 2 * (NUA_CUNG + NUA_HOA)) / 200;
    toiDa = Math.max(toiDa, 1 / doSang(lech));
  }
  // Ban cu co cho doi keo sang gap ba vi phai lay ca phan sat mep anh.
  dung(`he so khu bong khong qua 2,5 (${toiDa.toFixed(2)})`, toiDa <= 2.5);
}

// -------------------------------------------------------- ve vong

gan("ve vong: 0", veVong(0), 0);
gan("ve vong: qua pi", veVong(1.5 * PI), -0.5 * PI, 1e-12);
gan("ve vong: am", veVong(-1.5 * PI), 0.5 * PI, 1e-12);
dung(
  "ve vong luon nam trong (-pi; pi]",
  [...Array(400)].every((_, i) => {
    const v = veVong(-20 + i * 0.1);
    return v > -PI - 1e-12 && v <= PI + 1e-12;
  }),
);

// -------------------------------------------------------- trong so

gan("dung tam thi trong so bang 1", trongSo(0), 1);
gan("dung ranh gioi thi bang 0,5", trongSo(NUA_CUNG), 0.5, 1e-12);
gan("qua dai hoa thi bang 0", trongSo(NUA_CUNG + NUA_HOA), 0);
gan("ngoai khoang cung bang 0", trongSo(NUA_CUNG * 2), 0);
// Hai tam ke nhau cong lai luon du 1: khong cho nao bi hut sang hay chay sang.
{
  let lech = 0;
  for (let i = 0; i <= 400; i++) {
    const g = -NUA_CUNG + (i * 2 * NUA_CUNG) / 400;
    lech = Math.max(lech, Math.abs(trongSo(g) + trongSo(g - Math.PI / 2) + trongSo(g + Math.PI / 2) - 1));
  }
  gan("hai tam ke nhau cong lai du 1", lech, 0, 1e-9);
}
gan("doi xung hai ben", trongSo(0.3), trongSo(-0.3), 1e-12);
dung(
  "giam dan tu tam ra",
  [...Array(50)].every(
    (_, i) =>
      trongSo((i * (NUA_CUNG + NUA_HOA)) / 50) >=
      trongSo(((i + 1) * (NUA_CUNG + NUA_HOA)) / 50),
  ),
);
// Diem nao tren vong cung phai duoc it nhat mot tam nhin thay, khong thi trai
// nhan ra lo trong.
{
  let itNhat = Infinity;
  for (let i = 0; i < 720; i++) {
    const goc = (i / 720) * 2 * PI;
    let tong = 0;
    for (let k = 0; k < 4; k++) tong += trongSo(veVong(goc - (k * PI) / 2));
    itNhat = Math.min(itNhat, tong);
  }
  dung(`cho nao tren vong cung co tam nhin thay (${itNhat.toFixed(3)})`, itNhat > 0.2);
}

// -------------------------------------------------------- bang tra

{
  const BUC = 1024;
  const b0 = bangChieu(0, bangRong(BUC));
  // Dung yen: giua lon la goc 0 cua dai nhan, hai mep la 1/4 vong hai ben.
  // So theo khoang cach TREN VONG: 0 va 1 la cung mot cho.
  const cachVong = (a: number, b: number) => {
    const d = Math.abs(a - b) % 1;
    return Math.min(d, 1 - d);
  };
  gan("phi=0: giua lon ung voi dau dai nhan", cachVong(b0.u[(BUC - 1) >> 1], 0), 0, 0.002);
  gan("phi=0: mep phai la 1/4 vong", cachVong(b0.u[BUC - 1], 0.25), 0, 0.002);
  gan("phi=0: mep trai la 3/4 vong", cachVong(b0.u[0], 0.75), 0, 0.002);

  const b1 = bangChieu(1.0, bangRong(BUC));
  dung("u luon trong 0..1", [...b1.u].every((v) => v >= 0 && v <= 1));
  dung("do sang luon duong", [...b1.sang].every((v) => v > 0 && v <= 1));
  dung("do nen luon duong", [...b1.nen].every((v) => v > 0));
  // Do nen o mep phai lon hon han o giua: do la cho nhan bi don lai.
  dung("sat mep nen hon giua", b1.nen[BUC - 2] > b1.nen[BUC >> 1] * 3);
  dung("do nen bi chan tran", [...b1.nen].every((v) => v <= TRAN_NEN));

  // Xoay tron mot vong thi tra ve dung cho cu.
  const b2 = bangChieu(2 * PI, bangRong(BUC));
  let lech = 0;
  for (let i = 0; i < BUC; i++) {
    const d = Math.abs(b2.u[i] - b0.u[i]);
    lech = Math.max(lech, Math.min(d, 1 - d));
  }
  dung(`quay tron 2pi tro lai cho cu (lech ${lech.toExponential(1)})`, lech < 1e-6);

  // Dung lai bang cu phai cho ket qua y het bang moi.
  const chung = bangRong(BUC);
  bangChieu(2.4, chung);
  bangChieu(0.7, chung);
  const rieng = bangChieu(0.7, bangRong(BUC));
  let sot = 0;
  for (let i = 0; i < BUC; i++) {
    sot = Math.max(sot, Math.abs(chung.u[i] - rieng.u[i]));
    sot = Math.max(sot, Math.abs(chung.nen[i] - rieng.nen[i]));
  }
  eq("dung lai bang cu khong sot so cu", sot, 0);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

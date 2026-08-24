/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GOC_SANG,
  TRAN_NEN,
  banKinhTheoCao,
  bangChieu,
  bangRong,
  doSang,
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
  "luon duong, khong bao gio den kit",
  [...Array(721)].every((_, i) => doSang(-PI + (i * PI) / 360) > 0.1),
);
dung("chinh dien sang hon mep", doSang(0) > doSang(PI / 2));
dung("nguon sang lech trai: mep trai sang hon mep phai", doSang(-PI / 2) > doSang(PI / 2));

// -------------------------------------------------------- dang lon

gan("giua than lon la ban kinh day", banKinhTheoCao(0.5), 1);
dung("co lon thop lai", banKinhTheoCao(0) < 0.9);
dung("day lon thop lai", banKinhTheoCao(1) < 0.95);
dung("day thop it hon co", banKinhTheoCao(1) > banKinhTheoCao(0));
dung(
  "khong cho nao phinh ra qua than",
  [...Array(201)].every((_, i) => banKinhTheoCao(i / 200) <= 1 + 1e-12),
);
// Dang lon phai TRON: khong duoc gap khuc, khong thi vien lon co bac.
{
  let vot = 0;
  let truoc = banKinhTheoCao(1 / 400);
  let dTruoc = truoc - banKinhTheoCao(0);
  // Bat dau tu buoc thu hai: buoc dau khong co gi truoc no de so.
  for (let i = 2; i <= 400; i++) {
    const v = banKinhTheoCao(i / 400);
    const d = v - truoc;
    vot = Math.max(vot, Math.abs(d - dTruoc));
    dTruoc = d;
    truoc = v;
  }
  dung(`dang lon tron, khong gap khuc (${vot.toExponential(1)})`, vot < 0.004);
}

// -------------------------------------------------------- bang tra

{
  const BUC = 1024;
  const cachVong = (a: number, b: number) => {
    const d = Math.abs(a - b) % 1;
    return Math.min(d, 1 - d);
  };
  const b0 = bangChieu(0, bangRong(BUC));
  // Dung yen: giua lon la dau nhan, hai mep la 1/4 vong hai ben.
  gan("phi=0: giua lon ung voi dau nhan", cachVong(b0.u[(BUC - 1) >> 1], 0), 0, 0.002);
  gan("phi=0: mep phai la 1/4 vong", cachVong(b0.u[BUC - 1], 0.25), 0, 0.002);
  gan("phi=0: mep trai la 3/4 vong", cachVong(b0.u[0], 0.75), 0, 0.002);

  const b1 = bangChieu(1.0, BUC ? bangRong(BUC) : bangRong(BUC));
  dung("u luon trong 0..1", [...b1.u].every((v) => v >= 0 && v <= 1));
  dung("do sang luon duong", [...b1.sang].every((v) => v > 0 && v <= 1));
  dung("do nen luon duong va bi chan tran", [...b1.nen].every((v) => v > 0 && v <= TRAN_NEN));
  // Sat mep lon thi nhan bi don lai, nen phai hon han o giua.
  dung("sat mep nen hon giua", b1.nen[BUC - 2] > b1.nen[BUC >> 1] * 3);

  // Xoay tron mot vong tro lai dung cho cu — nhan lien mach nen phai khop.
  const b2 = bangChieu(2 * PI, bangRong(BUC));
  let lech = 0;
  for (let i = 0; i < BUC; i++) lech = Math.max(lech, cachVong(b2.u[i], b0.u[i]));
  dung(`quay tron 2pi tro lai cho cu (${lech.toExponential(1)})`, lech < 1e-6);

  // Xoay bat ky goc nao cung khong co cho nao bi hut: u phu kin mot doan lien.
  const b3 = bangChieu(0.7, bangRong(BUC));
  let nhay = 0;
  for (let i = 1; i < BUC; i++) nhay = Math.max(nhay, cachVong(b3.u[i], b3.u[i - 1]));
  dung(`u chay lien mach, khong nhay (${nhay.toFixed(4)})`, nhay < 0.01);

  // Dung lai bang cu phai cho ket qua y het bang moi.
  const chung = bangRong(BUC);
  bangChieu(2.4, chung);
  bangChieu(0.7, chung);
  let sot = 0;
  for (let i = 0; i < BUC; i++) {
    sot = Math.max(sot, Math.abs(chung.u[i] - b3.u[i]));
    sot = Math.max(sot, Math.abs(chung.nen[i] - b3.nen[i]));
  }
  eq("dung lai bang cu khong sot so cu", sot, 0);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DAI_HOA,
  GOC_SANG,
  TRAN_NEN,
  TRAN_SANG,
  bangChieu,
  bangRong,
  doSang,
  mauLay,
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

// ------------------------------------------------------- do sang

gan("dinh sang dung tai huong nguon sang", doSang(GOC_SANG), 1);
dung("khong cot nao sang hon dinh", [...Array(721)].every((_, i) => doSang(-PI + (i * PI) / 360) <= 1 + 1e-12));
dung("luon duong", [...Array(721)].every((_, i) => doSang(-PI + (i * PI) / 360) > 0));
dung("chinh dien sang hon mep", doSang(0) > doSang(PI / 2));
dung("mep trai sang hon mep phai vi den lech trai", doSang(-PI / 2) > doSang(PI / 2));

// ------------------------------------------------------- lay mau

// Dung yen thi cot nguon trung cot dich: anh khong meo mo gi.
for (const s of [-1, -0.7, -0.2, 0, 0.35, 0.8, 1]) {
  const m = mauLay(s, 0);
  gan(`phi=0 lay dung cot cua no tai s=${s}`, m.u, s, 1e-12);
  eq(`phi=0 khong cham mat sau tai s=${s}`, m.sau, false);
}

// Goc be mat chi phu thuoc vi tri tren man hinh, khong phu thuoc lon xoay bao nhieu.
for (const phi of [0, 0.8, 2.5, -1.9]) {
  gan(`beta khong doi theo phi=${phi}`, mauLay(0.5, phi).beta, Math.asin(0.5), 1e-12);
}

// Xoay sang phai thi nhan truot sang phai: phan nhan o giua di ve mep phai.
{
  const truoc = mauLay(0, 0).u;
  const sau = mauLay(0, 0.5).u;
  dung("xoay duong lam nhan truot ve mot phia", sau > truoc);
}

// Mat sau bi lo ra ngay khi lon chom xoay, va lo ve dung mot phia.
{
  const m = mauLay(0.999, 0.3);
  eq("xoay duong thi mep phai thanh mat sau", m.sau, true);
  eq("cung luc do mep trai van la mat truoc", mauLay(-0.999, 0.3).sau, false);
}

// Noi lien mep: hai ben duong ghep phai tra ve cung mot cho tren nhan, khong
// thi thay mot vach doc chay quanh lon.
{
  const phi = 0.6;
  // Tim s ngay truoc va ngay sau diem a = pi/2.
  const sGhep = Math.sin(PI / 2 - phi);
  const a = mauLay(sGhep - 1e-6, phi);
  const b = mauLay(sGhep + 1e-6, phi);
  eq("mot ben ghep la mat truoc", a.sau, false);
  eq("ben kia ghep la mat sau", b.sau, true);
  gan("mat truoc cham dung mep phai cua anh", a.u, 1, 1e-5);
  gan("mat sau bat dau dung tu mep phai", b.u, 0, 1e-5);
}
{
  // Xoay nguoc lai thi lo duong ghep ben kia, o mep trai.
  const phi = -0.6;
  const sGhep = Math.sin(-PI / 2 - phi);
  const a = mauLay(sGhep + 1e-6, phi);
  const b = mauLay(sGhep - 1e-6, phi);
  eq("ben trong duong ghep trai la mat truoc", a.sau, false);
  gan("mat truoc cham dung mep trai cua anh", a.u, -1, 1e-5);
  eq("ben ngoai la mat sau", b.sau, true);
  gan("mat sau ket thuc dung o mep trai", b.u, 1, 1e-5);
}

// Mot luc chi lo duoc MOT duong ghep: xoay mot chieu thi mep ben kia van con
// nam trong nua truoc, chua vong toi.
{
  let caHai = 0;
  for (let i = 1; i <= 60; i++) {
    const phi = (i * 1.2) / 60;
    if (mauLay(-1, phi).sau && mauLay(1, phi).sau) caHai++;
  }
  eq("xoay vua phai thi chi lo mot ben", caHai, 0);
}

// Quay tron mot vong thi tro lai y nguyen.
for (const s of [-0.6, 0, 0.4]) {
  gan(`quay tron 2pi tro lai cho cu tai s=${s}`, mauLay(s, 2 * PI).u, mauLay(s, 0).u, 1e-9);
  gan(`quay lui 2pi tro lai cho cu tai s=${s}`, mauLay(s, -2 * PI).u, mauLay(s, 0).u, 1e-9);
}

// Quay nua vong thi ca lon la mat sau — luc nay doi anh sang loai khac se
// khong ai thay, do chinh la cho de thay nhan.
dung(
  "quay nua vong thi toan bo la mat sau",
  [-0.95, -0.5, 0, 0.5, 0.95].every((s) => mauLay(s, PI).sau),
);

// u cua mat sau luon nam trong 0..1, khong bao gio troi ra ngoai bang mau.
{
  let ngoai = 0;
  for (let i = 0; i <= 400; i++) {
    const phi = -4 * PI + (i * 8 * PI) / 400;
    for (const s of [-1, -0.5, 0, 0.5, 1]) {
      const m = mauLay(s, phi);
      if (m.sau && (m.u < 0 || m.u > 1)) ngoai++;
      if (!m.sau && (m.u < -1 || m.u > 1)) ngoai++;
    }
  }
  eq("khong co diem lay nao troi ra ngoai bang mau", ngoai, 0);
}

// Vao ngoai khoang cung khong lam vo phep tinh.
eq("s ngoai khoang bi kep lai", mauLay(5, 0).u, 1);
eq("s am ngoai khoang bi kep lai", mauLay(-5, 0).u, -1);

// ------------------------------------------------------- bang tra

{
  const BUC = 1024;
  const b0 = bangChieu(0, bangRong(BUC));
  // Dung yen thi bang tra phai tra ve dung cot cua no va he so chinh sang phai
  // bang 1 — day la dieu kien de anh dung yen hien ra y het anh goc.
  let lechU = 0;
  let lechF = 0;
  for (let i = 0; i < BUC; i++) {
const s = -1 + (2 * i) / (BUC - 1);
lechU = Math.max(lechU, Math.abs(b0.u[i] - s));
lechF = Math.max(lechF, Math.abs(b0.sangManHinh[i] / b0.sangNhan[i] - 1));
  }
  dung("phi=0: bang tra tra ve dung cot cua no", lechU < 1e-6);
  dung("phi=0: he so chinh sang deu bang 1", lechF < 1e-6);
  // Dung yen thi dai hoa chi duoc cham vien, khong duoc an vao giua nhan. 56
  // bac tren 1024 la khoang 2,3% ban kinh moi ben — vai diem anh sat mep, ma
  // ngay tai do hai anh truoc/sau cung la mot cho tren vo lon nen hoa vao nhau
  // khong sai gi.
  const chamHoa = [...b0.hoa].filter((h) => h > 0).length;
  dung(`phi=0: dai hoa chi cham vien (${chamHoa} bac)`, chamHoa <= 56);

  const b1 = bangChieu(1.0, bangRong(BUC));
  dung("xoay thi co phan la mat sau", [...b1.hoa].some((h) => h === 1));
  dung("xoay thi van con phan la nhan", [...b1.hoa].some((h) => h === 0));
  dung("co vung hoa dan giua hai ben", [...b1.hoa].some((h) => h > 0 && h < 1));
  dung("he so hoa luon trong 0..1", [...b1.hoa].every((h) => h >= 0 && h <= 1));
  dung("co danh dau mat sau", [...b1.sau].some((v) => v === 1));
  dung("van con danh dau mat truoc", [...b1.sau].some((v) => v === 0));
  // Do nen phai >= 1 va bi chan tran, khong thi vong lay mau chay mai o mep.
  dung(
    "do nen nam trong 1..TRAN_NEN",
    [...b1.nen].every((v) => v >= 1 && v <= TRAN_NEN),
  );
  // Dung yen thi anh khong bi nen o dau ca, vi moi cot lay dung cot cua no.
  dung(
    "phi=0: khong nen o bat cu dau",
    [...b0.nen].every((v) => Math.abs(v - 1) < 1e-6),
  );
  // Xoay roi thi hai mep bi nen manh hon giua.
  dung("xoay thi mep trai nen hon giua", b1.nen[1] > b1.nen[BUC >> 1]);
  dung("xoay thi mep phai nen hon giua", b1.nen[BUC - 2] > b1.nen[BUC >> 1]);
  dung(
"do sang luon duong va khong vuot dinh",
[...b1.sangManHinh, ...b1.sangNhan].every((v) => v > 0 && v <= 1),
  );
  // Quay nua vong thi khong con nhan nao — day la cho de doi sang loai bia khac.
  dung(
"quay nua vong thi toan mat sau",
[...bangChieu(Math.PI, bangRong(BUC)).hoa].every((h) => h === 1),
  );
  eq("dai hoa dung hang so da khai", DAI_HOA, 0.3);
  // He so chinh sang phai duoc chan tran, khong thi cho toi xoay ra chinh dien
  // bi keo sang gap ba lan, bet trang.
  dung(
    "he so chinh sang bi chan tran",
    [...b1.heSoNhan, ...b1.heSoSau].every((v) => v > 0 && v <= TRAN_SANG + 1e-6),
  );
  dung(
    "phi=0: he so nhan deu bang 1",
    [...b0.heSoNhan].every((v) => Math.abs(v - 1) < 1e-6),
  );
  // Dung lai bang cu phai cho ket qua y het bang moi, khong con sot so cu.
  {
    const chung = bangRong(BUC);
    bangChieu(2.4, chung);
    bangChieu(0.7, chung);
    const rieng = bangChieu(0.7, bangRong(BUC));
    let lech = 0;
    for (let i = 0; i < BUC; i++) {
      lech = Math.max(lech, Math.abs(chung.u[i] - rieng.u[i]));
      lech = Math.max(lech, Math.abs(chung.hoa[i] - rieng.hoa[i]));
      lech = Math.max(lech, Math.abs(chung.heSoSau[i] - rieng.heSoSau[i]));
    }
    eq("dung lai bang cu khong sot so cu", lech, 0);
  }
}


console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

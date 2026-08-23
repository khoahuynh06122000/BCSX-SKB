/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { stableHash } from "../hash";
import {
  bangHoaDon,
  dongCanDienHoaDon,
  hoaDonRoiRa,
  khoaHoaDon,
  type HoaDonGhiNhan,
} from "../hoaDon";

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

const K = (tu: string, den: string, bp: string) =>
  khoaHoaDon(tu, den, bp, stableHash);

// ------------------------------------------------------------------ khoa

eq("khoa on dinh qua hai lan goi", K("2026-08-01", "2026-08-12", "AD0103"), K("2026-08-01", "2026-08-12", "AD0103"));
eq(
  "doi ma BP thi doi khoa",
  K("2026-08-01", "2026-08-12", "AD0103") !== K("2026-08-01", "2026-08-12", "AC0118"),
  true,
);
// Sua bien dot thi khoa doi — CO Y, vi tap giao dich ben duoi da khac.
eq(
  "doi bien dot thi doi khoa",
  K("2026-08-01", "2026-08-12", "AD0103") !== K("2026-08-01", "2026-08-13", "AD0103"),
  true,
);

// --------------------------------------------------------------- gom dong

const dot = [
  { tuNgay: "2026-08-01", denNgay: "2026-08-12", nhan: "01.08-12.08" },
  { tuNgay: "2026-08-13", denNgay: "2026-08-16", nhan: "13.08-16.08" },
];

const dong = [
  // BNC dot 1 — hai dong bia, cung mot hoa don.
  { ngayGiaoBia: "01.08-12.08", maBp: "AD0103", donVi: "BNC", soLuong: 100, thanhTienSkb: 3_000_000, soHoaDon: "C26TKB#00000192" },
  { ngayGiaoBia: "01.08-12.08", maBp: "AD0103", donVi: "BNC", soLuong: 50, thanhTienSkb: 700_000, soHoaDon: "C26TKB#00000192" },
  // BNG dot 1.
  { ngayGiaoBia: "01.08-12.08", maBp: "AC0118", donVi: "BNG", soLuong: 20, thanhTienSkb: 600_000, soHoaDon: "C26TKB#00000193" },
  // BNC dot 2 — hoa don KHAC, du cung don vi.
  { ngayGiaoBia: "13.08-16.08", maBp: "AD0103", donVi: "BNC", soLuong: 80, thanhTienSkb: 2_400_000, soHoaDon: "C26TKB#00000194" },
];

const daGhi = bangHoaDon([
  {
    id: K("2026-08-01", "2026-08-12", "AD0103"),
    tuNgay: "2026-08-01",
    denNgay: "2026-08-12",
    maBp: "AD0103",
    donVi: "BNC",
    soHoaDon: "C26TKB#00007777",
    ngayHoaDon: "2026-08-16",
  },
]);

const ds = dongCanDienHoaDon(dong, dot, daGhi, stableHash);

eq("ba hoa don", ds.length, 3);

const bnc1 = ds.find((d) => d.nhanDot === "01.08-12.08" && d.maBp === "AD0103")!;
eq("gop hai dong cua BNC dot 1", bnc1.soDong, 2);
eq("cong dung tien", bnc1.thanhTien, 3_700_000);
eq("cong dung so luong", bnc1.soLuong, 150);
eq("lay lai so da ghi", bnc1.soDaGhi, "C26TKB#00007777");
eq("lay lai ngay da ghi", bnc1.ngayDaGhi, "2026-08-16");
eq("van giu so goi y", bnc1.soGoiY, "C26TKB#00000192");

const bng = ds.find((d) => d.maBp === "AC0118")!;
eq("chua ghi thi de trong", bng.soDaGhi, "");

// Cung don vi nhung khac dot phai la HAI hoa don.
const bnc2 = ds.find((d) => d.nhanDot === "13.08-16.08")!;
eq("khac dot la hoa don khac", bnc1.khoa !== bnc2.khoa, true);
eq("dot 2 chua ghi", bnc2.soDaGhi, "");

// Dong thuoc dot khong con khai thi bo qua, khong vo.
eq(
  "dot khong con khai thi bo qua",
  dongCanDienHoaDon(dong, [dot[0]], daGhi, stableHash).length,
  2,
);
eq("danh sach rong", dongCanDienHoaDon([], dot, daGhi, stableHash).length, 0);

// --------------------------------------------------------------- roi ra

const luu: HoaDonGhiNhan[] = [
  {
    id: K("2026-08-01", "2026-08-12", "AD0103"),
    tuNgay: "2026-08-01",
    denNgay: "2026-08-12",
    maBp: "AD0103",
    donVi: "BNC",
    soHoaDon: "C26TKB#00007777",
    ngayHoaDon: "2026-08-16",
  },
  {
    // Dot cu, nay nguoi dung da sua bien dot -> khong con khop.
    id: K("2026-07-01", "2026-07-15", "AD0103"),
    tuNgay: "2026-07-01",
    denNgay: "2026-07-15",
    maBp: "AD0103",
    donVi: "BNC",
    soHoaDon: "C26TKB#00006666",
    ngayHoaDon: "2026-07-16",
  },
];
const dangDung = new Set(ds.map((d) => d.khoa));
const roi = hoaDonRoiRa(luu, dangDung);
eq("mot hoa don roi ra", roi.length, 1);
eq("dung cai bi roi", roi[0].soHoaDon, "C26TKB#00006666");

// So rong thi khong tinh la roi ra — von chua dien gi.
eq(
  "so rong khong tinh la roi ra",
  hoaDonRoiRa(
    [{ ...luu[1], soHoaDon: "" }],
    dangDung,
  ).length,
  0,
);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

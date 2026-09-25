/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { stableHash } from "../hash";
import {
  bangHoaDon,
  boDauKetXuat,
  danhDauKetXuat,
  dongCanDienHoaDon,
  hoaDonRoiRa,
  khoaHoaDon,
  type DongCanDien,
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

// ====================================================== moc DA KET XUAT

/*
 * MOC CHUYEN TAB LA LUC TAI TEP TEMPLATE, KHONG PHAI LUC DIEN SO HOA DON.
 *
 * Tai tep ve la mang sang he thong hoa don de phat hanh — ke tu luc ay don da
 * di khoi tay, du so hoa don that vai hom sau moi co. Lay so hoa don lam moc
 * thi suot quang giua don van nam o "chua xuat", va lan ket xuat sau gom no
 * vao tep lan nua — xuat trung hoa don.
 */
{
  const dong = [
    {
      ngayGiaoBia: "01-12/08",
      maBp: "AD0103",
      donVi: "BNC",
      soLuong: 10,
      thanhTienSkb: 100,
      soHoaDon: "GOI-Y-1",
    },
  ];
  const dot = [
    { tuNgay: "2026-08-01", denNgay: "2026-08-12", nhan: "01-12/08" },
  ];
  const khoa = K("2026-08-01", "2026-08-12", "AD0103");

  // Chua co ban ghi nao -> chua ket xuat.
  const a = dongCanDienHoaDon(dong, dot, new Map(), stableHash);
  eq("chua co ban ghi thi chua ket xuat", a[0].daKetXuat, false);

  // Co ngay ket xuat nhung CHUA co so hoa don -> van la DA ket xuat.
  const b = dongCanDienHoaDon(
    dong,
    dot,
    bangHoaDon([
      {
        id: khoa,
        tuNgay: "2026-08-01",
        denNgay: "2026-08-12",
        maBp: "AD0103",
        donVi: "BNC",
        soHoaDon: "",
        ngayHoaDon: "",
        ngayKetXuat: "2026-08-13T02:00:00.000Z",
      },
    ]),
    stableHash,
  );
  eq("da ket xuat du chua co so hoa don", b[0].daKetXuat, true);
  eq("va so hoa don van trong", b[0].soDaGhi, "");

  /*
   * CO SO HOA DON NHUNG KHONG CO MOC KET XUAT -> VAN LA DA XUAT.
   *
   * Khong the co so hoa don ma chua xuat hoa don. Thieu ve nay thi moi hoa don
   * ghi tu truoc luc co moc ket xuat deu roi ve "chua xuat", va so theo doi mo
   * ra trong tron du da dien hang chuc so.
   */
  const c = dongCanDienHoaDon(
    dong,
    dot,
    bangHoaDon([
      {
        id: khoa,
        tuNgay: "2026-08-01",
        denNgay: "2026-08-12",
        maBp: "AD0103",
        donVi: "BNC",
        soHoaDon: "HD-001",
        ngayHoaDon: "2026-08-13",
      },
    ]),
    stableHash,
  );
  eq("co so hoa don la da xuat", c[0].daKetXuat, true);
  eq("va so hoa don cu doc ra dung", c[0].soDaGhi, "HD-001");

  // Ngay ket xuat rong cung la chua ket xuat — do la cach `boDauKetXuat` xoa.
  const d = dongCanDienHoaDon(
    dong,
    dot,
    bangHoaDon([
      {
        id: khoa,
        tuNgay: "2026-08-01",
        denNgay: "2026-08-12",
        maBp: "AD0103",
        donVi: "BNC",
        soHoaDon: "",
        ngayHoaDon: "",
        ngayKetXuat: "",
      },
    ]),
    stableHash,
  );
  eq("moc rong va khong co so thi chua xuat", d[0].daKetXuat, false);
}

// ------------------------------------------------ danh dau / bo danh dau

const mauDong = (them: Partial<DongCanDien> = {}): DongCanDien => ({
  khoa: "hd-x",
  tuNgay: "2026-08-01",
  denNgay: "2026-08-12",
  nhanDot: "01-12/08",
  maBp: "AD0103",
  donVi: "BNC",
  soDong: 9,
  soLuong: 100,
  thanhTien: 1000,
  soGoiY: "GOI-Y",
  soDaGhi: "",
  ngayDaGhi: "",
  daKetXuat: false,
  ...them,
});

{
  const ra = danhDauKetXuat([mauDong()], "2026-08-13T02:00:00.000Z");
  eq("danh dau dung mot ban ghi", ra.length, 1);
  eq("giu nguyen khoa", ra[0].id, "hd-x");
  eq("ghi moc ket xuat", ra[0].ngayKetXuat, "2026-08-13T02:00:00.000Z");

  /*
   * VE QUAN TRONG: KHONG DUOC XOA SO HOA DON DA CO.
   *
   * Ban ghi nay di qua `merge` cua Firestore nen de trong khong xoa gi — nhung
   * mot ngay nao do doi sang ghi de thi de trong o day se xoa sach so da dien.
   */
  const giuSo = danhDauKetXuat(
    [mauDong({ soDaGhi: "HD-001", ngayDaGhi: "2026-08-13" })],
    "2026-08-14T02:00:00.000Z",
  );
  eq("giu so hoa don da co", giuSo[0].soHoaDon, "HD-001");
  eq("giu ngay hoa don da co", giuSo[0].ngayHoaDon, "2026-08-13");
}

{
  const bo = boDauKetXuat(mauDong({ daKetXuat: true }));
  eq("xoa moc bang chuoi rong", bo.ngayKetXuat, "");
  eq("van giu khoa", bo.id, "hd-x");
  // Xoa bang chuoi rong chu khong bo han truong: ban ghi di qua `merge`, ma
  // `merge` khong bo duoc truong.
  eq("truong van con", "ngayKetXuat" in bo, true);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

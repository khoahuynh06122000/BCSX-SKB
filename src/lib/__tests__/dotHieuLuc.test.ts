/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Đợt đã chốt trên máy chủ thắng đợt khai ở từng trình duyệt. */

import { dotHieuLuc, type HoaDonGhiNhan } from "../hoaDon";

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

const hd = (tu: string, den: string, k: Partial<HoaDonGhiNhan> = {}): HoaDonGhiNhan => ({
  id: `hd-${tu}-${den}-${k.maBp || "X"}`,
  tuNgay: tu,
  denNgay: den,
  maBp: "X",
  donVi: "X",
  soHoaDon: "",
  ngayHoaDon: "",
  ngayKetXuat: "2026-11-22T07:54:00",
  ...k,
});
const ngay = (ds: { tuNgay: string; denNgay: string }[]) => ds.map((d) => `${d.tuNgay}>${d.denNgay}`);

const daChot = [
  hd("2026-11-14", "2026-11-15"),
  hd("2026-11-16", "2026-11-17", { soHoaDon: "C26TKB#303" }),
  hd("2026-11-18", "2026-11-20"),
  hd("2026-11-18", "2026-11-20", { maBp: "Y" }),
];

eq(
  "dot dai o may admin: chi con phan chua chot",
  ngay(dotHieuLuc(daChot, [{ id: "d1", tuNgay: "2026-11-10", denNgay: "2026-11-24" }])),
  ["2026-11-10>2026-11-13", "2026-11-14>2026-11-15", "2026-11-16>2026-11-17", "2026-11-18>2026-11-20", "2026-11-21>2026-11-24"],
);
eq(
  "dot khai trung dot chot: khong lap",
  ngay(dotHieuLuc(daChot, [{ id: "d1", tuNgay: "2026-11-18", denNgay: "2026-11-20" }])),
  ["2026-11-14>2026-11-15", "2026-11-16>2026-11-17", "2026-11-18>2026-11-20"],
);
eq(
  "dot khai sau cac dot chot giu nguyen id",
  dotHieuLuc(daChot, [{ id: "d9", tuNgay: "2026-11-21", denNgay: "2026-11-22" }]).slice(-1),
  [{ id: "d9", tuNgay: "2026-11-21", denNgay: "2026-11-22" }],
);
eq(
  "hoa don dua ve chua xuat, bi thay the: khong co dinh",
  ngay(
    dotHieuLuc(
      [
        hd("2026-11-14", "2026-11-15", { ngayKetXuat: "" }),
        hd("2026-11-16", "2026-11-17", { soHoaDon: "A", biThayTheBoi: { soHoaDon: "B", ngayHoaDon: "", luc: "", lyDo: "" } as never }),
      ],
      [{ id: "d1", tuNgay: "2026-11-14", denNgay: "2026-11-17" }],
    ),
  ),
  ["2026-11-14>2026-11-17"],
);
eq(
  "qua thang",
  ngay(dotHieuLuc([hd("2026-11-01", "2026-11-07")], [{ id: "d", tuNgay: "2026-10-30", denNgay: "2026-11-08" }])),
  ["2026-10-30>2026-10-31", "2026-11-01>2026-11-07", "2026-11-08>2026-11-08"],
);
eq("khong khai dot nao: van co dot chot", dotHieuLuc(daChot, []).length, 3);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

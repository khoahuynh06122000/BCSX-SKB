/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * XOÁ LẺ: chỉ chứng từ không còn dòng nào đứng sau mới được dọn theo.
 */

import { nguonMoCoi, soPhieuMoCoi } from "../nguonMoCoi";

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

const tatCa = [
  { id: "n1", slipCode: "PN-260911-01", referenceGroupId: "multi-a" },
  { id: "n2", slipCode: "PN-260911-01", referenceGroupId: "multi-a" },
  { id: "n3", slipCode: "PN-260911-02", referenceGroupId: "multi-b" },
  { id: "x1", referenceGroupId: "multi-x" },
  { id: "x1-hao", referenceGroupId: "multi-x" },
  { id: "x2", referenceGroupId: "multi-y" },
  { id: "le" },
];

eq(
  "xoa mot mat hang trong phieu nhieu mat hang: khong don gi",
  nguonMoCoi([tatCa[0]], tatCa),
  { phieuNhap: [], nhom: [] },
);
eq(
  "xoa het phieu: phieu va nhom mo coi",
  nguonMoCoi([tatCa[0], tatCa[1]], tatCa),
  { phieuNhap: ["PN-260911-01"], nhom: ["multi-a"] },
);
eq(
  "xoa don xuat kem hao hut: nhom mo coi",
  nguonMoCoi([tatCa[3], tatCa[4]], tatCa),
  { phieuNhap: [], nhom: ["multi-x"] },
);
eq(
  "xoa dong xuat nhung con dong hao: chua mo coi",
  nguonMoCoi([tatCa[3]], tatCa),
  { phieuNhap: [], nhom: [] },
);
eq("dong khong ma khong sinh gi", nguonMoCoi([tatCa[6]], tatCa), {
  phieuNhap: [],
  nhom: [],
});

const so = [
  { soPhieu: "PN-260911-01", nguon: "PN-260911-01", trangThai: "hieu_luc" },
  { soPhieu: "PX-260911-03", nguon: "multi-x", trangThai: "hieu_luc" },
  { soPhieu: "PX-260911-01", nguon: "multi-x", trangThai: "da_huy" },
  { soPhieu: "PX-260911-04", nguon: "multi-y", trangThai: "hieu_luc" },
];
eq(
  "chi so con hieu luc cua nguon mo coi",
  soPhieuMoCoi(so, { phieuNhap: ["PN-260911-01"], nhom: ["multi-x"] }).map(
    (g) => g.soPhieu,
  ),
  ["PN-260911-01", "PX-260911-03"],
);
eq("khong mo coi thi khong huy gi", soPhieuMoCoi(so, { phieuNhap: [], nhom: [] }), []);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỐ PHIẾU TRÊN BÁO CÁO: đúng dòng mang đúng số; chứng từ chưa có số được
 * liệt kê đủ, không trùng, không tính tồn đầu kỳ.
 */

import { bangSoPhieu, chungTuChuaCoSo, soPhieuCuaDong } from "../soPhieuBaoCao";
import type { GhiSoPhieu } from "../soPhieu";

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

const g = (p: Partial<GhiSoPhieu>): GhiSoPhieu =>
  ({
    id: p.soPhieu,
    loai: "XUAT",
    documentDate: "2026-10-12",
    enteredOn: "2026-10-12T01:00:00Z",
    nguon: "",
    donVi: "",
    soDong: 1,
    soLuong: 1,
    trangThai: "hieu_luc",
    createdBy: "x",
    ...p,
  }) as GhiSoPhieu;

const so = [
  g({ soPhieu: "PX-261012-01", nguon: "multi-a" }),
  g({ soPhieu: "PN-261012-01", loai: "NHAP", nguon: "PN-261012-01" }),
  // Đơn b: số 02 đã hủy, cấp lại số 05 — phải hiện 05.
  g({ soPhieu: "PX-261012-02", nguon: "multi-b", trangThai: "da_huy" }),
  g({ soPhieu: "PX-261012-02-HUY", loai: "HUY_XUAT", nguon: "multi-b", enteredOn: "2026-10-13T00:00:00Z" }),
  g({ soPhieu: "PX-261012-05", nguon: "multi-b", enteredOn: "2026-10-14T00:00:00Z" }),
  // Đơn c: chỉ có số đã hủy.
  g({ soPhieu: "PX-261012-03", nguon: "multi-c", trangThai: "da_huy" }),
];
const bang = bangSoPhieu(so);

eq("dong xuat mang so cua don", soPhieuCuaDong({ type: "OUT", referenceGroupId: "multi-a" }, bang)?.soPhieu, "PX-261012-01");
eq("hao hut cung don cung so", soPhieuCuaDong({ type: "LOSS", referenceGroupId: "multi-a" }, bang)?.soPhieu, "PX-261012-01");
eq("dong nhap mang so = ma phieu", soPhieuCuaDong({ type: "IN", slipCode: "PN-261012-01" }, bang)?.soPhieu, "PN-261012-01");
eq("cap lai sau huy thi hien so con hieu luc", soPhieuCuaDong({ type: "OUT", referenceGroupId: "multi-b" }, bang), { soPhieu: "PX-261012-05", daHuy: false });
eq("chi con so huy thi hien kem co huy", soPhieuCuaDong({ type: "OUT", referenceGroupId: "multi-c" }, bang), { soPhieu: "PX-261012-03", daHuy: true });
eq("ton dau ky khong co so", soPhieuCuaDong({ type: "OPENING", id: "o1" }, bang), null);
eq("nhap khong ma phieu khong co so", soPhieuCuaDong({ type: "IN", id: "i1" }, bang), null);

const gd = [
  { id: "1", type: "OUT", date: "2026-10-14T08:00:00.000Z", quantity: 10, partnerName: "BNC", referenceGroupId: "multi-x" },
  { id: "2", type: "LOSS", date: "2026-10-14T08:00:00.000Z", quantity: 1, partnerName: "BNC", referenceGroupId: "multi-x" },
  { id: "3", type: "OUT", date: "2026-10-12T08:00:00.000Z", quantity: 5, partnerName: "FV", referenceGroupId: "multi-y" },
  { id: "4", type: "OUT", date: "2026-10-12T08:00:00.000Z", quantity: 7, referenceGroupId: "multi-a" },
  { id: "5", type: "OPENING", date: "2026-10-01", quantity: 100 },
  { id: "6", type: "IN", date: "2026-10-13T07:00:00.000Z", quantity: 50, slipCode: "PN-261013-01" },
  { id: "7", type: "OUT", date: "2026-10-12T08:00:00.000Z", quantity: 3, referenceGroupId: "multi-c" },
];
const cho = chungTuChuaCoSo(gd, so);
eq("dung cac chung tu chua co so, xep theo ngay", cho.map((c) => c.nguon), ["multi-y", "PN-261013-01", "multi-x"]);
eq("gop dong xuat va hao hut cua mot don", cho.find((c) => c.nguon === "multi-x"), {
  loai: "XUAT",
  nguon: "multi-x",
  documentDate: "2026-10-14",
  donVi: "BNC",
  soDong: 2,
  soLuong: 11,
});
eq("so da huy khong tinh la chua co so", cho.some((c) => c.nguon === "multi-c"), false);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

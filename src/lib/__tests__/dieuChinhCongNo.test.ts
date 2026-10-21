/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐIỀU CHỈNH CÔNG NỢ: cặp dòng âm/dương cộng lại bằng 0 (tồn kho không đổi),
 * công nợ chuyển đúng từ đơn vị nhầm sang đơn vị đúng, và không bao giờ rơi
 * vào đợt hóa đơn đã phát hành.
 */

import {
  kiemTraDieuChinh,
  khoaDieuChinh,
  lapDongDieuChinh,
  type YeuCauDieuChinh,
} from "../dieuChinhCongNo";
import { dungBangCongNo, type DotChot } from "../congNo";
import { stableHash } from "../hash";
import { ngayCham } from "../oNgay";
import type { Partner, Product, Transaction } from "../../types";

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

const partners: Partner[] = [
  { id: "bnc-ng", name: "BNC · Ngoại giao", sapCode: "AD0103", type: "AGENT" },
  { id: "bnc-1901", name: "BNC · NH 1901", sapCode: "AD0103", type: "AGENT" },
  { id: "spa", name: "SPA", sapCode: "AC0200", type: "AGENT" },
];
const maBpCua = (id: string) => partners.find((p) => p.id === id)?.sapCode || "";
const dot: DotChot[] = [
  { id: "d1", tuNgay: "2026-09-25", denNgay: "2026-09-30" },
  { id: "d2", tuNgay: "2026-10-15", denNgay: "2026-10-19" },
];
// Đợt 1 của BNC đã phát hành (đã có số); đợt 2 chưa xuất.
const daKhoa = (d: DotChot, maBp: string) => d.id === "d1" && maBp === "AD0103";
const ctx = { dot, maBpCua, daKhoa };

const yc: YeuCauDieuChinh = {
  ngayGoc: "2026-09-30",
  ngayGhi: "2026-10-19",
  tuDoiTac: "bnc-ng",
  sangDoiTac: "spa",
  lyDo: "VINACS Hà Nội của SPA, xuất nhầm BNC Ngoại giao",
  dong: [{ productId: "lunar-lon", soLuong: 120 }],
};

// ---- Kiểm tra hợp lệ ----
eq("yeu cau dung thi duoc ghi", kiemTraDieuChinh(yc, ctx), "");
eq("chan ghi vao dot da phat hanh", kiemTraDieuChinh({ ...yc, ngayGhi: "2026-09-28" }, ctx) !== "", true);
eq("ngay ghi ngoai moi dot van duoc (vao dot khai sau)", kiemTraDieuChinh({ ...yc, ngayGhi: "2026-10-21" }, ctx), "");
eq("chan hai don vi trung nhau", kiemTraDieuChinh({ ...yc, sangDoiTac: "bnc-ng" }, ctx) !== "", true);
eq("chan so luong am / bang 0", kiemTraDieuChinh({ ...yc, dong: [{ productId: "x", soLuong: 0 }] }, ctx) !== "", true);
eq("chan thieu ly do", kiemTraDieuChinh({ ...yc, lyDo: "  " }, ctx) !== "", true);
eq("chan mat hang lap", kiemTraDieuChinh({ ...yc, dong: [{ productId: "a", soLuong: 1 }, { productId: "a", soLuong: 2 }] }, ctx) !== "", true);
eq("chan ngay ghi truoc ngay goc", kiemTraDieuChinh({ ...yc, ngayGhi: "2026-09-01" }, ctx) !== "", true);

// ---- Khoá ổn định ----
eq("bam hai lan cung khoa", khoaDieuChinh(yc, stableHash), khoaDieuChinh({ ...yc, lyDo: "khac" }, stableHash));
eq("so luong khac thi khoa khac", khoaDieuChinh(yc, stableHash) !== khoaDieuChinh({ ...yc, dong: [{ productId: "lunar-lon", soLuong: 100 }] }, stableHash), true);

// ---- Cặp dòng ----
const dong = lapDongDieuChinh(yc, {
  bam: stableHash,
  tenDoiTac: (id) => partners.find((p) => p.id === id)?.name || id,
  ngayCham,
});
eq("mot mat hang ra hai dong", dong.length, 2);
eq("cap dong cong lai bang 0 — ton kho khong doi", dong.reduce((s, d) => s + d.quantity, 0), 0);
eq("am cho don vi nham", dong.find((d) => d.partnerId === "bnc-ng")?.quantity, -120);
eq("duong cho don vi dung", dong.find((d) => d.partnerId === "spa")?.quantity, 120);
eq("ghi chu nho ngay giao goc", dong[0].notes.includes("30.09.2026"), true);

// ---- Đi qua bảng Chốt thật ----
const products: Product[] = [
  {
    id: "lunar-lon",
    name: "Bia Lunar Castle Dry hop Pale Ale 330ml",
    category: "Lon",
    materialCode: "10174039",
  } as unknown as Product,
];
const gd = (p: Partial<Transaction>): Transaction =>
  ({
    type: "OUT",
    status: "completed",
    productId: "lunar-lon",
    productName: products[0].name,
    category: "Lon",
    createdBy: "x",
    ...p,
  }) as Transaction;
const giaoDich: Transaction[] = [
  // Đợt 2: BNC 1901 có 200 lon thật.
  gd({ id: "t1", date: "2026-10-16T08:00:00.000Z", quantity: 200, partnerId: "bnc-1901", partnerName: "BNC · NH 1901" }),
  ...dong.map((d) =>
    gd({ id: d.id, date: d.date, quantity: d.quantity, partnerId: d.partnerId, partnerName: "" }),
  ),
];
const bang = dungBangCongNo({
  transactions: giaoDich,
  products,
  partners,
  dot: [dot[1]],
  tienToHoaDon: "C26TKB#",
  soHoaDonBatDau: 1,
});
const slCua = (maBp: string) =>
  bang.dong.filter((r) => r.maBp === maBp).reduce((s, r) => s + r.soLuong, 0);
eq("BNC dot sau bi tru 120", slCua("AD0103"), 80);
eq("SPA dot sau duoc cong 120", slCua("AC0200"), 120);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

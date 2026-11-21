/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HÓA ĐƠN THAY THẾ: đi trọn vòng — sổ xuất kho thật → tra cứu → lập thay thế →
 * ghi (giả lập merge của Firestore) → tra cứu lại. Kiểm số lượng, tờ đỏ, lọc,
 * tổng không cộng tờ bị thay thế, và ảnh đi theo chuyến.
 */

import { anhCuaHoaDon, tenGocHoaDon } from "../../anh/anhHoaDon";
import type { AnhChungTu } from "../../anh/moHinh";
import type { Partner, Product, Transaction } from "../../types";
import { nhanNgayGiao } from "../congNo";
import { stableHash } from "../hash";
import { khoaHoaDon, type HoaDonGhiNhan } from "../hoaDon";
import {
  chuyenCuaHoaDon,
  kiemTraThayThe,
  lapThayThe,
  oCanDien,
  type ToHoaDon,
  type YeuCauThayThe,
} from "../hoaDonThayThe";
import { ngayCham } from "../oNgay";
import { nenTraCuu, locTraCuu, type HoaDonDaXuat } from "../traCuuHoaDon";

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
  { id: "spa", name: "SPA", sapCode: "AC0200", type: "AGENT" },
  { id: "fv", name: "FV", sapCode: "AF0100", type: "AGENT" },
];
const products: Product[] = [
  { id: "lon", name: "Bia Lunar 330ml", category: "Lon", materialCode: "10174039" } as unknown as Product,
  { id: "keg", name: "Bia Lager Keg", category: "Lít", materialCode: "10170001" } as unknown as Product,
];
const gd = (p: Partial<Transaction>): Transaction =>
  ({ type: "OUT", status: "completed", createdBy: "x", category: "Lon", ...p }) as Transaction;

const TU = "2026-10-15";
const DEN = "2026-10-21";
const khoa = (maBp: string) => khoaHoaDon(TU, DEN, maBp, stableHash);

const goc: Transaction[] = [
  // Chuyến c1: VINACS của SPA ghi nhầm BNC Ngoại giao.
  gd({ id: "t1", date: "2026-10-16T08:00:00.000Z", productId: "lon", productName: "Bia Lunar 330ml", quantity: 120, partnerId: "bnc-ng", partnerName: "BNC · Ngoại giao", referenceGroupId: "c1" }),
  // Chuyến c2: BNC thật.
  gd({ id: "t2", date: "2026-10-17T08:00:00.000Z", productId: "lon", productName: "Bia Lunar 330ml", quantity: 200, partnerId: "bnc-ng", partnerName: "BNC · Ngoại giao", referenceGroupId: "c2" }),
  gd({ id: "t2b", date: "2026-10-17T08:00:00.000Z", productId: "keg", productName: "Bia Lager Keg", category: "Lít", quantity: 41.2, partnerId: "bnc-ng", partnerName: "BNC · Ngoại giao", referenceGroupId: "c2" }),
  // Chuyến c3: SPA thật.
  gd({ id: "t3", date: "2026-10-18T08:00:00.000Z", productId: "lon", productName: "Bia Lunar 330ml", quantity: 50, partnerId: "spa", partnerName: "SPA", referenceGroupId: "c3" }),
  // Chuyến c4: FV, đợt chưa xuất hóa đơn.
  gd({ id: "t4", date: "2026-10-18T08:00:00.000Z", productId: "lon", productName: "Bia Lunar 330ml", quantity: 10, partnerId: "fv", partnerName: "FV", referenceGroupId: "c4" }),
];
const banGhi = (maBp: string, donVi: string, so: string): HoaDonGhiNhan => ({
  id: khoa(maBp), tuNgay: TU, denNgay: DEN, maBp, donVi, soHoaDon: so, ngayHoaDon: "2026-10-22", ngayKetXuat: "2026-10-21T10:00:00.000Z",
});
const hoaDon0: HoaDonGhiNhan[] = [banGhi("AD0103", "BNC", "C26TKB#01"), banGhi("AC0200", "SPA", "C26TKB#05")];

/* Ghi như Firestore: set(merge) theo id. */
const ghi = (ds: HoaDonGhiNhan[], moi: HoaDonGhiNhan[]) => {
  const m = new Map(ds.map((h) => [h.id, h]));
  moi.forEach((h) => m.set(h.id, { ...(m.get(h.id) || ({} as HoaDonGhiNhan)), ...h }));
  return [...m.values()];
};
const traCuu = (tx: Transaction[], hd: HoaDonGhiNhan[], loai: "" | "thayThe" | "biThayThe" = "") => {
  const nen = nenTraCuu({ hoaDon: hd, transactions: tx, products, partners });
  return { nen, kq: locTraCuu(nen, { loai }) };
};
const toCua = (nen: ReturnType<typeof nenTraCuu>, maBp: string): ToHoaDon | undefined => {
  const ban = nen.daCoSo.find((h) => h.maBp === maBp);
  return ban ? { ban, dong: nen.theoKhoa.get(`${nhanNgayGiao(TU, DEN)}|${maBp}`) || [] } : undefined;
};
const sl = (h?: HoaDonDaXuat) => (h ? Math.round(h.dong.reduce((s, d) => s + d.soLuong, 0) * 10) / 10 : -1);
const soDaCo = (hd: HoaDonGhiNhan[]) => new Set(hd.map((h) => h.soHoaDon.toUpperCase()).filter(Boolean));
const yc0 = (hd: HoaDonGhiNhan[], nen: ReturnType<typeof nenTraCuu>, them: Partial<YeuCauThayThe>): YeuCauThayThe => ({
  goc: toCua(nen, "AD0103")!,
  chuyen: [],
  soMoiGoc: "",
  ngayMoiGoc: "2026-11-21",
  soMoiSang: "",
  ngayMoiSang: "2026-11-21",
  lyDo: "VINACS của SPA ghi nhầm BNC",
  soDaCo: soDaCo(hd),
  luc: "2026-11-21T09:00:00.000Z",
  boi: "ketoan@x",
  bam: stableHash,
  tenDoiTac: (id) => partners.find((p) => p.id === id)?.name || id,
  ngayCham,
  ...them,
});
const sangSpa = (nen: ReturnType<typeof nenTraCuu>) => ({
  partnerId: "spa", maBp: "AC0200", donVi: "SPA", khoa: khoa("AC0200"), to: toCua(nen, "AC0200"),
});

/* ---------------- Ca 1: chuyển một chuyến, cả hai bên đã có hóa đơn ---------------- */
{
  const { nen, kq } = traCuu(goc, hoaDon0);
  eq("truoc: BNC 01 co 361,2", sl(kq.hoaDon.find((h) => h.soHoaDon === "C26TKB#01")), 361.2);
  const gid = new Map(goc.map((t) => [t.id, t]));
  const chuyen = chuyenCuaHoaDon(toCua(nen, "AD0103")!.dong, gid);
  eq("tach chuyen trong to BNC", chuyen.map((c) => [c.ma, c.tongSoLuong]), [["c1", 120], ["c2", 241.2]]);

  const yc = yc0(hoaDon0, nen, { chuyen: [chuyen[0]], sang: sangSpa(nen) });
  eq("o can dien: con hang goc, SPA bat buoc", oCanDien(yc), { conHangGoc: true, soGoc: true, soSang: "batBuoc" });
  eq("thieu so -> chan", kiemTraThayThe(yc) !== "", true);
  eq("so trung -> chan", kiemTraThayThe({ ...yc, soMoiGoc: "c26tkb#05", soMoiSang: "C26TKB#07" }) !== "", true);
  eq("hai so moi trung nhau -> chan", kiemTraThayThe({ ...yc, soMoiGoc: "C26TKB#07", soMoiSang: "C26TKB#07" }) !== "", true);
  eq("ngay moi truoc ngay cu -> chan", kiemTraThayThe({ ...yc, soMoiGoc: "A", soMoiSang: "B", ngayMoiGoc: "2026-10-01" }) !== "", true);
  const du = { ...yc, soMoiGoc: "C26TKB#02", soMoiSang: "C26TKB#06" };
  eq("du thong tin", kiemTraThayThe(du), "");

  const kqTT = lapThayThe(du);
  eq("cap dong cong lai bang 0", kqTT.giaoDich.reduce((s, d) => s + d.quantity, 0), 0);
  eq("cap dong cung ngay giao goc", kqTT.giaoDich.every((d) => d.date.startsWith("2026-10-16")), true);
  eq("cap dong mang chuyen goc", kqTT.giaoDich.every((d) => d.dieuChinh.chungTuGoc === "c1"), true);
  eq("4 ban ghi hoa don (2 ban luu + 2 so moi)", kqTT.hoaDon.length, 4);

  const tx1 = [...goc, ...kqTT.giaoDich.map((d) => gd({ ...d, productName: "Bia Lunar 330ml" }))];
  const hd1 = ghi(hoaDon0, kqTT.hoaDon);
  const sau = traCuu(tx1, hd1).kq;
  const tim = (so: string) => sau.hoaDon.find((h) => h.soHoaDon === so);
  eq("BNC 02 con 241,2", sl(tim("C26TKB#02")), 241.2);
  eq("BNC 02 thay the cho 01", tim("C26TKB#02")?.thayTheCho?.map((x) => x.soHoaDon), ["C26TKB#01"]);
  eq("SPA 06 = 50 + 120", sl(tim("C26TKB#06")), 170);
  eq("SPA 06 thay the cho 05", tim("C26TKB#06")?.thayTheCho?.map((x) => x.soHoaDon), ["C26TKB#05"]);
  eq("01 bi thay the boi 02, giu ban chup 361,2", [tim("C26TKB#01")?.biThayTheBoi?.soHoaDon, sl(tim("C26TKB#01"))], ["C26TKB#02", 361.2]);
  eq("05 bi thay the boi 06", tim("C26TKB#05")?.biThayTheBoi?.soHoaDon, "C26TKB#06");
  eq("tong chi tinh to hieu luc", sau.tong.soHoaDon, 2);
  eq("tong SL khong doi", Math.round(sau.tong.soLuong * 10) / 10, 411.2);
  eq("tep Chot khong co to bi thay the", sau.bang.dong.some((d) => d.soHoaDon === "C26TKB#01"), false);
  eq("loc thay the", traCuu(tx1, hd1, "thayThe").kq.hoaDon.map((h) => h.soHoaDon).sort(), ["C26TKB#02", "C26TKB#06"]);
  eq("loc bi thay the", traCuu(tx1, hd1, "biThayThe").kq.hoaDon.map((h) => h.soHoaDon).sort(), ["C26TKB#01", "C26TKB#05"]);
  eq("tim theo so cu ra ca to moi", locTraCuu(traCuu(tx1, hd1).nen, { tuKhoa: "#01" }).hoaDon.map((h) => h.soHoaDon).sort(), ["C26TKB#01", "C26TKB#02"]);

  // Ảnh đi theo chuyến.
  const anh = (id: string, ct: string): AnhChungTu => ({
    id, url: `https://res.cloudinary.com/x/image/upload/${id}.jpg`, publicId: id, chungTu: [ct], loai: "XUAT", ngay: "2026-10-16", maDoiTac: "", doiTac: "", taiLuc: id, taiBoi: "", uid: "",
  });
  const theoCt = new Map<string, AnhChungTu[]>([["c1", [anh("a1", "c1")]], ["c2", [anh("a2", "c2")]], ["c3", [anh("a3", "c3")]]]);
  const gid1 = new Map(tx1.map((t) => [t.id, t]));
  eq("anh BNC 02: bo anh chuyen ghi nham", anhCuaHoaDon(tim("C26TKB#02")!.dong, gid1, theoCt).map((a) => a.id), ["a2"]);
  eq("anh SPA 06: them anh chuyen ghi nham", anhCuaHoaDon(tim("C26TKB#06")!.dong, gid1, theoCt).map((a) => a.id).sort(), ["a1", "a3"]);
  eq("ten tep to thay the", tenGocHoaDon("C26TKB#02", "BNC", ["C26TKB#01"]), "C26TKB-02_BNC_thay-the-C26TKB-01");

  // Lần sau mở lại tờ 02: chuyến c1 đã chuyển, không hiện nữa.
  const n1 = traCuu(tx1, hd1).nen;
  eq("chuyen da chuyen khong hien lai", chuyenCuaHoaDon(toCua(n1, "AD0103")!.dong, gid1).map((c) => c.ma), ["c2"]);
  eq("so cu nam trong so da co", soDaCo(hd1).has("C26TKB#01"), true);
}

/* ---------------- Ca 2: chuyển hết hàng của tờ gốc, đơn vị đúng chưa có hóa đơn ---------------- */
{
  const tx = goc.filter((t) => t.id === "t1" || t.id === "t4");
  const hd = [banGhi("AD0103", "BNC", "C26TKB#01")];
  const { nen } = traCuu(tx, hd);
  const gid = new Map(tx.map((t) => [t.id, t]));
  const chuyen = chuyenCuaHoaDon(toCua(nen, "AD0103")!.dong, gid);
  const yc = yc0(hd, nen, { chuyen, sang: sangSpa(nen) });
  eq("het hang: khong can so goc, SPA bat buoc", oCanDien(yc), { conHangGoc: false, soGoc: false, soSang: "batBuoc" });
  const kqTT = lapThayThe({ ...yc, soMoiSang: "C26TKB#09" });
  eq("het hang du thong tin", kiemTraThayThe({ ...yc, soMoiSang: "C26TKB#09" }), "");
  const tx1 = [...tx, ...kqTT.giaoDich.map((d) => gd({ ...d }))];
  const hd1 = ghi(hd, kqTT.hoaDon);
  const sau = traCuu(tx1, hd1).kq;
  eq("01 bi thay the boi SPA 09", sau.hoaDon.find((h) => h.soHoaDon === "C26TKB#01")?.biThayTheBoi, {
    soHoaDon: "C26TKB#09", ngayHoaDon: "2026-11-21", donVi: "SPA", maBp: "AC0200", luc: "2026-11-21T09:00:00.000Z", lyDo: "VINACS của SPA ghi nhầm BNC", boi: "ketoan@x",
  });
  eq("SPA 09 thay the cho 01 (BNC)", sau.hoaDon.find((h) => h.soHoaDon === "C26TKB#09")?.thayTheCho?.map((x) => x.donVi), ["BNC"]);
  eq("khoa BNC dot do khong con to nao", hd1.find((h) => h.id === khoa("AD0103"))?.soHoaDon, "");
  eq("khong bao mo coi", sau.thieuDong.length, 0);
}

/* ---------------- Ca 3: chỉ cấp số mới (sai thông tin khác) ---------------- */
{
  const { nen } = traCuu(goc, hoaDon0);
  const yc = yc0(hoaDon0, nen, { soMoiGoc: "C26TKB#03" });
  eq("cap so moi: du", kiemTraThayThe(yc), "");
  const kqTT = lapThayThe(yc);
  eq("cap so moi: khong co dong giao dich", kqTT.giaoDich.length, 0);
  const sau = traCuu(goc, ghi(hoaDon0, kqTT.hoaDon)).kq;
  eq("03 giu nguyen so luong 01", sl(sau.hoaDon.find((h) => h.soHoaDon === "C26TKB#03")), 361.2);
  eq("thieu ly do -> chan", kiemTraThayThe({ ...yc, lyDo: " " }) !== "", true);
}

/* ---------------- Ca 4: đơn vị đúng chưa có hóa đơn, tờ gốc còn hàng → số SPA tùy chọn ---------------- */
{
  const hd = [banGhi("AD0103", "BNC", "C26TKB#01")];
  const { nen } = traCuu(goc, hd);
  const gid = new Map(goc.map((t) => [t.id, t]));
  const chuyen = chuyenCuaHoaDon(toCua(nen, "AD0103")!.dong, gid);
  const yc = yc0(hd, nen, { chuyen: [chuyen[0]], sang: sangSpa(nen), soMoiGoc: "C26TKB#02" });
  eq("SPA tuy chon", oCanDien(yc).soSang, "tuyChon");
  eq("de trong so SPA van duoc", kiemTraThayThe(yc), "");
  const kqTT = lapThayThe(yc);
  eq("de trong: chi ban luu 01 + so 02", kqTT.hoaDon.map((h) => h.soHoaDon), ["C26TKB#01", "C26TKB#02"]);
  eq("bao hang ve Chua xuat", kqTT.tomTat.includes("Chưa xuất hóa đơn"), true);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

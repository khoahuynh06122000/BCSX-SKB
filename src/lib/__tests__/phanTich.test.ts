/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHÂN TÍCH KHO
 *
 * Hai chỗ phải kiểm kỹ nhất:
 *
 * 1. QUY VỀ LÍT. Bia hơi tính theo lít, bia lon theo lon — cộng thẳng vào nhau
 *    là ra một con số vô nghĩa mà vẫn "trông đúng". Mọi tổng đều phải quy đổi
 *    trước, và phép kiểm phải có cả hai loại trong cùng một bộ dữ liệu.
 *
 * 2. KIẾN NGHỊ KHÔNG ĐƯỢC HIỆN OAN. Một kiến nghị sai là bắt người ta đi làm
 *    một việc không cần làm; hiện vài lần như thế là họ bỏ qua cả khối, kể cả
 *    lúc có kiến nghị thật. Nên mỗi kiến nghị đều kiểm cả hai vế: khi nào hiện
 *    VÀ khi nào phải im.
 */

import {
  NGUONG,
  phanTichKho,
  quyRaLit,
  soNgayGiua,
  type LoTon,
} from "../phanTich";
import type { Product, Transaction } from "../../types";

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
const dung = (ten: string, x: boolean) => eq(ten, x, true);

const HOM_NAY = "2026-08-31";

const products: Product[] = [
  { id: "hoi", name: "Bia hơi", category: "Lít", unit: "Lít", price: 0, conversionFactor: 1, capacityPerUnit: 1000 } as Product,
  { id: "lon", name: "Bia lon 330ml", category: "Lon", unit: "Lon", price: 0, conversionFactor: 1, capacityPerUnit: 330 } as Product,
];

let dem = 0;
const tx = (o: Partial<Transaction>): Transaction =>
  ({
    id: `t${++dem}`,
    date: "2026-08-10T08:00:00.000Z",
    type: "OUT",
    productId: "hoi",
    productName: "Bia hơi",
    category: "Lít",
    quantity: 0,
    partnerId: "AD0103-LHB",
    partnerName: "BNC · Lễ Hội Bia",
    createdBy: "test",
    ...o,
  }) as Transaction;

const lo = (o: Partial<LoTon>): LoTon => ({
  productId: "hoi",
  batchNumber: "L1",
  stock: 0,
  importDate: "2026-08-01",
  ...o,
});

const chay = (o: {
  giaoDichTinhTon?: Transaction[];
  giaoDichChoKy?: Transaction[];
  loTon?: LoTon[];
  tuNgay?: string;
  denNgay?: string;
}) =>
  phanTichKho({
    giaoDichTinhTon: o.giaoDichTinhTon ?? [],
    giaoDichChoKy: o.giaoDichChoKy ?? [],
    loTon: o.loTon ?? [],
    products,
    tuNgay: o.tuNgay ?? "2026-08-01",
    denNgay: o.denNgay ?? "2026-08-30",
    homNay: HOM_NAY,
  });

const coKienNghi = (r: ReturnType<typeof chay>, ma: string) =>
  r.kienNghi.some((k) => k.ma === ma);

// ------------------------------------------------------------ tien ich

eq("so ngay giua hai moc", soNgayGiua("2026-08-01", "2026-08-31"), 30);
eq("cung mot ngay", soNgayGiua("2026-08-01", "2026-08-01"), 0);
eq("moc sau nam truoc", soNgayGiua("2026-08-31", "2026-08-01"), -30);
eq("bo qua gio phut", soNgayGiua("2026-08-01T23:00:00Z", "2026-08-02T01:00:00Z"), 1);
eq("chuoi la thi tra ve 0", soNgayGiua("abc", "2026-08-01"), 0);

// QUY VE LIT: 1.000 lon 330ml = 330 lit, khong phai 1.000.
eq("bia hoi giu nguyen", quyRaLit(100, products[0]), 100);
eq("bia lon quy ra lit", quyRaLit(1000, products[1]), 330);
eq("khong biet mat hang thi coi la lit", quyRaLit(50, undefined), 50);
eq("so 0", quyRaLit(0, products[1]), 0);

// ------------------------------------------------------------ thong so

{
  const r = chay({
    giaoDichTinhTon: [
      tx({ type: "OUT", quantity: 300, date: "2026-08-10T08:00:00.000Z", evidencePhotoUrl: "a" }),
      tx({ productId: "lon", category: "Lon", type: "OUT", quantity: 1000, date: "2026-08-11T08:00:00.000Z", evidencePhotoUrl: "a" }),
      tx({ type: "LOSS", quantity: 30, date: "2026-08-12T08:00:00.000Z" }),
      // Ngoai ky: khong duoc tinh vao.
      tx({ type: "OUT", quantity: 9999, date: "2026-09-15T08:00:00.000Z", evidencePhotoUrl: "a" }),
    ],
    loTon: [lo({ stock: 600 }), lo({ productId: "lon", batchNumber: "L2", stock: 1000 })],
  });

  // 600 lit hoi + 1.000 lon × 0,33 = 930 lit.
  eq("ton quy ra lit", r.thongSo.tonLit, 930);
  // 300 + 1.000 × 0,33 = 630 lit.
  eq("xuat quy ra lit", r.thongSo.xuatLit, 630);
  eq("hao hut", r.thongSo.haoHutLit, 30);
  eq("khong tinh giao dich ngoai ky", r.thongSo.xuatLit < 9999, true);
  // Ky 01 den 30 la 30 ngay, tinh ca hai dau bien.
  eq("so ngay trong ky tinh ca hai dau", r.thongSo.soNgayTrongKy, 30);
  eq("xuat moi ngay", r.thongSo.xuatMoiNgayLit, 21);
  // 930 / 21 = 44,3 ngay.
  eq("con du ban", r.thongSo.soNgayConBan, 44.3);
  eq("ty le hao hut", Math.round(r.thongSo.tyLeHaoHut * 1000) / 1000, 0.048);
}

// Ca ky khong xuat lan nao: con du ban KHONG phai vo han ma la "khong tinh
// duoc" — hai thu do phai hien khac nhau.
{
  const r = chay({ loTon: [lo({ stock: 500 })] });
  eq("khong xuat thi khong tinh duoc so ngay", r.thongSo.soNgayConBan, null);
  eq("van biet ton bao nhieu", r.thongSo.tonLit, 500);
}

// ------------------------------------------------------------ con du ban

{
  const r = chay({
    giaoDichTinhTon: [
      // 300 lit trong 30 ngay = 10 lit/ngay; ton 50 -> con 5 ngay.
      tx({ type: "OUT", quantity: 300, evidencePhotoUrl: "a" }),
      // 600 lon trong 30 ngay = 20 lon/ngay; ton 1.000 -> con 50 ngay.
      tx({ productId: "lon", category: "Lon", type: "OUT", quantity: 600, evidencePhotoUrl: "a" }),
    ],
    loTon: [lo({ stock: 50 }), lo({ productId: "lon", batchNumber: "L2", stock: 1000 })],
  });
  const hoi = r.duBan.find((d) => d.productId === "hoi")!;
  const lon = r.duBan.find((d) => d.productId === "lon")!;
  eq("bia hoi con 5 ngay", hoi.soNgayConBan, 5);
  eq("bia lon con 50 ngay", lon.soNgayConBan, 50);
  // GAP NHAT LEN DAU: nguoi xem can thay cai sap het truoc tien.
  eq("gap nhat dung dau", r.duBan[0].productId, "hoi");
  // Mat hang tinh theo DON VI GOC, khong quy ra lit: dat hang thi dat theo lon.
  eq("ton theo don vi goc", lon.ton, 1000);
}

// ------------------------------------------------------------ tuoi lo

{
  const r = chay({
    loTon: [
      lo({ batchNumber: "A", stock: 10, importDate: "2026-08-28" }), // 3 ngay
      lo({ batchNumber: "B", stock: 10, importDate: "2026-08-20" }), // 11 ngay
      lo({ batchNumber: "C", stock: 10, importDate: "2026-08-10" }), // 21 ngay
      lo({ batchNumber: "D", stock: 10, importDate: "2026-06-01" }), // 91 ngay
      // Lo het hang: khong tinh tuoi, no khong con nam trong kho.
      lo({ batchNumber: "E", stock: 0, importDate: "2026-01-01" }),
    ],
  });
  eq(
    "chia dung bon nhom tuoi",
    r.tuoiLo.map((n) => n.soLo),
    [1, 1, 1, 1],
  );
  eq("nhan nhom", r.tuoiLo.map((n) => n.nhan), [
    "0–7 ngày",
    "8–15 ngày",
    "16–30 ngày",
    "Trên 30 ngày",
  ]);
  eq("lo het hang khong duoc dem", r.tuoiLo.reduce((n, o) => n + o.soLo, 0), 4);
  dung("lo qua 30 ngay sinh kien nghi", coKienNghi(r, "lo-ton-lau"));
}

// ------------------------------------------------------------ chung tu

{
  // Don da ghi nhan ma khong co anh nao -> thieu chung tu.
  const thieu = chay({
    giaoDichTinhTon: [
      tx({ referenceGroupId: "g1", type: "OUT", quantity: 100 }),
    ],
    loTon: [lo({ stock: 100 })],
  });
  eq("dem don thieu anh", thieu.thongSo.donThieuAnh, 1);
  dung("sinh kien nghi thieu anh", coKienNghi(thieu, "thieu-anh"));

  // Mot dong trong don co anh la ca don co chung tu — anh gan vao tung dong
  // nhung to bien ban thi chung cho ca chuyen.
  const coAnh = chay({
    giaoDichTinhTon: [
      tx({ referenceGroupId: "g1", type: "OUT", quantity: 100 }),
      tx({ referenceGroupId: "g1", type: "OUT", quantity: 50, evidencePhotoUrls: ["u"] }),
    ],
    loTon: [lo({ stock: 100 })],
  });
  eq("mot dong co anh la ca don co", coAnh.thongSo.donThieuAnh, 0);
  dung("khong sinh kien nghi oan", !coKienNghi(coAnh, "thieu-anh"));

  // Don DANG DI DUONG chua den noi thi chua doi anh duoc.
  const diDuong = chay({
    giaoDichTinhTon: [
      tx({ referenceGroupId: "g2", type: "OUT", quantity: 100, status: "in_transit", date: "2026-08-29T08:00:00.000Z" }),
    ],
    loTon: [lo({ stock: 100 })],
  });
  eq("don di duong chua tinh la thieu anh", diDuong.thongSo.donThieuAnh, 0);
  eq("moi di duong 2 ngay thi chua bao", diDuong.thongSo.donDiDuongLau, 0);

  // Di duong qua lau.
  const lau = chay({
    giaoDichTinhTon: [
      tx({ referenceGroupId: "g3", type: "OUT", quantity: 100, status: "in_transit", date: "2026-08-20T08:00:00.000Z" }),
    ],
    loTon: [lo({ stock: 100 })],
  });
  eq("di duong 11 ngay thi bao", lau.thongSo.donDiDuongLau, 1);
  dung("sinh kien nghi di duong lau", coKienNghi(lau, "di-duong-lau"));
}

// Phieu cho ky.
{
  const moi = chay({
    giaoDichChoKy: [tx({ type: "IN", quantity: 200, slipCode: "PN-01", date: "2026-08-30T08:00:00.000Z" })],
  });
  eq("lit cho ky", moi.thongSo.litChoKy, 200);
  eq("phieu moi thi chua bao lau", moi.thongSo.phieuChoKyLau, 0);
  dung("chua sinh kien nghi", !coKienNghi(moi, "cho-ky-lau"));

  const cu = chay({
    giaoDichChoKy: [tx({ type: "IN", quantity: 200, slipCode: "PN-02", date: "2026-08-10T08:00:00.000Z" })],
  });
  eq("phieu cu thi bao", cu.thongSo.phieuChoKyLau, 1);
  dung("sinh kien nghi cho ky lau", coKienNghi(cu, "cho-ky-lau"));
  // Muc do GAP: hang da ve ma chua vao ton, khong xuat ban duoc.
  eq("cho ky lau la gap", cu.kienNghi.find((k) => k.ma === "cho-ky-lau")?.mucDo, "gap");
}

// ------------------------------------------------------------ kien nghi

// Khong co gi dang noi thi KHONG duoc bia ra kien nghi: bia mot cai cho khoi
// trong la day nguoi dung phot lo ca khoi nay.
{
  const r = chay({
    giaoDichTinhTon: [
      tx({ type: "OUT", quantity: 300, evidencePhotoUrl: "a", date: "2026-08-10T08:00:00.000Z" }),
    ],
    loTon: [lo({ stock: 300, importDate: "2026-08-25" })],
  });
  eq("khong co viec gi thi khong co kien nghi", r.kienNghi.length, 0);
}

// Sap het -> GAP. Ton 20, xuat 300/30 ngay = 10/ngay -> con 2 ngay.
{
  const r = chay({
    giaoDichTinhTon: [tx({ type: "OUT", quantity: 300, evidencePhotoUrl: "a" })],
    loTon: [lo({ stock: 20, importDate: "2026-08-25" })],
  });
  dung("sinh kien nghi sap het", coKienNghi(r, "sap-het"));
  eq("sap het la gap", r.kienNghi[0].mucDo, "gap");
  dung("noi ro viec phai lam", r.kienNghi[0].viecCanLam.length > 10);
  // Con 2 ngay thi KHONG duoc bao "can len ke hoach nhap" nua: mot mat hang chi
  // thuoc dung mot muc.
  dung("khong bao trung hai muc", !coKienNghi(r, "can-nhap"));
}

// Ton qua nhieu: 3.000 lit, xuat 30/30 ngay = 1/ngay -> 3.000 ngay.
{
  const r = chay({
    giaoDichTinhTon: [tx({ type: "OUT", quantity: 30, evidencePhotoUrl: "a" })],
    loTon: [lo({ stock: 3000, importDate: "2026-08-25" })],
  });
  dung("sinh kien nghi ton qua nhieu", coKienNghi(r, "ton-qua-nhieu"));
}

// Mat hang con ton ma ca ky khong xuat.
{
  const r = chay({
    giaoDichTinhTon: [tx({ type: "OUT", quantity: 300, evidencePhotoUrl: "a" })],
    loTon: [
      lo({ stock: 300, importDate: "2026-08-25" }),
      lo({ productId: "lon", batchNumber: "L9", stock: 500, importDate: "2026-08-25" }),
    ],
  });
  dung("sinh kien nghi khong luan chuyen", coKienNghi(r, "khong-luan-chuyen"));
}

// Hao hut vuot nguong.
{
  const r = chay({
    giaoDichTinhTon: [
      tx({ type: "OUT", quantity: 1000, evidencePhotoUrl: "a" }),
      tx({ type: "LOSS", quantity: 50 }),
    ],
    loTon: [lo({ stock: 1000, importDate: "2026-08-25" })],
  });
  dung("hao hut 5% thi bao", coKienNghi(r, "hao-hut-cao"));

  const it = chay({
    giaoDichTinhTon: [
      tx({ type: "OUT", quantity: 1000, evidencePhotoUrl: "a" }),
      tx({ type: "LOSS", quantity: 5 }),
    ],
    loTon: [lo({ stock: 1000, importDate: "2026-08-25" })],
  });
  dung("hao hut 0,5% thi im", !coKienNghi(it, "hao-hut-cao"));
}

// Moi kien nghi deu phai co du ba phan, va xep GAP len truoc.
{
  const r = chay({
    giaoDichTinhTon: [
      tx({ referenceGroupId: "g1", type: "OUT", quantity: 300 }),
    ],
    giaoDichChoKy: [tx({ type: "IN", quantity: 10, slipCode: "PN-9", date: "2026-08-01T08:00:00.000Z" })],
    loTon: [lo({ stock: 20, importDate: "2026-06-01" })],
  });
  dung("co nhieu kien nghi", r.kienNghi.length >= 3);
  dung(
    "kien nghi nao cung co tieu de, chi tiet va viec can lam",
    r.kienNghi.every(
      (k) => k.tieuDe.trim() && k.chiTiet.trim() && k.viecCanLam.trim(),
    ),
  );
  dung("ma kien nghi khong trung", new Set(r.kienNghi.map((k) => k.ma)).size === r.kienNghi.length);
  const thuTu = { gap: 0, canLam: 1, theoDoi: 2 } as const;
  dung(
    "gap xep len truoc",
    r.kienNghi.every(
      (k, i) => i === 0 || thuTu[r.kienNghi[i - 1].mucDo] <= thuTu[k.mucDo],
    ),
  );
}

// ------------------------------------------------------------ top don vi

{
  const r = chay({
    giaoDichTinhTon: [
      tx({ referenceGroupId: "a", partnerName: "BNC · Cầu Vàng", type: "OUT", quantity: 100, evidencePhotoUrl: "u" }),
      tx({ referenceGroupId: "b", partnerName: "BNC · Cầu Vàng", type: "OUT", quantity: 50, evidencePhotoUrl: "u" }),
      tx({ referenceGroupId: "c", partnerName: "FV", type: "OUT", quantity: 400, evidencePhotoUrl: "u" }),
    ],
  });
  eq("xep theo san luong", r.topDonVi.map((o) => o.ten), ["FV", "BNC · Cầu Vàng"]);
  eq("cong dung san luong", r.topDonVi[1].litQuyDoi, 150);
  eq("dem dung so don", r.topDonVi[1].soDon, 2);
}

// Nguong phai la mot bang co ten, khong rai so tran trong ma.
dung("nguong deu la so duong", Object.values(NGUONG).every((v) => v > 0));

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

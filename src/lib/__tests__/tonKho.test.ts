/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TỒN KHO THEO KỲ
 *
 * Phép kiểm quan trọng nhất: **đầu kỳ + nhập − xuất = cuối kỳ**, và **cuối kỳ
 * của cả thời gian = tồn hiện tại**. Hai đẳng thức đó mà sai thì báo cáo vẫn ra
 * số đẹp, vẫn in ra được, và không ai phát hiện cho tới lúc đối chiếu với chứng
 * từ giấy.
 *
 * Chỗ dễ sai thứ hai là BIÊN NGÀY: giao dịch đúng ngày `tuNgay` phải tính vào
 * trong kỳ chứ không phải đầu kỳ, và đúng ngày `denNgay` phải tính vào chứ
 * không bị bỏ. Lệch một ngày ở đây là sai số đầu kỳ của cả kỳ sau.
 */

import { dauCuaLoai, dungBangTonKy, moTaKy } from "../tonKho";
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

const products: Product[] = [
  { id: "p1", name: "Bia Golden Bridge Helles Lager", materialCode: "10168107", category: "Lít", unit: "Lít", price: 0, conversionFactor: 1, capacityPerUnit: 1000, minStock: 100 } as Product,
  { id: "p2", name: "Bia Wings Dark Lager 330ml", materialCode: "10168111", category: "Lon", unit: "Lon", price: 0, conversionFactor: 1, capacityPerUnit: 330 } as Product,
  { id: "p3", name: "Bia Đặc Biệt", materialCode: "10999999", category: "Lít", unit: "Lít", price: 0, conversionFactor: 1, capacityPerUnit: 1000 } as Product,
];

let dem = 0;
const tx = (o: Partial<Transaction>): Transaction =>
  ({
    id: `t${++dem}`,
    date: "2026-08-10T08:00:00.000Z",
    type: "IN",
    productId: "p1",
    productName: "x",
    category: "Lít",
    quantity: 0,
    partnerId: "x",
    partnerName: "x",
    createdBy: "test",
    ...o,
  }) as Transaction;

// ------------------------------------------------------------ dau cua loai

// Phai chep DUNG phan loai cua man hinh chinh: bo sot mot loai GIAM thi ton bao
// cao hon thuc te ma khong co gi bao loi.
eq("nhap kho lam tang", dauCuaLoai("IN"), 1);
eq("ton dau ky lam tang", dauCuaLoai("OPENING"), 1);
eq("xuat kho lam giam", dauCuaLoai("OUT"), -1);
eq("hao hut lam giam", dauCuaLoai("LOSS"), -1);
eq("hang hong lam giam", dauCuaLoai("DAMAGE"), -1);
eq("dieu chinh giam lam giam", dauCuaLoai("ADJUST_OUT"), -1);
eq("loai la khong dung toi ton", dauCuaLoai("ABC"), 0);
eq("chuoi rong khong dung toi ton", dauCuaLoai(""), 0);

// ------------------------------------------------------------ bon con so

const giaoDich: Transaction[] = [
  // TRUOC ky: dồn vào đầu kỳ.
  tx({ date: "2026-07-20T08:00:00.000Z", type: "OPENING", quantity: 500 }),
  tx({ date: "2026-07-25T08:00:00.000Z", type: "OUT", quantity: 100 }),
  // DUNG NGAY BIEN DAU: phai tinh trong ky, khong phai dau ky.
  tx({ date: "2026-08-01T08:00:00.000Z", type: "IN", quantity: 200 }),
  // Trong ky.
  tx({ date: "2026-08-10T08:00:00.000Z", type: "OUT", quantity: 60 }),
  tx({ date: "2026-08-10T08:00:00.000Z", type: "LOSS", quantity: 6 }),
  // DUNG NGAY BIEN CUOI: phai tinh vao.
  tx({ date: "2026-08-25T23:00:00.000Z", type: "IN", quantity: 30 }),
  // SAU ky: bo han, khong vao dau ky cung khong vao trong ky.
  tx({ date: "2026-08-26T08:00:00.000Z", type: "IN", quantity: 999 }),
  // Mat hang khac, de kiem phan tong.
  tx({ productId: "p2", date: "2026-08-05T08:00:00.000Z", type: "IN", quantity: 1200 }),
  tx({ productId: "p2", date: "2026-08-06T08:00:00.000Z", type: "OUT", quantity: 240 }),
];

const b = dungBangTonKy({
  giaoDichTinhTon: giaoDich,
  giaoDichChoKy: [],
  products,
  tuNgay: "2026-08-01",
  denNgay: "2026-08-25",
});

const p1 = b.dong.find((d) => d.productId === "p1")!;
eq("dau ky = 500 - 100", p1.dauKy, 400);
eq("nhap trong ky = 200 + 30", p1.nhap, 230);
eq("xuat ban trong ky", p1.xuatBan, 60);
eq("hao hut trong ky", p1.haoHut, 6);
eq("xuat = xuat ban + hao hut", p1.xuat, 66);
eq("cuoi ky = 400 + 230 - 66", p1.cuoiKy, 564);

// DANG THUC PHAI DUNG VOI MOI DONG. Sai cai nay thi bao cao van ra so dep.
b.dong.forEach((d) => {
  eq(
    `${d.tenHang}: dau ky + nhap - xuat = cuoi ky`,
    d.dauKy + d.nhap - d.xuat,
    d.cuoiKy,
  );
});
eq("tong cung phai dung dang thuc", b.tong.dauKy + b.tong.nhap - b.tong.xuat, b.tong.cuoiKy);

// Giao dich SAU ky khong duoc lot vao dau ky cua ky sau nua — no chi bi bo o
// bang nay thoi.
dung("giao dich sau ky khong lot vao ky", p1.nhap !== 230 + 999);

// ------------------------------------------------------------ bien ngay

{
  // De trong tu ngay: khong co dau ky, moi thu tinh vao trong ky.
  const het = dungBangTonKy({
    giaoDichTinhTon: giaoDich, giaoDichChoKy: [], products,
    tuNgay: "", denNgay: "2026-08-25",
  });
  const x = het.dong.find((d) => d.productId === "p1")!;
  eq("khong chan dau thi dau ky bang 0", x.dauKy, 0);
  eq("nhap gom ca truoc do", x.nhap, 500 + 200 + 30);
  eq("cuoi ky khong doi", x.cuoiKy, p1.cuoiKy);

  // De trong ca hai: cuoi ky chinh la TON HIEN TAI.
  const tatCa = dungBangTonKy({
    giaoDichTinhTon: giaoDich, giaoDichChoKy: [], products,
    tuNgay: "", denNgay: "",
  });
  const y = tatCa.dong.find((d) => d.productId === "p1")!;
  // 500 - 100 + 200 - 60 - 6 + 30 + 999
  eq("cuoi ky ca thoi gian = ton hien tai", y.cuoiKy, 1563);
  eq("khong bo giao dich nao", y.nhap - y.xuat, 1563);
}

// Ngay bien: giao dich dung ngay tuNgay va denNgay deu phai TINH VAO.
{
  const mot = dungBangTonKy({
    giaoDichTinhTon: [
      tx({ date: "2026-08-01T00:00:00.000Z", type: "IN", quantity: 10 }),
      tx({ date: "2026-08-25T23:59:00.000Z", type: "IN", quantity: 20 }),
      tx({ date: "2026-07-31T23:59:00.000Z", type: "IN", quantity: 7 }),
      tx({ date: "2026-08-26T00:00:00.000Z", type: "IN", quantity: 9 }),
    ],
    giaoDichChoKy: [], products, tuNgay: "2026-08-01", denNgay: "2026-08-25",
  });
  const x = mot.dong.find((d) => d.productId === "p1")!;
  eq("hai dau bien deu tinh vao", x.nhap, 30);
  eq("truoc bien mot ngay vao dau ky", x.dauKy, 7);
  eq("sau bien mot ngay bi bo", x.cuoiKy, 37);
}

// ------------------------------------------------------------ cho ky

{
  const c = dungBangTonKy({
    giaoDichTinhTon: [tx({ date: "2026-08-05T08:00:00.000Z", type: "IN", quantity: 100 })],
    giaoDichChoKy: [
      tx({ date: "2026-08-06T08:00:00.000Z", type: "IN", quantity: 80 }),
      // Ngoai ky thi khong dem.
      tx({ date: "2026-09-06T08:00:00.000Z", type: "IN", quantity: 500 }),
    ],
    products, tuNgay: "2026-08-01", denNgay: "2026-08-25",
  });
  const x = c.dong.find((d) => d.productId === "p1")!;
  eq("dem so cho ky trong ky", x.choKy, 80);
  // CHO KY KHONG DUOC CONG VAO TON: cong vao la bo mat lop khoa chu ky.
  eq("cho ky khong cong vao nhap", x.nhap, 100);
  eq("cho ky khong cong vao cuoi ky", x.cuoiKy, 100);
}

// ------------------------------------------------------------ tra cuu

{
  const tim = (q: string) =>
    dungBangTonKy({
      giaoDichTinhTon: [], giaoDichChoKy: [], products,
      tuNgay: "", denNgay: "", tuKhoa: q,
    }).dong.map((d) => d.productId);

  eq("de trong thi lay het", tim("").length, 3);
  eq("tim theo ten", tim("wings"), ["p2"]);
  eq("khong phan biet hoa thuong", tim("WINGS"), ["p2"]);
  eq("tim theo ma vat tu", tim("10168107"), ["p1"]);
  eq("tim theo ma mat hang", tim("p3"), ["p3"]);
  // Bo dau tieng Viet: go khong dau van ra.
  eq("go khong dau van ra", tim("dac biet"), ["p3"]);
  // Chu d phai xu ly rieng, normalize khong tach duoc.
  eq("chu d khong dau", tim("bia dac"), ["p3"]);
  eq("khong khop thi rong", tim("khong co mat hang nay"), []);
}

// ------------------------------------------------------------ tong va canh bao

{
  const t = dungBangTonKy({
    giaoDichTinhTon: [
      tx({ productId: "p1", date: "2026-08-05T08:00:00.000Z", type: "IN", quantity: 50 }),
    ],
    giaoDichChoKy: [], products, tuNgay: "2026-08-01", denNgay: "2026-08-25",
  });
  eq("mot mat hang co phat sinh", t.tong.soMatHangCoPhatSinh, 1);
  // p1 dinh muc 100, cuoi ky 50 -> duoi dinh muc. p2/p3 khong co dinh muc rieng
  // va dinh muc chung mac dinh la 0 nen khong tinh la duoi dinh muc.
  eq("mot mat hang duoi dinh muc", t.tong.soMatHangDuoiDinhMuc, 1);
  eq("khong mat hang nao thi tong bang 0",
    dungBangTonKy({ giaoDichTinhTon: [], giaoDichChoKy: [], products: [], tuNgay: "", denNgay: "" }).tong.cuoiKy,
    0);
}

// Xep mat hang CO PHAT SINH len truoc: mat hang dung im ca ky khong phai thu
// nguoi xem bao cao dang tim.
{
  const x = dungBangTonKy({
    giaoDichTinhTon: [
      tx({ productId: "p3", date: "2026-08-05T08:00:00.000Z", type: "IN", quantity: 1 }),
    ],
    giaoDichChoKy: [], products, tuNgay: "2026-08-01", denNgay: "2026-08-25",
  });
  eq("mat hang co phat sinh dung dau", x.dong[0].productId, "p3");
}

// ------------------------------------------------------------ mo ta ky

eq("ca hai dau", moTaKy("2026-08-01", "2026-08-25"), "Từ 2026-08-01 đến 2026-08-25");
eq("khong chan gi", moTaKy("", ""), "Toàn bộ thời gian");
eq("chi chan cuoi", moTaKy("", "2026-08-25"), "Đến hết 2026-08-25");
eq("chi chan dau", moTaKy("2026-08-01", ""), "Từ 2026-08-01 đến nay");

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

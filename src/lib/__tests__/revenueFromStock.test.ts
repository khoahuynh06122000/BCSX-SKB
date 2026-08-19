/**
 * Chay thu viec sinh doanh thu tu xuat kho.
 *
 * Phep tinh quan trong nhat: tien va thue phai khop voi file cong no cua bo
 * phan. Sai o day thi bao cao doanh thu sai ma khong bao loi gi.
 */
import type { Product, Partner, Transaction } from "../../types";
import { revenueFromStockOut, revenueIdOf } from "../revenueFromStock";

let pass = 0;
let fail = 0;
const eq = (name: string, a: any, b: any) => {
  if (JSON.stringify(a) === JSON.stringify(b)) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(
      `  FAIL ${name}: duoc ${JSON.stringify(a)}, mong ${JSON.stringify(b)}`,
    );
  }
};
const near = (name: string, a: number, b: number, eps = 0.5) => {
  if (Math.abs(a - b) <= eps) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: duoc ${a}, mong ${b}`);
  }
};

const products: Product[] = [
  {
    id: "p1",
    name: "Bia hoi",
    materialCode: "10168107",
    category: "Lít",
    unit: "Lít",
    price: 45000,
    conversionFactor: 1,
    capacityPerUnit: 1000,
  },
  {
    id: "p4",
    name: "Bia lon 330",
    materialCode: "10168110",
    category: "Lon",
    unit: "Lon",
    price: 15833,
    conversionFactor: 1,
    capacityPerUnit: 330,
  },
  {
    id: "p9",
    name: "Bia chua co ma",
    category: "Lít",
    unit: "Lít",
    price: 45000,
    conversionFactor: 1,
    capacityPerUnit: 1000,
  },
  {
    id: "pKet",
    name: "Bia ban theo ket",
    materialCode: "999",
    category: "Lon",
    unit: "Két",
    price: 300000,
    conversionFactor: 24,
    capacityPerUnit: 330,
  },
];

const partners: Partner[] = [
  { id: "AD0103", sapCode: "AD0103", name: "BNC", type: "AGENT" },
];

const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id || "t1",
  date: "2026-08-18T09:30:00.000Z",
  type: "OUT",
  productId: "p1",
  productName: "Bia hoi",
  category: "Lít",
  quantity: 100,
  partnerId: "AD0103",
  partnerName: "BNC",
  createdBy: "test",
  ...over,
});

console.log("\n1. Dong nao duoc tinh la doanh thu");
const honHop: Transaction[] = [
  tx({ id: "ok1" }),
  tx({ id: "dang-di", status: "in_transit" }),
  tx({ id: "nhap", type: "IN" }),
  tx({ id: "hao-hut", type: "LOSS" }),
  tx({ id: "hong", type: "DAMAGE" }),
  tx({ id: "ok2", status: "completed" }),
];
const r1 = revenueFromStockOut({ transactions: honHop, products, partners });
eq(
  "chi xuat kho da giao xong",
  r1.records.map((r) => r.sourceTransactionId),
  ["ok1", "ok2"],
);
eq("hang dang di duong khong thanh doanh thu", r1.records.length, 2);

console.log("\n2. Tien va thue chang SKB -> DNC, hang lit");
const rLit = revenueFromStockOut({
  transactions: [tx({ id: "L", quantity: 3311, productId: "p1" })],
  products,
  partners,
}).records[0];
eq("don gia lit = 30.000", rLit.unitPrice, 30000);
eq("don vi ghi LIT", rLit.unit, "LIT");
eq("thanh tien = 3311 x 30.000", rLit.totalAmount, 99_330_000);
near("doanh thu 511 = thanh tien / 1,65", rLit.revenue511!, 60_200_000, 1);
near("thue TTDB = phan du", rLit.exciseTax!, 39_130_000, 1);
eq("VAT 10% tren thanh tien", rLit.vatAmount, 9_933_000);
eq("tien sau thue = thanh tien + VAT", rLit.amountAfterVat, 109_263_000);
eq("amountBeforeVat trung voi totalAmount", rLit.amountBeforeVat, 99_330_000);

console.log("\n3. Hang lon dung bang gia rieng");
const rLon = revenueFromStockOut({
  transactions: [tx({ id: "N", quantity: 500, productId: "p4", category: "Lon" })],
  products,
  partners,
}).records[0];
eq("don gia lon = 14.000", rLon.unitPrice, 14000);
eq("don vi ghi LON", rLon.unit, "LON");
eq("thanh tien = 500 x 14.000", rLon.totalAmount, 7_000_000);

console.log("\n4. Thong tin tra nguoc ve goc");
eq("khoa suy tu dong xuat kho", rLit.id, revenueIdOf("L"));
eq("giu ma vat tu", rLit.materialCode, "10168107");
eq("giu ma bo phan cua doi tac", rLit.deptCode, "AD0103");
eq("chua phat hanh thi so hoa don de trong", rLit.invoiceNumber, "");
eq("giu ngay cua dong xuat kho", rLit.date, "2026-08-18T09:30:00.000Z");

console.log("\n5. Dong thieu ma vat tu");
const r5 = revenueFromStockOut({
  transactions: [tx({ id: "kho-ma", productId: "p9", quantity: 10 })],
  products,
  partners,
});
eq("van tinh vao doanh thu vi da ban that", r5.records.length, 1);
eq("nhung bi bao la thieu ma", r5.missingMaterialCode.length, 1);
eq("bao dung ten hang", r5.missingMaterialCode[0].productName, "Bia chua co ma");

console.log("\n6. Chot chan don vi kho khac don vi hoa don");
const r6 = revenueFromStockOut({
  transactions: [tx({ id: "ket", productId: "pKet", category: "Lon", quantity: 5 })],
  products,
  partners,
});
eq("bao ngay khi conversionFactor khac 1", r6.unitMismatch.length, 1);
eq("danh muc hien tai khong dinh chot chan nay", r1.unitMismatch.length, 0);

console.log("\n7. Truong hop bien");
eq(
  "khong co giao dich -> khong co dong nao",
  revenueFromStockOut({ transactions: [], products, partners }).records.length,
  0,
);
const rLa = revenueFromStockOut({
  transactions: [tx({ id: "la", productId: "khong-co-trong-danh-muc" })],
  products,
  partners,
}).records[0];
eq("san pham la van ra dong doanh thu", !!rLa, true);
eq("lay ten tu chinh giao dich", rLa.productName, "Bia hoi");
eq(
  "khong truyen danh sach doi tac van chay",
  revenueFromStockOut({ transactions: [tx({ id: "x" })], products }).records
    .length,
  1,
);

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

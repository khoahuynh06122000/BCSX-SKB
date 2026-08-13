/**
 * Chay thu phep tinh doi soat bang du lieu gia.
 *   npx tsx <duong-dan>/test-reconcile.ts
 */
import {
  buildReconciliation,
  summarizeReconciliation,
  litersOf,
  normalizeKey,
  matchRevenueProduct,
  revenueRowLiters,
} from "../reconcile";
import type { Product, Transaction, RevenueRecord } from "../../types";

let pass = 0;
let fail = 0;

const eq = (name: string, actual: any, expected: any) => {
  const a = typeof actual === "number" ? Math.round(actual * 1000) / 1000 : actual;
  const e = typeof expected === "number" ? Math.round(expected * 1000) / 1000 : expected;
  if (a === e) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: duoc ${JSON.stringify(a)}, mong ${JSON.stringify(e)}`);
  }
};

/* ------------------------- danh muc gia ------------------------- */

const P = (over: Partial<Product>): Product => ({
  id: "x",
  name: "X",
  category: "Lít",
  unit: "Lít",
  price: 40000,
  conversionFactor: 1,
  capacityPerUnit: 1000,
  ...over,
});

const products: Product[] = [
  P({ id: "hoi", name: "Bia Golden Bridge Helles Lager", materialCode: "10168107" }),
  P({
    id: "lon",
    name: "Bia Wings Dark Lager 330ml",
    materialCode: "10168111",
    category: "Lon",
    unit: "Lon",
    capacityPerUnit: 330,
  }),
  P({ id: "thieu", name: "Bia Khong Dung Tich", capacityPerUnit: 0 }),
  P({ id: "khac", name: "Bia Rosa Garden Light Lager", materialCode: "10218490" }),
];

const TX = (over: Partial<Transaction>): Transaction => ({
  id: "t",
  date: "2026-08-10T08:00:00.000Z",
  type: "OUT",
  productId: "hoi",
  productName: "Bia Golden Bridge Helles Lager",
  category: "Lít",
  quantity: 0,
  partnerId: "p1",
  partnerName: "Đại lý A",
  createdBy: "test",
  status: "completed",
  ...over,
});

const REV = (over: Partial<RevenueRecord>): RevenueRecord => ({
  id: "r",
  date: "2026-08-10T00:00:00.000Z",
  productName: "Bia Golden Bridge Helles Lager",
  quantity: 0,
  unitPrice: 30000,
  totalAmount: 0,
  partnerName: "Đại lý A",
  ...over,
});

/* ------------------------- 1. ham thuan ------------------------- */

console.log("\n1. Quy doi va khop ten");
eq("100 Lit = 100 L", litersOf(100, products[0]), 100);
eq("240 Lon 330ml = 79.2 L", litersOf(240, products[1]), 79.2);
eq("khong co san pham = 0 L", litersOf(100, undefined), 0);
eq("thieu dung tich = 0 L", litersOf(100, products[2]), 0);

eq("bo dau + hoa thuong", normalizeKey(" Bia HƠI Đặc Biệt "), "biahoidacbiet");
eq(
  "khop bang ma vat tu du ten khac",
  matchRevenueProduct(products, {
    materialCode: "10168111",
    productName: "TEN GHI SAI HOAN TOAN",
  })?.id,
  "lon",
);
eq(
  "khop bang ten khi khong co ma",
  matchRevenueProduct(products, {
    productName: "bia   golden bridge helles lager",
  })?.id,
  "hoi",
);
eq(
  "KHONG khop mo: ten bia hoi khong an vao ten bia lon",
  matchRevenueProduct(products, { productName: "Bia Wings Dark Lager" }),
  undefined,
);

console.log("\n2. Lit theo don vi tren hoa don");
eq(
  "hoa don ghi LON cho SP quan ly theo Lon",
  revenueRowLiters({ quantity: 240, unit: "LON" }, products[1]).liters,
  79.2,
);
eq(
  "hoa don ghi LIT cho SP quan ly theo Lon -> van ra lit dung",
  revenueRowLiters({ quantity: 79.2, unit: "LIT" }, products[1]).liters,
  79.2,
);
eq(
  "co canh bao lech don vi",
  revenueRowLiters({ quantity: 79.2, unit: "LIT" }, products[1]).unitMismatch,
  true,
);
eq(
  "cung don vi thi khong canh bao",
  revenueRowLiters({ quantity: 240, unit: "LON" }, products[1]).unitMismatch,
  false,
);
eq(
  "khong ghi don vi -> theo don vi kho",
  revenueRowLiters({ quantity: 10, unit: "" }, products[1]).liters,
  3.3,
);

/* ------------------------- 3. bang doi soat ------------------------- */

console.log("\n3. Bang doi soat");

const rows = buildReconciliation({
  products,
  transactions: [
    // khop tuyet doi
    TX({ id: "t1", productId: "hoi", quantity: 100 }),
    // bia lon: xuat 240 lon, hoa don chi 200 lon -> thieu
    TX({
      id: "t2",
      productId: "lon",
      productName: "Bia Wings Dark Lager 330ml",
      quantity: 240,
    }),
    // xuat nhung khong co hoa don
    TX({
      id: "t3",
      productId: "khac",
      productName: "Bia Rosa Garden Light Lager",
      quantity: 50,
    }),
    // don di duong: PHAI bi loai khoi doi soat
    TX({ id: "t4", productId: "hoi", quantity: 999, status: "in_transit" }),
    // phieu nhap: khong lien quan
    TX({ id: "t5", productId: "hoi", quantity: 500, type: "IN" }),
    // san pham thieu dung tich
    TX({
      id: "t6",
      productId: "thieu",
      productName: "Bia Khong Dung Tich",
      quantity: 10,
    }),
  ],
  revenue: [
    REV({ id: "r1", quantity: 100, unit: "LIT", totalAmount: 3_000_000, invoiceNumber: "HD01" }),
    REV({
      id: "r2",
      productName: "Bia Wings Dark Lager 330ml",
      quantity: 200,
      unit: "LON",
      totalAmount: 2_800_000,
      invoiceNumber: "HD02",
    }),
    // hoa don khong co phieu xuat
    REV({
      id: "r3",
      productName: "Bia Khong Co Trong Danh Muc",
      quantity: 30,
      unit: "LIT",
      totalAmount: 900_000,
      invoiceNumber: "HD03",
    }),
    REV({
      id: "r4",
      productName: "Bia Khong Dung Tich",
      quantity: 10,
      unit: "",
      totalAmount: 400_000,
      invoiceNumber: "HD04",
    }),
  ],
});

const byId = (k: string) => rows.find((r) => r.key === k)!;

eq("don di duong khong tinh vao xuat kho", byId("hoi").exportLiters, 100);
eq("phieu nhap khong tinh vao xuat kho", byId("hoi").exportQty, 100);
eq("dong khop tuyet doi -> ok", byId("hoi").status, "ok");
eq("doanh thu gom dung", byId("hoi").revenueAmount, 3_000_000);

const lon = byId("lon");
eq("bia lon: xuat 240 lon = 79.2 L", lon.exportLiters, 79.2);
eq("bia lon: hoa don 200 lon = 66 L", lon.revenueLiters, 66);
eq("bia lon: lech 13.2 L", lon.diffLiters, 13.2);
eq("bia lon: thieu hoa don", lon.status, "under");
eq("bia lon: % ra hoa don", Math.round(lon.matchPercentage), 83);

eq("xuat ma khong hoa don", byId("khac").status, "no-invoice");
eq("hoa don la -> chua khop danh muc", rows.find((r) => r.key.startsWith("rev:"))!.status, "unmatched");
eq("SP thieu dung tich", byId("thieu").status, "no-capacity");
eq("dem so hoa don lien quan", byId("hoi").invoiceCount, 1);

console.log("\n4. Nguong bo qua 1%");
const tol = buildReconciliation({
  products,
  transactions: [TX({ productId: "hoi", quantity: 1000 })],
  revenue: [REV({ quantity: 995, unit: "LIT", totalAmount: 1, invoiceNumber: "H" })],
});
eq("lech 5 L tren 1000 L -> coi la khop", tol[0].status, "ok");

const tol2 = buildReconciliation({
  products,
  transactions: [TX({ productId: "hoi", quantity: 1000 })],
  revenue: [REV({ quantity: 970, unit: "LIT", totalAmount: 1, invoiceNumber: "H" })],
});
eq("lech 30 L tren 1000 L -> bao thieu", tol2[0].status, "under");

console.log("\n5. Diem khop tong");
const sum = summarizeReconciliation(rows);
eq("dem dong chua khop danh muc", sum.unmatchedCount, 1);
eq("dem dong thieu dung tich", sum.noCapacityCount, 1);
// Chi 3 dong doi soat duoc: hoi (100/100), lon (79.2/66), khac (50/0)
eq("so dong doi soat duoc", sum.scorableCount, 3);
eq("tong xuat kho (lit)", sum.totalExportLiters, 229.2);
eq("tong hoa don (lit)", sum.totalRevenueLiters, 166);
eq("san luong nghi thieu hoa don", sum.missingInvoiceLiters, 63.2);
eq(
  "diem khop = 100 - 63.2/229.2*100",
  Math.round(sum.score * 100) / 100,
  Math.round((100 - (63.2 / 229.2) * 100) * 100) / 100,
);
eq("tong doanh thu gom ca dong loi", sum.totalRevenueAmount, 7_100_000);

console.log("\n6. Khong co du lieu");
const empty = summarizeReconciliation(buildReconciliation({ products, transactions: [], revenue: [] }));
eq("khong co gi -> 100 diem", empty.score, 100);
eq("khong co dong nao", empty.scorableCount, 0);

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

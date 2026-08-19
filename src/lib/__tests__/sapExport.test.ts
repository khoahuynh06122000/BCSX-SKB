/**
 * Chay thu phan loi cua viec xuat hoa don len SAP.
 *
 * Phep quan trong nhat: KHONG duoc chon lai dong da xuat o lenh khac. Xuat trung
 * la phat hanh hai hoa don cho cung mot lan ban, sua bang bien ban voi co quan
 * thue chu khong bam Undo duoc.
 */
import type { Product, Transaction } from "../../types";
import {
  alreadySentIds,
  billableTransactions,
  buildSapJobFile,
  canTransition,
  isJobOpen,
  pickRowsForPeriod,
  sapJobFileName,
  sapJobId,
  summarizeSapRows,
  transactionToSapRow,
  type SapJobStatus,
  type SapSourceRow,
} from "../sapExport";

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

const row = (over: Partial<SapSourceRow>): SapSourceRow => ({
  id: over.id || "r1",
  date: "2026-08-15T00:00:00.000Z",
  productName: "Bia Golden Bridge Helles Lager",
  materialCode: "10168107",
  partnerName: "BNC",
  partnerId: "BNC",
  quantity: 100,
  unitPrice: 30000,
  amountBeforeVat: 3000000,
  vatAmount: 300000,
  amountAfterVat: 3300000,
  ...over,
});

console.log("\n1. Trang thai nao con hieu luc");
const statuses: SapJobStatus[] = [
  "queued",
  "running",
  "awaiting_approval",
  "done",
  "failed",
  "cancelled",
];
eq(
  "queued/running/cho duyet/xong = con hieu luc",
  statuses.filter(isJobOpen),
  ["queued", "running", "awaiting_approval", "done"],
);
eq("da huy -> khong con hieu luc", isJobOpen("cancelled"), false);
eq("loi -> khong con hieu luc", isJobOpen("failed"), false);

console.log("\n2. Chuyen trang thai");
eq("cho chay -> dang nap", canTransition("queued", "running"), true);
eq("dang nap -> cho nguoi duyet", canTransition("running", "awaiting_approval"), true);
eq("cho nguoi duyet -> xong", canTransition("awaiting_approval", "done"), true);
// Giai doan 1: script khong tu bao trang thai, nen di thang tu cho chay sang
// cho nguoi duyet khi nguoi dung xac nhan da nap tep len SAP.
eq("cho chay -> cho nguoi duyet: duoc", canTransition("queued", "awaiting_approval"), true);
eq("cho chay -> xong luon: KHONG", canTransition("queued", "done"), false);
eq("dang nap -> xong luon: KHONG", canTransition("running", "done"), false);
// Diem dung: hoa don ngoai SAP khong bien mat theo trang thai trong app.
eq("da xong -> quay lai: KHONG", canTransition("done", "queued"), false);
eq("da xong -> huy: KHONG", canTransition("done", "cancelled"), false);
eq("da huy -> chay lai: KHONG", canTransition("cancelled", "running"), false);
eq("cho nguoi duyet -> huy: KHONG", canTransition("awaiting_approval", "cancelled"), false);
eq("cho nguoi duyet -> loi: duoc", canTransition("awaiting_approval", "failed"), true);

console.log("\n3. Dong nao da xuat roi");
const jobs = [
  { status: "done" as SapJobStatus, sourceIds: ["a", "b"] },
  { status: "queued" as SapJobStatus, sourceIds: ["c"] },
  { status: "awaiting_approval" as SapJobStatus, sourceIds: ["d"] },
  { status: "cancelled" as SapJobStatus, sourceIds: ["e"] },
  { status: "failed" as SapJobStatus, sourceIds: ["f"] },
];
const sent = alreadySentIds(jobs);
eq("gom dong cua lenh con hieu luc", [...sent].sort(), ["a", "b", "c", "d"]);
eq("lenh da huy -> dong duoc chon lai", sent.has("e"), false);
eq("lenh loi -> dong duoc chon lai", sent.has("f"), false);
eq("khong co lenh nao", alreadySentIds([]).size, 0);

console.log("\n4. Chon dong theo ky");
const rows = [
  row({ id: "t7", date: "2026-07-31T10:00:00.000Z" }),
  row({ id: "t8a", date: "2026-08-01T00:00:00.000Z" }),
  row({ id: "t8b", date: "2026-08-15T09:00:00.000Z" }),
  row({ id: "t8c", date: "2026-08-31T23:59:00.000Z" }),
  row({ id: "t9", date: "2026-09-01T00:00:00.000Z" }),
];
const picked = pickRowsForPeriod(rows, "2026-08-01", "2026-08-31", new Set());
eq(
  "bao trum ca hai dau ky, bo thang truoc va thang sau",
  picked.rows.map((r) => r.id),
  ["t8a", "t8b", "t8c"],
);
eq("khong co dong nao bi bo", picked.skipped.length, 0);

const picked2 = pickRowsForPeriod(
  rows,
  "2026-08-01",
  "2026-08-31",
  new Set(["t8b"]),
);
eq("dong da xuat bi loai", picked2.rows.map((r) => r.id), ["t8a", "t8c"]);
eq("va duoc bao rieng ra", picked2.skipped.map((r) => r.id), ["t8b"]);
eq(
  "hai danh sach cong lai = so dong trong ky",
  picked2.rows.length + picked2.skipped.length,
  3,
);

// Ngay cuoi thang ghi gio UTC muon: cat 10 ky tu dau nen van thuoc thang 8,
// khong bi day sang thang 9 nhu khi di qua new Date().
eq(
  "31/08 gio UTC muon van nam trong ky thang 8",
  pickRowsForPeriod([row({ id: "x", date: "2026-08-31T18:30:00.000Z" })], "2026-08-01", "2026-08-31", new Set()).rows.length,
  1,
);
eq(
  "ngay dang yyyy-MM-dd tran (khong co gio) van doc duoc",
  pickRowsForPeriod([row({ id: "y", date: "2026-08-10" })], "2026-08-01", "2026-08-31", new Set()).rows.length,
  1,
);

console.log("\n5. Cong so truoc khi tao lenh");
const sum = summarizeSapRows([
  row({ id: "s1", amountBeforeVat: 1000, vatAmount: 100, amountAfterVat: 1100, quantity: 10, partnerId: "P1" }),
  row({ id: "s2", amountBeforeVat: 2000, vatAmount: 200, amountAfterVat: 2200, quantity: 20, partnerId: "P2" }),
  row({ id: "s3", amountBeforeVat: 3000, vatAmount: 300, amountAfterVat: 3300, quantity: 30, partnerId: "P1" }),
]);
eq("dem dong", sum.count, 3);
eq("tien truoc thue", sum.totalBeforeVat, 6000);
eq("tien thue", sum.totalVat, 600);
eq("tien sau thue", sum.totalAfterVat, 6600);
eq("san luong", sum.totalQuantity, 60);
eq("dem doi tac khong trung", sum.partnerCount, 2);
eq("khong dong nao thieu ma vat tu", sum.missingMaterialCode, 0);

eq(
  "thieu ma vat tu thi dem rieng",
  summarizeSapRows([
    row({ id: "m1", materialCode: "" }),
    row({ id: "m2", materialCode: "   " }),
    row({ id: "m3", materialCode: undefined }),
    row({ id: "m4", materialCode: "10168107" }),
  ]).missingMaterialCode,
  3,
);

eq(
  "thieu tien sau thue thi tu cong truoc thue + thue",
  summarizeSapRows([
    row({ id: "n1", amountBeforeVat: 5000, vatAmount: 500, amountAfterVat: undefined }),
  ]).totalAfterVat,
  5500,
);
eq("danh sach rong", summarizeSapRows([]).count, 0);
eq("danh sach rong -> tien 0", summarizeSapRows([]).totalBeforeVat, 0);

console.log("\n6. Khoa lenh xuat");
eq("cung tap dong -> cung khoa", sapJobId(["a", "b", "c"]), sapJobId(["a", "b", "c"]));
eq(
  "doi thu tu khong doi khoa (bam lai khong tao lenh moi)",
  sapJobId(["c", "a", "b"]),
  sapJobId(["a", "b", "c"]),
);
eq(
  "them mot dong -> khoa khac",
  sapJobId(["a", "b", "c"]) === sapJobId(["a", "b", "c", "d"]),
  false,
);
eq("khoa khong chua ky tu Firestore cam", /^[a-z0-9-]+$/.test(sapJobId(["a"])), true);

console.log("\n7. Ten tep tai ve");
const fname = sapJobFileName("sap-abc123", "2026-08-01", "2026-08-31");
eq("co ky trong ten tep", fname.includes("2026-08-01_2026-08-31"), true);
eq("duoi .json", fname.endsWith(".json"), true);
eq("khong co ky tu Windows cam trong ten tep", /[\\/:*?"<>|]/.test(fname), false);

console.log("\n8. Noi dung tep giao cho script");
const file = buildSapJobFile({
  jobId: "sap-abc",
  createdAt: "2026-08-19T03:00:00.000Z",
  createdBy: "khoahd@banahills.com.vn",
  from: "2026-08-01",
  to: "2026-08-31",
  rows: [row({ id: "f1" }), row({ id: "f2" })],
});
eq("co danh dau khuon tep", file.schema, "bcsx-sap-job/1");
eq("giu du so dong", file.rows.length, 2);
eq("kem so tong da cong san", file.summary.count, 2);
eq("kem ky", file.period, { from: "2026-08-01", to: "2026-08-31" });
eq(
  "doc lai duoc sau khi qua JSON",
  JSON.parse(JSON.stringify(file)).rows[1].id,
  "f2",
);

console.log("\n9. Dong xuat kho nao duoc len hoa don");
const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id || "t1",
  date: "2026-08-14T00:00:00.000Z",
  type: "OUT",
  productId: "P1",
  productName: "Bia hoi Ba Na",
  category: "Lít",
  quantity: 20,
  partnerId: "BNC",
  partnerName: "Nha hang BNC",
  createdBy: "test",
  ...over,
});

const all: Transaction[] = [
  tx({ id: "ok1" }),
  tx({ id: "ok2", status: "completed" }),
  tx({ id: "dangdi", status: "in_transit" }),
  tx({ id: "nhap", type: "IN" }),
  tx({ id: "daudky", type: "OPENING" }),
  tx({ id: "haohut", type: "LOSS" }),
  tx({ id: "hong", type: "DAMAGE" }),
];
eq(
  "chi xuat kho da giao xong",
  billableTransactions(all).map((t) => t.id),
  ["ok1", "ok2"],
);
// Hang dang tren duong chua giao xong: xuat hoa don truoc la xuat cho viec chua
// hoan thanh.
eq(
  "hang dang van chuyen bi loai",
  billableTransactions(all).some((t) => t.id === "dangdi"),
  false,
);

console.log("\n10. Chuyen dong xuat kho sang dong cho xuat hoa don");
const prod: Product = {
  id: "P1",
  name: "Bia hoi Ba Na",
  materialCode: "10168107",
  category: "Lít",
  unit: "Bom",
  price: 600000,
  capacityPerUnit: 20000,
};
const mapped = transactionToSapRow(tx({ id: "x1", quantity: 20 }), prod);
eq("giu khoa dong goc", mapped.id, "x1");
eq("lay ma vat tu tu danh muc", mapped.materialCode, "10168107");
eq("lay don vi tu danh muc", mapped.unit, "Bom");
eq("giu nguyen so luong theo don vi kho", mapped.quantity, 20);
eq("tien truoc thue = so luong x don gia", mapped.amountBeforeVat, 12000000);
eq("danh dau don gia la tam tinh", mapped.priceEstimated, true);
eq("khong tu dat thue", mapped.vatAmount, undefined);
eq("giu so lo", transactionToSapRow(tx({ batchNumber: "LOT-1408-H" }), prod).batchNumber, "LOT-1408-H");

// Khong tim thay san pham trong danh muc: khong duoc no ra NaN, va phai lo ra
// la thieu ma vat tu de bi chan truoc khi xuat.
const noProd = transactionToSapRow(tx({ id: "x2" }), undefined);
eq("khong co san pham -> don gia 0", noProd.unitPrice, 0);
eq("khong co san pham -> tien 0 chu khong NaN", noProd.amountBeforeVat, 0);
eq("khong co san pham -> thieu ma vat tu", noProd.materialCode, undefined);
eq(
  "va bi dem vao dong thieu ma vat tu",
  summarizeSapRows([noProd]).missingMaterialCode,
  1,
);

console.log("\n11. Cong so khi de SAP tinh thue");
const outSum = summarizeSapRows([
  transactionToSapRow(tx({ id: "s1", quantity: 10 }), prod),
  transactionToSapRow(tx({ id: "s2", quantity: 5 }), prod),
]);
eq("khong dong nao co thue", outSum.rowsWithVat, 0);
eq("moi dong deu la don gia tam tinh", outSum.estimatedPriceRows, 2);
eq("tien truoc thue cong dung", outSum.totalBeforeVat, 9000000);
eq("thue = 0 vi de SAP tinh", outSum.totalVat, 0);

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

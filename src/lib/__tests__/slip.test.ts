/**
 * Chay thu ma phieu nhap kho va viec duyet so lieu bang chu ky.
 *
 * Phep tinh quan trong nhat o day: hang da dien nhung chua co anh phieu ky thi
 * KHONG duoc cong vao ton kho. Sai o day thi ton kho sai ma khong bao loi gi.
 */
import type { ImportSlip, Transaction } from "../../types";
import {
  approvedSlipCodes,
  isCountedInStock,
  needsSlipApproval,
  nextSlipCode,
  parseSlipCode,
  pendingSlipTransactions,
  pendingStockByProduct,
  slipPrefixForDate,
  stockTransactions,
} from "../slip";

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
const throws = (name: string, fn: () => unknown) => {
  try {
    fn();
    fail++;
    console.log(`  FAIL ${name}: dang le phai bao loi ma lai chay qua`);
  } catch {
    pass++;
    console.log(`  OK   ${name}`);
  }
};

/** Dung mot giao dich du truong bat buoc, chi doi phan can thu. */
const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id || "t-" + Math.random().toString(36).slice(2),
  date: "2026-08-18T09:30:00.000Z",
  type: "IN",
  productId: "P1",
  productName: "Bia hoi Ba Na",
  category: "Lít",
  quantity: 100,
  partnerId: "SKB-BNC",
  partnerName: "Nha may bia",
  createdBy: "test",
  ...over,
});

const slip = (code: string, photos: string[]): ImportSlip => ({
  id: code,
  code,
  date: parseSlipCode(code)?.dateKey || "2026-08-18",
  status: photos.length ? "signed" : "printed",
  signedPhotoUrls: photos,
});

console.log("\n1. Tien to ma phieu theo ngay");
eq("ngay thuong", slipPrefixForDate("2026-08-18"), "PN-260818");
eq("mung 1 thang 1 khong bi lui ngay", slipPrefixForDate("2026-01-01"), "PN-260101");
eq("ngay cuoi nam", slipPrefixForDate("2026-12-31"), "PN-261231");
throws("ngay sai dang thi bao loi", () => slipPrefixForDate("18/08/2026"));
throws("chuoi rong thi bao loi", () => slipPrefixForDate(""));

console.log("\n2. Doc ma phieu");
eq("doc duoc ngay va so tt", parseSlipCode("PN-260818-02"), {
  dateKey: "2026-08-18",
  seq: 2,
});
eq("so tt 3 chu so", parseSlipCode("PN-260818-100"), {
  dateKey: "2026-08-18",
  seq: 100,
});
eq("co khoang trang hai dau van doc duoc", parseSlipCode("  PN-260818-01 "), {
  dateKey: "2026-08-18",
  seq: 1,
});
eq("ma cu chi co ngay (chua co so tt) -> khong hop le", parseSlipCode("PN-260818"), null);
eq("so tt 00 -> khong hop le", parseSlipCode("PN-260818-00"), null);
eq("rac -> null", parseSlipCode("xxx"), null);
eq("undefined -> null", parseSlipCode(undefined), null);
eq("rong -> null", parseSlipCode(""), null);

console.log("\n3. Cap ma phieu ke tiep");
eq("ngay chua co phieu nao", nextSlipCode("2026-08-18", []), "PN-260818-01");
eq(
  "da co 01 -> cap 02",
  nextSlipCode("2026-08-18", ["PN-260818-01"]),
  "PN-260818-02",
);
eq(
  "da co 01 va 02 -> cap 03",
  nextSlipCode("2026-08-18", ["PN-260818-01", "PN-260818-02"]),
  "PN-260818-03",
);
// Cho quan trong: xoa phieu roi thi KHONG duoc cap lai ma cu, vi anh ky cua
// phieu cu se dinh vao lo hang khac.
eq(
  "phieu 01,02 bi xoa chi con 03 -> cap 04 chu khong cap 02",
  nextSlipCode("2026-08-18", ["PN-260818-03"]),
  "PN-260818-04",
);
eq(
  "phieu ngay khac khong tinh vao",
  nextSlipCode("2026-08-18", ["PN-260817-05", "PN-260819-09"]),
  "PN-260818-01",
);
eq(
  "ma rac khong lam sai phep dem",
  nextSlipCode("2026-08-18", ["PN-260818-01", "rac", "", "PN-260818"]),
  "PN-260818-02",
);
eq(
  "khong xet thu tu truyen vao",
  nextSlipCode("2026-08-18", ["PN-260818-05", "PN-260818-02"]),
  "PN-260818-06",
);

console.log("\n4. Phieu nao coi la da duyet");
const slips: ImportSlip[] = [
  slip("PN-260818-01", ["https://anh/1.jpg"]),
  slip("PN-260818-02", []),
  slip("PN-260817-01", ["https://anh/2.jpg", "https://anh/3.jpg"]),
];
const approved = approvedSlipCodes(slips);
eq("chi phieu co anh ky duoc duyet", [...approved].sort(), [
  "PN-260817-01",
  "PN-260818-01",
]);
eq("phieu da in nhung chua co anh -> chua duyet", approved.has("PN-260818-02"), false);
eq(
  "phieu khong co truong anh -> chua duyet",
  approvedSlipCodes([
    { id: "PN-260901-01", code: "PN-260901-01", date: "2026-09-01", status: "printed" },
  ]).size,
  0,
);

console.log("\n5. Giao dich nao can chu ky");
eq("nhap tay co ma phieu -> can ky", needsSlipApproval(tx({ slipCode: "PN-260818-01" })), true);
eq("nhap khong co ma phieu (dong bo Excel) -> mien", needsSlipApproval(tx({})), false);
eq(
  "ton dau ky -> mien du co ma phieu",
  needsSlipApproval(tx({ type: "OPENING", slipCode: "PN-260818-01" })),
  false,
);
eq("xuat kho -> khong lien quan", needsSlipApproval(tx({ type: "OUT" })), false);
eq("hao hut -> khong lien quan", needsSlipApproval(tx({ type: "LOSS" })), false);

console.log("\n6. Giao dich nao vao ton kho");
eq(
  "nhap thuoc phieu da ky -> vao ton",
  isCountedInStock(tx({ slipCode: "PN-260818-01" }), approved),
  true,
);
eq(
  "nhap thuoc phieu chua ky -> CHUA vao ton",
  isCountedInStock(tx({ slipCode: "PN-260818-02" }), approved),
  false,
);
eq(
  "nhap thuoc phieu khong ton tai -> CHUA vao ton",
  isCountedInStock(tx({ slipCode: "PN-991231-01" }), approved),
  false,
);
eq("nhap mien ky -> vao ton", isCountedInStock(tx({}), approved), true);
eq(
  "xuat kho luon tru ton du phieu the nao",
  isCountedInStock(tx({ type: "OUT", slipCode: "PN-260818-02" }), approved),
  true,
);

console.log("\n7. Canh thuc te: mot ngay giao hai dot, chi ky mot dot");
const ngay18: Transaction[] = [
  tx({ id: "a1", slipCode: "PN-260818-01", quantity: 500 }),
  tx({ id: "a2", slipCode: "PN-260818-01", quantity: 300 }),
  tx({ id: "b1", slipCode: "PN-260818-02", quantity: 900 }),
  tx({ id: "x1", type: "OUT", slipCode: undefined, quantity: 200 }),
];
const counted = stockTransactions(ngay18, approved);
const pending = pendingSlipTransactions(ngay18, approved);
eq(
  "chi dot da ky va dong xuat duoc tinh",
  counted.map((t) => t.id).sort(),
  ["a1", "a2", "x1"],
);
eq("dot chua ky nam o muc cho duyet", pending.map((t) => t.id), ["b1"]);
eq(
  "ton = 500 + 300 - 200, khong cong 900 cua dot chua ky",
  counted.reduce((s, t) => s + (t.type === "OUT" ? -t.quantity : t.quantity), 0),
  600,
);
eq(
  "hai danh sach cong lai bang danh sach goc, khong mat dong nao",
  counted.length + pending.length,
  ngay18.length,
);

console.log("\n8. Ky them dot con lai thi so tu len");
const approved2 = approvedSlipCodes([
  ...slips.filter((s) => s.code !== "PN-260818-02"),
  slip("PN-260818-02", ["https://anh/4.jpg"]),
]);
eq(
  "ky xong ca hai dot -> ton = 500+300+900-200",
  stockTransactions(ngay18, approved2).reduce(
    (s, t) => s + (t.type === "OUT" ? -t.quantity : t.quantity),
    0,
  ),
  1500,
);
eq("khong con dong nao cho duyet", pendingSlipTransactions(ngay18, approved2).length, 0);

console.log("\n9. Go het anh thi so lieu quay ve cho duyet");
const approved3 = approvedSlipCodes([slip("PN-260818-01", [])]);
eq(
  "phieu bi go het anh -> hang roi khoi ton",
  isCountedInStock(tx({ slipCode: "PN-260818-01" }), approved3),
  false,
);


console.log("\n10. So luong dang cho ky, tach theo tung mat hang");
const nhieuMatHang: Transaction[] = [
  // Phieu 01 da ky -> khong duoc coi la dang cho
  tx({ id: "c1", slipCode: "PN-260818-01", productId: "P1", quantity: 500 }),
  // Phieu 02 chua ky: hai dong cung mat hang phai cong lai
  tx({ id: "c2", slipCode: "PN-260818-02", productId: "P1", quantity: 900 }),
  tx({ id: "c3", slipCode: "PN-260818-02", productId: "P1", quantity: 100 }),
  // ... va mot mat hang khac phai dung rieng
  tx({ id: "c4", slipCode: "PN-260818-02", productId: "P2", quantity: 40 }),
  // Dong xuat khong can chu ky nen khong bao gio nam trong muc cho
  tx({ id: "c5", type: "OUT", slipCode: undefined, productId: "P1", quantity: 200 }),
];
const cho = pendingStockByProduct(nhieuMatHang, approved);
eq("cong dung hai dong cung mat hang", cho.get("P1"), 1000);
eq("mat hang khac dung rieng", cho.get("P2"), 40);
eq("chi co hai mat hang dang cho", [...cho.keys()].sort(), ["P1", "P2"]);
eq(
  "so cho ky KHONG cong vao ton: ton van la 500 - 200",
  stockTransactions(nhieuMatHang, approved).reduce(
    (s, t) => s + (t.type === "OUT" ? -t.quantity : t.quantity),
    0,
  ),
  300,
);

console.log("\n11. Ky xong thi mat hang roi khoi muc cho");
const choSauKhiKy = pendingStockByProduct(nhieuMatHang, approved2);
eq("khong con mat hang nao cho ky", choSauKhiKy.size, 0);
eq("hoi mat hang cu -> khong co so", choSauKhiKy.get("P1"), undefined);

console.log("\n12. Truong hop bien");
eq("danh sach rong -> map rong", pendingStockByProduct([], approved).size, 0);
eq(
  "dong thieu ma mat hang thi bo qua, khong tao khoa rong",
  [
    ...pendingStockByProduct(
      [tx({ id: "d1", slipCode: "PN-260818-02", productId: "", quantity: 70 })],
      approved,
    ).keys(),
  ],
  [],
);

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

/**
 * Chay thu khoa chong trung dong doanh thu.
 */
import {
  revenueDocId,
  revenueSignature,
  stableHash,
} from "../revenueKey";

let pass = 0;
let fail = 0;
const eq = (name: string, a: any, b: any) => {
  if (a === b) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: duoc ${JSON.stringify(a)}, mong ${JSON.stringify(b)}`);
  }
};
const ne = (name: string, a: any, b: any) => {
  if (a !== b) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: hai gia tri lai giong nhau (${a})`);
  }
};

const base = {
  date: "2026-05-14T00:00:00.000Z",
  invoiceNumber: "C26TKB#00000093",
  materialCode: "10168107",
  productName: "Bia Golden Bridge Helles Lager",
  partnerName: "BNC",
  quantity: 13805.1,
  unitPrice: 30000,
  totalAmount: 414153000,
};

console.log("\n1. On dinh (nap lai cung file phai ra cung khoa)");
eq("goi 2 lan ra cung khoa", revenueDocId(base), revenueDocId(base));
eq(
  "co gio phut khac nhau nhung cung ngay -> cung khoa",
  revenueDocId(base),
  revenueDocId({ ...base, date: "2026-05-14T17:45:33.000Z" }),
);
eq(
  "ngay dang yyyy-MM-dd -> cung khoa",
  revenueDocId(base),
  revenueDocId({ ...base, date: "2026-05-14" }),
);
eq(
  "so hoa don khac hoa/thuong va khoang trang -> cung khoa",
  revenueDocId(base),
  revenueDocId({ ...base, invoiceNumber: " c26tkb#00000093 " }),
);
eq(
  "ten hang viet khac dau cach nhung cung ma vat tu -> cung khoa",
  revenueDocId(base),
  revenueDocId({ ...base, productName: "BIA  GOLDEN   BRIDGE Helles Lager" }),
);

console.log("\n2. Phan biet dung nhung dong that su khac");
ne("khac so luong", revenueDocId(base), revenueDocId({ ...base, quantity: 13805.2 }));
ne("khac don gia", revenueDocId(base), revenueDocId({ ...base, unitPrice: 31000 }));
ne("khac thanh tien", revenueDocId(base), revenueDocId({ ...base, totalAmount: 414153001 }));
ne("khac ngay", revenueDocId(base), revenueDocId({ ...base, date: "2026-05-15" }));
ne("khac so hoa don", revenueDocId(base), revenueDocId({ ...base, invoiceNumber: "C26TKB#00000094" }));
ne("khac doi tac", revenueDocId(base), revenueDocId({ ...base, partnerName: "BNG" }));
ne(
  "khac ma vat tu",
  revenueDocId(base),
  revenueDocId({ ...base, materialCode: "10168111" }),
);

console.log("\n3. Dong khong co so hoa don");
const noInv = { ...base, invoiceNumber: "" };
eq("khong so HD: on dinh", revenueDocId(noInv), revenueDocId({ ...noInv }));
ne(
  "khong so HD: khac doi tac van la 2 dong",
  revenueDocId(noInv),
  revenueDocId({ ...noInv, partnerName: "BNG" }),
);
ne(
  "khong so HD: khac mat hang van la 2 dong",
  revenueDocId(noInv),
  revenueDocId({ ...noInv, materialCode: "10168111" }),
);
eq(
  "khong co ma vat tu thi dua vao ten hang",
  revenueDocId({ ...noInv, materialCode: "", productName: "Bia A" }),
  revenueDocId({ ...noInv, materialCode: "", productName: "bia   a" }),
);
ne(
  "khong co ma vat tu, ten khac -> 2 dong",
  revenueDocId({ ...noInv, materialCode: "", productName: "Bia A" }),
  revenueDocId({ ...noInv, materialCode: "", productName: "Bia B" }),
);

console.log("\n4. Khoa hop le va khong dung ky tu Firestore cam");
const id = revenueDocId(base);
eq("khong chua dau /", id.includes("/"), false);
eq("khong chua dau cach", /\s/.test(id), false);
eq("chi gom chu-so-gach", /^[a-z0-9-]+$/.test(id), true);
console.log(`       vi du khoa: ${id}`);
console.log(`       chu ky:     ${revenueSignature(base)}`);

console.log("\n5. Khong va khoa tren tap lon");
const ids = new Set<string>();
let n = 0;
for (let d = 1; d <= 28; d++) {
  for (let p = 0; p < 40; p++) {
    for (let q = 0; q < 20; q++) {
      ids.add(
        revenueDocId({
          date: `2026-03-${String(d).padStart(2, "0")}`,
          invoiceNumber: `HD-${d}-${p}`,
          materialCode: `1016${8000 + p}`,
          productName: `Bia so ${p}`,
          partnerName: `Khach ${p % 7}`,
          quantity: 10 + q,
          unitPrice: 30000 + q * 100,
          totalAmount: (10 + q) * (30000 + q * 100),
        }),
      );
      n++;
    }
  }
}
eq(`sinh ${n} dong khong dong khoa nao`, ids.size, n);

console.log("\n6. Ham bam");
eq("bam on dinh", stableHash("abc"), stableHash("abc"));
ne("bam phan biet", stableHash("abc"), stableHash("abd"));
eq("bam chuoi rong on dinh", stableHash(""), stableHash(""));

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

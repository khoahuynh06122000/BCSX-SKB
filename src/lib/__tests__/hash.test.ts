/**
 * Chay thu phep bam khoa.
 *
 * Bam phai ON DINH giua cac lan chay: lenh xuat hoa don SAP suy khoa tu chinh
 * tap dong trong lenh, nen bam doi la mot lenh da xuat bong nhien duoc coi la
 * lenh moi va co the xuat hoa don lan thu hai.
 */
import { stableHash } from "../hash";

let pass = 0;
let fail = 0;
const eq = (name: string, a: any, b: any) => {
  if (a === b) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: duoc ${a}, mong ${b}`);
  }
};
const ne = (name: string, a: any, b: any) => {
  if (a !== b) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: hai gia tri trung nhau (${a})`);
  }
};

console.log("\n1. On dinh");
eq("goi 2 lan ra cung khoa", stableHash("abc"), stableHash("abc"));
eq("chuoi rong on dinh", stableHash(""), stableHash(""));
eq("chu Viet co dau on dinh", stableHash("Bia Hơi Đặc Biệt"), stableHash("Bia Hơi Đặc Biệt"));

console.log("\n2. Phan biet");
ne("lech mot ky tu", stableHash("abc"), stableHash("abd"));
ne("dao thu tu", stableHash("ab"), stableHash("ba"));
ne("them khoang trang", stableHash("a b"), stableHash("ab"));
ne("hoa thuong khac nhau", stableHash("ABC"), stableHash("abc"));

console.log("\n3. Hinh dang khoa");
eq("chi gom chu va so", /^[a-z0-9]+$/.test(stableHash("bat ky chuoi nao")), true);
eq("khong qua dai", stableHash("x".repeat(500)).length <= 16, true);

console.log("\n4. Khong dung nhau tren tap lon");
const seen = new Set<string>();
let dup = 0;
for (let i = 0; i < 20000; i++) {
  const h = stableHash(`dong-doanh-thu-${i}|BNC|10168107|${i * 37}`);
  if (seen.has(h)) dup++;
  seen.add(h);
}
eq("20.000 chuoi khac nhau -> khong trung khoa nao", dup, 0);

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

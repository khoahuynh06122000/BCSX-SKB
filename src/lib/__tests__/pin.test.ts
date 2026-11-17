/**
 * Kiểm tra hàm băm, xác minh và rà PIN dễ đoán (theo chuẩn PBKDF2-310k + muối).
 */
import {
  PIN_ITERATIONS,
  PIN_LEGACY_ITERATIONS,
  generatePinSalt,
  hashPin,
  isValidPinFormat,
  isWeakPin,
  verifyPin,
} from "../pin";

let pass = 0;
let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => {
  if (a === b) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: duoc ${String(a)}, mong ${String(b)}`);
  }
};
const ne = (name: string, a: unknown, b: unknown) => {
  if (a !== b) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: hai gia tri trung nhau (${String(a)})`);
  }
};

async function main() {
  console.log("\n1. Hang so bao mat");
  eq("so vong lap moi la 310.000", PIN_ITERATIONS, 310_000);
  eq("so vong lap cu giu 200.000", PIN_LEGACY_ITERATIONS, 200_000);

  console.log("\n2. Dinh dang va chan PIN de doan");
  eq("6 chu so hop le", isValidPinFormat("258147"), true);
  eq("5 chu so khong hop le", isValidPinFormat("25814"), false);
  eq("chua chu cai khong hop le", isValidPinFormat("25814a"), false);
  eq("000000 bi chan", isWeakPin("000000"), true);
  eq("777777 bi chan", isWeakPin("777777"), true);
  eq("123456 bi chan", isWeakPin("123456"), true);
  eq("345678 bi chan", isWeakPin("345678"), true);
  eq("654321 bi chan", isWeakPin("654321"), true);
  eq("987654 bi chan", isWeakPin("987654"), true);
  eq("258147 duoc chap nhan", isWeakPin("258147"), false);
  eq("194826 duoc chap nhan", isWeakPin("194826"), false);

  console.log("\n3. Bam PBKDF2-310k + muoi ngau nhien");
  const s1 = generatePinSalt();
  const s2 = generatePinSalt();
  eq("muoi dai 32 ky tu hex", /^[0-9a-f]{32}$/.test(s1), true);
  ne("hai lan sinh muoi khac nhau", s1, s2);

  const uid = "uid-test-001";
  const h1 = await hashPin("258147", uid, s1);
  const h2 = await hashPin("258147", uid, s2);
  eq("hash dai 64 ky tu hex", /^[0-9a-f]{64}$/.test(h1), true);
  ne("cung PIN cung uid nhung khac muoi -> hash khac nhau", h1, h2);
  eq("xac minh dung PIN + muoi", await verifyPin("258147", uid, h1, s1), true);
  eq("sai PIN tra false", await verifyPin("258148", uid, h1, s1), false);
  eq("sai muoi tra false", await verifyPin("258147", uid, h1, s2), false);
  eq("sai uid tra false", await verifyPin("258147", "uid-khac", h1, s1), false);
  eq("hash rong tra false", await verifyPin("258147", uid, "", s1), false);

  console.log("\n4. Tuong thich nguoc hash cu (200k, khong pinSalt)");
  const legacyHash = await hashPin("482910", uid);
  ne("hash cu khac hash moi co muoi", legacyHash, await hashPin("482910", uid, s1));
  eq("xac minh hash cu khong salt", await verifyPin("482910", uid, legacyHash, null), true);
  eq("xac minh hash cu sai PIN", await verifyPin("482911", uid, legacyHash, null), false);

  console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

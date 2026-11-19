/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { chuRieng, dangDongGoi, dongKhopTenQuet } from "../khopPhieuQuet";

let pass = 0;
let fail = 0;
function eq(ten: string, thuc: unknown, mong: unknown) {
  if (JSON.stringify(thuc) === JSON.stringify(mong)) pass++;
  else {
    fail++;
    console.error(`SAI: ${ten}\n  thuc: ${JSON.stringify(thuc)}\n  mong: ${JSON.stringify(mong)}`);
  }
}

const don = [
  { id: "1", productName: "Bia Wings Dark Lager" },
  { id: "2", productName: "Bia Golden Bridge Helles Lager" },
  { id: "3", productName: "Bia Golden Bridge Helles Lager lon330ml" },
  { id: "4", productName: "Bia Lunar Castle Dry hop Pale Ale" },
];
const ids = (ds: { id: string }[]) => ds.map((d) => d.id).join(",");

eq("chu rieng bo chu chung", chuRieng("Bia Golden Bridge Helles Lager lon330ml"), ["golden", "bridge"]);
eq("dang lon", dangDongGoi("Bia Golden Bridge Helles Lager lon330ml"), "lon");
eq("dang keg", dangDongGoi("Bia Golden Bridge Helles Lager"), "keg");

// Ca loi cu: chung chu "lager" khong duoc khop.
eq("Wings khong keo theo Golden Bridge", ids(dongKhopTenQuet("Bia Wings Dark Lager", don)), "1");
// Keg va lon cung ten: phan biet theo dang.
eq("Golden Bridge keg chi khop keg", ids(dongKhopTenQuet("Golden Bridge Helles Lager", don)), "2");
eq("Golden Bridge lon chi khop lon", ids(dongKhopTenQuet("Golden Bridge lon 330ml", don)), "3");
// Thieu mot chu rieng thi khong khop.
eq("chi 'Lunar' khong du", ids(dongKhopTenQuet("Bia Lunar", don)), "4".slice(0, 0));
eq("Lunar Castle khop", ids(dongKhopTenQuet("LUNAR CASTLE pale ale", don)), "4");
// Lech dang nhung trong don chi co mot mat hang ten do -> van khop.
eq("lech dang nhung duy nhat", ids(dongKhopTenQuet("Wings Dark Lager lon", don)), "1");
eq("chu chung khong khop gi", ids(dongKhopTenQuet("Lager", don)), "");

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

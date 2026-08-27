/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  crc32,
  duoiTep,
  taoZip,
  tenAnToan,
  tenTrongZip,
} from "../taiHangLoat";

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

const chu = (s: string) => new TextEncoder().encode(s);

// ------------------------------------------------------------ CRC-32

// Gia tri chuan, doi chieu duoc voi bat ky bang CRC-32 nao.
eq("crc rong", crc32(new Uint8Array(0)), 0);
eq("crc 'a'", crc32(chu("a")), 0xe8b7be43);
eq("crc '123456789'", crc32(chu("123456789")), 0xcbf43926);
eq("crc 'The quick brown fox jumps over the lazy dog'",
  crc32(chu("The quick brown fox jumps over the lazy dog")), 0x414fa339);
// Doi mot byte thi crc phai khac han.
dung("doi mot byte la crc khac", crc32(chu("abc")) !== crc32(chu("abd")));

// ------------------------------------------------------------ ten tep

eq("bo dau tieng Viet", tenAnToan("Biên bản giao nhận"), "Bien-ban-giao-nhan");
eq("chu d gach ngang", tenAnToan("Đơn vị Đà Nẵng"), "Don-vi-Da-Nang");
eq("bo ky tu Windows cam", tenAnToan('a/b\\c:d*e?f"g<h>i|j'), "a-b-c-d-e-f-g-h-i-j");
eq("gop nhieu gach lam mot", tenAnToan("a   ---   b"), "a-b");
eq("khong de gach o hai dau", tenAnToan("  --xin chao--  "), "xin-chao");
eq("giu chu so va dau cham", tenAnToan("PN-2026.08.21"), "PN-2026.08.21");
dung("cat bot ten qua dai", tenAnToan("x".repeat(200)).length <= 80);
eq("chuoi rong", tenAnToan(""), "");

// ------------------------------------------------------------ duoi tep

eq("duoi png", duoiTep("https://a.b/c/anh.png"), "png");
eq("duoi jpeg thanh jpg", duoiTep("https://a.b/anh.JPEG"), "jpg");
eq("duoi jpg", duoiTep("https://a.b/anh.jpg"), "jpg");
eq("bo qua tham so tren duong dan", duoiTep("https://a.b/anh.webp?v=2&x=1"), "webp");
eq("bo qua neo", duoiTep("https://a.b/anh.gif#top"), "gif");
eq("khong doan ra thi coi la jpg", duoiTep("https://a.b/upload/v123/abc"), "jpg");
eq("duong dan rong", duoiTep(""), "jpg");

// ------------------------------------------------------------ ten trong zip

{
  const anh = {
    id: "tx-001",
    date: "2026-08-21T08:00:00.000Z",
    tieuDe: "Biên bản giao nhận",
    url: "https://a.b/anh.png",
  };
  eq("ten day du", tenTrongZip(1, anh), "001-2026-08-21-Bien-ban-giao-nhan-tx-001.png");
  eq("so thu tu du ba chu so", tenTrongZip(42, anh).slice(0, 3), "042");
  // Thieu ngay thi van phai ra mot cai ten dung duoc, khong duoc ra "undefined".
  eq(
    "thieu ngay",
    tenTrongZip(2, { ...anh, date: "" }),
    "002-khong-ngay-Bien-ban-giao-nhan-tx-001.png",
  );
  eq(
    "thieu tieu de",
    tenTrongZip(3, { ...anh, tieuDe: "" }),
    "003-2026-08-21-anh-tx-001.png",
  );
  // Hai anh cung ngay cung tieu de van phai khac ten, khong thi giai nen ra
  // mat mot tam.
  dung(
    "cung ngay cung tieu de van khac ten",
    tenTrongZip(1, anh) !== tenTrongZip(1, { ...anh, id: "tx-002" }),
  );
}

// ------------------------------------------------------------ tao zip

{
  const zip = taoZip([
    { ten: "a.txt", duLieu: chu("xin chao") },
    { ten: "thu-muc/b.bin", duLieu: new Uint8Array([0, 1, 2, 255]) },
  ]);
  dung("tra ve Blob", zip instanceof Blob);
  eq("kieu MIME", zip.type, "application/zip");

  // Kich thuoc phai dung tung byte theo dinh dang ZIP:
  //   moi tep: 30 + do dai ten + do dai du lieu
  //   moi muc trong danh muc: 46 + do dai ten
  //   ket thuc danh muc: 22
  const tenA = "a.txt".length; // 5
  const tenB = "thu-muc/b.bin".length; // 13
  const a = 30 + tenA + 8;
  const b = 30 + tenB + 4;
  const dm = 46 + tenA + (46 + tenB);
  eq("kich thuoc dung tung byte", zip.size, a + b + dm + 22);
}

{
  const zip = taoZip([]);
  eq("khong co tep nao thi chi con phan ket", zip.size, 22);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐÁNH KHOÁ DÒNG NẠP TỪ TỆP XUẤT KHO.
 *
 * Bộ đọc tệp BBGN đời cũ đã gỡ (xem đầu `bbgn.ts`); ở đây chỉ còn phép kiểm
 * của phần còn sống: khoá theo nội dung, nạp lại không nhân đôi, hai chuyến
 * cùng ngày không đè nhau.
 */

import { danhKhoaBbgn, dongCuNgoaiTep } from "../bbgn";
import { stableHash } from "../hash";

let pass = 0;
let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => {
  const s = (x: unknown) => JSON.stringify(x);
  if (s(a) === s(b)) pass++;
  else {
    fail++;
    console.log(`SAI  ${name}\n     thuc te: ${s(a)}\n     mong doi: ${s(b)}`);
  }
};

// --------------------------------------------------------------------------
// ĐÁNH KHOÁ: một điểm bán nhận nhiều chuyến trong cùng một ngày
// --------------------------------------------------------------------------
{
  const bam = (s: string) => stableHash(s);
  const d = (outlet: string, productId = "p1", dateKey = "2026-08-21") => ({
    dateKey,
    partnerId: "AD0103-1901",
    productId,
    outlet,
  });

  // Hai chuyến cùng ngày, cùng điểm bán, cùng mặt hàng — sheet ghi hai cột.
  const hai = danhKhoaBbgn([d("NH 1901"), d("NH 1901")], bam);
  eq(
    "hai chuyen cung ngay ra hai khoa khac nhau",
    new Set(hai).size === 2,
    true,
  );
  eq("khoa thu nhat la lan 0", hai[0].endsWith("-l0"), true);
  eq("khoa thu hai la lan 1", hai[1].endsWith("-l1"), true);
  // Cùng gốc thì chỉ khác phần số lần, nên xoá theo tiền tố gốc vẫn quét hết.
  eq(
    "cung tien to goc",
    hai[0].slice(0, hai[0].lastIndexOf("-")) ===
      hai[1].slice(0, hai[1].lastIndexOf("-")),
    true,
  );

  // Nạp lại đúng cùng một danh sách phải ra đúng bộ khoá cũ.
  const lan1 = danhKhoaBbgn(
    [d("NH 1901"), d("Lễ Hội  Bia"), d("NH 1901"), d("NH 1901", "p4")],
    bam,
  );
  const lan2 = danhKhoaBbgn(
    [d("NH 1901"), d("Lễ Hội  Bia"), d("NH 1901"), d("NH 1901", "p4")],
    bam,
  );
  eq("nap lai ra dung bo khoa cu", JSON.stringify(lan1), JSON.stringify(lan2));
  eq("bon dong ra bon khoa", new Set(lan1).size, 4);

  // Khác ngày / khác điểm bán / khác mặt hàng thì phải khác khoá.
  const khac = danhKhoaBbgn(
    [
      d("NH 1901"),
      d("NH 1901", "p1", "2026-08-22"),
      d("Kavkaz"),
      d("NH 1901", "p4"),
    ],
    bam,
  );
  eq("khac ngay/diem/hang thi khac khoa", new Set(khac).size, 4);

  eq("danh sach rong", danhKhoaBbgn([], bam).length, 0);
}


// --------------------------------------------------------------------------
// NẠP LẠI TỆP ĐÃ SỬA: dòng cũ không còn trong tệp phải được tìm ra
// --------------------------------------------------------------------------
{
  const cu = [
    { id: "bbgn-aaa-l0-0", date: "2026-08-21T08:00:00.000Z", partnerId: "BNC" },
    { id: "bbgn-aaa-l0-0-hao-0", date: "2026-08-21T08:00:00.000Z", partnerId: "BNC" },
    { id: "bbgn-bbb-l0-0", date: "2026-08-21T08:00:00.000Z", partnerId: "BNC" },
    { id: "bbgn-ccc-l0-0", date: "2026-07-31T08:00:00.000Z", partnerId: "BNC" },
    { id: "bbgn-ddd-l0-0", date: "2026-08-22T08:00:00.000Z", partnerId: "BNG" },
    { id: "trx-1", date: "2026-08-21T08:00:00.000Z", partnerId: "BNC" },
  ];
  // Tệp mới: ô ngày 21 của "bbb" đã sửa thành 22 -> khoá mới "eee".
  const moi = new Set(["bbgn-aaa-", "bbgn-eee-"]);
  const tim = dongCuNgoaiTep(cu, {
    tienTo: "bbgn-",
    ngay: ["2026-08-21", "2026-08-22"],
    thuocTep: (id) => [...moi].some((p) => id.startsWith(p)),
    donVi: new Set(["BNC"]),
  });
  eq("dong cu doi ngay duoc tim ra", tim.map((t) => t.id), ["bbgn-bbb-l0-0"]);

  const khongDonVi = dongCuNgoaiTep(cu, {
    tienTo: "bbgn-",
    ngay: ["2026-08-22", "2026-08-21"],
    thuocTep: (id) => [...moi].some((p) => id.startsWith(p)),
  });
  eq(
    "khong loc don vi thi xet ca don vi khac trong ky",
    khongDonVi.map((t) => t.id),
    ["bbgn-bbb-l0-0", "bbgn-ddd-l0-0"],
  );
  eq("dong nhap tay khong bao gio bi dung", tim.some((t) => t.id === "trx-1"), false);
  eq("ngoai khoang ngay cua tep khong bi dung", tim.some((t) => t.id === "bbgn-ccc-l0-0"), false);
  eq(
    "tep rong khong tim gi",
    dongCuNgoaiTep(cu, { tienTo: "bbgn-", ngay: [], thuocTep: () => false }),
    [],
  );
}

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

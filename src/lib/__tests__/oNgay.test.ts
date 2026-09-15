/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isoSangVn, vnSangIso, goNgay, goXong } from "../oNgay";

let dung = 0;
let sai = 0;

function eq(ten: string, thuc: unknown, mong: unknown) {
  const a = JSON.stringify(thuc);
  const b = JSON.stringify(mong);
  if (a === b) dung++;
  else {
    sai++;
    console.log(`SAI ${ten}\n   thuc: ${a}\n   mong: ${b}`);
  }
}

function that(ten: string, dk: boolean) {
  if (dk) dung++;
  else {
    sai++;
    console.log(`SAI ${ten}`);
  }
}

// ------------------------------------------------------------ hien ra man hinh
eq("iso sang vn", isoSangVn("2026-09-15"), "15/09/2026");
eq("giu so 0 dau", isoSangVn("2026-01-05"), "05/01/2026");
eq("ngay cuoi nam", isoSangVn("2026-12-31"), "31/12/2026");
eq("rong thi rong", isoSangVn(""), "");
eq("sai khuon thi rong", isoSangVn("15/09/2026"), "");
eq("thieu so 0 thi rong", isoSangVn("2026-9-5"), "");

/*
 * NGAY KHONG CO THAT phai bi tu choi, khong duoc lam tron sang thang sau.
 * `new Date(2026, 1, 31)` trong JavaScript ra ngay 03/03 chu khong bao loi —
 * de lot thi so kho ghi mot ngay khong ton tai tren to chung tu.
 */
eq("31 thang 2 khong co that", isoSangVn("2026-02-31"), "");
eq("31 thang 4 khong co that", isoSangVn("2026-04-31"), "");
eq("thang 13 khong co that", isoSangVn("2026-13-01"), "");
eq("ngay 0 khong co that", isoSangVn("2026-05-00"), "");

// Nam nhuan: 2024 co 29/02, 2026 thi khong.
eq("29 thang 2 nam nhuan", isoSangVn("2024-02-29"), "29/02/2024");
eq("29 thang 2 nam thuong", isoSangVn("2026-02-29"), "");

// ------------------------------------------------------------ nguoi dung go
eq("vn sang iso", vnSangIso("15/09/2026"), "2026-09-15");
eq("thieu so 0 van doc duoc", vnSangIso("5/9/2026"), "2026-09-05");
eq("go dau gach ngang", vnSangIso("15-09-2026"), "2026-09-15");
eq("go dau cham", vnSangIso("15.09.2026"), "2026-09-15");
eq("co khoang trang thua", vnSangIso("  15/09/2026  "), "2026-09-15");
eq("go do dang thi rong", vnSangIso("15/09"), "");
eq("nam hai so thi rong", vnSangIso("15/09/26"), "");
eq("chu thi rong", vnSangIso("hom nay"), "");
eq("31 thang 2 thi rong", vnSangIso("31/02/2026"), "");

// ------------------------------------------------------------ tu chen dau /
eq("go hai so dau", goNgay("15"), "15");
eq("go sang thang", goNgay("1509"), "15/09");
eq("go du tam so", goNgay("15092026"), "15/09/2026");
eq("bo ky tu la", goNgay("15a09b2026"), "15/09/2026");
eq("cat phan thua", goNgay("150920261234"), "15/09/2026");
eq("chua go gi", goNgay(""), "");
eq("dang go so dau tien", goNgay("3"), "3");

/*
 * KHONG TU SUA SO DANG GO DO.
 * Nguoi dinh go ngay 30 vua bam `3`, neu bi lam tron thanh `03` thi go tiep
 * so `0` se ra `03/0…` — sai hoan toan y dinh.
 */
eq("khong dem so 0 vao so dang go", goNgay("3"), "3");
eq("go tiep thanh 30", goNgay("30"), "30");

// Go lai tu chuoi da co dau gach thi khong nhan doi dau.
eq("go lai chuoi da co gach", goNgay("15/09/2026"), "15/09/2026");
eq("xoa bot van chay dung", goNgay("15/09/20"), "15/09/20");

// ------------------------------------------------------------ da go xong chua
that("day du thi bao xong", goXong("15/09/2026"));
that("do dang thi chua xong", !goXong("15/09"));
that("rong thi chua xong", !goXong(""));
that("ngay khong co that thi chua xong", !goXong("31/02/2026"));

// ------------------------------------------------------------ di mot vong
/*
 * Doi qua lai phai ve dung cho cu. Lech mot buoc o day la ngay chung tu doi
 * mot ngay moi lan mo ra sua roi luu lai.
 */
for (const iso of ["2026-01-01", "2026-02-28", "2024-02-29", "2026-06-15", "2026-12-31"]) {
  eq(`di mot vong ${iso}`, vnSangIso(isoSangVn(iso)), iso);
}

console.log(`\n${dung} DUNG / ${sai} SAI`);
if (sai > 0) process.exit(1);

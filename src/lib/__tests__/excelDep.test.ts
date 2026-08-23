/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRA ĐỊNH DẠNG TỆP EXCEL
 *
 * Ghi ra tệp thật rồi đọc lại, chứ không kiểm cấu trúc trong bộ nhớ: cái cần
 * biết là Excel MỞ RA có thấy màu và đường kẻ không, mà điều đó nằm ở phần
 * tệp được ghi.
 *
 * Bộ đọc của thư viện không trả lại thuộc tính `s`, nên phần kiểm màu và viền
 * đọc thẳng XML trong tệp .xlsx — đó mới là thứ Excel đọc.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSXr from "xlsx";
import { doRongCot, taoSheetDep, XLSXDep } from "../excelDep";

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

// ------------------------------------------------------------ bề rộng cột

{
  const tieuDe = ["Tên", "SL"];
  const hang: (string | number | null)[][] = [
    ["Bia Golden Bridge Helles Lager lon330ml", 1757.8],
    ["Bia A", 10],
  ];
  const rong = doRongCot(tieuDe, hang);
  // Cột tên phải rộng theo tên dài nhất (39 ký tự + 2 lề).
  eq("cot ten rong theo noi dung", rong[0], 41);
  // Cột số hẹp nhưng không dưới mức tối thiểu, không thì Excel hiện ####.
  eq("cot so khong duoi muc toi thieu", rong[1] >= 8, true);
  // Ghi chú rất dài không được kéo cột rộng hết màn hình.
  eq(
    "chan tren 46",
    doRongCot(["G"], [["x".repeat(300)]])[0],
    46,
  );
  eq("danh sach rong van ra so hop le", doRongCot(["A"], [])[0], 8);
}

// ------------------------------------------------- ghi tệp thật rồi soát XML

{
  const ws = taoSheetDep({
    tieuDeTren: ["BÁO CÁO THỬ", "Kỳ 08/2026"],
    tieuDe: ["Sản phẩm", "Số lượng", "Thành tiền"],
    cot: [{ rong: 30 }, { rong: 12, kieu: "so" }, { rong: 16, kieu: "tien" }],
    hang: [
      ["Bia hơi", 1757.8, 52_734_000],
      ["Bia lon", 120, 1_680_000],
      ["Bia khác", 5, 150_000],
    ],
    dongTong: ["TỔNG", 1882.8, 54_564_000],
  });
  const wb = XLSXDep.utils.book_new();
  XLSXDep.utils.book_append_sheet(wb, ws, "Thu");

  const tep = path.join(os.tmpdir(), `bcsx-thu-${process.pid}.xlsx`);
  XLSXDep.writeFile(wb, tep);

  // --- Giá trị đọc lại có đúng không ---
  const lai = XLSXr.read(fs.readFileSync(tep));
  const r = XLSXr.utils.sheet_to_json<any[]>(lai.Sheets["Thu"], {
    header: 1,
    raw: true,
    defval: null,
  });
  eq("hai dong tieu de tren", r[0][0], "BÁO CÁO THỬ");
  eq("hang tieu de dung cho", r[2][0], "Sản phẩm");
  eq("dong dau tien", [r[3][0], r[3][1], r[3][2]], ["Bia hơi", 1757.8, 52734000]);
  eq("dong tong o cuoi", [r[6][0], r[6][2]], ["TỔNG", 54564000]);
  // Số phải là SỐ, không phải chuỗi đã định dạng — chuỗi thì Excel không cộng.
  eq("tien luu dang so", typeof r[3][2], "number");

  // --- Định dạng có thật trong tệp không ---
  const buf = fs.readFileSync(tep);
  const xml = buf.toString("latin1");
  eq("co mau nen", xml.includes("patternType=\"solid\""), true);
  eq("co duong ke", xml.includes("<top style=\"thin\""), true);
  eq("co dinh dang so nghin", xml.includes("#,##0"), true);
  eq("co be rong cot", xml.includes("customWidth") || xml.includes("customwidth"), true);
  eq("co bo loc", xml.includes("autoFilter"), true);

  fs.rmSync(tep, { force: true });
}

// ---------------------------------------------- không có dòng nào vẫn chạy

{
  const ws = taoSheetDep({
    tieuDe: ["A", "B"],
    cot: [{ rong: 10 }, { rong: 10 }],
    hang: [],
  });
  eq("bang rong van co o tieu de", !!ws["A1"], true);
  eq("khong vo khi khong co du lieu", typeof ws["!ref"], "string");
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

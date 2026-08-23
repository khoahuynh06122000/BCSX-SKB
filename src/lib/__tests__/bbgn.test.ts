/**
 * Chay thu doc file BBGN va dung file mau.
 *
 * Phep quan trong nhat: file mau do buildBbgnTemplateRows dung ra phai doc lai
 * duoc bang parseBbgnSheet. Hai thu do ma lech nhau thi nguoi dung tai mau ve,
 * dien so, nap len va nhan loi - dung cai ma file mau dang ra de tranh.
 */
import * as XLSX from "xlsx";
import {
  buildBbgnLookups,
  buildBbgnTemplateRows,
  parseBbgnSheet,
  parseBbgnDateCell,
  toBbgnNumber,
  normalizeBbgn,
  danhKhoaBbgn,
} from "../bbgn";
import { stableHash } from "../hash";
import type { Partner, Product } from "../../types";

let pass = 0;
let fail = 0;
const eq = (name: string, a: any, b: any) => {
  const s = (x: any) => JSON.stringify(x);
  if (s(a) === s(b)) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}:\n         duoc ${s(a)}\n         mong ${s(b)}`);
  }
};

/* ---------------------- danh muc gia ---------------------- */

const P = (id: string, code: string, name: string): Product => ({
  id,
  name,
  materialCode: code,
  category: "Lít",
  unit: "Lít",
  price: 45000,
  conversionFactor: 1,
  capacityPerUnit: 1000,
});

const products: Product[] = [
  P("p1", "10168107", "Bia Golden Bridge Helles Lager"),
  P("p2", "10174040", "Bia Lunar Castle Dry hop Pale Ale"),
  P("p3", "10168111", "Bia Wings Dark Lager 330ml"),
  P("p4", "10218490", "Bia Rosa Garden Light Lager"),
];

const partners: Partner[] = [
  { id: "s1", name: "Nha may bia Sun KraftBeer", type: "SUPPLIER" },
  { id: "a1", name: "BNC", sapCode: "BNC01", type: "RESTAURANT" },
  { id: "a2", name: "BNG", sapCode: "BNG01", type: "RESTAURANT" },
];

const lookups = buildBbgnLookups(products, partners);

/* ---------------------- 1. ham thuan ---------------------- */

console.log("\n1. Doc o ngay va o so");
eq("dd.MM.yy", parseBbgnDateCell("01.08.26"), "2026-08-01");
eq("dd/MM/yyyy", parseBbgnDateCell("1/8/2026"), "2026-08-01");
eq("so se-ri Excel", parseBbgnDateCell(46235), "2026-08-01");
eq("o rong", parseBbgnDateCell(""), null);
eq("chu khong phai ngay", parseBbgnDateCell("Tong cong"), null);
eq("ngay khong hop le", parseBbgnDateCell("32.13.26"), null);

eq("dau phay thap phan", toBbgnNumber("432,6"), 432.6);
eq("so nguyen", toBbgnNumber(412), 412);
eq("o rong = 0", toBbgnNumber(""), 0);
eq("chu = 0", toBbgnNumber("x"), 0);

eq("bo dau va chu d", normalizeBbgn(" Địa  Điểm "), "dia diem");

/* ------- 2. FILE MAU PHAI DOC LAI DUOC (phep quan trong nhat) ------- */

console.log("\n2. File mau dung ra doc lai duoc");

const tpl = buildBbgnTemplateRows(products, partners, new Date("2026-08-13"));
const parsed = parseBbgnSheet(tpl.rows, "BBGN", lookups);

eq("parser nhan ra dung dang bang", parsed !== null, true);

if (parsed) {
  // 4 dong du lieu trong mau, moi dong 2 o co so luong (o trong bi bo qua):
  //   NH 1901   432.6 + 412
  //   Cau Vang  240 + 48      (o dau de trong)
  //   Beluga    120 + 96      (hai o giua de trong)
  //   NH 1901   200 + 150
  // => 8 dong xuat kho
  eq("tach ra dung 8 dong xuat kho", parsed.drafts.length, 8);
  // Dem lai tu chinh cac dong mau, de sau nay sua mau la test doi theo
  const qtyCells = tpl.rows
    .slice(3)
    .reduce(
      (n, row) => n + row.slice(5).filter((c: any) => Number(c) > 0).length,
      0,
    );
  eq("khop voi so o co so luong trong mau", parsed.drafts.length, qtyCells);
  eq("khong dong nao chua ro don vi", parsed.pending.length, 0);
  eq("khong ma vat tu la nao", parsed.unknownCodes.length, 0);
  eq("khong bo qua dong nao", parsed.skippedRows, 0);

  // Cot "Dia diem" trong mau phai khop ve dung doi tac that
  const units = Array.from(new Set(parsed.drafts.map((d) => d.partnerName)));
  eq("don vi nhan lay tu danh muc that", units.sort(), ["BNC", "BNG"]);
  eq(
    "khong lay nha cung cap lam don vi nhan",
    units.includes("Nha may bia Sun KraftBeer"),
    false,
  );

  // Diem nhan phai vao dung truong outlet
  const outlets = Array.from(new Set(parsed.drafts.map((d) => d.outlet)));
  eq("doc dung diem nhan", outlets.sort(), ["Bia Beluga", "Cầu Vàng", "NH 1901"]);

  // So le co dau phay thap phan
  eq(
    "giu nguyen so le 432,6",
    parsed.drafts.some((d) => d.quantity === 432.6),
    true,
  );

  // Ghi chu: dong co Note khac dia diem thi giu
  eq(
    "giu ghi chu khi khac dia diem",
    parsed.drafts.some((d) => d.note === "giao bù ngày 30"),
    true,
  );

  // Ngay: mau dung moc 13/08/2026, lui 0..2 ngay
  const days = Array.from(new Set(parsed.drafts.map((d) => d.dateKey))).sort();
  eq("doc dung ba ngay giao", days, ["2026-08-11", "2026-08-12", "2026-08-13"]);

  // Tat ca san pham phai khop ve danh muc (co productId that)
  eq(
    "moi dong deu khop san pham trong danh muc",
    parsed.drafts.every((d) => products.some((p) => p.id === d.productId)),
    true,
  );
}

console.log("\n3. Mau chi dung mat hang co ma vat tu");
{
  const mixed = [...products, P("p9", "", "Bia Chua Co Ma")];
  const t = buildBbgnTemplateRows(mixed, partners, new Date("2026-08-13"));
  eq(
    "bo san pham thieu ma vat tu ra khoi cot",
    t.columns.some((c) => c.id === "p9"),
    false,
  );
  eq("so cot bang so san pham co ma", t.columns.length, 4);
}

console.log("\n4. Danh muc thieu ma vat tu thi bao loi ro rang");
{
  let msg = "";
  try {
    buildBbgnTemplateRows([products[0], products[1]], partners);
  } catch (e: any) {
    msg = String(e.message || e);
  }
  eq("nem loi khi duoi 3 ma", msg.includes("ít nhất 3 sản phẩm"), true);
}

console.log("\n5. Sheet khong phai bang giao hang thi bo qua");
{
  const guide = parseBbgnSheet(tpl.guideRows, "Huong dan", lookups);
  eq("sheet huong dan khong bi coi la du lieu", guide, null);

  const junk = parseBbgnSheet(
    [["Ton kho"], ["Ngay", "So luong"], ["01.08.26", 100]],
    "Tkho",
    lookups,
  );
  eq("sheet phu khong co ma vat tu -> null", junk, null);
}

console.log("\n6. Ma vat tu la va don vi la");
{
  const rows: any[][] = [
    ["Địa điểm", "Note", "BB", "Ngày giao", "Tên"],
    ["", "", "", "", "", "10168107", "10174040", "99999999"],
    ["", "", "", "", "", "Bia A", "Bia B", "Bia La"],
    ["BNC", "", "đã có bbgn", "01.08.26", "NH 1901", 10, 20, 30],
    ["KHACH LA", "", "đã có bbgn", "01.08.26", "NH 1901", 5, "", ""],
    ["BNC", "", "đã có bbgn", "01.08.26", "NH 1901", "", "", ""],
  ];
  const r = parseBbgnSheet(rows, "X", lookups)!;
  eq("bao ma vat tu chua co trong danh muc", r.unknownCodes.length, 1);
  eq("dung ma la", r.unknownCodes[0].code, "99999999");
  eq("don vi la -> cho nguoi dung chon", r.pending.length, 1);
  eq("dung ten don vi la", r.pending[0].rawUnit, "KHACH LA");
  eq("dong khong co so luong -> bo qua", r.skippedRows, 1);
  eq("chi tao dong cho ma da biet", r.drafts.length, 2);
}

console.log("\n7. Khop don vi bang ma SAP va khong phan biet dau/hoa thuong");
{
  const rows: any[][] = [
    ["Địa điểm", "Note", "BB", "Ngày giao", "Tên"],
    ["", "", "", "", "", "10168107", "10174040", "10168111"],
    ["", "", "", "", "", "Bia A", "Bia B", "Bia C"],
    ["BNG01", "", "", "01.08.26", "NH 1901", 10, "", ""],
    ["  bnc  ", "", "", "01.08.26", "NH 1901", 10, "", ""],
  ];
  const r = parseBbgnSheet(rows, "X", lookups)!;
  eq("khop bang ma SAP", r.drafts[0].partnerName, "BNG");
  eq("khop du khac hoa/thuong va khoang trang", r.drafts[1].partnerName, "BNC");
  eq("khong con dong nao phai hoi", r.pending.length, 0);
}

console.log("\n8. Vong tron day du: ghi ra .xlsx that roi doc lai");
{
  // Cac phep tren dua thang mang vao parser, chua qua thu vien xlsx. Doan nay
  // di dung duong nguoi dung di: dung mau -> ghi file .xlsx -> doc file len ->
  // parse. Bat duoc ca loi dinh dang o (vi du ma vat tu bi luu thanh so roi
  // mat so 0 dau, hoac o ngay bi doi kieu).
  const ws = XLSX.utils.aoa_to_sheet(tpl.rows);
  const guide = XLSX.utils.aoa_to_sheet(tpl.guideRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BBGN");
  XLSX.utils.book_append_sheet(wb, guide, "Huong dan");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const reread = XLSX.read(buf, { type: "buffer", cellDates: true });

  eq("file co dung 2 sheet", reread.SheetNames, ["BBGN", "Huong dan"]);

  // Lam dung nhu handleFile: thu tung sheet, lay sheet ra nhieu dong nhat
  let best: ReturnType<typeof parseBbgnSheet> = null;
  for (const name of reread.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any[]>(reread.Sheets[name], {
      header: 1,
      raw: true,
      defval: "",
      blankrows: true,
    });
    const r = parseBbgnSheet(rows, name, lookups);
    if (r && (!best || r.drafts.length > best.drafts.length)) best = r;
  }

  eq("doc lai file .xlsx that -> nhan ra bang", best !== null, true);
  eq("chon dung sheet BBGN", best?.sheetName, "BBGN");
  eq("van du 8 dong xuat kho sau khi qua file", best?.drafts.length, 8);
  eq("khong phat sinh ma vat tu la", best?.unknownCodes.length, 0);
  eq("khong phat sinh dong chua ro don vi", best?.pending.length, 0);
  eq(
    "so le 432,6 khong bi lam tron khi qua file",
    best?.drafts.some((d) => d.quantity === 432.6),
    true,
  );
  eq(
    "ngay doc lai dung",
    Array.from(new Set(best?.drafts.map((d) => d.dateKey))).sort(),
    ["2026-08-11", "2026-08-12", "2026-08-13"],
  );
}


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


console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

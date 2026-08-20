/**
 * Chay thu viec doc phan Xuat kho trong sheet "T Kho".
 *
 * Phep tinh de sai nhat o day: NGAY LAN SANG PHAI. Ngay chi ghi o cot dau moi
 * nhom, bo buoc lan thi ca tram giao dich roi vao mot ngay duy nhat ma khong
 * bao loi gi - tong van dung, chi ngay la sai.
 */
import type { Product } from "../../types";
import {
  parseTkhoDate,
  parseTkhoXuat,
  toTkhoNumber,
} from "../tkhoXuat";
import { buildDiemBanLookup, lookupDiemBan } from "../diemBan";
import { parseTkhoNhap } from "../tkhoXuat";

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

const products: Product[] = [
  {
    id: "p1",
    name: "Bia hoi",
    materialCode: "10168107",
    category: "Lít",
    unit: "Lít",
    price: 45000,
    conversionFactor: 1,
    capacityPerUnit: 1000,
  },
  {
    id: "p4",
    name: "Bia lon",
    materialCode: "10168110",
    category: "Lon",
    unit: "Lon",
    price: 15833,
    conversionFactor: 1,
    capacityPerUnit: 330,
  },
];

console.log("\n1. Doc ngay o hang tieu de");
eq("dang chuan dd.MM.yy", parseTkhoDate("01.08.26"), "2026-08-01");
eq("thua dau cham (co that trong file T8)", parseTkhoDate("17..08.26"), "2026-08-17");
eq("dang gach cheo", parseTkhoDate("5/8/2026"), "2026-08-05");
eq("nam du 4 chu so", parseTkhoDate("31.12.2026"), "2026-12-31");
eq("o rong -> null", parseTkhoDate(""), null);
eq("chu -> null", parseTkhoDate("Tổng Xuất"), null);
eq("ngay 32 -> null", parseTkhoDate("32.08.26"), null);
eq("thang 13 -> null", parseTkhoDate("01.13.26"), null);

console.log("\n2. Doc so");
eq("so that", toTkhoNumber(432.6), 432.6);
eq("rac dau phay dong bi cat", toTkhoNumber(2719.2000000000003), 2719.2);
eq("chuoi kieu Viet", toTkhoNumber("1.234,5"), 1234.5);
eq("so am trong ngoac", toTkhoNumber("(1.500)"), -1500);
eq("o rong -> 0", toTkhoNumber(""), 0);
eq("null -> 0", toTkhoNumber(null), 0);
eq("chu -> 0 chu khong NaN", toTkhoNumber("khong co"), 0);

/*
 * Sheet gia, dung dung hinh dang that:
 *   dong 0: tieu de thang
 *   dong 1: moc "Nhập Kho" va "Xuất kho"
 *   dong 2: "MÃ HÀNG" + hang NGAY
 *   dong 3: hang DIEM BAN + "Tổng Xuất"
 *   dong 4+: du lieu
 *
 * Cot 0..4 la phan Nhap kho (co so that, de kiem rang parser KHONG lay).
 * Cot 5.. la phan Xuat kho.
 */
const sheet: any[][] = [
  ["XUẤT HÀNG THÁNG 08 /2026"],
  [null, null, null, "Nhập Kho", null, "Xuất kho"],
  ["STT", "MÃ HÀNG", "TÊN HÀNG", "1", "2", "01.08.26", null, "02.08.26", null, "Cộng"],
  [null, null, null, null, "Tổng Xuất", "NH 1901", "Điểm lạ", "NH 1901", "MFV", null],
  [1, "10168107", "Bia hoi", 999, 300, 100, 50, 200, 25, 12345],
  [2, "10168110", "Bia lon", 888, 60, 60, null, null, null, 999],
  [3, "99999999", "Bia khong co trong danh muc", 0, 0, 70, null, null, null, 0],
];

console.log("\n3. Dung giao dich tu bang cheo");
const r = parseTkhoXuat(sheet, "T Kho T8", products);
eq("so giao dich", r.drafts.length, 4);
eq(
  "khong lay cot ben phan Nhap kho",
  r.drafts.every((d) => d.quantity !== 999 && d.quantity !== 888),
  true,
);
eq("khoang ngay", r.dateRange, { from: "2026-08-01", to: "2026-08-02" });

console.log("\n4. Ngay lan sang phai");
const ngay1 = r.drafts.filter((d) => d.dateKey === "2026-08-01");
const ngay2 = r.drafts.filter((d) => d.dateKey === "2026-08-02");
eq("ngay 01/08 co 2 dong", ngay1.length, 2);
eq(
  "cot khong ghi ngay van thuoc 02/08",
  ngay2.map((d) => d.outlet).sort(),
  ["MFV", "NH 1901"],
);

console.log("\n5. Gan diem ban -> doi tac va ghi chu");
const nh1901 = r.drafts.find((d) => d.outlet === "NH 1901")!;
eq("NH 1901 -> BNC", nh1901.partnerId, "AD0103");
eq("NH 1901 khong co ghi chu", nh1901.note, "");
const mfv = r.drafts.find((d) => d.outlet === "MFV")!;
eq("MFV -> FV", mfv.partnerId, "AC0107");
eq("giu nguyen ten diem ban de tra nguoc", mfv.outlet, "MFV");
eq("so luong giu nguyen", mfv.quantity, 25);

console.log("\n6. Diem ban chua gan thi KHONG tao giao dich");
eq("co bao ra", r.unknownOutlets.length, 1);
eq("dung ten", r.unknownOutlets[0].ten, "Điểm lạ");
eq("kem so luong de biet anh huong bao nhieu", r.unknownOutlets[0].soLuong, 50);
eq(
  "khong lot vao danh sach giao dich",
  r.drafts.some((d) => d.outlet === "Điểm lạ"),
  false,
);

console.log("\n7. Ma vat tu la");
eq("co bao ra", r.unknownCodes.length, 1);
eq("dung ma", r.unknownCodes[0].code, "99999999");
eq("kem so luong", r.unknownCodes[0].soLuong, 70);
eq(
  "khong tao giao dich cho ma la",
  r.drafts.some((d) => d.productId === ""),
  false,
);

console.log("\n8. Doi chieu voi cot Tong Xuat cua chinh sheet");
const check = r.totalChecks.find((t) => t.code === "10168107");
eq("bat duoc cho lech", !!check, true);
eq("cong dung tu bang cheo", check!.tuBangCheo, 375);
eq("doc dung cot tong", check!.tuCotTong, 300);
eq("bao dung so lech", check!.lech, 75);
eq(
  "ma khop thi khong bao",
  r.totalChecks.some((t) => t.code === "10168110"),
  false,
);

console.log("\n9. Truong hop bien");
eq(
  "sheet rong -> khong no",
  parseTkhoXuat([], "rong", products).drafts.length,
  0,
);
eq(
  "sheet khong co o MA HANG -> tra ve rong",
  parseTkhoXuat([["linh tinh"]], "la", products).drafts.length,
  0,
);
const khongCoXuat = parseTkhoXuat(
  [[], [null, null, null, "Nhập Kho"], ["STT", "MÃ HÀNG", "TÊN HÀNG", "1"], [], [1, "10168107", "Bia hoi", 500]],
  "chi co nhap",
  products,
);
eq("sheet khong co phan Xuat kho -> khong tao gi", khongCoXuat.drafts.length, 0);

console.log("\n10. Gan them diem ban ngoai bang goc");
const bangThem = buildDiemBanLookup([
  { ten: "Điểm lạ", partnerId: "AC0107", note: "Ngoại giao" },
]);
const r2 = parseTkhoXuat(sheet, "T Kho T8", products, bangThem);
eq("khong con diem ban nao chua gan", r2.unknownOutlets.length, 0);
eq("co them giao dich cho diem vua gan", r2.drafts.length, 5);
const la = r2.drafts.find((d) => d.outlet === "Điểm lạ")!;
eq("gan dung doi tac", la.partnerId, "AC0107");
eq("ghi chu di theo", la.note, "Ngoại giao");
eq("so luong dung", la.quantity, 50);

console.log("\n11. Gan them DE LEN bang goc khi trung ten");
const de = buildDiemBanLookup([
  { ten: "NH 1901", partnerId: "AC0107", note: "doi roi" },
]);
eq("lay ban gan them", lookupDiemBan("NH 1901", de)?.partnerId, "AC0107");
eq("bang goc van nguyen", lookupDiemBan("NH 1901")?.partnerId, "AD0103");
eq(
  "khop khong phan biet hoa thuong / dau thua",
  lookupDiemBan("nh   1901", de)?.partnerId,
  "AC0107",
);

/*
 * Sheet gia cho phan NHAP, dung dung bo tri that:
 *   moc "Nhập Kho" o cot 7, "Xuất kho" o cot 11
 *   cot 4/5/6 = Tổng Nhập / Tổng Xuất / Tồn Đầu
 *   cot 7..9  = ngay 1,2,3 (chi ghi SO NGAY, khong ghi ngay day du)
 */
const sheetNhap: any[][] = [
  ["XUẤT HÀNG THÁNG 08 /2026"],
  [null, null, null, null, null, null, null, "Nhập Kho", null, null, null, "Xuất kho"],
  ["STT", "MÃ HÀNG", "TÊN HÀNG", "Ngày", null, null, null, "1", "2", "3", null, "01.08.26", null, "Cộng"],
  [null, null, null, "Điểm bán", "Tổng Nhập", "Tổng Xuất", "Tồn Đầu", null, null, null, null, "NH 1901", "MFV", null],
  [1, "10168107", "Bia hoi", null, 500, 0, 100, 200, 300, null, null, 50, 25, null],
  [2, "10168110", "Bia lon", null, 999, 0, 0, 60, null, null, null, null, null, null],
];

console.log("\n12. Doc ton dau ky va hang nhap");
const n = parseTkhoNhap(sheetNhap, "T Kho T8", products);
eq("suy ra dung thang tu hang ngay ben Xuat kho", n.thang, {
  nam: 2026,
  thang: 8,
});
eq("mot dong ton dau", n.tonDauCount, 1);
eq("hai dong nhap", n.nhapCount, 3);

const td = n.drafts.find((d) => d.type === "OPENING")!;
eq("ton dau dung so luong", td.quantity, 100);
eq("ton dau ghi vao ngay dau thang", td.dateKey, "2026-08-01");
eq("ton dau co so lo rieng", td.batchNumber, "TONDAU-0826");

const nk = n.drafts.filter((d) => d.type === "IN" && d.productId === "p1");
eq("so ngay doi thanh ngay day du", nk.map((d) => d.dateKey), [
  "2026-08-01",
  "2026-08-02",
]);
eq("so lo theo ngay nhap", nk.map((d) => d.batchNumber), [
  "NK-010826",
  "NK-020826",
]);
eq("so luong dung", nk.map((d) => d.quantity), [200, 300]);
eq(
  "moi dong nhap deu co so lo — thieu lo la FIFO khong thay hang",
  n.drafts.every((d) => !!d.batchNumber),
  true,
);
eq("ton dau bang 0 thi khong tao dong", n.drafts.filter((d) => d.type === "OPENING").length, 1);

console.log("\n13. Doi chieu cot Tong Nhap");
eq("ma khop thi khong bao", n.totalChecks.some((t) => t.code === "10168107"), false);
const lechNhap = n.totalChecks.find((t) => t.code === "10168110");
eq("ma lech thi bao ra", !!lechNhap, true);
eq("cong dung tu cac cot ngay", lechNhap!.tuBangCheo, 60);
eq("doc dung cot tong", lechNhap!.tuCotTong, 999);

console.log("\n14. Khong co phan nhap thi khong tao gi");
const chiCoXuat: any[][] = [
  ["XUẤT HÀNG THÁNG 08 /2026"],
  [null, null, null, null, null, "Xuất kho"],
  ["STT", "MÃ HÀNG", "TÊN HÀNG", "Ngày", null, "01.08.26"],
  [null, null, null, "Điểm bán", "Tổng Xuất", "NH 1901"],
  [1, "10168107", "Bia hoi", null, 50, 50],
];
eq(
  "sheet khong co moc Nhap Kho",
  parseTkhoNhap(chiCoXuat, "T Kho T8", products).drafts.length,
  0,
);
eq("sheet rong", parseTkhoNhap([], "rong", products).drafts.length, 0);
eq(
  "sheet khong doc duoc thang thi khong doan bua",
  parseTkhoNhap(
    [
      [],
      [null, null, null, "Nhập Kho"],
      ["STT", "MÃ HÀNG", "TÊN HÀNG", "1"],
      [null, null, null, "Tồn Đầu"],
      [1, "10168107", "Bia hoi", 500],
    ],
    "khong co ngay",
    products,
  ).drafts.length,
  0,
);

/*
 * BANG XUAT KHO RUT GON - dung hinh dang tep "nhap file a Dan":
 *   khong co moc "Nhập Kho" / "Xuất kho"
 *   khong co cot Tổng Nhập / Tổng Xuất / Tồn Đầu
 *   hang tieu de nam ngay DONG DAU TIEN, "MÃ HÀNG" o cot 0
 */
const bangRutGon: any[][] = [
  ["MÃ HÀNG", "TÊN HÀNG", "Ngày", "10.08.26", null, "11.08.26"],
  [null, null, "Điểm bán", "NH 1901", "MFV", "NH 1901"],
  ["10168107", "Bia Golden Bridge helles Lager 20lít/bom", "lít", 206, 120, 140.6],
  ["10168110", "Bia Golden Bridge Helles Lager 330ml", "lon", null, 72, null],
];

console.log("\n15. Bang xuat kho rut gon (khong co moc Xuat kho)");
const rg = parseTkhoXuat(bangRutGon, "Sheet1", products);
eq("van doc duoc du dong", rg.drafts.length, 4);
eq("tieu de o dong dau tien van nhan ra", rg.dateRange, {
  from: "2026-08-10",
  to: "2026-08-11",
});
eq(
  "tong so luong dung",
  Math.round(rg.drafts.reduce((s, d) => s + d.quantity, 0) * 10) / 10,
  538.6,
);
eq("khong con diem ban la", rg.unknownOutlets.length, 0);
eq("khong co ma la", rg.unknownCodes.length, 0);
eq(
  "ngay van lan sang phai",
  rg.drafts.filter((d) => d.outlet === "MFV").map((d) => d.dateKey),
  ["2026-08-10", "2026-08-10"],
);
eq(
  "khong co phan nhap thi khong tao gi",
  parseTkhoNhap(bangRutGon, "Sheet1", products).drafts.length,
  0,
);

console.log("\n16. Do chỗ bắt đầu KHONG duoc lan sang vung Nhap kho");
eq(
  "sheet day du van bat dau dung cho co moc",
  parseTkhoXuat(sheet, "T Kho T8", products).drafts.every(
    (d) => d.quantity !== 999 && d.quantity !== 888 && d.quantity !== 300,
  ),
  true,
);

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FILE ĐIỀU CHUYỂN — kiểm ĐI TRỌN VÒNG, không kiểm tắt.
 *
 * Phần cuối của bộ kiểm này dựng tệp `.xlsx` thật từ tệp mẫu rồi ĐỌC LẠI bằng
 * thư viện Excel để so từng ô. Đưa thẳng mảng dữ liệu vào hàm rồi so là đi tắt,
 * bỏ sót đúng loại lỗi mà việc điền vào tệp mẫu sinh ra: mã vật tư bị lưu thành
 * chữ, ngày bị đổi kiểu, số lẻ bị làm tròn, ô mất định dạng.
 *
 * Cái sai đắt nhất ở đây là CHUYỂN BIA VÀO KHO CỦA QUÁN KHÁC. Mã kho sai thì
 * không tổng nào lệch, không ai phát hiện — nên kiểm rất kỹ phần mã kho.
 */

import fs from "node:fs";
import XLSX from "xlsx";
import { INITIAL_PARTNERS, INITIAL_PRODUCTS } from "../../constants";
import {
  CHUA_CO_MA_KHO,
  CO_DINH,
  COT,
  dungFileDieuChuyen,
  KHO_DIEM_BAN,
  khungDong,
  ngayDDMMYYYY,
  SO_COT_DC,
  tieuDeChungTu,
  tomTatDieuChuyen,
} from "../dieuChuyen";
import { kieuCuaCot, themKieuDep } from "../dieuChuyenKieu";
import {
  boCalcChainDc,
  boSheetPhu,
  HANG_DAU_DU_LIEU,
  lamDepSheet,
  MUC_BO_DC,
  SHEET_PHU,
  suaSheetVaChuDc,
  tenTepDieuChuyen,
} from "../dieuChuyenXml";
import { nhomCuaBoPhan } from "../nhomBNC";
import { docZip, giaiNen, suaXlsx } from "../zipXlsx";
import type { Transaction } from "../../types";

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

// ------------------------------------------------------------ ngay va tieu de

eq("ngay dang DD.MM.YYYY", ngayDDMMYYYY("2026-08-27"), "27.08.2026");
eq("ngay co gio phut", ngayDDMMYYYY("2026-08-27T15:00:00.000Z"), "27.08.2026");
eq("ngay rong", ngayDDMMYYYY(""), "");
eq("ngay khong dung dang", ngayDDMMYYYY("27/08/2026"), "");
eq("tieu de chung tu", tieuDeChungTu("LHB", "2026-07-28"), "ĐC Bia LHB 28.07");
eq("tieu de dung dd.MM cua chinh ngay do", tieuDeChungTu("CV", "2026-12-01"), "ĐC Bia CV 01.12");

eq("ten tep mang khoang ngay", tenTepDieuChuyen("2026-08-01", "2026-08-31"),
  "file dieu chuyen bia 2026-08-01 den 2026-08-31.xlsx");

// ------------------------------------------------------------ bang ma kho

// Moi diem trong bang phai la mot bo phan NOI BO thuc su: gan ma kho cho Ngoai
// giao hay cho mot don vi ngoai BNC la chuyen bia vao kho khong ton tai.
Object.keys(KHO_DIEM_BAN).forEach((id) => {
  eq(`${id} thuoc phan Noi bo`, nhomCuaBoPhan(id), "NB");
});
// Cap (plant, slog) phai duy nhat. Cau Vang va Ga 10 chung plant 1050 nhung
// khac slog — trung ca cap la hai quan cung nhan vao mot kho.
{
  const cap = Object.values(KHO_DIEM_BAN).map((k) => `${k.plant}|${k.slog}`);
  eq("khong hai diem nao trung ca cap plant+slog", new Set(cap).size, cap.length);
  const viet = Object.values(KHO_DIEM_BAN).map((k) => k.viet);
  eq("chu viet trong tieu de khong trung", new Set(viet).size, viet.length);
  dung(
    "moi ma kho deu la chu so",
    Object.values(KHO_DIEM_BAN).every((k) => /^\d+$/.test(k.plant) && /^\d+$/.test(k.slog)),
  );
  dung("moi chu viet deu khong rong", viet.every((v) => v.trim() !== ""));
}
// Doi chieu vai ma voi Sheet4 cua tep mau — go tay nen phai kiem.
eq("LHB", KHO_DIEM_BAN["AD0103-LHB"], { plant: "1048", slog: "2025", viet: "LHB" });
eq("Cau Vang", KHO_DIEM_BAN["AD0103-CV"], { plant: "1050", slog: "2037", viet: "CV" });
eq("Ga 10", KHO_DIEM_BAN["AD0103-GA10"], { plant: "1050", slog: "2036", viet: "GA 10" });
eq("Hoi An", KHO_DIEM_BAN["AD0103-HOIAN"], { plant: "1052", slog: "2049", viet: "HỘI AN" });
eq("Cong Thanh 1", KHO_DIEM_BAN["AD0103-CT1"].slog, "2044");
eq("4 Mua", KHO_DIEM_BAN["AD0103-4M"], { plant: "2228", slog: "2001", viet: "4SS" });
// Lau Dai va Shushi Rosa cung slog 2000, khac plant — cap moi phan biet duoc.
eq("Lau Dai", KHO_DIEM_BAN["AD0103-LAUDAI"], { plant: "2118", slog: "2000", viet: "LÂU ĐÀI" });
eq("Shushi Rosa", KHO_DIEM_BAN["AD0103-SUSHI"], { plant: "2117", slog: "2000", viet: "SHUSHI ROSA" });


// MOI DIEM BAN NOI BO phai co ma kho, TRU nhung diem dang cho bo phan cap ma va
// da ghi ten trong CHUA_CO_MA_KHO. Thieu ma kho ma khong ghi ten thi don cua
// diem do bi giu lai am tham moi thang, khong ai doi chieu bang mat duoc.
{
  const noiBo = INITIAL_PARTNERS.filter((p) => nhomCuaBoPhan(p.id) === "NB");
  eq("Noi bo co 18 diem ban", noiBo.length, 18);
  eq(
    "diem thieu ma kho ma chua ghi ten vao danh sach cho",
    noiBo
      .filter((p) => !KHO_DIEM_BAN[p.id] && !CHUA_CO_MA_KHO.includes(p.id))
      .map((p) => p.name),
    [],
  );
  // Danh sach cho khong duoc chua ten la: ghi bua vao day la tat mat bo kiem.
  eq(
    "danh sach cho toan diem ban Noi bo that",
    CHUA_CO_MA_KHO.filter((id) => nhomCuaBoPhan(id) !== "NB"),
    [],
  );
  eq(
    "diem da co ma kho thi khong con trong danh sach cho",
    CHUA_CO_MA_KHO.filter((id) => KHO_DIEM_BAN[id]),
    [],
  );
  eq(
    "bang ma kho cong danh sach cho la du",
    Object.keys(KHO_DIEM_BAN).length + CHUA_CO_MA_KHO.length,
    noiBo.length,
  );
  eq("bang ma kho co du 18 diem", Object.keys(KHO_DIEM_BAN).length, 18);
}

// ------------------------------------------------------------ khung mot dong

{
  const o = khungDong({
    ngay: "2026-08-25",
    partnerId: "AD0103-LHB",
    diemBan: "BNC · Lễ Hội Bia",
    maVatTu: "10168107",
    tenHang: "Bia Golden Bridge Helles Lager",
    soLuong: 61.8,
    dvt: "Lít",
    plant: "1048",
    slog: "2025",
    tieuDe: "ĐC Bia LHB 25.08",
  });
  eq("du 28 o", o.length, SO_COT_DC);
  eq("ngay chung tu", o[COT.ngayChungTu], { t: "s", v: "25.08.2026" });
  eq("ngay nhap xuat bang ngay chung tu", o[COT.ngayNhapXuat], o[COT.ngayChungTu]);
  eq("exec action", o[COT.execAction], { t: "s", v: CO_DINH.execAction });
  eq("loai chung tu", o[COT.loaiChungTu], { t: "s", v: CO_DINH.loaiChungTu });
  eq("movement type", o[COT.movement], { t: "s", v: "Z55" });
  // Ma vat tu phai la SO, khong phai chu: chu thi he thong ben kia co the doc
  // ra mot ma khac.
  eq("ma vat tu la so", o[COT.maVatTu], { t: "n", v: 10168107 });
  eq("so luong", o[COT.soLuong], { t: "n", v: 61.8 });
  eq("co so xuat hang", o[COT.plantXuat], { t: "n", v: 1263 });
  eq("kho xuat hang", o[COT.khoXuat], { t: "n", v: 2143 });
  eq("ma lo", o[COT.maLo], { t: "n", v: 1368 });
  eq("kho nhan hang", o[COT.plantNhan], { t: "n", v: 1048 });
  eq("kho vat ly nhan hang", o[COT.slogNhan], { t: "n", v: 2025 });
  eq("batch nhan hang", o[COT.batchNhan], { t: "n", v: 1368 });
  // Hai cot tieu de phai giong nhau, dung nhu cong thuc Q=E cua tep mau.
  eq("hai cot tieu de giong nhau", o[COT.tieuDe], o[COT.tieuDe2]);
  eq("tieu de", o[COT.tieuDe], { t: "s", v: "ĐC Bia LHB 25.08" });
}

// ------------------------------------------------------------ gom du lieu

const ma = (m: string) => INITIAL_PRODUCTS.find((x) => x.materialCode === m)!.id;
const tx = (o: Partial<Transaction>): Transaction =>
  ({
    id: "t",
    date: "2026-08-25T08:00:00.000Z",
    type: "OUT",
    productId: ma("10168107"),
    productName: "Bia Golden Bridge Helles Lager",
    category: "Lít",
    quantity: 0,
    partnerId: "AD0103-LHB",
    partnerName: "BNC · Lễ Hội Bia",
    createdBy: "test",
    ...o,
  }) as Transaction;

const transactions: Transaction[] = [
  // Chuyen g1: hai mat hang, mat hang dau tach hai lo.
  tx({ id: "a1", referenceGroupId: "g1", quantity: 41.2 }),
  tx({ id: "a2", referenceGroupId: "g1", quantity: 20.6 }),
  tx({ id: "a3", referenceGroupId: "g1", productId: ma("10174040"), quantity: 61.8 }),
  // Chuyen g2: cung ngay cung diem cung mat hang -> phai la dong RIENG.
  tx({ id: "b1", referenceGroupId: "g2", quantity: 20.6 }),
  // Bia lon o mot diem khac.
  tx({ id: "c1", referenceGroupId: "g3", partnerId: "AD0103-CV",
       partnerName: "BNC · Cầu Vàng", productId: ma("10168110"),
       category: "Lon", quantity: 24 }),
  // Quan moi mo, chua co trong bang ma kho -> phai bi giu lai chu khong doan ma.
  tx({ id: "d1", partnerId: "AD0103-QUANMOI", partnerName: "BNC · Quán Mới", quantity: 20.6 }),
  // Ngoai giao, HTKD, Chi phi khac: khong dieu chuyen.
  tx({ id: "e1", partnerId: "AD0103-NG", partnerName: "BNC · Ngoại giao", quantity: 100 }),
  tx({ id: "e2", partnerId: "AD0103-HTKD", partnerName: "BNC · HTKD", quantity: 50 }),
  tx({ id: "e3", partnerId: "AD0103-CPK", partnerName: "BNC · Chi phí khác", quantity: 10 }),
  // Don vi ngoai BNC.
  tx({ id: "f1", partnerId: "AC0107", partnerName: "FV", quantity: 82.4 }),
  // Nhap kho va hao hut: khong phai xuat cho diem ban.
  tx({ id: "g1x", type: "IN", quantity: 500 }),
  tx({ id: "g2x", type: "LOSS", quantity: 5 }),
  // So luong 0 hoac am: khong sinh dong.
  tx({ id: "h1", referenceGroupId: "h", quantity: 0 }),
  tx({ id: "h2", referenceGroupId: "h", quantity: -3 }),
];

const f = dungFileDieuChuyen({
  transactions,
  products: INITIAL_PRODUCTS,
  tuNgay: "",
  denNgay: "",
});

eq("bon dong", f.dong.length, 4);
eq("ba chuyen giao", f.soDon, 3);
eq("moi dong co 28 o", f.oDong.every((o) => o.length === SO_COT_DC), true);

// Chi lay Noi bo.
eq(
  "khong lot Ngoai giao, HTKD, Chi phi khac hay don vi ngoai BNC",
  f.dong.filter((d) => nhomCuaBoPhan(d.partnerId) !== "NB").length,
  0,
);
eq("khong lot nhap kho hay hao hut", f.dong.every((d) => d.soLuong > 0), true);

// Cung mat hang trong cung chuyen thi CONG lai (tep khong co cot ma lo rieng).
{
  const g1 = f.dong.filter((d) => d.maVatTu === "10168107" && d.soLuong === 61.8);
  eq("hai lo cung mat hang cung chuyen gop thanh mot dong", g1.length, 1);
  // Lam tron ba so le: 41,2 + 20,6 trong so thuc ra 61,800000000000004.
  dung("so luong da lam tron", Number.isInteger(g1[0].soLuong * 1000));
}
// Hai chuyen khac nhau thi KHONG cong: doi chieu duoc voi bien ban tung chuyen.
eq(
  "hai chuyen cung ngay cung mat hang van la hai dong",
  f.dong.filter((d) => d.maVatTu === "10168107").length,
  2,
);

// Diem ban chua co ma kho bi giu lai, KHONG doan ma.
eq("giu lai dung mot diem ban", f.thieuMaKho.length, 1);
eq("noi ro diem nao", f.thieuMaKho[0].ten, "BNC · Quán Mới");
eq("dem dung so dong giu lai", f.thieuMaKho[0].soDong, 1);
eq("dem dung so luong giu lai", f.thieuMaKho[0].soLuong, 20.6);
eq(
  "diem chua co ma kho khong co dong nao trong tep",
  f.dong.filter((d) => d.partnerId === "AD0103-QUANMOI").length,
  0,
);

// Cau tom tat phai NOI RA phan bi giu lai.
{
  const t = tomTatDieuChuyen(f);
  dung("tom tat co so dong", t.includes("4 dòng"));
  dung("tom tat co so chuyen", t.includes("3 chuyến"));
  dung("tom tat noi ro diem bi giu lai", t.includes("Quán Mới"));
}
eq(
  "khong co du lieu thi noi ro",
  tomTatDieuChuyen(dungFileDieuChuyen({
    transactions: [], products: INITIAL_PRODUCTS, tuNgay: "", denNgay: "",
  })),
  "Không có đơn Nội bộ nào trong khoảng ngày này.",
);

// Loc theo khoang ngay va theo mot diem ban.
{
  const mot = dungFileDieuChuyen({
    transactions, products: INITIAL_PRODUCTS,
    tuNgay: "", denNgay: "", boPhan: "AD0103-CV",
  });
  eq("loc mot diem ban", mot.dong.length, 1);
  eq("dung diem ban do", mot.dong[0].partnerId, "AD0103-CV");
  const ngoaiKhoang = dungFileDieuChuyen({
    transactions, products: INITIAL_PRODUCTS,
    tuNgay: "2026-09-01", denNgay: "2026-09-30",
  });
  eq("ngoai khoang ngay thi rong", ngoaiKhoang.dong.length, 0);
  eq("ngoai khoang ngay thi khong bao thieu ma kho", ngoaiKhoang.thieuMaKho.length, 0);
}

// Mat hang thieu ma vat tu thi giu lai, khong khop theo ten.
{
  const khongMa = dungFileDieuChuyen({
    transactions: [tx({ id: "z1", productId: "khong-co-trong-danh-muc", quantity: 20.6 })],
    products: INITIAL_PRODUCTS, tuNgay: "", denNgay: "",
  });
  eq("khong co ma vat tu thi khong xuat dong", khongMa.dong.length, 0);
  eq("bao ra mat hang thieu ma", khongMa.thieuMaVatTu.length, 1);
}

// ------------------------------------------------------------ DI TRON VONG: ghi tep roi doc lai

{
  const goc = new Uint8Array(fs.readFileSync("src/assets/mau-dieu-chuyen.xlsx"));
  const muc = docZip(goc);
  const doc = async (ten: string) => {
    const m = muc.find((x) => x.ten === ten);
    if (!m) throw new Error(`thieu ${ten}`);
    return new TextDecoder().decode(await giaiNen(m));
  };
  const sheetGoc = await doc("xl/worksheets/sheet1.xml");
  const { sheetXml, chuXml } = suaSheetVaChuDc(
    sheetGoc, await doc("xl/sharedStrings.xml"), f.oDong,
  );
  const bo = boCalcChainDc(
    await doc("[Content_Types].xml"), await doc("xl/_rels/workbook.xml.rels"),
  );

  // Nam hang tieu de con nguyen tung byte.
  for (let r = 1; r <= 5; r++) {
    const lay = (x: string) =>
      new RegExp(`<row r="${r}"[^>]*>.*?</row>`, "s").exec(x)?.[0] ?? "";
    dung(`hang tieu de ${r} co that`, lay(sheetGoc).length > 0);
    eq(`hang tieu de ${r} khong doi mot byte`, lay(sheetXml), lay(sheetGoc));
  }
  // Khong con cong thuc nao trong vung du lieu (tep mau co 520 cong thuc).
  dung(
    "khong de lai cong thuc",
    !sheetXml.slice(sheetXml.indexOf('<row r="6"')).includes("<f>"),
  );
  dung("bo calcChain khoi Content_Types", !bo.contentTypes.includes("calcChain"));
  dung("bo calcChain khoi rels", !bo.rels.includes("calcChain"));

  const blob = await suaXlsx(goc, {
    "xl/worksheets/sheet1.xml": sheetXml,
    "xl/sharedStrings.xml": chuXml,
    "[Content_Types].xml": bo.contentTypes,
    "xl/_rels/workbook.xml.rels": bo.rels,
  }, MUC_BO_DC);

  const wb = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // HAI SHEET HUONG DAN phai con nguyen trong tep xuat ra: Sheet3 giai thich 28
  // cot, Sheet4 la bang ma kho. Nguoi nhan tep mo len phai thay du nhu cu.
  eq("con ca ba sheet", wb.SheetNames.length, 3);
  eq("Sheet4 con bang ma kho", wb.Sheets["Sheet4"]?.["D9"]?.v, 2329);
  eq("Sheet4 con ten diem ban", wb.Sheets["Sheet4"]?.["C9"]?.v, "BNC · 1901");
  eq("Sheet3 con phan giai thich", wb.Sheets["Sheet3"]?.["B9"]?.v, "Ngày tạo chứng từ");

  const oO = (c: string, r: number) => ws[`${c}${r}`];
  // Dong dau: Cau Vang, bia lon 24.
  eq("A6 ngay dang chu", oO("A", 6)?.v, "25.08.2026");
  eq("A6 phai la CHU khong phai ngay", oO("A", 6)?.t, "s");
  eq("B6 bang A6", oO("B", 6)?.v, oO("A", 6)?.v);
  eq("C6", oO("C", 6)?.v, "A07");
  eq("D6", oO("D", 6)?.v, "R10");
  eq("E6 tieu de", oO("E", 6)?.v, "ĐC Bia CV 25.08");
  eq("F6 movement", oO("F", 6)?.v, "Z55");
  eq("J6 ma vat tu doc lai van la so", oO("J", 6)?.t, "n");
  eq("J6 ma vat tu khong mat chu so nao", oO("J", 6)?.v, 10168110);
  eq("K6 so luong", oO("K", 6)?.v, 24);
  eq("M6", oO("M", 6)?.v, 1263);
  eq("N6", oO("N", 6)?.v, 2143);
  eq("O6", oO("O", 6)?.v, 1368);
  eq("Q6 bang E6", oO("Q", 6)?.v, oO("E", 6)?.v);
  eq("Z6 kho nhan cua Cau Vang", oO("Z", 6)?.v, 1050);
  eq("AA6 kho vat ly cua Cau Vang", oO("AA", 6)?.v, 2037);
  eq("AB6 batch nhan", oO("AB", 6)?.v, 1368);
  // Cot L (DVT) khong co gia tri, dung nhu tep mau — nhung van phai co O de
  // giu ke vien, khong thi bang ho 13 cho.
  eq("L6 khong co gia tri", oO("L", 6)?.v, undefined);

  // So le KHONG bi lam tron mat: 61,8 phai con la 61,8.
  eq("K7 giu nguyen so le", oO("K", 7)?.v, 61.8);
  eq("K8 giu nguyen so le", oO("K", 8)?.v, 20.6);

  // Dong cuoi dung so hang, khong sinh thua dong nao.
  eq("het du lieu o hang 9", oO("A", 10), undefined);
  eq("vung du lieu tinh dung hang cuoi", ws["!ref"], "A1:AB9");

  // Doc lai bang thu vien Excel van thay day du dinh dang.
  const wbS = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: "array", cellStyles: true });
  const wsS = wbS.Sheets[wbS.SheetNames[0]];
  const coKieu = Object.keys(wsS).filter((k) => k[0] !== "!" && (wsS[k] as { s?: unknown }).s).length;
  dung(`con dinh dang (${coKieu} o co dinh dang)`, coKieu > 150);
}

// ------------------------------------------------- bo sheet phu va lam dep

{
  const goc = new Uint8Array(fs.readFileSync("src/assets/mau-dieu-chuyen.xlsx"));
  const muc = docZip(goc);
  const doc = async (ten: string) => {
    const m = muc.find((x) => x.ten === ten);
    if (!m) throw new Error(`thieu ${ten}`);
    return new TextDecoder().decode(await giaiNen(m));
  };
  const sheetGoc = await doc("xl/worksheets/sheet1.xml");
  const { stylesXml, kieu } = themKieuDep(await doc("xl/styles.xml"));
  const { sheetXml, chuXml } = suaSheetVaChuDc(
    sheetGoc, await doc("xl/sharedStrings.xml"), f.oDong, kieu, f.toNen,
  );
  const boCC = boCalcChainDc(
    await doc("[Content_Types].xml"), await doc("xl/_rels/workbook.xml.rels"),
  );
  const hangCuoi = HANG_DAU_DU_LIEU + f.oDong.length - 1;
  const bo = boSheetPhu(
    await doc("xl/workbook.xml"), boCC.rels, boCC.contentTypes,
    await doc("docProps/app.xml"), hangCuoi,
  );
  const depXml = lamDepSheet(sheetXml, kieu);

  // Tep mau co ba sheet, tep xuat chi con mot.
  eq("tep mau co ba sheet", (await doc("xl/workbook.xml")).match(/<sheet /g)?.length, 3);
  eq("tep xuat con mot sheet", bo.workbookXml.match(/<sheet /g)?.length, 1);
  dung("giu sheet du lieu", bo.workbookXml.includes('name="file đc"'));
  dung("khong con Sheet3", !bo.workbookXml.includes("Sheet3"));
  dung("khong con Sheet4", !bo.workbookXml.includes("Sheet4"));
  // activeTab tro tab thu hai, bo tab do ma de nguyen thi Excel bao loi khi mo.
  dung("tep mau mo san tab thu hai", (await doc("xl/workbook.xml")).includes('activeTab="1"'));
  dung("da bo activeTab", !bo.workbookXml.includes("activeTab"));
  // Vung loc khai trong workbook phai khop voi vung loc trong sheet.
  dung(
    "vung loc trong workbook doi theo hang cuoi",
    bo.workbookXml.includes(`$A$5:$AB$${hangCuoi}`),
  );
  dung(
    "vung loc trong sheet cung hang cuoi",
    depXml.includes(`<autoFilter ref="A5:AB${hangCuoi}"`),
  );
  // Khai bao cua hai sheet phu phai bo o ca ba cho, khong thi tep hong.
  dung("bo quan he cua sheet phu", !/worksheets\/sheet[23]\.xml/.test(bo.relsXml));
  dung("bo khai bao kieu cua sheet phu", !/worksheets\/sheet[23]\.xml/.test(bo.contentTypes));
  dung("giu lai sheet du lieu trong Content_Types", bo.contentTypes.includes("worksheets/sheet1.xml"));
  eq("app.xml con mot ten sheet", bo.appXml.match(/<vt:lpstr>/g)?.length, 2);
  dung("app.xml dem lai con 1", bo.appXml.includes("<vt:i4>1</vt:i4>"));

  // LAM DEP chi doi cach hien thi, KHONG doi vi tri o nao.
  {
    const oCua = (x: string) =>
      (x.match(/<c r="[A-Z]+\d+"/g) ?? []).join(",");
    eq("lam dep khong them bo mot o nao", oCua(depXml), oCua(sheetXml));
    const hangCua = (x: string) => (x.match(/<row r="(\d+)"/g) ?? []).join(",");
    eq("lam dep khong them bo mot hang nao", hangCua(depXml), hangCua(sheetXml));
  }
  // KHONG AN HANG NAO: bo phan can thay ca nam hang tieu de de doi chieu voi
  // bang mo ta truong.
  [1, 2, 3, 4, 5, 6].forEach((r) => {
    dung(
      `khong an hang ${r}`,
      !new RegExp(`<row r="${r}"[^>]*hidden="1"`).test(depXml),
    );
  });
  eq("ca sheet khong co hang nao bi an", (depXml.match(/<row [^>]*hidden="1"/g) ?? []).length, 0);

  // Bang cot cua tep mau giu nguyen: khong an cot nao, khong doi do rong.
  {
    const colsGoc = /<cols>.*?<\/cols>/s.exec(sheetGoc)?.[0] ?? "";
    const colsDep = /<cols>.*?<\/cols>/s.exec(depXml)?.[0] ?? "";
    dung("tep mau co bang cot", colsGoc.length > 0);
    eq("bang cot khong doi", colsDep, colsGoc);
  }
  // Mo tep len phai thay o A1, va khoa nam hang tieu de.
  dung("khoa nam hang tieu de", depXml.includes('ySplit="5"'));
  dung("mo len nhin thay dau bang", depXml.includes('topLeftCell="A6"'));
  dung("tep mau mo san giua bang", sheetGoc.includes('topLeftCell="O1"'));
  dung("da bo cho mo giua bang", !depXml.includes('topLeftCell="O1"'));

  // Doc lai tep hoan chinh: chi con mot sheet, du lieu va dinh dang con nguyen.
  const blob = await suaXlsx(goc, {
    "xl/worksheets/sheet1.xml": depXml,
    "xl/styles.xml": stylesXml,
    "xl/sharedStrings.xml": chuXml,
    "xl/workbook.xml": bo.workbookXml,
    "docProps/app.xml": bo.appXml,
    "[Content_Types].xml": bo.contentTypes,
    "xl/_rels/workbook.xml.rels": bo.relsXml,
  }, [...MUC_BO_DC, ...SHEET_PHU]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const conLai = docZip(bytes).map((m) => m.ten);
  dung("khong con tep sheet phu trong bo nen", !conLai.some((t) => SHEET_PHU.includes(t)));
  dung("khong con calcChain", !conLai.includes("xl/calcChain.xml"));

  const wb = XLSX.read(bytes, { type: "array", cellStyles: true });
  eq("mo ra chi thay mot sheet", wb.SheetNames.length, 1);
  const ws = wb.Sheets[wb.SheetNames[0]];
  eq("du lieu con nguyen sau khi lam dep", ws["Z6"]?.v, f.dong[0].plant === "1048" ? 1048 : Number(f.dong[0].plant));
  eq("ma vat tu con nguyen", ws["J6"]?.v, Number(f.dong[0].maVatTu));
  const coKieu = Object.keys(ws).filter((k) => k[0] !== "!" && (ws[k] as { s?: unknown }).s).length;
  dung(`con dinh dang sau khi lam dep (${coKieu} o)`, coKieu > 150);
}

// ------------------------------------------------- ke o, mau chu, mau o

{
  const goc = new Uint8Array(fs.readFileSync("src/assets/mau-dieu-chuyen.xlsx"));
  const muc = docZip(goc);
  const doc = async (ten: string) => {
    const m = muc.find((x) => x.ten === ten);
    if (!m) throw new Error(`thieu ${ten}`);
    return new TextDecoder().decode(await giaiNen(m));
  };
  const kieuGoc = await doc("xl/styles.xml");
  const { stylesXml, kieu } = themKieuDep(kieuGoc);

  const dem = (x: string, tag: string) =>
    Number(new RegExp(`<${tag} count="([0-9]+)"`).exec(x)?.[1] ?? -1);

  // THEM kieu chu khong sua 90 kieu cu: sua kieu cu la doi ca nhung o ta khong
  // dung toi, ma kieu nao dang dung o dau thi khong biet chac.
  eq("them 11 kieu o", dem(stylesXml, "cellXfs"), dem(kieuGoc, "cellXfs") + 11);
  eq("them 4 phong", dem(stylesXml, "fonts"), dem(kieuGoc, "fonts") + 4);
  eq("them 3 nen", dem(stylesXml, "fills"), dem(kieuGoc, "fills") + 3);
  eq("them 1 vien", dem(stylesXml, "borders"), dem(kieuGoc, "borders") + 1);
  // Toan bo kieu cu phai con y nguyen, chi khac dong khai so dem o dau khoi.
  {
    const ruot = (x: string) =>
      x.slice(x.indexOf(">", x.indexOf("<cellXfs")) + 1, x.indexOf("</cellXfs>"));
    dung("kieu cu con nguyen", stylesXml.includes(ruot(kieuGoc)));
  }
  // Chi so kieu phai tinh tu so dem hien co, khong viet cung.
  eq("chi so kieu dau tien", kieu.tieuDeChinh, dem(kieuGoc, "cellXfs"));
  eq("11 chi so khac nhau", new Set(Object.values(kieu)).size, 11);

  dung("co ke o mau xam", stylesXml.includes('style="thin"><color rgb="FFCBD5E1"'));
  dung("co nen dau bang xanh den", stylesXml.includes('rgb="FF0F172A"'));
  dung("co nen dong chan gan trang", stylesXml.includes('rgb="FFF8FAFC"'));
  dung("co chu trang cho dau bang", stylesXml.includes('rgb="FFFFFFFF"'));
  // Goi hai lan phai ra hai bo kieu doc lap, khong hong bang kieu.
  {
    const lan2 = themKieuDep(stylesXml);
    eq("goi lan hai them tiep 11 kieu", dem(lan2.stylesXml, "cellXfs"), dem(stylesXml, "cellXfs") + 11);
    dung("chi so lan hai khac lan mot", lan2.kieu.tieuDeChinh !== kieu.tieuDeChinh);
  }

  // Cot nao dung kieu nao.
  eq("cot so luong dung kieu so", kieuCuaCot("K", kieu, false), kieu.soLuong);
  eq("cot tieu de can trai", kieuCuaCot("E", kieu, false), kieu.chuTrai);
  eq("cot tieu de thu hai cung can trai", kieuCuaCot("Q", kieu, false), kieu.chuTrai);
  ["Z", "AA", "AB"].forEach((c) => {
    eq(`cot ma kho ${c} in dam`, kieuCuaCot(c, kieu, false), kieu.nhanManh);
  });
  eq("cot ngay can giua", kieuCuaCot("A", kieu, false), kieu.giua);
  eq("dong chan dung kieu co nen", kieuCuaCot("A", kieu, true), kieu.giuaChan);
  dung(
    "moi cot deu doi kieu khi sang dong chan",
    ["A", "E", "K", "Z"].every(
      (c) => kieuCuaCot(c, kieu, false) !== kieuCuaCot(c, kieu, true),
    ),
  );

  // TO NEN SO LE THEO CHUNG TU, khong theo dong: mot chung tu co may mat hang
  // thi may dong lien nhau phai cung mau, khong thi cat ngang giua chung tu.
  {
    const dsTen = new Map<string, string>(
      Object.keys(KHO_DIEM_BAN).map((id) => [id, `BNC ${id.slice(7)}`]),
    );
    const g = dungFileDieuChuyen({
      transactions: [
        // Chung tu 1: hai mat hang.
        tx({ id: "x1", referenceGroupId: "k1", partnerId: "AD0103-LHB", quantity: 20.6 }),
        tx({ id: "x2", referenceGroupId: "k1", partnerId: "AD0103-LHB", productId: ma("10174040"), quantity: 20.6 }),
        // Chung tu 2: mot mat hang, diem ban khac.
        tx({ id: "x3", referenceGroupId: "k2", partnerId: "AD0103-CV", quantity: 20.6 }),
        // Chung tu 3: cung diem ban voi chung tu 1 nhung KHAC NGAY.
        tx({ id: "x4", referenceGroupId: "k3", partnerId: "AD0103-LHB", date: "2026-08-26T08:00:00.000Z", quantity: 20.6 }),
      ],
      products: INITIAL_PRODUCTS, tuNgay: "", denNgay: "", tenBoPhan: dsTen,
    });
    eq("bon dong", g.dong.length, 4);
    eq("moi dong co mot co to nen", g.toNen.length, g.dong.length);
    // Hai dong cua cung chung tu phai cung mau.
    const cungChungTu = g.dong
      .map((d, i) => ({ khoa: `${d.ngay}|${d.partnerId}`, nen: g.toNen[i] }))
      .reduce((m, o) => {
        const co = m.get(o.khoa);
        m.set(o.khoa, co === undefined ? o.nen : co === o.nen ? o.nen : !o.nen);
        return m;
      }, new Map<string, boolean>());
    eq("khong chung tu nao bi cat ngang mau", cungChungTu.size, 3);
    g.dong.forEach((d, i) => {
      eq(
        `dong ${i} cung mau voi chung tu cua no`,
        g.toNen[i],
        cungChungTu.get(`${d.ngay}|${d.partnerId}`),
      );
    });
    // Chung tu lien nhau phai khac mau, khong thi khong nhin ra ranh gioi.
    const mauTheoChungTu = Array.from(cungChungTu.values());
    dung(
      "chung tu lien nhau khac mau",
      mauTheoChungTu.every((v, i) => i === 0 || v !== mauTheoChungTu[i - 1]),
    );
  }
}

// ------------------------------- ba dieu bo phan yeu cau sua

{
  const goc = new Uint8Array(fs.readFileSync("src/assets/mau-dieu-chuyen.xlsx"));
  const muc = docZip(goc);
  const doc = async (ten: string) => {
    const m = muc.find((x) => x.ten === ten);
    if (!m) throw new Error(`thieu ${ten}`);
    return new TextDecoder().decode(await giaiNen(m));
  };
  const { stylesXml, kieu } = themKieuDep(await doc("xl/styles.xml"));
  const { sheetXml } = suaSheetVaChuDc(
    await doc("xl/worksheets/sheet1.xml"),
    await doc("xl/sharedStrings.xml"),
    f.oDong, kieu, f.toNen,
  );
  const dep = lamDepSheet(sheetXml, kieu);

  // 1. KHONG AN COT NAO. Bo phan can thay du 28 cot de doi chieu voi bang mo ta
  // truong; cot an thi luc kiem tep khong ai biet la no van o do.
  eq("khong an cot nao", (dep.match(/<col [^>]*hidden="1"/g) ?? []).length, 0);
  // KHONG AN HANG NAO. Bo phan can thay ca nam hang tieu de.
  eq("khong an hang nao", (dep.match(/<row [^>]*hidden="1"/g) ?? []).length, 0);

  // 2. SO LUONG DE DANG GENERAL, khong gan ma dinh dang so nao.
  {
    const xfs = /<cellXfs.*?<\/cellXfs>/s.exec(stylesXml)![0];
    const ds = xfs.match(/<xf [^>]*?(?:\/>|>.*?<\/xf>)/gs)!;
    eq(
      "kieu so luong de numFmtId 0",
      /numFmtId="([0-9]+)"/.exec(ds[kieu.soLuong])?.[1],
      "0",
    );
    eq(
      "kieu so luong dong chan cung vay",
      /numFmtId="([0-9]+)"/.exec(ds[kieu.soLuongChan])?.[1],
      "0",
    );
    dung(
      "khong them ma dinh dang so nao vao bang kieu",
      !stylesXml.includes('formatCode="#,##0'),
    );
  }

  // 3. TU COT AC TRO DI KHONG TO MAU GI. Kieu dat o the <row> ap cho moi o toi
  // het 16.384 cot, nen nen dam tran qua AC va chay het man hinh — day la chinh
  // cai bo phan nhin thay. Bo kieu cua hang di, tung o da co kieu rieng.
  {
    const hangCua = (r: number) =>
      new RegExp(`<row r="${r}"[^>]*>`).exec(dep)?.[0] ?? "";
    [1, 2, 3, 6, 7].forEach((r) => {
      dung(`hang ${r} khong mang kieu rieng`, !/\ss="\d+"/.test(hangCua(r)));
      dung(`hang ${r} khong con customFormat`, !hangCua(r).includes("customFormat"));
    });
    // Vung du lieu chi tinh toi cot AB.
    dung("khong co o nao qua cot AB", !/<c r="A[C-Z]\d/.test(dep));
    dung("khong co o nao o cot hai chu khac", !/<c r="B[A-Z]\d/.test(dep));
  }

  // Nhung phai ghi DU 28 O moi hang du lieu, ke ca o khong co gia tri: o trong
  // van phai co ke vien, khong thi bang ho 13 cho.
  {
    const ruot = /<row r="6"[^>]*>(.*?)<\/row>/s.exec(dep)![1];
    eq("hang du lieu du 28 o", (ruot.match(/<c r=/g) ?? []).length, 28);
    // O trong phai co kieu, khong thi khong co vien.
    dung(
      "o trong van co kieu",
      ["G6", "L6", "P6", "Y6"].every((o) =>
        new RegExp(`<c r="${o}" s="[0-9]+"/>`).test(ruot),
      ),
    );
  }
}

// ------------------------- bo phan BNC khong thuoc Noi bo

// Loai dung theo thiet ke, nhung phai NOI RA. Thang 8/2026 da mat cong do:
// "Shushi Rosa" trong sheet T Kho duoc gan vao Chi phi khac nen bien mat khoi
// tep ma khong cho nao nhac, nhin tep thi tuong app bo sot.
{
  eq("ba phan kia deu duoc dem ra", f.ngoaiNoiBo.length, 3);
  eq(
    "noi ro ten tung phan",
    f.ngoaiNoiBo.map((o) => o.ten).sort(),
    ["BNC · Chi phí khác", "BNC · HTKD", "BNC · Ngoại giao"],
  );
  const ng = f.ngoaiNoiBo.find((o) => o.ten === "BNC · Ngoại giao");
  eq("dem dung so luong Ngoai giao", ng?.soLuong, 100);
  eq("dem dung so dong Ngoai giao", ng?.soDong, 1);
  // Khong duoc dem lan sang don vi NGOAI BNC (FV) hay sang chinh Noi bo.
  dung(
    "khong dem don vi ngoai BNC",
    !f.ngoaiNoiBo.some((o) => o.ten === "FV"),
  );
  dung(
    "khong dem diem ban Noi bo",
    !f.ngoaiNoiBo.some((o) => o.ten.includes("Lễ Hội")),
  );
  // Va van khong co dong nao cua ba phan do trong tep.
  eq(
    "khong dong nao cua ba phan kia lot vao tep",
    f.dong.filter((d) => nhomCuaBoPhan(d.partnerId) !== "NB").length,
    0,
  );
  // Ngoai khoang ngay thi khong bao gi ca.
  eq(
    "ngoai khoang ngay thi khong bao",
    dungFileDieuChuyen({
      transactions, products: INITIAL_PRODUCTS,
      tuNgay: "2026-09-01", denNgay: "2026-09-30",
    }).ngoaiNoiBo.length,
    0,
  );
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

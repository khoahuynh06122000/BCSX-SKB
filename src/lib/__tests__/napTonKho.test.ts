/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NẠP EXCEL TỒN KHO.
 *
 * Phép kiểm đắt nhất là "nạp lại nguyên tệp cũ → không ghi gì". Đó đúng là lỗi
 * của bản cũ: mã tài liệu `Date.now()` + `Math.random()`, mỗi lần nạp lại là
 * thêm một bộ giao dịch.
 *
 * Mọi phép kiểm gọi đúng hàm thật trong `napTonKho.ts`, và có một vòng đi
 * trọn đường người dùng đi: dựng tệp .xlsx thật → đọc lên → phân nhóm.
 */

import * as XLSX from "xlsx";
import type { Product, Transaction } from "../../types";
import {
  DOI_TAC_DONG_BO,
  docBangTonKho,
  lapKeHoachDongBo,
  maDongBo,
  type KeHoachDongBo,
} from "../napTonKho";

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

const SP: Product[] = [
  { id: "p1", name: "Bia Golden Bridge Helles Lager", materialCode: "10168107", category: "Lít", unit: "Lít", price: 0, conversionFactor: 1, capacityPerUnit: 1000 },
  { id: "p4", name: "Bia Golden Bridge Helles Lager lon330ml", materialCode: "10168110", category: "Lon", unit: "Lon", price: 0, conversionFactor: 1, capacityPerUnit: 330 },
  { id: "p9", name: "Bia Đặc Biệt", materialCode: "", category: "Lít", unit: "Lít", price: 0, conversionFactor: 1, capacityPerUnit: 1000 },
] as Product[];

const TIEU_DE = ["Sản phẩm", "Đơn vị", "Tồn đầu", "Tổng nhập", "Tổng xuất", "Hao hụt"];

/** Biến kế hoạch thành giao dịch, như thể đã ghi xuống — để thử nạp lại. */
function daGhi(kh: KeHoachDongBo): Transaction[] {
  return kh.ghiMoi.map(
    (d) =>
      ({
        id: d.id,
        date: "2026-10-14T00:00:00.000Z",
        type: d.loai,
        productId: d.productId,
        productName: d.productName,
        category: "Lít",
        quantity: d.soLuong,
        partnerId: DOI_TAC_DONG_BO,
        partnerName: "Đồng bộ Excel tồn kho",
        createdBy: "x",
      }) as Transaction,
  );
}

// =============================================== doc bang, tu do tieu de

{
  // Tep xuat tu Bao cao tong hop co dong tieu de lon o tren.
  const tep = docBangTonKho([
    ["BÁO CÁO NHẬP XUẤT TỒN"],
    ["Từ 01/10/2026 đến 14/10/2026"],
    [],
    TIEU_DE,
    ["Bia Golden Bridge Helles Lager", "Lít", "1.234,5", "300", "200", "(1,5)"],
    [],
    ["Tổng cộng", "", 0, 0, 0, 0],
  ]);
  eq("tu do dong tieu de, bo dong trong va dong tong", tep.length, 1);
  eq("doc so kieu Viet: dau cham ngan nghin, phay thap phan", tep[0].so.OPENING, 1234.5);
  eq("so trong ngoac la so am", tep[0].so.LOSS, -1.5);
  eq("so dong Excel dung de nguoi dung tim", tep[0].dongExcel, 5);
  eq("doc dung cot Tong nhap chu n thuong (tep cua chinh app)", tep[0].so.IN, 300);
}

eq("khong co dong tieu de nao thi tra rong", docBangTonKho([["a", "b"], [1, 2]]), []);

{
  // Ten cot viet khac nhau van doc duoc.
  const tep = docBangTonKho([
    ["Product", "Unit", "Opening Stock", "Total Import", "Total Export"],
    ["Bia Golden Bridge Helles Lager", "Lít", 10, 20, 5],
  ]);
  eq("ten cot tieng Anh", [tep[0].so.OPENING, tep[0].so.IN, tep[0].so.OUT], [10, 20, 5]);
  eq("thieu cot hao hut thi la 0", tep[0].so.LOSS, 0);
}

// ================================================== lan nap dau tien

const TEP_1 = docBangTonKho([
  TIEU_DE,
  ["Bia Golden Bridge Helles Lager", "Lít", 100, 300, 200, 2],
  ["Bia Golden Bridge Helles Lager lon330ml", "Lon", 0, 480, 240, 0],
]);
const kh1 = lapKeHoachDongBo(TEP_1, SP, []);
eq(
  "lan dau: ghi moi moi so khac 0",
  kh1.ghiMoi.map((d) => `${d.id}=${d.soLuong}`),
  [
    "dongbo-opening-p1=100",
    "dongbo-in-p1=300",
    "dongbo-out-p1=200",
    "dongbo-loss-p1=2",
    "dongbo-in-p4=480",
    "dongbo-out-p4=240",
  ],
);
eq("ton dau la dong TON DAU rieng, khong cong vao NHAP", kh1.ghiMoi.find((d) => d.loai === "IN" && d.productId === "p1")?.soLuong, 300);
eq("ma suy tu loai va mat hang", maDongBo("IN", "p1"), "dongbo-in-p1");

// ===================== NAP LAI NGUYEN TEP CU -> KHONG GHI GI, KHONG NHAN DOI

{
  const kh = lapKeHoachDongBo(TEP_1, SP, daGhi(kh1));
  eq("nap lai nguyen tep: khong ghi moi", kh.ghiMoi.length, 0);
  eq("nap lai nguyen tep: khong lech", kh.lech.length, 0);
  eq("nap lai nguyen tep: tat ca da co y nguyen", kh.giongHet.length, 6);
}

// =================================== sua so mot mat hang -> lech, hoi lai

{
  const tep = docBangTonKho([
    TIEU_DE,
    ["Bia Golden Bridge Helles Lager", "Lít", 100, 350, 200, 2],
    ["Bia Golden Bridge Helles Lager lon330ml", "Lon", 0, 480, 240, 0],
  ]);
  const kh = lapKeHoachDongBo(tep, SP, daGhi(kh1));
  eq("sua nhap 300 -> 350 thanh mot dong lech", kh.lech.map((l) => `${l.moi.id}:${l.cu[0].quantity}->${l.moi.soLuong}`), ["dongbo-in-p1:300->350"]);
  eq("dong khong doi van la giong het (khong bi xoa nham)", kh.giongHet.length, 5);
}

// =========================== tep nay ghi 0 cho dong da co -> lech, go di

{
  const tep = docBangTonKho([
    TIEU_DE,
    ["Bia Golden Bridge Helles Lager", "Lít", 100, 300, 200, 0],
    ["Bia Golden Bridge Helles Lager lon330ml", "Lon", 0, 480, 240, 0],
  ]);
  const kh = lapKeHoachDongBo(tep, SP, daGhi(kh1));
  eq("hao hut nay ghi 0 -> lech voi so moi 0 (thay la go)", kh.lech.map((l) => [l.moi.id, l.moi.soLuong]), [["dongbo-loss-p1", 0]]);
}

// ================== mat hang khong co trong tep lan nay -> KHONG dung toi

{
  const tep = docBangTonKho([TIEU_DE, ["Bia Golden Bridge Helles Lager", "Lít", 100, 300, 200, 2]]);
  const kh = lapKeHoachDongBo(tep, SP, daGhi(kh1));
  eq("tep chi co mot mat hang thi mat hang kia giu nguyen", kh.lech.length + kh.ghiMoi.length, 0);
}

// ============== BAN TRUNG DO LOI CU (ma ngau nhien) -> lech, gom ca bo de go

{
  const cu = [1, 2].map(
    (i) =>
      ({
        id: `import-in-p1-1791000000000-${i}-ab12`,
        date: "2026-09-01T00:00:00.000Z",
        type: "IN",
        productId: "p1",
        productName: "Bia Golden Bridge Helles Lager",
        category: "Lít",
        quantity: 400, // ban cu cong ton dau 100 vao nhap 300
        partnerId: DOI_TAC_DONG_BO,
        partnerName: "Excel Import",
        createdBy: "x",
      }) as Transaction,
  );
  const kh = lapKeHoachDongBo(TEP_1, SP, cu);
  const l = kh.lech.find((x) => x.moi.loai === "IN");
  eq("hai ban trung cu bi gom vao mot dong lech", l?.cu.length, 2);
  eq("so moi la nhap that, khong lan ton dau", l?.moi.soLuong, 300);
  eq("ton dau thanh dong ton dau moi", kh.ghiMoi.some((d) => d.id === "dongbo-opening-p1"), true);
}

// Giao dich khong phai dong dong bo (nhap tay, ton dau tu T Kho) KHONG bi dung.
{
  const khac = [
    { id: "tkho-x", type: "OPENING", productId: "p1", quantity: 999, partnerId: "SYSTEM_BEGINNING" },
    { id: "nhap-tay", type: "IN", productId: "p1", quantity: 50, partnerId: "SUP1" },
  ] as unknown as Transaction[];
  const kh = lapKeHoachDongBo(TEP_1, SP, khac);
  eq("dong khong phai dong bo khong bi coi la ban cu", kh.lech.length, 0);
  /*
   * NHUNG phai canh bao: so tong sap ghi se cong len tren chinh cac giao dich
   * chi tiet da co — nhan doi kieu ma khoa theo noi dung khong chan duoc.
   */
  eq("canh bao mat hang da co giao dich chi tiet", kh.daCoChiTiet, [
    { productName: "Bia Golden Bridge Helles Lager", soDong: 2 },
  ]);
}
eq("lan dau khong co chi tiet nao thi khong canh bao", kh1.daCoChiTiet, []);

// ============================================ khop danh muc: ma, ten, chu d

{
  const tep = docBangTonKho([
    ["Mã vật tư", "Sản phẩm", "Đơn vị", "Tổng nhập"],
    ["10168107", "Ten go sai hoan toan", "Lít", 10],
    ["", "bia dac biet", "Lít", 7],
    ["", "Bia Golden Bridge Helles", "Lít", 5],
  ]);
  const kh = lapKeHoachDongBo(tep, SP, []);
  eq("khop bang ma vat tu du ten sai", kh.ghiMoi.find((d) => d.productId === "p1")?.soLuong, 10);
  eq("khop ten co chu Đ sau chuan hoa", kh.ghiMoi.find((d) => d.productId === "p9")?.soLuong, 7);
  eq("KHONG khop mo ten thieu chu — bao ra", kh.khongKhop.map((d) => d.sanPham), ["Bia Golden Bridge Helles"]);
}

// ======================================= don vi lech -> bao ra, khong doi

{
  const tep = docBangTonKho([TIEU_DE, ["Bia Golden Bridge Helles Lager lon330ml", "Thùng", 0, 20, 0, 0]]);
  const kh = lapKeHoachDongBo(tep, SP, []);
  eq("tep ghi Thung, kho dem Lon -> bao lech don vi", kh.lechDonVi.map((x) => x.donViKho), ["Lon"]);
  eq("va KHONG ghi gi cho dong do", kh.ghiMoi.length, 0);
}
{
  const tep = docBangTonKho([["Sản phẩm", "Tổng nhập"], ["Bia Golden Bridge Helles Lager", 5]]);
  eq("tep khong ghi don vi thi coi nhu dung don vi kho", lapKeHoachDongBo(tep, SP, []).ghiMoi.length, 1);
}

// ============================================ dong lap / xung dot trong tep

{
  const tep = docBangTonKho([
    TIEU_DE,
    ["Bia Golden Bridge Helles Lager", "Lít", 1, 2, 3, 0],
    ["Bia Golden Bridge Helles Lager", "Lít", 1, 2, 3, 0],
    ["Bia Golden Bridge Helles Lager lon330ml", "Lon", 0, 5, 0, 0],
    ["Bia Golden Bridge Helles Lager lon330ml", "Lon", 0, 6, 0, 0],
  ]);
  const kh = lapKeHoachDongBo(tep, SP, []);
  eq("dong lap y het bi bo, dem lai", kh.lapTrongTep, 1);
  eq("cung mat hang hai so khac nhau -> bo qua, bao xung dot", kh.xungDot, ["Bia Golden Bridge Helles Lager lon330ml"]);
  eq("mat hang xung dot khong duoc ghi", kh.ghiMoi.some((d) => d.productId === "p4"), false);
}

// ===================== VONG THAT: dung .xlsx -> doc len -> phan nhom -> nap lai

{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["BÁO CÁO NHẬP XUẤT TỒN"],
      [],
      TIEU_DE,
      ["Bia Golden Bridge Helles Lager", "Lít", 432.6, 300, 200, 2],
    ]),
    "Tong hop",
  );
  const tepThat = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const doc = (buf: ArrayBuffer) => {
    const w = XLSX.read(new Uint8Array(buf), { type: "array" });
    return docBangTonKho(
      XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], { header: 1, defval: "" }) as unknown[][],
    );
  };
  const lan1 = lapKeHoachDongBo(doc(tepThat), SP, []);
  eq("vong that: so le doc dung", lan1.ghiMoi.find((d) => d.loai === "OPENING")?.soLuong, 432.6);
  const lan2 = lapKeHoachDongBo(doc(tepThat), SP, daGhi(lan1));
  eq("vong that: nap lai cung tep khong ghi gi", lan2.ghiMoi.length + lan2.lech.length, 0);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

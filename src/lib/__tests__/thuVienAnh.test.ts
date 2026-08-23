/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ImportSlip, Transaction } from "../../types";
import { dungAnhThuVien, thangCoAnh } from "../thuVienAnh";

let pass = 0;
let fail = 0;

function kiemTra(ten: string, thuc: unknown, mong: unknown) {
  const a = JSON.stringify(thuc);
  const b = JSON.stringify(mong);
  if (a === b) pass++;
  else {
    fail++;
    console.log(`SAI  ${ten}\n     thuc te: ${a}\n     mong doi: ${b}`);
  }
}

const U = (n: number) => `https://res.cloudinary.com/x/anh${n}.jpg`;

function tx(o: Partial<Transaction>): Transaction {
  return {
    id: "t",
    date: "2026-08-05T08:00:00.000Z",
    type: "IN",
    productId: "p1",
    productName: "Bia A",
    category: "Lít",
    quantity: 10,
    partnerId: "SKB-BNC",
    partnerName: "SKB-BNC",
    createdBy: "test",
    ...o,
  } as Transaction;
}

const transactions: Transaction[] = [
  // Nhập kho theo quy trình phiếu: ảnh KHÔNG nằm ở đây, nằm ở phiếu.
  tx({
    id: "t1",
    slipCode: "PN-260805-01",
    productName: "Bia A",
    batchNumber: "LOT-01",
  }),
  tx({
    id: "t2",
    slipCode: "PN-260805-01",
    productName: "Bia B",
    batchNumber: "LOT-01",
  }),
  // Nhập kho kiểu cũ: ảnh gắn thẳng vào giao dịch.
  tx({
    id: "t3",
    date: "2026-07-20T08:00:00.000Z",
    productName: "Bia Cũ",
    batchNumber: "LOT-CU",
    evidencePhotoUrl: U(9),
  }),
  // Xuất kho: một giao dịch mang nhiều ảnh.
  tx({
    id: "t4",
    type: "OUT",
    date: "2026-08-10T08:00:00.000Z",
    productName: "Bia A",
    partnerName: "BNC · 1901",
    evidencePhotoUrl: U(1),
    evidencePhotoUrls: [U(1), U(2)],
  }),
  // Xuất kho không có ảnh.
  tx({ id: "t5", type: "OUT", date: "2026-08-11T08:00:00.000Z" }),
];

const slips: ImportSlip[] = [
  {
    id: "PN-260805-01",
    code: "PN-260805-01",
    date: "2026-08-05",
    status: "signed",
    signedPhotoUrls: [U(3), U(4)],
  },
  // Đã in nhưng chưa ký: không có ảnh nên không lên thư viện.
  {
    id: "PN-260805-02",
    code: "PN-260805-02",
    date: "2026-08-05",
    status: "printed",
    signedPhotoUrls: [],
  },
];

const nhap = dungAnhThuVien({
  transactions,
  slips,
  loai: "IN",
  thang: "all",
  tuKhoa: "",
});

// Hai ảnh phiếu ký + một ảnh nhập kiểu cũ.
kiemTra("nhap kho co 3 anh", nhap.length, 3);
kiemTra(
  "anh phieu ky co len thu vien",
  nhap.filter((a) => a.tieuDe === "Phiếu PN-260805-01").length,
  2,
);
kiemTra("anh nhap kieu cu van con", nhap.some((a) => a.url === U(9)), true);
kiemTra("phieu chua ky khong len", nhap.some((a) => a.id.includes("02")), false);
kiemTra(
  "phu cua anh phieu ghi so mat hang",
  nhap.find((a) => a.tieuDe === "Phiếu PN-260805-01")?.phu,
  "2 mặt hàng · Bia A",
);
// Ngày lấy theo giao dịch (có giờ) chứ không lấy ngày trơn của phiếu.
kiemTra(
  "ngay anh phieu theo giao dich",
  nhap.find((a) => a.tieuDe === "Phiếu PN-260805-01")?.date,
  "2026-08-05T08:00:00.000Z",
);
// Mới nhất lên trước.
kiemTra("xep moi nhat truoc", nhap[nhap.length - 1].url, U(9));
// Khoá phải khác nhau, không thì React vẽ sai.
kiemTra("khoa khong trung", new Set(nhap.map((a) => a.id)).size, nhap.length);

const xuat = dungAnhThuVien({
  transactions,
  slips,
  loai: "OUT",
  thang: "all",
  tuKhoa: "",
});
// Lấy cả mảng nhiều ảnh, và không đếm hai lần tấm nằm ở cả hai trường.
kiemTra("xuat kho gom ca mang anh", xuat.length, 2);
kiemTra(
  "khong lap tam trung o hai truong",
  xuat.map((a) => a.url),
  [U(1), U(2)],
);

// Lọc tháng.
kiemTra(
  "loc thang 08",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    thang: "2026-08",
    tuKhoa: "",
  }).length,
  2,
);
kiemTra(
  "loc thang 07",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    thang: "2026-07",
    tuKhoa: "",
  }).length,
  1,
);

// Tra cứu: nhập kho tra được cả mã phiếu lẫn mã lô.
kiemTra(
  "tra theo ma phieu",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    thang: "all",
    tuKhoa: "PN-260805-01",
  }).length,
  2,
);
kiemTra(
  "tra theo ma lo",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    thang: "all",
    tuKhoa: "lot-01",
  }).length,
  2,
);
kiemTra(
  "tra khong ra thi rong",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    thang: "all",
    tuKhoa: "khong-co-that",
  }).length,
  0,
);
// Xuất kho tra theo tên đơn vị.
kiemTra(
  "tra theo don vi",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "OUT",
    thang: "all",
    tuKhoa: "1901",
  }).length,
  2,
);

kiemTra("thang co anh", thangCoAnh(nhap), ["2026-08", "2026-07"]);

// Không có gì thì không vỡ.
kiemTra(
  "rong",
  dungAnhThuVien({
    transactions: [],
    slips: [],
    loai: "IN",
    thang: "all",
    tuKhoa: "",
  }).length,
  0,
);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

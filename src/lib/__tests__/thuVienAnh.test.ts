/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ImportSlip, Transaction } from "../../types";
import { danhSachDonVi, dungAnhThuVien, locTheoDonVi } from "../thuVienAnh";

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
  tuNgay: "",
    denNgay: "",
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
  tuNgay: "",
    denNgay: "",
  tuKhoa: "",
});
// Lấy cả mảng nhiều ảnh, và không đếm hai lần tấm nằm ở cả hai trường.
kiemTra("xuat kho gom ca mang anh", xuat.length, 2);
kiemTra(
  "khong lap tam trung o hai truong",
  xuat.map((a) => a.url),
  [U(1), U(2)],
);


// Khoảng ngày: hai đầu biên phải TÍNH VÀO, không loại ra.
kiemTra(
  "dung ngay bien dau va cuoi",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    tuNgay: "2026-08-05",
    denNgay: "2026-08-05",
    tuKhoa: "",
  }).length,
  2,
);
kiemTra(
  "chi de trong dau tren",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    tuNgay: "2026-08-01",
    denNgay: "",
    tuKhoa: "",
  }).length,
  2,
);
kiemTra(
  "chi de trong dau duoi",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    tuNgay: "",
    denNgay: "2026-07-31",
    tuKhoa: "",
  }).length,
  1,
);
kiemTra(
  "khoang khong chua anh nao",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    tuNgay: "2026-09-01",
    denNgay: "2026-09-30",
    tuKhoa: "",
  }).length,
  0,
);

// Tra cứu: nhập kho tra được cả mã phiếu lẫn mã lô.
kiemTra(
  "tra theo ma phieu",
  dungAnhThuVien({
    transactions,
    slips,
    loai: "IN",
    tuNgay: "",
    denNgay: "",
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
    tuNgay: "",
    denNgay: "",
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
    tuNgay: "",
    denNgay: "",
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
    tuNgay: "",
    denNgay: "",
    tuKhoa: "1901",
  }).length,
  2,
);

// Không có gì thì không vỡ.
kiemTra(
  "rong",
  dungAnhThuVien({
    transactions: [],
    slips: [],
    loai: "IN",
    tuNgay: "",
    denNgay: "",
    tuKhoa: "",
  }).length,
  0,
);

// ------------------------------------------------------- loc theo don vi

{
  const anh = dungAnhThuVien({
    transactions,
    slips,
    loai: "OUT",
    tuNgay: "",
    denNgay: "",
    tuKhoa: "",
  });

  // Danh sach phai lay tu chinh bo anh dang xem, khong lay tu danh muc doi tac:
  // chon vao phai co anh, khong duoc de nguoi dung chon roi thay luoi trong.
  const ds = danhSachDonVi(anh);
  kiemTra("danh sach don vi khong rong", ds.length > 0, true);
  kiemTra(
    "moi don vi trong danh sach deu co anh",
    ds.every((d) => locTheoDonVi(anh, d).length > 0),
    true,
  );
  kiemTra("khong co ten trung", new Set(ds).size === ds.length, true);
  kiemTra("khong co ten rong", ds.every((d) => d.trim() !== ""), true);
  // Xep theo bang chu cai tieng Viet.
  kiemTra("da xep thu tu", [...ds].sort((a, b) => a.localeCompare(b, "vi")), ds);

  // Loc dung mot don vi thi moi tam deu cua don vi ay.
  const mot = ds[0];
  const loc = locTheoDonVi(anh, mot);
  kiemTra("loc ra dung don vi do", loc.every((a) => a.donVi === mot), true);
  kiemTra("loc ra it hon hoac bang tat ca", loc.length <= anh.length, true);

  // De trong la lay het — de nut "tat ca" khong phai xu ly rieng.
  kiemTra("de trong thi lay het", locTheoDonVi(anh, "").length, anh.length);
  kiemTra("chi co khoang trang cung la lay het", locTheoDonVi(anh, "   ").length, anh.length);
  // Don vi khong ton tai thi ra rong, khong ra tat ca.
  kiemTra("don vi la thi ra rong", locTheoDonVi(anh, "Khong Co Don Vi Nay").length, 0);

  // Tong so anh cua tung don vi phai bang tong so anh co don vi.
  const tong = ds.reduce((n, d) => n + locTheoDonVi(anh, d).length, 0);
  kiemTra(
    "cong tung don vi lai bang tong",
    tong,
    anh.filter((a) => a.donVi.trim() !== "").length,
  );

  // Bo anh rong thi danh sach cung rong, khong vo.
  kiemTra("bo anh rong", danhSachDonVi([]), []);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

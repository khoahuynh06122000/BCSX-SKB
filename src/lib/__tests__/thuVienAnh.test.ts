/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ImportSlip, Transaction } from "../../types";
import {
  danhSachBoPhanBNC,
  danhSachDonVi,
  dungAnhThuVien,
  gopAnhTrung,
  kieuDuongDanAnh,
  laAnhNhung,
  locTheoDonVi,
  lyDoAnhLoi,
  tenLocDonVi,
  type AnhThuVien,
} from "../thuVienAnh";

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
    partnerId: "AD0103-1901",
    partnerName: "BNC · 1901",
    evidencePhotoUrl: U(1),
    evidencePhotoUrls: [U(1), U(2)],
  }),
  // Xuất kho không có ảnh.
  tx({ id: "t5", type: "OUT", date: "2026-08-11T08:00:00.000Z" }),
  // Điểm bán thứ hai của phần Nội bộ — để có cái mà soi tiếp.
  tx({
    id: "t6",
    type: "OUT",
    date: "2026-08-12T08:00:00.000Z",
    partnerId: "AD0103-CV",
    partnerName: "BNC · Cầu Vàng",
    evidencePhotoUrl: U(11),
  }),
  // Một phần khác của BNC, phần này chỉ có đúng một bộ phận.
  tx({
    id: "t7",
    type: "OUT",
    date: "2026-08-13T08:00:00.000Z",
    partnerId: "AD0103-NG",
    partnerName: "BNC · Ngoại giao",
    evidencePhotoUrl: U(12),
  }),
  // Đơn vị ngoài BNC — vẫn phải là một dòng riêng trong ô chọn.
  tx({
    id: "t8",
    type: "OUT",
    date: "2026-08-14T08:00:00.000Z",
    partnerId: "AC0107",
    partnerName: "FV",
    evidencePhotoUrl: U(13),
  }),
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
//
// Giao dịch t4 mang U(1) ở `evidencePhotoUrl` VÀ [U(1), U(2)] ở
// `evidencePhotoUrls` — phải ra đúng hai tấm, không phải ba. Soi riêng t4 chứ
// không đếm cả bộ: thêm dữ liệu mẫu cho việc khác là con số tổng lại đổi, mà ý
// của phép kiểm này thì không liên quan gì tới những giao dịch ấy.
kiemTra(
  "khong lap tam trung o hai truong",
  xuat.filter((a) => a.id.startsWith("tx-t4-")).map((a) => a.url),
  [U(1), U(2)],
);
// Không tấm nào bị lặp trong cả lưới.
kiemTra("khong co tam nao lap lai", new Set(xuat.map((a) => a.url)).size, xuat.length);
// Xuất kho không có ảnh thì không sinh ra dòng nào (t5).
kiemTra("giao dich khong anh khong sinh dong", xuat.some((a) => a.id.startsWith("tx-t5-")), false);


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
    "moi muc trong danh sach deu co anh",
    ds.every((d) => locTheoDonVi(anh, d.gia).length > 0),
    true,
  );
  kiemTra("khong co gia tri trung", new Set(ds.map((d) => d.gia)).size, ds.length);
  kiemTra(
    "khong co ten rong",
    ds.every((d) => d.ten.trim() !== "" && d.gia.trim() !== ""),
    true,
  );

  // BNC GOP THANH PHAN, khong bay tung diem ban o o thu nhat: du lieu mau co
  // hai diem ban Noi bo + mot Ngoai giao + mot don vi ngoai BNC, nen o chon
  // phai ra ba dong chu khong phai bon.
  kiemTra("BNC gop thanh phan", ds.map((d) => d.ten), [
    "BNC · Nội bộ",
    "BNC · Ngoại giao",
    "FV",
  ]);
  kiemTra(
    "phan cua BNC dat len dau",
    ds.slice(0, 2).every((d) => d.gia.startsWith("BNC:")),
    true,
  );
  // Phan khong co anh thi khong bay: HTKD va Chi phi khac khong phat sinh.
  kiemTra(
    "phan khong co anh thi khong bay",
    ds.some((d) => d.ten.includes("HTKD")),
    false,
  );
  // Don vi ngoai BNC xep theo bang chu cai tieng Viet.
  {
    const ngoai = ds.filter((d) => !d.gia.startsWith("BNC:")).map((d) => d.ten);
    kiemTra("don vi ngoai BNC da xep thu tu", [...ngoai].sort((a, b) => a.localeCompare(b, "vi")), ngoai);
  }

  // Loc mot phan cua BNC thi ra dung anh cua phan ay, gom ca hai diem ban.
  {
    const noiBo = locTheoDonVi(anh, "BNC:NB");
    kiemTra(
      "loc Noi bo ra ca hai diem ban",
      [...new Set(noiBo.map((a) => a.donVi))].sort(),
      ["BNC · 1901", "BNC · Cầu Vàng"],
    );
    const ngoaiGiao = locTheoDonVi(anh, "BNC:NG");
    kiemTra(
      "loc Ngoai giao khong lot diem ban",
      ngoaiGiao.every((a) => a.maDonVi === "AD0103-NG"),
      true,
    );
    kiemTra("phan khong co anh thi loc ra rong", locTheoDonVi(anh, "BNC:CPK").length, 0);
  }

  // Loc dung mot don vi ngoai BNC thi moi tam deu cua don vi ay.
  const mot = ds[ds.length - 1];
  const loc = locTheoDonVi(anh, mot.gia);
  kiemTra("loc ra dung don vi do", loc.every((a) => a.donVi === mot.ten), true);
  kiemTra("loc ra it hon hoac bang tat ca", loc.length <= anh.length, true);

  // De trong la lay het — de nut "tat ca" khong phai xu ly rieng.
  kiemTra("de trong thi lay het", locTheoDonVi(anh, "").length, anh.length);
  kiemTra("chi co khoang trang cung la lay het", locTheoDonVi(anh, "   ").length, anh.length);
  // Don vi khong ton tai thi ra rong, khong ra tat ca.
  kiemTra("don vi la thi ra rong", locTheoDonVi(anh, "Khong Co Don Vi Nay").length, 0);
  // Ten phan la chu nguoi doc, khong duoc dung lam gia tri loc: neu co don vi
  // that ten "Noi bo" thi hai thu se lan nhau.
  kiemTra("ten phan khong phai gia tri loc", locTheoDonVi(anh, "BNC · Nội bộ").length, 0);

  // Tong so anh cua tung muc phai bang tong so anh co don vi — phep chan bat
  // duoc loi mot bo phan roi ra ngoai moi muc.
  const tong = ds.reduce((n, d) => n + locTheoDonVi(anh, d.gia).length, 0);
  kiemTra(
    "cong tung muc lai bang tong",
    tong,
    anh.filter((a) => a.donVi.trim() !== "").length,
  );

  // O CHON THU HAI — diem ban, chi co nghia khi phan co tu hai bo phan.
  kiemTra(
    "Noi bo co hai diem ban de soi tiep",
    danhSachBoPhanBNC(locTheoDonVi(anh, "BNC:NB")),
    ["BNC · 1901", "BNC · Cầu Vàng"],
  );
  kiemTra(
    "phan mot bo phan thi khong bay o thu hai",
    danhSachBoPhanBNC(locTheoDonVi(anh, "BNC:NG")),
    [],
  );
  kiemTra("don vi ngoai BNC khong co o thu hai", danhSachBoPhanBNC(loc), []);

  // Ten hien thi cua gia tri loc.
  kiemTra("ten cua phan", tenLocDonVi("BNC:NG"), "BNC · Ngoại giao");
  kiemTra("ten cua don vi thuong", tenLocDonVi("FV"), "FV");
  kiemTra("de trong thi ten rong", tenLocDonVi(""), "");
  kiemTra("ma phan la thi tra ve nguyen chuoi", tenLocDonVi("BNC:XX"), "BNC:XX");

  // Bo anh rong thi danh sach cung rong, khong vo.
  kiemTra("bo anh rong", danhSachDonVi([]), []);
}

// ------------------------------------------------------- anh tai khong duoc

// Hai nguyen nhan khac nhau va cach xu ly khac nhau, nen loi phai noi ra dung
// cai nao: anh nhung thi chay phan "Chuyen anh cu", anh Cloudinary thi phai di
// tim lai to bien ban.
kiemTra("anh nhung base64", laAnhNhung("data:image/jpeg;base64,/9j/4AA"), true);
kiemTra("anh nhung dang khac", laAnhNhung("data:image/png;base64,iVBOR"), true);
kiemTra("duong dan Cloudinary khong phai anh nhung", laAnhNhung(U(1)), false);
kiemTra("chuoi rong khong phai anh nhung", laAnhNhung(""), false);

kiemTra(
  "ly do anh nhung",
  lyDoAnhLoi("data:image/jpeg;base64,/9j/4AA"),
  "Ảnh cũ nhúng trong hệ thống, có thể đã bị cắt",
);
kiemTra("ly do anh Cloudinary", lyDoAnhLoi(U(1)), "Ảnh không còn trên máy chủ ảnh");
kiemTra("ly do khong co duong dan", lyDoAnhLoi(""), "Không có đường dẫn ảnh");
kiemTra("chi khoang trang cung la khong co duong dan", lyDoAnhLoi("   "), "Không có đường dẫn ảnh");
// Luon phai co cau gi de hien, khong duoc tra ve rong.
kiemTra(
  "luon co ly do de hien",
  ["", "   ", U(1), "data:image/png;base64,x"].every((u) => lyDoAnhLoi(u).length > 0),
  true,
);

// ------------------------------------------------------- kieu duong dan

// Bon kieu sai deu da gap trong du lieu that va moi kieu xu ly mot cach khac
// nhau, nen khong duoc gop het thanh "anh loi".
kiemTra("rong", kieuDuongDanAnh(""), "rong");
kiemTra("chi khoang trang cung la rong", kieuDuongDanAnh("   "), "rong");
kiemTra("anh nhung base64", kieuDuongDanAnh("data:image/jpeg;base64,/9j"), "nhung");
kiemTra("duong dan tam cua trinh duyet", kieuDuongDanAnh("blob:https://a.b/1-2-3"), "tam");
kiemTra("thieu dia chi may chu", kieuDuongDanAnh("bcsx/abc123.jpg"), "khong-hop-le");
kiemTra("duong dan tuong doi", kieuDuongDanAnh("/upload/anh.jpg"), "khong-hop-le");
kiemTra("http", kieuDuongDanAnh("http://a.b/anh.jpg"), "mang");
kiemTra("https", kieuDuongDanAnh(U(1)), "mang");
kiemTra("HTTPS chu hoa cung duoc", kieuDuongDanAnh("HTTPS://A.B/x.jpg"), "mang");

kiemTra("moi kieu deu co cau giai thich rieng", new Set(
  ["", "data:image/png;base64,x", "blob:https://a/1", "bcsx/x.jpg", U(1)].map(lyDoAnhLoi),
).size, 5);

// ------------------------------------------------------- gop anh trung

// Mot to bien ban ky chung cho ca luot giao, anh gan vao TUNG DONG giao dich —
// nen cung mot to hien lai nam lan tren luoi.
{
  const mau = (o: Partial<AnhThuVien>): AnhThuVien => ({
    id: "x",
    url: U(1),
    date: "2026-08-20T08:00:00.000Z",
    tieuDe: "Bia A",
    phu: "NVT",
    phuGoc: "NVT",
    donVi: "NVT",
    maDonVi: "AC0104",
    timKiem: "",
    ...o,
  });

  const gop = gopAnhTrung([
    mau({ id: "a1", tieuDe: "Bia A" }),
    mau({ id: "a2", tieuDe: "Bia B" }),
    mau({ id: "a3", tieuDe: "Bia C" }),
    mau({ id: "b1", url: U(2), tieuDe: "Bia D" }),
  ]);
  kiemTra("bon dong ba tam trung con hai tam", gop.length, 2);
  kiemTra("giu tam dau tien", gop[0].id, "a1");
  kiemTra("dem so dong dung chung", gop[0].soDongDungChung, 3);
  kiemTra("noi ra la ky cho may mat hang", gop[0].phu, "NVT · 3 mặt hàng");
  // Tam khong trung thi khong doi chu phu, khong duoc them "1 mat hang".
  kiemTra("tam khong trung giu nguyen chu phu", gop[1].phu, "NVT");
  kiemTra("tam khong trung van dem la mot", gop[1].soDongDungChung, 1);

  kiemTra("bo rong", gopAnhTrung([]), []);
  // Khong duoc sua vao mang goc: no la ket qua memo cua man hinh.
  {
    const goc = [mau({ id: "c1" }), mau({ id: "c2" })];
    gopAnhTrung(goc);
    kiemTra("khong sua chu phu cua mang goc", goc[0].phu, "NVT");
    kiemTra("khong ghi so dong vao mang goc", goc[0].soDongDungChung, undefined);
  }
}

// Tren du lieu mau: giao dich t4 mang U(1) va U(2), khong tam nao trung nhau.
kiemTra(
  "luoi khong con tam nao trung duong dan",
  new Set(xuat.map((a) => a.url)).size,
  xuat.length,
);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHÂN QUYỀN — kiểm cả hai chiều của mỗi luật.
 *
 * Với phân quyền, "cho đúng người" và "chặn đúng người" là hai phép kiểm khác
 * nhau, và cái thứ hai mới là cái đắt: một luật viết lỏng thì mọi phép kiểm
 * kiểu "người này làm được không" đều xanh, chỉ có phép kiểm "người kia có bị
 * chặn không" mới bắt được.
 *
 * Nên mỗi quyền ở đây đều kiểm đủ hai vế: ai được và ai KHÔNG được.
 */

import {
  DANH_SACH_VAI_TRO,
  ghiDuocGiaoDich,
  laChieuNhap,
  laChieuXuat,
  quyenCua,
  tenVaiTro,
} from "../quyen";
import type { UserRole } from "../../types";

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

const MOI_VAI_TRO: UserRole[] = [
  "OWNER",
  "KE_TOAN",
  "NHAP_KHO",
  "XUAT_KHO",
  "STAFF",
  "VIEWER",
  "PENDING",
];

// ------------------------------------------------------------ chieu giao dich

eq("nhap kho la chieu nhap", laChieuNhap("IN"), true);
eq("ton dau ky la chieu nhap", laChieuNhap("OPENING"), true);
eq("xuat kho khong phai chieu nhap", laChieuNhap("OUT"), false);
eq("hao hut khong phai chieu nhap", laChieuNhap("LOSS"), false);

eq("xuat kho la chieu xuat", laChieuXuat("OUT"), true);
// Hao hut de ben xuat kho theo yeu cau cua bo phan.
eq("hao hut la chieu xuat", laChieuXuat("LOSS"), true);
eq("nhap kho khong phai chieu xuat", laChieuXuat("IN"), false);
eq("ton dau ky khong phai chieu xuat", laChieuXuat("OPENING"), false);

// Mot loai khong the thuoc ca hai chieu, va loai la thi khong thuoc chieu nao.
["IN", "OPENING", "OUT", "LOSS"].forEach((t) => {
  dung(`${t} chi thuoc mot chieu`, laChieuNhap(t) !== laChieuXuat(t));
});
eq("loai la khong phai chieu nhap", laChieuNhap("ABC"), false);
eq("loai la khong phai chieu xuat", laChieuXuat("ABC"), false);
eq("chuoi rong", laChieuNhap("") || laChieuXuat(""), false);

// ------------------------------------------------------------ tung vai tro

// PENDING khong duoc gi ca — day la canh cua that su cua ca he thong.
{
  const q = quyenCua("PENDING");
  eq("cho duyet khong duoc gi", Object.values(q).filter(Boolean).length, 0);
}
// Vai tro la cung khong duoc gi: doan rong ra la mo cua cho mot chuoi bat ky.
{
  const q = quyenCua("KHONG_CO_THAT");
  eq("vai tro la khong duoc gi", Object.values(q).filter(Boolean).length, 0);
  eq("chuoi rong khong duoc gi", Object.values(quyenCua("")).filter(Boolean).length, 0);
}

eq("chu so huu toan quyen", quyenCua("OWNER"), {
  xem: true,
  ghiNhap: true,
  ghiXuat: true,
  doanhThu: true,
  napFile: true,
  quanTri: true,
});

eq("ke toan lam moi viec tru quan tri", quyenCua("KE_TOAN"), {
  xem: true,
  ghiNhap: true,
  ghiXuat: true,
  doanhThu: true,
  napFile: true,
  quanTri: false,
});

// HAI VAI TRO MOT CHIEU — phan chinh cua lan sua nay.
eq("nhan vien nhap kho", quyenCua("NHAP_KHO"), {
  xem: true,
  ghiNhap: true,
  ghiXuat: false,
  doanhThu: false,
  napFile: false,
  quanTri: false,
});
eq("nhan vien xuat kho", quyenCua("XUAT_KHO"), {
  xem: true,
  ghiNhap: false,
  ghiXuat: true,
  doanhThu: false,
  napFile: false,
  quanTri: false,
});

// Ba vai tro cu GIU NGUYEN quyen ghi ca hai chieu: ha quyen mot tai khoan dang
// chay viec thi hom sau co nguoi khong lam duoc viec ma khong hieu vi sao.
["STAFF", "VIEWER"].forEach((r) => {
  const q = quyenCua(r);
  dung(`${r} van ghi duoc ca hai chieu`, q.ghiNhap && q.ghiXuat);
  dung(`${r} khong dung toi doanh thu`, !q.doanhThu);
  dung(`${r} khong nap duoc tep`, !q.napFile);
  dung(`${r} khong quan tri`, !q.quanTri);
});

// ------------------------------------------------------------ chan dung nguoi

// Ai XEM duoc: moi vai tro tru cho duyet.
MOI_VAI_TRO.forEach((r) => {
  eq(`${r} xem duoc?`, quyenCua(r).xem, r !== "PENDING");
});

// Ai NAP TEP duoc: chi ke toan va chu so huu.
eq(
  "chi ke toan va chu so huu nap duoc tep",
  MOI_VAI_TRO.filter((r) => quyenCua(r).napFile),
  ["OWNER", "KE_TOAN"],
);
// Ai DOANH THU duoc: chi ke toan va chu so huu.
eq(
  "chi ke toan va chu so huu thao tac doanh thu",
  MOI_VAI_TRO.filter((r) => quyenCua(r).doanhThu),
  ["OWNER", "KE_TOAN"],
);
// Ai QUAN TRI duoc: chi chu so huu.
eq(
  "chi chu so huu quan tri",
  MOI_VAI_TRO.filter((r) => quyenCua(r).quanTri),
  ["OWNER"],
);

// ------------------------------------------------------------ ghi theo loai

// Nguoi nhap kho: ghi duoc chieu nhap, KHONG ghi duoc chieu xuat.
dung("nhap kho ghi duoc IN", ghiDuocGiaoDich("NHAP_KHO", "IN"));
dung("nhap kho ghi duoc OPENING", ghiDuocGiaoDich("NHAP_KHO", "OPENING"));
dung("nhap kho KHONG ghi duoc OUT", !ghiDuocGiaoDich("NHAP_KHO", "OUT"));
dung("nhap kho KHONG ghi duoc LOSS", !ghiDuocGiaoDich("NHAP_KHO", "LOSS"));

// Nguoi xuat kho: nguoc lai.
dung("xuat kho ghi duoc OUT", ghiDuocGiaoDich("XUAT_KHO", "OUT"));
dung("xuat kho ghi duoc LOSS", ghiDuocGiaoDich("XUAT_KHO", "LOSS"));
dung("xuat kho KHONG ghi duoc IN", !ghiDuocGiaoDich("XUAT_KHO", "IN"));
dung("xuat kho KHONG ghi duoc OPENING", !ghiDuocGiaoDich("XUAT_KHO", "OPENING"));

// Cho duyet khong ghi duoc gi.
["IN", "OPENING", "OUT", "LOSS"].forEach((t) => {
  dung(`cho duyet khong ghi duoc ${t}`, !ghiDuocGiaoDich("PENDING", t));
});
// Ba vai tro cu ghi duoc het.
["OWNER", "KE_TOAN", "STAFF", "VIEWER"].forEach((r) => {
  ["IN", "OPENING", "OUT", "LOSS"].forEach((t) => {
    dung(`${r} ghi duoc ${t}`, ghiDuocGiaoDich(r, t));
  });
});
// Loai giao dich la: chi chu so huu, de khong ai loi dung mot loai bia dat ra
// de ghi vong qua hai chieu.
dung("loai la thi chu so huu van ghi duoc", ghiDuocGiaoDich("OWNER", "ABC"));
["KE_TOAN", "NHAP_KHO", "XUAT_KHO", "STAFF", "VIEWER"].forEach((r) => {
  dung(`${r} khong ghi duoc loai la`, !ghiDuocGiaoDich(r, "ABC"));
});

// ------------------------------------------------------------ danh sach vai tro

// Danh sach bay ra o chon phai phu KIN moi vai tro: thieu mot cai thi chu so
// huu khong cap duoc vai tro do, ma cung khong biet la thieu.
eq(
  "danh sach phu kin moi vai tro",
  MOI_VAI_TRO.filter((r) => !DANH_SACH_VAI_TRO.some((v) => v.ma === r)),
  [],
);
eq("khong co vai tro la trong danh sach", DANH_SACH_VAI_TRO.length, MOI_VAI_TRO.length);
eq("ma vai tro khong trung", new Set(DANH_SACH_VAI_TRO.map((v) => v.ma)).size, DANH_SACH_VAI_TRO.length);
dung(
  "moi vai tro deu co ten va cau mo ta",
  DANH_SACH_VAI_TRO.every((v) => v.ten.trim() !== "" && v.moTa.trim() !== ""),
);
// Hai vai tro moi dat len truoc hai vai tro cu: day la cai nen chon.
{
  const thuTu = DANH_SACH_VAI_TRO.map((v) => v.ma);
  dung("nhap kho dung truoc STAFF", thuTu.indexOf("NHAP_KHO") < thuTu.indexOf("STAFF"));
  dung("xuat kho dung truoc VIEWER", thuTu.indexOf("XUAT_KHO") < thuTu.indexOf("VIEWER"));
}
// Nhan cua VIEWER khong duoc noi la "chi xem": no ghi duoc ca so kho, ai doc
// nhan ma cap quyen thi cap rong hon minh tuong.
{
  const viewer = DANH_SACH_VAI_TRO.find((v) => v.ma === "VIEWER")!;
  dung("nhan VIEWER noi ro la ghi duoc", viewer.ten.includes("ghi cả hai chiều"));
}

eq("ten vai tro", tenVaiTro("NHAP_KHO"), "Nhân viên nhập kho");
eq("ten vai tro la thi tra ve nguyen chuoi", tenVaiTro("ABC"), "ABC");

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

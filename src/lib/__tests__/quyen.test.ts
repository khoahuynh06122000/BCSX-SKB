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
  "DNC",
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
  xemXuat: true,
  xemKho: true,
  ghiNhap: true,
  ghiXuat: true,
  doanhThu: true,
  napFile: true,
  quanTri: true,
});

eq("ke toan lam moi viec tru quan tri", quyenCua("KE_TOAN"), {
  xemXuat: true,
  xemKho: true,
  ghiNhap: true,
  ghiXuat: true,
  doanhThu: true,
  napFile: true,
  quanTri: false,
});

// HAI VAI TRO MOT CHIEU. Nguoi nhap kho khong xem chieu xuat (02/09/2026).
eq("nhan vien nhap kho", quyenCua("NHAP_KHO"), {
  xemXuat: false,
  xemKho: true,
  ghiNhap: true,
  ghiXuat: false,
  doanhThu: false,
  napFile: false,
  quanTri: false,
});
eq("nhan vien xuat kho", quyenCua("XUAT_KHO"), {
  xemXuat: true,
  xemKho: true,
  ghiNhap: false,
  ghiXuat: true,
  doanhThu: false,
  napFile: false,
  quanTri: false,
});

// DNC — KHOI CUNG UNG: vai tro duy nhat bi chan ca phan XEM.
eq("DNC chi xem chieu xuat", quyenCua("DNC"), {
  xemXuat: true,
  xemKho: false,
  ghiNhap: false,
  ghiXuat: false,
  doanhThu: false,
  napFile: false,
  quanTri: false,
});
// DNC KHONG duoc ghi bat cu thu gi: ho la ben nhan hoa don, khong dung vao so.
{
  const q = quyenCua("DNC");
  dung("DNC khong ghi duoc gi", !q.ghiNhap && !q.ghiXuat && !q.doanhThu && !q.napFile);
  dung("DNC khong quan tri", !q.quanTri);
}

// HAI VAI TRO CU DA BO. Tai khoan nao con mang ten do phai roi vao dien chua
// duyet, khong duoc huong quyen nao — de vai tro bi bo van chay tiep la cho
// nguy hiem nhat khi don phan quyen.
["STAFF", "VIEWER"].forEach((r) => {
  eq(`${r} da bo, khong con quyen nao`, Object.values(quyenCua(r)).filter(Boolean).length, 0);
});

// ------------------------------------------------------------ chan dung nguoi

// Ai xem duoc du lieu XUAT: moi vai tro tru cho duyet.
// Ai bay duoc cac phan he CHIEU XUAT: khong co nguoi nhap kho, va khong co
// nguoi cho duyet.
eq(
  "ai xem duoc chieu xuat",
  MOI_VAI_TRO.filter((r) => quyenCua(r).xemXuat),
  ["OWNER", "KE_TOAN", "XUAT_KHO", "DNC"],
);

// Ai xem duoc du lieu KHO: moi vai tro tru cho duyet VA tru DNC.
eq(
  "DNC khong xem duoc du lieu kho",
  MOI_VAI_TRO.filter((r) => quyenCua(r).xemKho),
  ["OWNER", "KE_TOAN", "NHAP_KHO", "XUAT_KHO"],
);
/*
 * HAI CO XEM DOC LAP NHAU, va moi ben co dung mot vai tro thieu no.
 *
 * Chot lai bang mot phep kiem thay vi de troi: neu sau nay ai gan lai
 * `xemXuat: true` cho NHAP_KHO thi bon phan he chieu xuat hien lai tren menu
 * ma khong ai biet, vi giao dien khong bao gi ca.
 */
dung(
  "nguoi nhap kho: xem kho nhung khong xem chieu xuat",
  quyenCua("NHAP_KHO").xemKho && !quyenCua("NHAP_KHO").xemXuat,
);
dung(
  "DNC: xem chieu xuat nhung khong xem kho",
  quyenCua("DNC").xemXuat && !quyenCua("DNC").xemKho,
);

/*
 * CO `xemXuat` KHONG DUOC DUNG DE CHAN DOC DU LIEU.
 *
 * Ton kho va bao cao tron ca hai chieu — ton bang nhap tru xuat — nen nguoi
 * nhap kho phai doc duoc giao dich chieu xuat du menu khong bay chung. Quyen
 * doc trong `firestore.rules` di theo `xemKho()`, va day la phep kiem giu cho
 * dieu do dung: mat `xemKho` la ton kho cua nguoi nhap hang hut di dung phan
 * da xuat.
 */
dung("nguoi nhap kho van doc duoc du lieu kho", quyenCua("NHAP_KHO").xemKho);

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
// Ai GHI duoc: DNC khong nam trong bat ky nhom nao.
eq(
  "ai ghi duoc chieu nhap",
  MOI_VAI_TRO.filter((r) => quyenCua(r).ghiNhap),
  ["OWNER", "KE_TOAN", "NHAP_KHO"],
);
eq(
  "ai ghi duoc chieu xuat",
  MOI_VAI_TRO.filter((r) => quyenCua(r).ghiXuat),
  ["OWNER", "KE_TOAN", "XUAT_KHO"],
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
// Chu so huu va ke toan ghi duoc het.
["OWNER", "KE_TOAN"].forEach((r) => {
  ["IN", "OPENING", "OUT", "LOSS"].forEach((t) => {
    dung(`${r} ghi duoc ${t}`, ghiDuocGiaoDich(r, t));
  });
});
// Loai giao dich la: chi chu so huu, de khong ai loi dung mot loai bia dat ra
// de ghi vong qua hai chieu.
dung("loai la thi chu so huu van ghi duoc", ghiDuocGiaoDich("OWNER", "ABC"));
["KE_TOAN", "NHAP_KHO", "XUAT_KHO", "DNC"].forEach((r) => {
  dung(`${r} khong ghi duoc loai la`, !ghiDuocGiaoDich(r, "ABC"));
});
// DNC khong ghi duoc loai nao het.
["IN", "OPENING", "OUT", "LOSS"].forEach((t) => {
  dung(`DNC khong ghi duoc ${t}`, !ghiDuocGiaoDich("DNC", t));
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
// Hai vai tro cu KHONG duoc con trong o chon: con trong danh sach la co ngay
// ai do cap nham, ma cap xong thi nguoi do khong vao duoc app.
{
  const ma = DANH_SACH_VAI_TRO.map((v) => v.ma as string);
  dung("khong con STAFF trong o chon", !ma.includes("STAFF"));
  dung("khong con VIEWER trong o chon", !ma.includes("VIEWER"));
}
// Nhan cua DNC phai noi ro la CHI XEM: ai doc nhan ma cap quyen thi phai biet
// minh dang cap gi.
{
  const dnc = DANH_SACH_VAI_TRO.find((v) => v.ma === "DNC")!;
  dung("nhan DNC noi ro chi xem", dnc.moTa.includes("CHỈ XEM"));
  dung("nhan DNC noi ro khong thay ton kho", dnc.moTa.includes("Không thấy tồn kho"));
}
// Nhan cua "Cho duyet" phai noi ca hai cong dung: trang thai cua tai khoan moi,
// va cach thu hoi quyen cua tai khoan cu.
{
  const cho = DANH_SACH_VAI_TRO.find((v) => v.ma === "PENDING")!;
  dung("nhan Cho duyet noi ca cach thu hoi quyen", cho.moTa.includes("thu hồi quyền"));
}

eq("ten vai tro", tenVaiTro("NHAP_KHO"), "Nhân viên nhập kho");
eq("ten vai tro la thi tra ve nguyen chuoi", tenVaiTro("ABC"), "ABC");

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

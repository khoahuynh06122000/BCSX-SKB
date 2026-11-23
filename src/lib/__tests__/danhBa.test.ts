/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** DANH BẠ: tự gắn tài khoản đúng luật app Kiểm kê, tìm kiếm bỏ dấu, số người dưới quyền, form khai tay. */

import {
  capTuGan,
  chuCaiDau,
  chuoiQuanLyDuoi,
  goiYGan,
  khopTim,
  kiemKhaiTay,
  soDuoiQuyen,
  viSaoChuaGan,
  type NhanSu,
  type TaiKhoanGan,
} from "../danhBa";

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

const ns: NhanSu[] = [
  { ma_nv: "1", ho_ten: "Lê Thị Ly", email_cty: "ly.lt@banahills.com.vn", dang_lam: true, chuc_danh: "Kế toán", quan_ly: [{ ma_nv: "9", ho_ten: "Sếp", chuc_danh: "GĐ", so_duoi: 3 }], so_cap_duoi: 0 },
  { ma_nv: "2", ho_ten: "Lê Thị Lý", email_cty: "ly2@banahills.com.vn", dang_lam: true },
  { ma_nv: "3", ho_ten: "Nguyễn Văn Thành", dang_lam: true, bo_phan: "Bộ phận Sản xuất Bia" },
  { ma_nv: "4", ho_ten: "Nguyễn Văn Thành", dang_lam: true },
  { ma_nv: "5", ho_ten: "Trần Đức Anh", dang_lam: false },
  { ma_nv: "6", ho_ten: "Phạm Minh", dang_lam: true, uid: "u-cu", coTaiKhoan: true },
  { ma_nv: "9", ho_ten: "Sếp", chuc_danh: "GĐ", dang_lam: true, so_cap_duoi: 3 },
];
const tk = (uid: string, email: string, name: string, role = "KE_TOAN"): TaiKhoanGan => ({ uid, email, name, role });

eq("goi y theo email", goiYGan(tk("a", "LY.LT@banahills.com.vn", "x"), ns)?.r.ma_nv, "1");
eq("ten dung ca dau: Ly khac Lý", goiYGan(tk("a", "g@gmail.com", "lê thị  lý"), ns)?.r.ma_nv, "2");
eq("trung ten 2 nguoi: khong goi y", goiYGan(tk("a", "g@gmail.com", "Nguyễn Văn Thành"), ns), null);
eq("nguoi da nghi: khong goi y", goiYGan(tk("a", "g@gmail.com", "Trần Đức Anh"), ns), null);
eq("vi sao: trung ten", viSaoChuaGan(tk("a", "", "Nguyễn Văn Thành"), ns).chon.map((r) => r.ma_nv), ["3", "4"]);
eq("vi sao: gan giong khac dau", viSaoChuaGan(tk("a", "", "Le Thi Ly"), ns).chon.map((r) => r.ma_nv), ["1", "2"]);
eq("vi sao: khong co", viSaoChuaGan(tk("a", "", "Ai Đó"), ns).chon.length, 0);

const cap = capTuGan(
  [
    tk("a", "ly.lt@banahills.com.vn", "Lê Thị Ly"),
    tk("b", "x@gmail.com", "Lê Thị Ly"), // cùng người với a → a lấy trước, b bỏ
    tk("c", "p@gmail.com", "Phạm Minh"), // nhân viên đã gắn tài khoản khác → bỏ
    tk("d", "l@gmail.com", "Lê Thị Lý", "PENDING"), // chờ duyệt → bỏ
    tk("u-cu", "m@gmail.com", "Phạm Minh"), // tài khoản đã gắn → bỏ
    tk("e", "e@gmail.com", "Lê Thị Lý", "DNC"),
  ],
  ns,
);
eq("tu gan: moi nhan vien mot tai khoan, bo cho duyet, bo da gan", cap.map((x) => [x.t.uid, x.r.ma_nv]), [["a", "1"], ["e", "2"]]);

eq("tim bo dau nhieu tu", khopTim(ns[2], "thanh san xuat"), true);
eq("tim khong khop", khopTim(ns[2], "keg"), false);
eq("tim rong la khop", khopTim(ns[0], "  "), true);
eq("chu cai dau", chuCaiDau("Nguyễn Văn Thành"), "NT");

const khai: NhanSu = { ma_nv: "NB-1", ho_ten: "KT", nguon: "app", dang_lam: true, quan_ly: chuoiQuanLyDuoi(ns[0]) };
eq("chuoi quan ly khai tay = chuoi cua admin + admin", khai.quan_ly!.map((q) => q.ma_nv), ["9", "1"]);
eq("so duoi quyen cong ho so khai tay", soDuoiQuyen("1", 0, [...ns, khai]), 1);
eq("so duoi quyen bo khai tay da nghi", soDuoiQuyen("1", 0, [...ns, { ...khai, dang_lam: false }]), 0);

eq("khai tay: thieu ten", kiemKhaiTay({ ho_ten: " ", email_cty: "a@b.vn", sdt: "0905123456" }).loi !== "", true);
eq("khai tay: sdt sai", kiemKhaiTay({ ho_ten: "A", email_cty: "a@b.vn", sdt: "12" }).loi !== "", true);
eq("khai tay: email ngoai cong ty -> hoi lai", kiemKhaiTay({ ho_ten: "A", email_cty: "a@gmail.com", sdt: "0905123456" }).canhBao !== "", true);
eq("khai tay: dung", kiemKhaiTay({ ho_ten: "A", email_cty: "a@banahills.com.vn", sdt: "0905 123 456" }), { loi: "", canhBao: "" });

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

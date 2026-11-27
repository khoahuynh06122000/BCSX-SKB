/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Hệ báo sự cố: che dữ liệu, gộp lỗi, phân mức, tái phát. */

import { cheLoi, gopLoi, khoaGop, khopBaiHoc, laLoiMang, mucHanMuc, mucNhomLoi, soanThongBao, type LoiApp } from "../suCo";

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

eq("che khoa API", cheLoi("key=AIzaSyA1234567890abcdefghijklmnop loi"), "key=[khoá] loi");
eq("che JWT", cheLoi("tok eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.abcDEF_123 x"), "tok [jwt] x");
eq("che Bearer", cheLoi("Authorization: Bearer abc.def-123"), "Authorization: Bearer [ẩn]");
eq("bo the html", cheLoi("<b>Lỗi</b> lưu"), "Lỗi lưu");
eq("che PIN", cheLoi("pin: 123456 sai"), "pin: [ẩn] sai");
eq("gop: khac so phieu van cung khoa", khoaGop("Không lưu được phiếu PN-261120-01") === khoaGop("Không lưu được phiếu PN-261127-14"), true);
eq("gop: khac loi thi khac khoa", khoaGop("Không lưu được phiếu") === khoaGop("Không tải được ảnh"), false);
eq("loi mang bo qua", laLoiMang("TypeError: Failed to fetch"), true);
eq("loi that khong bo", laLoiMang("Cannot read properties of undefined"), false);

const l = (uid: string, msg: string, k: Partial<LoiApp> = {}): LoiApp => ({ luc: "2026-11-27T08:00:00", loai: "js", thongDiep: msg, uid, ...k });
const g = gopLoi([
  l("a", "Lỗi lưu phiếu PN-1", { man: "import", may: "m1" }),
  l("b", "Lỗi lưu phiếu PN-2", { man: "import", may: "m2", luc: "2026-11-27T09:00:00" }),
  l("a", "Lỗi lưu phiếu PN-3", { man: "export", may: "m1" }),
  l("c", "Ảnh hỏng"),
]);
eq("gop: 2 nhom", g.length, 2);
eq("gop: dem nguoi, lan, may, man", [g[0].soNguoi, g[0].soLan, g[0].soMay, g[0].man], [2, 3, 2, ["import", "export"]]);
eq("gop: cuoi la gio muon nhat", g[0].cuoi, "2026-11-27T09:00:00");
eq("muc S3 mot nguoi", mucNhomLoi({ soNguoi: 1, soLan: 2, ma: "" }), "S3");
eq("muc S2 hai nguoi", mucNhomLoi({ soNguoi: 2, soLan: 2, ma: "" }), "S2");
eq("muc S1 bon nguoi", mucNhomLoi({ soNguoi: 4, soLan: 4, ma: "" }), "S1");
eq("muc S1 tu choi 2 nguoi", mucNhomLoi({ soNguoi: 2, soLan: 2, ma: "permission-denied" }), "S1");
eq("muc S2 tu choi 3 lan 1 nguoi", mucNhomLoi({ soNguoi: 1, soLan: 3, ma: "permission-denied" }), "S2");
eq("han muc an toan", mucHanMuc(10000, 30000, 50000), null);
eq("han muc du bao vuot", mucHanMuc(20000, 60000, 50000), "S2");
eq("han muc da vuot", mucHanMuc(50001, 90000, 50000), "S1");

const st = [
  { id: "b1", loai: "bai_hoc" as const, tieuDe: "Luật vượt 1.000", muc: "S1" as const, khoaNhanDien: "evaluation limit|1000 expressions" },
  { id: "b2", loai: "bai_hoc" as const, tieuDe: "Đợt lệch", muc: "S2" as const, khoaNhanDien: "hd_cho_so" },
  { id: "b3", loai: "bai_hoc" as const, tieuDe: "ngắn", muc: "S3" as const, khoaNhanDien: "ab" },
];
eq("tai phat theo cau loi", khopBaiHoc({ thongDiep: "Rules: Evaluation limit exceeded" }, st)?.id, "b1");
eq("tai phat theo ma su co", khopBaiHoc({ maSuCo: "hd_cho_so|2026" }, st)?.id, "b2");
eq("khoa ngan khong khop bua", khopBaiHoc({ thongDiep: "abc" }, st), null);
eq("soan thong bao dang loi co cau lam tam", soanThongBao("dang_loi", "Ký điện tử", "14h").includes("Chưa ký lại"), true);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

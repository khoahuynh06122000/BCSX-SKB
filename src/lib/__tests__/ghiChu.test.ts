/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DỌN GHI CHÚ — kiểm cả hai vế: bỏ đúng phần máy sinh, và GIỮ phần người viết.
 *
 * Vế thứ hai mới là vế đắt. Phép lọc này chạy trên mọi ô ghi chú của báo cáo;
 * một biểu thức viết rộng quá sẽ nuốt luôn câu ghi chú thật mà không có gì
 * báo — và ghi chú thật thường là thứ duy nhất giải thích một dòng bất thường.
 */

import { diaDiemTuGhiChu, donGhiChu, ghiChuHienThi } from "../ghiChu";

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

// ==================================================== bo phan may sinh

eq(
  "bo dau vet FIFO",
  donGhiChu("[Lô 2/2] Chuyến 1/2 · Điểm nhận: NH 1901"),
  "Chuyến 1/2 · Điểm nhận: NH 1901",
);
eq(
  "bo cau xac nhan",
  donGhiChu("Chuyến 1/2 (Tin đã khớp và cập nhật mã lô FIFO)"),
  "Chuyến 1/2",
);
eq("bo cau xac nhan hang loat", donGhiChu("abc (Xác nhận hàng loạt - Nhận đủ)"), "abc");
eq(
  "bo nguon nap tep",
  donGhiChu("Điểm nhận: Kavkaz · Nạp từ file BBGN"),
  "Điểm nhận: Kavkaz",
);

// Ô toàn chữ máy thì phải ra RỖNG, không phải ra một chuỗi dấu chấm mồ côi.
eq(
  "o toan chu may thi rong",
  donGhiChu("[Lô 1/2] · Nạp từ file BBGN · (Tin đã khớp)"),
  "",
);
eq("chuoi rong", donGhiChu(""), "");
eq("khong co gi", donGhiChu(undefined), "");
eq("null", donGhiChu(null), "");

/*
 * VE QUAN TRONG NHAT: KHONG DUOC NUOT GHI CHU THAT.
 *
 * Ghi chu do nguoi go vao thuong la thu duy nhat giai thich mot dong bat
 * thuong — mat no la mat luon ly do.
 */
eq(
  "giu nguyen ghi chu nguoi viet",
  donGhiChu("Xe hỏng giữa đường, giao bù hôm sau"),
  "Xe hỏng giữa đường, giao bù hôm sau",
);
eq(
  "giu phan nguoi viet khi lan voi chu may",
  donGhiChu("[Lô 1/2] Nổ 2 lon do va đập · Nạp từ file BBGN"),
  "Nổ 2 lon do va đập",
);
// Chu "lo" trong mot cau binh thuong khong duoc dinh vao.
eq(
  "chu lo thuong khong bi cat",
  donGhiChu("Lô hàng này giao trễ"),
  "Lô hàng này giao trễ",
);
eq("hao hut giu nguyen", donGhiChu("[Hao hụt] Chuyến 2/2"), "[Hao hụt] Chuyến 2/2");

// ==================================================== bo phan trung doi tac

eq(
  "bo diem nhan trung ten doi tac",
  ghiChuHienThi("Điểm nhận: Kavkaz · Kavkaz", "BNC · KAVKAZ"),
  "",
);
eq(
  "khac dau va khoang trang van tinh la trung",
  ghiChuHienThi("Điểm nhận: Lễ Hội Bia", "BNC · LỄ HỘI BIA"),
  "",
);

/*
 * DIEM NHAN KHAC TEN DOI TAC THI PHAI GIU.
 *
 * Do la thong tin duy nhat cho biet bia di toi dau — doi tac la HLS nhung
 * diem nhan la SW Ha Long.
 */
eq(
  "giu diem nhan khi khac doi tac",
  ghiChuHienThi("Điểm nhận: SW Hạ Long", "HLS"),
  "Điểm nhận: SW Hạ Long",
);
eq(
  "giu chuyen va bo phan trung",
  ghiChuHienThi("Chuyến 1/2 · Điểm nhận: Kavkaz · Nạp từ file BBGN", "BNC · KAVKAZ"),
  "Chuyến 1/2",
);
eq(
  "khong co ten doi tac thi giu nguyen",
  ghiChuHienThi("Điểm nhận: Kavkaz", ""),
  "Điểm nhận: Kavkaz",
);
eq(
  "ghi chu nguoi viet khong bao gio bi coi la trung",
  ghiChuHienThi("Xe hỏng giữa đường", "BNC · KAVKAZ"),
  "Xe hỏng giữa đường",
);

// ==================================================== dia diem nhan

/*
 * NGOAI GIAO, HTKD VA CHI PHI KHAC DEU DON VE MOT DON VI.
 *
 * Nen diem nhan trong ghi chu la thu DUY NHAT cho biet bia di toi dau. Doc sai
 * o day la bao cao ngoai giao khong biet bia gui cho ai.
 */
eq(
  "doc diem nhan giua ghi chu",
  diaDiemTuGhiChu("Chuyen 1/2 \u00b7 \u0110i\u1ec3m nh\u1eadn: VMT \u00b7 N\u1ea1p t\u1eeb file BBGN"),
  "VMT",
);
eq(
  "doc khi dung mot minh",
  diaDiemTuGhiChu("\u0110i\u1ec3m nh\u1eadn: Draff Bia"),
  "Draff Bia",
);
eq(
  "ten co dau va khoang trang giu nguyen",
  diaDiemTuGhiChu("\u0110i\u1ec3m nh\u1eadn: L\u1ec5 H\u1ed9i Bia"),
  "L\u1ec5 H\u1ed9i Bia",
);

// Khong co diem nhan thi tra ve RONG, khong doan.
eq(
  "ghi chu nguoi go khong co diem nhan",
  diaDiemTuGhiChu("Xe h\u1ecfng gi\u1eefa \u0111\u01b0\u1eddng"),
  "",
);
eq("chuoi rong", diaDiemTuGhiChu(""), "");
eq("khong co gi", diaDiemTuGhiChu(undefined), "");
eq("null", diaDiemTuGhiChu(null), "");

// Chu "diem nhan" nam giua mot cau binh thuong thi khong tinh — phai la mot
// manh rieng, dung dang "Diem nhan: X".
eq(
  "nam giua cau thi khong tinh",
  diaDiemTuGhiChu("Qu\u00e1n n\u00e0y l\u00e0 \u0111i\u1ec3m nh\u1eadn ch\u00ednh"),
  "",
);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GIỮ ẢNH MINH CHỨNG.
 *
 * Luật đúng một câu — KHÔNG BAO GIỜ ghi danh sách rỗng đè lên danh sách đang
 * có — nhưng nó chắn đúng con đường đã làm mất ảnh thật của anh Khoa, nên
 * phép kiểm phải đi qua từng ngả một: trường cũ, trường mới, cả hai, không
 * cái nào, và bản ghi thiếu hẳn trường.
 */

import { ghiDeAnh, giuAnhCu, gomAnh } from "../anhMinhChung";

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

const A = "https://res.cloudinary.com/x/image/upload/v1/a.jpg";
const B = "https://res.cloudinary.com/x/image/upload/v1/b.jpg";

// ============================================================== gom anh

eq("ban ghi rong", gomAnh(null), []);
eq("khong co truong nao", gomAnh({}), []);
eq("chi co truong cu", gomAnh({ evidencePhotoUrl: A }), [A]);
eq("chi co truong moi", gomAnh({ evidencePhotoUrls: [A, B] }), [A, B]);
eq(
  "ca hai truong, truong cu dung dau",
  gomAnh({ evidencePhotoUrl: B, evidencePhotoUrls: [A] }),
  [B, A],
);
eq(
  "trung nhau thi gop lam mot",
  gomAnh({ evidencePhotoUrl: A, evidencePhotoUrls: [A, B] }),
  [A, B],
);
eq("bo o rong", gomAnh({ evidencePhotoUrl: "", evidencePhotoUrls: ["", A] }), [A]);
eq("bo khoang trang thua", gomAnh({ evidencePhotoUrl: `  ${A}  ` }), [A]);
eq("null trong mang khong lam vo", gomAnh({ evidencePhotoUrls: [null as never, A] }), [A]);
eq("truong moi khong phai mang", gomAnh({ evidencePhotoUrls: "x" as never }), []);

// ====================================== nap lai tep: GIU NGUYEN anh cu
//
// Day la ngã đã làm mất ảnh. Tệp Excel không mang theo ảnh nào, nên lần nạp
// lại không có gì để nói về ảnh — không nói gì thì không được đổi gì.

eq("nap lai giu anh cu", giuAnhCu({ evidencePhotoUrls: [A, B] }), {
  evidencePhotoUrl: A,
  evidencePhotoUrls: [A, B],
});
eq("nap lai keo ca truong cu len", giuAnhCu({ evidencePhotoUrl: A }), {
  evidencePhotoUrl: A,
  evidencePhotoUrls: [A],
});
eq("dong hoan toan moi thi van rong", giuAnhCu(undefined), {
  evidencePhotoUrl: null,
  evidencePhotoUrls: [],
});
eq("dong cu khong co anh", giuAnhCu({ evidencePhotoUrls: [] }), {
  evidencePhotoUrl: null,
  evidencePhotoUrls: [],
});

// ======================== xac nhan don: co anh moi thi thay, khong thi giu

eq("dinh anh moi thi thay han", ghiDeAnh([B], { evidencePhotoUrls: [A] }), {
  evidencePhotoUrl: B,
  evidencePhotoUrls: [B],
});
eq(
  "KHONG dinh gi thi GIU anh cu",
  ghiDeAnh([], { evidencePhotoUrls: [A] }),
  { evidencePhotoUrl: A, evidencePhotoUrls: [A] },
);
eq(
  "undefined cung la khong dinh gi",
  ghiDeAnh(undefined, { evidencePhotoUrl: A }),
  { evidencePhotoUrl: A, evidencePhotoUrls: [A] },
);
eq(
  "mang toan o rong cung la khong dinh gi",
  ghiDeAnh(["", "   "], { evidencePhotoUrls: [A] }),
  { evidencePhotoUrl: A, evidencePhotoUrls: [A] },
);
eq("chua co gi ma cung khong dinh gi", ghiDeAnh([], null), {
  evidencePhotoUrl: null,
  evidencePhotoUrls: [],
});
eq("dinh nhieu tam", ghiDeAnh([A, B], null), {
  evidencePhotoUrl: A,
  evidencePhotoUrls: [A, B],
});
eq("dinh trung tam thi gop lam mot", ghiDeAnh([A, A, B], null), {
  evidencePhotoUrl: A,
  evidencePhotoUrls: [A, B],
});

/*
 * BAM XAC NHAN HAI LAN LIEN TIEP.
 *
 * Lan dau dinh anh, lan sau khong dinh gi — vi phieu da xong, nguoi dung chi
 * bam lai cho chac. Lan sau KHONG duoc xoa anh cua lan dau.
 */
{
  const lan1 = ghiDeAnh([A], null);
  const lan2 = ghiDeAnh([], lan1);
  eq("bam xac nhan lan hai khong xoa anh", lan2, lan1);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

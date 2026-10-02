/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ẢNH THU NHỎ — kiểm cả hai vế, và vế thứ hai mới là vế đắt.
 *
 * Vế một: đường dẫn Cloudinary gốc thì phải chen đúng phép biến đổi vào đúng
 * chỗ. Vế hai: MỌI thứ khác phải trả về NGUYÊN XI. Chen nhầm vào một đường
 * dẫn không phải Cloudinary là dựng ra một địa chỉ không tồn tại — tức là
 * biến một tấm ảnh đang tải được thành một ô xám "chưa tải được ảnh", đúng
 * cái triệu chứng đang đi sửa.
 */

import { anhThuNho, laAnhCloudinaryGoc } from "../anhCloudinary";

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

const GOC =
  "https://res.cloudinary.com/zjtjeyqd/image/upload/v1789640255/qzzyesrmtcoubozvyrt3.jpg";

// ============================================== nhan ra duong dan goc

eq("duong dan that cua Khoa la anh goc", laAnhCloudinaryGoc(GOC), true);
eq(
  "khong co khuc ban cung la goc",
  laAnhCloudinaryGoc(
    "https://res.cloudinary.com/zjtjeyqd/image/upload/abc.jpg",
  ),
  true,
);
eq(
  "da co phep bien doi thi khong phai goc",
  laAnhCloudinaryGoc(
    "https://res.cloudinary.com/zjtjeyqd/image/upload/w_300/v1/abc.jpg",
  ),
  false,
);
eq(
  "phep bien doi nhieu manh cung nhan ra",
  laAnhCloudinaryGoc(
    "https://res.cloudinary.com/zjtjeyqd/image/upload/f_auto,q_auto/v1/abc.jpg",
  ),
  false,
);
eq("nha khac thi khong", laAnhCloudinaryGoc("https://abc.com/a.jpg"), false);
eq(
  "video khong phai anh",
  laAnhCloudinaryGoc(
    "https://res.cloudinary.com/zjtjeyqd/video/upload/v1/a.mp4",
  ),
  false,
);
eq("anh nhung thi khong", laAnhCloudinaryGoc("data:image/jpeg;base64,xx"), false);
eq("duong dan tam thi khong", laAnhCloudinaryGoc("blob:http://a/b"), false);
eq("rong thi khong", laAnhCloudinaryGoc(""), false);
eq(
  "http thuong khong tinh, tranh ha cap ket noi",
  laAnhCloudinaryGoc(
    "http://res.cloudinary.com/zjtjeyqd/image/upload/v1/a.jpg",
  ),
  false,
);

// ==================================================== dung ban thu nho

eq(
  "chen dung cho, ngay sau /upload/",
  anhThuNho(GOC, 480),
  "https://res.cloudinary.com/zjtjeyqd/image/upload/f_auto,q_auto,w_480,c_limit/v1789640255/qzzyesrmtcoubozvyrt3.jpg",
);
eq(
  "doi duoc be rong",
  anhThuNho(GOC, 64),
  "https://res.cloudinary.com/zjtjeyqd/image/upload/f_auto,q_auto,w_64,c_limit/v1789640255/qzzyesrmtcoubozvyrt3.jpg",
);
eq(
  "be rong le thi lam tron xuong so nguyen",
  anhThuNho(GOC, 480.9).includes("w_480,"),
  true,
);
// Mac dinh phai la 400 — be rong do theo o that cua luoi, khong phai so dep.
eq("mac dinh la w_400", anhThuNho(GOC).includes("w_400,"), true);
eq("be rong 0 thi ve 1, khong dung w_0", anhThuNho(GOC, 0).includes("w_1,"), true);
eq(
  "be rong am cung ve 1",
  anhThuNho(GOC, -5).includes("w_1,"),
  true,
);

// ==================== GIU NGUYEN: cho nay sai la bien anh tot thanh o xam

eq("anh nhung giu nguyen", anhThuNho("data:image/jpeg;base64,xx"), "data:image/jpeg;base64,xx");
eq("duong dan tam giu nguyen", anhThuNho("blob:http://a/b"), "blob:http://a/b");
eq("nha khac giu nguyen", anhThuNho("https://abc.com/a.jpg"), "https://abc.com/a.jpg");
eq("rong giu nguyen", anhThuNho(""), "");
eq(
  "da co phep bien doi thi khong chen them tang nua",
  anhThuNho("https://res.cloudinary.com/x/image/upload/w_300/v1/a.jpg"),
  "https://res.cloudinary.com/x/image/upload/w_300/v1/a.jpg",
);
eq(
  "anh mau cong khai cua Cloudinary van doi duoc",
  anhThuNho("https://res.cloudinary.com/demo/image/upload/sample.jpg", 120),
  "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_120,c_limit/sample.jpg",
);

// Goi hai lan khong duoc chong hai tang phep bien doi.
eq(
  "goi hai lan van ra mot tang",
  anhThuNho(anhThuNho(GOC, 480), 64),
  anhThuNho(GOC, 480),
);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

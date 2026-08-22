/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ImportSlip, Transaction } from "../../types";
import {
  doAnhCu,
  doDungLuong,
  laAnhBase64,
  soByte,
  thayTrongMang,
} from "../anhCu";

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

const ANH = "data:image/jpeg;base64,AAAABBBBCCCC";
const URL_CLOUD = "https://res.cloudinary.com/abc/image/upload/v1/x.jpg";

// ------------------------------------------------------------ nhận biết

kiemTra("nhan ra anh base64", laAnhBase64(ANH), true);
kiemTra("nhan ra anh png", laAnhBase64("data:image/png;base64,xx"), true);
kiemTra("URL Cloudinary khong phai anh nhung", laAnhBase64(URL_CLOUD), false);
kiemTra("chuoi rong", laAnhBase64(""), false);
kiemTra("undefined", laAnhBase64(undefined), false);
kiemTra("so", laAnhBase64(123), false);
// Không nhầm sang tệp nhúng loại khác — chỉ ảnh mới thuộc phạm vi dọn này.
kiemTra("data URI khong phai anh", laAnhBase64("data:text/plain;base64,x"), false);

kiemTra("so byte", soByte("abcd"), 5);

// ------------------------------------------------------------ dò

function tx(o: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    date: "2026-08-05T00:00:00.000Z",
    type: "IN",
    productId: "p1",
    productName: "Bia A",
    category: "Lít",
    quantity: 1,
    partnerId: "x",
    partnerName: "X",
    createdBy: "test",
    ...o,
  } as Transaction;
}

const transactions: Transaction[] = [
  // Ảnh cũ ở trường đơn.
  tx({ id: "t1", evidencePhotoUrl: ANH }),
  // Đã ở Cloudinary rồi — không được đụng vào.
  tx({ id: "t2", evidencePhotoUrl: URL_CLOUD }),
  // Mảng lẫn lộn: chỉ tấm base64 mới bị gom.
  tx({ id: "t3", evidencePhotoUrls: [URL_CLOUD, ANH, ANH] }),
  // Không có ảnh nào.
  tx({ id: "t4" }),
];

const slips: ImportSlip[] = [
  {
    id: "PN-260805-01",
    code: "PN-260805-01",
    date: "2026-08-05",
    status: "signed",
    signedPhotoUrls: [ANH, URL_CLOUD],
  },
  {
    id: "PN-260805-02",
    code: "PN-260805-02",
    date: "2026-08-05",
    status: "printed",
    signedPhotoUrls: [],
  },
];

const kq = doAnhCu(transactions, slips);

kiemTra("tim du 4 cho", kq.cho.length, 4);
kiemTra("dung 3 tai lieu", kq.soTaiLieu, 3);
kiemTra("tong byte", kq.tongByte, soByte(ANH) * 4);

kiemTra(
  "cho dau la truong don cua t1",
  [kq.cho[0].id, kq.cho[0].truong, kq.cho[0].chiSo],
  ["t1", "evidencePhotoUrl", -1],
);
// Giữ đúng chỉ số trong mảng, KHÔNG dồn lại — đảo chỗ là ảnh nhảy sang phiếu khác.
kiemTra(
  "giu dung chi so trong mang",
  kq.cho.filter((c) => c.id === "t3").map((c) => c.chiSo),
  [1, 2],
);
kiemTra(
  "cho cuoi la anh phieu",
  [kq.cho[3].loai, kq.cho[3].id, kq.cho[3].chiSo],
  ["slip", "PN-260805-01", 0],
);

// Chạy lại sau khi đã dọn thì không còn gì.
const daDon = doAnhCu(
  [tx({ id: "t9", evidencePhotoUrl: URL_CLOUD, evidencePhotoUrls: [URL_CLOUD] })],
  [],
);
kiemTra("da don thi khong con cho nao", daDon.cho.length, 0);
kiemTra("da don thi tong byte bang 0", daDon.tongByte, 0);

// Danh sách rỗng không làm vỡ.
kiemTra("danh sach rong", doAnhCu([], []).cho.length, 0);

// ------------------------------------------------------------ thay trong mảng

kiemTra(
  "thay dung vi tri",
  thayTrongMang([ANH, "b", "c"], 0, URL_CLOUD),
  [URL_CLOUD, "b", "c"],
);
kiemTra(
  "thay o giua giu nguyen hai ben",
  thayTrongMang(["a", ANH, "c"], 1, URL_CLOUD),
  ["a", URL_CLOUD, "c"],
);
kiemTra("chi so ngoai pham vi thi giu nguyen", thayTrongMang(["a"], 5, "z"), [
  "a",
]);
kiemTra("mang undefined", thayTrongMang(undefined, 0, "z"), []);
// Không được sửa mảng gốc: nơi gọi vẫn đang dùng nó để vẽ màn hình.
const goc = ["a", "b"];
thayTrongMang(goc, 0, "z");
kiemTra("khong sua mang goc", goc, ["a", "b"]);

// ------------------------------------------------------------ đo dung lượng

kiemTra("byte", doDungLuong(500), "500 B");
kiemTra("KB", doDungLuong(2048), "2.0 KB");
kiemTra("MB", doDungLuong(3 * 1024 * 1024), "3.0 MB");

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

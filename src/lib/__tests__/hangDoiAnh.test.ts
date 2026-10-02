/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HÀNG ĐỢI TẢI ẢNH.
 *
 * Phép kiểm đắt nhất ở đây là phép cuối: XIN RỒI KHÔNG TRẢ THÌ TẮC. Hàng đợi
 * này đứng chắn trước toàn bộ lưới ảnh, nên một lượt bị giữ lại là nửa lưới
 * đứng im vĩnh viễn — nhìn y hệt cái lỗi mà nó sinh ra để chữa.
 */

import {
  datLaiHangDoi,
  soDangChay,
  soDangCho,
  SUC_CHUA,
  traLuot,
  xinLuot,
} from "../hangDoiAnh";

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

async function chay() {
  // ------------------------------------------ dưới sức chứa thì đi thẳng
  datLaiHangDoi();
  let xong = 0;
  for (let i = 0; i < SUC_CHUA; i++) xinLuot().then(() => (xong += 1));
  await Promise.resolve();
  eq("du cho thi khong ai phai cho", xong, SUC_CHUA);
  eq("dang chay bang suc chua", soDangChay(), SUC_CHUA);
  eq("khong ai xep hang", soDangCho(), 0);

  // --------------------------------------------- quá sức chứa thì xếp hàng
  datLaiHangDoi();
  const nhan: number[] = [];
  for (let i = 0; i < SUC_CHUA + 3; i++) {
    xinLuot().then(() => nhan.push(i));
  }
  await Promise.resolve();
  eq("chi bay nguoi dau duoc di", nhan.length, SUC_CHUA);
  eq("ba nguoi con lai xep hang", soDangCho(), 3);
  eq("so dang chay khong vuot suc chua", soDangChay(), SUC_CHUA);

  // Trả một lượt thì đúng MỘT người kế tiếp được đi, không phải cả đám.
  traLuot();
  await Promise.resolve();
  eq("tra mot luot thi mot nguoi duoc di", nhan.length, SUC_CHUA + 1);
  eq("van dung suc chua", soDangChay(), SUC_CHUA);
  eq("con hai nguoi cho", soDangCho(), 2);

  // Đi đúng thứ tự vào trước ra trước: ảnh đầu lưới phải hiện trước.
  eq("vao truoc ra truoc", nhan[SUC_CHUA], SUC_CHUA);

  // Trả hết thì hàng đợi rỗng và số đang chạy về 0.
  traLuot();
  traLuot();
  await Promise.resolve();
  eq("het nguoi cho", soDangCho(), 0);
  for (let i = 0; i < SUC_CHUA + 1; i++) traLuot();
  eq("tra het thi khong con ai chay", soDangChay(), 0);

  // ------------------------------- trả thừa không được làm số đếm âm
  datLaiHangDoi();
  traLuot();
  traLuot();
  eq("tra thua van la 0, khong am", soDangChay(), 0);
  // Số âm sẽ ngầm nới sức chứa ở những lượt sau, nên phải kiểm luôn.
  let diNgay = 0;
  for (let i = 0; i < SUC_CHUA + 1; i++) xinLuot().then(() => (diNgay += 1));
  await Promise.resolve();
  eq("sau khi tra thua, suc chua van dung", diNgay, SUC_CHUA);

  // ------------------------------ GIỮ LƯỢT KHÔNG TRẢ THÌ NHỮNG NGƯỜI SAU TẮC
  datLaiHangDoi();
  let qua = 0;
  for (let i = 0; i < SUC_CHUA + 1; i++) xinLuot().then(() => (qua += 1));
  await Promise.resolve();
  eq("nguoi thu nam phai cho", qua, SUC_CHUA);
  await Promise.resolve();
  await Promise.resolve();
  eq("khong ai tra thi cho mai", qua, SUC_CHUA);
  traLuot();
  await Promise.resolve();
  eq("co nguoi tra thi di tiep", qua, SUC_CHUA + 1);

  datLaiHangDoi();
  console.log(`\n${pass} DUNG / ${fail} SAI`);
  process.exit(fail > 0 ? 1 : 0);
}

chay();

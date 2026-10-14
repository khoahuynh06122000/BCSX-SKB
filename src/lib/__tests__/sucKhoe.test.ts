/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỔ SỨC KHỎE NGUỒN DỮ LIỆU — máy chủ có chuyện thì dải cảnh báo phải hiện,
 * hết chuyện thì phải tự tắt; lỗi do thao tác thì KHÔNG được báo động giả.
 */

import { phanLoaiLoiMayChu, taoSoSucKhoe } from "../sucKhoe";

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
const ngu = (ms: number) => new Promise((r) => setTimeout(r, ms));
const khoa = (so: ReturnType<typeof taoSoSucKhoe>) =>
  so.layVanDe().map((v) => v.khoa).sort();

// ---- Phân loại ----
eq("het han muc", phanLoaiLoiMayChu({ code: "resource-exhausted" })?.ma, "resource-exhausted");
eq("het han muc qua chu Quota", phanLoaiLoiMayChu({ message: "Quota exceeded." })?.muc, "do");
eq("het han muc phai tai lai", phanLoaiLoiMayChu({ code: "resource-exhausted" })?.canTaiLai, true);
eq("mat ket noi", phanLoaiLoiMayChu({ code: "unavailable" })?.muc, "do");
eq("ma co tien to firestore/", phanLoaiLoiMayChu({ code: "firestore/unavailable" })?.ma, "unavailable");
eq("het phien", phanLoaiLoiMayChu({ code: "unauthenticated" })?.ma, "unauthenticated");
eq("thieu quyen la viec cua nut, khong bao dong", phanLoaiLoiMayChu({ code: "permission-denied" }), null);
eq("du lieu sai khong bao dong", phanLoaiLoiMayChu({ code: "invalid-argument" }), null);
eq("loi null khong vo", phanLoaiLoiMayChu(null), null);

async function chay() {
  // ---- Ghi thành công: không để lại gì ----
  {
    const so = taoSoSucKhoe({ choGhiMs: 30 });
    const kq = await so.theoDoiGhi(Promise.resolve(7));
    eq("ghi xong tra dung ket qua", kq, 7);
    eq("ghi xong khong co van de", khoa(so), []);
  }

  // ---- Ghi treo quá hạn → vàng; xong thì tự tắt ----
  {
    const so = taoSoSucKhoe({ choGhiMs: 20 });
    let xong!: () => void;
    const p = so.theoDoiGhi(new Promise<void>((r) => (xong = r)));
    await ngu(40);
    eq("ghi treo hien canh bao", khoa(so), ["ghi-treo"]);
    eq("ghi treo la muc vang", so.layVanDe()[0]?.muc, "vang");
    xong();
    await p;
    eq("ghi xong thi canh bao treo tu tat", khoa(so), []);
  }

  // ---- Hai lệnh treo: một lệnh xong chưa được tắt cảnh báo ----
  {
    const so = taoSoSucKhoe({ choGhiMs: 20 });
    let xong1!: () => void;
    let xong2!: () => void;
    const p1 = so.theoDoiGhi(new Promise<void>((r) => (xong1 = r)));
    const p2 = so.theoDoiGhi(new Promise<void>((r) => (xong2 = r)));
    await ngu(40);
    xong1();
    await p1;
    eq("con mot lenh treo thi van canh bao", khoa(so), ["ghi-treo"]);
    xong2();
    await p2;
    eq("het lenh treo thi tat", khoa(so), []);
  }

  // ---- Ghi hỏng vì máy chủ → đỏ, giữ tới lần ghi được kế tiếp ----
  {
    const so = taoSoSucKhoe({ choGhiMs: 1000 });
    let nem = false;
    try {
      await so.theoDoiGhi(Promise.reject({ code: "resource-exhausted" }));
    } catch {
      nem = true;
    }
    eq("loi van duoc nem lai cho noi goi", nem, true);
    eq("ghi hong vi het han muc thi bao", khoa(so), ["ghi-loi"]);
    await so.theoDoiGhi(Promise.resolve());
    eq("ghi lai duoc thi tat", khoa(so), []);
  }

  // ---- Ghi hỏng do thao tác (thiếu quyền) → không báo động chung ----
  {
    const so = taoSoSucKhoe({ choGhiMs: 1000 });
    await so.theoDoiGhi(Promise.reject({ code: "permission-denied" })).catch(() => {});
    eq("thieu quyen khong len dai canh bao", khoa(so), []);
  }

  // ---- Đọc hỏng, ảnh, mạng ----
  {
    const so = taoSoSucKhoe();
    let lan = 0;
    so.dangKy(() => (lan += 1));
    so.baoLoiDoc({ code: "resource-exhausted" });
    so.baoLoiDoc({ code: "resource-exhausted" });
    eq("cung mot loi bao hai lan chi mot dong", khoa(so), ["doc-loi"]);
    eq("khong bao lai nguoi nghe khi khong doi", lan, 1);
    eq("loi doc luon can tai lai", so.layVanDe()[0]?.canTaiLai, true);
    so.baoAnh(false, "401");
    so.baoMang(false);
    eq("ba nguon cung luc", khoa(so), ["anh-loi", "doc-loi", "mat-mang"]);
    so.baoAnh(true);
    so.baoMang(true);
    eq("anh va mang tu tat", khoa(so), ["doc-loi"]);
  }

  console.log(`\n${pass} DUNG / ${fail} SAI`);
  process.exit(fail > 0 ? 1 : 0);
}
void chay();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BỘ ĐO LƯỢT GỌI FIREBASE.
 *
 * Phép kiểm đắt nhất là cách tính lượt đọc của một snapshot: tính thừa thì
 * bộ đo báo động giả, tính thiếu thì đúng ngày sập nó vẫn xanh.
 */

import {
  BoDem,
  cacNgayGanNhat,
  duBaoCuoiNgay,
  khoaNguoi,
  mucDo,
  ngayHanMuc,
  phutDaQua,
  soDocCuaSnapshot,
  xepNguoi,
} from "../doLuong";

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

const snap = (o: { fromCache?: boolean; pending?: boolean; size?: number; doi?: string[] }) => ({
  metadata: { fromCache: !!o.fromCache, hasPendingWrites: !!o.pending },
  size: o.size,
  docChanges: o.doi ? () => o.doi!.map((type) => ({ type })) : undefined,
});

// ===================================================== luot doc cua snapshot

eq("lan dau mo bang: tinh ca bang", soDocCuaSnapshot(snap({ size: 3000, doi: [] }), true), 3000);
eq("bang rong van tinh 1 luot", soDocCuaSnapshot(snap({ size: 0, doi: [] }), true), 1);
eq("lay tu dem tren may: khong tinh", soDocCuaSnapshot(snap({ fromCache: true, size: 3000, doi: [] }), true), 0);
eq(
  "lan sau: chi tinh dong them va sua",
  soDocCuaSnapshot(snap({ size: 3001, doi: ["added", "modified", "modified"] }), false),
  3,
);
eq("dong bi xoa khoi ket qua khong tinh", soDocCuaSnapshot(snap({ size: 2999, doi: ["removed"] }), false), 0);
eq(
  "tieng vong cua lenh ghi chua len may chu: khong tinh",
  soDocCuaSnapshot(snap({ pending: true, size: 3001, doi: ["added"] }), false),
  0,
);
eq("mot tai lieu don: 1 luot", soDocCuaSnapshot(snap({}), true), 1);
eq("tai lieu don tu dem: 0", soDocCuaSnapshot(snap({ fromCache: true }), true), 0);

// ================================================================ bo dem

{
  const b = new BoDem();
  b.them("doc", 3000);
  b.them("ghi", 5);
  b.them("doc", 2);
  b.them("xoa", -4); // so am bi bo
  b.them("ghi", Number.NaN);
  eq("lay phan cho gui", b.layVaXoa(), { doc: 3002, ghi: 5, xoa: 0 });
  eq("lay xong thi ve 0", b.layVaXoa(), { doc: 0, ghi: 0, xoa: 0 });
  eq("tong phien van giu de bay man hinh", b.tongPhien, { doc: 3002, ghi: 5, xoa: 0 });
  // Gui hong thi tra lai, lan sau gui tiep — khong mat so.
  b.them("doc", 10);
  const lay = b.layVaXoa();
  b.traLai(lay);
  eq("gui hong tra lai khong mat so", b.layVaXoa(), { doc: 10, ghi: 0, xoa: 0 });
}

// ========================================================= ngay han muc

/*
 * Han muc Firestore dat lai luc nua dem gio Los Angeles. 14/10/2026 la gio
 * mua he (PDT, UTC-7): 06:59 UTC van la ngay 13 o LA, 07:00 UTC sang ngay 14.
 */
eq("06:59 UTC van la ngay hom truoc o LA", ngayHanMuc(new Date("2026-10-14T06:59:00Z")), "2026-10-13");
eq("07:00 UTC sang ngay moi o LA", ngayHanMuc(new Date("2026-10-14T07:00:00Z")), "2026-10-14");
// Gio mua dong (PST, UTC-8) — thang 12.
eq("mua dong: 07:59 UTC van ngay cu", ngayHanMuc(new Date("2026-12-10T07:59:00Z")), "2026-12-09");
eq("mua dong: 08:00 UTC sang ngay moi", ngayHanMuc(new Date("2026-12-10T08:00:00Z")), "2026-12-10");
eq("phut da qua trong ngay", phutDaQua(new Date("2026-10-14T09:30:00Z")), 150);
eq(
  "bay ngay gan nhat, moi nhat truoc, khong trung",
  cacNgayGanNhat(3, new Date("2026-10-14T12:00:00Z")),
  ["2026-10-14", "2026-10-13", "2026-10-12"],
);

// ============================================================ muc do, du bao

eq("duoi 50% an toan", mucDo(24_999, 50_000), "an-toan");
eq("50% la chu y", mucDo(25_000, 50_000), "chu-y");
eq("80% la nguy", mucDo(40_000, 50_000), "nguy");
eq("moc 0 khong vo", mucDo(10, 0), "an-toan");
eq("du bao theo nhip: nua ngay 20k -> ca ngay 40k", duBaoCuoiNgay(20_000, 720), 40_000);
eq("moi qua nua dem 5 phut khong nhan bua", duBaoCuoiNgay(500, 5), 12_000);

// ============================================================== nguoi goi

eq("khoa nguoi bo dau cham", khoaNguoi("Khoa.Huynh.06.12.2000@gmail.com"), "khoa_huynh_06_12_2000_gmail_com");
eq("email rong", khoaNguoi(""), "khong_ro");
eq(
  "xep nguoi theo luot doc",
  xepNguoi({ a: { doc: 10, ghi: 1 }, b: { doc: 900 }, c: {} }).map((x) => x.khoa),
  ["b", "a", "c"],
);
eq("truong thieu thanh 0", xepNguoi({ c: {} })[0].so, { doc: 0, ghi: 0, xoa: 0 });

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

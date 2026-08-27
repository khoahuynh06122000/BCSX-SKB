/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Product, Transaction } from "../../types";
import { dungBangBNC, laBoPhanBNC, litQuyDoiCuaDong } from "../bnc";

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

const products: Product[] = [
  {
    id: "hoi",
    name: "Bia hơi",
    category: "Lít",
    unit: "Lít",
    price: 0,
    conversionFactor: 1,
    capacityPerUnit: 1000,
  },
  {
    id: "lon",
    name: "Bia lon 330",
    category: "Lon",
    unit: "Lon",
    price: 0,
    conversionFactor: 1,
    capacityPerUnit: 330,
  },
];

const ten = new Map([
  ["AD0103-1901", "BNC · 1901"],
  ["AD0103-CV", "BNC · Cầu Vàng"],
  ["AD0103-NG", "BNC · Ngoại giao"],
]);

let seq = 0;
function tx(o: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    date: "2026-08-21T08:00:00.000Z",
    type: "OUT",
    productId: "hoi",
    productName: "Bia hơi",
    category: "Lít",
    quantity: 0,
    partnerId: "AD0103-1901",
    partnerName: "BNC · 1901",
    createdBy: "test",
    ...o,
  } as Transaction;
}

// ------------------------------------------------------------ nhận biết

eq("nhan ra bo phan BNC", laBoPhanBNC("AD0103-1901"), true);
// Mã BNC trơn KHÔNG phải một bộ phận — không còn mục nào như vậy trong danh mục.
eq("ma BNC tron khong phai bo phan", laBoPhanBNC("AD0103"), false);
eq("don vi ngoai khong phai BNC", laBoPhanBNC("AC0107"), false);
eq("rong", laBoPhanBNC(""), false);

// Lon quy về lít theo dung tích, không cộng thẳng số lon vào số lít.
eq(
  "24 lon 330ml = 7,92 lit",
  litQuyDoiCuaDong(tx({ quantity: 24, productId: "lon", category: "Lon" }), products[1]),
  7.92,
);
eq("100 lit hoi = 100 lit", litQuyDoiCuaDong(tx({ quantity: 100 }), products[0]), 100);

// ------------------------------------------------------------ dựng bảng

const transactions: Transaction[] = [
  // Đơn A — 1901 ngày 21, hai mặt hàng, đã hoàn tất và có ảnh.
  tx({
    referenceGroupId: "gA",
    quantity: 103,
    evidencePhotoUrls: ["u1"],
    notes: "Chuyến 1/2 · Điểm nhận: NH 1901",
  }),
  tx({
    referenceGroupId: "gA",
    quantity: 60,
    productId: "lon",
    category: "Lon",
    evidencePhotoUrls: ["u1"],
  }),
  // Hao hụt của chính đơn A — KHÔNG được cộng vào sản lượng giao.
  tx({ referenceGroupId: "gA", type: "LOSS", quantity: 0.6 }),
  // Đơn B — 1901 ngày 21 chuyến hai, còn đi đường.
  tx({ referenceGroupId: "gB", quantity: 206, status: "in_transit" }),
  // Đơn C — Cầu Vàng ngày 22, hoàn tất nhưng KHÔNG có ảnh.
  tx({
    referenceGroupId: "gC",
    quantity: 48,
    date: "2026-08-22T08:00:00.000Z",
    partnerId: "AD0103-CV",
    partnerName: "BNC · Cầu Vàng",
  }),
  // Đơn lẻ không có nhóm — vẫn phải tính là một đơn.
  tx({
    id: "le1",
    quantity: 20,
    date: "2026-08-23T08:00:00.000Z",
    partnerId: "AD0103-NG",
    partnerName: "BNC · Ngoại giao",
  }),
  // Đơn vị NGOÀI BNC — không được lọt vào.
  tx({ quantity: 999, partnerId: "AC0107", partnerName: "FV" }),
  // Nhập kho — không phải đơn giao.
  tx({ type: "IN", quantity: 500 }),
];

const b = dungBangBNC({
  transactions,
  products,
  tuNgay: "",
  denNgay: "",
  boPhan: "",
  tenBoPhan: ten,
});

eq("bon don", b.tong.soDon, 4);
eq("ba bo phan", b.tong.soBoPhan, 3);
eq("khong lot don vi ngoai BNC", b.don.some((d) => d.boPhan === "FV"), false);
eq("khong tinh dong nhap kho", b.tong.soLuongLit, 103 + 206 + 48 + 20);
eq("dem rieng so lon", b.tong.soLuongLon, 60);
// 377 lít hơi + 60 lon × 0,33 = 377 + 19,8
eq("lit quy doi", Math.round(b.tong.litQuyDoi * 100) / 100, 396.8);
eq("hao hut tinh rieng", b.tong.haoHut, 0.6);
eq("mot don con di duong", b.tong.donChuaXong, 1);
// Don C (Cau Vang) va don le NG deu hoan tat ma khong co anh nao.
eq("hai don hoan tat ma thieu anh", b.tong.donThieuAnh, 2);

const donA = b.don.find((d) => d.id === "gA")!;
eq("don A hai mat hang", donA.soMatHang, 2);
eq("don A hao hut khong vao san luong", [donA.soLuongLit, donA.haoHut], [103, 0.6]);
eq("don A da hoan tat", donA.trangThai, "hoan_tat");
eq("don A co anh", donA.coAnh, true);
eq("don A giu ghi chu chuyen", donA.ghiChu.includes("Chuyến 1/2"), true);

const donB = b.don.find((d) => d.id === "gB")!;
eq("don B con di duong", donB.trangThai, "di_duong");

eq("don le van la mot don", b.don.some((d) => d.id === "le1"), true);

// Mới nhất lên trước.
eq(
  "xep moi nhat truoc",
  b.don.map((d) => d.ngay),
  ["2026-08-23", "2026-08-22", "2026-08-21", "2026-08-21"],
);

// Bộ phận xếp theo sản lượng giảm dần.
eq(
  "bo phan xep theo san luong",
  b.theoBoPhan.map((o) => o.boPhan),
  ["BNC · 1901", "BNC · Cầu Vàng", "BNC · Ngoại giao"],
);
const bp1901 = b.theoBoPhan[0];
eq("1901 hai don", bp1901.soDon, 2);
eq("1901 mot don chua xong", bp1901.donChuaXong, 1);
eq("1901 lan cuoi", bp1901.lanCuoi, "2026-08-21");

// ------------------------------------------------------------ lọc

eq(
  "loc theo khoang ngay",
  dungBangBNC({
    transactions,
    products,
    tuNgay: "2026-08-22",
    denNgay: "2026-08-22",
    boPhan: "",
    tenBoPhan: ten,
  }).tong.soDon,
  1,
);
eq(
  "loc dung mot bo phan",
  dungBangBNC({
    transactions,
    products,
    tuNgay: "",
    denNgay: "",
    boPhan: "AD0103-1901",
    tenBoPhan: ten,
  }).tong.soDon,
  2,
);
eq(
  "khoang khong co don nao",
  dungBangBNC({
    transactions,
    products,
    tuNgay: "2026-09-01",
    denNgay: "2026-09-30",
    boPhan: "",
    tenBoPhan: ten,
  }).tong.soDon,
  0,
);
eq(
  "khong co giao dich nao",
  dungBangBNC({
    transactions: [],
    products,
    tuNgay: "",
    denNgay: "",
    boPhan: "",
    tenBoPhan: ten,
  }).tong.litQuyDoi,
  0,
);

// ------------------------------------------------------------ anh bien ban
{
  /*
   * Anh bien ban gan vao TUNG DONG giao dich, ma mot don co nhieu mat hang nen
   * cung mot to bien ban bi gan lap lai. Gom len don thi phai bo trung, khong
   * thi bam xem mot don nam mat hang lai thay dung mot tam lap nam lan.
   */
  const b2 = dungBangBNC({
    transactions: [
      tx({
        referenceGroupId: "gX",
        quantity: 10,
        evidencePhotoUrl: "u1",
        evidencePhotoUrls: ["u1", "u2"],
      }),
      tx({
        referenceGroupId: "gX",
        quantity: 20,
        productId: "lon",
        category: "Lon",
        // Cung to bien ban do, gan lai cho dong thu hai.
        evidencePhotoUrls: ["u1"],
      }),
      tx({
        referenceGroupId: "gX",
        quantity: 5,
        // Dong nay co them mot tam rieng.
        evidencePhotoUrls: ["u3"],
      }),
    ],
    products,
    tuNgay: "",
    denNgay: "",
    boPhan: "",
    tenBoPhan: ten,
  });
  const d = b2.don[0];
  eq("gom du ba tam anh khac nhau", d.anh, ["u1", "u2", "u3"]);
  eq("khong lap tam trung", d.anh.length, 3);
  eq("co anh", d.coAnh, true);

  // Don khong co anh nao thi mang rong, khong phai undefined.
  const b3 = dungBangBNC({
    transactions: [tx({ referenceGroupId: "gY", quantity: 10 })],
    products,
    tuNgay: "",
    denNgay: "",
    boPhan: "",
    tenBoPhan: ten,
  });
  eq("khong co anh thi mang rong", b3.don[0].anh, []);
  eq("coAnh = false", b3.don[0].coAnh, false);

  // Dong hao hut khong mang anh cua rieng no vao don.
  const b4 = dungBangBNC({
    transactions: [
      tx({ referenceGroupId: "gZ", quantity: 10, evidencePhotoUrls: ["a1"] }),
      tx({ referenceGroupId: "gZ", type: "LOSS", quantity: 1, evidencePhotoUrls: ["bo-qua"] }),
    ],
    products,
    tuNgay: "",
    denNgay: "",
    boPhan: "",
    tenBoPhan: ten,
  });
  eq("dong hao hut khong gop anh", b4.don[0].anh, ["a1"]);
}


// -------------------------------------------------- bon phan cua BNC

// Du lieu mau: 3 don cua diem ban (1901, Cau Vang) + 1 don Ngoai giao.
{
  const nb = b.theoNhom.find((n) => n.nhom === "NB");
  const ng = b.theoNhom.find((n) => n.nhom === "NG");
  const htkd = b.theoNhom.find((n) => n.nhom === "HTKD");
  const cpk = b.theoNhom.find((n) => n.nhom === "CPK");

  eq("luon co du bon nhom", b.theoNhom.length, 4);
  eq("thu tu nhom co dinh", b.theoNhom.map((n) => n.ten), [
    "Nội bộ",
    "Ngoại giao",
    "HTKD",
    "Chi phí khác",
  ]);

  eq("Noi bo gom 1901 va Cau Vang", nb?.soBoPhan, 2);
  eq("Ngoai giao mot bo phan", ng?.soBoPhan, 1);
  // Nhom khong phat sinh gi VAN phai co dong, so bang khong. Thieu han dong thi
  // nguoi xem tuong nhom do khong ton tai.
  eq("HTKD khong phat sinh nhung van co dong", htkd?.soBoPhan, 0);
  eq("HTKD san luong bang khong", htkd?.litQuyDoi, 0);
  eq("Chi phi khac khong phat sinh", cpk?.soDon, 0);

  // Cong bon nhom lai phai bang tong ca bang — day la phep chan duy nhat bat
  // duoc loi mot bo phan roi ra ngoai moi nhom.
  const congNhom = (lay: (n: (typeof b.theoNhom)[number]) => number) =>
    b.theoNhom.reduce((s, n) => s + lay(n), 0);
  eq("cong so don bon nhom = tong", congNhom((n) => n.soDon), b.tong.soDon);
  eq("cong bo phan bon nhom = tong", congNhom((n) => n.soBoPhan), b.tong.soBoPhan);
  eq(
    "cong lit quy doi bon nhom = tong",
    Math.round(congNhom((n) => n.litQuyDoi) * 100),
    Math.round(b.tong.litQuyDoi * 100),
  );
  eq(
    "cong hao hut bon nhom = tong",
    Math.round(congNhom((n) => n.haoHut) * 100),
    Math.round(b.tong.haoHut * 100),
  );

  // Tung don mang dung nhom cua bo phan no.
  eq(
    "don cua Ngoai giao mang nhom NG",
    b.don.find((d) => d.partnerId === "AD0103-NG")?.nhom,
    "NG",
  );
  eq(
    "don cua diem ban mang nhom NB",
    b.don.find((d) => d.partnerId === "AD0103-1901")?.nhom,
    "NB",
  );

  // Loc theo nhom: chi con don cua nhom do.
  const chiNG = dungBangBNC({
    transactions,
    products,
    tuNgay: "",
    denNgay: "",
    boPhan: "",
    nhom: "NG",
    tenBoPhan: ten,
  });
  eq("loc nhom NG con mot don", chiNG.tong.soDon, 1);
  eq(
    "loc nhom NG khong con diem ban nao",
    chiNG.don.every((d) => d.nhom === "NG"),
    true,
  );
  const chiNB = dungBangBNC({
    transactions,
    products,
    tuNgay: "",
    denNgay: "",
    boPhan: "",
    nhom: "NB",
    tenBoPhan: ten,
  });
  eq("loc nhom NB con ba don", chiNB.tong.soDon, 3);
  eq("loc nhom rong = lay het", b.tong.soDon, 4);

  // Loc ca nhom lan bo phan: hai dieu kien cung phai dung.
  const lech = dungBangBNC({
    transactions,
    products,
    tuNgay: "",
    denNgay: "",
    boPhan: "AD0103-1901",
    nhom: "NG",
    tenBoPhan: ten,
  });
  eq("bo phan khong thuoc nhom dang loc thi rong", lech.tong.soDon, 0);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

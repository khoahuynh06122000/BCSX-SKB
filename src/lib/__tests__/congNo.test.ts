/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRA BẢNG CÔNG NỢ
 *
 * Số kỳ vọng trong bài kiểm tra này KHÔNG do tôi nghĩ ra: tất cả chép từ file
 * thật `file công nợ T08.2026.xlsx` của bộ phận. Ví dụ dòng BNC đầu tiên —
 * 9.813,4 lít, thành tiền 294.402.000, VAT 29.440.200, sau thuế 323.842.200,
 * chặng DNC 314.028.800, số hóa đơn C26TKB#00000192 — là dòng số 1 của file.
 *
 * Nhờ vậy nếu ai đó sửa giá hay sửa công thức, bài kiểm tra sẽ lệch đúng chỗ
 * lệch so với file kế toán đang dùng, chứ không lệch so với một con số tôi tự
 * đặt ra.
 */

import type { Partner, Product, Transaction } from "../../types";
import {
  dungBangCongNo,
  hangMatHang,
  ngayVietNam,
  nhanNgayGiao,
  soHoaDonThu,
  tenTrenHoaDon,
  COT_CHOT,
  oCuaDong,
  type DotChot,
} from "../congNo";

let pass = 0;
let fail = 0;

function kiemTra(ten: string, thuc: unknown, mong: unknown) {
  const a = JSON.stringify(thuc);
  const b = JSON.stringify(mong);
  if (a === b) {
    pass++;
  } else {
    fail++;
    console.log(`SAI  ${ten}\n     thuc te: ${a}\n     mong doi: ${b}`);
  }
}

function gan(ten: string, thuc: number, mong: number, saiSo = 0.5) {
  if (Math.abs(thuc - mong) <= saiSo) {
    pass++;
  } else {
    fail++;
    console.log(`SAI  ${ten}\n     thuc te: ${thuc}\n     mong doi: ${mong}`);
  }
}

// ---------------------------------------------------------------- tiện ích

kiemTra("ngayVietNam", ngayVietNam("2026-08-15"), "15.08.2026");
kiemTra("ngayVietNam rong", ngayVietNam(""), "");
kiemTra(
  "nhan nhieu ngay",
  nhanNgayGiao("2026-08-01", "2026-08-12"),
  "01.08-12.08",
);
kiemTra(
  "nhan mot ngay co nam",
  nhanNgayGiao("2026-08-20", "2026-08-20"),
  "20.08.2026",
);
kiemTra("so hoa don", soHoaDonThu("C26TKB#", 192), "C26TKB#00000192");
kiemTra("so hoa don 4 chu so", soHoaDonThu("C26TKB#", 1203), "C26TKB#00001203");
kiemTra("ten tren hoa don bo phan", tenTrenHoaDon("BNC · Lễ Hội Bia"), "BNC");
kiemTra("ten tren hoa don thuong", tenTrenHoaDon("Cát bà"), "Cát bà");
kiemTra("18 cot", COT_CHOT.length, 18);

// Khối Lít luôn đứng trước khối Lon, kể cả khi mã Lon nhỏ hơn.
if (hangMatHang("10218490", "LIT") < hangMatHang("10168110", "LON")) pass++;
else {
  fail++;
  console.log("SAI  khoi Lit phai dung truoc khoi Lon");
}
// Mã lạ vẫn nằm trong đúng khối của nó.
if (hangMatHang("99999999", "LIT") < hangMatHang("10168110", "LON")) pass++;
else {
  fail++;
  console.log("SAI  ma la phai nam trong dung khoi");
}

// ---------------------------------------------------------------- dữ liệu

const products: Product[] = [
  {
    id: "p1",
    name: "Bia Golden Bridge Helles Lager",
    materialCode: "10168107",
    category: "Lít",
    unit: "Lít",
    price: 45000,
    conversionFactor: 1,
    capacityPerUnit: 1000,
  },
  {
    id: "p4",
    name: "Bia Golden Bridge Helles Lager lon330ml",
    materialCode: "10168110",
    category: "Lon",
    unit: "Lon",
    price: 15833,
    conversionFactor: 1,
    capacityPerUnit: 330,
  },
  {
    id: "pX",
    name: "Bia chua co ma",
    category: "Lít",
    unit: "Lít",
    price: 1,
    conversionFactor: 1,
    capacityPerUnit: 1000,
  } as Product,
];

const partners: Partner[] = [
  { id: "AD0103-1901", sapCode: "AD0103", name: "BNC · 1901", type: "AGENT" },
  {
    id: "AD0103-LHB",
    sapCode: "AD0103",
    name: "BNC · Lễ Hội Bia",
    type: "AGENT",
  },
  { id: "AC0118", sapCode: "AC0118", name: "BNG", type: "AGENT" },
  { id: "AC0107", sapCode: "AC0107", name: "FV", type: "AGENT" },
  { id: "KHONGBP", sapCode: "", name: "Don vi chua co ma BP", type: "AGENT" },
];

let seq = 0;
function tx(o: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    date: "2026-08-05T08:00:00.000Z",
    type: "OUT",
    productId: "p1",
    productName: "Bia Golden Bridge Helles Lager",
    category: "Lít",
    quantity: 0,
    partnerId: "AD0103-1901",
    partnerName: "BNC · 1901",
    createdBy: "test",
    ...o,
  } as Transaction;
}

const dot: DotChot[] = [
  {
    id: "d1",
    tuNgay: "2026-08-01",
    denNgay: "2026-08-12",
    ngayHoaDon: "2026-08-15",
  },
  {
    id: "d2",
    tuNgay: "2026-08-13",
    denNgay: "2026-08-16",
    ngayHoaDon: "2026-08-19",
  },
];

const transactions: Transaction[] = [
  // BNC đợt 1, hai bộ phận khác nhau — phải gộp thành MỘT dòng 9.813,4.
  tx({ quantity: 9000, partnerId: "AD0103-1901" }),
  tx({
    quantity: 813.4,
    partnerId: "AD0103-LHB",
    partnerName: "BNC · Lễ Hội Bia",
    date: "2026-08-11T08:00:00.000Z",
  }),
  // BNC đợt 1, hàng lon — phải xếp SAU hàng lít của chính BNC.
  tx({
    quantity: 6360,
    productId: "p4",
    productName: "Bia Golden Bridge Helles Lager lon330ml",
    category: "Lon",
    partnerId: "AD0103-1901",
  }),
  // BNG đợt 1.
  tx({ quantity: 120, partnerId: "AC0118", partnerName: "BNG" }),
  // FV đợt 2.
  tx({
    quantity: 100,
    partnerId: "AC0107",
    partnerName: "FV",
    date: "2026-08-14T08:00:00.000Z",
  }),
  // Không thuộc đợt nào (kẽ hở 17.08) — phải báo, không được tính.
  tx({ quantity: 55, date: "2026-08-17T08:00:00.000Z" }),
  // Đang đi đường — chưa tính, phải báo.
  tx({ quantity: 77, status: "in_transit" }),
  // Hao hụt — không phải bán, không lên hóa đơn.
  tx({ quantity: 12, type: "LOSS" }),
  // Nhập kho — không lên hóa đơn.
  tx({ quantity: 500, type: "IN" }),
  // Thiếu mã vật tư — vẫn lên bảng nhưng phải báo.
  tx({
    quantity: 30,
    productId: "pX",
    productName: "Bia chua co ma",
    partnerId: "AC0118",
    partnerName: "BNG",
  }),
  // Đơn vị chưa có mã BP — phải báo.
  tx({
    quantity: 40,
    partnerId: "KHONGBP",
    partnerName: "Don vi chua co ma BP",
  }),
];

const bang = dungBangCongNo({
  transactions,
  products,
  partners,
  dot,
  tienToHoaDon: "C26TKB#",
  soHoaDonBatDau: 192,
});

// ---------------------------------------------------------------- kết quả

kiemTra("so dong", bang.dong.length, 6);

const d1 = bang.dong[0];
kiemTra("dong 1 don vi", d1.donVi, "BNC");
kiemTra("dong 1 ma BP gop 20 bo phan", d1.maBp, "AD0103");
gan("dong 1 so luong gop", d1.soLuong, 9813.4, 0.001);
gan("dong 1 thanh tien SKB", d1.thanhTienSkb, 294_402_000);
gan("dong 1 VAT SKB", d1.vatSkb, 29_440_200);
gan("dong 1 sau thue SKB", d1.sauThueSkb, 323_842_200);
gan("dong 1 thanh tien DNC", d1.thanhTienDnc, 314_028_800);
gan("dong 1 VAT DNC", d1.vatDnc, 31_402_880);
gan("dong 1 sau thue DNC", d1.sauThueDnc, 345_431_680);
kiemTra("dong 1 so hoa don", d1.soHoaDon, "C26TKB#00000192");
kiemTra("dong 1 ngay giao", d1.ngayGiaoBia, "01.08-12.08");
kiemTra("dong 1 ngay hoa don", d1.ngayHoaDon, "15.08.2026");
kiemTra("dong 1 gop 2 nguon", d1.nguon.length, 2);
// Bóc thuế tiêu thụ đặc biệt: 294.402.000 / 1,65
gan("dong 1 doanh thu 511", d1.doanhThu511, 178_425_454.5, 1);
gan("dong 1 thue TTDB", d1.thueTtdb, 115_976_545.5, 1);

// Hàng lon của BNC phải nằm ngay sau hàng lít của BNC, cùng số hóa đơn.
kiemTra("dong 2 la hang lon cua BNC", [bang.dong[1].donVi, bang.dong[1].dvt], [
  "BNC",
  "LON",
]);
kiemTra("hang lon cung so hoa don", bang.dong[1].soHoaDon, "C26TKB#00000192");
gan("dong 2 thanh tien", bang.dong[1].thanhTienSkb, 89_040_000);
gan("dong 2 thanh tien DNC", bang.dong[1].thanhTienDnc, 98_312_880);

// BNG đứng sau BNC trong cùng đợt, số hóa đơn kế tiếp.
kiemTra("BNG so hoa don ke tiep", bang.dong[2].soHoaDon, "C26TKB#00000193");
kiemTra("BNG dung sau BNC", bang.dong[2].donVi, "BNG");

// Đơn vị chưa có mã BP nằm cuối đợt 1 và có số hóa đơn riêng.
kiemTra(
  "don vi thieu ma BP van co so hoa don",
  bang.dong[4].soHoaDon,
  "C26TKB#00000194",
);

// Đợt 2 tiếp số, không reset.
const dotHai = bang.dong.filter((r) => r.ngayGiaoBia === "13.08-16.08");
kiemTra("dot 2 co 1 dong", dotHai.length, 1);
kiemTra("dot 2 khong reset so", dotHai[0].soHoaDon, "C26TKB#00000195");
kiemTra("so hoa don tiep theo", bang.soHoaDonTiepTheo, 196);

// STT chạy liên tục qua các đợt.
kiemTra(
  "STT lien tuc",
  bang.dong.map((r) => r.stt),
  [1, 2, 3, 4, 5, 6],
);

// Cảnh báo.
const loai = bang.canhBao.map((c) => c.loai).sort();
kiemTra("du loai canh bao", loai, [
  "dang_di_duong",
  "ngoai_dot",
  "thieu_ma_bp",
  "thieu_ma_vat_tu",
]);
const ngoai = bang.canhBao.find((c) => c.loai === "ngoai_dot");
gan("canh bao ngoai dot so luong", ngoai?.soLuong ?? -1, 55);
const diDuong = bang.canhBao.find((c) => c.loai === "dang_di_duong");
gan("canh bao di duong so luong", diDuong?.soLuong ?? -1, 77);

// Hao hụt và nhập kho tuyệt đối không lọt vào bảng.
const tongSl = bang.dong.reduce((s, r) => s + r.soLuong, 0);
gan("tong so luong khong gom hao hut / nhap", tongSl, 9813.4 + 6360 + 120 + 30 + 40 + 100, 0.001);
gan("tong khop voi bang.tong", bang.tong.soLuong, tongSl, 0.001);

// Thống kê theo đợt.
kiemTra("thong ke 2 dot", bang.theoDot.length, 2);
kiemTra("dot 1 so hoa don", bang.theoDot[0].soHoaDon, 3);
kiemTra("dot 1 so don vi", bang.theoDot[0].soDonVi, 3);
kiemTra("dot 2 so dong", bang.theoDot[1].soDong, 1);

// Thống kê theo đơn vị: BNC gộp cả hai bộ phận, hai dòng lít + lon.
const bnc = bang.theoDonVi.find((u) => u.maBp === "AD0103");
kiemTra("BNC 2 dong", bnc?.soDong, 2);
gan("BNC tong so luong", bnc?.soLuong ?? -1, 9813.4 + 6360, 0.001);

// Mảng ô xuất ra Excel phải đúng 18 cột và đúng thứ tự.
const o = oCuaDong(d1);
kiemTra("o xuat 18 cot", o.length, 18);
kiemTra("o[3] la don vi", o[3], "BNC");
kiemTra("o[12] la so hoa don", o[12], "C26TKB#00000192");
kiemTra("o[17] la ma BP", o[17], "AD0103");

// Không khai đợt nào thì không dựng dòng nào, và phải báo hết ra ngoài đợt.
const trong = dungBangCongNo({
  transactions,
  products,
  partners,
  dot: [],
  tienToHoaDon: "C26TKB#",
  soHoaDonBatDau: 1,
});
kiemTra("khong co dot thi khong co dong", trong.dong.length, 0);
kiemTra(
  "khong co dot thi bao het ra ngoai",
  trong.canhBao.some((c) => c.loai === "ngoai_dot" && c.soDong === 8),
  true,
);

// Đợt chồng nhau: tính một lần vào đợt sớm hơn, và phải báo.
const chong = dungBangCongNo({
  transactions: [tx({ quantity: 10, date: "2026-08-05T00:00:00.000Z" })],
  products,
  partners,
  dot: [
    dot[0],
    {
      id: "d3",
      tuNgay: "2026-08-04",
      denNgay: "2026-08-06",
      ngayHoaDon: "2026-08-08",
    },
  ],
  tienToHoaDon: "C26TKB#",
  soHoaDonBatDau: 1,
});
kiemTra("dot chong nhau chi tinh 1 lan", chong.dong.length, 1);
gan("dot chong nhau khong nhan doi", chong.tong.soLuong, 10);
kiemTra(
  "dot chong nhau co bao",
  chong.canhBao.some((c) => c.loai === "dot_chong_nhau"),
  true,
);

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

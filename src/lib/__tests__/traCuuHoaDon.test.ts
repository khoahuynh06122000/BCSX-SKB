/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRA TRA CỨU HÓA ĐƠN ĐÃ XUẤT
 *
 * Số kỳ vọng lấy từ chính bảng giá trong `invoice.ts` và từ file thật
 * `file công nợ T08.2026.xlsx`: bia lít 30.000 chặng SKB, 32.000 chặng DNC;
 * bia lon 14.000 và 15.458. Ví dụ 9.813,4 lít × 30.000 = 294.402.000 là dòng
 * số 1 của file tháng 8.
 *
 * Điều quan trọng nhất phải giữ: tra cứu KHÔNG được nhận hóa đơn chưa điền số
 * thật, và phải dựng lại được đợt cũ mà không cần ai khai lại biên đợt.
 */

import type { Partner, Product, Transaction } from "../../types";
import type { HoaDonGhiNhan } from "../hoaDon";
import {
  dotTuHoaDon,
  hoaDonDaCoSo,
  tenTepTraCuu,
  traCuuHoaDon,
} from "../traCuuHoaDon";

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

function dung(ten: string, dieuKien: boolean) {
  if (dieuKien) pass++;
  else {
    fail++;
    console.log(`SAI  ${ten}`);
  }
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

const transactions: Transaction[] = [
  // Đợt 1 (01.08-12.08) — BNC gộp hai bộ phận thành 9.813,4 lít.
  tx({ quantity: 9000, partnerId: "AD0103-1901" }),
  tx({
    quantity: 813.4,
    partnerId: "AD0103-LHB",
    partnerName: "BNC · Lễ Hội Bia",
    date: "2026-08-11T08:00:00.000Z",
  }),
  // Đợt 1 — BNC hàng lon, dòng thứ hai của cùng hóa đơn.
  tx({
    quantity: 6360,
    productId: "p4",
    productName: "Bia Golden Bridge Helles Lager lon330ml",
    category: "Lon",
  }),
  // Đợt 1 — BNG, hóa đơn khác.
  tx({ quantity: 120, partnerId: "AC0118", partnerName: "BNG" }),
  // Đợt 2 (13.08-16.08) — FV.
  tx({
    quantity: 100,
    partnerId: "AC0107",
    partnerName: "FV",
    date: "2026-08-14T08:00:00.000Z",
  }),
  // Đang đi đường — chưa giao xong nên không được lên hóa đơn.
  tx({ quantity: 500, status: "in_transit" }),
];

const hoaDon: HoaDonGhiNhan[] = [
  {
    id: "hd-1",
    tuNgay: "2026-08-01",
    denNgay: "2026-08-12",
    maBp: "AD0103",
    donVi: "BNC",
    soHoaDon: "C26TKB#00000192",
    ngayHoaDon: "2026-08-15",
    updatedAt: "2026-08-15T10:00:00.000Z",
    updatedBy: "khoa",
  },
  {
    id: "hd-2",
    tuNgay: "2026-08-01",
    denNgay: "2026-08-12",
    maBp: "AC0118",
    donVi: "BNG",
    soHoaDon: "C26TKB#00000193",
    ngayHoaDon: "2026-08-15",
  },
  {
    id: "hd-3",
    tuNgay: "2026-08-13",
    denNgay: "2026-08-16",
    maBp: "AC0107",
    donVi: "FV",
    soHoaDon: "C26TKB#00000203",
    ngayHoaDon: "2026-08-19",
  },
  // Chưa điền số — KHÔNG được coi là đã xuất.
  {
    id: "hd-4",
    tuNgay: "2026-08-13",
    denNgay: "2026-08-16",
    maBp: "AD0103",
    donVi: "BNC",
    soHoaDon: "   ",
    ngayHoaDon: "2026-08-19",
  },
];

// ------------------------------------------------------ chỉ nhận số thật

kiemTra("bo hoa don chua dien so", hoaDonDaCoSo(hoaDon).length, 3);
kiemTra("bo hoa don rong", hoaDonDaCoSo([]).length, 0);

// ------------------------------------------------------ dựng lại biên đợt

const dot = dotTuHoaDon(hoaDon);
kiemTra("hai dot dung lai duoc", dot.length, 2);
kiemTra("dot som truoc", dot[0].tuNgay, "2026-08-01");
kiemTra("bien dot dung", [dot[1].tuNgay, dot[1].denNgay], [
  "2026-08-13",
  "2026-08-16",
]);
kiemTra("ngay hoa don cua dot", dot[0].ngayHoaDon, "2026-08-15");

// Ngày hóa đơn của đợt lấy ngày SỚM NHẤT, không phụ thuộc thứ tự tài liệu.
{
  const nguoc = dotTuHoaDon([
    { ...hoaDon[0], ngayHoaDon: "2026-08-18" },
    { ...hoaDon[1], ngayHoaDon: "2026-08-15" },
  ]);
  kiemTra("lay ngay som nhat trong dot", nguoc[0].ngayHoaDon, "2026-08-15");
}

// ---------------------------------------------------------- tra cứu cả kỳ

const kq = traCuuHoaDon({ hoaDon, transactions, products, partners });

kiemTra("so hoa don tra ra", kq.hoaDon.length, 3);
kiemTra("khong con thieu dong", kq.thieuDong.length, 0);
// 3 dòng của BNC/BNG đợt 1 (BNC lít + BNC lon + BNG lít) + 1 dòng FV đợt 2.
kiemTra("so dong chi tiet", kq.bang.dong.length, 4);

// Mới nhất trước: FV ngày 19.08 phải đứng đầu.
kiemTra("moi nhat truoc", kq.hoaDon[0].soHoaDon, "C26TKB#00000203");
kiemTra(
  "cung ngay thi theo so tang dan",
  [kq.hoaDon[1].soHoaDon, kq.hoaDon[2].soHoaDon],
  ["C26TKB#00000192", "C26TKB#00000193"],
);

{
  const bnc = kq.hoaDon.find((h) => h.soHoaDon === "C26TKB#00000192")!;
  kiemTra("BNC hai dong hang", bnc.dong.length, 2);
  kiemTra("BNC nhan dot", bnc.nhanDot, "01.08-12.08");
  kiemTra("BNC ma BP", bnc.maBp, "AD0103");
  gan("BNC so luong", bnc.soLuong, 9813.4 + 6360);
  // 9.813,4 × 30.000 = 294.402.000 (dòng 1 file thật) + 6.360 × 14.000
  gan("BNC thanh tien SKB", bnc.thanhTienSkb, 294402000 + 89040000);
  gan("BNC VAT SKB", bnc.vatSkb, (294402000 + 89040000) * 0.1);
  gan("BNC sau thue SKB", bnc.sauThueSkb, (294402000 + 89040000) * 1.1);
  // Chặng DNC: 9.813,4 × 32.000 + 6.360 × 15.458
  gan("BNC thanh tien DNC", bnc.thanhTienDnc, 314028800 + 98312880);
  kiemTra("BNC ghi boi", bnc.ghiBoi, "khoa");
  // Hàng lít phải đứng trước hàng lon, đúng thứ tự file gốc.
  kiemTra("khoi Lit truoc khoi Lon", bnc.dong[0].dvt, "LIT");
  kiemTra("moi dong mang dung so hoa don", bnc.dong[1].soHoaDon, bnc.soHoaDon);
}

{
  const fv = kq.hoaDon.find((h) => h.soHoaDon === "C26TKB#00000203")!;
  kiemTra("FV mot dong", fv.dong.length, 1);
  kiemTra("FV nhan dot", fv.nhanDot, "13.08-16.08");
  gan("FV thanh tien SKB", fv.thanhTienSkb, 100 * 30000);
  kiemTra("FV ngay hoa don ghi tren dong", fv.dong[0].ngayHoaDon, "19.08.2026");
}

// Hàng đi đường không được lên hóa đơn: nếu lọt vào thì BNC sẽ nhiều hơn.
gan("hang di duong khong len hoa don", kq.tong.soLuong, 9813.4 + 6360 + 120 + 100);

// STT đánh lại từ 1, liên tục, theo thứ tự đợt cũ trước.
kiemTra(
  "stt danh lai tu 1",
  kq.bang.dong.map((d) => d.stt),
  [1, 2, 3, 4],
);
kiemTra("dot cu dung truoc trong tep", kq.bang.dong[0].ngayGiaoBia, "01.08-12.08");
kiemTra("dot moi dung sau trong tep", kq.bang.dong[3].ngayGiaoBia, "13.08-16.08");

// Tổng của bảng phải bằng tổng các hóa đơn — nếu lệch thì tệp tải về sai.
gan(
  "tong bang khop tong hoa don",
  kq.bang.tong.thanhTienSkb,
  kq.hoaDon.reduce((s, h) => s + h.thanhTienSkb, 0),
);
gan("tong so hoa don", kq.tong.soHoaDon, 3);
gan("tong so dong", kq.tong.soDong, 4);

// Thuế TTĐB và doanh thu 511 bóc từ thành tiền chặng SKB, cộng lại phải đủ.
gan(
  "ttdb cong 511 bang thanh tien SKB",
  kq.tong.thueTtdb + kq.tong.doanhThu511,
  kq.tong.thanhTienSkb,
  2,
);

// -------------------------------------------------------------- bộ lọc

{
  const chiDot2 = traCuuHoaDon({
    hoaDon,
    transactions,
    products,
    partners,
    tuNgay: "2026-08-16",
  });
  kiemTra("loc tu ngay", chiDot2.hoaDon.length, 1);
  kiemTra("loc tu ngay dung to", chiDot2.hoaDon[0].soHoaDon, "C26TKB#00000203");
  gan("loc xong tong doi theo", chiDot2.tong.soLuong, 100);
  kiemTra("stt danh lai sau khi loc", chiDot2.bang.dong[0].stt, 1);
}

{
  const chiDot1 = traCuuHoaDon({
    hoaDon,
    transactions,
    products,
    partners,
    denNgay: "2026-08-15",
  });
  kiemTra("loc den ngay", chiDot1.hoaDon.length, 2);
}

{
  const theoSo = traCuuHoaDon({
    hoaDon,
    transactions,
    products,
    partners,
    tuKhoa: "00000193",
  });
  kiemTra("tim theo so hoa don", theoSo.hoaDon.length, 1);
  kiemTra("tim theo so ra dung to", theoSo.hoaDon[0].donVi, "BNG");
}

{
  const theoTen = traCuuHoaDon({
    hoaDon,
    transactions,
    products,
    partners,
    tuKhoa: "bnc",
  });
  kiemTra("tim theo ten don vi", theoTen.hoaDon.length, 1);
  kiemTra("tim theo ten ra dung to", theoTen.hoaDon[0].maBp, "AD0103");
}

{
  const theoBp = traCuuHoaDon({
    hoaDon,
    transactions,
    products,
    partners,
    tuKhoa: "AC0107",
  });
  kiemTra("tim theo ma BP", theoBp.hoaDon.length, 1);
}

{
  const khong = traCuuHoaDon({
    hoaDon,
    transactions,
    products,
    partners,
    tuKhoa: "khong-co-gi",
  });
  kiemTra("tim khong ra", khong.hoaDon.length, 0);
  kiemTra("tim khong ra thi bang rong", khong.bang.dong.length, 0);
  gan("tim khong ra thi tong bang 0", khong.tong.thanhTienSkb, 0);
}

// ------------------------------------------- hóa đơn mất dòng bên dưới

{
  // Giao dịch của FV bị xoá sau khi hóa đơn đã phát hành.
  const thieu = traCuuHoaDon({
    hoaDon,
    transactions: transactions.filter((t) => t.partnerId !== "AC0107"),
    products,
    partners,
  });
  kiemTra("bao hoa don mat dong", thieu.thieuDong.length, 1);
  kiemTra("bao dung to nao", thieu.thieuDong[0].soHoaDon, "C26TKB#00000203");
  kiemTra("khong tinh to mat dong vao bang", thieu.hoaDon.length, 2);
}

// Không có hóa đơn nào thì trả về bảng rỗng, không nổ.
{
  const rong = traCuuHoaDon({
    hoaDon: [],
    transactions,
    products,
    partners,
  });
  kiemTra("khong co hoa don", rong.hoaDon.length, 0);
  kiemTra("khong co hoa don thi bang rong", rong.bang.dong.length, 0);
  kiemTra("khong co hoa don thi khong bao thieu", rong.thieuDong.length, 0);
}

// Số app tự gợi ý không được lọt vào bảng tra cứu.
{
  const chuaDien: HoaDonGhiNhan[] = [{ ...hoaDon[3] }];
  const kq2 = traCuuHoaDon({
    hoaDon: chuaDien,
    transactions,
    products,
    partners,
  });
  kiemTra("hoa don chua dien so khong hien", kq2.hoaDon.length, 0);
  dung(
    "khong dong nao mang so tu danh",
    kq2.bang.dong.every((d) => !/^0{8}$/.test(d.soHoaDon)),
  );
}

// ---------------------------------------------------------------- tên tệp

kiemTra(
  "ten tep ca khoang",
  tenTepTraCuu("2026-08-01", "2026-08-31"),
  "Hoa don da xuat 01.08.2026-31.08.2026.xlsx",
);
kiemTra(
  "ten tep chi tu ngay",
  tenTepTraCuu("2026-08-01", ""),
  "Hoa don da xuat tu 01.08.2026.xlsx",
);
kiemTra(
  "ten tep chi den ngay",
  tenTepTraCuu("", "2026-08-31"),
  "Hoa don da xuat den 31.08.2026.xlsx",
);
kiemTra("ten tep khong loc", tenTepTraCuu("", ""), "Hoa don da xuat.xlsx");

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

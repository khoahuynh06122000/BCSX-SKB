import type { ImportSlip, KeHoachSanXuat, KiemKeKegLit, Partner, Product, Transaction } from "../../types";
import {
  chuanLitMoiKegCuaDoiTac,
  goiYLoFIFO,
  KEG_THU_VE_PREFIX,
  laDoiTacChuan206,
  MA_LO_MAC_DINH,
  quyDoiHienTrang,
  soKegLamTronLen,
  taoTokenChuKy,
  tinhTonTheoLo,
  tongHopGiaoKegVaHaoHutDVTV,
  tongHopKeHoachVaThucXuat,
  tongHopVoKegThuVe,
  truyXuatLo,
  banChotThangKiemKe,
  KIEM_KE_DOT_XUAT,
  kiemKeBonCuaThang,
  soBonChoDuyet,
  soKegCuaDong,
  soLuongTuKien,
} from "../loBia";

let pass = 0;
let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) === JSON.stringify(b)) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}: duoc ${JSON.stringify(a)}, mong ${JSON.stringify(b)}`);
  }
};

const products: Product[] = [
  { id: "p1", name: "Bia Golden Bridge Helles Lager", category: "Lít", unit: "Lít", price: 45000, capacityPerUnit: 1000 },
  { id: "p4", name: "Bia Golden Bridge lon 330ml", category: "Lon", unit: "Lon", price: 15833, capacityPerUnit: 330 },
];

console.log("\n1. Quy doi Keg / Thung (noi bo luon 20,6L/keg, lam tron len khi co keg le)");
eq("206L (chuan 20,6L) = 10 Keg", quyDoiHienTrang(products[0], 206), "10 Keg (20,6L)");
eq("195L (noi bo 20,6L) lam tron len = 10 Keg", quyDoiHienTrang(products[0], 195), "10 Keg (keg cuối 9,6L)");
eq("240 lon = 10 Thung", quyDoiHienTrang(products[1], 240), "10 Thùng");
eq("250 lon lam tron len = 11 Thung", quyDoiHienTrang(products[1], 250), "11 Thùng (thùng cuối 10 lon)");
eq("0 -> dau gach", quyDoiHienTrang(products[0], 0), "—");

console.log("\n2. Token chu ky dien tu on dinh");
const tok1 = taoTokenChuKy("PN-261116-01", "QUAN_LY_XUONG", "duc@sunworld.vn", "2026-11-16T08:00:00Z");
const tok2 = taoTokenChuKy("PN-261116-01", "QUAN_LY_XUONG", "duc@sunworld.vn", "2026-11-16T08:00:00Z");
const tok3 = taoTokenChuKy("PN-261116-01", "KHO_TONG", "bao@sunworld.vn", "2026-11-16T08:30:00Z");
eq("cung input -> cung token", tok1, tok2);
eq("dinh dang XXXX-XXXX", /^[0-9A-F]{4}-[0-9A-F]{4}$/.test(tok1), true);
eq("khac nguoi ky -> khac token", tok1 !== tok3, true);

console.log("\n3. Ton theo lo & FIFO");
const txs: Transaction[] = [
  { id: "1", date: "2026-11-01T08:00:00Z", type: "IN", productId: "p1", productName: "GB", category: "Lít", quantity: 200, partnerId: "SKB", partnerName: "SKB", createdBy: "a", batchNumber: "LO-01", slipCode: "PN-261101-01" },
  { id: "2", date: "2026-11-05T08:00:00Z", type: "IN", productId: "p1", productName: "GB", category: "Lít", quantity: 300, partnerId: "SKB", partnerName: "SKB", createdBy: "a", batchNumber: "LO-02", slipCode: "PN-261105-01" },
  { id: "3", date: "2026-11-06T08:00:00Z", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 150, partnerId: "AD0103-1901", partnerName: "BNC · 1901", createdBy: "b", batchNumber: "LO-01" },
  { id: "4", date: "2026-11-07T08:00:00Z", type: "LOSS", productId: "p1", productName: "GB", category: "Lít", quantity: 10, partnerId: "AD0103-1901", partnerName: "BNC · 1901", createdBy: "b", batchNumber: "LO-01" },
  { id: "5", date: "2026-11-08T08:00:00Z", type: "IN", productId: "p1", productName: "GB", category: "Lít", quantity: 50, partnerId: "SKB", partnerName: "SKB", createdBy: "a" },
];
const lots = tinhTonTheoLo(txs, products);
eq("LO-01 con 40", lots.find((l) => l.batchNumber === "LO-01")?.closing, 40);
eq("LO-02 con 300", lots.find((l) => l.batchNumber === "LO-02")?.closing, 300);
eq("dong khong lo van giu dung so", lots.find((l) => l.batchNumber === MA_LO_MAC_DINH)?.closing, 50);

const fifo = goiYLoFIFO(lots, "p1", 100);
eq("FIFO lay het 40 tu LO-01 roi 60 tu LO-02", fifo, [
  { batchNumber: "LO-01", quantity: 40 },
  { batchNumber: "LO-02", quantity: 60 },
]);

console.log("\n4. Truy xuat lo realtime");
const trace = truyXuatLo("LO-01", txs, products);
eq("truy xuat ra dung 1 lo", trace.length, 1);
eq("LO-01 da xuat 150 cho 1901", trace[0].destinations[0].partnerName, "BNC · 1901");
eq("LO-01 con lai 40", trace[0].remaining, 40);

console.log("\n5. Ke hoach vs Thuc xuat");
const plans: KeHoachSanXuat[] = [
  { id: "k1", date: "2026-11-16", productId: "p1", targetQty: 400, source: "QLX", createdBy: "duc", createdAt: "2026-11-16" },
];
const slips: ImportSlip[] = [
  { id: "PN-261116-01", code: "PN-261116-01", date: "2026-11-16", status: "signed" },
  { id: "PN-261116-02", code: "PN-261116-02", date: "2026-11-16", status: "cho_ql_xuong" },
  { id: "PN-261116-03", code: "PN-261116-03", date: "2026-11-16", status: "tra_lai" },
];
const todayTx: Transaction[] = [
  { id: "t1", date: "2026-11-16T08:00:00Z", type: "IN", productId: "p1", productName: "GB", category: "Lít", quantity: 200, partnerId: "SKB", partnerName: "SKB", createdBy: "a", slipCode: "PN-261116-01" },
  { id: "t2", date: "2026-11-16T09:00:00Z", type: "IN", productId: "p1", productName: "GB", category: "Lít", quantity: 100, partnerId: "SKB", partnerName: "SKB", createdBy: "a", slipCode: "PN-261116-02" },
  { id: "t3", date: "2026-11-16T10:00:00Z", type: "IN", productId: "p1", productName: "GB", category: "Lít", quantity: 80, partnerId: "SKB", partnerName: "SKB", createdBy: "a", slipCode: "PN-261116-03" },
  { id: "t4", date: "2026-11-16T11:00:00Z", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 120, partnerId: "AD0103-1901", partnerName: "BNC · 1901", createdBy: "b" },
];
const khSummary = tongHopKeHoachVaThucXuat(plans, todayTx, slips, products, new Set(["PN-261116-01"]), "2026-11-16");
eq("xuong da giao khong tinh phieu tra lai (200+100=300)", khSummary[0].sentFromBrewery, 300);
eq("kho da nhan 2 rao chi tinh PN-01 (200)", khSummary[0].receivedByWarehouse, 200);
eq("thuc xuat ban = 120", khSummary[0].soldOut, 120);
eq("chenh lech vs KH = -200", khSummary[0].varianceVsPlan, -200);

console.log("\n6. Chuan Keg 20,6L (BNC & FV) vs 20L DVTV (hao hut 0,6L/keg) & Vo Keg thu ve");
eq("BNC la chuan 20,6L", [laDoiTacChuan206("AD0103-1901", "BNC · 1901"), chuanLitMoiKegCuaDoiTac("AD0103-1901")], [true, 20.6]);
eq("FV la chuan 20,6L", [laDoiTacChuan206("AC0107", "FV"), chuanLitMoiKegCuaDoiTac("AC0107")], [true, 20.6]);
eq("BNG/OHL la DVTV 20L", [laDoiTacChuan206("AC0118", "BNG"), chuanLitMoiKegCuaDoiTac("AC0118")], [false, 20]);
eq("soKegLamTronLen 195L / 20L = 10 keg", soKegLamTronLen(195, 20), 10);
eq("soKegLamTronLen 41.2L / 20.6L = 2 keg", soKegLamTronLen(41.2, 20.6), 2);

const partnersDVTV: Partner[] = [
  { id: "AD0103-1901", sapCode: "AD0103", name: "BNC · 1901", type: "AGENT" },
  { id: "AC0107", sapCode: "AC0107", name: "FV", type: "AGENT" },
  { id: "AC0118", sapCode: "AC0118", name: "BNG", type: "AGENT" },
  { id: "AC0128", sapCode: "AC0128", name: "OHL", type: "AGENT" },
];
const dvtvTxs: Transaction[] = [
  { id: "d1", date: "2026-11-10T08:00:00Z", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 100, partnerId: "AC0118", partnerName: "BNG", createdBy: "b" }, // 5 keg * 0.6 = 3L
  { id: "d2", date: "2026-11-10T08:00:00Z", type: "LOSS", productId: "p1", productName: "GB", category: "Lít", quantity: 1.8, partnerId: "AC0118", partnerName: "BNG", createdBy: "b" }, // thieu 1.2L
  { id: "d3", date: "2026-11-11T08:00:00Z", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 40, partnerId: "AC0128", partnerName: "OHL", createdBy: "b" }, // 2 keg * 0.6 = 1.2L
  { id: "d4", date: "2026-11-11T08:00:00Z", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 41.2, partnerId: "AD0103-1901", partnerName: "BNC · 1901", createdBy: "b" }, // 2 keg 20.6L -> 0 hao hut chuan
  { id: "d5", date: "2026-11-11T08:00:00Z", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 20.6, partnerId: "AC0107", partnerName: "FV", createdBy: "b" }, // 1 keg 20.6L -> 0 hao hut chuan
  { id: "d6", date: "2026-11-11T08:00:00Z", type: "OUT", productId: "p4", productName: "Lon", category: "Lon", quantity: 48, partnerId: "AC0118", partnerName: "BNG", createdBy: "b" }, // Lon khong tinh vao keg
];
const kqDvtv = tongHopGiaoKegVaHaoHutDVTV({ transactions: dvtvTxs, products });
eq("DVTV tong keg = 7 (BNG 5 + OHL 2)", kqDvtv.totals.dvtvKegsDelivered, 7);
eq("DVTV lit khach nhan = 140L", kqDvtv.totals.dvtvLitersDelivered, 140);
eq("DVTV thuc xuat noi bo (20,6L/keg) = 144.2L", kqDvtv.totals.dvtvInternalLiters, 144.2);
eq("DVTV hao hut chuan = 4.2L", kqDvtv.totals.dvtvExpectedLoss06, 4.2);
eq("DVTV da ghi LOSS = 1.8L", kqDvtv.totals.dvtvActualLoss, 1.8);
eq("DVTV chua ghi bu = 2.4L", kqDvtv.totals.dvtvUnrecordedGap, 2.4);
eq("BNC + FV tong keg = 3", kqDvtv.totals.bncFvKegsDelivered, 3);
eq("All tong keg = 10", kqDvtv.totals.allKegsDelivered, 10);
eq("All thuc xuat noi bo = 206L", kqDvtv.totals.allInternalLiters, 206);

// Một đơn 100 L cho BNG bị tách 30 L + 70 L theo lô FIFO (cùng referenceGroupId):
// vẫn là 5 keg và 3,0 L hao chuẩn — không làm tròn từng dòng lô.
{
  const tach: Transaction[] = [
    { id: "s1", date: "2026-11-12T08:00:00", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 30, partnerId: "AC0118", partnerName: "BNG", createdBy: "b", referenceGroupId: "multi-1", batchNumber: "L1" },
    { id: "s2", date: "2026-11-12T08:00:00", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 70, partnerId: "AC0118", partnerName: "BNG", createdBy: "b", referenceGroupId: "multi-1", batchNumber: "L2" },
    // Chuyến khác cùng đơn vị: 10 L lẻ -> 1 keg riêng, không gộp với chuyến trên.
    { id: "s3", date: "2026-11-13T08:00:00", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 10, partnerId: "AC0118", partnerName: "BNG", createdBy: "b", referenceGroupId: "multi-2" },
  ];
  const kq = tongHopGiaoKegVaHaoHutDVTV({ transactions: tach, products });
  eq("tach lo FIFO: keg = 5 + 1", kq.totals.dvtvKegsDelivered, 6);
  eq("tach lo FIFO: hao chuan = 3.0L", kq.totals.dvtvExpectedLoss06, 3);
}

// Trả bia về nhà máy không tính là giao ĐVTV.
{
  const kq = tongHopGiaoKegVaHaoHutDVTV({
    transactions: [
      ...dvtvTxs,
      { id: "r1", date: "2026-11-12T08:00:00", type: "OUT", productId: "p1", productName: "GB", category: "Lít", quantity: 60, partnerId: "SKB-BNC", partnerName: "SKB-BNC", createdBy: "k" },
    ],
    products,
    partners: [...partnersDVTV, { id: "SKB-BNC", name: "SKB-BNC", type: "SUPPLIER" }],
  });
  eq("tra nha may: tong keg khong doi", kq.totals.allKegsDelivered, 10);
}

// Tồn bồn chốt theo tháng: chỉ bản ĐÃ KÝ DUYỆT, không cộng dồn, không mượn tháng trước.
{
  const duyet = (at: string) => ({ approvalStatus: "approved", approvedAt: at });
  const bon = (id: string, tankId: string, month: string, liters: number, extra: object = duyet(`${month}-16T08:00:00`)) =>
    ({ id, month, tankId, tankGroup: "FST", productId: "p1", batchNumber: "", liters, createdBy: "x", createdAt: `${month}-15T08:00:00`, ...extra }) as any;
  const ds = [
    bon("a", "FST-01", "2026-09", 1500),
    bon("b", "FST-01", "2026-10", 1500),
    bon("c", "FST-01", "2026-11", 1500),
    bon("d", "BBT-01", "2026-11", 800),
    bon("e", "BBT-01", "2026-11", 9999, { approvalStatus: "returned" }),
    bon("g", "BBT-02", "2026-11", 500, {}), // chờ duyệt
  ];
  const t11 = kiemKeBonCuaThang(ds, "2026-11");
  eq("T11: chi ban da duyet thang 11", t11.reduce((s: number, k: any) => s + k.liters, 0), 2300);
  eq("T11: FST-01 la ban thang 11", t11.find((k: any) => k.tankId === "FST-01")?.id, "c");
  eq("T11: ban cho duyet chua tinh", t11.some((k: any) => k.id === "g"), false);
  eq("T11: 1 ban cho duyet", soBonChoDuyet(ds, "2026-11"), 1);
  eq("T10: chi FST-01", kiemKeBonCuaThang(ds, "2026-10").map((k: any) => k.id).join(","), "b");
  eq("T12 chua chot -> rong", kiemKeBonCuaThang(ds, "2026-12").length, 0);
  const thay = kiemKeBonCuaThang(
    [...ds, bon("f", "FST-01", "2026-11", 1400, duyet("2026-11-28T08:00:00"))],
    "2026-11",
  );
  eq("duyet sau thay ban chot", thay.find((k: any) => k.tankId === "FST-01")?.liters, 1400);
}

// Kiểm kê Keg & Lít: bản đã ký duyệt là bản chốt tháng, mỗi nơi mỗi tháng một bản.
{
  const kk = (id: string, location: string, date: string, extra: object = {}) =>
    ({ id, date, location, shiftOrPeriod: "Chốt tháng", items: [], totalKegs: 0, totalLiters: 0, createdBy: "x", createdAt: date, ...extra }) as any;
  const ds = [
    kk("k1", "KHO_TONG", "2026-11-10", { approvalStatus: "approved", approvedAt: "2026-11-10T10:00:00" }),
    kk("k2", "KHO_TONG", "2026-11-30", { approvalStatus: "approved", approvedAt: "2026-11-30T10:00:00" }),
    kk("k3", "XUONG", "2026-11-30", { approvalStatus: "approved", approvedAt: "2026-11-30T09:00:00" }),
    kk("k4", "KHO_TONG", "2026-10-31", {}),
  ];
  const chot = banChotThangKiemKe(ds);
  eq("chot: kho tong T11 la k2 (duyet sau)", chot.has("k2") && !chot.has("k1"), true);
  eq("chot: xuong T11 rieng", chot.get("k3"), "2026-11");
  eq("chot: chua duyet khong chot", chot.has("k4"), false);
}

// Kiểm kê kho tổng theo KIỆN: keg × 20,6 L + lít lẻ; thùng × 24 + lon lẻ.
{
  eq("50 keg = 1030 L", soLuongTuKien("Lít", 50, 0), 1030);
  eq("10 keg + 5,4 L le", soLuongTuKien("Lít", 10, 5.4), 211.4);
  eq("40 thung = 960 lon", soLuongTuKien("Lon", 40, 0), 960);
  eq("2 thung + 7 lon", soLuongTuKien("Lon", 2, 7), 55);
  eq("so keg: 10 day + 1 le", soKegCuaDong("Lít", 10, 5.4), 11);
  eq("so keg: lon khong tinh", soKegCuaDong("Lon", 40, 0), 0);
}

// Bản ĐỘT XUẤT đã duyệt không được thành bản chốt tháng.
{
  const ds = [
    { id: "dx", date: "2026-11-20", location: "KHO_TONG", shiftOrPeriod: `${KIEM_KE_DOT_XUAT}Kế toán`, items: [], totalKegs: 0, totalLiters: 0, createdBy: "kt", createdAt: "x", approvalStatus: "approved", approvedAt: "2026-11-20T10:00:00" },
    { id: "ct", date: "2026-11-30", location: "KHO_TONG", shiftOrPeriod: "CHỐT THÁNG · cuối tháng", items: [], totalKegs: 0, totalLiters: 0, createdBy: "kho", createdAt: "x", approvalStatus: "approved", approvedAt: "2026-11-29T10:00:00" },
  ] as any;
  const chot = banChotThangKiemKe(ds);
  eq("dot xuat khong chot", chot.has("dx"), false);
  eq("chot thang van chot", chot.has("ct"), true);
}

const thuVeRecords: KiemKeKegLit[] = [
  {
    id: "tv1",
    date: "2026-11-12",
    shiftOrPeriod: `${KEG_THU_VE_PREFIX}2 don vi`,
    location: "KHO_TONG",
    items: [
      { productId: "AC0118", productName: "BNG", unit: "Keg", quantity: 3, liters: 0, bookQuantity: 5 },
      { productId: "AC0128", productName: "OHL", unit: "Keg", quantity: 1, liters: 0, bookQuantity: 2 },
    ],
    totalKegs: 4,
    totalLiters: 0,
    createdBy: "kho",
    createdAt: "2026-11-12T17:00:00Z",
  },
];
const kqVo = tongHopVoKegThuVe({
  transactions: dvtvTxs,
  products,
  partners: partnersDVTV,
  kiemKeKeg: thuVeRecords,
});
eq("Tong keg da giao = 10", kqVo.tongDaGiao, 10);
eq("Tong vo da thu ve = 4", kqVo.tongDaThuVe, 4);
eq("Con ngoai thi truong = 6", kqVo.dangConNgoaiThiTruong, 6);
eq("BNG con no vo = 2", kqVo.theoDonVi.find((r) => r.unitId === "AC0118")?.kegsOutstanding, 2);
eq("OHL con no vo = 1", kqVo.theoDonVi.find((r) => r.unitId === "AC0128")?.kegsOutstanding, 1);

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

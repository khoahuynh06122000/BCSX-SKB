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

console.log("\n1. Quy doi Keg / Thung (lam tron len khi co keg/thung le)");
eq("206L (chuan 20,6L) = 10 Keg", quyDoiHienTrang(products[0], 206), "10 Keg (20,6L)");
eq("200L (DVTV 20L) = 10 Keg", quyDoiHienTrang(products[0], 200, 20), "10 Keg (20L)");
eq("195L (chuan 20,6L) lam tron len = 10 Keg", quyDoiHienTrang(products[0], 195), "10 Keg (keg cuối 9,6L)");
eq("195L (DVTV 20L) lam tron len = 10 Keg", quyDoiHienTrang(products[0], 195, 20), "10 Keg (keg cuối 15L)");
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
eq("DVTV hao hut chuan = 4.2L", kqDvtv.totals.dvtvExpectedLoss06, 4.2);
eq("DVTV da ghi LOSS = 1.8L", kqDvtv.totals.dvtvActualLoss, 1.8);
eq("DVTV chua ghi bu = 2.4L", kqDvtv.totals.dvtvUnrecordedGap, 2.4);
eq("BNC + FV tong keg = 3", kqDvtv.totals.bncFvKegsDelivered, 3);
eq("All tong keg = 10", kqDvtv.totals.allKegsDelivered, 10);

const thuVeRecords: KiemKeKegLit[] = [
  {
    id: "tv1",
    date: "2026-11-12",
    shiftOrPeriod: `${KEG_THU_VE_PREFIX}BNG`,
    location: "KHO_TONG",
    items: [{ productId: "AC0118", productName: "BNG", unit: "Keg", quantity: 3, liters: 0, bookQuantity: 5 }],
    totalKegs: 3,
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
eq("Tong vo da thu ve = 3", kqVo.tongDaThuVe, 3);
eq("Con ngoai thi truong = 7", kqVo.dangConNgoaiThiTruong, 7);
eq("BNG con no vo = 2", kqVo.theoDonVi.find((r) => r.unitId === "AC0118")?.kegsOutstanding, 2);

console.log(`\n=========== ${pass} DUNG / ${fail} SAI ===========\n`);
process.exit(fail > 0 ? 1 : 0);

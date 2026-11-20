import type { ImportSlip, KiemKeKegLit, Partner, Product, Transaction } from "../../types";
import { canDoiKeg, kiemKeChotGanNhat, type DongSoKeg } from "../soKeg";
import { KEG_THU_VE_PREFIX, KIEM_KE_CHOT_THANG, KIEM_KE_DOT_XUAT } from "../loBia";

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
  { id: "p1", name: "Bia Hoi", category: "Lít", unit: "Lít", price: 1, capacityPerUnit: 1000 },
  { id: "p2", name: "Bia lon", category: "Lon", unit: "Lon", price: 1, capacityPerUnit: 330 },
];
const partners: Partner[] = [
  { id: "SKB-BNC", name: "SKB-BNC", type: "SUPPLIER" } as Partner,
  { id: "DV1", name: "Nha hang A", type: "RESTAURANT" } as Partner,
];
const so = (o: Partial<DongSoKeg> & Pick<DongSoKeg, "loai" | "soKeg">): DongSoKeg => ({
  id: Math.random().toString(),
  ngay: "2026-11-01",
  createdBy: "",
  createdAt: "",
  ...o,
});
const kk = (o: Partial<KiemKeKegLit>): KiemKeKegLit =>
  ({
    id: Math.random().toString(),
    date: "2026-11-30",
    shiftOrPeriod: KIEM_KE_CHOT_THANG + "Tai kho",
    location: "KHO_TONG",
    items: [],
    totalKegs: 0,
    totalLiters: 0,
    createdBy: "",
    createdAt: "",
    approvalStatus: "approved",
    ...o,
  }) as KiemKeKegLit;
const tx = (o: Partial<Transaction>): Transaction =>
  ({
    id: Math.random().toString(),
    date: "2026-11-10T08:00",
    type: "OUT",
    productId: "p1",
    productName: "Bia Hoi",
    category: "Lít",
    quantity: 0,
    partnerId: "DV1",
    partnerName: "Nha hang A",
    status: "completed",
    ...o,
  }) as Transaction;

const soKeg = [
  so({ loai: "TON_DAU_SO_HUU", soKeg: 500 }),
  so({ loai: "TON_DAU_DVTV", soKeg: 30, maDoiTac: "DV1", tenDoiTac: "Nha hang A" }),
  so({ loai: "MUA_THEM", soKeg: 20, ngay: "2026-11-15" }),
  so({ loai: "HONG_MAT", soKeg: 5, ngay: "2026-11-20" }),
  so({ loai: "MUA_THEM", soKeg: 99, ngay: "2026-12-05" }), // sau ngay can doi
];
const kiemKeKeg = [
  kk({ location: "KHO_TONG", totalKegs: 100 }),
  kk({ location: "KHO_TONG", totalKegs: 999, date: "2026-11-30", shiftOrPeriod: KIEM_KE_DOT_XUAT + "x" }),
  kk({ location: "KHO_TONG", totalKegs: 888, approvalStatus: "pending" }),
  kk({ location: "XUONG", totalKegs: 60, date: "2026-11-29", shiftOrPeriod: "Tai xuong" }),
  // vo thu ve: 12 keg cua DV1, 3 keg khong ro don vi
  kk({
    location: "KHO_TONG",
    shiftOrPeriod: KEG_THU_VE_PREFIX + "x",
    date: "2026-11-25",
    approvalStatus: undefined,
    items: [
      { productId: "DV1", productName: "Nha hang A", unit: "Keg", quantity: 12, liters: 0 },
      { productId: "TONG_KHO", productName: "chung", unit: "Keg", quantity: 3, liters: 0 },
    ],
  }),
];
const transactions = [
  // giao DV1: 206 L (20 L/keg ĐVTV) = 11 keg (làm tròn lên 10,3)
  tx({ quantity: 206, referenceGroupId: "g1" }),
  // đi đường 41,2 L -> 3 keg (20 L/keg)
  tx({ quantity: 41.2, referenceGroupId: "g2", status: "in_transit" }),
  // trả bia nhà máy: không tính ĐVTV
  tx({ quantity: 100, partnerId: "SKB-BNC", partnerName: "SKB-BNC", referenceGroupId: "g3" }),
  // sau ngày cân đối
  tx({ quantity: 400, referenceGroupId: "g4", date: "2026-12-02T08:00" }),
  // phiếu nhập chờ Rào 2: 61,8 L -> 3 keg; chờ Rào 1 thì không tính (còn ở xưởng)
  tx({ type: "IN", quantity: 61.8, slipCode: "PN-1", partnerId: "SKB-BNC" }),
  tx({ type: "IN", quantity: 20.6, slipCode: "PN-2", partnerId: "SKB-BNC" }),
];
const slips = [
  { id: "PN-1", code: "PN-1", date: "2026-11-28", status: "cho_kho_tong" },
  { id: "PN-2", code: "PN-2", date: "2026-11-28", status: "cho_ql_xuong" },
] as ImportSlip[];

const kq = canDoiKeg({ ngay: "2026-11-30", soKeg, transactions, products, partners, slips, kiemKeKeg });
eq("tong so huu = 500 + 20 - 5", kq.tongSoHuu, 515);
eq("kho tong lay ban chot da duyet, bo dot xuat / cho duyet", kq.khoTong, { soKeg: 100, ngayKiem: "2026-11-30" });
eq("xuong", kq.xuong?.soKeg, 60);
eq("dang chuyen nhap chi phieu cho Rao 2", kq.dangChuyenNhap, 3);
eq("di duong", kq.diDuong, 3);
eq("giao DVTV bo tra nha may va sau ngay", kq.daGiaoDVTV, 11);
eq("thu ve gom ca khong ro don vi", kq.daThuVe, 15);
eq("dang o DVTV = 30 + 11 - 15", kq.dangODVTV, 26);
eq("dong DVTV", kq.dvtv.map((d) => [d.unitId, d.tonDau, d.daGiao, d.daThuVe, d.dangGiu]), [["DV1", 30, 11, 12, 29]]);
eq("keg rong = 515 - 100 - 60 - 3 - 3 - 26", kq.kegRong, 323);
eq("khong canh bao khi du du lieu", kq.canhBao, []);

const kq2 = canDoiKeg({ ngay: "2026-11-30", soKeg: [], transactions, products, partners, slips, kiemKeKeg: [] });
eq("thieu du lieu thi canh bao", kq2.canhBao.length, 3);
eq(
  "kiem ke gan nhat truoc ngay",
  kiemKeChotGanNhat(kiemKeKeg, "KHO_TONG", "2026-11-29"),
  null,
);

console.log(`=========== ${pass} DUNG / ${fail} SAI ===========`);
if (fail) process.exit(1);

import XLSXr from "xlsx";
import type { KeHoachSanXuat, Product } from "../../types";
import { taoSheetDep, XLSXDep } from "../excelDep";
import {
  COT_MAU_KE_HOACH,
  docBangKeHoach,
  docNgayO,
  hangMauKeHoach,
  idKeHoach,
  lapViecGhiKeHoach,
} from "../keHoachSX";

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
  { id: "p1", name: "Bia Wings Dark Lager", materialCode: "010168107", category: "Lít", unit: "Lít", price: 1, capacityPerUnit: 1000 },
  { id: "p2", name: "Bia Wings Dark Lager 330ml", materialCode: "10168200", category: "Lon", unit: "Lon", price: 1, capacityPerUnit: 330 },
  { id: "p3", name: "Bia Đặc Biệt", category: "Lít", unit: "Lít", price: 1, capacityPerUnit: 1000 },
];
const kh = (o: Partial<KeHoachSanXuat> & { date: string; productId: string }): KeHoachSanXuat => ({
  id: idKeHoach(o.date, o.productId),
  targetQty: 100,
  batchHint: "",
  note: "",
  source: "",
  createdBy: "",
  createdAt: "",
  ...o,
});

// --- ngày
eq("ngay dd/MM/yyyy", docNgayO("20/11/2026"), "2026-11-20");
eq("ngay dd.MM.yy", docNgayO("5.1.27"), "2027-01-05");
eq("ngay ISO", docNgayO("2026-11-20"), "2026-11-20");
eq("ngay so seri Excel", docNgayO(46346), "2026-11-20");
eq("ngay rac", docNgayO("abc"), null);

// --- lập việc ghi
const daCo = [
  kh({ date: "2026-11-20", productId: "p1", targetQty: 200 }),
  kh({ id: "kh-2026-11-20-p2-1763600000000", date: "2026-11-20", productId: "p2", targetQty: 50 }),
  kh({ date: "2026-11-20", productId: "p3", targetQty: 30 }),
];
const v1 = lapViecGhiKeHoach(
  [
    { date: "2026-11-20", productId: "p1", targetQty: 200, batchHint: "", note: "" },
    { date: "2026-11-20", productId: "p2", targetQty: 60, batchHint: "L2", note: "" },
    { date: "2026-11-20", productId: "p3", targetQty: 0, batchHint: "", note: "" },
  ],
  daCo,
);
eq("dong y nguyen khong ghi lai", v1.giuNguyen, 1);
eq("ghi dong sua", v1.ghi.map((d) => d.productId), ["p2"]);
eq("xoa ban cu kieu Date.now + dong so luong 0", v1.xoa.sort(), ["kh-2026-11-20-p2-1763600000000", "kh-2026-11-20-p3"]);
const v2 = lapViecGhiKeHoach(
  [{ date: "2026-11-21", productId: "p1", targetQty: 10, batchHint: "", note: "" }],
  daCo,
);
eq("ngay khac khong dung ke hoach ngay 20", v2.xoa, []);
const v3 = lapViecGhiKeHoach(
  [
    { date: "2026-11-21", productId: "p1", targetQty: 10, batchHint: "", note: "" },
    { date: "2026-11-21", productId: "p1", targetQty: 15, batchHint: "", note: "" },
  ],
  [],
);
eq("dong lap trong file: dong sau thang", v3.ghi.map((d) => d.targetQty), [15]);

// --- vòng tròn: dựng mẫu → ghi .xlsx thật → đọc lại → parse
const hang = hangMauKeHoach(products, "2026-11-20", daCo);
hang[0][4] = 250; // p1 sửa sản lượng
hang[0][5] = "LO-2611";
hang[1][4] = ""; // p2 để trống → bỏ qua
hang[2][4] = "1.234,5"; // p3 số kiểu VN
const wb = XLSXDep.utils.book_new();
XLSXDep.utils.book_append_sheet(
  wb,
  taoSheetDep({
    tieuDeTren: ["KẾ HOẠCH SẢN XUẤT", "Ngày 20/11/2026"],
    tieuDe: [...COT_MAU_KE_HOACH],
    cot: COT_MAU_KE_HOACH.map(() => ({ rong: 14 })),
    hang,
  }),
  "KeHoach",
);
const buf = XLSXDep.write(wb, { type: "buffer", bookType: "xlsx" });
const doc = XLSXr.read(buf, { type: "buffer" });
const aoa = XLSXr.utils.sheet_to_json<unknown[]>(doc.Sheets["KeHoach"], { header: 1, raw: true });
const kq = docBangKeHoach(aoa, products, "2026-11-25");
eq("vong tron: khong loi", kq.loi, []);
eq("vong tron: bo dong trong", kq.boTrong, 1);
eq(
  "vong tron: doc dung dong",
  kq.dong.map((d) => [d.date, d.productId, d.targetQty, d.batchHint]),
  [
    ["2026-11-20", "p1", 250, "LO-2611"],
    ["2026-11-20", "p3", 1234.5, ""],
  ],
);
eq("ma SAP giu so 0 dau", String(aoa.find((r) => r[2] === "Bia Wings Dark Lager")?.[1]), "010168107");

// --- khớp khắt khe + lỗi
const kq2 = docBangKeHoach(
  [
    ["Tên bia", "Sản lượng KH", "Ngày"],
    ["Bia Wings Dark", 10, ""],
    ["bia dac biet", 5, ""],
    ["Bia Wings Dark Lager 330ml", 7, "31/02/2026x"],
  ],
  products,
  "2026-11-25",
);
eq("khong khop mo + chu d", kq2.dong.map((d) => [d.productId, d.date]), [["p3", "2026-11-25"]]);
eq("bao loi ten la va ngay sai", kq2.loi.length, 2);
eq("thieu tieu de", docBangKeHoach([["a", "b"]], products, "2026-11-25").loi.length, 1);

console.log(`=========== ${pass} DUNG / ${fail} SAI ===========`);
if (fail) process.exit(1);

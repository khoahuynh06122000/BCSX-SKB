/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHIẾU ĐÃ HỦY — kiểm cả hai vế: bỏ đúng cái phải bỏ, và KHÔNG bỏ cái khác.
 *
 * Vế thứ hai mới là vế đắt. Phép lọc này chạy trên đường tính tồn kho, nên một
 * điều kiện viết rộng quá sẽ âm thầm đánh rơi hàng thật, và không có gì báo
 * lỗi — người dùng chỉ biết khi tồn kho hụt không giải thích được.
 */

import {
  boGiaoDichPhieuDaHuy,
  laGiaoDichDaHuy,
  nguonCuaGiaoDich,
  nguonPhieuDaHuy,
} from "../phieuHuy";
import type { GhiSoPhieu } from "../soPhieu";

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
const dung = (ten: string, x: boolean) => eq(ten, x, true);

const phieu = (p: Partial<GhiSoPhieu>): GhiSoPhieu =>
  ({
    id: p.soPhieu || "x",
    soPhieu: p.soPhieu || "x",
    loai: p.loai || "NHAP",
    documentDate: "2026-09-11",
    enteredOn: "2026-09-11T03:05:00.000Z",
    nguon: p.nguon || "",
    soDong: 1,
    soLuong: 1,
    trangThai: p.trangThai || "hieu_luc",
    createdBy: "khoa",
    ...p,
  }) as GhiSoPhieu;

// ============================================ nguon cua mot giao dich

/*
 * PHAI KHOP DUNG CACH SO GHI `nguon` LUC CAP SO.
 *
 * Phieu nhap lay slipCode, phieu xuat lay referenceGroupId. Lech mot ben la
 * phep doi chieu khong bao gio khop, va huy phieu thanh ra chang bo duoc gi.
 */
eq(
  "nhap lay slipCode",
  nguonCuaGiaoDich({ type: "IN", slipCode: "PN-260911-01", id: "t1" }),
  "PN-260911-01",
);
eq(
  "xuat lay referenceGroupId",
  nguonCuaGiaoDich({ type: "OUT", referenceGroupId: "multi-abc", id: "t2" }),
  "multi-abc",
);
eq(
  "hao hut cung lay referenceGroupId",
  nguonCuaGiaoDich({ type: "LOSS", referenceGroupId: "multi-abc", id: "t3" }),
  "multi-abc",
);
eq(
  "xuat le khong co nhom thi lay id",
  nguonCuaGiaoDich({ type: "OUT", id: "t4" }),
  "t4",
);

/*
 * TON DAU KY KHONG CO CHUNG TU NAO.
 *
 * No la so du mang sang, khong co to phieu nao de ma huy. Tra ve id cua no la
 * mo duong cho mot so phieu trung id bat ngo xoa mat ton dau ky.
 */
eq("ton dau ky khong co nguon", nguonCuaGiaoDich({ type: "OPENING", id: "t5" }), "");

// Nhap chua co so phieu giay thi cung khong co nguon.
eq("nhap khong co slipCode", nguonCuaGiaoDich({ type: "IN", id: "t6" }), "");

// ============================================ doc danh sach da huy tu so

{
  const so = [
    phieu({ soPhieu: "PN-260911-01", nguon: "SLIP-11", trangThai: "da_huy" }),
    phieu({ soPhieu: "PN-260910-01", nguon: "SLIP-10" }),
    // To phieu huy mang trangThai "hieu_luc" va CUNG nguon voi phieu goc.
    // Doc theo trang thai la du, khong so dem hai lan.
    phieu({
      soPhieu: "PN-260911-01-HUY",
      loai: "HUY_NHAP",
      nguon: "SLIP-11",
      trangThai: "hieu_luc",
    }),
  ];
  const daHuy = nguonPhieuDaHuy(so);
  eq("chi mot chung tu bi huy", daHuy.size, 1);
  dung("dung chung tu da huy", daHuy.has("SLIP-11"));
  dung("phieu con hieu luc khong bi ke vao", !daHuy.has("SLIP-10"));
}

// Phieu da huy ma nguon rong thi bo qua — khong duoc them chuoi rong vao Set,
// neu khong moi giao dich khong co chung tu (ton dau ky) se bi coi la da huy.
{
  const daHuy = nguonPhieuDaHuy([
    phieu({ soPhieu: "PN-260911-02", nguon: "", trangThai: "da_huy" }),
  ]);
  eq("nguon rong khong vao danh sach", daHuy.size, 0);
}

eq("so rong", nguonPhieuDaHuy([]).size, 0);

// ============================================ loc giao dich

{
  const ds = [
    { id: "a1", type: "IN", slipCode: "SLIP-11" },
    { id: "a2", type: "IN", slipCode: "SLIP-11" },
    { id: "b1", type: "IN", slipCode: "SLIP-10" },
    { id: "c1", type: "OPENING" },
    { id: "d1", type: "OUT", referenceGroupId: "multi-xyz" },
  ];
  const daHuy = new Set(["SLIP-11"]);
  const con = boGiaoDichPhieuDaHuy(ds, daHuy);

  eq("bo het dong cua phieu da huy", con.length, 3);
  dung("khong con dong nao cua SLIP-11", !con.some((t) => t.id.startsWith("a")));

  /*
   * VE QUAN TRONG NHAT: KHONG DUOC BO NHAM.
   *
   * Ton dau ky va phieu khac phai con nguyen. Mot dieu kien viet rong qua se
   * am tham danh roi hang that.
   */
  dung("phieu khac con nguyen", con.some((t) => t.id === "b1"));
  dung("ton dau ky con nguyen", con.some((t) => t.id === "c1"));
  dung("xuat khong lien quan con nguyen", con.some((t) => t.id === "d1"));
}

// Huy mot phieu XUAT thi bo ca dong xuat lan dong hao hut cua chinh chuyen do.
{
  const ds = [
    { id: "x1", type: "OUT", referenceGroupId: "multi-abc" },
    { id: "x2", type: "LOSS", referenceGroupId: "multi-abc" },
    { id: "y1", type: "OUT", referenceGroupId: "multi-khac" },
  ];
  const con = boGiaoDichPhieuDaHuy(ds, new Set(["multi-abc"]));
  eq("chi con chuyen khac", con.length, 1);
  eq("dung chuyen con lai", con[0].id, "y1");
}

// Danh sach rong thi tra ve nguyen ban — khong duoc dung do loc lam mat gi.
{
  const ds = [{ id: "a1", type: "IN", slipCode: "SLIP-11" }];
  eq("khong co phieu huy nao", boGiaoDichPhieuDaHuy(ds, new Set()).length, 1);
}

// ============================================ hoi tung dong

{
  const daHuy = new Set(["SLIP-11"]);
  dung(
    "dong cua phieu da huy",
    laGiaoDichDaHuy({ type: "IN", slipCode: "SLIP-11" }, daHuy),
  );
  dung(
    "dong cua phieu khac",
    !laGiaoDichDaHuy({ type: "IN", slipCode: "SLIP-10" }, daHuy),
  );
  dung("ton dau ky", !laGiaoDichDaHuy({ type: "OPENING", id: "t" }, daHuy));
  dung(
    "khong co phieu huy nao thi khong dong nao bi ke",
    !laGiaoDichDaHuy({ type: "IN", slipCode: "SLIP-11" }, new Set()),
  );
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRA VIỆC ĐỔI SỐ PHIẾU NHẬP KIỂU CŨ
 *
 * Đây là việc GHI ĐÈ LÊN SỔ CHỨNG TỪ, nên phần phải giữ bằng mọi giá là:
 * không bản ghi nào bị mất, không số nào bị ghi đè, và cặp phiếu gốc ↔ phiếu
 * hủy không bao giờ trỏ vào một số không còn tồn tại.
 */

import { dungKeHoachDoiSo } from "../doiSoPhieuCu";
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

const g = (o: Partial<GhiSoPhieu>): GhiSoPhieu =>
  ({
    id: o.soPhieu,
    soPhieu: o.soPhieu,
    loai: "NHAP",
    documentDate: "2026-09-11",
    enteredOn: "2026-09-12T03:00:00.000Z",
    nguon: "PN-260911-01",
    donVi: "SKB-BNC",
    soDong: 3,
    soLuong: 500,
    trangThai: "hieu_luc",
    createdBy: "khoa",
    ...o,
  }) as GhiSoPhieu;

// ------------------------------------------------- doi so co ban

{
  const kh = dungKeHoachDoiSo([
    g({ soPhieu: "51260001", nguon: "PN-260911-01" }),
    g({ soPhieu: "51260002", nguon: "PN-260911-02" }),
  ]);
  eq("doi du hai phieu", kh.viec.length, 2);
  eq("khong bo qua cai nao", kh.boQua, []);
  eq("so moi lay tu chung tu goc", kh.viec.map((v) => v.soMoi), [
    "PN-260911-01",
    "PN-260911-02",
  ]);
  eq("ban ghi moi mang so moi", kh.viec[0].ghiMoi.soPhieu, "PN-260911-01");
  eq("khoa tai lieu doi theo", kh.viec[0].ghiMoi.id, "PN-260911-01");
  // Moi thu khac giu nguyen xi.
  eq("giu nguyen ngay chung tu", kh.viec[0].ghiMoi.documentDate, "2026-09-11");
  eq("giu nguyen so luong", kh.viec[0].ghiMoi.soLuong, 500);
  eq("giu nguyen nguoi ghi", kh.viec[0].ghiMoi.createdBy, "khoa");
}

// ------------------------------------------------- khong dung toi chieu xuat

{
  const kh = dungKeHoachDoiSo([
    g({ soPhieu: "60260001", loai: "XUAT", nguon: "multi-abc" }),
    g({ soPhieu: "61260001", loai: "HUY_XUAT", huyCho: "60260001" }),
  ]);
  eq("khong doi phieu xuat", kh.viec, []);
  eq("cung khong bao bo qua", kh.boQua, []);
}

// So kieu moi thi khong co gi de doi.
{
  const kh = dungKeHoachDoiSo([g({ soPhieu: "PN-260911-01" })]);
  eq("so kieu moi de nguyen", kh.viec, []);
}

// ------------------------------------------------- cap phieu goc va phieu huy

/*
 * HAI DAU CUA CAP HUY PHAI TRO SANG SO MOI CUA NHAU.
 *
 * Doi so goc ma bo quen ban ghi huy thi hai ban ghi tro vao hai so khong con
 * ton tai, va so mat luon dau vet ai huy phieu nao.
 */
{
  const kh = dungKeHoachDoiSo([
    g({
      soPhieu: "51260001",
      nguon: "PN-260911-01",
      trangThai: "da_huy",
      huyBoi: "52260001",
    }),
    g({
      soPhieu: "52260001",
      loai: "HUY_NHAP",
      nguon: "PN-260911-01",
      soLuong: -500,
      huyCho: "51260001",
    }),
  ]);
  eq("doi ca cap", kh.viec.length, 2);

  const goc = kh.viec.find((v) => v.soCu === "51260001")!;
  const huy = kh.viec.find((v) => v.soCu === "52260001")!;

  eq("so goc moi", goc.soMoi, "PN-260911-01");
  eq("so huy moi", huy.soMoi, "PN-260911-01-HUY");
  eq("goc tro sang so huy moi", goc.ghiMoi.huyBoi, "PN-260911-01-HUY");
  eq("huy tro sang so goc moi", huy.ghiMoi.huyCho, "PN-260911-01");
  eq("giu nguyen trang thai da huy", goc.ghiMoi.trangThai, "da_huy");
  eq("phieu huy van ghi am", huy.ghiMoi.soLuong, -500);

  // Phieu goc doi TRUOC phieu huy: chay do dang thi con de hieu.
  eq("goc doi truoc", kh.viec[0].soCu, "51260001");
}

// ------------------------------------------------- nhung truong hop bo qua

// Chung tu goc khong phai ma phieu thi khong doan bua.
{
  const kh = dungKeHoachDoiSo([g({ soPhieu: "51260001", nguon: "" })]);
  eq("khong doi khi thieu ma phieu", kh.viec, []);
  eq("bao ro ly do", kh.boQua.length, 1);
  dung("ly do nhac toi chung tu goc", kh.boQua[0].lyDo.includes("không phải mã phiếu nhập"));
}
{
  const kh = dungKeHoachDoiSo([g({ soPhieu: "51260001", nguon: "linh-tinh-123" })]);
  eq("nguon khong doc duoc thi bo qua", kh.viec, []);
  eq("van bao ly do", kh.boQua.length, 1);
}

/*
 * KHONG BAO GIO GHI DE. So moi da co ai dung thi de nguyen ban ghi cu va bao
 * ra — ghi de o day la mat han mot chung tu.
 */
{
  const kh = dungKeHoachDoiSo([
    g({ soPhieu: "PN-260911-01" }),
    g({ soPhieu: "51260001", nguon: "PN-260911-01" }),
  ]);
  eq("khong ghi de so da co", kh.viec, []);
  eq("bao va cham", kh.boQua.length, 1);
  dung("ly do nhac toi ghi de", kh.boQua[0].lyDo.includes("đã có trong sổ"));
}

// Hai ban ghi cu cung tro vao mot ma phieu: chi doi duoc mot.
{
  const kh = dungKeHoachDoiSo([
    g({ soPhieu: "51260001", nguon: "PN-260911-01" }),
    g({ soPhieu: "51260002", nguon: "PN-260911-01" }),
  ]);
  eq("chi doi mot", kh.viec.length, 1);
  eq("cai con lai bao va cham", kh.boQua.length, 1);
}

// Phieu huy ma khong tim ra phieu goc.
{
  const kh = dungKeHoachDoiSo([
    g({ soPhieu: "52260009", loai: "HUY_NHAP", huyCho: "51260009" }),
  ]);
  eq("khong doi phieu huy mo coi", kh.viec, []);
  eq("bao ly do", kh.boQua.length, 1);
  dung("ly do nhac phieu goc", kh.boQua[0].lyDo.includes("phiếu gốc"));
}

// --------------------------------- cap huy phai di cung nhau

/*
 * PHIEU HUY KHONG DUOC DOI MOT MINH KHI PHIEU GOC O LAI.
 *
 * Neu phieu huy doi thanh PN-260901-01-HUY ma phieu goc vuong va cham nen giu
 * so cu, thi so huy moi TRONG NHU dang huy PN-260901-01 — trong khi so do lai
 * la MOT TO PHIEU KHAC vua nhan. Con phieu goc thi ghi "da huy boi 52260001",
 * mot so khong con ton tai.
 *
 * So luc ay van du ban ghi, van cong ra dung so luong, chi co dieu no noi sai
 * ai huy phieu nao — va khong co gi bao loi.
 */
{
  const kh = dungKeHoachDoiSo([
    // Phieu nay chiem mat PN-260901-01 truoc.
    g({ soPhieu: "51260003", nguon: "PN-260901-01", soLuong: 2676 }),
    // Nen cap duoi day deu khong doi duoc.
    g({
      soPhieu: "51260001",
      nguon: "PN-260901-01",
      soLuong: 11000,
      trangThai: "da_huy",
      huyBoi: "52260001",
    }),
    g({
      soPhieu: "52260001",
      loai: "HUY_NHAP",
      nguon: "PN-260901-01",
      soLuong: -11000,
      huyCho: "51260001",
    }),
  ]);

  eq("chi doi phieu khong vuong", kh.viec.map((v) => v.soCu), ["51260003"]);
  dung(
    "phieu huy o lai cung phieu goc",
    !kh.viec.some((v) => v.soCu === "52260001"),
  );
  eq("bao ca hai cai o lai", kh.boQua.length, 2);
  dung(
    "ly do nhac cap huy",
    kh.boQua.some((b) => b.soPhieu === "52260001" && b.lyDo.includes("cặp hủy")),
  );
  dung(
    "ly do va cham chi ra phieu dang giu so",
    kh.boQua.some((b) => b.soPhieu === "51260001" && b.lyDo.includes("51260003")),
  );
}

// Nguoc lai: phieu goc doi duoc ma phieu huy vuong thi ca hai cung o lai.
{
  const kh = dungKeHoachDoiSo([
    // Chiem san so huy.
    g({ soPhieu: "PN-260901-01-HUY", loai: "HUY_NHAP", soLuong: -1 }),
    g({
      soPhieu: "51260001",
      nguon: "PN-260901-01",
      trangThai: "da_huy",
      huyBoi: "52260001",
    }),
    g({
      soPhieu: "52260001",
      loai: "HUY_NHAP",
      nguon: "PN-260901-01",
      huyCho: "51260001",
    }),
  ]);
  eq("ca cap cung o lai", kh.viec, []);
  eq("bao ca hai", kh.boQua.length, 2);
}

// ------------------------------------------------- khong mat ban ghi nao

/*
 * Tong so ban ghi truoc va sau phai bang nhau: moi so cu doi thanh dung MOT
 * so moi, va moi so moi la duy nhat.
 */
{
  const ds = [
    g({ soPhieu: "51260001", nguon: "PN-260911-01", trangThai: "da_huy", huyBoi: "52260001" }),
    g({ soPhieu: "52260001", loai: "HUY_NHAP", nguon: "PN-260911-01", huyCho: "51260001" }),
    g({ soPhieu: "51260002", nguon: "PN-260912-01" }),
    g({ soPhieu: "60260001", loai: "XUAT", nguon: "multi-abc" }),
  ];
  const kh = dungKeHoachDoiSo(ds);
  const soMoi = kh.viec.map((v) => v.soMoi);
  eq("moi so moi la duy nhat", new Set(soMoi).size, soMoi.length);

  const conLai = ds.filter((x) => !kh.viec.some((v) => v.soCu === x.soPhieu));
  eq("tong ban ghi khong doi", kh.viec.length + conLai.length, ds.length);
  eq("phan con lai dung la chieu xuat", conLai.map((x) => x.soPhieu), ["60260001"]);
}

// So rong thi khong lam gi.
{
  const kh = dungKeHoachDoiSo([]);
  eq("so rong", [kh.viec.length, kh.boQua.length], [0, 0]);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

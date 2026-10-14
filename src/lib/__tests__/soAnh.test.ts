/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỔ ẢNH.
 *
 * Phép kiểm đắt nhất là nhóm "XOÁ RỒI NẠP LẠI": đó đúng là con đường đã làm
 * anh Khoa mất ảnh lần gần nhất, và là lý do sổ ảnh tồn tại.
 */

import type { ImportSlip, Transaction } from "../../types";
import {
  anhTheoNhom,
  dongChuaVaoSo,
  dongMoCoiTuCloudinary,
  dongSoTuDuLieu,
  idSoAnh,
  nhomCuaGiaoDich,
  noiDangDungAnh,
  publicIdTuUrl,
} from "../soAnh";

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

const B = "https://res.cloudinary.com/zjtjeyqd/image/upload";
const A1 = `${B}/v1789640255/qzzyesrmtcoubozvyrt3.jpg`;
const A2 = `${B}/v1789640299/abc_def.jpg`;
const A3 = `${B}/v1/thu-muc/con/xyz.png`;

// ======================================================== ma anh tu duong dan

eq("duong dan that cua kho", publicIdTuUrl(A1), "qzzyesrmtcoubozvyrt3");
eq("ma anh co dau gach duoi", publicIdTuUrl(A2), "abc_def");
eq("ma anh co thu muc", publicIdTuUrl(A3), "thu-muc/con/xyz");
eq(
  "bo phep bien doi truoc khuc phien ban",
  publicIdTuUrl(`${B}/f_auto,q_auto,w_400,c_limit/v1789640255/qzzyesrmtcoubozvyrt3.jpg`),
  "qzzyesrmtcoubozvyrt3",
);
eq(
  "khong co phien ban van bo phep bien doi",
  publicIdTuUrl(`${B}/w_400/sample.jpg`),
  "sample",
);
eq(
  "khong co phien ban, ma anh co gach duoi van giu khuc cuoi",
  publicIdTuUrl(`${B}/w_400/my_photo.jpg`),
  "my_photo",
);
eq("bo duoi ?", publicIdTuUrl(`${A1}?thu=2`), "qzzyesrmtcoubozvyrt3");
eq("khong phai Cloudinary", publicIdTuUrl("https://abc.com/a.jpg"), "");
eq("anh nhung", publicIdTuUrl("data:image/jpeg;base64,xx"), "");
eq("rong", publicIdTuUrl(""), "");

eq("ma tai lieu khong co /", idSoAnh("thu-muc/con/xyz"), "thu-muc~con~xyz");
eq("ma khong thu muc giu nguyen", idSoAnh("abc"), "abc");

// ============================================================ khoa nhom

eq("xuat lay ma luot giao", nhomCuaGiaoDich({ id: "x-0", referenceGroupId: "multi-abc" }), "multi-abc");
eq("nhap lay ma phieu", nhomCuaGiaoDich({ id: "n-0", slipCode: "PN-261001-01" }), "PN-261001-01");
eq("khong co ca hai thi lay ma dong", nhomCuaGiaoDich({ id: "tkho-1" }), "tkho-1");

// ======================================================== dung so tu du lieu

const gd = (o: Partial<Transaction>): Transaction =>
  ({
    id: "t",
    date: "2026-10-03T08:00:00.000Z",
    type: "OUT",
    productId: "p",
    productName: "Bia Wings Dark Lager",
    category: "Lít",
    quantity: 1,
    partnerId: "AD0103-1901",
    partnerName: "BNC · 1901",
    createdBy: "x",
    ...o,
  }) as Transaction;

{
  // Chin dong cung luot giao, chung mot to bien ban: MOT dong so.
  const ds = Array.from({ length: 9 }, (_, i) =>
    gd({ id: `t${i}`, referenceGroupId: "multi-1", evidencePhotoUrls: [A1] }),
  );
  const so = dongSoTuDuLieu(ds, [], "khoa", "2026-10-14T00:00:00.000Z");
  eq("chin dong chung mot to thi mot dong so", so.length, 1);
  eq("dong so mang khoa nhom cua luot giao", so[0].nhom, "multi-1");
  eq("dong so mang chieu xuat", so[0].chieu, "XUAT");
  eq("dong so mang ngay giao", so[0].ngay, "2026-10-03");
  eq("dong so mang ma anh", so[0].publicId, "qzzyesrmtcoubozvyrt3");
}

{
  // Truong cu va truong moi deu duoc gom.
  const so = dongSoTuDuLieu(
    [gd({ id: "a", evidencePhotoUrl: A1, evidencePhotoUrls: [A2] })],
    [],
    "khoa",
    "x",
  );
  eq("gom ca truong cu lan truong moi", so.map((b) => b.publicId), [
    "qzzyesrmtcoubozvyrt3",
    "abc_def",
  ]);
}

{
  // Anh phieu ky: chieu nhap, khoa la ma phieu, doi tac lay tu dong dau.
  const phieu: ImportSlip = {
    id: "PN-261001-01",
    code: "PN-261001-01",
    date: "2026-10-01",
    status: "signed",
    signedPhotoUrls: [A3],
  };
  const so = dongSoTuDuLieu(
    [gd({ id: "n1", type: "IN", slipCode: "PN-261001-01", partnerName: "Xưởng" })],
    [phieu],
    "khoa",
    "x",
  );
  eq("anh phieu la chieu nhap", so[0].chieu, "NHAP");
  eq("anh phieu khoa theo ma phieu", so[0].nhom, "PN-261001-01");
  eq("anh phieu lay doi tac tu dong dau", so[0].partnerName, "Xưởng");
  eq("anh phieu nguon la phieu", so[0].nguon, "phieu");
}

{
  // Anh base64 cu khong co ma anh: bo qua, khong dung dong so rac.
  const so = dongSoTuDuLieu(
    [gd({ evidencePhotoUrl: "data:image/jpeg;base64,xx" })],
    [],
    "khoa",
    "x",
  );
  eq("anh base64 khong vao so", so.length, 0);
}

// ================================================ chi ghi dong chua co

{
  const tu = dongSoTuDuLieu(
    [gd({ id: "a", evidencePhotoUrls: [A1, A2] })],
    [],
    "khoa",
    "x",
  );
  const moi = dongChuaVaoSo(tu, [{ id: "qzzyesrmtcoubozvyrt3" }]);
  eq("chi ghi tam chua co trong so", moi.map((b) => b.id), ["abc_def"]);
  eq("so da du thi khong ghi gi", dongChuaVaoSo(tu, tu).length, 0);
}

// ===================== XOA ROI NAP LAI: anh phai gan lai dung don cu

{
  // Buoc 1: don nap tu tep co anh -> vao so.
  const truocXoa = [
    gd({ id: "tkho-a-0", referenceGroupId: "multi-h1", evidencePhotoUrls: [A1] }),
    gd({ id: "tkho-b-0", referenceGroupId: "multi-h2", evidencePhotoUrls: [A2] }),
  ];
  const so = dongSoTuDuLieu(truocXoa, [], "khoa", "x");

  // Buoc 2: xoa toan bo xuat kho -> giao dich mat het, so van con.
  const sauXoa: Transaction[] = [];
  eq("xoa giao dich khong lam so mat dong nao", dongChuaVaoSo(dongSoTuDuLieu(sauXoa, [], "k", "x"), so).length, 0);
  eq("so van du hai tam sau khi xoa", so.length, 2);

  // Buoc 3: nap lai dung tep -> cung khoa nhom (bam theo noi dung) -> gan lai.
  const m = anhTheoNhom(so);
  eq("nap lai: luot giao 1 lay lai dung anh", m.get("multi-h1"), [A1]);
  eq("nap lai: luot giao 2 lay lai dung anh", m.get("multi-h2"), [A2]);
  eq("luot giao khong co anh thi khong co gi", m.get("multi-khac"), undefined);
}

{
  // Anh tim lai tu Cloudinary chua ro chieu: KHONG duoc gan vao don nao.
  const so = dongMoCoiTuCloudinary(
    [{ publicId: "mo-coi", url: `${B}/v1/mo-coi.jpg`, taoLuc: "2026-09-20T10:00:00Z" }],
    [],
    "khoa",
    "x",
  );
  eq("anh mo coi khong gan vao nhom nao", anhTheoNhom(so).size, 0);
  eq("anh mo coi chua ro chieu", so[0].chieu, "");
  eq("anh mo coi lay ngay tai len", so[0].ngay, "2026-09-20");
}

// ============================================ tim anh mo coi tren Cloudinary

{
  const daCo = [{ id: "qzzyesrmtcoubozvyrt3" }];
  const moi = dongMoCoiTuCloudinary(
    [
      { publicId: "qzzyesrmtcoubozvyrt3", url: A1, taoLuc: "2026-09-01T00:00:00Z" },
      { publicId: "thu-muc/x", url: `${B}/v1/thu-muc/x.jpg`, taoLuc: "2026-09-02T00:00:00Z" },
      { publicId: "thu-muc/x", url: `${B}/v1/thu-muc/x.jpg`, taoLuc: "2026-09-02T00:00:00Z" },
      { publicId: "", url: "", taoLuc: "" },
    ],
    daCo,
    "khoa",
    "x",
  );
  eq("chi lay tep so chua biet, bo trung, bo rong", moi.map((b) => b.id), ["thu-muc~x"]);
}

// ================================================= noi dang dung mot tam anh

{
  const phieu: ImportSlip = { id: "P", code: "P", date: "2026-10-01", status: "signed", signedPhotoUrls: [A1] };
  const r = noiDangDungAnh(
    A1,
    [gd({ id: "a", evidencePhotoUrls: [A1] }), gd({ id: "b", evidencePhotoUrl: A1 }), gd({ id: "c", evidencePhotoUrls: [A2] })],
    [phieu],
  );
  eq("dem dung giao dich dang dung", r.giaoDich.map((t) => t.id), ["a", "b"]);
  eq("dem dung phieu dang dung", r.phieu.map((s) => s.code), ["P"]);
}

{
  // Chi nhan anh cua dung kho app; anh mau `demo` khong vao so.
  const so = dongSoTuDuLieu(
    [gd({ id: "a", evidencePhotoUrls: [A1, "https://res.cloudinary.com/demo/image/upload/sample.jpg"] })],
    [],
    "khoa",
    "x",
    "zjtjeyqd",
  );
  eq("chi lay anh cua kho app", so.map((b) => b.publicId), ["qzzyesrmtcoubozvyrt3"]);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

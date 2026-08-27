/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SOÁT ẢNH — kiểm phần đọc ra QUY LUẬT, vì đó mới là chỗ dễ nói sai.
 *
 * Đếm hỏng bao nhiêu tấm thì khó sai. Chỗ dễ sai là câu nhận định: nói "máy chủ
 * ảnh bị dọn một lần" khi thật ra hỏng rải rác sẽ dẫn người đọc đi kiểm tra sai
 * chỗ, mất cả buổi. Nên mốc thời gian chỉ được nhận khi dữ liệu thật sự sạch sẽ
 * theo thời gian.
 */

import {
  baoCaoSoatAnh,
  nhanDinhSoatAnh,
  tomTatSoatAnh,
  type KetQuaMotAnh,
} from "../soatAnh";

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

const U = (n: number) => `https://res.cloudinary.com/x/anh${n}.jpg`;
let dem = 0;
const a = (o: Partial<KetQuaMotAnh>): KetQuaMotAnh => ({
  id: `a${++dem}`,
  url: U(dem),
  date: "2026-08-20T08:00:00.000Z",
  donVi: "FV",
  duoc: true,
  ...o,
});

// ------------------------------------------------------------ dem

{
  const t = tomTatSoatAnh([
    a({ duoc: true }),
    a({ duoc: false }),
    a({ duoc: false }),
  ]);
  eq("tong", t.tong, 3);
  eq("so hong", t.hong, 2);
  eq("vi du duong dan hong lay toi ba cai", t.viDuHong.length, 2);
}

eq("bo rong", tomTatSoatAnh([]).tong, 0);
eq("bo rong khong co moc", tomTatSoatAnh([]).mocThoiGian, null);
eq("bo rong noi ro la khong co gi", nhanDinhSoatAnh(tomTatSoatAnh([])), "Không có tấm nào để soát.");

// ------------------------------------------------------------ gom nhom

{
  const t = tomTatSoatAnh([
    a({ donVi: "FV", duoc: false }),
    a({ donVi: "FV", duoc: false }),
    a({ donVi: "NVT", duoc: false }),
    a({ donVi: "ITC", duoc: true }),
  ]);
  // Don vi nhieu hong nhat len truoc, de nhin la thay ngay cho nao nang nhat.
  eq("don vi xep nhieu hong truoc", t.theoDonVi.map((o) => o.ten), ["FV", "NVT", "ITC"]);
  eq("dem dung theo don vi", t.theoDonVi.map((o) => `${o.hong}/${o.tong}`), ["2/2", "1/1", "0/1"]);
  // Cong cac nhom lai phai bang tong — phep chan bat duoc loi mot tam roi ra
  // ngoai moi nhom.
  eq("cong theo don vi bang tong", t.theoDonVi.reduce((n, o) => n + o.tong, 0), t.tong);
  eq("cong theo thang bang tong", t.theoThang.reduce((n, o) => n + o.tong, 0), t.tong);
  eq("cong theo kieu bang tong", t.theoKieu.reduce((n, o) => n + o.tong, 0), t.tong);
  eq("cong hong theo don vi bang so hong", t.theoDonVi.reduce((n, o) => n + o.hong, 0), t.hong);
}

{
  // Don vi rong phai co ten de hien, khong duoc de trong tren bang.
  const t = tomTatSoatAnh([a({ donVi: "", duoc: false })]);
  eq("don vi rong co ten thay the", t.theoDonVi[0].ten, "(không rõ)");
}

// Kieu duong dan: phan biet duoc anh nhung, duong dan tam va duong dan mang.
{
  const t = tomTatSoatAnh([
    a({ url: "data:image/png;base64,x", duoc: false }),
    a({ url: "blob:https://a/1", duoc: false }),
    a({ url: U(99), duoc: false }),
    a({ url: U(98), duoc: true }),
  ]);
  eq(
    "chia dung theo kieu duong dan",
    t.theoKieu.map((o) => `${o.ten}:${o.hong}/${o.tong}`).sort(),
    ["mang:1/2", "nhung:1/1", "tam:1/1"],
  );
}

// ------------------------------------------------------------ moc thoi gian

// Hong sach ba thang dau, con sach hai thang sau: dau hieu mot lan don.
{
  const ds: KetQuaMotAnh[] = [
    a({ date: "2026-05-10", duoc: false }),
    a({ date: "2026-06-11", duoc: false }),
    a({ date: "2026-07-12", duoc: false }),
    a({ date: "2026-08-13", duoc: true }),
    a({ date: "2026-08-14", duoc: true }),
  ];
  const t = tomTatSoatAnh(ds);
  eq("thang xep cu truoc", t.theoThang.map((o) => o.ten), [
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
  ]);
  eq("tim ra moc", t.mocThoiGian, { hongHetToi: "2026-07", conHetTu: "2026-08" });
  dung(
    "noi la mot lan don",
    nhanDinhSoatAnh(t).includes("MỘT LẦN DỌN"),
  );
}

// Hong rai rac thi KHONG duoc noi la moc thoi gian — day la loi de dan nguoi
// doc di kiem tra sai cho.
{
  const t = tomTatSoatAnh([
    a({ date: "2026-05-10", duoc: false }),
    a({ date: "2026-05-11", duoc: true }),
    a({ date: "2026-08-13", duoc: false }),
    a({ date: "2026-08-14", duoc: true }),
  ]);
  eq("hong rai rac thi khong co moc", t.mocThoiGian, null);
  dung("khong noi la mot lan don", !nhanDinhSoatAnh(t).includes("MỘT LẦN DỌN"));
  dung("noi la hong rai rac", nhanDinhSoatAnh(t).includes("rải rác"));
}

// Thang cu nhat cung hong nua vao thi khong con la moc sach.
{
  const t = tomTatSoatAnh([
    a({ date: "2026-05-10", duoc: false }),
    a({ date: "2026-06-11", duoc: false }),
    a({ date: "2026-07-12", duoc: true }),
    a({ date: "2026-07-13", duoc: false }),
  ]);
  eq("thang sau con lan lon thi khong nhan moc", t.mocThoiGian, null);
}

// Hong het ca bo thi khong co moc "con sach tu" nao.
{
  const t = tomTatSoatAnh([
    a({ date: "2026-05-10", duoc: false }),
    a({ date: "2026-06-11", duoc: false }),
  ]);
  eq("hong het thi khong co moc", t.mocThoiGian, null);
}

// Con het thi noi ro la con het, khong phai bay bang loi.
{
  const t = tomTatSoatAnh([a({ duoc: true }), a({ duoc: true })]);
  eq("con het", t.hong, 0);
  eq("khong co moc", t.mocThoiGian, null);
  eq("noi la ca hai deu tai duoc", nhanDinhSoatAnh(t), "Cả 2 tấm đều tải được.");
}

// Co tam loi ngay o duong dan thi phai noi la sua duoc bang code — khac han
// truong hop anh mat khoi may chu.
{
  const t = tomTatSoatAnh([
    a({ url: "blob:https://a/1", date: "2026-05-10", duoc: false }),
    a({ url: U(50), date: "2026-08-10", duoc: true }),
  ]);
  dung("noi la sua duoc bang code", nhanDinhSoatAnh(t).includes("sửa được bằng code"));
}

// ------------------------------------------------------------ bao cao chu

{
  const t = tomTatSoatAnh([
    a({ date: "2026-07-10", donVi: "FV", url: U(70), duoc: false }),
    a({ date: "2026-08-10", donVi: "NVT", url: U(80), duoc: true }),
  ]);
  const bc = baoCaoSoatAnh(t);
  dung("co tong so", bc.includes("Tong 2 tam, hong 1"));
  dung("co bang thang", bc.includes("2026-07"));
  dung("co bang don vi", bc.includes("FV"));
  dung("co vi du duong dan hong", bc.includes(U(70)));
  dung("co moc thoi gian", bc.includes("MOC THOI GIAN"));
  // Bao cao de dan vao tin nhan nen khong duoc co ky tu la, chi ASCII.
  dung("bao cao chi dung ASCII", /^[\x20-\x7e\n]*$/.test(bc));
  dung("bao cao nhieu dong", bc.split("\n").length > 8);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

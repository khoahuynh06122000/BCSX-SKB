/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SOÁT ẢNH.
 *
 * Việc duy nhất của phần này là PHÂN BIỆT ba chuyện mà trình duyệt gộp làm
 * một: ảnh đã mất, bị chặn tạm, và tài khoản từ chối. Phân biệt sai thì câu
 * nhận định nói ngược — bảo "ảnh còn nguyên, đợi rồi soát lại" trong khi ảnh
 * đã xoá thật, hoặc bắt người ta đi tìm biên bản giấy cho một tấm chỉ bị chặn
 * mấy giây.
 */

import {
  baoCaoSoatAnh,
  nhanDinhSoatAnh,
  nhomCuaMa,
  tenNhomLoi,
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

// ======================================================= xep ma vao nhom

eq("200 la tai duoc", nhomCuaMa(200), "duoc");
eq("204 cung tinh la duoc", nhomCuaMa(204), "duoc");
eq("404 la mat", nhomCuaMa(404), "mat");
eq("410 cung la mat", nhomCuaMa(410), "mat");
eq("429 la chan tam", nhomCuaMa(429), "chan-tam");
eq("403 la tai khoan tu choi", nhomCuaMa(403), "het-han-muc");
eq("420 cua Cloudinary cung la tu choi", nhomCuaMa(420), "het-han-muc");
eq("500 la may chu loi", nhomCuaMa(500), "may-chu-loi");
eq("503 cung la may chu loi", nhomCuaMa(503), "may-chu-loi");
eq("0 la khong hoi duoc", nhomCuaMa(0), "khong-hoi-duoc");
eq("400 la ma la", nhomCuaMa(400), "khac");
eq("so rac khong lam vo", nhomCuaMa(NaN), "khong-hoi-duoc");

// ==================================================== dem va tom tat

const anh = (o: Partial<KetQuaMotAnh> & { ma: number }): KetQuaMotAnh => ({
  id: o.id ?? `id-${Math.random()}`,
  url: o.url ?? "https://res.cloudinary.com/x/image/upload/v1/a.jpg",
  date: o.date ?? "2026-09-25T08:00:00.000Z",
  donVi: o.donVi ?? "BNC · 1901",
  ma: o.ma,
});

{
  const t = tomTatSoatAnh([
    anh({ ma: 200 }),
    anh({ ma: 200 }),
    anh({ ma: 404, url: "https://a/mat1.jpg" }),
    anh({ ma: 404, url: "https://a/mat2.jpg" }),
    anh({ ma: 429 }),
  ]);
  eq("dem dung tong", t.tong, 5);
  eq("dem dung so hong", t.hong, 3);
  eq("gom duoc duong dan cua anh da mat", t.dsMat, [
    "https://a/mat1.jpg",
    "https://a/mat2.jpg",
  ]);
  eq(
    "nhom dong nhat dung dau",
    t.theoNhom[0].ten,
    tenNhomLoi("mat"),
  );
  eq("nhan dinh chi dung chuyen phai tim lai bien ban", /ĐÃ BỊ XOÁ/.test(nhanDinhSoatAnh(t)), true);
}

// Chan tam la chuyen khac han: KHONG duoc bao di tim bien ban giay.
{
  const t = tomTatSoatAnh([
    anh({ ma: 200 }),
    anh({ ma: 429 }),
    anh({ ma: 429 }),
    anh({ ma: 404 }),
  ]);
  const n = nhanDinhSoatAnh(t);
  eq("nhan dinh noi la bi chan tam", /CHẶN TẠM/.test(n), true);
  eq("va KHONG bao di tim bien ban", /biên bản giấy/.test(n), false);
}

// Tai khoan tu choi: phai chi sang trang quan tri, khong phai sua app.
{
  const t = tomTatSoatAnh([anh({ ma: 403 }), anh({ ma: 403 }), anh({ ma: 200 })]);
  eq("chi sang Cloudinary", /Cloudinary/.test(nhanDinhSoatAnh(t)), true);
}

// Khong hong tam nao.
{
  const t = tomTatSoatAnh([anh({ ma: 200 }), anh({ ma: 200 })]);
  eq("khong hong thi noi thang", nhanDinhSoatAnh(t), "Cả 2 tấm đều tải được. Không mất tấm nào.");
  eq("khong co duong dan mat nao", t.dsMat, []);
}

eq("khong co gi de soat", nhanDinhSoatAnh(tomTatSoatAnh([])), "Không có tấm nào để soát.");

// ======================================================= gom theo thang

{
  const t = tomTatSoatAnh([
    anh({ ma: 404, date: "2026-08-02T00:00:00.000Z" }),
    anh({ ma: 404, date: "2026-08-20T00:00:00.000Z" }),
    anh({ ma: 200, date: "2026-09-01T00:00:00.000Z" }),
  ]);
  eq(
    "thang xep theo thoi gian, khong theo so hong",
    t.theoThang.map((d) => d.ten),
    ["2026-08", "2026-09"],
  );
  eq("thang 8 hong ca hai", t.theoThang[0], {
    ten: "2026-08",
    tong: 2,
    hong: 2,
  });
  eq("thang 9 khong hong", t.theoThang[1], {
    ten: "2026-09",
    tong: 1,
    hong: 0,
  });
}

// Don vi de trong thi van phai co mot dong, khong duoc bien mat.
{
  const t = tomTatSoatAnh([anh({ ma: 404, donVi: "" })]);
  eq("don vi trong van co dong rieng", t.theoDonVi[0].ten, "(không rõ)");
}

// ============================================================ ban bao cao

{
  const t = tomTatSoatAnh([anh({ ma: 404, url: "https://a/x.jpg" }), anh({ ma: 200 })]);
  const bc = baoCaoSoatAnh(t);
  eq("bao cao co bang theo nhom", bc.includes("## Theo nhóm nguyên nhân"), true);
  eq("bao cao co bang theo thang", bc.includes("## Theo tháng"), true);
  eq("bao cao co bang theo don vi", bc.includes("## Theo đơn vị"), true);
  eq("bao cao liet ke duong dan da mat", bc.includes("https://a/x.jpg"), true);
}

// Khong co tam nao mat thi KHONG bay muc duong dan rong.
{
  const bc = baoCaoSoatAnh(tomTatSoatAnh([anh({ ma: 429 })]));
  eq("khong co muc duong dan khi khong mat tam nao", bc.includes("đã mất (404)"), false);
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

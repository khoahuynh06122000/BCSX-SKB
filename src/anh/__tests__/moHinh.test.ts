/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HỆ THỐNG ẢNH CHỨNG TỪ — phép kiểm mô hình, luật máy chủ thuần, tên tệp,
 * soát, thư viện. Mỗi khối ứng với một chỗ hở đã gặp ở hệ cũ.
 */

import {
  chiMucTheoChungTu,
  chuyenTuDuLieuCu,
  idTuMaTep,
  khoCuaUrl,
  maChungTuCuaDong,
  maTepTuUrl,
  phieuDaCoAnhKy,
  viecAnhKhiXoa,
  type AnhChungTu,
} from "../moHinh";
import { HAN_VUA_TAI_MS, lyDoGiuTepVuaTai } from "../mayChu";
import { anhThuNho, chuanHoaUrlAnh, GOC_TRUNG_CHUYEN, quaTrungChuyen } from "../duongDan";
import { tenCaBo, tenGoc, taoZip } from "../taiVe";
import { nhanDinh, nhanDinhLuong, nhomCuaMa, tomTatSoat } from "../soat";
import { anhCuaHoaDon, boTepNhieuHoaDon, tenAnhTrongBo, tenGocHoaDon } from "../anhHoaDon";
import { chiMucTheoChungTu as chiMuc } from "../moHinh";
import { datLaiHangDoi, SUC_CHUA, traLuot, trangThaiHangDoi, xinLuot } from "../hangDoi";

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
const U1 = `${B}/v1789640255/qzzyesrmtcoubozvyrt3.jpg`;
const U2 = `${B}/v1789640299/abc_def.jpg`;
const U3 = `${B}/v1/thu-muc/con/xyz.png`;

const anh = (id: string, chungTu: string[], loai: "NHAP" | "XUAT" = "XUAT", extra: Partial<AnhChungTu> = {}): AnhChungTu => ({
  id,
  url: `${B}/v1/${id}.jpg`,
  publicId: id,
  chungTu,
  loai,
  ngay: "2026-11-01",
  maDoiTac: "",
  doiTac: "",
  taiLuc: "2026-11-01T00:00:00.000Z",
  taiBoi: "x",
  uid: "u",
  ...extra,
});

// ------------------------------------------------------------ mã tệp
eq("ma tep co phien ban", maTepTuUrl(U1), "qzzyesrmtcoubozvyrt3");
eq("ma tep co dau gach duoi", maTepTuUrl(U2), "abc_def");
eq("ma tep co thu muc", maTepTuUrl(U3), "thu-muc/con/xyz");
eq("ma tep qua bien doi", maTepTuUrl(`${B}/f_auto,q_auto,w_400,c_limit/v1/abc.jpg`), "abc");
eq("khong phai cloudinary", maTepTuUrl("https://example.com/a.jpg"), "");
eq("data uri", maTepTuUrl("data:image/png;base64,AAA"), "");
eq("id doi gach cheo", idTuMaTep("thu-muc/con/xyz"), "thu-muc~con~xyz");
eq("ten kho", khoCuaUrl(U1), "zjtjeyqd");

// ------------------------------------------------------------ mã chứng từ
eq("nhap co phieu -> ma phieu", maChungTuCuaDong({ id: "a", type: "IN", slipCode: "PN-261101-01", referenceGroupId: "multi-1" }), "PN-261101-01");
eq("xuat -> ma chuyen", maChungTuCuaDong({ id: "a", type: "OUT", referenceGroupId: "bbgn-x" }), "bbgn-x");
eq("hao hut cung chuyen", maChungTuCuaDong({ id: "a-hao-0", type: "LOSS", referenceGroupId: "bbgn-x" }), "bbgn-x");
eq("dong le khong nhom", maChungTuCuaDong({ id: "a", type: "OUT" }), "gd:a");
eq("xuat mang slipCode van theo chuyen", maChungTuCuaDong({ id: "a", type: "OUT", slipCode: "PN-1", referenceGroupId: "g" }), "g");

// ------------------------------------------------------------ chỉ mục + phiếu đã ký
{
  const ds = [anh("b", ["G1"], "XUAT", { taiLuc: "2026-11-02" }), anh("a", ["G1", "G2"], "XUAT", { taiLuc: "2026-11-01" }), anh("p", ["PN-1"], "NHAP")];
  const m = chiMucTheoChungTu(ds);
  eq("moi chung tu du anh, cu truoc", m.get("G1")!.map((x) => x.id), ["a", "b"]);
  eq("mot anh nhieu chung tu", m.get("G2")!.map((x) => x.id), ["a"]);
  eq("phieu da co anh ky", [...phieuDaCoAnhKy(ds)], ["PN-1"]);
}

// ------------------------------------------------------------ xoá chứng từ → ảnh đi theo
{
  const ds = [anh("a", ["G1"]), anh("b", ["G1", "G2"]), anh("c", ["G3"])];
  const v = viecAnhKhiXoa(ds, ["G1"], new Set(["G2", "G3"]));
  eq("anh chi cua G1 bi xoa", v.xoa.map((x) => x.id), ["a"]);
  eq("anh dung chung chi go G1", v.go.map((x) => [x.anh.id, x.conLai]), [["b", ["G2"]]]);
  // Xoá vài dòng của một chuyến mà chuyến còn dòng khác thì KHÔNG đụng ảnh.
  const v2 = viecAnhKhiXoa(ds, ["G1"], new Set(["G1", "G2", "G3"]));
  eq("chuyen con dong -> khong dung anh", [v2.xoa.length, v2.go.length], [0, 0]);
  // Không bao giờ đụng ảnh của chứng từ không nằm trong lượt xoá, kể cả mồ côi.
  const v3 = viecAnhKhiXoa([anh("m", ["mo-coi:x"])], ["G9"], new Set());
  eq("khong dung anh mo coi", v3.xoa.length, 0);
}

// ------------------------------------------------------------ chuyển dữ liệu cũ
{
  const kq = chuyenTuDuLieuCu({
    kho: "zjtjeyqd",
    luc: "2026-11-13T00:00:00.000Z",
    giaoDich: [
      // Chuyến G1: hai dòng, ảnh lệch nhau (đúng tình trạng 24 chuyến thật).
      { id: "t1", type: "OUT", referenceGroupId: "G1", date: "2026-10-05T08:00:00Z", partnerId: "FV", partnerName: "FV", evidencePhotoUrls: [U1] },
      { id: "t2", type: "OUT", referenceGroupId: "G1", date: "2026-10-05T08:00:00Z", partnerId: "FV", partnerName: "FV", evidencePhotoUrl: U2, evidencePhotoUrls: [U2] },
      { id: "t3", type: "LOSS", referenceGroupId: "G1", evidencePhotoUrls: [U1] },
      // Dòng nhập thuộc phiếu.
      { id: "n1", type: "IN", slipCode: "PN-1", date: "2026-10-01T07:00:00Z", partnerName: "SX" },
      // Ảnh của kho khác và ảnh nhúng: không chuyển, phải báo.
      { id: "t4", type: "OUT", referenceGroupId: "G4", evidencePhotoUrls: ["https://res.cloudinary.com/demo/image/upload/sample.jpg", "data:image/png;base64,AA"] },
    ],
    phieu: [{ code: "PN-1", signedPhotoUrls: [U3], signedAt: "2026-10-01T09:00:00Z", signedBy: "kho" }],
    soCu: [
      // Tấm đã rời đơn mà chuyến vẫn sống → gắn lại.
      { url: `${B}/v1/roi_don.jpg`, chieu: "XUAT", nhom: "G1", ngay: "2026-10-05" },
      // Chuyến không còn → mồ côi.
      { url: `${B}/v1/mat_chuyen.jpg`, chieu: "XUAT", nhom: "G-da-xoa" },
      // Tấm đã có → bỏ qua, không nhân đôi.
      { url: U1, chieu: "XUAT", nhom: "G1" },
    ],
  });
  const theo = new Map(kq.anh.map((a) => [a.id, a]));
  eq("so tam", kq.anh.length, 5);
  eq("U1 mot ban ghi cho ca chuyen (ke ca dong hao hut)", theo.get("qzzyesrmtcoubozvyrt3")?.chungTu, ["G1"]);
  eq("anh phieu gan vao ma phieu", [theo.get("thu-muc~con~xyz")?.chungTu, theo.get("thu-muc~con~xyz")?.loai], [["PN-1"], "NHAP"]);
  eq("anh phieu giu nguoi ky, luc ky", [theo.get("thu-muc~con~xyz")?.taiBoi, theo.get("thu-muc~con~xyz")?.taiLuc], ["kho", "2026-10-01T09:00:00Z"]);
  eq("gan lai anh roi don", theo.get("roi_don")?.chungTu, ["G1"]);
  eq("mo coi", theo.get("mat_chuyen")?.chungTu, ["mo-coi:G-da-xoa"]);
  eq("dem gan lai / mo coi", [kq.ganLai, kq.moCoi], [1, 1]);
  eq("bo qua kho khac va base64", kq.boQua.map((b) => b.lyDo), ["ảnh của kho khác (demo)", "không phải đường dẫn Cloudinary"]);
  // Sau chuyển, cả chuyến G1 thấy đủ ba tấm dù từng dòng chỉ mang một.
  eq("ca chuyen du anh", chiMucTheoChungTu(kq.anh).get("G1")!.map((a) => a.id).sort(), ["abc_def", "qzzyesrmtcoubozvyrt3", "roi_don"]);
}

// ------------------------------------------------------------ máy chủ: xoá tệp vừa tải
{
  const goc = { nguoiGoi: "u1", nguoiTai: "u1", taoLuc: "2026-11-13T00:00:00Z", bayGio: Date.parse("2026-11-13T01:00:00Z"), daCoBanGhi: false };
  eq("du ba dieu -> xoa", lyDoGiuTepVuaTai(goc), "");
  eq("nguoi khac tai -> giu", lyDoGiuTepVuaTai({ ...goc, nguoiTai: "u2" }), "tệp do người khác tải");
  eq("khong dau nguoi tai -> giu", lyDoGiuTepVuaTai({ ...goc, nguoiTai: "" }), "tệp không mang dấu người tải");
  eq("qua 24h -> giu", lyDoGiuTepVuaTai({ ...goc, bayGio: Date.parse(goc.taoLuc) + HAN_VUA_TAI_MS + 1 }), "tệp tải đã quá 24 giờ");
  eq("da gan chung tu -> giu", lyDoGiuTepVuaTai({ ...goc, daCoBanGhi: true }), "tệp đã gắn vào chứng từ");
}

// ------------------------------------------------------------ thu nhỏ
eq("thu nho chen bien doi", anhThuNho(U1, 400), `${B}/f_auto,q_auto,w_400,c_limit/v1789640255/qzzyesrmtcoubozvyrt3.jpg`);
eq("da bien doi thi de yen", anhThuNho(`${B}/w_64/v1/a.jpg`, 400), `${B}/w_64/v1/a.jpg`);
eq("khong phai cloudinary de yen", anhThuNho("blob:x", 400), "blob:x");
eq("chuan hoa http cloudinary len https", chuanHoaUrlAnh("  http://res.cloudinary.com/zjtjeyqd/image/upload/v1/a.jpg "), `${B}/v1/a.jpg`);
eq("thu nho nang http len https", anhThuNho("http://res.cloudinary.com/zjtjeyqd/image/upload/v1/a.jpg", 400), `${B}/f_auto,q_auto,w_400,c_limit/v1/a.jpg`);

// ------------------------------------------------------------ trung chuyển qua domain app
eq("trung chuyen anh goc", quaTrungChuyen(`${B}/v1/a.jpg`), "/api/anh/xem/v1/a.jpg");
eq("trung chuyen giu bien doi", quaTrungChuyen(anhThuNho(`${B}/v1/a.jpg`, 400)), "/api/anh/xem/f_auto,q_auto,w_400,c_limit/v1/a.jpg");
eq("trung chuyen nang http", quaTrungChuyen("http://res.cloudinary.com/zjtjeyqd/image/upload/v1/a.jpg"), "/api/anh/xem/v1/a.jpg");
eq("kho khac de yen", quaTrungChuyen("https://res.cloudinary.com/demo/image/upload/sample.jpg"), "https://res.cloudinary.com/demo/image/upload/sample.jpg");
eq("blob de yen", quaTrungChuyen("blob:x"), "blob:x");
eq("data de yen", quaTrungChuyen("data:image/png;base64,AA"), "data:image/png;base64,AA");
eq("rong de yen", quaTrungChuyen(""), "");
{
  // Luật rewrites trong vercel.json phải trỏ đúng kho và đúng gốc trung chuyển.
  const { readFileSync } = await import("node:fs");
  const vc = JSON.parse(readFileSync(new URL("../../../vercel.json", import.meta.url), "utf-8"));
  const r = vc.rewrites?.[0] ?? {};
  eq("vercel: luat trung chuyen dung dau", r.source, `${GOC_TRUNG_CHUYEN}:duong*`);
  eq("vercel: tro dung kho", r.destination, `${B}/:duong*`);
}

// ------------------------------------------------------------ kiểm luồng
eq("luong: ca hai thong", nhanDinhLuong({ trucTiep: 200, quaApp: 200 }).startsWith("Cả hai luồng đều thông"), true);
eq("luong: chan thang, app thong", nhanDinhLuong({ trucTiep: 0, quaApp: 200 }).includes("luồng qua app vẫn thông"), true);
eq("luong: app hong", nhanDinhLuong({ trucTiep: 200, quaApp: 502 }).includes("mã 502"), true);
eq("luong: ca hai chan", nhanDinhLuong({ trucTiep: 0, quaApp: 0 }).startsWith("Cả hai luồng đều không"), true);

// ------------------------------------------------------------ tên tệp tải về
eq("ten bnc", tenGoc({ date: "2026-10-16T08:00:00Z", donVi: "BNC · 1901" }), "16.10.26-1901-BNC");
eq("ten diem nhan", tenGoc({ date: "2026-10-16", donVi: "OHL", diemNhan: "Oakwood Hạ Long" }), "16.10.26-Oakwood-Ha-Long-OHL");
eq("ten phieu", tenGoc({ date: "2026-10-16", donVi: "SX", maPhieu: "PN-261016-01" }), "16.10.26-PN-261016-01-SX");
eq("trung ten them so", tenCaBo([
  { url: "a.jpg", date: "2026-10-16", donVi: "FV" },
  { url: "b.png", date: "2026-10-16", donVi: "FV" },
]), ["16.10.26-FV.jpg", "16.10.26-FV-2.png"]);
{
  const z = taoZip([{ ten: "a.txt", duLieu: new TextEncoder().encode("xin chao") }]);
  eq("zip co kich thuoc dung", z.size, 30 + 5 + 8 + 46 + 5 + 22);
}

// ------------------------------------------------------------ soát
eq("ma 404 la mat", nhomCuaMa(404), "mat");
eq("ma 420 la het han muc", nhomCuaMa(420), "het-han-muc");
eq("ma 0 khong hoi duoc", nhomCuaMa(0), "khong-hoi-duoc");
{
  const t = tomTatSoat([
    { url: "a", date: "2026-10-01", donVi: "FV", ma: 200, loi: "" },
    { url: "b", date: "2026-10-02", donVi: "FV", ma: 404, loi: "" },
  ]);
  eq("tom tat", [t.tong, t.hong], [2, 1]);
  eq("nhan dinh mat", nhanDinh(t).includes("ĐÃ BỊ XOÁ"), true);
}

// ------------------------------------------------------------ ảnh theo hóa đơn
{
  const gd = new Map(
    [
      { id: "o1", type: "OUT", quantity: 1, referenceGroupId: "G1" },
      { id: "o2", type: "OUT", quantity: 1, referenceGroupId: "G1" },
      { id: "o3", type: "OUT", quantity: 1, referenceGroupId: "G2" },
      { id: "o4", type: "OUT", quantity: 1 }, // dòng lẻ không nhóm
      { id: "t9", type: "OUT", quantity: 1, referenceGroupId: "G9" }, // chuyến khác (trả nhà máy) — không thuộc hóa đơn
    ].map((t) => [t.id, t]),
  );
  const ds = chiMuc([
    anh("a2", ["G1"], "XUAT", { ngay: "2026-11-03" }),
    anh("a1", ["G1", "G2"], "XUAT", { ngay: "2026-11-02" }), // một tấm hai chuyến: không lặp
    anh("a3", ["gd:o4"], "XUAT", { ngay: "2026-11-05" }),
    anh("a9", ["G9"]),
    anh("n1", ["G2"], "NHAP"), // ảnh nhập lỡ trùng mã: bỏ
  ]);
  const hd = [{ nguon: ["o1", "o2"] }, { nguon: ["o3", "o4", "khong-con"] }];
  eq("anh hoa don: theo giao dich, khong trung, theo ngay", anhCuaHoaDon(hd, gd, ds).map((a) => a.id), ["a1", "a2", "a3"]);
  eq("hoa don khong co anh", anhCuaHoaDon([{ nguon: ["o9"] }], gd, ds), []);
  eq("ten goc: # thanh -, bo dau, cat sau ·", tenGocHoaDon("C26TKB#00000295", "FV"), "C26TKB-00000295_FV");
  eq("ten goc don vi co diem nhan", tenGocHoaDon("C26TKB#1", "BNC · Lễ Hội"), "C26TKB-1_BNC");
  eq("mot tam khong danh so", tenAnhTrongBo("X_FV", [`${B}/v1/a.png`]), ["X_FV.png"]);
  eq("nhieu tam danh so", tenAnhTrongBo("X_FV", [`${B}/v1/a.jpg`, `${B}/v1/b.jpeg`]), ["X_FV_01.jpg", "X_FV_02.jpg"]);
  eq(
    "tai tat ca: moi to mot thu muc, bo to khong anh, trung ten them -2",
    boTepNhieuHoaDon([
      { soHoaDon: "H#1", donVi: "FV", anh: [{ url: `${B}/v1/a.jpg` }] },
      { soHoaDon: "H#2", donVi: "BNC", anh: [] },
      { soHoaDon: "H#1", donVi: "FV", anh: [{ url: `${B}/v1/b.jpg` }, { url: `${B}/v1/c.jpg` }] },
    ]).map((t) => t.ten),
    ["H-1_FV/H-1_FV.jpg", "H-1_FV-2/H-1_FV-2_01.jpg", "H-1_FV-2/H-1_FV-2_02.jpg"],
  );
}

// ------------------------------------------------------------ hàng đợi
{
  datLaiHangDoi();
  let duoc = 0;
  for (let i = 0; i < SUC_CHUA + 2; i++) void xinLuot().then(() => duoc++);
  await Promise.resolve();
  eq("chi chay toi da suc chua", trangThaiHangDoi(), { dangChay: SUC_CHUA, dangCho: 2 });
  traLuot();
  await Promise.resolve();
  eq("tra luot chuyen thang cho nguoi cho", trangThaiHangDoi(), { dangChay: SUC_CHUA, dangCho: 1 });
  eq("so da duoc chay", duoc, SUC_CHUA + 1);
  datLaiHangDoi();
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

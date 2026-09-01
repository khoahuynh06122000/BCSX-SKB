/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRA SỔ SỐ PHIẾU
 *
 * Ví dụ chuẩn do Khoa đưa: phiếu nhập đầu tiên là `51260001`, phiếu tiếp theo
 * `51260002`; phiếu xuất là `60` + năm; hủy `51260001` sinh ra `52260001`.
 *
 * Thứ phải giữ bằng mọi giá: một số phiếu đã cấp thì KHÔNG được đổi, và hai
 * phiếu khác nhau KHÔNG được trùng số.
 */

import {
  DAU_SO,
  canTroHuy,
  docSoPhieu,
  dungPhieuHuy,
  dungSoPhieu,
  laLoaiHuy,
  locSoPhieu,
  loaiHuyCua,
  namHaiSo,
  ngayGioVn,
  ngayVn,
  soPhieuHuy,
  thuTuKeTiep,
  tomTatSoPhieu,
  type GhiSoPhieu,
} from "../soPhieu";

let pass = 0;
let fail = 0;

function kiemTra(ten: string, thuc: unknown, mong: unknown) {
  const a = JSON.stringify(thuc);
  const b = JSON.stringify(mong);
  if (a === b) pass++;
  else {
    fail++;
    console.log(`SAI  ${ten}\n     thuc te: ${a}\n     mong doi: ${b}`);
  }
}

function dung(ten: string, dieuKien: boolean) {
  if (dieuKien) pass++;
  else {
    fail++;
    console.log(`SAI  ${ten}`);
  }
}

// ------------------------------------------------- ví dụ Khoa đưa

kiemTra("phieu nhap dau tien", dungSoPhieu(DAU_SO.NHAP, "26", 1), "51260001");
kiemTra("phieu nhap thu hai", dungSoPhieu(DAU_SO.NHAP, "26", 2), "51260002");
kiemTra("phieu xuat dau tien", dungSoPhieu(DAU_SO.XUAT, "26", 1), "60260001");
kiemTra("huy phieu nhap 1", soPhieuHuy("51260001"), "52260001");
kiemTra("huy phieu xuat 1", soPhieuHuy("60260001"), "61260001");

// Số hủy bám theo số gốc, không chạy dãy riêng.
kiemTra("huy bam theo so goc", soPhieuHuy("51260047"), "52260047");
kiemTra("huy phieu xuat giu thu tu", soPhieuHuy("60269999"), "61269999");

// Hủy một phiếu hủy là vô nghĩa.
kiemTra("khong huy duoc phieu huy", soPhieuHuy("52260001"), null);
kiemTra("khong huy duoc phieu huy xuat", soPhieuHuy("61260001"), null);

// ------------------------------------------------- ghép và tách số

kiemTra("dem du 4 chu so", dungSoPhieu(DAU_SO.NHAP, "26", 47), "51260047");
kiemTra("thu tu 0 van thanh 0001", dungSoPhieu(DAU_SO.NHAP, "26", 0), "51260001");
// Quá 9.999 thì DÀI RA, không quay vòng — số trùng là hỏng cả sổ.
kiemTra("qua 9999 thi dai ra", dungSoPhieu(DAU_SO.NHAP, "26", 10000), "512610000");
dung(
  "so dai van doc lai duoc",
  docSoPhieu("512610000")?.thuTu === 10000,
);

kiemTra("doc so phieu nhap", docSoPhieu("51260047"), {
  dauSo: "51",
  loai: "NHAP",
  namHai: "26",
  thuTu: 47,
});
kiemTra("doc so phieu huy xuat", docSoPhieu("61270003"), {
  dauSo: "61",
  loai: "HUY_XUAT",
  namHai: "27",
  thuTu: 3,
});
kiemTra("dau so la thi khong doc", docSoPhieu("99260001"), null);
kiemTra("ngan qua thi khong doc", docSoPhieu("5126001"), null);
kiemTra("co chu thi khong doc", docSoPhieu("5126000A"), null);
kiemTra("rong thi khong doc", docSoPhieu(""), null);
kiemTra("thu tu 0000 khong hop le", docSoPhieu("51260000"), null);

kiemTra("laLoaiHuy nhap", laLoaiHuy("NHAP"), false);
kiemTra("laLoaiHuy huy nhap", laLoaiHuy("HUY_NHAP"), true);
kiemTra("loai huy cua nhap", loaiHuyCua("NHAP"), "HUY_NHAP");
kiemTra("loai huy cua xuat", loaiHuyCua("XUAT"), "HUY_XUAT");
kiemTra("khong co loai huy cua phieu huy", loaiHuyCua("HUY_NHAP"), null);

// ------------------------------------------------- năm lấy theo ngày chứng từ

kiemTra("nam hai so", namHaiSo("2026-08-31"), "26");
kiemTra("nam hai so sang nam", namHaiSo("2027-01-02"), "27");
kiemTra("ngay hong thi rong", namHaiSo("31/08/2026"), "");
kiemTra("ngay rong thi rong", namHaiSo(""), "");

// ------------------------------------------------- dữ liệu mẫu

function g(o: Partial<GhiSoPhieu>): GhiSoPhieu {
  return {
    id: o.soPhieu || "51260001",
    soPhieu: "51260001",
    loai: "NHAP",
    documentDate: "2026-08-18",
    enteredOn: "2026-08-20T03:00:00.000Z",
    nguon: "PN-260818-01",
    donVi: "SKB",
    soDong: 3,
    soLuong: 500,
    trangThai: "hieu_luc",
    createdBy: "khoa",
    ...o,
  } as GhiSoPhieu;
}

const so: GhiSoPhieu[] = [
  g({ soPhieu: "51260001", id: "51260001" }),
  g({
    soPhieu: "51260002",
    id: "51260002",
    documentDate: "2026-08-19",
    soLuong: 300,
  }),
  g({
    soPhieu: "60260001",
    id: "60260001",
    loai: "XUAT",
    documentDate: "2026-08-21",
    nguon: "multi-abc",
    donVi: "BNC",
    soLuong: 1200,
  }),
  g({
    soPhieu: "60260002",
    id: "60260002",
    loai: "XUAT",
    documentDate: "2026-08-22",
    nguon: "multi-def",
    donVi: "FV",
    soLuong: 400,
    trangThai: "da_huy",
    huyBoi: "61260002",
  }),
  g({
    soPhieu: "61260002",
    id: "61260002",
    loai: "HUY_XUAT",
    documentDate: "2026-08-23",
    nguon: "multi-def",
    donVi: "FV",
    soLuong: -400,
    huyCho: "60260002",
  }),
];

// ------------------------------------------------- thứ tự kế tiếp

kiemTra("thu tu ke tiep nhap", thuTuKeTiep(so, DAU_SO.NHAP, "26"), 3);
kiemTra("thu tu ke tiep xuat", thuTuKeTiep(so, DAU_SO.XUAT, "26"), 3);
// Năm mới thì đếm lại từ 1.
kiemTra("nam moi dem lai tu 1", thuTuKeTiep(so, DAU_SO.NHAP, "27"), 1);
kiemTra("so rong thi bat dau tu 1", thuTuKeTiep([], DAU_SO.NHAP, "26"), 1);
// Dãy hủy đếm riêng, không lẫn vào dãy gốc.
kiemTra("day huy dem rieng", thuTuKeTiep(so, DAU_SO.HUY_XUAT, "26"), 3);

// ------------------------------------------------- chặn hủy sai

kiemTra("huy duoc phieu con hieu luc", canTroHuy(so[0]), "");
dung("khong huy phieu da huy", canTroHuy(so[3]) !== "");
dung("bao ro phieu nao da huy", canTroHuy(so[3]).includes("61260002"));
dung("khong huy mot phieu huy", canTroHuy(so[4]) !== "");
dung("khong tim thay thi bao", canTroHuy(undefined) !== "");

// ------------------------------------------------- dựng phiếu hủy

{
  const h = dungPhieuHuy(so[0], {
    documentDate: "2026-08-25",
    enteredOn: "2026-08-25T04:00:00.000Z",
    createdBy: "khoa",
    lyDo: "Ghi nham so luong",
  })!;
  kiemTra("so phieu huy", h.soPhieu, "52260001");
  kiemTra("khoa tai lieu = so phieu", h.id, h.soPhieu);
  kiemTra("loai phieu huy", h.loai, "HUY_NHAP");
  // Ghi ÂM số lượng phiếu gốc — cộng hai phiếu lại bằng 0.
  kiemTra("ghi am so luong", h.soLuong, -500);
  kiemTra("cong lai bang 0", h.soLuong + so[0].soLuong, 0);
  kiemTra("tro ve phieu goc", h.huyCho, "51260001");
  kiemTra("giu nguyen nguon chung tu", h.nguon, so[0].nguon);
  kiemTra("giu nguyen don vi", h.donVi, "SKB");
  kiemTra("phieu huy con hieu luc", h.trangThai, "hieu_luc");
  kiemTra("ghi ly do", h.lyDoHuy, "Ghi nham so luong");
}

// Phiếu hủy của phiếu đã âm sẵn vẫn ra số âm, không thành dương.
{
  const amSan = g({ soPhieu: "51260009", id: "51260009", soLuong: -50 });
  const h = dungPhieuHuy(amSan, {
    documentDate: "2026-08-25",
    enteredOn: "2026-08-25T04:00:00.000Z",
    createdBy: "khoa",
  })!;
  kiemTra("khong doi dau thanh duong", h.soLuong, -50);
}

kiemTra(
  "khong dung duoc phieu huy cho phieu huy",
  dungPhieuHuy(so[4], {
    documentDate: "2026-08-25",
    enteredOn: "2026-08-25T04:00:00.000Z",
    createdBy: "khoa",
  }),
  null,
);

// ------------------------------------------------- lọc và xếp

{
  const tatCa = locSoPhieu(so);
  kiemTra("loc khong dieu kien giu het", tatCa.length, 5);
  // Xếp theo SỐ giảm dần trong từng năm: 61.. rồi 60.. rồi 51..
  kiemTra("so lon nhat dung dau", tatCa[0].soPhieu, "61260002");
  kiemTra("so nho nhat dung cuoi", tatCa[4].soPhieu, "51260001");
}

kiemTra(
  "loc theo loai",
  locSoPhieu(so, { loai: "XUAT" }).map((x) => x.soPhieu),
  ["60260002", "60260001"],
);
kiemTra("loc chi con hieu luc", locSoPhieu(so, { chiConHieuLuc: true }).length, 4);
kiemTra(
  "loc tu ngay",
  locSoPhieu(so, { tuNgay: "2026-08-22" }).map((x) => x.soPhieu),
  ["61260002", "60260002"],
);
kiemTra("loc den ngay", locSoPhieu(so, { denNgay: "2026-08-19" }).length, 2);
kiemTra(
  "tim theo so phieu",
  locSoPhieu(so, { tuKhoa: "60260001" }).map((x) => x.soPhieu),
  ["60260001"],
);
kiemTra("tim theo don vi", locSoPhieu(so, { tuKhoa: "bnc" }).length, 1);
kiemTra("tim theo nguon chung tu", locSoPhieu(so, { tuKhoa: "PN-260818" }).length, 2);
kiemTra("tim khong ra", locSoPhieu(so, { tuKhoa: "khong-co" }).length, 0);
kiemTra("loc danh sach rong", locSoPhieu([]).length, 0);

// ------------------------------------------------- thống kê

{
  const t = tomTatSoPhieu(so);
  kiemTra("tong phieu", t.tongPhieu, 5);
  kiemTra("so phieu nhap", t.soNhap, 2);
  kiemTra("so phieu xuat", t.soXuat, 2);
  kiemTra("so phieu huy", t.soHuy, 1);
  kiemTra("so phieu da bi huy", t.daHuy, 1);
  // 500 + 300 + 1200 + 400 − 400
  kiemTra("tong so luong", t.soLuong, 2000);
  kiemTra("khong dut quang", t.thieuSo, []);
}

// Đứt quãng: cấp tới 51260003 mà thiếu 51260002.
{
  const dut = tomTatSoPhieu([
    g({ soPhieu: "51260001", id: "51260001" }),
    g({ soPhieu: "51260003", id: "51260003" }),
  ]);
  kiemTra("bao dut quang", dut.thieuSo, ["51260002"]);
}

// Dãy hủy vốn thưa — không được báo đứt quãng ở đó.
{
  const thua = tomTatSoPhieu([
    g({ soPhieu: "51260001", id: "51260001" }),
    g({ soPhieu: "51260002", id: "51260002" }),
    g({
      soPhieu: "52260002",
      id: "52260002",
      loai: "HUY_NHAP",
      soLuong: -300,
    }),
  ]);
  kiemTra("khong bao dut quang o day huy", thua.thieuSo, []);
}

// Số ngày từ biên bản tới lúc vào sổ.
{
  const t = tomTatSoPhieu([
    g({
      soPhieu: "51260001",
      id: "51260001",
      documentDate: "2026-08-18",
      enteredOn: "2026-08-20T03:00:00.000Z",
    }),
    g({
      soPhieu: "51260002",
      id: "51260002",
      documentDate: "2026-08-18",
      enteredOn: "2026-08-22T03:00:00.000Z",
    }),
  ]);
  kiemTra("ngay trung binh vao so", t.ngayTrungBinhVaoSo, 3);
}

kiemTra("thong ke danh sach rong", tomTatSoPhieu([]).tongPhieu, 0);

// ------------------------------------------------- hiển thị ngày

kiemTra("ngay VN", ngayVn("2026-08-31"), "31.08.2026");
kiemTra("ngay VN hong", ngayVn("hom nay"), "");
dung("ngay gio VN co dinh dang", /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(
  ngayGioVn("2026-08-31T09:22:00.000Z"),
));
kiemTra("ngay gio hong", ngayGioVn("khong phai ngay"), "");

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

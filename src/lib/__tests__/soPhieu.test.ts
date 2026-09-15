/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRA SỔ SỐ PHIẾU
 *
 * Cách đánh số đang dùng (Khoa chốt 15/09/2026): số phiếu trong sổ ĐÚNG BẰNG
 * mã phiếu in ra giấy — `PN-260911-01` cho nhập, `PX-260911-01` cho xuất, và
 * hủy thì gắn thêm đuôi `-HUY`.
 *
 * Số kiểu cũ (`51260001`, `52260001`, `60…`, `61…`) VẪN PHẢI ĐỌC ĐƯỢC: nó đã
 * in trên giấy và đã gửi đi, sửa lại là mất khả năng đối chiếu. Nên phần dưới
 * kiểm cả hai kiểu.
 *
 * Thứ phải giữ bằng mọi giá: một số phiếu đã cấp thì KHÔNG được đổi, và hai
 * phiếu khác nhau KHÔNG được trùng số.
 */

import {
  DAU_SO,
  DUOI_HUY,
  MA_LOAI,
  canTroHuy,
  dungLaiSo,
  dungSoPhieuCu,
  maNgay,
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

kiemTra("phieu nhap dau tien", dungSoPhieu(MA_LOAI.NHAP, "260911", 1), "PN-260911-01");
kiemTra("phieu nhap thu hai", dungSoPhieu(MA_LOAI.NHAP, "260911", 2), "PN-260911-02");
kiemTra("phieu xuat dau tien", dungSoPhieu(MA_LOAI.XUAT, "260911", 1), "PX-260911-01");

/*
 * SO PHIEU TRONG SO PHAI BANG DUNG MA PHIEU IN RA GIAY.
 *
 * Day la ca ly do doi cach danh so: truoc kia mot to phieu mang hai so khac
 * nhau, nguoi doi chieu phai nho so nao di voi so nao.
 */
kiemTra(
  "so trong so bang ma phieu in ra giay",
  dungSoPhieu(MA_LOAI.NHAP, maNgay("2026-09-11"), 1),
  "PN-260911-01",
);

kiemTra("huy phieu nhap", soPhieuHuy("PN-260911-01"), `PN-260911-01${DUOI_HUY}`);
kiemTra("huy phieu xuat", soPhieuHuy("PX-260911-03"), "PX-260911-03-HUY");

// Hủy một phiếu hủy là vô nghĩa.
kiemTra("khong huy duoc phieu huy", soPhieuHuy("PN-260911-01-HUY"), null);

// ------------------------------------------------- số kiểu cũ vẫn đọc được

kiemTra("dung lai so kieu cu", dungSoPhieuCu(DAU_SO.NHAP, "26", 1), "51260001");
kiemTra("huy so kieu cu", soPhieuHuy("51260001"), "52260001");
kiemTra("huy so xuat kieu cu", soPhieuHuy("60260001"), "61260001");
// Số hủy kiểu cũ bám theo số gốc, không chạy dãy riêng.
kiemTra("huy kieu cu bam theo so goc", soPhieuHuy("51260047"), "52260047");
kiemTra("khong huy duoc phieu huy kieu cu", soPhieuHuy("52260001"), null);
kiemTra("khong huy duoc phieu huy xuat kieu cu", soPhieuHuy("61260001"), null);

// ------------------------------------------------- ghép và tách số

kiemTra("dem du 2 chu so", dungSoPhieu(MA_LOAI.NHAP, "260911", 7), "PN-260911-07");
kiemTra("thu tu 0 van thanh 01", dungSoPhieu(MA_LOAI.NHAP, "260911", 0), "PN-260911-01");
// Quá 99 phiếu một ngày thì DÀI RA, không quay vòng — số trùng là hỏng cả sổ.
kiemTra("qua 99 thi dai ra", dungSoPhieu(MA_LOAI.NHAP, "260911", 100), "PN-260911-100");
dung("so dai van doc lai duoc", docSoPhieu("PN-260911-100")?.thuTu === 100);

kiemTra("ma ngay", maNgay("2026-09-11"), "260911");
kiemTra("ma ngay hong thi rong", maNgay("11/09/2026"), "");

kiemTra("doc so phieu nhap", docSoPhieu("PN-260911-07"), {
  loai: "NHAP",
  kieu: "moi",
  dauSo: "PN",
  namHai: "26",
  ngayMa: "260911",
  thuTu: 7,
  kyDem: "PN|260911",
});
kiemTra("doc so phieu huy xuat", docSoPhieu("PX-270102-03-HUY"), {
  loai: "HUY_XUAT",
  kieu: "moi",
  dauSo: "PX",
  namHai: "27",
  ngayMa: "270102",
  thuTu: 3,
  kyDem: "PX|270102",
});
kiemTra("doc so kieu cu", docSoPhieu("51260047"), {
  loai: "NHAP",
  kieu: "cu",
  dauSo: "51",
  namHai: "26",
  ngayMa: "",
  thuTu: 47,
  kyDem: "51|26",
});

kiemTra("ma la thi khong doc", docSoPhieu("PZ-260911-01"), null);
kiemTra("dau so la thi khong doc", docSoPhieu("99260001"), null);
kiemTra("ngan qua thi khong doc", docSoPhieu("5126001"), null);
kiemTra("co chu thi khong doc", docSoPhieu("5126000A"), null);
kiemTra("rong thi khong doc", docSoPhieu(""), null);
kiemTra("thu tu 0000 khong hop le", docSoPhieu("51260000"), null);
kiemTra("thu tu 00 kieu moi khong hop le", docSoPhieu("PN-260911-00"), null);
kiemTra("thieu ngay thi khong doc", docSoPhieu("PN-2609-01"), null);
kiemTra("duoi la thi khong doc", docSoPhieu("PN-260911-01-XOA"), null);

// Dựng lại số từ khoá dãy đếm — ngược với `docSoPhieu`.
kiemTra("dung lai so kieu moi", dungLaiSo("PN|260911", 5), "PN-260911-05");
kiemTra("dung lai so kieu cu tu ky dem", dungLaiSo("60|26", 5), "60260005");
// Đi một vòng phải về đúng chỗ cũ.
["PN-260911-01", "PX-261231-12", "51260047", "61270003"].forEach((so) => {
  const t = docSoPhieu(so)!;
  const lai = laLoaiHuy(t.loai) ? so : dungLaiSo(t.kyDem, t.thuTu);
  dung(`di mot vong ${so}`, laLoaiHuy(t.loai) || lai === so);
});

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

kiemTra("thu tu ke tiep nhap", thuTuKeTiep(so, "51|26"), 3);
kiemTra("thu tu ke tiep xuat", thuTuKeTiep(so, "60|26"), 3);
// Năm mới thì đếm lại từ 1.
kiemTra("nam moi dem lai tu 1", thuTuKeTiep(so, "51|27"), 1);
kiemTra("so rong thi bat dau tu 1", thuTuKeTiep([], "51|26"), 1);
// Dãy hủy đếm riêng, không lẫn vào dãy gốc.
kiemTra("day huy dem rieng", thuTuKeTiep(so, "61|26"), 3);

/*
 * KIEU MOI DEM THEO NGAY, KHONG DEM THEO NAM.
 *
 * Sang ngay moi la dem lai tu 01. Dem tiep theo nam thi so phieu khong con
 * khop voi ma in tren to giay, dung cai vua sua.
 */
{
  const ng: GhiSoPhieu[] = [
    g({ soPhieu: "PN-260911-01", id: "PN-260911-01" }),
    g({ soPhieu: "PN-260911-02", id: "PN-260911-02" }),
    g({ soPhieu: "PN-260912-01", id: "PN-260912-01" }),
  ];
  kiemTra("ngay 11 dem tiep la 03", thuTuKeTiep(ng, "PN|260911"), 3);
  kiemTra("ngay 12 dem tiep la 02", thuTuKeTiep(ng, "PN|260912"), 2);
  kiemTra("ngay chua co thi tu 1", thuTuKeTiep(ng, "PN|260913"), 1);
}

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

/*
 * KIEU MOI: DUT QUANG DO TRONG TUNG NGAY, KHONG DO SUOT NAM.
 *
 * Ngay 11 cap toi 03 ma thieu 02 thi dung la dut quang. Con ngay 12 chi moi
 * cap 01 thi khong thieu gi ca — do suot nam theo kieu cu se bao nham la
 * thieu PN-...-02 cua ngay 12, va bao nham thi lan sau khong ai tin nua.
 */
{
  const dut = tomTatSoPhieu([
    g({ soPhieu: "PN-260911-01", id: "PN-260911-01" }),
    g({ soPhieu: "PN-260911-03", id: "PN-260911-03" }),
    g({ soPhieu: "PN-260912-01", id: "PN-260912-01" }),
  ]);
  kiemTra("dut quang trong ngay", dut.thieuSo, ["PN-260911-02"]);
}

// Hai ngay lien nhau, ngay nao cung du thi khong bao gi.
{
  const du = tomTatSoPhieu([
    g({ soPhieu: "PN-260911-01", id: "PN-260911-01" }),
    g({ soPhieu: "PN-260911-02", id: "PN-260911-02" }),
    g({ soPhieu: "PN-260912-01", id: "PN-260912-01" }),
    g({ soPhieu: "PX-260912-01", id: "PX-260912-01", loai: "XUAT" }),
  ]);
  kiemTra("du thi khong bao thieu", du.thieuSo, []);
}

// Phieu huy kieu moi dung lai dung thu tu cua phieu goc, khong tao dut quang.
{
  const h = tomTatSoPhieu([
    g({ soPhieu: "PN-260911-01", id: "PN-260911-01" }),
    g({ soPhieu: "PN-260911-02", id: "PN-260911-02" }),
    g({
      soPhieu: "PN-260911-02-HUY",
      id: "PN-260911-02-HUY",
      loai: "HUY_NHAP",
      soLuong: -300,
    }),
  ]);
  kiemTra("phieu huy khong tao dut quang", h.thieuSo, []);
  kiemTra("dem dung so phieu huy", h.soHuy, 1);
}

// So kieu cu va kieu moi nam chung mot so thi dem rieng tung day.
{
  const tron = tomTatSoPhieu([
    g({ soPhieu: "51260001", id: "51260001" }),
    g({ soPhieu: "51260003", id: "51260003" }),
    g({ soPhieu: "PN-260911-01", id: "PN-260911-01" }),
  ]);
  kiemTra("hai kieu dem rieng day", tron.thieuSo, ["51260002"]);
  kiemTra("dem du ca hai kieu", tron.tongPhieu, 3);
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KIỂM TRA TỆP TEMPLATE XUẤT HÓA ĐƠN
 *
 * Số kỳ vọng chép nguyên từ tệp mẫu `TEMPLATE.xlsx` bộ phận gửi — đơn công nợ
 * giao 21–22/08/2026. Chứng từ BNC: 9 mặt hàng, trước thuế 163.242.000, VAT
 * 16.324.200, tổng 179.566.200. Chứng từ ITC: 5 mặt hàng, 12.504.000 /
 * 1.250.400 / 13.754.400.
 */

import {
  CAU_HINH_MAC_DINH,
  dungTepSap,
  kiemCanChungTu,
  MA_TRUONG_SAP,
  ngayDDMMYYYY,
  type DongHangSap,
} from "../sapTemplate";

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

// ------------------------------------------------------------------ ngày

eq("ngay DDMMYYYY", ngayDDMMYYYY("2026-08-23"), "23082026");
// Ngày mùng 1 phải giữ số 0 đứng đầu — đây là lý do trường ngày là chuỗi.
eq("giu so 0 dung dau", ngayDDMMYYYY("2026-09-01"), "01092026");
eq("ngay hong", ngayDDMMYYYY(""), "");

eq("29 cot", MA_TRUONG_SAP.length, 29);

// --------------------------------------------------------------- dữ liệu

const dong: DongHangSap[] = [
  // BNC — chép đúng chín dòng của tệp mẫu.
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Golden Bridge Helles Lager", dvt: "LIT", soLuong: 1757.8, thanhTien: 52_734_000 },
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Lunar Castle Dry hop Pale Ale", dvt: "LIT", soLuong: 824, thanhTien: 24_720_000 },
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Wings Dark Lager", dvt: "LIT", soLuong: 556.2, thanhTien: 16_686_000 },
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Volcano Kiss dry hop lager", dvt: "LIT", soLuong: 185.4, thanhTien: 5_562_000 },
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Helios Wheat Lager", dvt: "LIT", soLuong: 1030, thanhTien: 30_900_000 },
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Eclipse Plaza Dry Hop Wheat VN", dvt: "LIT", soLuong: 348.8, thanhTien: 10_464_000 },
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Golden Bridge Helles Lager lon330ml", dvt: "LON", soLuong: 120, thanhTien: 1_680_000 },
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Lunar Castle Dry hop Pale Ale 330ml", dvt: "LON", soLuong: 552, thanhTien: 7_728_000 },
  { maBp: "AD0103", donVi: "BNC", tenHangHoa: "Bia Wings Dark Lager 330ml", dvt: "LON", soLuong: 912, thanhTien: 12_768_000 },
  // ITC — năm dòng.
  { maBp: "AC0103", donVi: "ITC", tenHangHoa: "Bia Golden Bridge Helles Lager", dvt: "LIT", soLuong: 180, thanhTien: 5_400_000 },
  { maBp: "AC0103", donVi: "ITC", tenHangHoa: "Bia Lunar Castle Dry hop Pale Ale", dvt: "LIT", soLuong: 60, thanhTien: 1_800_000 },
  { maBp: "AC0103", donVi: "ITC", tenHangHoa: "Bia Wings Dark Lager", dvt: "LIT", soLuong: 20, thanhTien: 600_000 },
  { maBp: "AC0103", donVi: "ITC", tenHangHoa: "Bia Lunar Castle Dry hop Pale Ale 330ml", dvt: "LON", soLuong: 288, thanhTien: 4_032_000 },
  { maBp: "AC0103", donVi: "ITC", tenHangHoa: "Bia Wings Dark Lager 330ml", dvt: "LON", soLuong: 48, thanhTien: 672_000 },
];

const tep = dungTepSap({
  dong,
  ngayChungTu: "2026-08-23",
  cauHinh: CAU_HINH_MAC_DINH,
});

// 2 chứng từ: BNC (1 + 9 + 1 = 11 dòng), ITC (1 + 5 + 1 = 7 dòng).
eq("hai chung tu", tep.chungTu.length, 2);
eq("dung 18 dong", tep.oDong.length, 18);
eq("moi dong du 29 o", tep.oDong.every((d) => d.length === 29), true);

const bnc = tep.chungTu.find((x) => x.maBp === "AD0103")!;
eq("BNC truoc thue", bnc.truocThue, 163_242_000);
eq("BNC VAT", bnc.vat, 16_324_200);
eq("BNC tong cong", bnc.tongCong, 179_566_200);
eq("BNC chin mat hang", bnc.soDongHang, 9);
eq("BNC tieu de", bnc.tieuDe, "CN Beer SKB T8_BNC");

const itc = tep.chungTu.find((x) => x.maBp === "AC0103")!;
eq("ITC truoc thue", itc.truocThue, 12_504_000);
eq("ITC VAT", itc.vat, 1_250_400);
eq("ITC tong cong", itc.tongCong, 13_754_400);

eq("tong ca tep", tep.tong.tongCong, 179_566_200 + 13_754_400);
eq("moi chung tu deu can", kiemCanChungTu(tep).length, 0);

// -------------------------------------------------- dòng đầu: Nợ phải thu

const d0 = tep.oDong[0];
const o = (ma: string) => d0[MA_TRUONG_SAP.indexOf(ma)];
eq("BLDAT", o("BLDAT"), { t: "s", v: "23082026" });
eq("BUDAT", o("BUDAT"), { t: "s", v: "23082026" });
eq("BLART", o("BLART"), { t: "s", v: "DR" });
eq("BUKRS", o("BUKRS"), { t: "s", v: "S132" });
eq("WAERS", o("WAERS"), { t: "s", v: "VND" });
eq("BUPLA", o("BUPLA"), { t: "s", v: "B182" });
eq("XBLNR de trong", o("XBLNR"), { t: "s", v: "" });
eq("BSCHL la chuoi 01", o("BSCHL"), { t: "s", v: "01" });
eq("HKONT phai thu", o("HKONT"), { t: "s", v: "AK0101" });
eq("WRBTR = tong da gom thue", o("WRBTR"), { t: "n", v: 179_566_200 });
eq("DMBTR bang WRBTR", o("DMBTR"), { t: "n", v: 179_566_200 });
eq("MWSKZ", o("MWSKZ"), { t: "s", v: "O2" });
eq("ZTERM", o("ZTERM"), { t: "s", v: "T000" });
eq("ZFBDT", o("ZFBDT"), { t: "s", v: "23082026" });
eq("PRCTR", o("PRCTR"), { t: "s", v: "SX182001" });
// Dòng Nợ KHÔNG có Customer, không có số lượng — đúng như tệp mẫu.
eq("dong No khong co Customer", o("COPA_KNDNR"), { t: "s", v: "" });
eq("dong No khong co so luong", o("MENGE"), { t: "s", v: "" });
eq("dong No khong co don vi tinh", o("MEINS"), { t: "s", v: "" });

// ------------------------------------------------- dòng thứ hai: doanh thu

const d1 = tep.oDong[1];
const o1 = (ma: string) => d1[MA_TRUONG_SAP.indexOf(ma)];
eq("BSCHL 50", o1("BSCHL"), { t: "s", v: "50" });
eq("tai khoan doanh thu", o1("HKONT"), { t: "s", v: "5111526200" });
eq("tien truoc thue", o1("WRBTR"), { t: "n", v: 52_734_000 });
eq("co Customer", o1("COPA_KNDNR"), { t: "s", v: "AK0101" });
eq("so luong", o1("MENGE"), { t: "n", v: 1757.8 });
eq("don vi tinh", o1("MEINS"), { t: "s", v: "LIT" });
eq("khong co Tax Amt", o1("WMWST"), { t: "s", v: "" });
// Tep mau ghi NGUYEN ten 30 ky tu vao o khai C(25) va van dung duoc, nen
// khong cat ho — chi dem lai va bao.
eq("BKTXT giu nguyen ten", o1("BKTXT"), {
  t: "s",
  v: "Bia Golden Bridge Helles Lager",
});
eq("co bao chu vuot do dai", tep.vuotDoDai.length > 0, true);
eq(
  "bao dung ten dai nhat",
  tep.vuotDoDai.some((v) => v.chu === "Bia Golden Bridge Helles Lager lon330ml"),
  true,
);
eq("SGTXT giu du ten", o1("SGTXT"), {
  t: "s",
  v: "Bia Golden Bridge Helles Lager",
});

// ------------------------------------------------------ dòng cuối: thuế

const dVat = tep.oDong[10];
const oV = (ma: string) => dVat[MA_TRUONG_SAP.indexOf(ma)];
eq("tai khoan thue", oV("HKONT"), { t: "s", v: "3331110000" });
eq("tien thue", oV("WRBTR"), { t: "n", v: 16_324_200 });
eq("Tax Amt", oV("WMWST"), { t: "n", v: 16_324_200 });
eq("Tax Base", oV("FWBAS"), { t: "n", v: 163_242_000 });
eq("dong thue khong co so luong", oV("MENGE"), { t: "s", v: "" });
eq("dong thue mang tieu de chung tu", oV("SGTXT"), {
  t: "s",
  v: "CN Beer SKB T8_BNC",
});

// ------------------------------------------------------------ làm tròn

{
  /*
   * VAT tinh TREN TONG chu khong cong VAT tung dong.
   *
   * Ba dong 33.333 dong: tung dong VAT 3.333,3 -> lam tron 3.333, cong lai
   * 9.999. Con tinh tren tong 99.999 x 10% = 10.000. Lech mot dong la he thong
   * ben kia tu choi ca chung tu.
   */
  const le = dungTepSap({
    dong: [
      { maBp: "X", donVi: "X", tenHangHoa: "A", dvt: "LIT", soLuong: 1, thanhTien: 33_333 },
      { maBp: "X", donVi: "X", tenHangHoa: "B", dvt: "LIT", soLuong: 1, thanhTien: 33_333 },
      { maBp: "X", donVi: "X", tenHangHoa: "C", dvt: "LIT", soLuong: 1, thanhTien: 33_333 },
    ],
    ngayChungTu: "2026-08-23",
    cauHinh: CAU_HINH_MAC_DINH,
  });
  eq("truoc thue", le.chungTu[0].truocThue, 99_999);
  eq("VAT tinh tren tong", le.chungTu[0].vat, 10_000);
  eq("chung tu van can", kiemCanChungTu(le).length, 0);

  // So le cua tung dong duoc lam tron ve dong truoc khi cong.
  const lam = dungTepSap({
    dong: [
      { maBp: "Y", donVi: "Y", tenHangHoa: "A", dvt: "LIT", soLuong: 0.1, thanhTien: 1000.4 },
      { maBp: "Y", donVi: "Y", tenHangHoa: "B", dvt: "LIT", soLuong: 0.1, thanhTien: 1000.6 },
    ],
    ngayChungTu: "2026-08-23",
    cauHinh: CAU_HINH_MAC_DINH,
  });
  eq("lam tron tung dong", lam.chungTu[0].truocThue, 1000 + 1001);
  eq(
    "dong hang mang so da lam tron",
    lam.oDong[1][MA_TRUONG_SAP.indexOf("WRBTR")],
    { t: "n", v: 1000 },
  );
}

// ------------------------------------------------------------ gộp mã BP

{
  // Hai bo phan BNC khac nhau nhung cung ma BP -> MOT chung tu.
  const gop = dungTepSap({
    dong: [
      { maBp: "AD0103", donVi: "BNC", tenHangHoa: "A", dvt: "LIT", soLuong: 10, thanhTien: 300_000 },
      { maBp: "AD0103", donVi: "BNC", tenHangHoa: "B", dvt: "LIT", soLuong: 20, thanhTien: 600_000 },
    ],
    ngayChungTu: "2026-08-23",
    cauHinh: CAU_HINH_MAC_DINH,
  });
  eq("cung ma BP thi mot chung tu", gop.chungTu.length, 1);
  eq("mot No, hai doanh thu, mot thue", gop.oDong.length, 4);
}

eq(
  "khong co dong nao",
  dungTepSap({ dong: [], ngayChungTu: "2026-08-23", cauHinh: CAU_HINH_MAC_DINH })
    .oDong.length,
  0,
);

// ------------------------------------------------------- tach theo dot
{
  // Cung don vi nhung KHAC DOT thi la hai chung tu, vi la hai hoa don.
  const haiDot = dungTepSap({
    dong: [
      { khoaDot: "d1", maBp: "AD0103", donVi: "BNC", tenHangHoa: "A", dvt: "LIT", soLuong: 10, thanhTien: 300_000 },
      { khoaDot: "d2", maBp: "AD0103", donVi: "BNC", tenHangHoa: "A", dvt: "LIT", soLuong: 20, thanhTien: 600_000 },
    ],
    ngayChungTu: "2026-08-23",
    cauHinh: CAU_HINH_MAC_DINH,
  });
  eq("khac dot la hai chung tu", haiDot.chungTu.length, 2);
  eq("moi chung tu ba dong", haiDot.oDong.length, 6);
  eq(
    "tien tach dung",
    haiDot.chungTu.map((x) => x.truocThue),
    [300_000, 600_000],
  );
  // Khong khai dot thi gop ve mot chung tu — dung nhu tep mau.
  const motDot = dungTepSap({
    dong: [
      { maBp: "AD0103", donVi: "BNC", tenHangHoa: "A", dvt: "LIT", soLuong: 10, thanhTien: 300_000 },
      { maBp: "AD0103", donVi: "BNC", tenHangHoa: "A", dvt: "LIT", soLuong: 20, thanhTien: 600_000 },
    ],
    ngayChungTu: "2026-08-23",
    cauHinh: CAU_HINH_MAC_DINH,
  });
  eq("khong khai dot thi mot chung tu", motDot.chungTu.length, 1);
  eq("va cong dong tien", motDot.chungTu[0].truocThue, 900_000);
}


console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

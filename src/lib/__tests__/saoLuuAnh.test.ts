/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SAO LƯU ẢNH — kiểm phần dễ sai nhất: TỆP DANH SÁCH.
 *
 * Bộ ảnh nén thì mở ra là thấy ngay đủ hay thiếu. Tệp danh sách thì không: nó
 * chỉ được đọc vài tháng sau, lúc cần đi tìm một tờ biên bản đã mất. Sai ở đó
 * thì không ai phát hiện cho tới lúc quá muộn — nên kiểm kỹ: mọi tấm đều có
 * dòng, tấm hỏng ghi rõ là hỏng, chữ tiếng Việt Excel mở được, dấu phẩy trong
 * tên hàng không làm lệch cột.
 */

import {
  dungDanhSachCsv,
  duongDanTrongZip,
  TEN_DANH_SACH,
  tenTepSaoLuu,
  THU_MUC,
  tomTatSaoLuu,
  type DongDanhSach,
} from "../saoLuuAnh";
import type { AnhThuVien } from "../thuVienAnh";

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

const anh = (o: Partial<AnhThuVien> = {}): AnhThuVien => ({
  id: "tx-001-0",
  url: "https://res.cloudinary.com/x/a.png",
  date: "2026-08-21T08:00:00.000Z",
  tieuDe: "Biên bản giao nhận",
  phu: "NVT",
  phuGoc: "NVT",
  donVi: "NVT",
  maDonVi: "AC0104",
  timKiem: "",
  ...o,
});

// ------------------------------------------------------------ ten tep

// Ten mang KHOANG NGAY chu khong mang ngay hom nay: sao luu thang 7 vao thang 9
// thi ten mang thang 9 la cat vao cho sai.
eq(
  "ten tep mang khoang ngay",
  tenTepSaoLuu("2026-08-01", "2026-08-31"),
  "sao-luu-anh-minh-chung 2026-08-01 den 2026-08-31.zip",
);
eq(
  "khong chan ngay thi noi ro",
  tenTepSaoLuu("", ""),
  "sao-luu-anh-minh-chung dau den nay.zip",
);
dung("luon la tep zip", tenTepSaoLuu("a", "b").endsWith(".zip"));

// ------------------------------------------------------------ duong dan trong zip

eq("thu muc nhap kho", THU_MUC.IN, "nhap-kho");
eq("thu muc xuat kho", THU_MUC.OUT, "xuat-kho");
eq(
  "duong dan co thu muc theo chieu",
  duongDanTrongZip("OUT", 1, anh()),
  "xuat-kho/001-2026-08-21-Bien-ban-giao-nhan-tx-001-0.png",
);
dung(
  "hai chieu khong the dung mot duong dan",
  duongDanTrongZip("IN", 1, anh()) !== duongDanTrongZip("OUT", 1, anh()),
);

// ------------------------------------------------------------ tep danh sach

{
  const ds: DongDanhSach[] = [
    { chieu: "IN", stt: 1, anh: anh({ tieuDe: "Phiếu PN-01" }), duoc: true },
    {
      chieu: "OUT",
      stt: 1,
      anh: anh({ tieuDe: "Bia Golden Bridge, lon 330ml", donVi: "FV" }),
      duoc: true,
    },
    {
      chieu: "OUT",
      stt: 2,
      anh: anh({ id: "tx-002-0", url: "https://a.b/mat.png" }),
      duoc: false,
    },
  ];
  const csv = dungDanhSachCsv(ds);
  const hang = csv.split("\r\n").filter((d) => d !== "");

  eq("mot hang tieu de cong ba hang du lieu", hang.length, 4);

  // Excel mo ra dung chu tieng Viet nho dau BOM. Thieu no thi "Cau Vang" thanh
  // mot day ky tu la — da gap tren may Windows cua bo phan.
  dung("co dau BOM cho Excel", csv.startsWith("﻿"));
  dung("giu dau tieng Viet", csv.includes("Đơn vị"));

  // Dau phay trong ten hang khong duoc lam lech cot: moi o boc trong ngoac kep.
  const hangCoPhay = hang.find((d) => d.includes("Golden Bridge"))!;
  eq("moi o deu boc ngoac kep nen so o dung", hangCoPhay.split('","').length, 10);
  dung("ten hang co dau phay van nam trong mot o", hangCoPhay.includes('"Bia Golden Bridge, lon 330ml"'));

  // TAM HONG VAN PHAI CO DONG. Day la ly do chinh cua tep danh sach: tam da mat
  // thi con lai dong ghi no tung ton tai, du de di tim to bien ban giay.
  const hangHong = hang.find((d) => d.includes("mat.png"))!;
  dung("tam hong van co dong", !!hangHong);
  dung("ghi ro la khong tai duoc", hangHong.includes("KHÔNG TẢI ĐƯỢC"));
  // Khong duoc ghi mot cai ten tep khong ton tai trong bo nen.
  dung("tam hong de trong cot ten tep", hangHong.includes('"","KHÔNG TẢI ĐƯỢC"'));
  // Van phai giu duong dan goc: do la thu duy nhat lan ra duoc anh o dau ben kia.
  dung("tam hong van giu duong dan goc", hangHong.includes("https://a.b/mat.png"));

  // Tam luu duoc thi ghi dung ten tep de mo ra doi chieu.
  const hangDuoc = hang.find((d) => d.includes("Phiếu PN-01"))!;
  dung("tam luu duoc ghi ten tep", hangDuoc.includes("nhap-kho/001-"));
  dung("tam luu duoc ghi Da luu", hangDuoc.includes('"Đã lưu"'));

  // Ngay chi lay phan ngay, khong keo ca gio phut vao o.
  dung("ngay chi lay yyyy-MM-dd", hangDuoc.includes('"2026-08-21"'));
}

// Dau ngoac kep trong du lieu phai nhan doi theo chuan CSV, khong thi Excel
// doc lech tu do tro di.
{
  const csv = dungDanhSachCsv([
    { chieu: "OUT", stt: 1, anh: anh({ tieuDe: 'Bia "Lâu Đài"' }), duoc: true },
  ]);
  dung("nhan doi dau ngoac kep", csv.includes('"Bia ""Lâu Đài"""'));
}

// Bo rong thi van co hang tieu de: mo tep ra thay tieu de va khong co dong nao
// thi biet la khong co anh, con tep trong thi tuong tai loi.
{
  const csv = dungDanhSachCsv([]);
  const hang = csv.split("\r\n").filter((d) => d !== "");
  eq("bo rong van co hang tieu de", hang.length, 1);
  dung("co dau BOM", csv.startsWith("﻿"));
}

// So mat hang dung chung anh: mot to bien ban ky cho ca luot giao.
{
  const csv = dungDanhSachCsv([
    { chieu: "OUT", stt: 1, anh: anh({ soDongDungChung: 4 }), duoc: true },
  ]);
  dung("ghi so mat hang dung chung", csv.includes('"4"'));
}
{
  // Chua gop trung thi khong co truong nay, phai coi la mot chu khong de rong.
  const csv = dungDanhSachCsv([
    { chieu: "OUT", stt: 1, anh: anh(), duoc: true },
  ]);
  dung("khong co so thi coi la mot", csv.includes('"1"'));
}

// ------------------------------------------------------------ cau tom tat

eq("bo rong", tomTatSaoLuu([]), "Không có ảnh nào trong khoảng ngày này.");
eq(
  "du het thi noi la du",
  tomTatSaoLuu([
    { chieu: "IN", stt: 1, anh: anh(), duoc: true },
    { chieu: "OUT", stt: 1, anh: anh(), duoc: true },
  ]),
  "Đã sao lưu đủ 2 ảnh (1 ảnh nhập kho, 1 ảnh xuất kho).",
);
{
  // Thieu thi PHAI NOI RA. Bao "xong" khi thieu ba tam la de nguoi dung tin la
  // da sao luu du, den luc can moi biet la khong.
  const t = tomTatSaoLuu([
    { chieu: "OUT", stt: 1, anh: anh(), duoc: true },
    { chieu: "OUT", stt: 2, anh: anh(), duoc: false },
  ]);
  dung("noi ro so tam luu duoc", t.includes("1/2"));
  dung("noi ro co tam khong tai duoc", t.includes("1 tấm không tải được"));
  dung("chi cho xem o dau", t.includes(TEN_DANH_SACH));
  dung("khong noi la du", !t.includes("đủ"));
}

console.log(`\n${pass} DUNG / ${fail} SAI`);
process.exit(fail > 0 ? 1 : 0);

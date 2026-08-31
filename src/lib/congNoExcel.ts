/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GHI FILE CÔNG NỢ RA .XLSX
 *
 * Tách khỏi `congNo.ts` để phần tính toán còn chạy test được mà không phải kéo
 * theo thư viện Excel.
 *
 * Mục tiêu: file tải về mở lên TRÔNG GIỐNG file tháng của bộ phận, không phải
 * "gần giống". Kế toán dán bảng này vào file gốc hoặc dùng thẳng, nên phải có
 * đủ hàng tiêu đề gộp ô "SKB xuất hóa đơn cho DNC" / "DNC xuất hóa đơn cho đơn
 * vị khác", ô tổng số lượng ở H1, và định dạng số nghìn.
 *
 * DÙNG `xlsx-js-style` CHỨ KHÔNG PHẢI `xlsx`: bản cộng đồng của `xlsx` không
 * ghi được màu nền và đường kẻ, nên mọi tệp xuất ra trước đây đều trắng trơn.
 * Xem `src/lib/excelDep.ts`.
 */

import XLSX from "xlsx-js-style";
import type { BangCongNo } from "./congNo";
import { COT_CHOT, oCuaDong } from "./congNo";
import { PRICE_TABLE } from "./invoice";
import { MAU, VIEN } from "./excelDep";

/** Định dạng số của file gốc — chép nguyên để cột tiền hiện giống hệt. */
const DINH_DANG_TIEN = '_-* #,##0_-;\\-* #,##0_-;_-* "-"??_-;_-@_-';
const DINH_DANG_SO_LUONG = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)';

/** Cột nào mang tiền — I..R, tức chỉ số 8..16 và bỏ cột số hóa đơn (12). */
const COT_TIEN = [8, 9, 10, 11, 13, 14, 15, 16];

/** Bề rộng cột, ước theo nội dung để mở ra không phải kéo tay. */
const BE_RONG = [
  13, 22, 5, 12, 11, 34, 6, 12, 11, 16, 14, 18, 18, 11, 16, 14, 18, 9,
];

/**
 * Hai chặng bán tô hai màu khác nhau.
 *
 * Bảng có hai khối cột tiền giống hệt nhau, chỉ khác đơn giá. Không phân biệt
 * bằng màu thì rất dễ đọc nhầm tiền chặng này sang chặng kia — mà hai chặng
 * lệch nhau vài phần trăm nên nhầm cũng không lộ ngay.
 */
const MAU_CHANG_SKB = "1F4E5F";
const MAU_CHANG_DNC = "6B4E71";

const vienDay = { style: "medium" as const, color: { rgb: MAU.vien } };

export function sheetChot(bang: BangCongNo): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const soCot = 18;

  const dat = (c: number, r: number, v: any, t: "s" | "n", s: any, z?: string) => {
    ws[XLSX.utils.encode_cell({ c, r })] = z ? { t, v, s, z } : { t, v, s };
  };

  const mauCua = (c: number) =>
    c >= 8 && c <= 12 ? MAU_CHANG_SKB : c >= 13 ? MAU_CHANG_DNC : MAU.tieuDe;

  // --- Hàng 1: dải tiêu đề hai chặng + tổng số lượng ---
  for (let c = 0; c < soCot; c++) {
    dat(c, 0, "", "s", {
      fill: { patternType: "solid", fgColor: { rgb: mauCua(c) } },
      border: VIEN,
    });
  }
  dat(7, 0, bang.tong.soLuong, "n", {
    font: { bold: true, sz: 11, color: { rgb: MAU.chuTieuDe } },
    fill: { patternType: "solid", fgColor: { rgb: MAU.tieuDe } },
    alignment: { horizontal: "right", vertical: "center" },
    border: VIEN,
  }, DINH_DANG_SO_LUONG);
  const daiChang = (nen: string) => ({
    font: { bold: true, sz: 11, color: { rgb: MAU.chuTieuDe } },
    fill: { patternType: "solid", fgColor: { rgb: nen } },
    alignment: { horizontal: "center", vertical: "center" },
    border: VIEN,
  });
  /*
   * Chữ trên hai dải chép ĐÚNG ô I1 và N1 của file gốc, không viết lại cho dễ
   * hiểu hơn. Kế toán dán bảng này vào file tháng, chữ khác một chữ là nhìn ra
   * ngay đây không phải file của họ.
   */
  dat(8, 0, "SKB - DNC", "s", daiChang(MAU_CHANG_SKB));
  dat(13, 0, "DNC xuất BNC và ĐVTV", "s", daiChang(MAU_CHANG_DNC));

  // --- Hàng 2: tên cột ---
  COT_CHOT.forEach((ten, c) => {
    dat(c, 1, ten, "s", {
      font: { bold: true, sz: 10, color: { rgb: MAU.chuTieuDe } },
      fill: { patternType: "solid", fgColor: { rgb: mauCua(c) } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: VIEN,
    });
  });

  // --- Dữ liệu ---
  bang.dong.forEach((d, i) => {
    const r = i + 2;
    const chan = i % 2 === 1;
    const o = oCuaDong(d);
    // Đổi đơn vị thì kẻ một đường đậm ngăn giữa hai khối — file có hàng chục
    // dòng, không có vạch ngăn thì không thấy đơn vị bắt đầu từ đâu.
    const dauKhoi =
      i > 0 && bang.dong[i - 1].maBp + bang.dong[i - 1].donVi !== d.maBp + d.donVi;

    for (let c = 0; c < soCot; c++) {
      const v = o[c];
      const laSo = typeof v === "number";
      const laTien = COT_TIEN.includes(c);
      const s: any = {
        font: { sz: 10, color: { rgb: MAU.chu } },
        fill: chan
          ? { patternType: "solid", fgColor: { rgb: MAU.socNgua } }
          : undefined,
        alignment: {
          horizontal: laSo ? "right" : c === 2 ? "center" : "left",
          vertical: "center",
        },
        border: dauKhoi ? { ...VIEN, top: vienDay } : VIEN,
      };
      if (laSo) {
        dat(c, r, v, "n", s, c === 7 ? DINH_DANG_SO_LUONG : laTien ? DINH_DANG_TIEN : undefined);
      } else {
        // Mã vật tư giữ kiểu SỐ như file gốc: ghi thành chuỗi là mọi công thức
        // VLOOKUP bên file tháng trả #N/A.
        if (c === 4 && /^\d+$/.test(String(v))) {
          dat(c, r, Number(v), "n", { ...s, alignment: { horizontal: "left", vertical: "center" } });
        } else {
          dat(c, r, String(v ?? ""), "s", s);
        }
      }
    }
  });

  // --- Dòng tổng ---
  const rTong = bang.dong.length + 2;
  const tongCua: Record<number, number> = {
    7: bang.tong.soLuong,
    9: bang.tong.thanhTienSkb,
    10: bang.tong.vatSkb,
    11: bang.tong.sauThueSkb,
    14: bang.tong.thanhTienDnc,
    15: bang.tong.vatDnc,
    16: bang.tong.sauThueDnc,
  };
  for (let c = 0; c < soCot; c++) {
    const s = {
      font: { sz: 10, bold: true, color: { rgb: MAU.chu } },
      fill: { patternType: "solid", fgColor: { rgb: MAU.dongTong } },
      alignment: { horizontal: c in tongCua ? "right" : "left", vertical: "center" },
      border: { ...VIEN, top: vienDay },
    };
    if (c in tongCua) {
      dat(c, rTong, tongCua[c], "n", s, c === 7 ? DINH_DANG_SO_LUONG : DINH_DANG_TIEN);
    } else {
      dat(c, rTong, c === 0 ? "TỔNG CỘNG" : "", "s", s);
    }
  }

  ws["!ref"] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: soCot - 1, r: rTong },
  });
  ws["!merges"] = [
    { s: { c: 8, r: 0 }, e: { c: 12, r: 0 } },
    { s: { c: 13, r: 0 }, e: { c: 17, r: 0 } },
  ];
  ws["!cols"] = BE_RONG.map((w) => ({ wch: w }));
  ws["!rows"] = [{ hpt: 20 }, { hpt: 30 }];
  // Khoá hai hàng đầu: bảng dài trăm dòng, cuộn xuống mà mất tên cột thì đọc
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 1 },
      e: { c: soCot - 1, r: bang.dong.length + 1 },
    }),
  };
  return ws;
}

/** Sheet "Đơn giá" — bảng giá và mã BP đi kèm, để file tự đủ căn cứ. */
export function sheetDonGia(
  matHang: { maVatTu: string; ten: string; dvt: "LIT" | "LON" }[],
  donVi: { ten: string; maSap: string }[],
): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const dat = (c: number, r: number, v: any, t: "s" | "n", s: any, z?: string) => {
    ws[XLSX.utils.encode_cell({ c, r })] = z ? { t, v, s, z } : { t, v, s };
  };

  const tieuDe = [
    "Mã",
    "Tên",
    "ĐVT",
    "Đơn giá bán DNC",
    "Đơn giá bán ĐVTV",
    "",
    "Đơn vị",
    "Mã SAP",
  ];
  const kieuTieuDe = (nen: string) => ({
    font: { bold: true, sz: 10, color: { rgb: MAU.chuTieuDe } },
    fill: { patternType: "solid", fgColor: { rgb: nen } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: VIEN,
  });
  tieuDe.forEach((t, c) => {
    if (c === 5) {
      dat(c, 0, "", "s", {});
      return;
    }
    dat(c, 0, t, "s", kieuTieuDe(c >= 6 ? MAU.nhom : MAU.tieuDe));
  });

  const n = Math.max(matHang.length, donVi.length);
  for (let i = 0; i < n; i++) {
    const r = i + 1;
    const chan = i % 2 === 1;
    const nen = chan
      ? { patternType: "solid", fgColor: { rgb: MAU.socNgua } }
      : undefined;
    const oChu = (canPhai = false) => ({
      font: { sz: 10, color: { rgb: MAU.chu } },
      fill: nen,
      alignment: { horizontal: canPhai ? "right" : "left", vertical: "center" },
      border: VIEN,
    });

    const m = matHang[i];
    if (m) {
      const ma = Number(m.maVatTu);
      if (Number.isFinite(ma)) dat(0, r, ma, "n", oChu());
      else dat(0, r, m.maVatTu, "s", oChu());
      dat(1, r, m.ten, "s", oChu());
      dat(2, r, m.dvt, "s", {
        ...oChu(),
        alignment: { horizontal: "center", vertical: "center" },
      });
      dat(3, r, PRICE_TABLE[m.dvt].skbToDnc, "n", oChu(true), "#,##0");
      dat(4, r, PRICE_TABLE[m.dvt].dncToMember, "n", oChu(true), "#,##0");
    } else {
      for (let c = 0; c <= 4; c++) dat(c, r, "", "s", oChu());
    }

    dat(5, r, "", "s", {});

    const d = donVi[i];
    dat(6, r, d ? d.ten : "", "s", oChu());
    dat(7, r, d ? d.maSap : "", "s", oChu());
  }

  ws["!ref"] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 7, r: n } });
  ws["!cols"] = [12, 36, 7, 17, 18, 3, 18, 11].map((w) => ({ wch: w }));
  ws["!rows"] = [{ hpt: 28 }];
  return ws;
}

export function taoWorkbookCongNo(
  bang: BangCongNo,
  matHang: { maVatTu: string; ten: string; dvt: "LIT" | "LON" }[],
  donVi: { ten: string; maSap: string }[],
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetChot(bang), "Chốt");
  XLSX.utils.book_append_sheet(wb, sheetDonGia(matHang, donVi), "Đơn giá");
  return wb;
}

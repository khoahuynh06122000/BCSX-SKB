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
 * vị khác", ô tổng số lượng ở H1, và định dạng số nghìn — thiếu định dạng thì
 * cột tiền hiện ra dạng 294402000 và không ai soát được bằng mắt.
 */

import * as XLSX from "xlsx";
import type { BangCongNo } from "./congNo";
import { COT_CHOT, oCuaDong } from "./congNo";
import { PRICE_TABLE } from "./invoice";

/** Định dạng số của file gốc — chép nguyên để cột tiền hiện giống hệt. */
const DINH_DANG_TIEN = '_-* #,##0_-;\\-* #,##0_-;_-* "-"??_-;_-@_-';
const DINH_DANG_SO_LUONG = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)';

/** Cột nào mang tiền — I..R, tức chỉ số 8..16 và bỏ cột số hóa đơn (12). */
const COT_TIEN = [8, 9, 10, 11, 13, 14, 15, 16];

/** Bề rộng cột, ước theo nội dung để mở ra không phải kéo tay. */
const BE_RONG = [
  13, 22, 5, 10, 11, 34, 6, 12, 11, 16, 14, 18, 18, 11, 16, 14, 18, 9,
];

/**
 * Dựng sheet "Chốt".
 *
 * Bố cục: hàng 1 là dải tiêu đề gộp của hai chặng bán + tổng số lượng, hàng 2
 * là tên cột, từ hàng 3 là dữ liệu — đúng như file gốc, nên số hàng khớp và
 * công thức tham chiếu của kế toán không lệch.
 */
export function sheetChot(bang: BangCongNo): XLSX.WorkSheet {
  const aoa: (string | number | null)[][] = [];

  const dai: (string | number | null)[] = new Array(18).fill(null);
  dai[7] = bang.tong.soLuong;
  dai[8] = "SKB xuất hóa đơn cho DNC";
  dai[13] = "DNC xuất hóa đơn cho đơn vị khác";
  aoa.push(dai);
  aoa.push([...COT_CHOT]);
  bang.dong.forEach((d) => aoa.push(oCuaDong(d)));

  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: false });

  ws["!merges"] = [
    { s: { c: 8, r: 0 }, e: { c: 12, r: 0 } },
    { s: { c: 13, r: 0 }, e: { c: 17, r: 0 } },
  ];
  ws["!cols"] = BE_RONG.map((w) => ({ wch: w }));
  // Khoá hai hàng đầu: bảng dài trăm dòng, cuộn xuống mà mất tên cột thì đọc
  // nhầm cột tiền chặng này sang chặng kia.
  ws["!freeze"] = { xSplit: 0, ySplit: 2 };

  const soLuongDau = XLSX.utils.encode_cell({ c: 7, r: 0 });
  if (ws[soLuongDau]) ws[soLuongDau].z = DINH_DANG_SO_LUONG;

  for (let i = 0; i < bang.dong.length; i++) {
    const r = i + 2;
    const oSl = ws[XLSX.utils.encode_cell({ c: 7, r })];
    if (oSl) oSl.z = DINH_DANG_SO_LUONG;
    COT_TIEN.forEach((c) => {
      const o = ws[XLSX.utils.encode_cell({ c, r })];
      if (o) o.z = DINH_DANG_TIEN;
    });
    // Mã vật tư trong file gốc là SỐ. Giữ nguyên kiểu số để dò VLOOKUP của kế
    // toán vẫn khớp — ghi thành chuỗi là mọi công thức bên file gốc trả #N/A.
    const oMa = ws[XLSX.utils.encode_cell({ c: 4, r })];
    if (oMa && typeof oMa.v === "string" && /^\d+$/.test(oMa.v)) {
      oMa.t = "n";
      oMa.v = Number(oMa.v);
    }
  }

  return ws;
}

/** Sheet "Đơn giá" — bảng giá và mã BP đi kèm, để file tự đủ căn cứ. */
export function sheetDonGia(
  matHang: { maVatTu: string; ten: string; dvt: "LIT" | "LON" }[],
  donVi: { ten: string; maSap: string }[],
): XLSX.WorkSheet {
  const aoa: (string | number | null)[][] = [];
  aoa.push([
    "Mã",
    "Tên",
    "ĐVT",
    "Đơn giá bán DNC",
    "Đơn giá bán ĐVTV",
    null,
    "Đơn vị",
    "Mã SAP",
  ]);
  const n = Math.max(matHang.length, donVi.length);
  for (let i = 0; i < n; i++) {
    const m = matHang[i];
    const d = donVi[i];
    aoa.push([
      m ? Number(m.maVatTu) || m.maVatTu : null,
      m ? m.ten : null,
      m ? m.dvt : null,
      m ? PRICE_TABLE[m.dvt].skbToDnc : null,
      m ? PRICE_TABLE[m.dvt].dncToMember : null,
      null,
      d ? d.ten : null,
      d ? d.maSap : null,
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [12, 34, 6, 16, 17, 3, 16, 10].map((w) => ({ wch: w }));
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

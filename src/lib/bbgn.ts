/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐỌC FILE BBGN CỦA BỘ PHẬN VÀ DỰNG FILE MẪU
 *
 * File "BBGN Beer 2026 T08.xlsx" là BẢNG CHÉO: mỗi dòng là một lần giao, các
 * loại bia nằm ngang thành cột. Một dòng giao 5 loại bia tương ứng 5 giao dịch
 * xuất kho trong app.
 *
 * Cấu trúc file (đọc từ file thật, không phải phỏng đoán):
 *
 *   dòng tiêu đề   :  ... | Địa điểm | Note | BB | Ngày giao | Tên | <tổng>...
 *   dòng mã vật tư :                                              | 10168107 | 10174040 | ...
 *   dòng tên hàng  :                                              | Bia Golden Bridge ... | ...
 *   dòng dữ liệu   :  ... | BNC | BNC | đã có bbgn | 01.08.26 | NH 1901 | 432,6 | 412 | ...
 *
 * Cách dò không cứng nhắc theo số thứ tự dòng/cột, mà tìm theo dấu hiệu: dòng
 * nào có từ 3 ô mã vật tư 8 chữ số trở lên thì đó là dòng mã; các cột mô tả
 * tìm theo chữ trong tiêu đề. Nhờ vậy file tháng sau có xê dịch vài dòng vẫn
 * đọc được.
 *
 * TẠM CHƯA DÙNG. Màn hình nạp nay đọc thẳng tệp gốc của bộ phận qua
 * `tkhoXuat.ts` — bỏ được bước chuyển tệp về khuôn mẫu, mà chép tay là chỗ
 * sinh sai số. Giữ lại nguyên bộ đọc này cùng 46 test phòng khi bộ phận gửi
 * lại file dạng bảng chéo cũ.
 *
 * Tách khỏi component để chạy thử được: file mẫu do `buildBbgnTemplateRows`
 * dựng ra phải đọc lại được bằng `parseBbgnSheet` — hai thứ này mà lệch nhau
 * thì người dùng tải mẫu về, điền số, nạp lên và nhận lỗi.
 */

import { format, subDays } from "date-fns";
import type { Partner, Product } from "../types";

export interface BbgnDraft {
  /** yyyy-MM-dd */
  dateKey: string;
  partnerId: string;
  partnerName: string;
  productId: string;
  productName: string;
  quantity: number;
  /** Điểm nhận (NH 1901, Cầu Vàng...) — ghi vào ghi chú của giao dịch. */
  outlet: string;
  /** Cột Note trong file, chỉ giữ khi khác với địa điểm. */
  note: string;
}

/** Dòng đọc được từ file nhưng chưa biết thuộc đơn vị nào. */
export interface BbgnPendingRow {
  key: string;
  rawUnit: string;
  dateKey: string;
  outlet: string;
  note: string;
  items: { productId: string; productName: string; quantity: number }[];
}

export interface BbgnParseResult {
  sheetName: string;
  drafts: BbgnDraft[];
  pending: BbgnPendingRow[];
  unknownCodes: { code: string; name: string; rows: number }[];
  skippedRows: number;
}

/** Bỏ dấu, bỏ khoảng trắng thừa để so tên đơn vị cho khớp. */
export function normalizeBbgn(s: string): string {
  // \p{M} = dau thanh/dau mu tach ra sau khi normalize NFD
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Đọc ô ngày: có thể là Date, số sê-ri Excel, hoặc chuỗi dd.MM.yy. */
export function parseBbgnDateCell(cell: any): string | null {
  if (cell instanceof Date && !isNaN(+cell)) {
    return format(cell, "yyyy-MM-dd");
  }
  if (typeof cell === "number" && cell > 20000 && cell < 80000) {
    // Số sê-ri Excel tính từ 30/12/1899
    const ms = Math.round((cell - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(+d) ? null : format(d, "yyyy-MM-dd");
  }
  const text = String(cell || "").trim();
  const m = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!m) return null;
  const day = +m[1];
  const month = +m[2];
  let year = +m[3];
  if (year < 100) year += year < 70 ? 2000 : 1900;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toBbgnNumber(cell: any): number {
  if (typeof cell === "number") return cell;
  const text = String(cell ?? "").trim();
  if (!text) return 0;
  // File dùng dấu phẩy thập phân ở một số ô
  const n = Number(text.replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

/** Tra cứu dựng sẵn từ danh mục, truyền vào để hàm đọc không phụ thuộc React. */
export interface BbgnLookups {
  /** khoá = mã vật tư đã trim */
  productByCode: Map<string, Product>;
  /** khoá = tên hoặc mã SAP đã chuẩn hoá qua normalizeBbgn */
  partnerByName: Map<string, Partner>;
}

export function buildBbgnLookups(
  products: Product[],
  partners: Partner[],
): BbgnLookups {
  const productByCode = new Map<string, Product>();
  products.forEach((p) => {
    if (p.materialCode) productByCode.set(String(p.materialCode).trim(), p);
  });

  const partnerByName = new Map<string, Partner>();
  partners.forEach((p) => {
    partnerByName.set(normalizeBbgn(p.name), p);
    if (p.sapCode) partnerByName.set(normalizeBbgn(p.sapCode), p);
  });

  return { productByCode, partnerByName };
}

/** Đọc một sheet thành các dòng nháp; trả null nếu sheet không đúng dạng. */
export function parseBbgnSheet(
  rows: any[][],
  sheetName: string,
  lookups: BbgnLookups,
): BbgnParseResult | null {
  const { productByCode, partnerByName } = lookups;

  // 1. Tìm dòng mã vật tư: dòng nào có >= 3 ô là số 8 chữ số
  let codeRowIdx = -1;
  const limit = Math.min(rows.length, 12);
  for (let r = 0; r < limit; r++) {
    const hits = (rows[r] || []).filter((c) =>
      /^\d{8}$/.test(String(c ?? "").trim()),
    );
    if (hits.length >= 3) {
      codeRowIdx = r;
      break;
    }
  }
  if (codeRowIdx < 0) return null;

  const codeRow = rows[codeRowIdx] || [];
  const nameRow = rows[codeRowIdx + 1] || [];
  const codeCols: { col: number; code: string; name: string }[] = [];
  codeRow.forEach((c, i) => {
    const code = String(c ?? "").trim();
    if (/^\d{8}$/.test(code)) {
      codeCols.push({
        col: i,
        code,
        // Bỏ ký tự BOM lẫn trong tên hàng của file gốc
        name: String(nameRow[i] ?? "").replace(/﻿/g, "").trim(),
      });
    }
  });

  // 2. Tìm các cột mô tả trong những dòng phía trên
  const findCol = (...keywords: string[]): number => {
    for (let r = 0; r <= codeRowIdx; r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const text = normalizeBbgn(String(row[c] ?? ""));
        if (text && keywords.some((k) => text === k || text.startsWith(k))) {
          return c;
        }
      }
    }
    return -1;
  };

  const colUnit = findCol("dia diem");
  const colNote = findCol("note", "ghi chu");
  const colDate = findCol("ngay giao");
  const colOutlet = findCol("ten");

  if (colDate < 0) return null;

  // 3. Duyệt dữ liệu
  const drafts: BbgnDraft[] = [];
  const pending: BbgnPendingRow[] = [];
  const unknown = new Map<string, { name: string; rows: number }>();
  let skipped = 0;

  for (let r = codeRowIdx + 2; r < rows.length; r++) {
    const row = rows[r] || [];
    const dateKey = parseBbgnDateCell(row[colDate]);
    if (!dateKey) continue;

    const rawUnit = String(colUnit >= 0 ? row[colUnit] ?? "" : "").trim();
    const outlet = String(colOutlet >= 0 ? row[colOutlet] ?? "" : "").trim();
    const rawNote = String(colNote >= 0 ? row[colNote] ?? "" : "").trim();
    const note =
      normalizeBbgn(rawNote) === normalizeBbgn(rawUnit) ? "" : rawNote;

    const items: {
      productId: string;
      productName: string;
      quantity: number;
    }[] = [];

    for (const cc of codeCols) {
      const qty = toBbgnNumber(row[cc.col]);
      if (qty <= 0) continue;
      const product = productByCode.get(cc.code);
      if (!product) {
        const prev = unknown.get(cc.code);
        unknown.set(cc.code, { name: cc.name, rows: (prev?.rows || 0) + 1 });
        continue;
      }
      items.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
      });
    }

    if (!items.length) {
      skipped++;
      continue;
    }

    const partner = partnerByName.get(normalizeBbgn(rawUnit));
    if (partner) {
      items.forEach((it) =>
        drafts.push({
          dateKey,
          partnerId: partner.id,
          partnerName: partner.name,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          outlet,
          note,
        }),
      );
    } else {
      pending.push({ key: `r${r}`, rawUnit, dateKey, outlet, note, items });
    }
  }

  return {
    sheetName,
    drafts,
    pending,
    unknownCodes: Array.from(unknown.entries()).map(([code, v]) => ({
      code,
      name: v.name,
      rows: v.rows,
    })),
    skippedRows: skipped,
  };
}

/* ------------------------------------------------------------------------- *
 *                              FILE MẪU
 * ------------------------------------------------------------------------- */

/** Số cột mô tả nằm trước các cột bia trong file mẫu. */
const TEMPLATE_LEAD_COLS = 5;

export interface BbgnTemplate {
  /** Các dòng của sheet dữ liệu, dạng mảng-của-mảng. */
  rows: any[][];
  /** Các dòng của sheet hướng dẫn. */
  guideRows: any[][];
  /** Sản phẩm được đưa vào làm cột, theo đúng thứ tự cột. */
  columns: Product[];
  /** Độ rộng cột cho sheet dữ liệu. */
  colWidths: { wch: number }[];
}

/**
 * Dựng nội dung file mẫu từ danh mục thật.
 *
 * Bố cục phải giữ đúng ba điểm, vì `parseBbgnSheet` dò theo dấu hiệu chứ không
 * theo số thứ tự dòng cố định:
 *   1. Một dòng chứa từ 3 ô mã vật tư 8 chữ số  -> dòng mã
 *   2. Ngay dưới dòng mã là dòng tên hàng
 *   3. Các cột mô tả có tiêu đề "Địa điểm" / "Note" / "Ngày giao" / "Tên" nằm
 *      ở dòng phía trên dòng mã
 * Dữ liệu bắt đầu từ dòng thứ hai sau dòng mã.
 *
 * @param today mốc ngày để sinh dữ liệu mẫu (truyền vào để test cố định được)
 * @throws nếu danh mục chưa đủ 3 sản phẩm có mã vật tư
 */
export function buildBbgnTemplateRows(
  products: Product[],
  partners: Partner[],
  today: Date = new Date(),
): BbgnTemplate {
  const withCode = products.filter((p) => String(p.materialCode || "").trim());
  if (withCode.length < 3) {
    throw new Error(
      "Danh mục cần có ít nhất 3 sản phẩm đã điền mã vật tư mới dựng được file mẫu — hàm đọc dựa vào dòng mã vật tư để nhận ra bảng giao hàng.",
    );
  }

  const columns = withCode.slice(0, 6);
  // Ưu tiên đơn vị nhận hàng thật để cột "Địa điểm" khớp được ngay
  const buyers = partners.filter((p) => p.type !== "SUPPLIER");
  const unitA = buyers[0]?.name || "BNC";
  const unitB = buyers[1]?.name || unitA;

  const pad = (n: number) => Array(n).fill("");

  // Dòng 0: tiêu đề các cột mô tả. Thứ tự này quan trọng — findCol lấy ô ĐẦU
  // TIÊN khớp từ khoá, nên không đặt ô nào bắt đầu bằng "tên" trước cột Tên.
  const headerRow = ["Địa điểm", "Note", "BB", "Ngày giao", "Tên"];
  // Dòng 1: mã vật tư, để dạng chuỗi cho Excel khỏi đổi định dạng số
  const codeRow = [
    ...pad(TEMPLATE_LEAD_COLS),
    ...columns.map((p) => String(p.materialCode)),
  ];
  // Dòng 2: tên hàng, phải nằm ngay dưới dòng mã
  const nameRow = [
    ...pad(TEMPLATE_LEAD_COLS),
    ...columns.map((p) => p.name),
  ];

  const d = (back: number) => format(subDays(today, back), "dd.MM.yy");
  const qtyCols = (filled: (number | "")[]) => {
    const out = pad(columns.length);
    filled.slice(0, columns.length).forEach((v, i) => (out[i] = v));
    return out;
  };

  /** Dòng dữ liệu: ô nào không giao thì để trống, app tự bỏ qua. */
  const dataRow = (
    unit: string,
    note: string,
    date: string,
    outlet: string,
    filled: (number | "")[],
  ) => [unit, note, "đã có bbgn", date, outlet, ...qtyCols(filled)];

  const rows: any[][] = [
    headerRow,
    codeRow,
    nameRow,
    dataRow(unitA, "", d(2), "NH 1901", [432.6, 412]),
    dataRow(unitA, "", d(2), "Cầu Vàng", ["", 240, 48]),
    dataRow(unitB, "giao bù ngày 30", d(1), "Bia Beluga", [120, "", "", 96]),
    dataRow(unitB, "", d(0), "NH 1901", [200, 150]),
  ];

  const guideRows: any[][] = [
    ["CÁCH DÙNG FILE MẪU BBGN"],
    [""],
    ["Mỗi dòng ở sheet 'BBGN' là MỘT LẦN GIAO. Các loại bia nằm ngang thành"],
    ["cột; ô nào có số lượng thì app tạo một giao dịch xuất kho cho ô đó."],
    [""],
    ["Bốn cột mô tả:"],
    ["  Địa điểm   Đơn vị nhận hàng. Phải khớp tên (hoặc mã SAP) trong mục"],
    ["             Đối tác, nếu không app sẽ hỏi lại từng dòng."],
    ["  Note       Ghi chú thêm. Trùng với Địa điểm thì app tự bỏ."],
    ["  Ngày giao  Dạng dd.MM.yy (01.08.26). Dòng không có ngày bị bỏ qua."],
    ["  Tên        Điểm nhận (NH 1901, Cầu Vàng...), vào ghi chú giao dịch."],
    [""],
    ["Ba điều KHÔNG được đổi, vì app dò theo dấu hiệu chứ không theo số dòng:"],
    ["  1. Dòng mã vật tư phải có ít nhất 3 mã 8 chữ số."],
    ["  2. Dòng tên hàng phải nằm NGAY DƯỚI dòng mã vật tư."],
    ["  3. Tiêu đề bốn cột mô tả phải nằm PHÍA TRÊN dòng mã vật tư."],
    [""],
    ["Thêm loại bia mới: chèn cột, điền mã vật tư ở dòng mã và tên ở dòng tên."],
    ["Mã chưa có trong Danh mục sản phẩm thì app báo và bỏ qua cột đó."],
    [""],
    ["Cột nào không dùng cứ để trống. Nạp xong app hiện bảng xem trước, soát"],
    ["rồi mới bấm tạo."],
  ];

  return {
    rows,
    guideRows,
    columns,
    colWidths: [
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      ...columns.map(() => ({ wch: 16 })),
    ],
  };
}

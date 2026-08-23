/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐỌC PHẦN XUẤT KHO TRONG SHEET "T KHO" CỦA BỘ PHẬN
 *
 * Sheet này là BẢNG CHÉO BA CHIỀU, không phải danh sách dòng:
 *
 *                | Xuất kho ----------------------------------->
 *                | 01.08.26                      | 02.08.26         <- hàng NGÀY
 *   Mã   | Tên   | NH 1901 | LH BIA | MFV        | NH 4 MÙA | ...   <- hàng ĐIỂM BÁN
 *   10168107     |   400   |  120   |            |   288    |       <- số lượng
 *
 * Mỗi ô có số là MỘT lần xuất kho: (mặt hàng, ngày, điểm bán, số lượng).
 * Một sheet tháng ra khoảng 550 giao dịch.
 *
 * Ngày chỉ ghi ở cột ĐẦU của mỗi nhóm, các cột sau để trống — nên phải cho ngày
 * "lan" sang phải cho tới khi gặp ngày mới. Bỏ bước này thì chỉ cột đầu mỗi
 * nhóm có ngày, phần còn lại rơi hết vào một ngày duy nhất.
 *
 * KHÔNG dò theo số thứ tự dòng/cột cố định. Sheet mỗi tháng một chiều rộng khác
 * nhau (T8 rộng 397 cột) và số cột mỗi ngày cũng khác. Dò theo dấu hiệu: ô
 * "MÃ HÀNG" cho biết hàng tiêu đề, ô "Xuất kho" cho biết chỗ bắt đầu.
 *
 * Điểm bán thuộc đối tác nào thì tra ở `diemBan.ts` — bảng do người gán, ở đây
 * không đoán.
 */

import type { Product } from "../types";
import { lookupDiemBan, type DiemBanEntry } from "./diemBan";

/**
 * Một giao dịch xuất kho dựng từ một ô của bảng.
 *
 * Cùng hình dạng với `BbgnDraft` để dùng lại nguyên khâu ghi xuống của phần nạp
 * BBGN — khâu đó đã có chia lô FIFO, gộp nhóm theo ngày + đối tác và cảnh báo
 * xuất vượt tồn.
 */
export interface TkhoDraft {
  /** yyyy-MM-dd */
  dateKey: string;
  partnerId: string;
  productId: string;
  productName: string;
  quantity: number;
  /** Tên điểm bán như trong sheet — giữ lại để tra ngược. */
  outlet: string;
  /** Ghi chú lấy từ bảng gán điểm bán: "Ngoại giao", "HTKD", hoặc rỗng. */
  note: string;
  /**
   * Chỉ số CỘT trong sheet mà ô này nằm ở đó.
   *
   * Đây là danh tính của một CHUYẾN GIAO. Cùng một ngày, một điểm bán có thể
   * nhận hai chuyến và sheet ghi mỗi chuyến một cột — ví dụ "NH 1901" nằm ở
   * cả cột E lẫn cột M của ngày 21.08. Thiếu số cột thì hai chuyến đó không
   * phân biệt được với nhau, và app buộc phải gom chúng thành một đơn.
   *
   * Dùng để nhóm đơn và để đánh khoá tài liệu, nên phải giữ nguyên qua mọi
   * bước xử lý.
   */
  cot: number;
}

export interface TkhoUnknownOutlet {
  ten: string;
  /** Số ô có số lượng thuộc điểm bán này. */
  soO: number;
  soLuong: number;
}

export interface TkhoUnknownCode {
  code: string;
  ten: string;
  soLuong: number;
}

/** Đối chiếu tổng bảng chéo với cột "Tổng Xuất" mà chính sheet tự cộng. */
export interface TkhoTotalCheck {
  code: string;
  /** Cộng lại từ các ô trong bảng chéo. */
  tuBangCheo: number;
  /** Số ghi sẵn ở cột "Tổng Xuất". */
  tuCotTong: number;
  lech: number;
}

/**
 * Một dòng NHẬP dựng từ sheet: tồn đầu kỳ hoặc hàng nhập trong tháng.
 *
 * Nhập không có đối tác trong sheet — hàng từ nhà máy về, không phải mua của
 * ai. Nơi gọi gán đối tác nhà cung cấp.
 */
export interface TkhoNhapDraft {
  /** yyyy-MM-dd */
  dateKey: string;
  type: "OPENING" | "IN";
  productId: string;
  productName: string;
  quantity: number;
  /**
   * Số lô, sinh theo ngày nhập.
   *
   * BẮT BUỘC phải có: phép tính tồn theo lô bỏ qua mọi giao dịch không có số
   * lô, nên nhập mà thiếu lô thì hàng không vào tồn theo lô, và mọi dòng xuất
   * sau đó đều bị báo vượt tồn.
   */
  batchNumber: string;
}

export interface TkhoNhapResult {
  sheetName: string;
  drafts: TkhoNhapDraft[];
  /** Tháng của sheet, suy từ hàng ngày bên phần Xuất kho. */
  thang: { nam: number; thang: number } | null;
  /** Đối chiếu với cột "Tổng Nhập" mà chính sheet tự cộng. */
  totalChecks: TkhoTotalCheck[];
  tonDauCount: number;
  nhapCount: number;
}

export interface TkhoParseResult {
  sheetName: string;
  drafts: TkhoDraft[];
  /** Điểm bán chưa có trong bảng gán — KHÔNG dựng giao dịch, phải hỏi người dùng. */
  unknownOutlets: TkhoUnknownOutlet[];
  /** Mã vật tư không có trong danh mục sản phẩm. */
  unknownCodes: TkhoUnknownCode[];
  totalChecks: TkhoTotalCheck[];
  /** Số ô có số lượng nhưng cột đó không có ngày. */
  oThieuNgay: number;
  dateRange: { from: string; to: string } | null;
}

const S = (v: any): string => String(v ?? "").trim();

/** Bỏ dấu + ký tự lạ để so tiêu đề, không phân biệt hoa thường. */
const key = (v: any): string =>
  S(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");

/**
 * Đọc số kiểu Việt Nam.
 *
 * Ô trong sheet phần lớn đã là số thật, nhưng có ô là chuỗi "1.234,5" và có ô
 * mang rác dấu phẩy động (2719.2000000000003 — hệ quả phép cộng trong Excel).
 * Làm tròn 2 chữ số để rác đó không đi vào số lượng xuất kho.
 */
export function toTkhoNumber(cell: any): number {
  if (cell === null || cell === undefined || cell === "") return 0;
  if (typeof cell === "number")
    return Number.isFinite(cell) ? Math.round(cell * 100) / 100 : 0;

  let s = String(cell).trim().replace(/\s/g, "");
  if (!s) return 0;
  let am = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    am = true;
    s = s.slice(1, -1);
  }
  /*
   * Dấu chấm trong số Việt Nam là NGĂN NGHÌN, không phải thập phân.
   *
   *   "1.234,5"   -> 1234.5   (có phẩy: phẩy là thập phân, chấm là ngăn nghìn)
   *   "1.500"     -> 1500     (chấm + đúng 3 chữ số: ngăn nghìn)
   *   "432.6"     -> 432.6    (không phải bội của 3 chữ số: để nguyên)
   *
   * Đoán sai chỗ này thì "(1.500)" thành −1,5 — sai gấp nghìn lần mà con số
   * vẫn trông hợp lý. Test bắt được đúng ca này.
   */
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round((am ? -n : n) * 100) / 100;
}

/**
 * Đọc ngày kiểu "01.08.26" ở hàng tiêu đề ngày.
 *
 * Chịu được lỗi gõ thừa dấu chấm ("17..08.26" có thật trong file T8) và cả dạng
 * gạch chéo. Năm 2 chữ số quy về 20xx — sổ này bắt đầu từ 2025, không có dữ
 * liệu thế kỷ trước.
 */
export function parseTkhoDate(cell: any): string | null {
  const s = S(cell);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[.\/-]+(\d{1,2})[.\/-]+(\d{2,4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Đọc một sheet "T Kho" thành danh sách giao dịch xuất kho.
 *
 * `rows` là mảng hai chiều lấy từ `XLSX.utils.sheet_to_json(ws, { header: 1 })`.
 */
export function parseTkhoXuat(
  rows: any[][],
  sheetName: string,
  products: Product[],
  /** Bảng gán điểm bán. Bỏ trống thì dùng bảng gán sẵn trong code. */
  bangDiemBan?: Map<string, DiemBanEntry>,
): TkhoParseResult {
  const empty: TkhoParseResult = {
    sheetName,
    drafts: [],
    unknownOutlets: [],
    unknownCodes: [],
    totalChecks: [],
    oThieuNgay: 0,
    dateRange: null,
  };

  // --- Dò hàng tiêu đề bằng ô "MÃ HÀNG" -------------------------------
  let hRow = -1;
  let codeCol = -1;
  for (let r = 0; r < Math.min(rows.length, 12) && hRow < 0; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (key(row[c]) === "mahang") {
        hRow = r;
        codeCol = c;
        break;
      }
    }
  }
  if (hRow < 0) return empty;

  const rNgay = rows[hRow] || [];
  const rDiem = rows[hRow + 1] || [];
  // Bảng rút gọn không có hàng mốc phía trên tiêu đề.
  const rSection = hRow > 0 ? rows[hRow - 1] || [] : [];

  /*
   * CHỖ BẮT ĐẦU PHẦN XUẤT KHO — dò theo hai cách, không đòi cả hai.
   *
   * Sheet "T Kho" đầy đủ có cả phần Nhập kho ở bên trái, ngăn nhau bằng ô mốc
   * "Xuất kho". Lấy nhầm phần đó là ghi hàng nhập thành hàng xuất — tồn kho sai
   * gấp đôi theo hai chiều ngược nhau. Nên có mốc thì tin mốc.
   *
   * Nhưng bảng xuất kho rút gọn thì không có mốc nào, chỉ có mã / tên / ĐVT rồi
   * tới thẳng các cột ngày. Khi đó lấy cột đầu tiên mà hàng ngày đọc ra được
   * một ngày đầy đủ.
   *
   * Cách hai an toàn cả với sheet đầy đủ: hàng ngày bên phần Nhập kho chỉ ghi
   * số thứ tự ngày ("1", "2", "3"), không phải "01.08.26", nên không bao giờ
   * đọc ra ngày và không bao giờ bị nhận nhầm làm chỗ bắt đầu.
   */
  let start = -1;
  for (let c = 0; c < rSection.length; c++) {
    if (key(rSection[c]) === "xuatkho") {
      start = c;
      break;
    }
  }
  if (start < 0) {
    for (let c = codeCol + 1; c < rNgay.length; c++) {
      if (parseTkhoDate(rNgay[c])) {
        start = c;
        break;
      }
    }
  }
  if (start < 0) return empty;

  // Kết thúc ở cột "Cộng" nếu có
  let end = rNgay.length;
  for (let c = start + 1; c < rNgay.length; c++) {
    if (key(rNgay[c]) === "cong") {
      end = c;
      break;
    }
  }

  // --- Cột "Tổng Xuất" để đối chiếu ------------------------------------
  let tongXuatCol = -1;
  for (let c = 0; c < rDiem.length; c++) {
    if (key(rDiem[c]) === "tongxuat") {
      tongXuatCol = c;
      break;
    }
  }

  // --- Ngày lan sang phải ----------------------------------------------
  const ngayCua: (string | null)[] = [];
  let cur: string | null = null;
  for (let c = start; c < end; c++) {
    const d = parseTkhoDate(rNgay[c]);
    if (d) cur = d;
    ngayCua[c] = cur;
  }

  const byCode = new Map<string, Product>();
  products.forEach((p) => {
    if (p.materialCode) byCode.set(S(p.materialCode), p);
  });

  const drafts: TkhoDraft[] = [];
  const unknownOutlets = new Map<string, TkhoUnknownOutlet>();
  const unknownCodes = new Map<string, TkhoUnknownCode>();
  const totalChecks: TkhoTotalCheck[] = [];
  const ngayCoDuLieu = new Set<string>();
  let oThieuNgay = 0;

  for (let r = hRow + 2; r < rows.length; r++) {
    const row = rows[r] || [];
    const code = S(row[codeCol]);
    if (!/^\d{6,}$/.test(code)) continue;

    const product = byCode.get(code);
    let tuBangCheo = 0;

    for (let c = start; c < end; c++) {
      const qty = toTkhoNumber(row[c]);
      if (qty <= 0) continue;
      tuBangCheo += qty;

      const dateKey = ngayCua[c];
      if (!dateKey) {
        oThieuNgay++;
        continue;
      }

      if (!product) {
        const e = unknownCodes.get(code) || {
          code,
          ten: S(row[codeCol + 1]),
          soLuong: 0,
        };
        e.soLuong += qty;
        unknownCodes.set(code, e);
        continue;
      }

      const tenDiem = S(rDiem[c]);
      const diem = lookupDiemBan(tenDiem, bangDiemBan);
      if (!diem) {
        const k = key(tenDiem) || "(trong)";
        const e = unknownOutlets.get(k) || { ten: tenDiem, soO: 0, soLuong: 0 };
        e.soO++;
        e.soLuong += qty;
        unknownOutlets.set(k, e);
        continue;
      }

      ngayCoDuLieu.add(dateKey);
      drafts.push({
        dateKey,
        partnerId: diem.partnerId,
        productId: product.id,
        productName: product.name,
        quantity: qty,
        outlet: tenDiem,
        note: diem.note,
        cot: c,
      });
    }

    // Cột "Tổng Xuất" do chính sheet cộng. Lệch nghĩa là công thức trong sheet
    // hỏng — đã gặp thật ở T8: hai mã có số trong bảng mà cột tổng ghi 0. Báo
    // ra để người dùng biết, và vẫn tin bảng chéo vì đó mới là số chi tiết.
    if (tongXuatCol >= 0) {
      const tuCotTong = toTkhoNumber(row[tongXuatCol]);
      const lech = Math.round((tuBangCheo - tuCotTong) * 100) / 100;
      if (Math.abs(lech) > 1) {
        totalChecks.push({
          code,
          tuBangCheo: Math.round(tuBangCheo * 100) / 100,
          tuCotTong,
          lech,
        });
      }
    }
  }

  const ds = [...ngayCoDuLieu].sort();
  return {
    sheetName,
    drafts,
    unknownOutlets: [...unknownOutlets.values()].sort(
      (a, b) => b.soLuong - a.soLuong,
    ),
    unknownCodes: [...unknownCodes.values()].sort(
      (a, b) => b.soLuong - a.soLuong,
    ),
    totalChecks,
    oThieuNgay,
    dateRange: ds.length ? { from: ds[0], to: ds[ds.length - 1] } : null,
  };
}

/**
 * Đọc phần TỒN ĐẦU và NHẬP KHO của cùng sheet.
 *
 * Cấu trúc phần nhập đơn giản hơn phần xuất vì không có chiều điểm bán — hàng
 * từ nhà máy về, không phải mua của ai:
 *
 *   Tổng Nhập | Tổng Xuất | Tồn Đầu | 1 | 2 | 3 | ...   <- số ngày trong tháng
 *     17.116,8|         0 |  1.749,8|1644,9|2719,2| ...
 *
 * Hàng ngày ở đây chỉ ghi SỐ THỨ TỰ NGÀY chứ không ghi ngày đầy đủ, nên tháng
 * và năm phải lấy từ hàng ngày bên phần Xuất kho ("01.08.26").
 *
 * Vì sao phải đọc phần này: giao dịch xuất trừ tồn theo lô, mà lô chỉ sinh ra
 * từ giao dịch nhập. Chỉ nạp phần xuất thì mọi dòng đều báo vượt tồn.
 */
export function parseTkhoNhap(
  rows: any[][],
  sheetName: string,
  products: Product[],
): TkhoNhapResult {
  const empty: TkhoNhapResult = {
    sheetName,
    drafts: [],
    thang: null,
    totalChecks: [],
    tonDauCount: 0,
    nhapCount: 0,
  };

  let hRow = -1;
  let codeCol = -1;
  for (let r = 0; r < Math.min(rows.length, 12) && hRow < 0; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (key(row[c]) === "mahang") {
        hRow = r;
        codeCol = c;
        break;
      }
    }
  }
  if (hRow < 1) return empty;

  const rNgay = rows[hRow] || [];
  const rDiem = rows[hRow + 1] || [];
  const rSection = rows[hRow - 1] || [];

  // Tháng lấy từ ngày đầu tiên bên phần Xuất kho — phần nhập chỉ có số ngày.
  let thang: { nam: number; thang: number } | null = null;
  for (let c = 0; c < rNgay.length; c++) {
    const d = parseTkhoDate(rNgay[c]);
    if (d) {
      thang = { nam: Number(d.slice(0, 4)), thang: Number(d.slice(5, 7)) };
      break;
    }
  }
  if (!thang) return empty;

  // Vùng nhập nằm giữa mốc "Nhập Kho" và mốc "Xuất kho"
  let nhapStart = -1;
  let nhapEnd = rSection.length;
  for (let c = 0; c < rSection.length; c++) {
    const k = key(rSection[c]);
    if (k === "nhapkho" && nhapStart < 0) nhapStart = c;
    if (k === "xuatkho" && nhapStart >= 0) {
      nhapEnd = c;
      break;
    }
  }
  if (nhapStart < 0) return empty;

  let colTongNhap = -1;
  let colTonDau = -1;
  for (let c = 0; c < rDiem.length; c++) {
    const k = key(rDiem[c]);
    if (k === "tongnhap") colTongNhap = c;
    if (k === "tondau") colTonDau = c;
  }

  const byCode = new Map<string, Product>();
  products.forEach((p) => {
    if (p.materialCode) byCode.set(S(p.materialCode), p);
  });

  const hai = (n: number) => String(n).padStart(2, "0");
  const ngayCuaCot = (c: number): string | null => {
    const n = Number(S(rNgay[c]));
    if (!Number.isInteger(n) || n < 1 || n > 31) return null;
    return `${thang!.nam}-${hai(thang!.thang)}-${hai(n)}`;
  };
  const ngayDauThang = `${thang.nam}-${hai(thang.thang)}-01`;

  const drafts: TkhoNhapDraft[] = [];
  const totalChecks: TkhoTotalCheck[] = [];
  let tonDauCount = 0;
  let nhapCount = 0;

  for (let r = hRow + 2; r < rows.length; r++) {
    const row = rows[r] || [];
    const code = S(row[codeCol]);
    if (!/^\d{6,}$/.test(code)) continue;
    const product = byCode.get(code);
    if (!product) continue;

    // --- Tồn đầu kỳ ---
    if (colTonDau >= 0) {
      const q = toTkhoNumber(row[colTonDau]);
      if (q > 0) {
        drafts.push({
          dateKey: ngayDauThang,
          type: "OPENING",
          productId: product.id,
          productName: product.name,
          quantity: q,
          batchNumber: `TONDAU-${hai(thang.thang)}${String(thang.nam).slice(2)}`,
        });
        tonDauCount++;
      }
    }

    // --- Nhập theo ngày ---
    let tongNhap = 0;
    for (let c = nhapStart; c < nhapEnd; c++) {
      const q = toTkhoNumber(row[c]);
      if (q <= 0) continue;
      const dateKey = ngayCuaCot(c);
      if (!dateKey) continue;
      tongNhap += q;
      drafts.push({
        dateKey,
        type: "IN",
        productId: product.id,
        productName: product.name,
        quantity: q,
        batchNumber: `NK-${dateKey.slice(8)}${hai(thang.thang)}${String(thang.nam).slice(2)}`,
      });
      nhapCount++;
    }

    if (colTongNhap >= 0 && tongNhap > 0) {
      const tuCotTong = toTkhoNumber(row[colTongNhap]);
      const lech = Math.round((tongNhap - tuCotTong) * 100) / 100;
      if (Math.abs(lech) > 1) {
        totalChecks.push({
          code,
          tuBangCheo: Math.round(tongNhap * 100) / 100,
          tuCotTong,
          lech,
        });
      }
    }
  }

  return { sheetName, drafts, thang, totalChecks, tonDauCount, nhapCount };
}

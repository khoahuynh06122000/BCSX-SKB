/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐỊNH DẠNG CHUNG CHO MỌI TỆP EXCEL XUẤT TỪ APP
 *
 * VÌ SAO PHẢI CÓ TỆP NÀY: thư viện `xlsx` bản cộng đồng ĐỌC được màu và đường
 * kẻ nhưng KHÔNG GHI ra được — nó chỉ ghi bề rộng cột và định dạng số. Nên mọi
 * tệp app xuất ra trước giờ đều trắng trơn, không viền, không phân biệt được
 * hàng tiêu đề với hàng dữ liệu. Ở đây dùng `xlsx-js-style` (cùng một API, có
 * thêm thuộc tính `s` cho từng ô) để ghi được định dạng thật.
 *
 * BA NGUYÊN TẮC:
 *
 * 1. Kẻ ô toàn bảng. Bảng vài chục dòng số mà không có đường kẻ thì mắt trượt
 *    hàng, đọc số của dòng này tưởng của dòng kia.
 *
 * 2. Sọc ngựa vằn. Nền xám rất nhạt cho hàng chẵn — đủ để bám mắt theo hàng
 *    ngang, không đủ đậm để làm khó đọc khi in đen trắng.
 *
 * 3. Số phải căn phải và có dấu phân cách nghìn. Cột tiền căn trái là không
 *    so được hàng đơn vị với hàng chục nghìn.
 *
 * Bảng màu cố ý nhạt và ít màu: đây là chứng từ kế toán để đối chiếu, không
 * phải áp phích. Màu chỉ dùng để PHÂN VÙNG (tiêu đề, nhóm cột, dòng tổng),
 * không dùng để trang trí.
 */

import XLSX from "xlsx-js-style";

/** Bảng màu — hex không có dấu `#`, đúng kiểu của thư viện. */
export const MAU = {
  /** Xanh đậm của hàng tiêu đề. */
  tieuDe: "1F4E5F",
  chuTieuDe: "FFFFFF",
  /** Dải nhóm cột, nhạt hơn tiêu đề một bậc. */
  nhom: "2E7D8F",
  /** Nền hàng chẵn. */
  socNgua: "F5F7F9",
  /** Dòng tổng cuối bảng. */
  dongTong: "FFF4D6",
  /** Ô cần người điền hoặc cần chú ý. */
  canhBao: "FFE8CC",
  vien: "B7C4CC",
  chu: "1B2A33",
  chuMo: "5B6B75",
} as const;

const vienMong = { style: "thin" as const, color: { rgb: MAU.vien } };

/** Viền bốn cạnh, dùng cho mọi ô trong bảng. */
export const VIEN = {
  top: vienMong,
  bottom: vienMong,
  left: vienMong,
  right: vienMong,
};

/** Định dạng số tiền: phân cách nghìn, không phần lẻ. */
export const DINH_DANG_TIEN = "#,##0";
/** Số lượng: giữ tối đa 2 chữ số lẻ, không hiện `,00` thừa. */
export const DINH_DANG_SO_LUONG = "#,##0.##";
export const DINH_DANG_NGAY = "dd/mm/yyyy";

export interface KieuCot {
  /** Bề rộng cột, đơn vị ký tự. */
  rong: number;
  /** `tien` và `so` tự căn phải và gắn định dạng số. */
  kieu?: "chu" | "tien" | "so" | "giua";
}

/** Kiểu cho ô tiêu đề bảng. */
export function oTieuDe(nen: string = MAU.tieuDe) {
  return {
    font: { bold: true, sz: 10, color: { rgb: MAU.chuTieuDe } },
    fill: { patternType: "solid", fgColor: { rgb: nen } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: VIEN,
  };
}

/** Kiểu cho một ô dữ liệu. */
export function oDuLieu(cot: KieuCot, hangChan: boolean, dam = false) {
  const canPhai = cot.kieu === "tien" || cot.kieu === "so";
  return {
    font: { sz: 10, bold: dam, color: { rgb: MAU.chu } },
    fill: hangChan
      ? { patternType: "solid", fgColor: { rgb: MAU.socNgua } }
      : undefined,
    alignment: {
      horizontal: canPhai ? "right" : cot.kieu === "giua" ? "center" : "left",
      vertical: "center",
      wrapText: false,
    },
    border: VIEN,
  };
}

/** Kiểu cho dòng tổng ở cuối bảng. */
export function oDongTong(cot: KieuCot) {
  const canPhai = cot.kieu === "tien" || cot.kieu === "so";
  return {
    font: { sz: 10, bold: true, color: { rgb: MAU.chu } },
    fill: { patternType: "solid", fgColor: { rgb: MAU.dongTong } },
    alignment: {
      horizontal: canPhai ? "right" : cot.kieu === "giua" ? "center" : "left",
      vertical: "center",
    },
    border: VIEN,
  };
}

export interface BangDep {
  /** Tên cột hiển thị ở hàng tiêu đề. */
  tieuDe: string[];
  cot: KieuCot[];
  /** Mỗi phần tử là một hàng dữ liệu. */
  hang: (string | number | null)[][];
  /** Hàng tổng cuối bảng, nếu có. */
  dongTong?: (string | number | null)[];
  /** Dòng chữ đặt phía trên tiêu đề, ví dụ tên báo cáo và kỳ. */
  tieuDeTren?: string[];
}

/**
 * Dựng một sheet đã kẻ ô, tô màu, chỉnh bề rộng và khoá hàng tiêu đề.
 *
 * Tự chọn định dạng số theo `kieu` của từng cột, nên nơi gọi chỉ cần đưa số
 * thô — đừng tự định dạng thành chuỗi "1.234.567", vì chuỗi thì Excel không
 * cộng được và người nhận không lọc, không sắp xếp được.
 */
export function taoSheetDep(b: BangDep): XLSX.WorkSheet {
  const soCot = b.tieuDe.length;
  const tren = b.tieuDeTren ?? [];
  const ws: XLSX.WorkSheet = {};

  const dat = (c: number, r: number, v: any, t: "s" | "n", s: any, z?: string) => {
    const dc = XLSX.utils.encode_cell({ c, r });
    ws[dc] = z ? { t, v, s, z } : { t, v, s };
  };

  // --- Dòng tiêu đề phía trên (tên báo cáo, kỳ...) ---
  tren.forEach((chu, i) => {
    dat(0, i, chu, "s", {
      font: { bold: i === 0, sz: i === 0 ? 13 : 10, color: { rgb: MAU.chu } },
      alignment: { horizontal: "left", vertical: "center" },
    });
    // Ô trống còn lại của dòng: để trống thật, không kẻ viền cho thoáng.
    for (let c = 1; c < soCot; c++) {
      dat(c, i, "", "s", {});
    }
  });

  const rTieuDe = tren.length;

  b.tieuDe.forEach((chu, c) => dat(c, rTieuDe, chu, "s", oTieuDe()));

  b.hang.forEach((hang, i) => {
    const r = rTieuDe + 1 + i;
    const chan = i % 2 === 1;
    for (let c = 0; c < soCot; c++) {
      const cot = b.cot[c] ?? { rong: 12 };
      const v = hang[c];
      const kieuO = oDuLieu(cot, chan);
      if (typeof v === "number") {
        dat(c, r, v, "n", kieuO, dinhDangCua(cot));
      } else {
        dat(c, r, v == null ? "" : String(v), "s", kieuO);
      }
    }
  });

  if (b.dongTong) {
    const r = rTieuDe + 1 + b.hang.length;
    for (let c = 0; c < soCot; c++) {
      const cot = b.cot[c] ?? { rong: 12 };
      const v = b.dongTong[c];
      const kieuO = oDongTong(cot);
      if (typeof v === "number") dat(c, r, v, "n", kieuO, dinhDangCua(cot));
      else dat(c, r, v == null ? "" : String(v), "s", kieuO);
    }
  }

  const soHang = tren.length + 1 + b.hang.length + (b.dongTong ? 1 : 0);
  ws["!ref"] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: soCot - 1, r: Math.max(0, soHang - 1) },
  });
  ws["!cols"] = b.cot.map((c) => ({ wch: c.rong }));
  // Hàng tiêu đề cao hơn để chữ xuống dòng vẫn đọc được.
  ws["!rows"] = [
    ...tren.map(() => ({ hpt: 18 })),
    { hpt: 28 },
    ...b.hang.map(() => ({ hpt: 16 })),
  ];
  /*
   * KHÔNG khoá được hàng tiêu đề: `xlsx-js-style` không ghi ra thẻ `pane` của
   * Excel, nên đặt `!freeze` cũng không có tác dụng gì. Bù bằng bộ lọc ngay
   * hàng tiêu đề — có nó thì lọc và sắp xếp được, đỡ phải cuộn lên xem tên cột.
   */
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: rTieuDe },
      e: { c: soCot - 1, r: rTieuDe + b.hang.length },
    }),
  };
  return ws;
}

function dinhDangCua(cot: KieuCot): string | undefined {
  if (cot.kieu === "tien") return DINH_DANG_TIEN;
  if (cot.kieu === "so") return DINH_DANG_SO_LUONG;
  return undefined;
}

/**
 * Ước bề rộng cột theo nội dung dài nhất.
 *
 * Đặt tay từng cột thì mỗi lần đổi tên hàng lại phải chỉnh lại; đo theo nội
 * dung thì tự vừa. Chặn trên 46 để một ghi chú dài không kéo cột rộng hết màn
 * hình, và chặn dưới 8 để cột số không hẹp tới mức hiện `####`.
 */
export function doRongCot(
  tieuDe: string[],
  hang: (string | number | null)[][],
  min = 8,
  max = 46,
): number[] {
  return tieuDe.map((t, c) => {
    let dai = String(t ?? "").length;
    hang.forEach((h) => {
      const v = h[c];
      const n =
        typeof v === "number"
          ? Math.round(v).toLocaleString("vi-VN").length
          : String(v ?? "").length;
      if (n > dai) dai = n;
    });
    return Math.min(max, Math.max(min, dai + 2));
  });
}

export { XLSX as XLSXDep };

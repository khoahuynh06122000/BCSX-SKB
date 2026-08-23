/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GHI TỆP TEMPLATE RA .XLSX
 *
 * Tách khỏi `sapTemplate.ts` để phần dựng dòng còn chạy test được mà không
 * phải kéo theo thư viện Excel.
 *
 * Tệp phải TRÔNG GIỐNG tệp mẫu bộ phận gửi: năm hàng tiêu đề (dải nhóm, dải
 * nhóm con, mã trường, kiểu dữ liệu, tên tiếng Anh) rồi mới tới dữ liệu từ
 * hàng 6. Hệ thống bên kia đọc theo VỊ TRÍ HÀNG, nên thiếu một hàng tiêu đề là
 * lệch hết.
 *
 * TÔ MÀU VÀ KẺ Ô KHÔNG ĐỘNG TỚI GIÁ TRỊ. Tệp này để máy đọc, nên định dạng chỉ
 * thêm vào phần trình bày — mọi ô vẫn giữ đúng kiểu và đúng nội dung đã đối
 * chiếu khớp từng ô với tệp mẫu. Màu ở đây có việc thật: mỗi chứng từ tô một
 * vạch ngăn, dòng Nợ khác màu dòng Có, nên soát bằng mắt trước khi nạp lên hệ
 * thống thì thấy ngay chứng từ nào thiếu dòng.
 */

import XLSX from "xlsx-js-style";
import { MAU, VIEN } from "./excelDep";
import {
  KIEU_TRUONG_SAP,
  MA_TRUONG_SAP,
  TEN_TRUONG_SAP,
  type OSap,
  type TepSap,
} from "./sapTemplate";

/** Bề rộng cột, ước theo nội dung để mở ra đọc được ngay. */
const BE_RONG = [
  11, 11, 6, 7, 8, 9, 12, 28, 8, 13, 9, 12, 8, 15, 6, 14, 15, 15, 14, 15, 10,
  8, 11, 11, 13, 13, 30, 11, 8,
];

export function sheetTemplateSap(tep: TepSap): XLSX.WorkSheet {
  const aoa: (string | number | null)[][] = [];

  const hang0: (string | null)[] = new Array(29).fill(null);
  hang0[0] = "DOCUMENT HEADER";
  hang0[8] = "DOCUMENT LINE ITEM";
  aoa.push(hang0);

  const hang1: (string | null)[] = new Array(29).fill(null);
  hang1[8] = "ACCOUNT";
  hang1[13] = "DOCUMENT CURRENCY";
  hang1[17] = "LOCAL CURRENCY";
  hang1[20] = "PAYMENT/CASHFLOW";
  hang1[23] = "COPA OBJECTS";
  hang1[25] = "CO OBJECTS";
  aoa.push(hang1);

  aoa.push([...MA_TRUONG_SAP]);
  aoa.push(KIEU_TRUONG_SAP.map((v) => v || null));
  aoa.push([...TEN_TRUONG_SAP]);

  // Chừa chỗ cho dữ liệu, ghi giá trị ở vòng dưới để giữ đúng kiểu từng ô.
  tep.oDong.forEach(() => aoa.push(new Array(29).fill(null)));

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  /*
   * Ghi lại từng ô dữ liệu với ĐÚNG KIỂU.
   *
   * `aoa_to_sheet` đoán kiểu theo giá trị JavaScript, mà ngày ở đây là chuỗi
   * "23082026" — để nó tự đoán thì thành số và mất số 0 đứng đầu ở những ngày
   * mùng 1 đến mùng 9 ("01092026" → 1092026). Nên ép kiểu chuỗi và gắn định
   * dạng "@" (văn bản) đúng như tệp mẫu.
   */
  const vienDay = { style: "medium" as const, color: { rgb: MAU.vien } };

  // Mỗi chứng từ bắt đầu ở dòng Posting Key `01`. Đánh dấu để tô vạch ngăn.
  const cotBschl = 8;
  let chungTuChan = false;

  tep.oDong.forEach((dong, i) => {
    const r = i + 5;
    const laDongNo = String(dong[cotBschl]?.v) === "01";
    if (laDongNo) chungTuChan = !chungTuChan;

    dong.forEach((o: OSap, c) => {
      const dc = XLSX.utils.encode_cell({ c, r });
      const s: any = {
        font: {
          sz: 10,
          bold: laDongNo,
          color: { rgb: laDongNo ? MAU.tieuDe : MAU.chu },
        },
        fill: laDongNo
          ? { patternType: "solid", fgColor: { rgb: "E3EEF2" } }
          : chungTuChan
            ? undefined
            : { patternType: "solid", fgColor: { rgb: MAU.socNgua } },
        alignment: {
          horizontal: o.t === "n" ? "right" : "left",
          vertical: "center",
        },
        border: laDongNo ? { ...VIEN, top: vienDay } : VIEN,
      };

      if (o.t === "s") {
        // Ô trống vẫn phải có viền, không thì bảng thủng lỗ chỗ.
        ws[dc] = { t: "s", v: String(o.v), z: "@", s };
      } else {
        ws[dc] = {
          t: "n",
          v: Number(o.v),
          z: c === 27 ? "#,##0.###" : "#,##0",
          s,
        };
      }
    });
  });

  // Năm hàng tiêu đề: tô đậm dần từ dải nhóm xuống tên cột.
  const kieuTieuDe = (nen: string, dam = true, giua = true) => ({
    font: { bold: dam, sz: 9, color: { rgb: MAU.chuTieuDe } },
    fill: { patternType: "solid", fgColor: { rgb: nen } },
    alignment: {
      horizontal: giua ? "center" : "left",
      vertical: "center",
      wrapText: true,
    },
    border: VIEN,
  });
  for (let c = 0; c < 29; c++) {
    for (let r = 0; r < 5; r++) {
      const dc = XLSX.utils.encode_cell({ c, r });
      const cu = ws[dc];
      const nen =
        r === 0 ? "12333D" : r === 1 ? MAU.tieuDe : r === 2 ? MAU.nhom : "4E6E7A";
      ws[dc] = {
        t: "s",
        v: cu && cu.v != null ? String(cu.v) : "",
        s: kieuTieuDe(nen, r <= 2),
      };
    }
  }

  ws["!ref"] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: 28, r: 4 + tep.oDong.length },
  });

  ws["!merges"] = [
    { s: { c: 0, r: 0 }, e: { c: 7, r: 1 } },
    { s: { c: 8, r: 0 }, e: { c: 26, r: 0 } },
    { s: { c: 8, r: 1 }, e: { c: 12, r: 1 } },
    { s: { c: 13, r: 1 }, e: { c: 16, r: 1 } },
    { s: { c: 17, r: 1 }, e: { c: 19, r: 1 } },
    { s: { c: 20, r: 1 }, e: { c: 22, r: 1 } },
    { s: { c: 23, r: 1 }, e: { c: 24, r: 1 } },
  ];
  ws["!cols"] = BE_RONG.map((w) => ({ wch: w }));
  ws["!rows"] = [
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 30 },
    { hpt: 30 },
  ];
  // Khoá năm hàng tiêu đề: bảng dài vài chục dòng, cuộn xuống mà mất tên cột

  return ws;
}

export function taoWorkbookTemplateSap(tep: TepSap): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetTemplateSap(tep), "bia");
  return wb;
}

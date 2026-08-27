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
  NHOM_TRUONG_1,
  NHOM_TRUONG_2,
  SO_COT_SAP,
  TEN_TRUONG_SAP,
  type OSap,
  type TepSap,
} from "./sapTemplate";

/**
 * Bề rộng riêng cho những cột thật sự có dữ liệu; cột còn lại để hẹp.
 *
 * Tệp có 117 cột mà ta chỉ điền hai mươi mấy cột. Nới rộng hết thì mở ra phải
 * cuộn ngang cả màn hình mới thấy hết chỗ trống.
 */
const BE_RONG_THEO_TRUONG: Record<string, number> = {
  BLDAT: 11, BUDAT: 11, BLART: 6, BUKRS: 8, WAERS: 8, BUPLA: 9,
  BKTXT: 30, BSCHL: 8, HKONT: 13, WRBTR: 15, MWSKZ: 7, WMWST: 14,
  FWBAS: 15, DMBTR: 15, ZTERM: 8, ZFBDT: 11, COPA_KNDNR: 12,
  COPA_PRCTR: 13, PRCTR: 13, SGTXT: 30, MENGE: 11, MEINS: 8,
};
/** Bề rộng cho những cột không dùng tới. */
const BE_RONG_TRONG = 4;

export function sheetTemplateSap(tep: TepSap): XLSX.WorkSheet {
  const aoa: (string | number | null)[][] = [];

  // Năm hàng tiêu đề chép nguyên từ tệp mẫu, đủ 117 cột.
  const rong = (ds: string[]) => ds.map((v) => v || null);
  aoa.push(rong(NHOM_TRUONG_1));
  aoa.push(rong(NHOM_TRUONG_2));
  aoa.push(rong(MA_TRUONG_SAP));
  aoa.push(rong(KIEU_TRUONG_SAP));
  aoa.push(rong(TEN_TRUONG_SAP));

  // Chừa chỗ cho dữ liệu, ghi giá trị ở vòng dưới để giữ đúng kiểu từng ô.
  tep.oDong.forEach(() => aoa.push(new Array(SO_COT_SAP).fill(null)));

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
  for (let c = 0; c < SO_COT_SAP; c++) {
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
    e: { c: SO_COT_SAP - 1, r: 4 + tep.oDong.length },
  });

  /*
   * KHÔNG GỘP Ô Ở HÀNG TIÊU ĐỀ.
   *
   * Tệp mẫu có gộp, nhưng gộp chỉ để người đọc dễ nhìn. Ô gộp thì mọi ô trừ ô
   * đầu bị xoá giá trị, mà hệ thống nạp lên đọc từng ô theo vị trí — thà để
   * rời, đằng nào cũng đúng nội dung.
   */
  ws["!cols"] = MA_TRUONG_SAP.map((ma) => ({
    wch: BE_RONG_THEO_TRUONG[ma] ?? BE_RONG_TRONG,
  }));
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

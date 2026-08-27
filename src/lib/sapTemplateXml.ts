/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐIỀN DỮ LIỆU VÀO ĐÚNG TỆP MẪU, KHÔNG ĐỔI GÌ KHÁC
 *
 * Tệp mẫu bộ phận gửi (`src/assets/mau-template-sap.xlsx`) được dùng làm gốc.
 * Năm hàng tiêu đề, kẻ ô, tô màu, gộp ô, ghi chú, vùng in, khổ giấy, tên sheet
 * — tất cả giữ nguyên xi. Chỉ phần dữ liệu từ hàng 6 trở xuống bị thay.
 *
 * ĐỊNH DẠNG CỦA DÒNG DỮ LIỆU CŨNG LẤY TỪ TỆP MẪU. Tệp mẫu có hai kiểu dòng:
 * hàng 6 là dòng Nợ phải thu, hàng 7 là dòng Có. Hai kiểu tô khác nhau. Ở đây
 * đọc luôn mã định dạng của từng ô trong hai hàng ấy rồi dùng lại — nên không
 * có con số định dạng nào viết cứng trong mã, và tệp mẫu đổi cách tô thì tệp
 * xuất ra tự đổi theo.
 *
 * CHỮ ĐƯA VÀO BẢNG CHỮ DÙNG CHUNG, không dùng `inlineStr`. Excel đọc được cả
 * hai, nhưng vài thư viện đọc .xlsx bên hệ thống khác chỉ xử bảng chữ dùng
 * chung — mà tệp này sinh ra là để nạp lên hệ thống khác.
 *
 * BỎ `calcChain.xml`. Ô B của tệp mẫu là công thức `=A6`; ở đây ghi thẳng giá
 * trị ngày cho gọn. Giữ `calcChain` mà không còn công thức thì Excel báo tệp
 * hỏng, nên bỏ luôn cả phần khai báo của nó ở hai chỗ khác.
 */

import { MA_TRUONG_SAP, SO_COT_SAP, type OSap, type TepSap } from "./sapTemplate";

/** Hàng đầu tiên của dữ liệu trong tệp mẫu. */
export const HANG_DAU_DU_LIEU = 6;
/** Hàng mẫu cho dòng Nợ phải thu và cho dòng Có. */
const HANG_MAU_NO = 6;
const HANG_MAU_CO = 7;

/** Tên cột Excel theo chỉ số: 0 → A, 26 → AA. */
export function tenCot(i: number): string {
  let s = "";
  let n = i;
  for (;;) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return s;
}

const thoat = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Định dạng của một hàng mẫu: thuộc tính hàng và mã định dạng từng cột. */
interface HangMau {
  /** Phần thuộc tính của thẻ `<row ...>`, bỏ `r=`. */
  thuocTinh: string;
  /** Mã định dạng theo tên cột, ví dụ `{ A: "30", B: "30" }`. */
  kieuO: Record<string, string>;
}

function docHangMau(xml: string, hang: number): HangMau {
  const m = new RegExp(`<row r="${hang}"([^>]*)>([\\s\\S]*?)</row>`).exec(xml);
  if (!m) throw new Error(`Tệp mẫu thiếu hàng ${hang}.`);
  const thuocTinh = m[1].replace(/\s*spans="[^"]*"/, "");
  const kieuO: Record<string, string> = {};
  const re = /<c r="([A-Z]+)\d+"(?:\s+s="(\d+)")?/g;
  let c: RegExpExecArray | null;
  while ((c = re.exec(m[2]))) kieuO[c[1]] = c[2] ?? "";
  return { thuocTinh, kieuO };
}

/**
 * Dựng XML cho phần dữ liệu, cùng danh sách chữ mới phải thêm vào bảng chữ.
 *
 * Ô nào không có giá trị vẫn phải ghi ra dưới dạng `<c r=".." s=".."/>`: đúng
 * như tệp mẫu, và nhờ vậy ô trống vẫn giữ kẻ ô.
 */
function dungHangXml(
  tep: TepSap,
  mauNo: HangMau,
  mauCo: HangMau,
  soChuCoSan: number,
): { xml: string; chuMoi: string[] } {
  const chuMoi: string[] = [];
  const chiSoChu = new Map<string, number>();
  const maChu = (v: string) => {
    const co = chiSoChu.get(v);
    if (co !== undefined) return co;
    const i = soChuCoSan + chuMoi.length;
    chuMoi.push(v);
    chiSoChu.set(v, i);
    return i;
  };

  // Cột nào là khoá hạch toán, để biết dòng nào Nợ dòng nào Có.
  const cotBschl = MA_TRUONG_SAP.indexOf("BSCHL");
  let xml = "";
  tep.oDong.forEach((dong: OSap[], i) => {
    const hang = HANG_DAU_DU_LIEU + i;
    const laNo = String(dong[cotBschl]?.v ?? "") === "01";
    const mau = laNo ? mauNo : mauCo;
    let o = "";
    for (let c = 0; c < SO_COT_SAP; c++) {
      const ten = tenCot(c);
      const kieu = mau.kieuO[ten];
      const s = kieu ? ` s="${kieu}"` : "";
      const gt = dong[c];
      const v = gt?.v;
      if (v === undefined || v === null || v === "") {
        o += `<c r="${ten}${hang}"${s}/>`;
      } else if (gt.t === "n") {
        o += `<c r="${ten}${hang}"${s}><v>${v}</v></c>`;
      } else {
        o += `<c r="${ten}${hang}"${s} t="s"><v>${maChu(String(v))}</v></c>`;
      }
    }
    xml += `<row r="${hang}" spans="1:${SO_COT_SAP}"${mau.thuocTinh}>${o}</row>`;
  });
  return { xml, chuMoi };
}

export interface KetQuaSua {
  sheetXml: string;
  chuXml: string;
}

/**
 * Thay phần dữ liệu của sheet và thêm chữ mới vào bảng chữ dùng chung.
 *
 * Cập nhật luôn `dimension` và `autoFilter`: hai chỗ ấy ghi hàng cuối, để số cũ
 * thì Excel và bộ nạp bên kia đọc thừa hoặc thiếu hàng.
 */
export function suaSheetVaChu(
  sheetXml: string,
  chuXml: string,
  tep: TepSap,
): KetQuaSua {
  const mauNo = docHangMau(sheetXml, HANG_MAU_NO);
  const mauCo = docHangMau(sheetXml, HANG_MAU_CO);

  const mSo = /<sst([^>]*)uniqueCount="(\d+)"/.exec(chuXml);
  if (!mSo) throw new Error("Bảng chữ dùng chung của tệp mẫu không đọc được.");
  const soChuCoSan = Number(mSo[2]);

  const { xml, chuMoi } = dungHangXml(tep, mauNo, mauCo, soChuCoSan);

  // Giữ nguyên năm hàng tiêu đề, thay toàn bộ từ hàng 6 trở xuống.
  const dau = sheetXml.indexOf(`<row r="${HANG_DAU_DU_LIEU}"`);
  const cuoi = sheetXml.indexOf("</sheetData>");
  if (dau < 0 || cuoi < 0) throw new Error("Tệp mẫu không có phần dữ liệu.");
  let sheet = sheetXml.slice(0, dau) + xml + sheetXml.slice(cuoi);

  const hangCuoi = Math.max(
    HANG_DAU_DU_LIEU,
    HANG_DAU_DU_LIEU + tep.oDong.length - 1,
  );
  // CHỈ ĐỔI SỐ HÀNG, GIỮ NGUYÊN CHỮ CỘT CỦA TỆP MẪU. Tệp mẫu ghi
  // `dimension A1:DM45` nhưng `autoFilter A5:DL45` — vùng lọc hẹp hơn vùng dữ
  // liệu một cột. Tự tính lại chữ cột thì sửa cả cái mà bộ phận không nhờ sửa.
  const doiHangCuoi = (ref: string) =>
    ref.replace(/([A-Z]+)\d+$/, (_a, c) => `${c}${hangCuoi}`);
  sheet = sheet.replace(
    /<dimension ref="([^"]*)"\/>/,
    (_a, ref: string) => `<dimension ref="${doiHangCuoi(ref)}"/>`,
  );
  sheet = sheet.replace(
    /<autoFilter ref="([^"]*)"/,
    (_a, ref: string) => `<autoFilter ref="${doiHangCuoi(ref)}"`,
  );

  let chu = chuXml;
  if (chuMoi.length) {
    const them = chuMoi.map((v) => `<si><t>${thoat(v)}</t></si>`).join("");
    chu = chu.replace("</sst>", them + "</sst>");
    // `count` là tổng số lần dùng, `uniqueCount` là số chuỗi khác nhau. Excel
    // không đòi chính xác nhưng vài bộ đọc thì có, nên cộng cho đúng.
    chu = chu.replace(
      /<sst([^>]*)count="(\d+)"([^>]*)uniqueCount="(\d+)"/,
      (_a, t1, c1, t2, c2) =>
        `<sst${t1}count="${Number(c1) + chuMoi.length}"${t2}uniqueCount="${Number(c2) + chuMoi.length}"`,
    );
  }
  return { sheetXml: sheet, chuXml: chu };
}

/** Những mục phải bỏ khỏi tệp và hai chỗ khai báo chúng. */
export const MUC_BO = ["xl/calcChain.xml"];

export function boCalcChain(contentTypes: string, rels: string) {
  return {
    contentTypes: contentTypes.replace(
      /<Override[^>]*calcChain\.xml[^>]*\/>/g,
      "",
    ),
    rels: rels.replace(/<Relationship[^>]*calcChain\.xml[^>]*\/>/g, ""),
  };
}

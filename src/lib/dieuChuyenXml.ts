/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐIỀN DỮ LIỆU VÀO ĐÚNG TỆP MẪU ĐIỀU CHUYỂN
 *
 * Cùng cách đã dùng cho TEMPLATE SAP (`sapTemplateXml.ts`): mở tệp mẫu của bộ
 * phận ra, thay đúng phần dữ liệu, đóng lại — nên năm hàng tiêu đề, kẻ ô, tô
 * màu và độ rộng cột đều còn nguyên xi trong tệp xuất ra.
 *
 * Hai sheet hướng dẫn của tệp mẫu (Sheet3 giải thích 28 cột, Sheet4 bảng mã
 * kho) thì BỎ khỏi tệp xuất — chúng là tài liệu để viết tệp, không phải thứ đem
 * đi nạp. Xem `boSheetPhu` và `lamDepSheet` ở cuối tệp này.
 *
 * Cố ý KHÔNG dùng chung mã với `sapTemplateXml.ts`: tệp SAP có hai kiểu dòng
 * (Nợ và Có, hai cách tô khác nhau) còn tệp này chỉ có một, và tệp SAP điền đủ
 * 116 cột còn tệp này chỉ điền 16 trong 28 cột. Gộp lại thành một hàm nhận cấu
 * hình thì hàm ấy phải hiểu cả hai hình dạng, mà tệp SAP đã chạy đúng và đang
 * được kiểm bằng 46 phép kiểm — không đáng đổi rủi ro đó lấy sáu chục dòng.
 *
 * BỎ `calcChain.xml`. Tệp mẫu có 520 công thức trong sheet dữ liệu: cột B là
 * `=+A6`, cột E là `="ĐC Bia LHB "&LEFT(A6,5)`, cột Q là `=E6`. Ở đây ghi thẳng
 * giá trị cho gọn và chắc. Giữ `calcChain` mà không còn công thức thì Excel báo
 * tệp hỏng, nên bỏ luôn cả hai chỗ khai báo nó.
 */

import { SO_COT_DC, type ODc } from "./dieuChuyen";
import { kieuCuaCot, type KieuDep } from "./dieuChuyenKieu";
import { tenCot } from "./sapTemplateXml";

/** Hàng đầu tiên của dữ liệu trong tệp mẫu. */
export const HANG_DAU_DU_LIEU = 6;
/** Hàng lấy định dạng mẫu cho mọi dòng dữ liệu. */
const HANG_MAU = 6;

const thoat = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

interface HangMau {
  /** Phần thuộc tính của thẻ `<row ...>`, đã bỏ `r=` và `spans=`. */
  thuocTinh: string;
  /** Mã định dạng theo tên cột, chỉ gồm những cột hàng mẫu có. */
  kieuO: Record<string, string>;
}

/**
 * Đọc định dạng của hàng mẫu.
 *
 * Hàng mẫu của tệp này CHỈ CÓ 16 Ô trong 28 cột — những cột bộ phận không dùng
 * thì không có ô nào cả. Dựng ra 28 ô thì tệp xuất khác tệp mẫu, nên ở đây chỉ
 * ghi đúng những cột hàng mẫu có.
 */
function docHangMau(xml: string, hang: number): HangMau {
  const m = new RegExp(`<row r="${hang}"([^>]*)>(.*?)</row>`, "s").exec(xml);
  if (!m) throw new Error(`Tệp mẫu điều chuyển thiếu hàng ${hang}.`);
  const thuocTinh = m[1].replace(/\s*spans="[^"]*"/, "");
  const kieuO: Record<string, string> = {};
  const re = /<c r="([A-Z]+)\d+"(?:\s+s="(\d+)")?/g;
  let c: RegExpExecArray | null;
  while ((c = re.exec(m[2]))) kieuO[c[1]] = c[2] ?? "";
  return { thuocTinh, kieuO };
}

export interface KetQuaSuaDc {
  sheetXml: string;
  chuXml: string;
}

/**
 * Thay phần dữ liệu của sheet dữ liệu và thêm chữ mới vào bảng chữ dùng chung.
 *
 * Chữ đưa vào bảng chữ dùng chung chứ không dùng `inlineStr`: Excel đọc được cả
 * hai nhưng vài bộ đọc .xlsx chỉ xử bảng chữ dùng chung, mà tệp này sinh ra là
 * để nạp lên hệ thống khác.
 */
export function suaSheetVaChuDc(
  sheetXml: string,
  chuXml: string,
  oDong: ODc[][],
  /** Bộ kiểu mới; không truyền thì giữ nguyên kiểu của tệp mẫu. */
  kieu?: KieuDep,
  /** Dòng nào tô nền nhạt; không truyền thì so le theo từng dòng. */
  toNen?: boolean[],
): KetQuaSuaDc {
  const mau = docHangMau(sheetXml, HANG_MAU);

  const mSo = /<sst([^>]*)uniqueCount="(\d+)"/.exec(chuXml);
  if (!mSo) {
    throw new Error("Bảng chữ dùng chung của tệp mẫu điều chuyển không đọc được.");
  }
  const soChuCoSan = Number(mSo[2]);

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

  let xml = "";
  oDong.forEach((dong, i) => {
    const hang = HANG_DAU_DU_LIEU + i;
    let o = "";
    for (let c = 0; c < SO_COT_DC; c++) {
      const ten = tenCot(c);
      // Khi tô lại thì ghi ĐỦ 28 Ô, kể cả ô không có giá trị: ô trống vẫn phải
      // có kẻ viền và nền so le, không thì bảng hở 13 chỗ. Còn khi giữ nguyên
      // kiểu tệp mẫu thì giữ đúng hình dạng tệp mẫu — hàng mẫu chỉ có 16 ô.
      if (!kieu && !(ten in mau.kieuO)) continue;
      const maKieu = kieu
        ? String(kieuCuaCot(ten, kieu, toNen?.[i] ?? i % 2 === 1))
        : mau.kieuO[ten];
      const s = maKieu ? ` s="${maKieu}"` : "";
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
    // BỎ kiểu mặc định của hàng, không thay bằng kiểu khác: kiểu của hàng áp
    // cho mọi ô tới hết 16.384 cột, nên nền tràn qua cột AC. Từng ô đã có kiểu
    // riêng ở trên rồi. Nới chiều cao hàng cho chữ đỡ chật.
    const tt = kieu
      ? boKieuHang(mau.thuocTinh).replace(/\sht="[^"]*"/, ' ht="18"')
      : mau.thuocTinh;
    xml += `<row r="${hang}" spans="1:${SO_COT_DC}"${tt}${kieu ? ' customHeight="1"' : ""}>${o}</row>`;
  });

  const dau = sheetXml.indexOf(`<row r="${HANG_DAU_DU_LIEU}"`);
  const cuoi = sheetXml.indexOf("</sheetData>");
  if (dau < 0 || cuoi < 0) {
    throw new Error("Tệp mẫu điều chuyển không có phần dữ liệu.");
  }
  let sheet = sheetXml.slice(0, dau) + xml + sheetXml.slice(cuoi);

  // CHỈ ĐỔI SỐ HÀNG, giữ nguyên chữ cột của tệp mẫu. Tệp mẫu ghi dimension tới
  // hàng 108 nhưng vùng lọc chỉ tới 99 — lệch nhau sẵn, tự tính lại là sửa cả
  // cái bộ phận không nhờ sửa.
  const hangCuoi = Math.max(
    HANG_DAU_DU_LIEU,
    HANG_DAU_DU_LIEU + oDong.length - 1,
  );
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
    chu = chu.replace(
      /<sst([^>]*)count="(\d+)"([^>]*)uniqueCount="(\d+)"/,
      (_a, t1, c1, t2, c2) =>
        `<sst${t1}count="${Number(c1) + chuMoi.length}"${t2}uniqueCount="${Number(c2) + chuMoi.length}"`,
    );
  }
  return { sheetXml: sheet, chuXml: chu };
}

/** Những mục phải bỏ khỏi tệp. */
export const MUC_BO_DC = ["xl/calcChain.xml"];

export function boCalcChainDc(contentTypes: string, rels: string) {
  return {
    contentTypes: contentTypes.replace(
      /<Override[^>]*calcChain\.xml[^>]*\/>/g,
      "",
    ),
    rels: rels.replace(/<Relationship[^>]*calcChain\.xml[^>]*\/>/g, ""),
  };
}

/** Tên tệp tải về, có khoảng ngày để cất nhiều lần xuất cạnh nhau. */
export function tenTepDieuChuyen(tuNgay: string, denNgay: string): string {
  const tu = String(tuNgay ?? "").trim() || "dau";
  const den = String(denNgay ?? "").trim() || "nay";
  return `file dieu chuyen bia ${tu} den ${den}.xlsx`;
}

/* ===================================================================
 * BỎ HAI SHEET PHỤ VÀ CHỈNH PHẦN NHÌN
 *
 * Tệp mẫu có ba sheet: dữ liệu, Sheet3 giải thích 28 cột, Sheet4 bảng mã kho.
 * Hai sheet sau là tài liệu để người viết tệp tra, không phải thứ đem đi nạp —
 * người nhận tệp mở lên thấy ba tab thì phải đoán tab nào là thật.
 *
 * Phần chỉnh cho dễ nhìn CHỈ ĐỔI CÁCH HIỂN THỊ: ẩn hàng, ẩn cột, khoá dòng
 * tiêu đề. Không xoá hàng, không dồn cột, không đổi vị trí một ô nào — hệ thống
 * bên kia đọc theo vị trí nên đổi vị trí là tệp bị từ chối. Ẩn thì bấm bỏ ẩn
 * là thấy lại.
 * =================================================================== */

/** Mục ZIP của hai sheet phụ, phải bỏ khỏi tệp. */
export const SHEET_PHU = [
  "xl/worksheets/sheet2.xml",
  "xl/worksheets/sheet3.xml",
];

/** Hàng ẩn đi cho gọn: (4) là dòng số thứ tự cột, (5) là khối chữ hướng dẫn. */
const HANG_AN = [4, 5];

/**
 * Bỏ hai sheet phụ khỏi phần khai báo của tệp.
 *
 * `activeTab` phải kéo về 0: tệp mẫu đang mở sẵn tab thứ hai, bỏ tab đó đi mà
 * để nguyên số 1 thì Excel mở tệp lên báo lỗi.
 */
export function boSheetPhu(
  workbookXml: string,
  relsXml: string,
  contentTypes: string,
  appXml: string,
  /** Hàng cuối của dữ liệu, để sửa luôn vùng lọc khai trong workbook. */
  hangCuoi: number,
): {
  workbookXml: string;
  relsXml: string;
  contentTypes: string;
  appXml: string;
} {
  const mSheets = /<sheets>(.*?)<\/sheets>/s.exec(workbookXml);
  if (!mSheets) throw new Error("Tệp mẫu điều chuyển không có danh sách sheet.");
  const dsSheet = mSheets[1].match(/<sheet [^>]*\/>/g) ?? [];
  if (!dsSheet.length) throw new Error("Tệp mẫu điều chuyển không có sheet nào.");
  const giu = dsSheet[0];
  const bo = dsSheet.slice(1);
  const maBo = bo
    .map((t) => /r:id="(rId\d+)"/.exec(t)?.[1])
    .filter((x): x is string => !!x);

  let wb = workbookXml.replace(mSheets[0], `<sheets>${giu}</sheets>`);
  wb = wb.replace(/(<workbookView[^>]*?)\sactiveTab="\d+"/, "$1");

  // Workbook khai vùng lọc riêng một chỗ nữa (`_FilterDatabase`), tệp mẫu ghi
  // tới hàng 99. Để lệch với vùng lọc trong sheet thì Excel có thể báo tệp cần
  // sửa khi mở lên.
  wb = wb.replace(
    /(<definedName name="[^"]*_FilterDatabase"[^>]*>[^<]*\$)\d+(<\/definedName>)/,
    `$1${hangCuoi}$2`,
  );

  let rels = relsXml;
  maBo.forEach((id) => {
    rels = rels.replace(
      new RegExp(`<Relationship[^>]*Id="${id}"[^>]*/>`, "g"),
      "",
    );
  });

  let ct = contentTypes;
  SHEET_PHU.forEach((ten) => {
    ct = ct.replace(
      new RegExp(`<Override[^>]*PartName="/${ten}"[^>]*/>`, "g"),
      "",
    );
  });

  // `app.xml` liệt kê tên các sheet. Để nguyên ba tên trong khi tệp còn một
  // sheet thì Excel vẫn mở được nhưng phần thông tin tệp hiện sai.
  const tenGiu = /name="([^"]*)"/.exec(giu)?.[1] ?? "";
  let app = appXml.replace(
    /<TitlesOfParts>.*?<\/TitlesOfParts>/s,
    `<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>${tenGiu}</vt:lpstr></vt:vector></TitlesOfParts>`,
  );
  app = app.replace(
    /(<vt:variant><vt:lpstr>Worksheets<\/vt:lpstr><\/vt:variant><vt:variant><vt:i4>)\d+(<\/vt:i4>)/,
    "$11$2",
  );

  return { workbookXml: wb, relsXml: rels, contentTypes: ct, appXml: app };
}

/**
 * Bỏ kiểu mặc định của một hàng.
 *
 * Kiểu đặt ở thẻ `<row>` áp cho MỌI Ô của hàng, tới hết 16.384 cột — nên nền
 * của nó tràn qua cột AC và chạy hết màn hình. Tệp mẫu cũng đang bị vậy: hàng
 * dữ liệu mang `s="8"` là kiểu có nền xanh nhạt. Bỏ đi thì ngoài vùng dữ liệu
 * trở lại trắng trơn, không kẻ không tô.
 */
function boKieuHang(thuocTinh: string): string {
  return thuocTinh
    .replace(/\ss="\d+"/, "")
    .replace(/\scustomFormat="1"/, "");
}

/**
 * Chỉnh phần nhìn của sheet dữ liệu.
 *
 * Ba việc, toàn bộ là hiển thị:
 *   · Mở tệp lên nhìn thấy ô A1. Tệp mẫu lưu sẵn `topLeftCell="O1"` nên mở ra
 *     là màn hình đã nhảy sang giữa bảng, tưởng tệp trống.
 *   · Khoá năm hàng tiêu đề để cuộn xuống vẫn biết cột nào là cột gì.
 *   · Ẩn hàng số thứ tự cột và khối chữ hướng dẫn cao 78pt.
 *
 * KHÔNG ẩn cột nào, kể cả 13 cột luôn để trống: bộ phận cần thấy đủ 28 cột để
 * đối chiếu với bảng mô tả trường, và cột ẩn thì lúc kiểm tệp không ai biết là
 * nó vẫn ở đó.
 */
export function lamDepSheet(
  sheetXml: string,
  /** Bộ kiểu mới; không truyền thì chỉ ẩn hàng, không tô lại. */
  kieu?: KieuDep,
): string {
  let x = sheetXml;

  // Tô lại BA HÀNG TIÊU ĐỀ. Tệp mẫu để nền vàng chóe với ba họ phông lẫn nhau;
  // hai hàng ẩn (4 và 5) thì không tô, tô cũng không ai thấy.
  if (kieu) {
    // Đặt kiểu cho TỪNG Ô, không đặt cho cả hàng: kiểu của hàng áp cho mọi ô
    // tới hết 16.384 cột, nên nền đậm tràn qua cột AC và chạy hết màn hình.
    const toHang = (hang: number, ma: number) => {
      x = x.replace(
        new RegExp(`<row r="${hang}"([^>]*)>(.*?)</row>`, "s"),
        (_a, tt: string, ruot: string) =>
          `<row r="${hang}"${boKieuHang(tt)}>` +
          `${ruot.replace(/ s="\d+"/g, ` s="${ma}"`)}</row>`,
      );
    };
    toHang(1, kieu.tieuDeChinh);
    toHang(2, kieu.tieuDePhu);
    toHang(3, kieu.tieuDeViet);
  }

  x = x.replace(
    /<sheetViews>.*?<\/sheetViews>/s,
    '<sheetViews><sheetView tabSelected="1" workbookViewId="0">' +
      `<pane ySplit="${HANG_DAU_DU_LIEU - 1}" topLeftCell="A${HANG_DAU_DU_LIEU}" activePane="bottomLeft" state="frozen"/>` +
      `<selection pane="bottomLeft" activeCell="A${HANG_DAU_DU_LIEU}" sqref="A${HANG_DAU_DU_LIEU}"/>` +
      "</sheetView></sheetViews>",
  );

  HANG_AN.forEach((r) => {
    x = x.replace(
      new RegExp(`<row r="${r}"((?:(?!hidden=)[^>])*)>`),
      `<row r="${r}"$1 hidden="1">`,
    );
  });

  return x;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BỘ ĐỊNH DẠNG RIÊNG CHO TỆP ĐIỀU CHUYỂN
 *
 * Tệp mẫu của bộ phận có 90 kiểu ô, gom từ nhiều lần sửa tay của nhiều người:
 * nền vàng chóe `FFFFB400`, nền vàng nhạt `FFFFFF99`, nền xanh `FF8EA9DB`, chữ
 * đỏ, chữ tím `FF7030A0`, ba họ phông lẫn nhau (Aptos Narrow, Arial, Times New
 * Roman), kẻ ô thì chỗ có chỗ không. Dùng lại nguyên bộ ấy thì tệp xuất ra nhìn
 * đúng như thế.
 *
 * Ở đây THÊM kiểu mới vào bảng kiểu rồi dùng kiểu mới, không sửa 90 kiểu cũ:
 * sửa kiểu cũ là đổi cả những ô ta không đụng tới, mà kiểu nào đang dùng ở đâu
 * thì không có cách nào biết chắc.
 *
 * BẢNG MÀU lấy đúng bảng màu của app cho khớp với màn hình người dùng vẫn xem:
 *
 *   FF0F172A  xanh đen — nền hàng tiêu đề chính
 *   FFE2E8F0  xám nhạt — nền hai hàng tiêu đề phụ
 *   FFF8FAFC  gần trắng — nền dòng chẵn, để mắt lần theo dòng không bị lạc
 *   FFCBD5E1  xám — kẻ ô
 *   FF0F172A  xanh đen — chữ dữ liệu
 *   FF64748B  xám — chữ hàng tiêu đề phụ
 *
 * Định dạng KHÔNG ảnh hưởng tới việc nạp tệp: hệ thống bên kia đọc giá trị và
 * vị trí ô, không đọc màu. Nên phần này đổi thoải mái, còn vị trí thì không.
 */

/** Chỉ số của những kiểu ô mới, tính ra sau khi thêm vào bảng kiểu. */
export interface KieuDep {
  /** Hàng 1 — tiêu đề tiếng Anh, nền đậm chữ trắng. */
  tieuDeChinh: number;
  /** Hàng 2 — dòng R/O và mã trường, chữ nhỏ mờ. */
  tieuDePhu: number;
  /** Hàng 3 — tiêu đề tiếng Việt, chữ đậm trên nền nhạt. */
  tieuDeViet: number;
  /** Ô chữ căn trái (tiêu đề chứng từ). */
  chuTrai: number;
  /** Ô căn giữa (ngày, mã cố định, mã vật tư). */
  giua: number;
  /**
   * Ô số lượng — căn phải, để dạng General.
   *
   * Không gán mã định dạng số: bộ phận yêu cầu để General. Tệp mẫu đang gán
   * `0.000` nên 61,8 hiện thành 61,800; General thì hiện đúng con số đã ghi.
   */
  soLuong: number;
  /** Ô mã kho nhận hàng — in đậm vì đây là chỗ sai thì chuyển sai kho. */
  nhanManh: number;
  /** Bốn kiểu trên, bản dùng cho dòng chẵn (có nền nhạt). */
  chuTraiChan: number;
  giuaChan: number;
  soLuongChan: number;
  nhanManhChan: number;
}

const F = {
  dam: "FF0F172A",
  nhat: "FFE2E8F0",
  chan: "FFF8FAFC",
  vien: "FFCBD5E1",
  chu: "FF0F172A",
  chuMo: "FF64748B",
  trang: "FFFFFFFF",
};

function demTrong(xml: string, tag: string): number {
  const m = new RegExp(`<${tag} count="(\\d+)"`).exec(xml);
  if (!m) throw new Error(`Bảng kiểu không có phần ${tag}.`);
  return Number(m[1]);
}

/** Thêm một khối con vào cuối một phần của bảng kiểu, và cộng lại số đếm. */
function themVao(xml: string, tag: string, them: string, soThem: number): string {
  const cu = demTrong(xml, tag);
  return xml
    .replace(new RegExp(`<${tag} count="${cu}"`), `<${tag} count="${cu + soThem}"`)
    .replace(new RegExp(`</${tag}>`), `${them}</${tag}>`);
}

/**
 * Thêm bộ kiểu mới vào bảng kiểu, trả về bảng kiểu mới và chỉ số từng kiểu.
 *
 * Chỉ số phải tính từ số đếm hiện có chứ không viết cứng: bộ phận sửa tệp mẫu
 * thêm một kiểu là mọi chỉ số viết cứng trỏ sai, và trỏ sai kiểu thì ô lấy màu
 * của kiểu khác — nhìn ra ngay nhưng không ai biết vì sao.
 */
export function themKieuDep(stylesXml: string): {
  stylesXml: string;
  kieu: KieuDep;
} {
  let x = stylesXml;

  const soPhong = demTrong(x, "fonts");
  const soNen = demTrong(x, "fills");
  const soVien = demTrong(x, "borders");
  const soKieu = demTrong(x, "cellXfs");

  // --- Phông ---
  const phong = {
    trangDam: soPhong,
    mo: soPhong + 1,
    thuong: soPhong + 2,
    dam: soPhong + 3,
  };
  x = themVao(
    x,
    "fonts",
    `<font><b/><sz val="10"/><color rgb="${F.trang}"/><name val="Calibri"/><family val="2"/></font>` +
      `<font><sz val="8"/><color rgb="${F.chuMo}"/><name val="Calibri"/><family val="2"/></font>` +
      `<font><sz val="10"/><color rgb="${F.chu}"/><name val="Calibri"/><family val="2"/></font>` +
      `<font><b/><sz val="10"/><color rgb="${F.chu}"/><name val="Calibri"/><family val="2"/></font>`,
    4,
  );

  // --- Nền ---
  const nen = { dam: soNen, nhat: soNen + 1, chan: soNen + 2 };
  const oNen = (rgb: string) =>
    `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
  x = themVao(x, "fills", oNen(F.dam) + oNen(F.nhat) + oNen(F.chan), 3);

  // --- Kẻ ô: một kiểu viền mảnh cho cả bảng ---
  const vien = soVien;
  const canh = ["left", "right", "top", "bottom"]
    .map((c) => `<${c} style="thin"><color rgb="${F.vien}"/></${c}>`)
    .join("");
  x = themVao(x, "borders", `<border>${canh}<diagonal/></border>`, 1);

  // --- Kiểu ô ---
  const xf = (
    fontId: number,
    fillId: number,
    numFmtId: number,
    ngang: string,
    boc = false,
  ) =>
    `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${vien}" xfId="0"` +
    ` applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">` +
    `<alignment horizontal="${ngang}" vertical="center"${boc ? ' wrapText="1"' : ""}/></xf>`;

  const kieu: KieuDep = {
    tieuDeChinh: soKieu,
    tieuDePhu: soKieu + 1,
    tieuDeViet: soKieu + 2,
    chuTrai: soKieu + 3,
    giua: soKieu + 4,
    soLuong: soKieu + 5,
    nhanManh: soKieu + 6,
    chuTraiChan: soKieu + 7,
    giuaChan: soKieu + 8,
    soLuongChan: soKieu + 9,
    nhanManhChan: soKieu + 10,
  };

  x = themVao(
    x,
    "cellXfs",
    [
      xf(phong.trangDam, nen.dam, 0, "center", true),
      xf(phong.mo, nen.nhat, 0, "center", true),
      xf(phong.dam, nen.nhat, 0, "center", true),
      // Dòng lẻ để nền trắng (fillId 0), dòng chẵn dùng nền nhạt.
      xf(phong.thuong, 0, 0, "left"),
      xf(phong.thuong, 0, 0, "center"),
      xf(phong.thuong, 0, 0, "right"),
      xf(phong.dam, 0, 0, "center"),
      xf(phong.thuong, nen.chan, 0, "left"),
      xf(phong.thuong, nen.chan, 0, "center"),
      xf(phong.thuong, nen.chan, 0, "right"),
      xf(phong.dam, nen.chan, 0, "center"),
    ].join(""),
    11,
  );

  return { stylesXml: x, kieu };
}

/**
 * Kiểu ô cho từng cột của một dòng dữ liệu.
 *
 * `chan` là dòng thứ hai, thứ tư... tính từ dòng dữ liệu đầu. Nền nhạt so le
 * giúp mắt lần từ cột ngày sang cột mã kho nhận mà không nhảy sang dòng khác —
 * tệp có 28 cột nên rất dễ nhảy dòng.
 */
export function kieuCuaCot(cot: string, kieu: KieuDep, chan: boolean): number {
  // Mã kho nhận hàng: in đậm. Sai ba ô này là bia vào kho quán khác.
  if (cot === "Z" || cot === "AA" || cot === "AB") {
    return chan ? kieu.nhanManhChan : kieu.nhanManh;
  }
  if (cot === "K") return chan ? kieu.soLuongChan : kieu.soLuong;
  // Tiêu đề chứng từ là câu chữ, căn trái mới đọc được.
  if (cot === "E" || cot === "Q") {
    return chan ? kieu.chuTraiChan : kieu.chuTrai;
  }
  return chan ? kieu.giuaChan : kieu.giua;
}

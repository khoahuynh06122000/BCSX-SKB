/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SOÁT ẢNH — hỏi từng tấm, gom theo MÃ TRẢ VỀ THẬT của máy chủ ảnh.
 *
 * Ô ảnh không hiện có ba nguyên nhân khác hẳn nhau, xử lý ba kiểu:
 *   404       tệp đã bị xoá khỏi Cloudinary — phải tìm lại tờ giấy
 *   429       bị chặn tạm vì hỏi dồn — đợi rồi thử lại, ảnh còn nguyên
 *   403/420   tài khoản Cloudinary hết hạn mức / bị khoá — xử lý ở trang quản trị
 */

export type NhomMa = "duoc" | "mat" | "chan-tam" | "het-han-muc" | "may-chu-loi" | "khong-hoi-duoc" | "khac";

export function nhomCuaMa(ma: number): NhomMa {
  const m = Math.trunc(Number(ma) || 0);
  if (m >= 200 && m < 300) return "duoc";
  if (m === 0) return "khong-hoi-duoc";
  if (m === 404 || m === 410) return "mat";
  if (m === 429) return "chan-tam";
  if (m === 403 || m === 420) return "het-han-muc";
  if (m >= 500) return "may-chu-loi";
  return "khac";
}

export const TEN_NHOM: Record<NhomMa, string> = {
  duoc: "Tải được",
  mat: "Tệp không còn trên Cloudinary (404)",
  "chan-tam": "Bị chặn tạm vì hỏi dồn (429)",
  "het-han-muc": "Tài khoản ảnh từ chối — hết hạn mức hoặc bị khoá (403/420)",
  "may-chu-loi": "Máy chủ ảnh đang lỗi (5xx)",
  "khong-hoi-duoc": "Không hỏi tới máy chủ được (mạng)",
  khac: "Mã lạ",
};

export interface KetQuaMotTam {
  url: string;
  date: string;
  donVi: string;
  ma: number;
  loi: string;
}

export interface DongDem {
  ten: string;
  tong: number;
  hong: number;
}

export interface TomTatSoat {
  tong: number;
  hong: number;
  theoNhom: DongDem[];
  theoThang: DongDem[];
  theoDonVi: DongDem[];
  hongChiTiet: KetQuaMotTam[];
}

function dem(ds: readonly KetQuaMotTam[], khoa: (k: KetQuaMotTam) => string, theoTen: boolean): DongDem[] {
  const m = new Map<string, DongDem>();
  ds.forEach((k) => {
    const ten = khoa(k) || "(không rõ)";
    const o = m.get(ten) ?? { ten, tong: 0, hong: 0 };
    o.tong++;
    if (nhomCuaMa(k.ma) !== "duoc") o.hong++;
    m.set(ten, o);
  });
  const ra = [...m.values()];
  return theoTen ? ra.sort((a, b) => a.ten.localeCompare(b.ten)) : ra.sort((a, b) => b.hong - a.hong || b.tong - a.tong);
}

export function tomTatSoat(ds: readonly KetQuaMotTam[]): TomTatSoat {
  const hong = ds.filter((k) => nhomCuaMa(k.ma) !== "duoc");
  return {
    tong: ds.length,
    hong: hong.length,
    theoNhom: dem(ds, (k) => TEN_NHOM[nhomCuaMa(k.ma)], false),
    theoThang: dem(ds, (k) => k.date.slice(0, 7), true),
    theoDonVi: dem(ds, (k) => k.donVi, false),
    hongChiTiet: hong,
  };
}

/** Một câu nói thẳng phải làm gì. */
export function nhanDinh(t: TomTatSoat): string {
  if (!t.tong) return "Không có tấm nào để soát.";
  if (!t.hong) return `Cả ${t.tong} tấm đều tải được. Không mất tấm nào.`;
  const dau = `${t.hong}/${t.tong} tấm không tải được. `;
  const nhieuNhat = t.theoNhom.filter((d) => d.ten !== TEN_NHOM.duoc && d.hong > 0)[0]?.ten;
  if (nhieuNhat === TEN_NHOM.mat) return `${dau}Phần lớn là tệp ĐÃ BỊ XOÁ khỏi Cloudinary — app không lấy lại được, phải tìm lại tờ giấy.`;
  if (nhieuNhat === TEN_NHOM["chan-tam"]) return `${dau}Phần lớn là BỊ CHẶN TẠM. Ảnh còn nguyên — soát lại sau vài phút.`;
  if (nhieuNhat === TEN_NHOM["het-han-muc"]) return `${dau}Cloudinary TỪ CHỐI — thường là hết hạn mức tháng. Ảnh còn nguyên; xử lý ở trang quản trị Cloudinary.`;
  if (nhieuNhat === TEN_NHOM["may-chu-loi"]) return `${dau}Máy chủ ảnh đang lỗi. Ảnh còn nguyên, đợi rồi soát lại.`;
  return `${dau}Xem bảng theo nguyên nhân ở dưới.`;
}

/** Bản chữ để sao chép gửi đi. */
export function baoCao(t: TomTatSoat): string {
  const bang = (ten: string, ds: DongDem[]) => [`## ${ten}`, ...ds.map((d) => `${d.ten}: hỏng ${d.hong}/${d.tong}`)].join("\n");
  return [
    `SOÁT ẢNH — ${t.hong}/${t.tong} tấm không tải được`,
    nhanDinh(t),
    bang("Theo nguyên nhân", t.theoNhom),
    bang("Theo tháng", t.theoThang),
    bang("Theo đơn vị", t.theoDonVi),
    t.hongChiTiet.length
      ? ["## Tấm hỏng", ...t.hongChiTiet.slice(0, 200).map((k) => `${k.date.slice(0, 10)} · ${k.donVi} · ${k.ma}${k.loi ? ` (${k.loi})` : ""} · ${k.url}`)].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

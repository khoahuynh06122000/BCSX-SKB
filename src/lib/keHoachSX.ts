/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KẾ HOẠCH SẢN XUẤT THEO TỪNG MÃ BIA — phần tính thuần.
 *
 * Giám sát xưởng lập kế hoạch cho một ngày: mỗi mã bia một dòng (sản lượng,
 * ghi chú). Bộ phận sản xuất chiết bia theo đúng các dòng đó. KHÔNG có mã lô:
 * kế hoạch chỉ nói bia nào, bao nhiêu — mã lô chỉ có khi chiết thực tế (ghi
 * trên phiếu bàn giao), vì chiết theo nhu cầu (anh Khoa 20/11/2026).
 * Lập bằng lưới trên app hoặc nạp file Excel theo mẫu tải từ app.
 *
 * CHỐNG TRÙNG BẰNG KHOÁ NỘI DUNG: mỗi (ngày × mặt hàng) đúng MỘT bản ghi, id
 * `kh-${ngày}-${mã mặt hàng}`. Nạp lại cùng file, hay phát hành lại cùng ngày,
 * là ghi đè lên chính dòng đó — không bao giờ ra hai dòng kế hoạch cho một
 * mã bia trong một ngày. Bản ghi kiểu cũ (id có thêm `-${Date.now()}`) của
 * cùng ngày × mặt hàng thì gỡ đi khi ghi bản mới.
 */

import type { KeHoachSanXuat, Product } from "../types";
import { khopMatHang, normalizeKey } from "./khopMatHang";
import { toTkhoNumber } from "./tkhoXuat";
import { isoSangVn } from "./oNgay";

export const idKeHoach = (ngay: string, productId: string) =>
  `kh-${ngay.slice(0, 10)}-${productId}`;

/** Một dòng kế hoạch muốn có (sau khi điền lưới hoặc đọc file). */
export interface DongKeHoach {
  date: string;
  productId: string;
  targetQty: number;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Lập việc ghi                                                        */
/* ------------------------------------------------------------------ */

export interface ViecGhiKeHoach {
  /** Ghi (tạo / ghi đè) bản ghi id chuẩn. */
  ghi: DongKeHoach[];
  /** Xoá: bản ghi kiểu cũ trùng ngày × mặt hàng, hoặc dòng sản lượng 0. */
  xoa: string[];
  /** Số dòng đã có y nguyên — không ghi lại. */
  giuNguyen: number;
}

const giong = (a: KeHoachSanXuat, b: DongKeHoach) =>
  a.id === idKeHoach(b.date, b.productId) &&
  Number(a.targetQty) === Number(b.targetQty) &&
  (a.note || "") === b.note;

/**
 * Từ các dòng muốn có → việc ghi / xoá.
 *
 * Sản lượng 0 = bỏ kế hoạch của mã bia đó trong ngày đó (xoá mọi bản ghi của
 * ngày × mặt hàng). Dòng KHÔNG có trong danh sách thì không đụng tới — nạp
 * file chỉ một vài mã bia không làm mất kế hoạch các mã còn lại.
 */
export function lapViecGhiKeHoach(
  muon: readonly DongKeHoach[],
  daCo: readonly KeHoachSanXuat[],
): ViecGhiKeHoach {
  // Dòng sau thắng dòng trước nếu trùng ngày × mặt hàng (file lặp dòng).
  const theoKhoa = new Map<string, DongKeHoach>();
  muon.forEach((d) => theoKhoa.set(idKeHoach(d.date, d.productId), d));

  const ghi: DongKeHoach[] = [];
  const xoa: string[] = [];
  let giuNguyen = 0;
  theoKhoa.forEach((d, khoa) => {
    const cu = daCo.filter((k) => idKeHoach(k.date, k.productId) === khoa);
    if (!(d.targetQty > 0)) {
      cu.forEach((k) => xoa.push(k.id));
      return;
    }
    cu.filter((k) => k.id !== khoa).forEach((k) => xoa.push(k.id));
    const chuan = cu.find((k) => k.id === khoa);
    if (chuan && giong(chuan, d)) giuNguyen++;
    else ghi.push(d);
  });
  return { ghi, xoa, giuNguyen };
}

/* ------------------------------------------------------------------ */
/* File mẫu + đọc file                                                 */
/* ------------------------------------------------------------------ */

export const COT_MAU_KE_HOACH = [
  "Ngày",
  "Mã SAP",
  "Tên bia",
  "ĐVT",
  "Sản lượng KH",
  "Ghi chú",
] as const;

/**
 * Hàng dữ liệu của file mẫu cho một ngày: đủ mọi mã bia trong danh mục, điền
 * sẵn kế hoạch đã có (nếu có). Ngày ghi dạng chữ dd/MM/yyyy để Excel không tự
 * đổi kiểu; mã SAP ghi dạng chữ để không mất số 0 đầu.
 */
export function hangMauKeHoach(
  products: readonly Product[],
  ngay: string,
  daCo: readonly KeHoachSanXuat[],
): (string | number)[][] {
  return products.map((p) => {
    const k = daCo.find((x) => x.date.slice(0, 10) === ngay && x.productId === p.id);
    return [
      isoSangVn(ngay),
      String(p.materialCode || ""),
      p.name,
      p.unit,
      k ? Number(k.targetQty) || 0 : "",
      k?.note || "",
    ];
  });
}

/** Ngày trong ô Excel: đối tượng Date, số sê-ri, dd/MM/yyyy, dd.MM.yy, yyyy-MM-dd. */
export function docNgayO(o: unknown): string | null {
  const hai = (n: number) => String(n).padStart(2, "0");
  if (o instanceof Date && !Number.isNaN(+o)) {
    return `${o.getFullYear()}-${hai(o.getMonth() + 1)}-${hai(o.getDate())}`;
  }
  if (typeof o === "number" && o > 20000 && o < 80000) {
    const d = new Date(Math.round((o - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`;
  }
  const s = String(o ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${hai(+m[2])}-${hai(+m[3])}`;
  m = s.match(/^(\d{1,2})[./-]+(\d{1,2})[./-]+(\d{2,4})$/);
  if (!m) return null;
  const d = +m[1];
  const mo = +m[2];
  let y = +m[3];
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${y}-${hai(mo)}-${hai(d)}`;
}

export interface KetQuaDocKeHoach {
  dong: DongKeHoach[];
  /** Dòng có số nhưng không đọc được — kèm số dòng Excel để người dùng sửa. */
  loi: string[];
  /** Dòng để trống sản lượng — bỏ qua, không đụng kế hoạch đã có. */
  boTrong: number;
}

const BIEN_THE: Record<string, string[]> = {
  ngay: ["Ngày", "Ngày kế hoạch", "Date"],
  ma: ["Mã SAP", "Mã vật tư", "Mã VT", "Material Code"],
  ten: ["Tên bia", "Mặt hàng", "Mặt hàng bia", "Sản phẩm", "Tên hàng"],
  sl: ["Sản lượng KH", "Sản lượng", "Kế hoạch", "Số lượng", "SL kế hoạch"],
  ghiChu: ["Ghi chú", "Note"],
};

/**
 * Đọc sheet kế hoạch (`sheet_to_json(ws, { header: 1, raw: true })`).
 *
 * Tự dò dòng tiêu đề (dòng có cột tên bia hoặc mã SAP). Khớp mặt hàng bằng
 * MÃ SAP rồi TÊN trùng tuyệt đối — không khớp mờ (`khopMatHang`). Ô ngày
 * trống thì lấy `ngayMacDinh` (ngày đang chọn trên app).
 */
export function docBangKeHoach(
  aoa: readonly (readonly unknown[])[],
  products: readonly Product[],
  ngayMacDinh: string,
): KetQuaDocKeHoach {
  const ra: KetQuaDocKeHoach = { dong: [], loi: [], boTrong: 0 };
  const laTen = (o: unknown, truong: string) =>
    BIEN_THE[truong].some((t) => normalizeKey(t) === normalizeKey(o));
  const viTri = aoa.findIndex(
    (d) => Array.isArray(d) && d.some((o) => laTen(o, "ten") || laTen(o, "ma")),
  );
  if (viTri < 0) {
    ra.loi.push("Không thấy dòng tiêu đề (cần cột \"Tên bia\" hoặc \"Mã SAP\"). Dùng file mẫu tải từ app.");
    return ra;
  }
  const tieuDe = aoa[viTri];
  const cot = (truong: string) => tieuDe.findIndex((o) => laTen(o, truong));
  const c = {
    ngay: cot("ngay"),
    ma: cot("ma"),
    ten: cot("ten"),
    sl: cot("sl"),
    ghiChu: cot("ghiChu"),
  };
  if (c.sl < 0) {
    ra.loi.push("Không thấy cột \"Sản lượng KH\".");
    return ra;
  }
  const lay = (dong: readonly unknown[], i: number) => (i >= 0 ? dong?.[i] : undefined);

  aoa.slice(viTri + 1).forEach((dong, i) => {
    const soDong = viTri + i + 2;
    const ten = String(lay(dong, c.ten) ?? "").trim();
    const ma = String(lay(dong, c.ma) ?? "").trim();
    if (!ten && !ma) return;
    const oSl = lay(dong, c.sl);
    if (oSl === undefined || oSl === null || String(oSl).trim() === "") {
      ra.boTrong++;
      return;
    }
    const sl = toTkhoNumber(oSl);
    if (sl < 0) {
      ra.loi.push(`Dòng ${soDong}: sản lượng âm (${String(oSl)}).`);
      return;
    }
    const p = khopMatHang(products, { materialCode: ma, productName: ten });
    if (!p) {
      ra.loi.push(`Dòng ${soDong}: không khớp mã bia "${ma || ten}" với danh mục.`);
      return;
    }
    const oNgay = lay(dong, c.ngay);
    const ngay =
      oNgay === undefined || oNgay === null || String(oNgay).trim() === ""
        ? ngayMacDinh
        : docNgayO(oNgay);
    if (!ngay) {
      ra.loi.push(`Dòng ${soDong}: ngày "${String(oNgay)}" không đọc được (dùng dd/MM/yyyy).`);
      return;
    }
    ra.dong.push({
      date: ngay,
      productId: p.id,
      targetQty: sl,
      note: String(lay(dong, c.ghiChu) ?? "").trim().slice(0, 2000),
    });
  });
  return ra;
}

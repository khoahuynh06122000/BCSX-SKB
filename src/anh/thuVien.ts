/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * THƯ VIỆN ẢNH — dựng ô ảnh từ bảng `anh_chung_tu`, lọc ngày, lọc đơn vị.
 *
 * MỖI TẤM MỘT Ô. Bản cũ dựng ô theo từng dòng giao dịch nên một tờ biên bản
 * của chuyến chín mặt hàng hiện chín lần rồi phải gộp lại. Nay ảnh gắn vào
 * chứng từ nên mỗi tấm vốn chỉ có một bản ghi.
 *
 * Chữ trên ô lấy từ dữ liệu SỐNG của chứng từ (ngày, đơn vị, mặt hàng). Chứng
 * từ không còn thì lấy phần thông tin lưu kèm ảnh lúc tải, ghi rõ "chứng từ đã
 * xoá" để admin thấy mà xử lý.
 */

import { laBoPhanBNC, nhomCuaBoPhan, NHOM_BNC, tenNhomBNC, type MaNhomBNC } from "../lib/nhomBNC";
import { maChungTuCuaDong, type AnhChungTu, type LoaiAnh } from "./moHinh";

/** Phần dòng giao dịch Thư viện cần đọc. */
export interface DongThuVien {
  id: string;
  type: string;
  date: string;
  productName: string;
  partnerId: string;
  partnerName: string;
  notes?: string;
  slipCode?: string;
  referenceGroupId?: string;
}

/** Một ô ảnh trên lưới. */
export interface OAnh {
  /** = id bản ghi ảnh. */
  id: string;
  anh: AnhChungTu;
  url: string;
  /** Ngày nghiệp vụ, `yyyy-MM-dd…`. */
  date: string;
  tieuDe: string;
  phu: string;
  donVi: string;
  maDonVi: string;
  /** Điểm nhận ghi trong ghi chú — đặt tên tệp khi tải về. */
  diemNhan: string;
  /** Mã chứng từ đang hiện (chứng từ sống đầu tiên). */
  chungTu: string;
  /** Không còn chứng từ sống nào. */
  chungTuDaXoa: boolean;
}

const ngay10 = (s: string) => String(s ?? "").slice(0, 10);

/** Dựng toàn bộ ô của một chiều, chưa lọc, mới nhất trước. */
export function dungOAnh(input: {
  anh: readonly AnhChungTu[];
  giaoDich: readonly DongThuVien[];
  loai: LoaiAnh;
}): OAnh[] {
  const theoChungTu = new Map<string, DongThuVien[]>();
  input.giaoDich.forEach((t) => {
    if (t.type === "LOSS" || t.type === "DAMAGE") return; // hao hụt không phải mặt hàng giao
    const k = maChungTuCuaDong(t);
    const ds = theoChungTu.get(k);
    if (ds) ds.push(t);
    else theoChungTu.set(k, [t]);
  });

  return input.anh
    .filter((a) => a.loai === input.loai)
    .map((a): OAnh => {
      const ct = a.chungTu.find((c) => theoChungTu.has(c));
      const dong = ct ? theoChungTu.get(ct)! : [];
      const dau = dong[0];
      const tenHang = [...new Set(dong.map((t) => t.productName).filter(Boolean))];
      const laPhieu = input.loai === "NHAP";
      const tieuDe = !ct
        ? "Chứng từ đã xoá"
        : laPhieu
          ? `Phiếu ${ct}`
          : tenHang.length > 1
            ? `${tenHang[0]} · ${tenHang.length} mặt hàng`
            : tenHang[0] || "Biên bản giao hàng";
      const donVi = dau?.partnerName || a.doiTac || "";
      const phu = laPhieu && ct
        ? tenHang.length
          ? `${tenHang.length} mặt hàng · ${tenHang[0]}`
          : "Chưa khớp giao dịch nào"
        : donVi || "Không rõ đơn vị";
      return {
        id: a.id,
        anh: a,
        url: a.url,
        date: dau?.date || a.ngay,
        tieuDe,
        phu,
        donVi,
        maDonVi: dau?.partnerId || a.maDoiTac || "",
        diemNhan: /Điểm nhận:\s*([^·]+)/.exec(dau?.notes || "")?.[1]?.trim() || "",
        chungTu: ct || a.chungTu[0] || "",
        chungTuDaXoa: !ct,
      };
    })
    .sort((x, y) => y.date.localeCompare(x.date) || y.anh.taiLuc.localeCompare(x.anh.taiLuc));
}

/** Lọc khoảng ngày `yyyy-MM-dd`; để trống là không chặn phía đó. */
export function locTheoNgay(ds: readonly OAnh[], tu: string, den: string): OAnh[] {
  const a = tu.trim();
  const b = den.trim();
  return ds.filter((o) => {
    const n = ngay10(o.date);
    return (!a || n >= a) && (!b || n <= b);
  });
}

/* ------------------------------------------------------------------ */
/* Lọc đơn vị — BNC gộp bốn phần                                       */
/* ------------------------------------------------------------------ */

const TIEN_TO_PHAN = "BNC:";

export interface MucDonVi {
  gia: string;
  ten: string;
}

/** Đơn vị CÓ ẢNH trong bộ đang xem; BNC gộp thành bốn phần, đặt lên đầu. */
export function danhSachDonVi(ds: readonly OAnh[]): MucDonVi[] {
  const ngoai = new Set<string>();
  const phan = new Set<string>();
  ds.forEach((o) => {
    if (laBoPhanBNC(o.maDonVi)) {
      const n = nhomCuaBoPhan(o.maDonVi);
      if (n) phan.add(n);
    } else if (o.donVi.trim()) {
      ngoai.add(o.donVi.trim());
    }
  });
  return [
    ...NHOM_BNC.filter((n) => phan.has(n.ma)).map((n) => ({
      gia: `${TIEN_TO_PHAN}${n.ma}`,
      ten: `BNC · ${n.ten}`,
    })),
    ...[...ngoai].sort((a, b) => a.localeCompare(b, "vi")).map((d) => ({ gia: d, ten: d })),
  ];
}

function khop(o: OAnh, gia: string): boolean {
  return gia.startsWith(TIEN_TO_PHAN)
    ? nhomCuaBoPhan(o.maDonVi) === gia.slice(TIEN_TO_PHAN.length)
    : o.donVi === gia;
}

/** Lọc theo nhiều đơn vị / phần BNC. Rỗng là lấy hết. */
export function locTheoDonVi(ds: readonly OAnh[], chon: readonly string[]): OAnh[] {
  const c = chon.map((x) => x.trim()).filter(Boolean);
  return c.length ? ds.filter((o) => c.some((g) => khop(o, g))) : [...ds];
}

/** Điểm bán của MỘT phần BNC đang lọc; dưới hai điểm thì không cần ô chọn. */
export function diemBanCuaPhan(ds: readonly OAnh[], dangChon: readonly string[]): string[] {
  if (dangChon.length !== 1 || !dangChon[0].startsWith(TIEN_TO_PHAN)) return [];
  const co = new Set(ds.filter((o) => laBoPhanBNC(o.maDonVi) && o.donVi.trim()).map((o) => o.donVi.trim()));
  return co.size < 2 ? [] : [...co].sort((a, b) => a.localeCompare(b, "vi"));
}

/** Tên hiển thị của một giá trị lọc. */
export function tenGiaTriLoc(gia: string): string {
  const d = String(gia ?? "").trim();
  if (!d.startsWith(TIEN_TO_PHAN)) return d;
  return `BNC · ${tenNhomBNC(d.slice(TIEN_TO_PHAN.length) as MaNhomBNC) || d}`;
}

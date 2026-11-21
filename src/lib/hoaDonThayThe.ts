/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HÓA ĐƠN THAY THẾ (anh Khoa 21/11/2026) — thay cho cách "điều chỉnh vào lượt
 * hóa đơn kế tiếp".
 *
 * Hóa đơn đã phát hành mà sai thì theo quy định hóa đơn điện tử, người bán lập
 * HÓA ĐƠN THAY THẾ: tờ mới, số mới, ghi rõ thay thế cho tờ nào; tờ cũ thành
 * "bị thay thế", hết hiệu lực.
 *
 * Trường hợp hay gặp: một CHUYẾN giao bị ghi nhầm đơn vị (của SPA mà ghi BNC).
 * Ảnh chuyến đó vẫn đúng — chỉ sai tên — nên hàng VÀ ẢNH của chuyến chuyển
 * sang đơn vị đúng:
 *
 *   · Ghi một cặp dòng điều chỉnh cho mỗi chuyến: −SL cho đơn vị nhầm, +SL cho
 *     đơn vị đúng, CÙNG NGÀY GIAO GỐC — tức rơi đúng đợt của tờ hóa đơn bị sai.
 *     Tồn kho không đổi (cặp cộng lại bằng 0). Dòng mang `chungTuGoc` = mã
 *     chuyến, để ảnh đi theo (xem `src/anh/anhHoaDon.ts`).
 *   · Tờ của đơn vị nhầm: còn hàng → số mới, "thay thế cho" tờ cũ; hết hàng →
 *     tờ mới của đơn vị đúng chính là tờ thay thế.
 *   · Tờ của đơn vị đúng: đợt đó đã có hóa đơn → cũng phải thay thế (nội dung
 *     đổi); chưa có → nhập số luôn ở đây, hoặc để nó về "Chưa xuất hóa đơn".
 *   · Tờ cũ được CHỤP LẠI (dòng hàng lúc thay thế) thành tài liệu riêng có
 *     `biThayTheBoi` — dòng hàng của nó không dựng lại được nữa vì giao dịch
 *     bên dưới đã có cặp điều chỉnh.
 *
 * Không có chuyến nào chuyển (sai thông tin khác) → chỉ cấp số mới cho tờ đó.
 */

import type { DongCongNo } from "./congNo";
import { maChungTuCuaDong } from "../anh/moHinh";
import { lapDongDieuChinh, type DongGhiDieuChinh } from "./dieuChinhCongNo";
import type { HoaDonGhiNhan, ThamChieuHoaDon } from "./hoaDon";

/** Dòng giao dịch tối thiểu cần để tách chuyến. */
export interface GiaoDichChuyen {
  id: string;
  type: string;
  date: string;
  productId: string;
  productName?: string;
  partnerId: string;
  partnerName?: string;
  quantity: number;
  slipCode?: string;
  referenceGroupId?: string;
  dieuChinh?: { chungTuGoc?: string } | null;
}

/** Một chuyến giao nằm trong tờ hóa đơn. */
export interface ChuyenTrongHoaDon {
  /** Mã chứng từ của chuyến (mã chuyến / mã phiếu) — ảnh móc theo mã này. */
  ma: string;
  /** yyyy-MM-dd */
  ngay: string;
  partnerId: string;
  tenDoiTac: string;
  /** Gộp theo mặt hàng. */
  dong: { productId: string; ten: string; soLuong: number }[];
  tongSoLuong: number;
}

/**
 * Các chuyến trong tờ hóa đơn — dựng từ `nguon` của dòng công nợ.
 *
 * Bỏ dòng điều chỉnh, và bỏ chuyến đã chuyển đi ở lần thay thế trước (có dòng
 * −SL mang `chungTuGoc` của nó trong tờ).
 */
export function chuyenCuaHoaDon(
  dong: readonly Pick<DongCongNo, "nguon">[],
  giaoDichTheoId: ReadonlyMap<string, GiaoDichChuyen>,
): ChuyenTrongHoaDon[] {
  const daChuyen = new Set<string>();
  const ds: GiaoDichChuyen[] = [];
  dong.forEach((d) =>
    (d.nguon || []).forEach((id) => {
      const t = giaoDichTheoId.get(id);
      if (!t) return;
      const goc = t.dieuChinh?.chungTuGoc;
      if (t.dieuChinh) {
        if (goc && Number(t.quantity) < 0) daChuyen.add(goc);
        return;
      }
      ds.push(t);
    }),
  );
  const m = new Map<string, ChuyenTrongHoaDon>();
  ds.forEach((t) => {
    const ma = maChungTuCuaDong(t);
    if (daChuyen.has(ma)) return;
    const k = `${ma}|${t.partnerId}`;
    let c = m.get(k);
    if (!c) {
      c = {
        ma,
        ngay: String(t.date || "").slice(0, 10),
        partnerId: t.partnerId,
        tenDoiTac: t.partnerName || t.partnerId,
        dong: [],
        tongSoLuong: 0,
      };
      m.set(k, c);
    }
    const sl = Number(t.quantity) || 0;
    const ngay = String(t.date || "").slice(0, 10);
    if (ngay && ngay < c.ngay) c.ngay = ngay;
    const cu = c.dong.find((x) => x.productId === t.productId);
    if (cu) cu.soLuong += sl;
    else c.dong.push({ productId: t.productId, ten: t.productName || t.productId, soLuong: sl });
    c.tongSoLuong += sl;
  });
  return [...m.values()]
    .map((c) => ({ ...c, dong: c.dong.filter((x) => Math.abs(x.soLuong) > 1e-9) }))
    .filter((c) => c.dong.length > 0)
    .sort((a, b) => a.ngay.localeCompare(b.ngay) || a.ma.localeCompare(b.ma));
}

/** Một tờ hóa đơn đang có hiệu lực, kèm dòng hàng hiện tại. */
export interface ToHoaDon {
  /** Bản ghi `hoa_don` (id = khoá đợt × mã BP). */
  ban: HoaDonGhiNhan;
  dong: DongCongNo[];
}

export interface YeuCauThayThe {
  goc: ToHoaDon;
  /** Chuyến ghi nhầm đơn vị, chuyển sang `sang`. Rỗng = chỉ cấp số mới. */
  chuyen: ChuyenTrongHoaDon[];
  /** Đơn vị đúng. `khoa` = khoá hóa đơn của nó trong CÙNG đợt. */
  sang?: {
    partnerId: string;
    maBp: string;
    donVi: string;
    khoa: string;
    /** Tờ đợt đó của đơn vị đúng, nếu đã có số. */
    to?: ToHoaDon;
  };
  soMoiGoc: string;
  ngayMoiGoc: string;
  soMoiSang: string;
  ngayMoiSang: string;
  lyDo: string;
  /** Mọi số hóa đơn đã có (kể cả tờ bị thay thế) — số mới không được trùng. */
  soDaCo: ReadonlySet<string>;
  luc: string;
  boi: string;
  bam: (s: string) => string;
  tenDoiTac: (partnerId: string) => string;
  ngayCham: (iso: string) => string;
}

/** Ô nào phải điền: tờ gốc còn hàng không, và số cho đơn vị đúng bắt buộc / tùy chọn / không cần. */
export function oCanDien(yc: Pick<YeuCauThayThe, "goc" | "chuyen" | "sang">): {
  conHangGoc: boolean;
  soGoc: boolean;
  soSang: "batBuoc" | "tuyChon" | "khong";
} {
  const tong = yc.goc.dong.reduce((s, d) => s + (Number(d.soLuong) || 0), 0);
  const chuyen = yc.chuyen.reduce((s, c) => s + c.tongSoLuong, 0);
  const conHangGoc = tong - chuyen > 1e-6;
  if (!yc.chuyen.length) return { conHangGoc, soGoc: true, soSang: "khong" };
  const sangDaXuat = !!String(yc.sang?.to?.ban.soHoaDon || "").trim();
  return {
    conHangGoc,
    soGoc: conHangGoc,
    soSang: sangDaXuat || !conHangGoc ? "batBuoc" : "tuyChon",
  };
}

const chuanSo = (s: string) => String(s || "").trim().toUpperCase();
const laNgay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

/** Lỗi chặn, hoặc rỗng. */
export function kiemTraThayThe(yc: YeuCauThayThe): string {
  const can = oCanDien(yc);
  const soCu = chuanSo(yc.goc.ban.soHoaDon);
  if (!soCu) return "Tờ gốc chưa có số hóa đơn — chưa phát hành thì sửa thẳng, không cần thay thế.";
  if (yc.goc.ban.biThayTheBoi) return "Tờ này đã bị thay thế rồi.";
  if (!yc.lyDo.trim()) return "Ghi lý do thay thế — in lên hóa đơn và để đối chiếu sau này.";
  if (yc.chuyen.length) {
    if (!yc.sang?.partnerId) return "Chọn đơn vị đúng cho chuyến ghi nhầm.";
    if ((yc.sang.maBp || yc.sang.donVi) === (yc.goc.ban.maBp || yc.goc.ban.donVi))
      return "Đơn vị đúng cùng mã BP với tờ gốc — chuyển sang đó không đổi gì.";
  }
  const moi: string[] = [];
  const xet = (so: string, ngay: string, ten: string, ngayCu?: string): string => {
    const s = chuanSo(so);
    if (!s) return `Nhập số hóa đơn thay thế cho ${ten}.`;
    if (!laNgay(ngay)) return `Chọn ngày hóa đơn cho ${ten}.`;
    if (ngayCu && ngay < ngayCu)
      return `Ngày hóa đơn mới của ${ten} không được trước ngày tờ cũ (${yc.ngayCham(ngayCu)}).`;
    if (yc.soDaCo.has(s)) return `Số ${so.trim()} đã có trong app — số hóa đơn mới phải khác.`;
    if (moi.includes(s)) return "Hai tờ mới đang trùng số.";
    moi.push(s);
    return "";
  };
  if (can.soGoc) {
    const l = xet(yc.soMoiGoc, yc.ngayMoiGoc, yc.goc.ban.donVi, yc.goc.ban.ngayHoaDon);
    if (l) return l;
  }
  if (can.soSang === "batBuoc" || (can.soSang === "tuyChon" && chuanSo(yc.soMoiSang))) {
    const l = xet(
      yc.soMoiSang,
      yc.ngayMoiSang,
      yc.sang?.donVi || "đơn vị đúng",
      yc.sang?.to?.ban.ngayHoaDon || yc.goc.ban.ngayHoaDon,
    );
    if (l) return l;
  }
  return "";
}

const thamChieu = (b: HoaDonGhiNhan): ThamChieuHoaDon => ({
  soHoaDon: String(b.soHoaDon).trim(),
  ngayHoaDon: String(b.ngayHoaDon || "").slice(0, 10),
  donVi: b.donVi,
  maBp: b.maBp,
});

/** Tài liệu lưu tờ bị thay thế. */
function banLuuBiThayThe(
  to: ToHoaDon,
  boi: ThamChieuHoaDon,
  yc: YeuCauThayThe,
): HoaDonGhiNhan {
  const b = to.ban;
  return {
    id: `${b.id}-bt-${yc.bam(chuanSo(b.soHoaDon))}`,
    tuNgay: b.tuNgay,
    denNgay: b.denNgay,
    maBp: b.maBp,
    donVi: b.donVi,
    soHoaDon: String(b.soHoaDon).trim(),
    ngayHoaDon: b.ngayHoaDon,
    ngayKetXuat: b.ngayKetXuat || "",
    thayTheCho: b.thayTheCho || [],
    biThayTheBoi: { ...boi, luc: yc.luc, lyDo: yc.lyDo.trim(), boi: yc.boi },
    banChup: to.dong.map((d) => ({ ...d, nguon: [] })),
  };
}

export interface KetQuaThayThe {
  giaoDich: DongGhiDieuChinh[];
  hoaDon: HoaDonGhiNhan[];
  /** Một câu báo lại cho người dùng. */
  tomTat: string;
}

/** Dựng mọi bản ghi phải lưu. Gọi SAU `kiemTraThayThe` (rỗng). */
export function lapThayThe(yc: YeuCauThayThe): KetQuaThayThe {
  const can = oCanDien(yc);
  const g = yc.goc.ban;
  const refCu = thamChieu(g);
  const ra: HoaDonGhiNhan[] = [];
  const nen = (b: { id: string; tuNgay: string; denNgay: string; maBp: string; donVi: string }) => ({
    id: b.id,
    tuNgay: b.tuNgay,
    denNgay: b.denNgay,
    maBp: b.maBp,
    donVi: b.donVi,
  });

  const refMoiGoc: ThamChieuHoaDon | null = can.soGoc
    ? { soHoaDon: yc.soMoiGoc.trim(), ngayHoaDon: yc.ngayMoiGoc, donVi: g.donVi, maBp: g.maBp }
    : null;
  const coSoSang =
    yc.chuyen.length > 0 &&
    !!yc.sang &&
    (can.soSang === "batBuoc" || (can.soSang === "tuyChon" && !!chuanSo(yc.soMoiSang)));
  const refMoiSang: ThamChieuHoaDon | null =
    coSoSang && yc.sang
      ? {
          soHoaDon: yc.soMoiSang.trim(),
          ngayHoaDon: yc.ngayMoiSang,
          donVi: yc.sang.donVi,
          maBp: yc.sang.maBp,
        }
      : null;

  /* Tờ gốc → bị thay thế bởi tờ mới cùng đơn vị, hoặc (hết hàng) tờ của đơn vị đúng. */
  const thayGocBang = refMoiGoc || refMoiSang;
  if (thayGocBang) ra.push(banLuuBiThayThe(yc.goc, thayGocBang, yc));
  ra.push(
    refMoiGoc
      ? {
          ...nen(g),
          soHoaDon: refMoiGoc.soHoaDon,
          ngayHoaDon: refMoiGoc.ngayHoaDon,
          ngayKetXuat: g.ngayKetXuat || yc.luc,
          thayTheCho: [refCu],
        }
      : // Hết hàng: khoá đợt × mã BP của đơn vị nhầm không còn tờ nào.
        { ...nen(g), soHoaDon: "", ngayHoaDon: "", ngayKetXuat: "", thayTheCho: [] },
  );

  if (yc.sang && refMoiSang) {
    const toSang = yc.sang.to;
    const thayCho: ThamChieuHoaDon[] = [];
    if (toSang && String(toSang.ban.soHoaDon || "").trim()) {
      thayCho.push(thamChieu(toSang.ban));
      ra.push(banLuuBiThayThe(toSang, refMoiSang, yc));
    }
    if (!refMoiGoc) thayCho.push(refCu);
    ra.push({
      id: yc.sang.khoa,
      tuNgay: g.tuNgay,
      denNgay: g.denNgay,
      maBp: yc.sang.maBp,
      donVi: yc.sang.donVi,
      soHoaDon: refMoiSang.soHoaDon,
      ngayHoaDon: refMoiSang.ngayHoaDon,
      ngayKetXuat: toSang?.ban.ngayKetXuat || yc.luc,
      thayTheCho: thayCho,
    });
  }

  const giaoDich: DongGhiDieuChinh[] = [];
  if (yc.sang) {
    const sang = yc.sang;
    yc.chuyen.forEach((c) => {
      const dong = lapDongDieuChinh(
        {
          ngayGoc: c.ngay,
          ngayGhi: c.ngay,
          tuDoiTac: c.partnerId,
          sangDoiTac: sang.partnerId,
          lyDo: yc.lyDo.trim(),
          dong: c.dong.map((x) => ({ productId: x.productId, soLuong: x.soLuong })),
          chungTuGoc: c.ma,
        },
        { bam: yc.bam, tenDoiTac: yc.tenDoiTac, ngayCham: yc.ngayCham },
      );
      dong.forEach((d) =>
        giaoDich.push({
          ...d,
          notes: d.notes.replace(
            "[Điều chỉnh công nợ]",
            `[Hóa đơn thay thế ${refCu.soHoaDon}]`,
          ),
          dieuChinh: { ...d.dieuChinh, chungTuGoc: c.ma, hoaDonBiThayThe: refCu.soHoaDon },
        }),
      );
    });
  }

  const phan: string[] = [];
  if (refMoiGoc) phan.push(`${refCu.soHoaDon} → ${refMoiGoc.soHoaDon} (${g.donVi})`);
  else if (refMoiSang) phan.push(`${refCu.soHoaDon} → ${refMoiSang.soHoaDon} (${refMoiSang.donVi})`);
  const toSang = yc.sang?.to;
  if (refMoiSang && toSang && String(toSang.ban.soHoaDon || "").trim())
    phan.push(`${String(toSang.ban.soHoaDon).trim()} → ${refMoiSang.soHoaDon} (${refMoiSang.donVi})`);
  else if (refMoiSang && refMoiGoc) phan.push(`tờ mới ${refMoiSang.soHoaDon} (${refMoiSang.donVi})`);
  let tomTat = `Đã lập hóa đơn thay thế: ${phan.join("; ")}`;
  if (yc.chuyen.length && !refMoiSang)
    tomTat += `. Hàng chuyển sang ${yc.sang?.donVi} nằm ở "Chưa xuất hóa đơn".`;
  return { giaoDich, hoaDon: ra, tomTat };
}

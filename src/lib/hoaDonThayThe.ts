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
 * SỬA ĐƯỢC MỌI THỨ CỦA TỜ, THEO TỪNG CHUYẾN: đơn vị nhận, mặt hàng, số lượng
 * (đơn giá là bảng giá chung, không sửa theo tờ). Mỗi chuyến trong tờ hiện ra
 * với nội dung HIỆN TẠI; người sửa đổi thành nội dung ĐÚNG. App ghi phần chênh
 * thành dòng xuất kho điều chỉnh (`dieuChinh`), cùng ngày giao gốc — rơi đúng
 * đợt của tờ sai:
 *
 *   · Đổi đơn vị: −SL ở đơn vị cũ, +SL ở đơn vị mới → tồn kho không đổi.
 *   · Đổi số lượng / mặt hàng: dòng chênh lệch → tồn kho ĐỔI THEO, vì số xuất
 *     kho trước đó đã sai giống tờ hóa đơn.
 *
 * Dòng điều chỉnh mang `chungTuGoc` = mã chuyến. Nhờ vậy chuyến luôn dựng lại
 * được ở dạng ĐÃ SỬA (cộng dồn theo chuyến × đơn vị), và ẢNH CHUYẾN đi theo
 * nơi chuyến đang nằm: chuyến dời sang đơn vị khác thì ảnh sang theo (xem
 * `src/anh/anhHoaDon.ts`) — ảnh vẫn đúng, chỉ sai tên.
 *
 * Các tờ bị ảnh hưởng:
 *   · Tờ gốc: còn hàng → số mới, "thay thế cho" tờ cũ. Hết hàng (chuyến dời
 *     hết đi) → các tờ của đơn vị nhận chính là tờ thay thế.
 *   · Đơn vị nhận hàng dời sang: đợt đó đã có hóa đơn → thay thế luôn (nội
 *     dung đổi); chưa có → nhập số ngay, hoặc để về "Chưa xuất hóa đơn".
 *   · Tờ cũ được CHỤP LẠI thành tài liệu riêng có `biThayTheBoi` — dòng hàng
 *     của nó không dựng lại được nữa.
 */

import type { DongCongNo } from "./congNo";
import { maChungTuCuaDong } from "../anh/moHinh";
import type { DongGhiDieuChinh } from "./dieuChinhCongNo";
import type { HoaDonGhiNhan, ThamChieuHoaDon } from "./hoaDon";

/** Dòng giao dịch tối thiểu cần để dựng chuyến. */
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

export interface DongHang {
  productId: string;
  soLuong: number;
}

/** Một chuyến giao nằm trong tờ hóa đơn (nội dung hiện tại, đã cộng điều chỉnh). */
export interface ChuyenTrongHoaDon {
  /** Mã chứng từ của chuyến — ảnh móc theo mã này. */
  ma: string;
  /** yyyy-MM-dd */
  ngay: string;
  partnerId: string;
  tenDoiTac: string;
  dong: (DongHang & { ten: string })[];
  tongSoLuong: number;
}

const EPS = 1e-9;
const tron = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Mã chuyến của một dòng: dòng điều chỉnh của hóa đơn thay thế → chuyến gốc;
 * dòng thường → mã chứng từ; dòng điều chỉnh kiểu cũ (không có chuyến gốc)
 * → `null` (không thuộc chuyến nào).
 */
export function maChuyenCuaDong(t: GiaoDichChuyen): string | null {
  if (t.dieuChinh) return t.dieuChinh.chungTuGoc || null;
  return maChungTuCuaDong(t);
}

/** Các chuyến trong tờ, ĐÃ CỘNG điều chỉnh; chuyến cộng lại bằng 0 thì bỏ. */
export function chuyenCuaHoaDon(
  dong: readonly Pick<DongCongNo, "nguon">[],
  giaoDichTheoId: ReadonlyMap<string, GiaoDichChuyen>,
): ChuyenTrongHoaDon[] {
  const m = new Map<string, ChuyenTrongHoaDon>();
  const thay = new Set<string>();
  dong.forEach((d) =>
    (d.nguon || []).forEach((id) => {
      if (thay.has(id)) return;
      thay.add(id);
      const t = giaoDichTheoId.get(id);
      if (!t) return;
      const ma = maChuyenCuaDong(t);
      if (!ma) return;
      const k = `${ma}|${t.partnerId}`;
      const ngay = String(t.date || "").slice(0, 10);
      let c = m.get(k);
      if (!c) {
        c = { ma, ngay, partnerId: t.partnerId, tenDoiTac: t.partnerName || t.partnerId, dong: [], tongSoLuong: 0 };
        m.set(k, c);
      }
      if (ngay && ngay < c.ngay) c.ngay = ngay;
      if (!t.dieuChinh && t.partnerName) c.tenDoiTac = t.partnerName;
      const sl = Number(t.quantity) || 0;
      const cu = c.dong.find((x) => x.productId === t.productId);
      if (cu) cu.soLuong = tron(cu.soLuong + sl);
      else c.dong.push({ productId: t.productId, ten: t.productName || t.productId, soLuong: sl });
    }),
  );
  return [...m.values()]
    .map((c) => {
      const dongCon = c.dong.filter((x) => Math.abs(x.soLuong) > EPS);
      return { ...c, dong: dongCon, tongSoLuong: tron(dongCon.reduce((s, x) => s + x.soLuong, 0)) };
    })
    .filter((c) => c.dong.length > 0)
    .sort((a, b) => a.ngay.localeCompare(b.ngay) || a.ma.localeCompare(b.ma));
}

/** Một chuyến sau khi người dùng sửa. */
export interface ChuyenSua {
  ma: string;
  ngay: string;
  partnerIdCu: string;
  dongCu: DongHang[];
  /** Đơn vị nhận ĐÚNG. */
  partnerIdMoi: string;
  /** Nội dung ĐÚNG. Rỗng = chuyến không có thật. */
  dongMoi: DongHang[];
}

export const chuyenSuaTu = (c: ChuyenTrongHoaDon): ChuyenSua => ({
  ma: c.ma,
  ngay: c.ngay,
  partnerIdCu: c.partnerId,
  dongCu: c.dong.map((x) => ({ productId: x.productId, soLuong: x.soLuong })),
  partnerIdMoi: c.partnerId,
  dongMoi: c.dong.map((x) => ({ productId: x.productId, soLuong: x.soLuong })),
});

/** Thông tin hóa đơn của một đơn vị trong CÙNG đợt với tờ gốc. */
export interface DonViDot {
  maBp: string;
  donVi: string;
  /** Khoá hóa đơn (đợt × mã BP). */
  khoa: string;
  /** Tờ đợt đó, nếu đã có số. */
  to?: ToHoaDon;
}

/** Một tờ hóa đơn đang có hiệu lực, kèm dòng hàng hiện tại. */
export interface ToHoaDon {
  /** Bản ghi `hoa_don` (id = khoá đợt × mã BP). */
  ban: HoaDonGhiNhan;
  dong: DongCongNo[];
}

export interface SoMoi {
  so: string;
  /** yyyy-MM-dd */
  ngay: string;
}

export interface YeuCauThayThe {
  goc: ToHoaDon;
  /** Mọi chuyến của tờ, đã sửa (chuyến không sửa thì giữ nguyên). */
  chuyen: ChuyenSua[];
  /** Tra mã BP / tờ trong đợt của một đơn vị. `undefined` = đơn vị không dùng được. */
  donViCua: (partnerId: string) => DonViDot | undefined;
  soMoiGoc: SoMoi;
  /** Số mới cho từng đơn vị nhận hàng dời sang, theo mã BP. */
  soMoiDich: Record<string, SoMoi>;
  lyDo: string;
  /** Mọi số hóa đơn đã có (kể cả tờ bị thay thế) — số mới không được trùng. */
  soDaCo: ReadonlySet<string>;
  luc: string;
  boi: string;
  bam: (s: string) => string;
  ngayCham: (iso: string) => string;
}

/** Một dòng chênh lệch phải ghi xuống. */
export interface DongChenh {
  chuyen: ChuyenSua;
  partnerId: string;
  productId: string;
  soLuong: number;
}

/** Chênh lệch giữa nội dung cũ và nội dung đúng của mọi chuyến. */
export function dongChenh(chuyen: readonly ChuyenSua[]): DongChenh[] {
  const ra: DongChenh[] = [];
  chuyen.forEach((c) => {
    const m = new Map<string, number>();
    const cong = (p: string, sp: string, sl: number) => {
      const k = `${p}|${sp}`;
      m.set(k, tron((m.get(k) || 0) + sl));
    };
    c.dongCu.forEach((x) => cong(c.partnerIdCu, x.productId, -(Number(x.soLuong) || 0)));
    c.dongMoi.forEach((x) => cong(c.partnerIdMoi, x.productId, Number(x.soLuong) || 0));
    m.forEach((sl, k) => {
      if (Math.abs(sl) <= EPS) return;
      const [partnerId, productId] = k.split("|");
      ra.push({ chuyen: c, partnerId, productId, soLuong: sl });
    });
  });
  return ra;
}

export interface TomTatSua {
  /** Tờ gốc còn hàng sau khi sửa. */
  conHangGoc: boolean;
  /** Đơn vị khác (mã BP) nhận hàng dời sang, và số của họ bắt buộc hay tùy chọn. */
  dich: (DonViDot & { batBuoc: boolean; tongSoLuong: number })[];
  tongCu: number;
  tongGocMoi: number;
  /** Tổng số lượng xuất kho đổi (≠ 0 là tồn kho đổi). */
  chenhTonKho: number;
  coSua: boolean;
}

export function tomTatSua(yc: Pick<YeuCauThayThe, "goc" | "chuyen" | "donViCua">): TomTatSua {
  const bpGoc = yc.goc.ban.maBp || yc.goc.ban.donVi;
  const tongCu = tron(yc.goc.dong.reduce((s, d) => s + (Number(d.soLuong) || 0), 0));
  let tongGocMoi = 0;
  const dich = new Map<string, DonViDot & { batBuoc: boolean; tongSoLuong: number }>();
  /* Hàng trong tờ gốc mà KHÔNG thuộc chuyến nào (dòng điều chỉnh kiểu cũ) vẫn ở lại. */
  const trongChuyen = yc.chuyen.reduce((s, c) => s + c.dongCu.reduce((a, x) => a + x.soLuong, 0), 0);
  tongGocMoi += tongCu - trongChuyen;
  yc.chuyen.forEach((c) => {
    const sl = c.dongMoi.reduce((s, x) => s + (Number(x.soLuong) || 0), 0);
    const dv = yc.donViCua(c.partnerIdMoi);
    const bp = dv?.maBp || "";
    if (!dv || bp === bpGoc) {
      tongGocMoi += sl;
      return;
    }
    const cu = dich.get(bp);
    if (cu) cu.tongSoLuong = tron(cu.tongSoLuong + sl);
    else dich.set(bp, { ...dv, batBuoc: false, tongSoLuong: sl });
  });
  tongGocMoi = tron(tongGocMoi);
  const conHangGoc = tongGocMoi > EPS;
  const ds = [...dich.values()]
    .filter((d) => d.tongSoLuong > EPS)
    .map((d) => ({
      ...d,
      batBuoc: !!String(d.to?.ban.soHoaDon || "").trim() || !conHangGoc,
    }));
  const chenh = dongChenh(yc.chuyen);
  return {
    conHangGoc,
    dich: ds,
    tongCu,
    tongGocMoi,
    chenhTonKho: tron(chenh.reduce((s, d) => s + d.soLuong, 0)),
    coSua: chenh.length > 0,
  };
}

const chuanSo = (s: string) => String(s || "").trim().toUpperCase();
const laNgay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

/** Lỗi chặn, hoặc rỗng. */
export function kiemTraThayThe(yc: YeuCauThayThe): string {
  const soCu = chuanSo(yc.goc.ban.soHoaDon);
  if (!soCu) return "Tờ gốc chưa có số hóa đơn — chưa phát hành thì sửa thẳng, không cần thay thế.";
  if (yc.goc.ban.biThayTheBoi) return "Tờ này đã bị thay thế rồi.";
  for (const c of yc.chuyen) {
    if (!yc.donViCua(c.partnerIdMoi)) return `Chuyến ${yc.ngayCham(c.ngay)}: chọn đơn vị nhận.`;
    const sp = new Set<string>();
    for (const x of c.dongMoi) {
      if (!x.productId) return `Chuyến ${yc.ngayCham(c.ngay)}: có dòng chưa chọn mặt hàng.`;
      if (!(Number(x.soLuong) > 0))
        return `Chuyến ${yc.ngayCham(c.ngay)}: số lượng phải lớn hơn 0 (bỏ hẳn mặt hàng thì xoá dòng).`;
      if (sp.has(x.productId)) return `Chuyến ${yc.ngayCham(c.ngay)}: một mặt hàng xuất hiện hai lần — gộp lại.`;
      sp.add(x.productId);
    }
  }
  const tt = tomTatSua(yc);
  if (!tt.conHangGoc && tt.dich.length === 0)
    return "Sau khi sửa tờ không còn hàng nào — đó là HỦY hóa đơn, không phải thay thế.";
  if (!yc.lyDo.trim()) return "Ghi lý do thay thế — in lên hóa đơn và để đối chiếu sau này.";
  const moi: string[] = [];
  const xet = (sm: SoMoi | undefined, ten: string, ngayCu?: string): string => {
    const s = chuanSo(sm?.so || "");
    if (!s) return `Nhập số hóa đơn cho ${ten}.`;
    if (!laNgay(sm?.ngay || "")) return `Chọn ngày hóa đơn cho ${ten}.`;
    if (ngayCu && sm!.ngay < ngayCu)
      return `Ngày hóa đơn mới của ${ten} không được trước ngày tờ cũ (${yc.ngayCham(ngayCu)}).`;
    if (yc.soDaCo.has(s)) return `Số ${sm!.so.trim()} đã có trong app — số hóa đơn mới phải khác.`;
    if (moi.includes(s)) return "Hai tờ mới đang trùng số.";
    moi.push(s);
    return "";
  };
  if (tt.conHangGoc) {
    const l = xet(yc.soMoiGoc, yc.goc.ban.donVi, yc.goc.ban.ngayHoaDon);
    if (l) return l;
  }
  for (const d of tt.dich) {
    const sm = yc.soMoiDich[d.maBp];
    if (!d.batBuoc && !chuanSo(sm?.so || "")) continue;
    const l = xet(sm, d.donVi, d.to?.ban.ngayHoaDon || yc.goc.ban.ngayHoaDon);
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
function banLuuBiThayThe(to: ToHoaDon, boi: ThamChieuHoaDon, yc: YeuCauThayThe): HoaDonGhiNhan {
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
  const tt = tomTatSua(yc);
  const g = yc.goc.ban;
  const refCu = thamChieu(g);
  const ra: HoaDonGhiNhan[] = [];
  const phan: string[] = [];

  const refGoc: ThamChieuHoaDon | null = tt.conHangGoc
    ? { soHoaDon: yc.soMoiGoc.so.trim(), ngayHoaDon: yc.soMoiGoc.ngay, donVi: g.donVi, maBp: g.maBp }
    : null;
  const refDich = tt.dich
    .filter((d) => chuanSo(yc.soMoiDich[d.maBp]?.so || ""))
    .map((d) => ({
      d,
      ref: {
        soHoaDon: yc.soMoiDich[d.maBp].so.trim(),
        ngayHoaDon: yc.soMoiDich[d.maBp].ngay,
        donVi: d.donVi,
        maBp: d.maBp,
      } as ThamChieuHoaDon,
    }));

  /* Tờ gốc → bị thay thế bởi tờ mới cùng đơn vị, hoặc (hết hàng) tờ của đơn vị nhận. */
  const thayGocBang = refGoc || refDich[0]?.ref;
  if (thayGocBang) ra.push(banLuuBiThayThe(yc.goc, thayGocBang, yc));
  const nenGoc = { id: g.id, tuNgay: g.tuNgay, denNgay: g.denNgay, maBp: g.maBp, donVi: g.donVi };
  if (refGoc) {
    ra.push({
      ...nenGoc,
      soHoaDon: refGoc.soHoaDon,
      ngayHoaDon: refGoc.ngayHoaDon,
      ngayKetXuat: g.ngayKetXuat || yc.luc,
      thayTheCho: [refCu],
    });
    phan.push(`${refCu.soHoaDon} → ${refGoc.soHoaDon} (${g.donVi})`);
  } else {
    // Hết hàng: khoá đợt × mã BP của tờ gốc không còn tờ nào.
    ra.push({ ...nenGoc, soHoaDon: "", ngayHoaDon: "", ngayKetXuat: "", thayTheCho: [] });
  }

  refDich.forEach(({ d, ref }) => {
    const thayCho: ThamChieuHoaDon[] = [];
    const daCo = d.to && String(d.to.ban.soHoaDon || "").trim();
    if (daCo && d.to) {
      thayCho.push(thamChieu(d.to.ban));
      ra.push(banLuuBiThayThe(d.to, ref, yc));
      phan.push(`${String(d.to.ban.soHoaDon).trim()} → ${ref.soHoaDon} (${d.donVi})`);
    }
    if (!refGoc) thayCho.push(refCu);
    if (!daCo) phan.push(`${refGoc ? "tờ mới" : `${refCu.soHoaDon} →`} ${ref.soHoaDon} (${d.donVi})`);
    ra.push({
      id: d.khoa,
      tuNgay: g.tuNgay,
      denNgay: g.denNgay,
      maBp: d.maBp,
      donVi: d.donVi,
      soHoaDon: ref.soHoaDon,
      ngayHoaDon: ref.ngayHoaDon,
      ngayKetXuat: d.to?.ban.ngayKetXuat || yc.luc,
      thayTheCho: thayCho,
    });
  });

  const nhom = `tt-${yc.bam(chuanSo(refCu.soHoaDon))}`;
  const ly = yc.lyDo.trim();
  const giaoDich: DongGhiDieuChinh[] = dongChenh(yc.chuyen).map((x) => ({
    id: `${nhom}-${yc.bam([x.chuyen.ma, x.partnerId, x.productId].join("|"))}`,
    productId: x.productId,
    partnerId: x.partnerId,
    quantity: x.soLuong,
    referenceGroupId: nhom,
    // Giờ 08:00Z như dòng nạp tệp: rơi đúng ngày giao gốc, tức đúng đợt.
    date: `${x.chuyen.ngay}T08:00:00.000Z`,
    notes: `[Hóa đơn thay thế ${refCu.soHoaDon}] Giao ${yc.ngayCham(x.chuyen.ngay)} · ${ly}`,
    dieuChinh: {
      ngayGoc: x.chuyen.ngay,
      lyDo: ly,
      tuDoiTac: x.chuyen.partnerIdCu,
      sangDoiTac: x.chuyen.partnerIdMoi,
      chungTuGoc: x.chuyen.ma,
      hoaDonBiThayThe: refCu.soHoaDon,
    },
  }));

  if (!phan.length) phan.push(refCu.soHoaDon);
  let tomTat = `Đã lập hóa đơn thay thế: ${phan.join("; ")}`;
  const veChuaXuat = tt.dich.filter((d) => !chuanSo(yc.soMoiDich[d.maBp]?.so || ""));
  if (veChuaXuat.length)
    tomTat += `. Hàng dời sang ${veChuaXuat.map((d) => d.donVi).join(", ")} nằm ở "Chưa xuất hóa đơn"`;
  if (Math.abs(tt.chenhTonKho) > EPS)
    tomTat += `. Xuất kho ${tt.chenhTonKho > 0 ? "tăng" : "giảm"} ${Math.abs(tt.chenhTonKho)} — tồn kho đổi theo`;
  return { giaoDich, hoaDon: ra, tomTat };
}

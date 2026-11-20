/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỔ KEG & CÂN ĐỐI KEG — phần tính thuần.
 *
 * Tổng số keg công ty sở hữu không đổi (trừ khi mua thêm / hỏng / mất), và
 * tại một thời điểm mỗi keg nằm đúng MỘT chỗ. Nên:
 *
 *   Keg rỗng = Tổng keg sở hữu
 *            − Keg có bia tại Kho tổng   (kiểm kê chốt gần nhất, keg vơi tính 1)
 *            − Keg có bia tại Xưởng      (kiểm kê chốt gần nhất — gồm cả phiếu
 *                                         còn chờ Rào 1, vì keg chưa rời xưởng)
 *            − Keg đang chuyển Xưởng → Kho tổng (phiếu đã qua Rào 1, chờ Rào 2)
 *            − Keg xuất đi đường, chưa xác nhận giao
 *            − Keg đang ở ĐVTV  (= tồn đầu tại ĐVTV + lũy kế giao − lũy kế thu về)
 *
 *   Tổng keg sở hữu = Tồn đầu sở hữu + Mua thêm − Hỏng / mất / thanh lý
 *
 * KHÔNG trừ hai lần: keg đã giao thì không còn trong kiểm kê kho; vì vậy số
 * kiểm kê phải lấy ĐÚNG ngày cân đối (mặc định: ngày chốt kiểm kê Kho tổng
 * gần nhất), và giao / thu về chỉ tính tới ngày đó. Ngày chọn khác ngày kiểm
 * thì số kho là số kiểm gần nhất trước đó — bảng ghi rõ ngày kiểm để biết.
 *
 * Trả bia về nhà máy (xuất cho NHÀ CUNG CẤP) không phải giao ĐVTV — keg về
 * xưởng, không tính vào keg ở ĐVTV.
 */

import type { ImportSlip, KiemKeKegLit, Partner, Product, Transaction } from "../types";
import {
  LIT_KEG_CHUAN,
  laBanGhiThuVeVoKeg,
  laKiemKeDotXuat,
  maNhomDonVi,
  soKegLamTronLen,
  tongHopGiaoKegVaHaoHutDVTV,
  tongHopVoKegThuVe,
} from "./loBia";

export const LOAI_SO_KEG = {
  TON_DAU_SO_HUU: "Tồn đầu — tổng keg sở hữu",
  TON_DAU_DVTV: "Tồn đầu — keg đang ở ĐVTV",
  MUA_THEM: "Mua thêm keg",
  HONG_MAT: "Keg hỏng / mất / thanh lý",
} as const;
export type LoaiSoKeg = keyof typeof LOAI_SO_KEG;

/** Một dòng sổ keg (bảng `so_keg`). */
export interface DongSoKeg {
  id: string;
  /** yyyy-MM-dd */
  ngay: string;
  loai: LoaiSoKeg;
  soKeg: number;
  /** Chỉ với TON_DAU_DVTV: đơn vị đang giữ keg. */
  maDoiTac?: string;
  tenDoiTac?: string;
  ghiChu?: string;
  createdBy: string;
  createdAt: string;
  uid?: string;
}

export interface DongKegDVTV {
  unitId: string;
  unitName: string;
  tonDau: number;
  daGiao: number;
  daThuVe: number;
  dangGiu: number;
}

export interface CanDoiKeg {
  ngay: string;
  tonDauSoHuu: number;
  muaThem: number;
  hongMat: number;
  tongSoHuu: number;
  /** Keg có bia tại Kho tổng theo kiểm kê chốt gần nhất ≤ ngày; null = chưa có. */
  khoTong: { soKeg: number; ngayKiem: string } | null;
  xuong: { soKeg: number; ngayKiem: string } | null;
  /** Phiếu nhập đã qua Rào 1, chờ Kho tổng ký nhận (keg đang trên đường). */
  dangChuyenNhap: number;
  /** Xuất đi đường, chưa xác nhận giao. */
  diDuong: number;
  dvtv: DongKegDVTV[];
  tonDauDVTV: number;
  daGiaoDVTV: number;
  daThuVe: number;
  /** Vỏ thu về không ghi đơn vị (thu chung tại kho). */
  thuVeKhongRoDonVi: number;
  dangODVTV: number;
  kegRong: number;
  /** Những điều kiện thiếu làm số chưa tin được. */
  canhBao: string[];
}

const ngayCua = (s: string | undefined) => String(s || "").slice(0, 10);

/** Bản kiểm kê CHỐT THÁNG đã ký duyệt gần nhất ≤ ngày (bỏ đột xuất, bỏ thu về vỏ). */
export function kiemKeChotGanNhat(
  ds: readonly KiemKeKegLit[],
  noi: "KHO_TONG" | "XUONG",
  ngay: string,
): KiemKeKegLit | null {
  let tot: KiemKeKegLit | null = null;
  ds.forEach((r) => {
    if (r.location !== noi || r.approvalStatus !== "approved") return;
    if (laKiemKeDotXuat(r) || laBanGhiThuVeVoKeg(r)) return;
    if (ngayCua(r.date) > ngay) return;
    if (!tot || (r.date + (r.approvedAt || "")).localeCompare(tot.date + (tot.approvedAt || "")) > 0) tot = r;
  });
  return tot;
}

export function canDoiKeg(input: {
  ngay: string;
  soKeg: readonly DongSoKeg[];
  transactions: readonly Transaction[];
  products: readonly Product[];
  partners: readonly Partner[];
  slips: readonly ImportSlip[];
  kiemKeKeg: readonly KiemKeKegLit[];
}): CanDoiKeg {
  const { ngay } = input;
  const canhBao: string[] = [];
  const den = (d: string | undefined) => ngayCua(d) <= ngay;
  const so = input.soKeg.filter((d) => den(d.ngay));
  const cong = (loai: LoaiSoKeg) =>
    so.filter((d) => d.loai === loai).reduce((t, d) => t + (Number(d.soKeg) || 0), 0);

  const tonDauSoHuu = cong("TON_DAU_SO_HUU");
  const muaThem = cong("MUA_THEM");
  const hongMat = cong("HONG_MAT");
  const tongSoHuu = tonDauSoHuu + muaThem - hongMat;
  if (!tonDauSoHuu) canhBao.push("Chưa ghi tồn đầu tổng keg sở hữu — chưa tính được keg rỗng.");

  const kt = kiemKeChotGanNhat(input.kiemKeKeg, "KHO_TONG", ngay);
  const xg = kiemKeChotGanNhat(input.kiemKeKeg, "XUONG", ngay);
  if (!kt) canhBao.push("Chưa có kiểm kê Kho tổng đã ký duyệt (chốt tháng) tới ngày này.");
  if (!xg) canhBao.push("Chưa có kiểm kê Xưởng đã ký duyệt (chốt tháng) tới ngày này.");
  if (kt && ngayCua(kt.date) !== ngay) {
    canhBao.push(`Số Kho tổng lấy theo kiểm kê ngày ${ngayCua(kt.date)} — chọn đúng ngày chốt để cân đối khớp.`);
  }

  // Phiếu đã qua Rào 1, chờ Kho tổng ký nhận: keg đã rời xưởng, chưa vào kho.
  const prodMap = new Map(input.products.map((p) => [p.id, p]));
  const phieuDangChuyen = new Set(
    input.slips.filter((s) => s.status === "cho_kho_tong" && den(s.date)).map((s) => s.code),
  );
  const litTheoLuot = new Map<string, number>();
  input.transactions.forEach((t) => {
    if (t.type !== "IN" || !t.slipCode || !phieuDangChuyen.has(t.slipCode)) return;
    const p = prodMap.get(t.productId);
    if ((p?.category || t.category) !== "Lít") return;
    const k = `${t.slipCode}|${t.productId}`;
    litTheoLuot.set(k, (litTheoLuot.get(k) || 0) + (Number(t.quantity) || 0) * ((p?.capacityPerUnit || 1000) / 1000));
  });
  let dangChuyenNhap = 0;
  litTheoLuot.forEach((lit) => (dangChuyenNhap += soKegLamTronLen(lit, LIT_KEG_CHUAN)));

  // Xuất: tới ngày cân đối. Đi đường tách riêng, chỉ đơn đã xác nhận mới là "đã giao".
  const xuatDen = input.transactions.filter((t) => den(t.date));
  const diDuong = tongHopGiaoKegVaHaoHutDVTV({
    transactions: xuatDen.filter((t) => t.status === "in_transit"),
    products: input.products,
    partners: input.partners,
  }).totals.allKegsDelivered;
  const voKeg = tongHopVoKegThuVe({
    transactions: xuatDen.filter((t) => t.status !== "in_transit"),
    products: input.products,
    partners: input.partners,
    kiemKeKeg: input.kiemKeKeg.filter((r) => den(r.date)),
  });

  const theoDV = new Map<string, DongKegDVTV>();
  const lay = (id: string, ten: string) => {
    let r = theoDV.get(id);
    if (!r) {
      r = { unitId: id, unitName: ten, tonDau: 0, daGiao: 0, daThuVe: 0, dangGiu: 0 };
      theoDV.set(id, r);
    }
    return r;
  };
  so.filter((d) => d.loai === "TON_DAU_DVTV").forEach((d) => {
    const ten = d.tenDoiTac || input.partners.find((p) => p.id === d.maDoiTac)?.name || d.maDoiTac || "";
    const g = maNhomDonVi(d.maDoiTac || "", ten);
    lay(g.id, g.name).tonDau += Number(d.soKeg) || 0;
  });
  voKeg.theoDonVi.forEach((d) => {
    const r = lay(d.unitId, d.unitName);
    r.daGiao += d.kegsDelivered;
    r.daThuVe += d.kegsReturned;
  });
  const dvtv = [...theoDV.values()]
    .map((r) => ({ ...r, dangGiu: r.tonDau + r.daGiao - r.daThuVe }))
    .sort((a, b) => b.dangGiu - a.dangGiu || a.unitName.localeCompare(b.unitName, "vi"));

  const tonDauDVTV = dvtv.reduce((t, r) => t + r.tonDau, 0);
  const daGiaoDVTV = dvtv.reduce((t, r) => t + r.daGiao, 0);
  const daThuVe = voKeg.tongDaThuVe;
  const thuVeKhongRoDonVi = voKeg.tongThuVeChungTaiKho;
  // Thu về không rõ đơn vị vẫn là keg đã rời ĐVTV — trừ ở tổng.
  const dangODVTV = tonDauDVTV + daGiaoDVTV - daThuVe;

  const kegRong =
    tongSoHuu - (kt ? Number(kt.totalKegs) || 0 : 0) - (xg ? Number(xg.totalKegs) || 0 : 0) -
    dangChuyenNhap - diDuong - dangODVTV;
  if (tonDauSoHuu && kegRong < 0) {
    canhBao.push(
      "Keg rỗng ra ÂM — số đang nằm các nơi vượt tổng keg sở hữu: thiếu ghi mua thêm, tồn đầu sở hữu thấp, hoặc tồn đầu ĐVTV / kiểm kê bị đếm trùng.",
    );
  }

  return {
    ngay,
    tonDauSoHuu,
    muaThem,
    hongMat,
    tongSoHuu,
    khoTong: kt ? { soKeg: Number(kt.totalKegs) || 0, ngayKiem: ngayCua(kt.date) } : null,
    xuong: xg ? { soKeg: Number(xg.totalKegs) || 0, ngayKiem: ngayCua(xg.date) } : null,
    dangChuyenNhap,
    diDuong,
    dvtv,
    tonDauDVTV,
    daGiaoDVTV,
    daThuVe,
    thuVeKhongRoDonVi,
    dangODVTV,
    kegRong,
    canhBao,
  };
}

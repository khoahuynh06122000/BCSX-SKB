/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỐ PHIẾU TRONG BÁO CÁO TỔNG HỢP.
 *
 * Màn hình "Sổ số phiếu" riêng đã bỏ (21/10/2026): tra số phiếu là để biết
 * dòng hàng nào thuộc tờ phiếu nào, nên số phiếu nằm ngay trên từng dòng của
 * Báo cáo Nhập / Báo cáo Xuất, và chứng từ chưa có số được cấp ngay ở đó.
 *
 * Sổ `so_phieu` trên Firestore VẪN LÀ NGUỒN của số — chỉ bỏ màn hình. Bộ cấp
 * số chống trùng ở `soPhieuKho.ts` không đổi.
 */

import { nguonCuaGiaoDich } from "./phieuHuy";
import { laLoaiHuy, type GhiSoPhieu } from "./soPhieu";

interface GiaoDich {
  dieuChinh?: unknown;
  id: string;
  type: string;
  date: string;
  quantity: number;
  partnerName?: string;
  slipCode?: string;
  referenceGroupId?: string;
}

/** Chiều chứng từ của một giao dịch; `null` = không thuộc tờ phiếu nào. */
export function loaiChungTu(t: {
  type: string;
  slipCode?: string;
  dieuChinh?: unknown;
}): "NHAP" | "XUAT" | null {
  // Điều chỉnh công nợ không phải lượt hàng rời kho — không có tờ phiếu xuất.
  if (t.dieuChinh) return null;
  if (t.type === "IN") return t.slipCode ? "NHAP" : null;
  if (t.type === "OUT" || t.type === "LOSS") return "XUAT";
  return null;
}

/**
 * Tra số phiếu theo `loai|nguon`. Chỉ phiếu GỐC (không lấy tờ phiếu hủy).
 * Một nguồn có nhiều số (cấp lại sau khi hủy) thì lấy số CÒN HIỆU LỰC; không
 * còn số nào hiệu lực thì lấy số mới nhất kèm cờ đã hủy.
 */
export function bangSoPhieu(
  so: GhiSoPhieu[],
): Map<string, { soPhieu: string; daHuy: boolean }> {
  const m = new Map<string, { soPhieu: string; daHuy: boolean }>();
  [...so]
    .filter((g) => g?.nguon && !laLoaiHuy(g.loai))
    .sort((a, b) => String(a.enteredOn).localeCompare(String(b.enteredOn)))
    .forEach((g) => {
      const k = `${g.loai}|${g.nguon}`;
      const cu = m.get(k);
      const daHuy = g.trangThai !== "hieu_luc";
      if (!cu || cu.daHuy || !daHuy) m.set(k, { soPhieu: g.soPhieu, daHuy });
    });
  return m;
}

/** Số phiếu của một dòng giao dịch, rỗng nếu chưa có. */
export function soPhieuCuaDong(
  t: {
    type: string;
    id?: string;
    slipCode?: string;
    referenceGroupId?: string;
    dieuChinh?: unknown;
  },
  bang: Map<string, { soPhieu: string; daHuy: boolean }>,
): { soPhieu: string; daHuy: boolean } | null {
  const loai = loaiChungTu(t);
  const nguon = nguonCuaGiaoDich(t);
  if (!loai || !nguon) return null;
  return bang.get(`${loai}|${nguon}`) ?? null;
}

export interface ChungTuChuaCoSo {
  loai: "NHAP" | "XUAT";
  nguon: string;
  documentDate: string;
  donVi: string;
  soDong: number;
  soLuong: number;
}

/**
 * Chứng từ đã lưu nhưng chưa có số phiếu — gồm cả lượt nạp từ tệp, vốn không
 * qua màn hình nhập tay nên không được cấp số lúc lưu.
 *
 * Tồn đầu kỳ không tính (không có tờ phiếu nào). Chứng từ đã có số — kể cả số
 * đã hủy — cũng không tính: cấp lại sau khi hủy là việc phải quyết riêng.
 *
 * Xếp theo ngày tăng dần: cấp từ chứng từ cũ tới mới, để số không chạy ngược
 * so với ngày.
 */
export function chungTuChuaCoSo(
  giaoDich: GiaoDich[],
  so: GhiSoPhieu[],
): ChungTuChuaCoSo[] {
  const daCo = bangSoPhieu(so);
  const gom = new Map<string, ChungTuChuaCoSo>();
  giaoDich.forEach((t) => {
    const loai = loaiChungTu(t);
    const nguon = nguonCuaGiaoDich(t);
    const ngay = String(t.date || "").slice(0, 10);
    if (!loai || !nguon || !ngay) return;
    const k = `${loai}|${nguon}`;
    if (daCo.has(k)) return;
    const cu = gom.get(k);
    if (cu) {
      cu.soDong += 1;
      cu.soLuong += Number(t.quantity) || 0;
      // Ngày SỚM NHẤT trong nhóm — đó là ngày trên biên bản.
      if (ngay < cu.documentDate) cu.documentDate = ngay;
    } else {
      gom.set(k, {
        loai,
        nguon,
        documentDate: ngay,
        donVi: t.partnerName || "",
        soDong: 1,
        soLuong: Number(t.quantity) || 0,
      });
    }
  });
  return [...gom.values()].sort(
    (a, b) =>
      a.documentDate.localeCompare(b.documentDate) || a.nguon.localeCompare(b.nguon),
  );
}

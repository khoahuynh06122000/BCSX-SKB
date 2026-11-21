/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ẢNH CỦA MỘT TỜ HÓA ĐƠN ĐÃ XUẤT (anh Khoa 21/11/2026).
 *
 * Nối theo ĐÚNG giao dịch đã gộp vào tờ hóa đơn (`DongCongNo.nguon`), không dò
 * "cùng đơn vị, ngày nằm trong đợt": dò theo ngày sẽ kéo nhầm ảnh phiếu trả bia
 * nhà máy, đơn đi đường chưa xác nhận, hay tờ hóa đơn khác của cùng đơn vị có
 * đợt chồng lên nhau.
 *
 *   tờ hóa đơn → dòng hàng → nguon (mã giao dịch xuất) → mã chứng từ (chuyến)
 *              → ảnh chứng từ chiều XUẤT của chuyến đó
 *
 * Tên tệp tải về: `<số hóa đơn>_<đơn vị>` — `#` và ký tự Windows cấm đổi thành
 * `-`. Một tấm: `.jpg`; nhiều tấm: `.zip`, bên trong `_01`, `_02`…
 */

import type { DongCongNo } from "../lib/congNo";
import { maChungTuCuaDong, type AnhChungTu, type DongChungTu } from "./moHinh";
import { duoiTep, tenAnToan } from "./taiVe";

/** Ảnh chiều XUẤT của các giao dịch trong tờ hóa đơn — không trùng, theo ngày rồi giờ tải. */
export function anhCuaHoaDon(
  dong: readonly Pick<DongCongNo, "nguon">[],
  giaoDichTheoId: ReadonlyMap<
    string,
    DongChungTu & { quantity?: number; dieuChinh?: { chungTuGoc?: string } | null }
  >,
  anhTheoChungTu: ReadonlyMap<string, readonly AnhChungTu[]>,
): AnhChungTu[] {
  /*
   * HÓA ĐƠN THAY THẾ: dòng điều chỉnh mang `chungTuGoc` = chuyến bị ghi nhầm
   * đơn vị. Dòng +SL (đơn vị đúng) kéo ảnh chuyến đó về tờ của mình; dòng −SL
   * (đơn vị nhầm) gỡ ảnh chuyến đó khỏi tờ kia — ảnh vẫn đúng, chỉ sai tên.
   */
  const chungTu = new Set<string>();
  const them = new Set<string>();
  const bo = new Set<string>();
  dong.forEach((d) =>
    (d.nguon || []).forEach((id) => {
      const t = giaoDichTheoId.get(id);
      if (!t) return;
      const goc = t.dieuChinh?.chungTuGoc;
      if (goc) {
        if (Number(t.quantity) > 0) them.add(goc);
        else bo.add(goc);
        return;
      }
      chungTu.add(maChungTuCuaDong(t));
    }),
  );
  bo.forEach((c) => chungTu.delete(c));
  them.forEach((c) => chungTu.add(c));
  const theoId = new Map<string, AnhChungTu>();
  chungTu.forEach((c) =>
    (anhTheoChungTu.get(c) || []).forEach((a) => {
      if (a.loai === "XUAT" && !theoId.has(a.id)) theoId.set(a.id, a);
    }),
  );
  return [...theoId.values()].sort(
    (x, y) =>
      String(x.ngay).localeCompare(String(y.ngay)) ||
      String(x.taiLuc).localeCompare(String(y.taiLuc)),
  );
}

/**
 * Tên gốc (chưa đuôi) của bộ ảnh một tờ: `C26TKB-00000295_FV`. Tờ thay thế
 * thêm `_thay-the-<số tờ cũ>`.
 */
export function tenGocHoaDon(
  soHoaDon: string,
  donVi: string,
  thayTheCho: readonly string[] = [],
): string {
  const so = tenAnToan(soHoaDon) || "chua-co-so";
  const dv = tenAnToan(String(donVi ?? "").split("·")[0]);
  const goc = dv ? `${so}_${dv}` : so;
  const cu = thayTheCho.map((x) => tenAnToan(x)).filter(Boolean);
  return cu.length ? `${goc}_thay-the-${cu.join("+")}` : goc;
}

/** Tên từng tấm trong bộ: một tấm thì không đánh số; nhiều tấm thì `_01`, `_02`… */
export function tenAnhTrongBo(goc: string, urls: readonly string[]): string[] {
  if (urls.length === 1) return [`${goc}.${duoiTep(urls[0])}`];
  const rong = Math.max(2, String(urls.length).length);
  return urls.map((u, i) => `${goc}_${String(i + 1).padStart(rong, "0")}.${duoiTep(u)}`);
}

/**
 * Bộ tệp cho nút "tải tất cả": mỗi tờ một thư mục. Hai tờ trùng tên gốc (cùng
 * số, cùng đơn vị — hiếm) thì thư mục sau thêm `-2` để ZIP không mất tấm.
 */
export function boTepNhieuHoaDon(
  ds: readonly {
    soHoaDon: string;
    donVi: string;
    thayTheCho?: readonly string[];
    anh: readonly Pick<AnhChungTu, "url">[];
  }[],
): { ten: string; url: string }[] {
  const dem = new Map<string, number>();
  const ra: { ten: string; url: string }[] = [];
  ds.forEach((h) => {
    if (!h.anh.length) return;
    const g0 = tenGocHoaDon(h.soHoaDon, h.donVi, h.thayTheCho);
    const n = (dem.get(g0) || 0) + 1;
    dem.set(g0, n);
    const g = n > 1 ? `${g0}-${n}` : g0;
    const urls = h.anh.map((a) => a.url);
    tenAnhTrongBo(g, urls).forEach((ten, i) => ra.push({ ten: `${g}/${ten}`, url: urls[i] }));
  });
  return ra;
}

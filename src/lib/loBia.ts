/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NGHIỆP VỤ LÔ BIA, KẾ HOẠCH SẢN XUẤT & BỒN FST/BBT (XƯỞNG ➔ KHO TỔNG ➔ BÁN)
 *
 * Toàn bộ các phép tính thuần nằm ở đây để kiểm thử độc lập với Firebase:
 *   1. Quy đổi số lượng sang Keg (20L) / Thùng (24 lon) giúp kiểm đếm nhanh trên ảnh.
 *   2. Sinh mã Token chữ ký điện tử cho từng bước ký (Sản xuất, QL Xưởng, Kho tổng).
 *   3. Tính tồn kho chi tiết theo từng Mã lô và tự động gợi ý xuất kho FIFO.
 *   4. Truy xuất hành trình từng Lô bia (từ phiếu nhập -> nơi xuất đi -> còn tồn).
 *   5. Đối chiếu Kế hoạch sản xuất vs Xưởng giao vs Kho tổng nhận vs Thực xuất bán.
 */

import type {
  ImportSlip,
  KeHoachSanXuat,
  KiemKeKegLit,
  Partner,
  Product,
  Transaction,
} from "../types";
import { laBoPhanBNC } from "./nhomBNC";
import { dauCuaLoai } from "./tonKho";

export interface BonBia {
  id: string;
  ten: string;
  nhom: "FST" | "BBT";
  sucChuaLit: number;
}

export const DANH_SACH_BON_BIA: BonBia[] = [
  { id: "FST-01", ten: "Bồn lên men FST-01", nhom: "FST", sucChuaLit: 2000 },
  { id: "FST-02", ten: "Bồn lên men FST-02", nhom: "FST", sucChuaLit: 2000 },
  { id: "FST-03", ten: "Bồn lên men FST-03", nhom: "FST", sucChuaLit: 1000 },
  { id: "BBT-01", ten: "Bồn thành phẩm BBT-01", nhom: "BBT", sucChuaLit: 2000 },
  { id: "BBT-02", ten: "Bồn thành phẩm BBT-02", nhom: "BBT", sucChuaLit: 1000 },
  { id: "BBT-03", ten: "Bồn thành phẩm BBT-03", nhom: "BBT", sucChuaLit: 1000 },
];

export const MA_LO_MAC_DINH = "Chưa gắn mã lô";

/** Mặc định 1 keg chiết tại xưởng (và giao cho BNC / FV) là 20,6 lít; các ĐVTV khác ghi 20 lít/keg. */
export const LIT_KEG_CHUAN = 20.6;
export const LIT_KEG_DVTV = 20;

/**
 * Quy đổi số lượng thành số Keg nội bộ (mặc định 20,6 L/keg) hoặc Thùng (24 lon) để đối chiếu ảnh hiện trạng.
 * Quy định nghiệp vụ: nếu có bia lẻ trong keg cuối không đầy thì LÀM TRÒN LÊN
 * thành số Keg nguyên (vì ngoài hiện trường vẫn chiếm 1 vỏ Keg vật lý).
 */
export function quyDoiHienTrang(
  product: Pick<Product, "category" | "unit"> | undefined,
  qty: number,
  litMoiKeg = LIT_KEG_CHUAN,
): string {
  const n = Number(qty) || 0;
  if (n <= 0 || !product) return "—";
  if (product.category === "Lít") {
    const chuan = litMoiKeg > 0 ? litMoiKeg : LIT_KEG_CHUAN;
    const raw = n / chuan;
    const rounded = Math.round(raw);
    const chuanLabel = Number.isInteger(chuan)
      ? `${chuan}L`
      : `${String(chuan).replace(".", ",")}L`;
    if (Math.abs(raw - rounded) < 0.001) {
      return `${rounded} Keg (${chuanLabel})`;
    }
    const kegCeil = Math.max(1, Math.ceil(raw - 1e-4));
    const fullKegs = Math.max(0, kegCeil - 1);
    const lastKegLiters = Math.round((n - fullKegs * chuan) * 10) / 10;
    const lastLabel = Number.isInteger(lastKegLiters)
      ? String(lastKegLiters)
      : String(lastKegLiters).replace(".", ",");
    return `${kegCeil} Keg (keg cuối ${lastLabel}L)`;
  }
  if (product.category === "Lon") {
    const thung = n / 24;
    const rounded = Math.round(thung);
    if (Math.abs(thung - rounded) < 0.001) {
      return `${rounded} Thùng`;
    }
    const thungCeil = Math.max(1, Math.ceil(thung - 1e-4));
    const lastCans = Math.round(n - (thungCeil - 1) * 24);
    return `${thungCeil} Thùng (thùng cuối ${lastCans} lon)`;
  }
  return `${n} ${product.unit}`;
}

/** Sinh mã Token xác thực chữ ký điện tử dạng XXXX-XXXX. */
export function taoTokenChuKy(
  slipCode: string,
  role: string,
  email: string,
  signedAt: string,
): string {
  const str = `${slipCode}|${role}|${email}|${signedAt}`;
  let h1 = 0x811c9dc5 ^ str.length;
  let h2 = 0xdeadbeef ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 2654435761);
  }
  const p1 = (h1 >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 4);
  const p2 = (h2 >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 4);
  return `${p1}-${p2}`;
}

export interface TonTheoLoItem {
  productId: string;
  productName: string;
  unit: string;
  category: string;
  batchNumber: string;
  opening: number;
  imported: number;
  exported: number;
  loss: number;
  closing: number;
  earliestDate: string;
  slipCodes: string[];
}

/** Tính tồn kho chi tiết theo từng (Sản phẩm × Mã lô). */
export function tinhTonTheoLo(
  countedTransactions: readonly Transaction[],
  products: readonly Product[],
): TonTheoLoItem[] {
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, TonTheoLoItem>();

  countedTransactions.forEach((t) => {
    const dau = dauCuaLoai(t.type);
    if (!dau || !t.productId) return;
    const p = prodMap.get(t.productId);
    const batch = (t.batchNumber || "").trim() || MA_LO_MAC_DINH;
    const key = `${t.productId}|${batch}`;

    let row = map.get(key);
    if (!row) {
      row = {
        productId: t.productId,
        productName: p?.name || t.productName,
        unit: p?.unit || "",
        category: p?.category || t.category,
        batchNumber: batch,
        opening: 0,
        imported: 0,
        exported: 0,
        loss: 0,
        closing: 0,
        earliestDate: String(t.date || "").slice(0, 10),
        slipCodes: [],
      };
      map.set(key, row);
    }

    const qty = Number(t.quantity) || 0;
    const ngay = String(t.date || "").slice(0, 10);
    if (ngay && (!row.earliestDate || ngay < row.earliestDate)) {
      row.earliestDate = ngay;
    }
    if (t.slipCode && !row.slipCodes.includes(t.slipCode)) {
      row.slipCodes.push(t.slipCode);
    }

    if (t.type === "OPENING") row.opening += qty;
    else if (t.type === "IN") row.imported += qty;
    else if (t.type === "OUT") row.exported += qty;
    else row.loss += qty;

    row.closing += dau * qty;
  });

  return Array.from(map.values()).sort(
    (a, b) =>
      a.earliestDate.localeCompare(b.earliestDate) ||
      a.productName.localeCompare(b.productName, "vi") ||
      a.batchNumber.localeCompare(b.batchNumber),
  );
}

/** Gợi ý phân bổ số lượng xuất từ các lô còn tồn theo nguyên tắc FIFO (nhập trước xuất trước). */
export function goiYLoFIFO(
  lots: readonly TonTheoLoItem[],
  productId: string,
  requestedQty: number,
): { batchNumber: string; quantity: number }[] {
  let remain = Math.max(0, Number(requestedQty) || 0);
  if (!remain) return [];

  const available = lots
    .filter((l) => l.productId === productId && l.closing > 0)
    .sort((a, b) => {
      // Lô có mã thật ưu tiên trước lô chưa gắn mã nếu cùng ngày, ưu tiên ngày cũ nhất trước
      const dateCmp = a.earliestDate.localeCompare(b.earliestDate);
      if (dateCmp !== 0) return dateCmp;
      if (a.batchNumber === MA_LO_MAC_DINH) return 1;
      if (b.batchNumber === MA_LO_MAC_DINH) return -1;
      return a.batchNumber.localeCompare(b.batchNumber);
    });

  const allocations: { batchNumber: string; quantity: number }[] = [];
  for (const lot of available) {
    if (remain <= 0) break;
    const take = Math.min(lot.closing, remain);
    if (take > 0) {
      allocations.push({
        batchNumber: lot.batchNumber,
        quantity: parseFloat(take.toFixed(4)),
      });
      remain = parseFloat((remain - take).toFixed(4));
    }
  }
  return allocations;
}

export interface DiemDenCuaLo {
  partnerId: string;
  partnerName: string;
  quantity: number;
  inTransitQty: number;
  completedQty: number;
  dates: string[];
}

export interface KetQuaTruyXuatLo {
  batchNumber: string;
  productId: string;
  productName: string;
  unit: string;
  totalIn: number;
  totalOut: number;
  totalLoss: number;
  remaining: number;
  sourceSlips: string[];
  destinations: DiemDenCuaLo[];
}

/** Truy xuất hành trình một Lô bia: từ phiếu nhập -> xuất đi những đâu -> còn bao nhiêu. */
export function truyXuatLo(
  batchNumber: string,
  countedTransactions: readonly Transaction[],
  products: readonly Product[],
): KetQuaTruyXuatLo[] {
  const target = batchNumber.trim().toLowerCase();
  if (!target) return [];
  const prodMap = new Map(products.map((p) => [p.id, p]));

  const byProd = new Map<
    string,
    {
      inQty: number;
      outQty: number;
      lossQty: number;
      slips: Set<string>;
      dests: Map<string, DiemDenCuaLo>;
      sampleName: string;
      unit: string;
    }
  >();

  countedTransactions.forEach((t) => {
    const b = (t.batchNumber || "").trim().toLowerCase();
    if (!b || !b.includes(target)) return;
    const p = prodMap.get(t.productId);
    const key = `${t.productId}|${(t.batchNumber || "").trim()}`;
    let entry = byProd.get(key);
    if (!entry) {
      entry = {
        inQty: 0,
        outQty: 0,
        lossQty: 0,
        slips: new Set(),
        dests: new Map(),
        sampleName: p?.name || t.productName,
        unit: p?.unit || "",
      };
      byProd.set(key, entry);
    }

    const qty = Number(t.quantity) || 0;
    if (t.type === "IN" || t.type === "OPENING") {
      entry.inQty += qty;
      if (t.slipCode) entry.slips.add(t.slipCode);
    } else if (t.type === "OUT") {
      entry.outQty += qty;
      const dKey = t.partnerId || t.partnerName || "KHAC";
      const d = entry.dests.get(dKey) || {
        partnerId: t.partnerId,
        partnerName: t.partnerName || "Không rõ",
        quantity: 0,
        inTransitQty: 0,
        completedQty: 0,
        dates: [],
      };
      d.quantity += qty;
      if (t.status === "in_transit") d.inTransitQty += qty;
      else d.completedQty += qty;
      const day = String(t.date || "").slice(0, 10);
      if (day && !d.dates.includes(day)) d.dates.push(day);
      entry.dests.set(dKey, d);
    } else if (t.type === "LOSS" || t.type === "DAMAGE") {
      entry.lossQty += qty;
    }
  });

  return Array.from(byProd.entries()).map(([key, e]) => {
    const [productId, exactBatch] = key.split("|");
    return {
      batchNumber: exactBatch,
      productId,
      productName: e.sampleName,
      unit: e.unit,
      totalIn: e.inQty,
      totalOut: e.outQty,
      totalLoss: e.lossQty,
      remaining: e.inQty - e.outQty - e.lossQty,
      sourceSlips: [...e.slips],
      destinations: Array.from(e.dests.values()).sort(
        (a, b) => b.quantity - a.quantity,
      ),
    };
  });
}

export interface TienDoKeHoachItem {
  productId: string;
  productName: string;
  unit: string;
  capacityPerUnit: number;
  plannedQty: number;
  sentFromBrewery: number;
  receivedByWarehouse: number;
  soldOut: number;
  lossQty: number;
  varianceVsPlan: number;
  pctBrewery: number;
  pctReceived: number;
  notes: string[];
  batchHints: string[];
}

/** Tổng hợp Kế hoạch sản xuất vs Thực xuất xưởng vs Kho nhận (2 rào) vs Thực xuất bán. */
export function tongHopKeHoachVaThucXuat(
  plans: readonly KeHoachSanXuat[],
  transactions: readonly Transaction[],
  slips: readonly ImportSlip[],
  products: readonly Product[],
  countedSlipCodes: ReadonlySet<string>,
  filterDate?: string,
): TienDoKeHoachItem[] {
  const slipStatusByCode = new Map(slips.map((s) => [s.code, s.status]));
  const map = new Map<string, TienDoKeHoachItem>();

  const ensure = (p: Product) => {
    let row = map.get(p.id);
    if (!row) {
      row = {
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        capacityPerUnit: p.capacityPerUnit || 1000,
        plannedQty: 0,
        sentFromBrewery: 0,
        receivedByWarehouse: 0,
        soldOut: 0,
        lossQty: 0,
        varianceVsPlan: 0,
        pctBrewery: 0,
        pctReceived: 0,
        notes: [],
        batchHints: [],
      };
      map.set(p.id, row);
    }
    return row;
  };

  const prodMap = new Map(products.map((p) => [p.id, p]));

  plans.forEach((pl) => {
    if (filterDate && pl.date !== filterDate) return;
    const p = prodMap.get(pl.productId);
    if (!p) return;
    const row = ensure(p);
    row.plannedQty += Number(pl.targetQty) || 0;
    if (pl.note && !row.notes.includes(pl.note)) row.notes.push(pl.note);
    if (pl.batchHint && !row.batchHints.includes(pl.batchHint)) {
      row.batchHints.push(pl.batchHint);
    }
  });

  transactions.forEach((t) => {
    if (filterDate && String(t.date || "").slice(0, 10) !== filterDate) return;
    const p = prodMap.get(t.productId);
    if (!p) return;
    const qty = Number(t.quantity) || 0;

    if (t.type === "IN") {
      const status = t.slipCode ? slipStatusByCode.get(t.slipCode) : undefined;
      if (status === "tra_lai") return;
      const row = ensure(p);
      row.sentFromBrewery += qty;
      const isApproved = !t.slipCode || countedSlipCodes.has(t.slipCode);
      if (isApproved) row.receivedByWarehouse += qty;
    } else if (t.type === "OUT") {
      const row = ensure(p);
      row.soldOut += qty;
    } else if (t.type === "LOSS" || t.type === "DAMAGE") {
      const row = ensure(p);
      row.lossQty += qty;
    }
  });

  const rows = Array.from(map.values()).filter(
    (r) =>
      r.plannedQty > 0 ||
      r.sentFromBrewery > 0 ||
      r.receivedByWarehouse > 0 ||
      r.soldOut > 0,
  );

  rows.forEach((r) => {
    r.varianceVsPlan = r.receivedByWarehouse - r.plannedQty;
    r.pctBrewery =
      r.plannedQty > 0 ? Math.round((r.sentFromBrewery / r.plannedQty) * 100) : 0;
    r.pctReceived =
      r.plannedQty > 0
        ? Math.round((r.receivedByWarehouse / r.plannedQty) * 100)
        : 0;
  });

  return rows.sort((a, b) => b.plannedQty - a.plannedQty || b.soldOut - a.soldOut);
}

/* ========================================================================== */
/* KIỂM SOÁT KEG ĐVTV (20L vs 20,6L = 0,6L/KEG) & VỎ KEG THU VỀ              */
/* ========================================================================== */

/** Chênh lệch định mức mỗi keg 20L xuất cho ĐVTV (trừ BNC & FV) so với keg chiết 20,6L. */
export const CHUAN_HAO_HUT_DVTV = 0.6;

/** Tiền tố `shiftOrPeriod` đánh dấu bản ghi kiểm kê VỎ KEG THU VỀ trong bảng `kiem_ke_keg`. */
export const KEG_THU_VE_PREFIX = "KEG_THU_VE · ";

/**
 * Xác định đối tác có áp dụng đúng chuẩn 20,6 L/keg (không phát sinh chênh 0,6L/keg) hay không.
 * Quy định nghiệp vụ SKB: chỉ BNC (AD0103*) và FV (AC0107) lấy chuẩn 20,6 L/keg; các ĐVTV khác lấy 20 L/keg.
 */
export function laDoiTacChuan206(partnerId: string, partnerName?: string): boolean {
  const pid = String(partnerId || "").trim().toUpperCase();
  const pname = String(partnerName || "").trim().toUpperCase();
  if (laBoPhanBNC(pid) || pid === "AD0103" || pid === "SKB-BNC") return true;
  if (pid === "AC0107") return true;
  if (/^BNC(\s|·|-|$)/.test(pname) || pname === "FV" || pname === "SKB-BNC") return true;
  return false;
}

/** Chuẩn lít trên 1 keg của đối tác: 20,6L (BNC/FV/Xưởng) hoặc 20L (ĐVTV khác). */
export function chuanLitMoiKegCuaDoiTac(partnerId: string, partnerName?: string): number {
  return laDoiTacChuan206(partnerId, partnerName) ? LIT_KEG_CHUAN : LIT_KEG_DVTV;
}

/** Quy đổi số lít ra số keg vật lý nguyên, LÀM TRÒN LÊN khi có keg lẻ. */
export function soKegLamTronLen(liters: number, litMoiKeg: number): number {
  const n = Number(liters) || 0;
  const chuan = litMoiKeg > 0 ? litMoiKeg : LIT_KEG_CHUAN;
  if (n <= 0) return 0;
  return Math.max(1, Math.ceil(n / chuan - 1e-4));
}

function maNhomDonVi(
  partnerId: string,
  partnerName: string,
): { id: string; name: string; isStandard206: boolean } {
  const pid = String(partnerId || "").trim();
  const pname = String(partnerName || "").trim();
  if (laBoPhanBNC(pid) || pid.toUpperCase() === "AD0103" || /^BNC(\s|·|-|$)/i.test(pname)) {
    return { id: "AD0103", name: "BNC (Toàn khu)", isStandard206: true };
  }
  const is206 = laDoiTacChuan206(pid, pname);
  return {
    id: pid || pname || "KHAC",
    name: pname || pid || "Khác",
    isStandard206: is206,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface DongGiaoKegDVTV {
  unitId: string;
  unitName: string;
  isStandard206: boolean;
  litMoiKeg: number;
  /** Số Lít ghi nhận giao khách (ĐVTV quy ước 20L/keg; BNC & FV tính đúng 20,6L/keg). */
  litersDelivered: number;
  /** Số Lít thực tế xuất khỏi kho theo chuẩn nội bộ 20,6 L/keg (= litersDelivered + expectedStandardLoss). */
  internalLiters: number;
  kegsDelivered: number;
  expectedStandardLoss: number;
  actualLossRecorded: number;
  unrecordedGap: number;
}

export interface BaoCaoKegHaoHutDVTV {
  rows: DongGiaoKegDVTV[];
  totals: {
    dvtvKegsDelivered: number;
    dvtvLitersDelivered: number;
    dvtvInternalLiters: number;
    dvtvExpectedLoss06: number;
    dvtvActualLoss: number;
    dvtvUnrecordedGap: number;
    bncFvKegsDelivered: number;
    bncFvLitersDelivered: number;
    bncFvActualLoss: number;
    allKegsDelivered: number;
    allLitersDelivered: number;
    allInternalLiters: number;
    allActualLoss: number;
  };
}

/**
 * Tổng hợp sản lượng giao Keg (làm tròn lên khi có keg lẻ) và đối chiếu hao hụt định mức
 * 0,6 L/keg cho ĐVTV (trừ BNC & FV dùng chuẩn 20,6 L/keg).
 */
export function tongHopGiaoKegVaHaoHutDVTV(input: {
  transactions: readonly Transaction[];
  products: readonly Product[];
  /** Có thì bỏ dòng TRẢ BIA VỀ NHÀ MÁY (đơn vị nhận là nhà cung cấp) — không phải giao ĐVTV. */
  partners?: readonly Partner[];
}): BaoCaoKegHaoHutDVTV {
  const prodMap = new Map(input.products.map((p) => [p.id, p]));
  const nhaCungCap = new Set(
    (input.partners || []).filter((p) => p.type === "SUPPLIER").map((p) => p.id),
  );
  const map = new Map<string, DongGiaoKegDVTV>();

  const ensure = (unitId: string, unitName: string, isStandard206: boolean) => {
    let row = map.get(unitId);
    if (!row) {
      row = {
        unitId,
        unitName,
        isStandard206,
        litMoiKeg: isStandard206 ? LIT_KEG_CHUAN : LIT_KEG_DVTV,
        litersDelivered: 0,
        internalLiters: 0,
        kegsDelivered: 0,
        expectedStandardLoss: 0,
        actualLossRecorded: 0,
        unrecordedGap: 0,
      };
      map.set(unitId, row);
    }
    return row;
  };

  /*
   * Làm tròn keg theo TỪNG LƯỢT GIAO (một mặt hàng trong một chuyến), không
   * theo từng dòng giao dịch: lưu phiếu xuất thì một mặt hàng có thể tách
   * thành vài dòng theo lô FIFO (30 L + 70 L cho một đơn 100 L). Làm tròn từng
   * dòng ra ceil(1,5) + ceil(3,5) = 6 keg thay vì 5, và hao hụt chuẩn 2,4 L
   * thay vì 3,0 L. Dòng không có mã chuyến thì tự là một lượt.
   */
  const luotGiao = new Map<string, { row: DongGiaoKegDVTV; isStandard206: boolean; lit: number }>();

  input.transactions.forEach((t) => {
    if (t.type !== "OUT" && t.type !== "LOSS" && t.type !== "DAMAGE") return;
    if (nhaCungCap.has(t.partnerId)) return;
    const p = prodMap.get(t.productId);
    const cat = p?.category || t.category;
    if (cat !== "Lít") return;
    const qty = Number(t.quantity) || 0;
    if (qty <= 0) return;

    const grp = maNhomDonVi(t.partnerId, t.partnerName);
    const row = ensure(grp.id, grp.name, grp.isStandard206);

    if (t.type === "OUT") {
      row.litersDelivered = round2(row.litersDelivered + qty);
      const khoa = `${grp.id}|${t.referenceGroupId || `id:${t.id}`}|${t.productId}`;
      const l = luotGiao.get(khoa);
      if (l) l.lit += qty;
      else luotGiao.set(khoa, { row, isStandard206: grp.isStandard206, lit: qty });
    } else {
      row.actualLossRecorded = round2(row.actualLossRecorded + qty);
    }
  });

  luotGiao.forEach(({ row, isStandard206, lit }) => {
    row.kegsDelivered += soKegLamTronLen(lit, row.litMoiKeg);
    if (!isStandard206) {
      // Mỗi keg tròn 20L giao ĐVTV phát sinh định mức 0,6 L so với keg chiết 20,6L.
      const fullKegs20 = Math.floor(lit / LIT_KEG_DVTV + 1e-4);
      row.expectedStandardLoss = round2(
        row.expectedStandardLoss + fullKegs20 * CHUAN_HAO_HUT_DVTV,
      );
    }
  });

  const rows = Array.from(map.values()).map((r) => ({
    ...r,
    internalLiters: round2(r.litersDelivered + r.expectedStandardLoss),
    unrecordedGap: round2(r.expectedStandardLoss - r.actualLossRecorded),
  }));

  rows.sort(
    (a, b) =>
      Number(a.isStandard206) - Number(b.isStandard206) ||
      b.kegsDelivered - a.kegsDelivered ||
      a.unitName.localeCompare(b.unitName, "vi"),
  );

  const totals = {
    dvtvKegsDelivered: 0,
    dvtvLitersDelivered: 0,
    dvtvInternalLiters: 0,
    dvtvExpectedLoss06: 0,
    dvtvActualLoss: 0,
    dvtvUnrecordedGap: 0,
    bncFvKegsDelivered: 0,
    bncFvLitersDelivered: 0,
    bncFvActualLoss: 0,
    allKegsDelivered: 0,
    allLitersDelivered: 0,
    allInternalLiters: 0,
    allActualLoss: 0,
  };

  rows.forEach((r) => {
    totals.allKegsDelivered += r.kegsDelivered;
    totals.allLitersDelivered = round2(totals.allLitersDelivered + r.litersDelivered);
    totals.allInternalLiters = round2(totals.allInternalLiters + r.internalLiters);
    totals.allActualLoss = round2(totals.allActualLoss + r.actualLossRecorded);
    if (r.isStandard206) {
      totals.bncFvKegsDelivered += r.kegsDelivered;
      totals.bncFvLitersDelivered = round2(totals.bncFvLitersDelivered + r.litersDelivered);
      totals.bncFvActualLoss = round2(totals.bncFvActualLoss + r.actualLossRecorded);
    } else {
      totals.dvtvKegsDelivered += r.kegsDelivered;
      totals.dvtvLitersDelivered = round2(totals.dvtvLitersDelivered + r.litersDelivered);
      totals.dvtvInternalLiters = round2(totals.dvtvInternalLiters + r.internalLiters);
      totals.dvtvExpectedLoss06 = round2(totals.dvtvExpectedLoss06 + r.expectedStandardLoss);
      totals.dvtvActualLoss = round2(totals.dvtvActualLoss + r.actualLossRecorded);
    }
  });
  totals.dvtvUnrecordedGap = round2(totals.dvtvExpectedLoss06 - totals.dvtvActualLoss);

  return { rows, totals };
}

export interface DongVoKegThuVe {
  unitId: string;
  unitName: string;
  isStandard206: boolean;
  kegsDelivered: number;
  kegsReturned: number;
  kegsOutstanding: number;
}

export interface BaoCaoVoKegThuVe {
  theoDonVi: DongVoKegThuVe[];
  tongDaGiao: number;
  tongDaThuVe: number;
  tongThuVeChungTaiKho: number;
  dangConNgoaiThiTruong: number;
  lichSuThuVe: KiemKeKegLit[];
}

export const MA_KHO_TONG_THU_VE = "TONG_KHO";

export function laBanGhiThuVeVoKeg(r: Pick<KiemKeKegLit, "shiftOrPeriod">): boolean {
  return String(r.shiftOrPeriod || "").startsWith(KEG_THU_VE_PREFIX);
}

/**
 * Tổng hợp số Keg đã giao vs số Vỏ Keg đã kiểm kê thu về tại Kho tổng theo từng Đơn vị.
 */
export function tongHopVoKegThuVe(input: {
  transactions: readonly Transaction[];
  products: readonly Product[];
  partners: readonly Partner[];
  kiemKeKeg: readonly KiemKeKegLit[];
}): BaoCaoVoKegThuVe {
  const giao = tongHopGiaoKegVaHaoHutDVTV({
    transactions: input.transactions,
    products: input.products,
    partners: input.partners,
  });

  const map = new Map<string, DongVoKegThuVe>();
  const ensure = (unitId: string, unitName: string, isStandard206: boolean) => {
    let r = map.get(unitId);
    if (!r) {
      r = {
        unitId,
        unitName,
        isStandard206,
        kegsDelivered: 0,
        kegsReturned: 0,
        kegsOutstanding: 0,
      };
      map.set(unitId, r);
    }
    return r;
  };

  giao.rows.forEach((d) => {
    const row = ensure(d.unitId, d.unitName, d.isStandard206);
    row.kegsDelivered += d.kegsDelivered;
  });

  const lichSuThuVe = input.kiemKeKeg
    .filter((r) => r.location === "KHO_TONG" && laBanGhiThuVeVoKeg(r))
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));

  let tongThuVeChungTaiKho = 0;
  let tongDaThuVe = 0;

  lichSuThuVe.forEach((rec) => {
    const items = rec.items?.length ? rec.items : [];
    if (!items.length) {
      const retQty = Number(rec.totalKegs) || 0;
      if (retQty > 0) {
        tongDaThuVe = round2(tongDaThuVe + retQty);
        tongThuVeChungTaiKho = round2(tongThuVeChungTaiKho + retQty);
      }
      return;
    }

    items.forEach((it) => {
      const retQty = Number(it.quantity) || 0;
      if (retQty <= 0) return;
      tongDaThuVe = round2(tongDaThuVe + retQty);

      const rawId = String(it.productId || "").trim();
      if (!rawId || rawId === MA_KHO_TONG_THU_VE) {
        tongThuVeChungTaiKho = round2(tongThuVeChungTaiKho + retQty);
        return;
      }

      const partnerObj = input.partners.find((p) => p.id === rawId);
      const grp = maNhomDonVi(rawId, partnerObj?.name || it.productName || rawId);
      const row = ensure(grp.id, grp.name, grp.isStandard206);
      row.kegsReturned = round2(row.kegsReturned + retQty);
    });
  });

  const theoDonVi = Array.from(map.values())
    .map((r) => ({
      ...r,
      kegsOutstanding: round2(r.kegsDelivered - r.kegsReturned),
    }))
    .sort(
      (a, b) =>
        b.kegsOutstanding - a.kegsOutstanding ||
        b.kegsDelivered - a.kegsDelivered ||
        a.unitName.localeCompare(b.unitName, "vi"),
    );

  const tongDaGiao = giao.totals.allKegsDelivered;
  return {
    theoDonVi,
    tongDaGiao,
    tongDaThuVe,
    tongThuVeChungTaiKho,
    dangConNgoaiThiTruong: round2(tongDaGiao - tongDaThuVe),
    lichSuThuVe,
  };
}

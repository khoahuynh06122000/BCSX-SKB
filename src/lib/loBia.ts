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
  Product,
  Transaction,
} from "../types";
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
 * Quy đổi số lượng thành số Keg hoặc Thùng (24 lon) để đối chiếu ảnh hiện trạng.
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

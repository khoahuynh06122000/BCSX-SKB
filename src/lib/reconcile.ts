/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐỐI SOÁT XUẤT KHO ↔ HÓA ĐƠN
 *
 * Câu hỏi nghiệp vụ: hàng đã rời kho có ra hóa đơn đủ chưa?
 *
 * Kho ghi số theo đơn vị kho (Lon / Lít), hóa đơn ghi theo đơn vị bán
 * (LON / LIT), nên phải hạ cả hai về LÍT rồi mới trừ nhau — nếu không thì
 * cộng lẫn lon với lít và con số ra vô nghĩa.
 *
 * Tách khỏi App.tsx để chạy thử được bằng dữ liệu giả, không cần mở app.
 */

import type { Product, RevenueRecord, Transaction } from "../types";

/** Ngưỡng coi là khớp: 1% sản lượng xuất, tối thiểu 1 lít. */
export const RECON_TOLERANCE_RATIO = 0.01;
export const RECON_TOLERANCE_LITERS = 1;

/** Số ml của MỘT đơn vị kho (1 Lon = 330ml, 1 Lít = 1000ml, 1 Bom = 20000ml). */
export const mlPerStockUnit = (product?: Product | null): number =>
  product
    ? (product.capacityPerUnit || 0) * (product.conversionFactor || 1)
    : 0;

/** Số lít tương ứng với một số lượng ghi theo ĐƠN VỊ KHO của sản phẩm. */
export const litersOf = (quantity: any, product?: Product | null): number =>
  ((Number(quantity) || 0) * mlPerStockUnit(product)) / 1000;

/**
 * Chuẩn hóa chuỗi để so khớp: bỏ dấu tiếng Việt, bỏ khoảng trắng và ký tự lạ,
 * hạ chữ thường. "Bia Wings Dark Lager 330ml" -> "biawingsdarklager330ml".
 *
 * Chữ "đ" phải xử lý riêng: nó là một chữ cái Latin độc lập (U+0111) chứ không
 * phải "d" cộng dấu, nên normalize("NFD") KHÔNG tách ra được. Nếu bỏ qua thì
 * "Bia Đặc Biệt" thành "biaacbiet" (mất luôn chữ d) và sản phẩm có chữ "đ" sẽ
 * bị báo sai là chưa khớp danh mục.
 */
export const normalizeKey = (s: any): string =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");

/**
 * Tìm sản phẩm trong danh mục cho một dòng doanh thu.
 *
 * CÓ TÍNH KHẮT KHE: chỉ khớp bằng MÃ VẬT TƯ, hoặc bằng TÊN đã chuẩn hóa trùng
 * khớp tuyệt đối. KHÔNG dùng khớp "chứa chuỗi con", vì tên bia hơi
 * ("Bia Wings Dark Lager") nằm trọn trong tên bia lon
 * ("Bia Wings Dark Lager 330ml") — khớp mờ sẽ gán sai lít vào sai dòng.
 * Dòng nào không khớp được hiện riêng ở bảng đối soát để người dùng sửa tên
 * hoặc bổ sung mã vật tư, thay vì bị âm thầm tính sai.
 */
export const matchRevenueProduct = (
  products: Product[],
  row: { materialCode?: string; productName?: string },
): Product | undefined => {
  const code = String(row.materialCode || "").trim();
  if (code) {
    const byCode = products.find(
      (p) => String(p.materialCode || "").trim() === code,
    );
    if (byCode) return byCode;
  }
  const name = normalizeKey(row.productName);
  if (!name) return undefined;
  return products.find((p) => normalizeKey(p.name) === name);
};

/**
 * Số lít của một dòng hóa đơn. Ưu tiên ĐƠN VỊ GHI TRÊN HÓA ĐƠN, vì hóa đơn có
 * thể bán lẻ theo lon trong khi kho quản lý theo lít (hoặc ngược lại). Trả về
 * kèm cờ lệch đơn vị để bảng đối soát cảnh báo.
 */
export const revenueRowLiters = (
  row: { quantity: any; unit?: string },
  product?: Product | null,
): { liters: number; unitMismatch: boolean } => {
  const qty = Number(row.quantity) || 0;
  const u = normalizeKey(row.unit);
  const stockUnit = normalizeKey(product?.unit);

  let ml = 0;
  if (u.startsWith("lit") || u === "l") ml = 1000;
  else if (u.startsWith("lon") || u.startsWith("chai"))
    ml = product?.capacityPerUnit || 330;
  else if (u.startsWith("ml")) ml = 1;
  else ml = mlPerStockUnit(product); // không đọc được đơn vị -> theo đơn vị kho

  return {
    liters: (qty * ml) / 1000,
    unitMismatch: Boolean(u && stockUnit && u !== stockUnit),
  };
};

export type ReconStatus =
  | "ok"
  | "under"
  | "over"
  | "no-invoice"
  | "no-export"
  | "unmatched"
  | "no-capacity";

export const RECON_STATUS_LABEL: Record<ReconStatus, string> = {
  ok: "Khớp",
  under: "Thiếu hóa đơn",
  over: "Hóa đơn vượt xuất kho",
  "no-invoice": "Chưa có hóa đơn",
  "no-export": "Không có phiếu xuất",
  unmatched: "Chưa khớp danh mục",
  "no-capacity": "Thiếu dung tích SP",
};

interface ReconBase {
  key: string;
  productId: string;
  productName: string;
  materialCode: string;
  category: string;
  stockUnit: string;
  exportQty: number;
  exportLiters: number;
  revenueQty: number;
  revenueUnit: string;
  revenueLiters: number;
  revenueAmount: number;
  invoiceCount: number;
  matched: boolean;
  unitMismatch: boolean;
}

export interface ReconRow extends ReconBase {
  diffLiters: number;
  matchPercentage: number;
  withinTolerance: boolean;
  missingCapacity: boolean;
  status: ReconStatus;
}

/**
 * Ghép hai nguồn số lại thành bảng đối soát.
 *
 * Bên kho chỉ tính phiếu xuất ĐÃ GIAO — đơn còn "đi đường" thì hàng chưa đến
 * tay khách nên chưa thể có hóa đơn, đưa vào sẽ báo lệch oan.
 */
export function buildReconciliation(params: {
  transactions: Transaction[];
  revenue: RevenueRecord[];
  products: Product[];
}): ReconRow[] {
  const { transactions, revenue, products } = params;

  const dataMap = new Map<string, ReconBase>();
  const blank = (key: string, base: Partial<ReconBase>): ReconBase => ({
    key,
    productId: "",
    productName: "",
    materialCode: "",
    category: "KHÁC",
    stockUnit: "ĐV",
    exportQty: 0,
    exportLiters: 0,
    revenueQty: 0,
    revenueUnit: "",
    revenueLiters: 0,
    revenueAmount: 0,
    invoiceCount: 0,
    matched: true,
    unitMismatch: false,
    ...base,
  });

  // 1. Bên kho
  transactions.forEach((t) => {
    if (t.type !== "OUT" || t.status === "in_transit") return;

    const product = products.find((p) => p.id === t.productId);
    const key = product ? product.id : `tx:${normalizeKey(t.productName)}`;
    const entry =
      dataMap.get(key) ||
      blank(key, {
        productId: t.productId,
        productName: product?.name || t.productName,
        materialCode: product?.materialCode || "",
        category: product?.category || "KHÁC",
        stockUnit: product?.unit || "ĐV",
        matched: Boolean(product),
      });

    entry.exportQty += Number(t.quantity) || 0;
    entry.exportLiters += litersOf(t.quantity, product);
    dataMap.set(key, entry);
  });

  // 2. Bên hóa đơn — khớp về danh mục bằng mã vật tư, không được thì bằng tên
  const invoicesSeen = new Map<string, Set<string>>();

  revenue.forEach((r) => {
    const product = matchRevenueProduct(products, r);
    const key = product
      ? product.id
      : `rev:${normalizeKey(r.materialCode || r.productName)}`;

    const entry =
      dataMap.get(key) ||
      blank(key, {
        productId: product?.id || "",
        productName: product?.name || r.productName,
        materialCode: product?.materialCode || r.materialCode || "",
        category: product?.category || "KHÁC",
        stockUnit: product?.unit || r.unit || "ĐV",
        matched: Boolean(product),
      });

    const { liters, unitMismatch } = revenueRowLiters(r, product);
    entry.revenueQty += Number(r.quantity) || 0;
    entry.revenueLiters += liters;
    entry.revenueAmount += Number(r.totalAmount) || 0;
    entry.revenueUnit = entry.revenueUnit || r.unit || "";
    if (unitMismatch) entry.unitMismatch = true;

    if (r.invoiceNumber) {
      const set = invoicesSeen.get(key) || new Set<string>();
      set.add(r.invoiceNumber);
      invoicesSeen.set(key, set);
    }
    dataMap.set(key, entry);
  });

  return Array.from(dataMap.values())
    .map((item): ReconRow => {
      const diffLiters = item.exportLiters - item.revenueLiters;
      const tolerance = Math.max(
        RECON_TOLERANCE_LITERS,
        item.exportLiters * RECON_TOLERANCE_RATIO,
      );
      const withinTolerance = Math.abs(diffLiters) <= tolerance;

      // Có số lượng nhưng quy ra 0 lít = sản phẩm thiếu capacityPerUnit.
      // Không đối soát được dòng này, phải sửa danh mục trước.
      const missingCapacity =
        (item.exportQty !== 0 || item.revenueQty !== 0) &&
        item.exportLiters === 0 &&
        item.revenueLiters === 0;

      let status: ReconStatus;
      if (!item.matched) status = "unmatched";
      else if (missingCapacity) status = "no-capacity";
      else if (item.exportLiters > 0 && item.revenueLiters === 0)
        status = "no-invoice";
      else if (item.revenueLiters > 0 && item.exportLiters === 0)
        status = "no-export";
      else if (withinTolerance) status = "ok";
      else status = diffLiters > 0 ? "under" : "over";

      return {
        ...item,
        invoiceCount: invoicesSeen.get(item.key)?.size || 0,
        diffLiters,
        // % sản lượng đã ra hóa đơn so với sản lượng đã xuất kho
        matchPercentage:
          item.exportLiters > 0
            ? (item.revenueLiters / item.exportLiters) * 100
            : item.revenueLiters === 0
              ? 100
              : 0,
        withinTolerance,
        missingCapacity,
        status,
      };
    })
    // Lọc theo SỐ LƯỢNG chứ không theo lít: lọc theo lít thì dòng thiếu dung
    // tích (lít = 0) bị ẩn đi đúng lúc cần hiện ra để sửa.
    .filter((item) => item.exportQty !== 0 || item.revenueQty !== 0)
    .sort((a, b) => Math.abs(b.diffLiters) - Math.abs(a.diffLiters));
}

export interface ReconSummary {
  totalExportLiters: number;
  totalRevenueLiters: number;
  totalAbsDiffLiters: number;
  /** Sản lượng đã xuất nhưng chưa thấy hóa đơn — phần dễ mất doanh thu. */
  missingInvoiceLiters: number;
  totalRevenueAmount: number;
  scorableCount: number;
  issueCount: number;
  unmatchedCount: number;
  noCapacityCount: number;
  unitMismatchCount: number;
  score: number;
}

/**
 * Điểm khớp tính theo SẢN LƯỢNG (lít), không theo số dòng — để một dòng lệch
 * 5.000 lít không bị một dòng lệch 2 lít làm loãng.
 *
 * Chỉ tính trên những dòng ĐỐI SOÁT ĐƯỢC. Dòng chưa khớp danh mục hoặc thiếu
 * dung tích thì số lít không đáng tin, đưa vào chỉ làm điểm sai lệch — đếm
 * riêng và báo thành "lỗi dữ liệu" để người dùng đi sửa.
 */
export function summarizeReconciliation(rows: ReconRow[]): ReconSummary {
  const scorable = rows.filter((r) => r.matched && !r.missingCapacity);

  const totalExport = scorable.reduce((a, r) => a + r.exportLiters, 0);
  const totalRevenue = scorable.reduce((a, r) => a + r.revenueLiters, 0);
  const totalAbsDiff = scorable.reduce(
    (a, r) => a + Math.abs(r.diffLiters),
    0,
  );

  const missingInvoiceLiters = scorable
    .filter((r) => r.status === "under" || r.status === "no-invoice")
    .reduce((a, r) => a + r.diffLiters, 0);

  return {
    totalExportLiters: totalExport,
    totalRevenueLiters: totalRevenue,
    totalAbsDiffLiters: totalAbsDiff,
    missingInvoiceLiters,
    totalRevenueAmount: rows.reduce((a, r) => a + r.revenueAmount, 0),
    scorableCount: scorable.length,
    issueCount: rows.filter((r) => r.status !== "ok").length,
    unmatchedCount: rows.filter((r) => !r.matched).length,
    noCapacityCount: rows.filter((r) => r.missingCapacity).length,
    unitMismatchCount: rows.filter((r) => r.unitMismatch).length,
    score:
      totalExport === 0
        ? totalRevenue === 0
          ? 100
          : 0
        : Math.max(0, 100 - (totalAbsDiff / totalExport) * 100),
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GOM ẢNH CHO THƯ VIỆN ẢNH
 *
 * Ảnh minh chứng của hai chiều nằm ở HAI CHỖ KHÁC NHAU, và đó chính là chỗ
 * thư viện ảnh bị hụt:
 *
 *   Nhập kho → ảnh tờ phiếu đã ký, lưu ở `slips[].signedPhotoUrls`
 *   Xuất kho → ảnh biên bản, lưu ở `transactions[].evidencePhotoUrl(s)`
 *
 * Từ khi có quy trình in–ký, ảnh nhập kho không còn gắn vào giao dịch nữa mà
 * gắn vào PHIẾU — vì một tờ phiếu ký chung cho cả loạt mặt hàng trong lượt
 * giao đó. Thư viện ảnh vẫn chỉ đọc `transactions[].evidencePhotoUrl`, nên tab
 * Nhập kho luôn trống trơn dù người dùng đã tải ảnh lên đầy đủ.
 *
 * Ảnh nhập kho cũ (từ trước khi có phiếu) vẫn nằm trên giao dịch, nên vẫn phải
 * gom cả hai nguồn — bỏ nguồn cũ là mất trắng ảnh của những tháng trước.
 *
 * Xuất kho cũng đang hụt: giao dịch có thể mang NHIỀU ảnh trong
 * `evidencePhotoUrls`, nhưng thư viện chỉ lấy đúng tấm đầu ở `evidencePhotoUrl`.
 * Ở đây gom cả mảng.
 */

import type { ImportSlip, Transaction } from "../types";

/** Một tấm ảnh đã chuẩn hoá để bày lên lưới, bất kể nó đến từ nguồn nào. */
export interface AnhThuVien {
  /** Duy nhất trong cả lưới; dùng làm khoá React và tên tệp khi tải về. */
  id: string;
  url: string;
  /** ISO. Dùng để lọc theo tháng và xếp thứ tự. */
  date: string;
  tieuDe: string;
  phu: string;
  /**
   * Tên đơn vị nhận hàng, để lọc bằng danh sách chọn.
   *
   * Tách riêng khỏi `timKiem` vì hai việc khác nhau: gõ tra cứu thì phải nhớ
   * tên, còn danh sách chọn thì bày sẵn ra. Ảnh nhập kho gom theo phiếu có thể
   * không có đơn vị nào rõ ràng, lúc đó để rỗng.
   */
  donVi: string;
  /** Chữ để tra cứu: mã lô, mã phiếu, tên đối tác, tên hàng. Đã hạ chữ thường. */
  timKiem: string;
}

/** `2026-08-05T08:00:00Z` → `2026-08-05`, để so với biên ngày người dùng chọn. */
function ngayCua(iso: string): string {
  return String(iso ?? "").slice(0, 10);
}

/** Ảnh thật thì phải có đường dẫn; bỏ chuỗi rỗng và giá trị thiếu. */
function gomUrl(...v: (string | undefined | null)[]): string[] {
  const ra: string[] = [];
  v.forEach((u) => {
    const s = String(u ?? "").trim();
    if (s && !ra.includes(s)) ra.push(s);
  });
  return ra;
}

export interface ThuVienInput {
  transactions: Transaction[];
  slips: ImportSlip[];
  loai: "IN" | "OUT";
  /**
   * Khoảng ngày, dạng `yyyy-MM-dd`. Để trống nghĩa là KHÔNG chặn phía đó.
   *
   * Chọn khoảng ngày thay vì chọn tháng: ảnh cần tra thường gắn với một lượt
   * giao cụ thể ("hôm kia giao cho Cầu Vàng"), mà lượt giao thì không nằm gọn
   * trong ranh giới tháng. Ô chọn tháng bắt người ta mở cả tháng rồi tự dò.
   */
  tuNgay: string;
  denNgay: string;
  tuKhoa: string;
}

/**
 * Dựng danh sách ảnh cho một chiều, đã lọc theo tháng và từ khoá.
 *
 * Xếp mới nhất lên trước: ảnh vừa tải lên là thứ người dùng đang muốn xem lại.
 */
export function dungAnhThuVien(input: ThuVienInput): AnhThuVien[] {
  const { transactions, slips, loai } = input;
  const ra: AnhThuVien[] = [];

  if (loai === "IN") {
    // Nguồn chính: ảnh tờ phiếu đã ký.
    const theoPhieu = new Map<string, Transaction[]>();
    transactions.forEach((t) => {
      if (!t.slipCode) return;
      const ds = theoPhieu.get(t.slipCode);
      if (ds) ds.push(t);
      else theoPhieu.set(t.slipCode, [t]);
    });

    slips.forEach((s) => {
      const anh = gomUrl(...(s.signedPhotoUrls || []));
      if (!anh.length) return;
      const lienQuan = theoPhieu.get(s.code) || [];
      const tenHang = lienQuan.map((t) => t.productName).filter(Boolean);
      const lo = lienQuan.map((t) => t.batchNumber || "").filter(Boolean);
      // Ngày của phiếu lấy theo giao dịch nếu có: `slips.date` chỉ có ngày,
      // còn giao dịch có cả giờ nên xếp thứ tự sát thực tế hơn.
      const ngay = lienQuan[0]?.date || s.date;

      anh.forEach((url, i) => {
        ra.push({
          id: `slip-${s.code}-${i}`,
          url,
          date: ngay,
          tieuDe: `Phiếu ${s.code}`,
          phu: tenHang.length
            ? `${tenHang.length} mặt hàng · ${tenHang[0]}`
            : "Chưa khớp giao dịch nào",
          donVi: lienQuan[0]?.partnerName || "",
          timKiem: [s.code, ...lo, ...tenHang].join(" ").toLowerCase(),
        });
      });
    });

    // Nguồn cũ: ảnh gắn thẳng vào giao dịch nhập, từ trước khi có phiếu.
    transactions.forEach((t) => {
      if (t.type !== "IN" && t.type !== "OPENING") return;
      const anh = gomUrl(t.evidencePhotoUrl, ...(t.evidencePhotoUrls || []));
      anh.forEach((url, i) => {
        ra.push({
          id: `tx-${t.id}-${i}`,
          url,
          date: t.date,
          tieuDe: t.productName,
          phu: t.batchNumber ? `Lô ${t.batchNumber}` : t.partnerName,
          donVi: t.partnerName || "",
          timKiem: [t.batchNumber || "", t.productName, t.partnerName]
            .join(" ")
            .toLowerCase(),
        });
      });
    });
  } else {
    transactions.forEach((t) => {
      if (t.type !== "OUT") return;
      const anh = gomUrl(t.evidencePhotoUrl, ...(t.evidencePhotoUrls || []));
      anh.forEach((url, i) => {
        ra.push({
          id: `tx-${t.id}-${i}`,
          url,
          date: t.date,
          tieuDe: t.productName,
          phu: t.partnerName,
          donVi: t.partnerName || "",
          timKiem: [t.partnerName, t.productName, t.batchNumber || ""]
            .join(" ")
            .toLowerCase(),
        });
      });
    });
  }

  const q = input.tuKhoa.trim().toLowerCase();
  const tu = input.tuNgay.trim();
  const den = input.denNgay.trim();

  return ra
    .filter((a) => {
      const ngay = ngayCua(a.date);
      // So sánh chuỗi được vì `yyyy-MM-dd` xếp theo bảng chữ cái trùng với xếp
      // theo thời gian. Không dựng Date để tránh lệch múi giờ ở hai đầu biên.
      if (tu && ngay < tu) return false;
      if (den && ngay > den) return false;
      if (q && !a.timKiem.includes(q)) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Danh sách đơn vị có ảnh trong đúng bộ ảnh truyền vào, xếp theo bảng chữ cái.
 *
 * Dựng từ chính bộ ảnh ĐANG XEM chứ không lấy từ danh mục đối tác: danh mục có
 * hàng chục đơn vị mà phần lớn không có ảnh trong khoảng ngày đang chọn, bày ra
 * hết thì người dùng chọn phải một đơn vị rồi thấy lưới trống, không hiểu vì
 * sao. Bày đúng những đơn vị chọn vào là có ảnh.
 */
export function danhSachDonVi(anh: AnhThuVien[]): string[] {
  const co = new Set<string>();
  anh.forEach((a) => {
    const d = String(a.donVi ?? "").trim();
    if (d) co.add(d);
  });
  return Array.from(co).sort((a, b) => a.localeCompare(b, "vi"));
}

/** Lọc theo đúng một đơn vị. Để trống là lấy hết. */
export function locTheoDonVi(anh: AnhThuVien[], donVi: string): AnhThuVien[] {
  const d = String(donVi ?? "").trim();
  if (!d) return anh;
  return anh.filter((a) => a.donVi === d);
}

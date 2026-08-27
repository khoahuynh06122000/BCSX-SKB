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
import { laBoPhanBNC, nhomCuaBoPhan, NHOM_BNC, tenNhomBNC } from "./nhomBNC";

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
  /**
   * Mã đối tác (`partnerId`), để biết bộ phận này thuộc phần nào của BNC.
   *
   * Không suy từ tên: tên là chữ người đọc, đổi cách viết là hỏng. Mã thì cố
   * định — `AD0103-NG` mãi là Ngoại giao.
   */
  maDonVi: string;
  /**
   * Số dòng giao dịch dùng chung tấm ảnh này. Chỉ có nghĩa sau khi gộp trùng.
   *
   * Một tờ biên bản ký chung cho cả lượt giao nên gắn vào nhiều dòng; gộp lại
   * thì phải nói ra tờ này ký cho mấy mặt hàng, không thì mất thông tin.
   */
  soDongDungChung?: number;
  /** Chữ phụ gốc, giữ lại để dựng lại khi gộp trùng. */
  phuGoc: string;
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

      const phuPhieu = tenHang.length
        ? `${tenHang.length} mặt hàng · ${tenHang[0]}`
        : "Chưa khớp giao dịch nào";

      anh.forEach((url, i) => {
        ra.push({
          id: `slip-${s.code}-${i}`,
          url,
          date: ngay,
          tieuDe: `Phiếu ${s.code}`,
          phu: phuPhieu,
          phuGoc: phuPhieu,
          donVi: lienQuan[0]?.partnerName || "",
          maDonVi: lienQuan[0]?.partnerId || "",
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
          phuGoc: t.batchNumber ? `Lô ${t.batchNumber}` : t.partnerName,
          donVi: t.partnerName || "",
          maDonVi: t.partnerId || "",
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
          phuGoc: t.partnerName,
          donVi: t.partnerName || "",
          maDonVi: t.partnerId || "",
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

  // Gộp trùng SAU KHI xếp thứ tự: gộp giữ tấm đầu tiên, nên phải xếp mới nhất
  // lên trước rồi mới gộp, không thì tấm giữ lại mang ngày của dòng bất kỳ.
  return gopAnhTrung(
    ra
      .filter((a) => {
        const ngay = ngayCua(a.date);
        // So sánh chuỗi được vì `yyyy-MM-dd` xếp theo bảng chữ cái trùng với
        // xếp theo thời gian. Không dựng Date để tránh lệch múi giờ ở hai đầu
        // biên.
        if (tu && ngay < tu) return false;
        if (den && ngay > den) return false;
        if (q && !a.timKiem.includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
}

/**
 * BNC GỘP THÀNH BỐN PHẦN TRONG Ô CHỌN ĐƠN VỊ.
 *
 * BNC có 20 bộ phận nên trước đây ô chọn dài 20 dòng chỉ toàn "BNC · ...", lấn
 * hết những đơn vị còn lại. Gộp lại đúng bốn phần như màn xuất kho: Nội bộ,
 * Ngoại giao, HTKD, Chi phí khác. Chọn Nội bộ thì hiện thêm ô chọn điểm bán,
 * nên vẫn xem được riêng từng quán — không mất gì so với trước.
 *
 * Giá trị lọc của bốn phần mang tiền tố `BNC:` để không lẫn với tên đơn vị
 * thật. Tên đơn vị là chữ người gõ, có ngày sẽ có đơn vị tên đúng bằng "Nội bộ".
 */
const TIEN_TO_PHAN = "BNC:";

export interface MucDonVi {
  /** Giá trị đưa vào `locTheoDonVi`. */
  gia: string;
  /** Chữ bày lên ô chọn. */
  ten: string;
}

/**
 * Đơn vị để bày lên ô chọn, xếp theo bảng chữ cái, BNC gộp thành bốn phần.
 *
 * Dựng từ chính bộ ảnh ĐANG XEM chứ không lấy từ danh mục đối tác: danh mục có
 * hàng chục đơn vị mà phần lớn không có ảnh trong khoảng ngày đang chọn, bày ra
 * hết thì người dùng chọn phải một đơn vị rồi thấy lưới trống, không hiểu vì
 * sao. Bày đúng những đơn vị chọn vào là có ảnh — bốn phần của BNC cũng vậy,
 * phần nào không có ảnh thì không bày.
 */
export function danhSachDonVi(anh: AnhThuVien[]): MucDonVi[] {
  const ngoaiBNC = new Set<string>();
  const phanCoAnh = new Set<string>();
  anh.forEach((a) => {
    if (laBoPhanBNC(a.maDonVi)) {
      const n = nhomCuaBoPhan(a.maDonVi);
      if (n) phanCoAnh.add(n);
      return;
    }
    const d = String(a.donVi ?? "").trim();
    if (d) ngoaiBNC.add(d);
  });

  const ra: MucDonVi[] = Array.from(ngoaiBNC)
    .sort((a, b) => a.localeCompare(b, "vi"))
    .map((d) => ({ gia: d, ten: d }));

  // Bốn phần xếp liền nhau theo thứ tự cố định của `NHOM_BNC`, đặt lên đầu:
  // BNC là nơi nhận phần lớn sản lượng nên cũng là nơi tra ảnh nhiều nhất.
  const phan: MucDonVi[] = NHOM_BNC.filter((n) => phanCoAnh.has(n.ma)).map(
    (n) => ({ gia: `${TIEN_TO_PHAN}${n.ma}`, ten: `BNC · ${n.ten}` }),
  );
  return [...phan, ...ra];
}

/** Lọc theo một đơn vị, hoặc theo một phần của BNC. Để trống là lấy hết. */
export function locTheoDonVi(anh: AnhThuVien[], donVi: string): AnhThuVien[] {
  const d = String(donVi ?? "").trim();
  if (!d) return anh;
  if (d.startsWith(TIEN_TO_PHAN)) {
    const ma = d.slice(TIEN_TO_PHAN.length);
    return anh.filter((a) => nhomCuaBoPhan(a.maDonVi) === ma);
  }
  return anh.filter((a) => a.donVi === d);
}

/**
 * Điểm bán có ảnh trong một phần của BNC, để bày ô chọn thứ hai.
 *
 * Trả rỗng khi phần đó chỉ có đúng một bộ phận (Ngoại giao, HTKD, Chi phí
 * khác): bày một ô chọn có đúng một dòng thì chỉ làm rối, chọn hay không cũng
 * ra cùng bộ ảnh.
 */
export function danhSachBoPhanBNC(anh: AnhThuVien[]): string[] {
  const co = new Set<string>();
  anh.forEach((a) => {
    if (!laBoPhanBNC(a.maDonVi)) return;
    const d = String(a.donVi ?? "").trim();
    if (d) co.add(d);
  });
  if (co.size < 2) return [];
  return Array.from(co).sort((a, b) => a.localeCompare(b, "vi"));
}

/** Tên hiển thị của một giá trị lọc, để nói rõ đang lọc cái gì. */
export function tenLocDonVi(gia: string): string {
  const d = String(gia ?? "").trim();
  if (!d) return "";
  if (d.startsWith(TIEN_TO_PHAN)) {
    const ten = tenNhomBNC(
      d.slice(TIEN_TO_PHAN.length) as Parameters<typeof tenNhomBNC>[0],
    );
    return ten ? `BNC · ${ten}` : d;
  }
  return d;
}

/** Kiểu đường dẫn của một tấm ảnh, để nói đúng vì sao nó không tải được. */
export type KieuDuongDanAnh =
  | "rong"
  | "nhung"
  | "tam"
  | "khong-hop-le"
  | "mang";

/**
 * Xem một đường dẫn ảnh thuộc kiểu nào.
 *
 * Bốn kiểu sai đều đã gặp trong dữ liệu thật của app, và mỗi kiểu phải xử lý
 * một cách khác nhau — nên không gộp hết thành "ảnh lỗi":
 *
 *   nhung        `data:image/...` — bản đầu của app nhét ảnh base64 vào tài
 *                liệu Firestore. Tài liệu tối đa 1 MiB nên khối base64 có thể
 *                đã bị cắt cụt, cắt cụt thì không giải ra ảnh. Xem `anhCu.ts`.
 *   tam          `blob:` — đường dẫn tạm của trình duyệt, chỉ sống trong đúng
 *                phiên đó. Lưu được vào Firestore nhưng tải lại trang là chết,
 *                nghĩa là lúc lưu đã không tải ảnh lên máy chủ.
 *   khong-hop-le Không bắt đầu bằng `http` — thiếu địa chỉ máy chủ ảnh, thường
 *                là lưu mỗi mã ảnh thay vì lưu cả đường dẫn.
 *   mang         Đường dẫn đúng nhưng máy chủ trả về lỗi: ảnh đã bị xoá.
 */
export function kieuDuongDanAnh(url: string): KieuDuongDanAnh {
  const u = String(url ?? "").trim();
  if (!u) return "rong";
  if (u.startsWith("data:")) return "nhung";
  if (u.startsWith("blob:")) return "tam";
  if (!/^https?:\/\//i.test(u)) return "khong-hop-le";
  return "mang";
}

/** Ảnh nhúng thẳng vào tài liệu chứ không phải đường dẫn. */
export function laAnhNhung(url: string): boolean {
  return kieuDuongDanAnh(url) === "nhung";
}

/** Câu giải thích khi một tấm không tải được, để ô ảnh nói ra thay vì để trắng. */
export function lyDoAnhLoi(url: string): string {
  switch (kieuDuongDanAnh(url)) {
    case "rong":
      return "Không có đường dẫn ảnh";
    case "nhung":
      return "Ảnh cũ nhúng trong hệ thống, có thể đã bị cắt";
    case "tam":
      return "Ảnh chưa tải lên máy chủ, chỉ lưu đường dẫn tạm";
    case "khong-hop-le":
      return "Đường dẫn ảnh không hợp lệ";
    default:
      return "Ảnh không còn trên máy chủ ảnh";
  }
}

/**
 * GỘP NHỮNG TẤM TRÙNG NHAU — cùng một đường dẫn là cùng một tệp ảnh.
 *
 * Một tờ biên bản ký chung cho cả loạt mặt hàng trong lượt giao, mà ảnh thì
 * gắn vào TỪNG DÒNG giao dịch — nên cùng một tờ hiện lại năm lần trên lưới,
 * đúng chỗ đã phải sửa ở phân hệ Đơn BNC. Xem lưới thì tưởng có năm tấm minh
 * chứng, tải hàng loạt thì tải cùng một tệp năm lần với năm cái tên khác nhau.
 *
 * Giữ tấm ĐẦU TIÊN (đã xếp mới nhất trước) và ghi lại số dòng dùng chung tấm
 * ấy, để ô ảnh nói rõ tờ này ký cho mấy mặt hàng.
 */
export function gopAnhTrung(anh: AnhThuVien[]): AnhThuVien[] {
  const theoUrl = new Map<string, AnhThuVien>();
  anh.forEach((a) => {
    const co = theoUrl.get(a.url);
    if (!co) {
      theoUrl.set(a.url, { ...a, soDongDungChung: 1 });
      return;
    }
    co.soDongDungChung = (co.soDongDungChung ?? 1) + 1;
    // Tên mặt hàng của dòng đầu không nói hết được cả tờ biên bản, nên khi có
    // từ hai dòng trở lên thì ghi thêm số mặt hàng vào chữ phụ.
    co.phu = `${co.phuGoc} · ${co.soDongDungChung} mặt hàng`;
  });
  return Array.from(theoUrl.values());
}

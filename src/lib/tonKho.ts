/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TỒN KHO THEO KỲ — NHẬP · XUẤT · TỒN
 *
 * Màn hình tồn kho cũ chỉ trả lời được đúng một câu: "ngay lúc này còn bao
 * nhiêu". Câu người làm kế toán cần lại là câu khác: "từ ngày 1 đến ngày 25,
 * đầu kỳ bao nhiêu, nhập vào bao nhiêu, xuất ra bao nhiêu, còn lại bao nhiêu" —
 * đó mới là bốn con số đi vào báo cáo và đối chiếu được với chứng từ.
 *
 * TỒN LÀ MỘT MỐC, KHÔNG PHẢI MỘT KHOẢNG. Chọn khoảng ngày không có nghĩa là
 * "tồn trong khoảng đó" — không có con số nào như thế. Nó có nghĩa là:
 *
 *   Đầu kỳ  = tồn tính tới HẾT NGÀY TRƯỚC `tuNgay`
 *   Nhập    = cộng trong khoảng
 *   Xuất    = trừ trong khoảng
 *   Cuối kỳ = tồn tính tới HẾT NGÀY `denNgay`  ( = đầu kỳ + nhập − xuất )
 *
 * DÙNG ĐÚNG PHÉP TÍNH CỦA MÀN HÌNH CHÍNH. Cùng một tập giao dịch được tính vào
 * tồn (`stockTransactions`), cùng cách phân loại tăng/giảm. Lệch một chút là
 * hai chỗ trong app nói hai con số khác nhau về cùng một mặt hàng, mà không có
 * gì báo lỗi — người dùng chỉ biết khi đã in báo cáo ra.
 */

import type { Product, Transaction } from "../types";

/**
 * Loại giao dịch này làm tồn kho tăng, giảm, hay không đụng tới.
 *
 * Chép đúng phân loại đang dùng để tính tồn theo lô ở màn hình chính. Có cả
 * `DAMAGE` và `ADJUST_OUT` dù kiểu dữ liệu chưa khai `ADJUST_OUT`: dữ liệu cũ
 * có thể mang loại ấy, và bỏ sót một loại GIẢM thì tồn báo cao hơn thực tế.
 */
export function dauCuaLoai(type: string): 1 | -1 | 0 {
  if (type === "IN" || type === "OPENING") return 1;
  if (
    type === "OUT" ||
    type === "LOSS" ||
    type === "DAMAGE" ||
    type === "ADJUST_OUT"
  ) {
    return -1;
  }
  return 0;
}

/** Một dòng của bảng nhập · xuất · tồn. */
export interface DongTonKy {
  productId: string;
  tenHang: string;
  category: string;
  unit: string;
  /** Tồn tính tới hết ngày trước `tuNgay`. */
  dauKy: number;
  /** Nhập kho và tồn đầu kỳ phát sinh trong khoảng. */
  nhap: number;
  /** Xuất bán trong khoảng. */
  xuatBan: number;
  /** Hao hụt, hàng hỏng, điều chỉnh giảm trong khoảng. */
  haoHut: number;
  /** `xuatBan + haoHut`. */
  xuat: number;
  /** `dauKy + nhap - xuat`. */
  cuoiKy: number;
  /**
   * Đã điền trong kỳ nhưng chưa có ảnh phiếu ký — CHƯA nằm trong bốn số trên.
   *
   * Cố ý tách riêng, không cộng vào nhập: cộng vào là bỏ mất lớp khoá chữ ký
   * mà không có gì báo lỗi. Xem `slip.ts`.
   */
  choKy: number;
  /** Định mức tồn tối thiểu, để bày cảnh báo. */
  minStock: number;
}

export interface BangTonKy {
  dong: DongTonKy[];
  tong: {
    dauKy: number;
    nhap: number;
    xuatBan: number;
    haoHut: number;
    xuat: number;
    cuoiKy: number;
    choKy: number;
    /** Số mặt hàng có phát sinh trong kỳ. */
    soMatHangCoPhatSinh: number;
    /** Số mặt hàng cuối kỳ dưới định mức. */
    soMatHangDuoiDinhMuc: number;
  };
}

export interface BangTonKyInput {
  /** Giao dịch ĐÃ LỌC theo `stockTransactions` — chỉ những gì được tính tồn. */
  giaoDichTinhTon: Transaction[];
  /** Giao dịch chưa có ảnh phiếu ký, để đếm cột chờ ký. */
  giaoDichChoKy: Transaction[];
  products: Product[];
  /** `yyyy-MM-dd`. Để trống là không chặn phía đó. */
  tuNgay: string;
  denNgay: string;
  /** Lọc theo tên hoặc mã mặt hàng; để trống là lấy hết. */
  tuKhoa?: string;
  /** Định mức chung khi mặt hàng chưa đặt riêng. */
  dinhMucChung?: number;
}

const ngayCua = (iso: string): string => String(iso ?? "").slice(0, 10);

/** Bỏ dấu tiếng Việt để tra cứu không phụ thuộc cách gõ. */
function chuanHoa(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // Chữ đ là chữ cái Latin độc lập, normalize("NFD") không tách được.
    .replace(/đ/g, "d")
    .trim();
}

/**
 * Dựng bảng nhập · xuất · tồn cho một khoảng ngày.
 *
 * So sánh ngày bằng chuỗi `yyyy-MM-dd`: xếp theo bảng chữ cái trùng với xếp
 * theo thời gian, và không dựng `Date` nên không lệch một ngày ở hai đầu biên
 * vì múi giờ — lệch một ngày ở đây là số đầu kỳ sai cả kỳ.
 */
export function dungBangTonKy(input: BangTonKyInput): BangTonKy {
  const tu = String(input.tuNgay ?? "").trim();
  const den = String(input.denNgay ?? "").trim();
  const dinhMucChung = input.dinhMucChung ?? 0;

  const q = chuanHoa(input.tuKhoa ?? "");
  const sanPham = input.products.filter(
    (p) =>
      !q ||
      chuanHoa(p.name).includes(q) ||
      chuanHoa(p.id).includes(q) ||
      chuanHoa(p.materialCode ?? "").includes(q),
  );

  const dong = new Map<string, DongTonKy>();
  sanPham.forEach((p) => {
    dong.set(p.id, {
      productId: p.id,
      tenHang: p.name,
      category: p.category,
      unit: p.unit,
      dauKy: 0,
      nhap: 0,
      xuatBan: 0,
      haoHut: 0,
      xuat: 0,
      cuoiKy: 0,
      choKy: 0,
      minStock: p.minStock ?? dinhMucChung,
    });
  });

  input.giaoDichTinhTon.forEach((t) => {
    const d = dong.get(t.productId);
    if (!d) return;
    const dau = dauCuaLoai(t.type);
    if (dau === 0) return;
    const sl = Number(t.quantity) || 0;
    if (!sl) return;
    const ngay = ngayCua(t.date);

    // TRƯỚC kỳ → dồn vào đầu kỳ. Không chặn phía dưới thì mọi thứ trước
    // `denNgay` đều tính, nên đầu kỳ rỗng và cuối kỳ chính là tồn tới nay.
    if (tu && ngay < tu) {
      d.dauKy += dau * sl;
      return;
    }
    // SAU kỳ → bỏ hẳn, không tính vào đâu cả.
    if (den && ngay > den) return;

    if (dau === 1) d.nhap += sl;
    else if (t.type === "OUT") d.xuatBan += sl;
    else d.haoHut += sl;
  });

  input.giaoDichChoKy.forEach((t) => {
    const d = dong.get(t.productId);
    if (!d) return;
    const ngay = ngayCua(t.date);
    if (tu && ngay < tu) return;
    if (den && ngay > den) return;
    d.choKy += Number(t.quantity) || 0;
  });

  const ds = Array.from(dong.values());
  ds.forEach((d) => {
    d.xuat = d.xuatBan + d.haoHut;
    d.cuoiKy = d.dauKy + d.nhap - d.xuat;
  });

  // Xếp mặt hàng có phát sinh lên trước, rồi theo tồn cuối kỳ: mặt hàng đứng im
  // cả kỳ không phải thứ người xem báo cáo tìm.
  ds.sort((a, b) => {
    const pa = a.nhap + a.xuat > 0 ? 1 : 0;
    const pb = b.nhap + b.xuat > 0 ? 1 : 0;
    return pb - pa || b.cuoiKy - a.cuoiKy || a.tenHang.localeCompare(b.tenHang, "vi");
  });

  const cong = (lay: (d: DongTonKy) => number) =>
    ds.reduce((n, d) => n + lay(d), 0);

  return {
    dong: ds,
    tong: {
      dauKy: cong((d) => d.dauKy),
      nhap: cong((d) => d.nhap),
      xuatBan: cong((d) => d.xuatBan),
      haoHut: cong((d) => d.haoHut),
      xuat: cong((d) => d.xuat),
      cuoiKy: cong((d) => d.cuoiKy),
      choKy: cong((d) => d.choKy),
      soMatHangCoPhatSinh: ds.filter((d) => d.nhap + d.xuat > 0).length,
      soMatHangDuoiDinhMuc: ds.filter(
        (d) => d.minStock > 0 && d.cuoiKy < d.minStock,
      ).length,
    },
  };
}

/** Câu mô tả khoảng ngày, để in lên đầu báo cáo. */
export function moTaKy(tuNgay: string, denNgay: string): string {
  const tu = String(tuNgay ?? "").trim();
  const den = String(denNgay ?? "").trim();
  if (!tu && !den) return "Toàn bộ thời gian";
  if (!tu) return `Đến hết ${den}`;
  if (!den) return `Từ ${tu} đến nay`;
  return `Từ ${tu} đến ${den}`;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * THEO DÕI ĐƠN CỦA BNC
 *
 * BNC là khu du lịch, và là nơi nhận phần lớn sản lượng. Với SAP thì cả khu
 * chỉ là MỘT khách hàng mã `AD0103` — file công nợ vì vậy chỉ có đúng một dòng
 * "BNC" cho mỗi mặt hàng (xem `congNo.ts`). Nhìn vào đó thì không ai biết
 * trong khu, quán nào uống bao nhiêu.
 *
 * Phân hệ này nhìn theo chiều ngược lại: TÁCH ra tới từng bộ phận. Hai cách
 * nhìn cùng đúng và phục vụ hai việc khác nhau — một cái để xuất hóa đơn cho
 * pháp nhân, một cái để biết bia đi đâu trong khu.
 *
 * ĐƠN VỊ ĐO. Bia hơi tính theo lít, bia lon tính theo lon; cộng thẳng hai loại
 * vào nhau là con số vô nghĩa. Nên giữ riêng hai cột, và thêm một cột "lít quy
 * đổi" (lon × dung tích) chỉ dùng để XẾP HẠNG các bộ phận với nhau.
 *
 * HAO HỤT tính riêng, không trộn vào sản lượng giao. Một keg giao thực tế 20,6
 * lít nhưng biên bản ghi tròn 20 — phần 0,6 lít đó là hao hụt của mình, không
 * phải bia bộ phận nhận được.
 */

import type { Product, Transaction } from "../types";

/** Bộ phận của BNC đều mang khoá dạng `AD0103-XX`. */
export const laBoPhanBNC = (partnerId: string): boolean =>
  String(partnerId ?? "").startsWith("AD0103-");

export interface DonBNC {
  /** = referenceGroupId, hoặc id giao dịch nếu là dòng lẻ. */
  id: string;
  /** yyyy-MM-dd */
  ngay: string;
  partnerId: string;
  boPhan: string;
  /** Số mặt hàng trong đơn. */
  soMatHang: number;
  soLuongLit: number;
  soLuongLon: number;
  /** Lít quy đổi, chỉ để so sánh giữa các bộ phận. */
  litQuyDoi: number;
  haoHut: number;
  /** `di_duong` = chờ ảnh biên bản; `hoan_tat` = đã ghi nhận. */
  trangThai: "di_duong" | "hoan_tat";
  coAnh: boolean;
  /**
   * Ảnh biên bản giao nhận của đơn, gộp từ mọi dòng trong đơn và bỏ trùng.
   *
   * Một đơn có nhiều mặt hàng, mà ảnh biên bản thì gắn vào TỪNG DÒNG giao dịch
   * — cùng một tờ biên bản được gắn lặp lại cho cả loạt dòng. Không bỏ trùng
   * thì bấm xem một đơn năm mặt hàng lại thấy đúng một tấm ảnh lặp năm lần.
   */
  anh: string[];
  /** Ghi chú của dòng đầu — mang thông tin chuyến, điểm nhận. */
  ghiChu: string;
}

export interface TongBoPhan {
  partnerId: string;
  boPhan: string;
  soDon: number;
  soLuongLit: number;
  soLuongLon: number;
  litQuyDoi: number;
  haoHut: number;
  /** Ngày nhận gần nhất, yyyy-MM-dd. */
  lanCuoi: string;
  /** Đơn còn đang đi đường, chưa có biên bản. */
  donChuaXong: number;
}

export interface BangBNC {
  don: DonBNC[];
  theoBoPhan: TongBoPhan[];
  tong: {
    soDon: number;
    soBoPhan: number;
    soLuongLit: number;
    soLuongLon: number;
    litQuyDoi: number;
    haoHut: number;
    donChuaXong: number;
    /** Đơn đã hoàn tất nhưng không có tấm ảnh nào — thiếu chứng từ. */
    donThieuAnh: number;
  };
}

export interface BangBNCInput {
  transactions: Transaction[];
  products: Product[];
  /** `yyyy-MM-dd`, để trống là không chặn. */
  tuNgay: string;
  denNgay: string;
  /** Lọc đúng một bộ phận; để trống là lấy hết. */
  boPhan: string;
  /** Tên bộ phận theo mã, lấy từ danh mục đơn vị. */
  tenBoPhan: Map<string, string>;
}

const ngayCua = (iso: string): string => String(iso ?? "").slice(0, 10);

/** Số lít thật của một dòng: lon quy về lít theo dung tích. */
export function litQuyDoiCuaDong(t: Transaction, p?: Product): number {
  const sl = Number(t.quantity) || 0;
  const ml = p?.capacityPerUnit ?? (t.category === "Lon" ? 330 : 1000);
  return (sl * ml) / 1000;
}

/**
 * Gom giao dịch của BNC thành đơn, rồi tổng theo bộ phận.
 *
 * Một đơn = một `referenceGroupId`, tức một chuyến giao — đúng nhóm mà tab Đơn
 * đi đường và phần nạp file BBGN đang dùng, nên hai màn hình đếm ra cùng một
 * con số. Dòng lẻ không có nhóm thì tự nó là một đơn.
 */
export function dungBangBNC(input: BangBNCInput): BangBNC {
  const sanPham = new Map<string, Product>();
  input.products.forEach((p) => sanPham.set(p.id, p));

  const tu = input.tuNgay.trim();
  const den = input.denNgay.trim();

  const trongKhoang = (t: Transaction) => {
    const n = ngayCua(t.date);
    if (tu && n < tu) return false;
    if (den && n > den) return false;
    return true;
  };

  const cua = input.transactions.filter(
    (t) =>
      laBoPhanBNC(t.partnerId) &&
      (!input.boPhan || t.partnerId === input.boPhan) &&
      (t.type === "OUT" || t.type === "LOSS") &&
      trongKhoang(t),
  );

  const gom = new Map<string, DonBNC>();

  cua.forEach((t) => {
    const khoa = t.referenceGroupId || t.id;
    const sp = sanPham.get(t.productId);
    const lit = litQuyDoiCuaDong(t, sp);
    const laLon = (sp?.category ?? t.category) === "Lon";
    const sl = Number(t.quantity) || 0;

    let d = gom.get(khoa);
    if (!d) {
      d = {
        id: khoa,
        ngay: ngayCua(t.date),
        partnerId: t.partnerId,
        boPhan:
          input.tenBoPhan.get(t.partnerId) || t.partnerName || t.partnerId,
        soMatHang: 0,
        soLuongLit: 0,
        soLuongLon: 0,
        litQuyDoi: 0,
        haoHut: 0,
        // Cả đơn coi là còn đi đường nếu CÓ BẤT KỲ dòng nào chưa xong: chưa
        // xong hết thì chưa xong, gọi là hoàn tất là báo thừa.
        trangThai: "hoan_tat",
        coAnh: false,
        anh: [],
        ghiChu: t.notes || "",
      };
      gom.set(khoa, d);
    }

    if (t.type === "LOSS") {
      d.haoHut += lit;
      return;
    }

    d.soMatHang += 1;
    if (laLon) d.soLuongLon += sl;
    else d.soLuongLit += sl;
    d.litQuyDoi += lit;
    if (t.status === "in_transit") d.trangThai = "di_duong";
    [t.evidencePhotoUrl, ...(t.evidencePhotoUrls || [])].forEach((u) => {
      const url = String(u ?? "").trim();
      if (url && !d!.anh.includes(url)) d!.anh.push(url);
    });
    d.coAnh = d.anh.length > 0;
  });

  const don = Array.from(gom.values()).sort(
    (a, b) => b.ngay.localeCompare(a.ngay) || a.boPhan.localeCompare(b.boPhan, "vi"),
  );

  const theo = new Map<string, TongBoPhan>();
  don.forEach((d) => {
    let o = theo.get(d.partnerId);
    if (!o) {
      o = {
        partnerId: d.partnerId,
        boPhan: d.boPhan,
        soDon: 0,
        soLuongLit: 0,
        soLuongLon: 0,
        litQuyDoi: 0,
        haoHut: 0,
        lanCuoi: "",
        donChuaXong: 0,
      };
      theo.set(d.partnerId, o);
    }
    o.soDon += 1;
    o.soLuongLit += d.soLuongLit;
    o.soLuongLon += d.soLuongLon;
    o.litQuyDoi += d.litQuyDoi;
    o.haoHut += d.haoHut;
    if (d.ngay > o.lanCuoi) o.lanCuoi = d.ngay;
    if (d.trangThai === "di_duong") o.donChuaXong += 1;
  });

  const theoBoPhan = Array.from(theo.values()).sort(
    (a, b) => b.litQuyDoi - a.litQuyDoi,
  );

  return {
    don,
    theoBoPhan,
    tong: {
      soDon: don.length,
      soBoPhan: theoBoPhan.length,
      soLuongLit: don.reduce((s, d) => s + d.soLuongLit, 0),
      soLuongLon: don.reduce((s, d) => s + d.soLuongLon, 0),
      litQuyDoi: don.reduce((s, d) => s + d.litQuyDoi, 0),
      haoHut: don.reduce((s, d) => s + d.haoHut, 0),
      donChuaXong: don.filter((d) => d.trangThai === "di_duong").length,
      // Đã ghi nhận vào kho mà không có tấm ảnh nào là thiếu chứng từ — không
      // chặn được nữa vì hàng đã đi, nhưng phải đếm ra để còn đi đòi.
      donThieuAnh: don.filter((d) => d.trangThai === "hoan_tat" && !d.coAnh)
        .length,
    },
  };
}

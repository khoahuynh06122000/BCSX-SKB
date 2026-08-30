/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PHÂN TÍCH KHO — SỐ LIỆU VÀ KIẾN NGHỊ
 *
 * Bảng điều khiển cũ bày sáu con số bịa (nhiệt độ kho, độ ẩm, tỷ lệ lấy đầy...)
 * cạnh vài con số thật, và con số thật thì cũng không dẫn tới việc gì: nhìn
 * "vòng quay tồn kho 2.1" xong không biết phải làm gì tiếp.
 *
 * Ở đây chỉ tính từ DỮ LIỆU CÓ THẬT trong app — giao dịch nhập xuất, lô hàng,
 * phiếu ký, ảnh biên bản, danh mục mặt hàng — và mỗi con số đều phải trả lời
 * được câu "biết rồi thì làm gì".
 *
 * BA CÂU HỎI BẢNG ĐIỀU KHIỂN PHẢI TRẢ LỜI:
 *
 *   1. Hàng có chạy không?      → xuất mỗi ngày, số ngày tồn kho, tuổi lô
 *   2. Sắp thiếu hàng gì?       → còn đủ bán bao nhiêu ngày cho từng mặt hàng
 *   3. Chứng từ có thiếu không? → đơn thiếu ảnh, phiếu chờ ký, đơn đi đường lâu
 *
 * SỐ NGÀY, KHÔNG PHẢI TỶ LỆ. "Vòng quay 4 lần/tháng" phải quy đổi trong đầu mới
 * hiểu; "còn đủ bán 6 ngày" thì đọc là hành động được ngay. Với bia lại càng
 * đúng: bia có hạn, nên số ngày nằm kho so thẳng được với hạn dùng.
 */

import type { Product, Transaction } from "../types";

/* ------------------------------------------------------------------ ngưỡng */

/**
 * Những mốc quyết định một kiến nghị có hiện ra hay không.
 *
 * Để thành bảng có tên và có lý do, không rải số trần trong mã: đổi chính sách
 * kho thì sửa một chỗ, và đọc bảng này là biết app đang coi thế nào là "gấp".
 */
export const NGUONG = {
  /** Còn đủ bán dưới ngần này ngày là gấp — kịp đặt hàng và chở lên núi. */
  ngayConBanGap: 7,
  /** Dưới ngần này ngày thì cần lên kế hoạch nhập. */
  ngayConBanCanLam: 14,
  /** Lô nằm quá ngần này ngày mà còn tồn thì phải ưu tiên xuất trước. */
  ngayLoTonLau: 30,
  /** Tồn đủ bán quá ngần này ngày là đọng vốn và bia già trước khi tới quán. */
  ngayTonQuaNhieu: 45,
  /** Phiếu nhập chờ ảnh ký quá ngần này ngày: hàng đã về mà chưa vào tồn. */
  ngayChoKyLau: 3,
  /** Đơn đi đường quá ngần này ngày là chưa ai đóng sổ chuyến giao đó. */
  ngayDiDuongLau: 3,
  /** Hao hụt vượt mức này so với tổng xuất thì soát lại khâu giao nhận. */
  tyLeHaoHutCao: 0.02,
} as const;

/* ------------------------------------------------------------ kiểu dữ liệu */

/** Lô hàng còn tồn, lấy từ phép tính lô của màn hình chính. */
export interface LoTon {
  productId: string;
  batchNumber: string;
  stock: number;
  /** ISO. Ngày nhập sớm nhất của lô. */
  importDate: string;
}

export type MucDo = "gap" | "canLam" | "theoDoi";

/** Một kiến nghị: nói rõ chuyện gì, số bao nhiêu, và phải làm gì. */
export interface KienNghi {
  ma: string;
  mucDo: MucDo;
  tieuDe: string;
  /** Con số dẫn tới kiến nghị này. */
  chiTiet: string;
  /** Việc cụ thể phải làm. Không có việc để làm thì đừng sinh kiến nghị. */
  viecCanLam: string;
}

/** Một mặt hàng: còn tồn bao nhiêu, mỗi ngày đi bao nhiêu, đủ bán mấy ngày. */
export interface DuBan {
  productId: string;
  tenHang: string;
  unit: string;
  ton: number;
  xuatMoiNgay: number;
  /**
   * Số ngày còn bán được với tốc độ hiện tại.
   *
   * `null` khi cả kỳ không xuất lần nào — không phải "còn bán mãi mãi" mà là
   * "không tính được", và hai thứ đó phải hiện khác nhau.
   */
  soNgayConBan: number | null;
}

export interface NhomTuoiLo {
  nhan: string;
  soLo: number;
  ton: number;
}

export interface TopDonVi {
  ten: string;
  litQuyDoi: number;
  soDon: number;
}

export interface ThongSoKho {
  /** Tồn hiện tại, quy về lít. */
  tonLit: number;
  /** Xuất trong kỳ, quy về lít (không tính hao hụt). */
  xuatLit: number;
  haoHutLit: number;
  tyLeHaoHut: number;
  soNgayTrongKy: number;
  xuatMoiNgayLit: number;
  /**
   * Tồn hiện tại đủ bán bao nhiêu ngày với tốc độ của kỳ.
   *
   * Thay cho "vòng quay tồn kho" của bản cũ. Vòng quay cũ tính bằng
   * `tổng xuất ÷ (tổng nhập ÷ 2)` — mà "tổng nhập ÷ 2" không phải tồn bình
   * quân, nên con số ấy rút gọn lại chỉ là 2 × (xuất ÷ nhập), luôn quanh quẩn
   * ở 2 dù kho chạy nhanh hay chậm.
   */
  soNgayConBan: number | null;
  soDonXuat: number;
  donThieuAnh: number;
  donDiDuongLau: number;
  phieuChoKyLau: number;
  litChoKy: number;
}

export interface KetQuaPhanTich {
  thongSo: ThongSoKho;
  duBan: DuBan[];
  tuoiLo: NhomTuoiLo[];
  topDonVi: TopDonVi[];
  kienNghi: KienNghi[];
}

export interface PhanTichInput {
  /** Giao dịch ĐÃ LỌC theo `stockTransactions`. */
  giaoDichTinhTon: Transaction[];
  /** Giao dịch nhập chưa có ảnh phiếu ký. */
  giaoDichChoKy: Transaction[];
  /** Lô còn tồn, từ phép tính lô của màn hình chính. */
  loTon: LoTon[];
  products: Product[];
  /** `yyyy-MM-dd`. */
  tuNgay: string;
  denNgay: string;
  /** Hôm nay, dạng `yyyy-MM-dd`. Truyền vào để chạy thử được. */
  homNay: string;
}

/* ------------------------------------------------------------------ tiện ích */

const ngayCua = (iso: string): string => String(iso ?? "").slice(0, 10);

/** Số ngày giữa hai mốc `yyyy-MM-dd`. Âm nghĩa là mốc sau nằm trước mốc trước. */
export function soNgayGiua(tu: string, den: string): number {
  const a = Date.parse(`${ngayCua(tu)}T00:00:00Z`);
  const b = Date.parse(`${ngayCua(den)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/**
 * Quy một số lượng về lít.
 *
 * Bia hơi tính theo lít, bia lon theo lon — cộng thẳng hai con số ấy vào nhau
 * là ra một số vô nghĩa. Mọi tổng trong tệp này đều quy về lít trước.
 */
export function quyRaLit(soLuong: number, sp?: Product): number {
  const sl = Number(soLuong) || 0;
  const dv = sl * (sp?.conversionFactor || 1);
  return (dv * (sp?.capacityPerUnit ?? 1000)) / 1000;
}

const lam1 = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ phân tích */

export function phanTichKho(input: PhanTichInput): KetQuaPhanTich {
  const sanPham = new Map<string, Product>();
  input.products.forEach((p) => sanPham.set(p.id, p));

  const tu = String(input.tuNgay ?? "").trim();
  const den = String(input.denNgay ?? "").trim();
  const trongKy = (iso: string) => {
    const n = ngayCua(iso);
    if (tu && n < tu) return false;
    if (den && n > den) return false;
    return true;
  };

  /* --- Tồn hiện tại theo mặt hàng, quy ra lít --- */
  const tonTheoMatHang = new Map<string, number>();
  input.loTon.forEach((l) => {
    if (l.stock === 0) return;
    tonTheoMatHang.set(
      l.productId,
      (tonTheoMatHang.get(l.productId) ?? 0) + l.stock,
    );
  });

  let tonLit = 0;
  tonTheoMatHang.forEach((sl, pid) => {
    tonLit += quyRaLit(sl, sanPham.get(pid));
  });

  /* --- Xuất và hao hụt trong kỳ --- */
  let xuatLit = 0;
  let haoHutLit = 0;
  const xuatTheoMatHang = new Map<string, number>();
  const donXuat = new Set<string>();
  const donThieuAnhSet = new Set<string>();
  const litTheoDonVi = new Map<string, { lit: number; don: Set<string> }>();

  input.giaoDichTinhTon.forEach((t) => {
    if (!trongKy(t.date)) return;
    const sp = sanPham.get(t.productId);
    const lit = quyRaLit(Number(t.quantity) || 0, sp);

    if (t.type === "LOSS" || t.type === "DAMAGE") {
      haoHutLit += lit;
      return;
    }
    if (t.type !== "OUT") return;

    xuatLit += lit;
    xuatTheoMatHang.set(
      t.productId,
      (xuatTheoMatHang.get(t.productId) ?? 0) + (Number(t.quantity) || 0),
    );

    const chuyen = t.referenceGroupId || t.id;
    donXuat.add(chuyen);

    // Đơn đã ghi nhận mà KHÔNG có tấm ảnh biên bản nào là thiếu chứng từ. Hàng
    // đã đi rồi nên không chặn được nữa, nhưng phải đếm ra để còn đi đòi.
    const coAnh =
      !!String(t.evidencePhotoUrl ?? "").trim() ||
      (t.evidencePhotoUrls ?? []).some((u) => String(u ?? "").trim());
    if (!coAnh && t.status !== "in_transit") donThieuAnhSet.add(chuyen);
    else if (coAnh) donThieuAnhSet.delete(chuyen);

    const ten = t.partnerName || t.partnerId;
    const o = litTheoDonVi.get(ten) ?? { lit: 0, don: new Set<string>() };
    o.lit += lit;
    o.don.add(chuyen);
    litTheoDonVi.set(ten, o);
  });

  /* --- Đơn đi đường quá lâu --- */
  const diDuong = new Map<string, string>();
  input.giaoDichTinhTon.forEach((t) => {
    if (t.type !== "OUT" || t.status !== "in_transit") return;
    const chuyen = t.referenceGroupId || t.id;
    const n = ngayCua(t.date);
    const cu = diDuong.get(chuyen);
    if (!cu || n < cu) diDuong.set(chuyen, n);
  });
  const donDiDuongLau = Array.from(diDuong.values()).filter(
    (n) => soNgayGiua(n, input.homNay) > NGUONG.ngayDiDuongLau,
  ).length;

  /* --- Phiếu nhập chờ ký --- */
  let litChoKy = 0;
  const phieuChoKy = new Map<string, string>();
  input.giaoDichChoKy.forEach((t) => {
    litChoKy += quyRaLit(Number(t.quantity) || 0, sanPham.get(t.productId));
    const ma = t.slipCode || t.id;
    const n = ngayCua(t.date);
    const cu = phieuChoKy.get(ma);
    if (!cu || n < cu) phieuChoKy.set(ma, n);
  });
  const phieuChoKyLau = Array.from(phieuChoKy.values()).filter(
    (n) => soNgayGiua(n, input.homNay) > NGUONG.ngayChoKyLau,
  ).length;

  /* --- Nhịp độ --- */
  // Số ngày của kỳ: tính cả hai đầu biên, nên 01 đến 25 là 25 ngày chứ không
  // phải 24. Không chặn ngày thì lấy từ giao dịch sớm nhất tới hôm nay.
  let soNgayTrongKy: number;
  if (tu && den) soNgayTrongKy = soNgayGiua(tu, den) + 1;
  else {
    const cacNgay = input.giaoDichTinhTon
      .map((t) => ngayCua(t.date))
      .filter(Boolean)
      .sort();
    soNgayTrongKy = cacNgay.length
      ? soNgayGiua(cacNgay[0], den || input.homNay) + 1
      : 1;
  }
  if (soNgayTrongKy < 1) soNgayTrongKy = 1;

  const xuatMoiNgayLit = xuatLit / soNgayTrongKy;
  const soNgayConBan =
    xuatMoiNgayLit > 0 ? lam1(tonLit / xuatMoiNgayLit) : null;

  /* --- Còn đủ bán theo từng mặt hàng --- */
  const duBan: DuBan[] = [];
  const moiMatHang = new Set([
    ...tonTheoMatHang.keys(),
    ...xuatTheoMatHang.keys(),
  ]);
  moiMatHang.forEach((pid) => {
    const sp = sanPham.get(pid);
    if (!sp) return;
    const ton = tonTheoMatHang.get(pid) ?? 0;
    const moiNgay = (xuatTheoMatHang.get(pid) ?? 0) / soNgayTrongKy;
    duBan.push({
      productId: pid,
      tenHang: sp.name,
      unit: sp.unit,
      ton,
      xuatMoiNgay: lam1(moiNgay),
      soNgayConBan: moiNgay > 0 ? lam1(ton / moiNgay) : null,
    });
  });
  // Gấp nhất lên đầu. Mặt hàng không xuất lần nào xuống cuối: chưa tính được
  // thì cũng chưa gấp.
  duBan.sort((a, b) => {
    if (a.soNgayConBan === null && b.soNgayConBan === null) {
      return b.ton - a.ton;
    }
    if (a.soNgayConBan === null) return 1;
    if (b.soNgayConBan === null) return -1;
    return a.soNgayConBan - b.soNgayConBan;
  });

  /* --- Tuổi lô còn tồn --- */
  const moc = [
    { nhan: "0–7 ngày", toi: 7 },
    { nhan: "8–15 ngày", toi: 15 },
    { nhan: "16–30 ngày", toi: 30 },
    { nhan: "Trên 30 ngày", toi: Infinity },
  ];
  const tuoiLo: NhomTuoiLo[] = moc.map((m) => ({
    nhan: m.nhan,
    soLo: 0,
    ton: 0,
  }));
  const loQuaHan: LoTon[] = [];
  input.loTon.forEach((l) => {
    if (l.stock <= 0) return;
    const tuoi = soNgayGiua(l.importDate, input.homNay);
    const i = moc.findIndex((m) => tuoi <= m.toi);
    const o = tuoiLo[i < 0 ? tuoiLo.length - 1 : i];
    o.soLo += 1;
    o.ton += quyRaLit(l.stock, sanPham.get(l.productId));
    if (tuoi > NGUONG.ngayLoTonLau) loQuaHan.push(l);
  });

  /* --- Đơn vị nhận nhiều nhất --- */
  const topDonVi: TopDonVi[] = Array.from(litTheoDonVi.entries())
    .map(([ten, o]) => ({ ten, litQuyDoi: lam1(o.lit), soDon: o.don.size }))
    .sort((a, b) => b.litQuyDoi - a.litQuyDoi)
    .slice(0, 5);

  const tyLeHaoHut = xuatLit > 0 ? haoHutLit / xuatLit : 0;

  const thongSo: ThongSoKho = {
    tonLit: lam1(tonLit),
    xuatLit: lam1(xuatLit),
    haoHutLit: lam1(haoHutLit),
    tyLeHaoHut,
    soNgayTrongKy,
    xuatMoiNgayLit: lam1(xuatMoiNgayLit),
    soNgayConBan,
    soDonXuat: donXuat.size,
    donThieuAnh: donThieuAnhSet.size,
    donDiDuongLau,
    phieuChoKyLau,
    litChoKy: lam1(litChoKy),
  };

  return {
    thongSo,
    duBan,
    tuoiLo,
    topDonVi,
    kienNghi: dungKienNghi({ thongSo, duBan, loQuaHan, sanPham }),
  };
}

/* ---------------------------------------------------------------- kiến nghị */

/**
 * Biến số liệu thành việc phải làm.
 *
 * Mỗi kiến nghị phải có VIỆC CỤ THỂ. Một dòng kiểu "tồn kho hơi cao" mà không
 * nói làm gì tiếp thì chỉ tốn chỗ, và đọc vài lần là người dùng bỏ qua cả khối.
 *
 * Không có gì đáng nói thì trả về danh sách rỗng — màn hình sẽ hiện "không có
 * việc nào cần xử". Bịa ra một kiến nghị cho khỏi trống là dạy người dùng phớt
 * lờ khối này.
 */
function dungKienNghi(v: {
  thongSo: ThongSoKho;
  duBan: DuBan[];
  loQuaHan: LoTon[];
  sanPham: Map<string, Product>;
}): KienNghi[] {
  const ra: KienNghi[] = [];
  const { thongSo } = v;

  const sapHet = v.duBan.filter(
    (d) =>
      d.soNgayConBan !== null && d.soNgayConBan < NGUONG.ngayConBanGap && d.ton >= 0,
  );
  if (sapHet.length) {
    ra.push({
      ma: "sap-het",
      mucDo: "gap",
      tieuDe: `${sapHet.length} mặt hàng sắp hết`,
      chiTiet: sapHet
        .slice(0, 3)
        .map((d) => `${d.tenHang}: còn ${d.soNgayConBan} ngày`)
        .join(" · "),
      viecCanLam: "Đặt hàng nhà máy ngay để kịp chở lên.",
    });
  }

  const canNhap = v.duBan.filter(
    (d) =>
      d.soNgayConBan !== null &&
      d.soNgayConBan >= NGUONG.ngayConBanGap &&
      d.soNgayConBan < NGUONG.ngayConBanCanLam,
  );
  if (canNhap.length) {
    ra.push({
      ma: "can-nhap",
      mucDo: "canLam",
      tieuDe: `${canNhap.length} mặt hàng cần lên kế hoạch nhập`,
      chiTiet: canNhap
        .slice(0, 3)
        .map((d) => `${d.tenHang}: còn ${d.soNgayConBan} ngày`)
        .join(" · "),
      viecCanLam: `Còn dưới ${NGUONG.ngayConBanCanLam} ngày — chốt lượng nhập trong tuần này.`,
    });
  }

  if (v.loQuaHan.length) {
    const lit = v.loQuaHan.reduce(
      (n, l) => n + quyRaLit(l.stock, v.sanPham.get(l.productId)),
      0,
    );
    ra.push({
      ma: "lo-ton-lau",
      mucDo: "canLam",
      tieuDe: `${v.loQuaHan.length} lô nằm kho quá ${NGUONG.ngayLoTonLau} ngày`,
      chiTiet: `Còn ${lam1(lit)} lít quy đổi. Lô cũ nhất: ${v.loQuaHan
        .map((l) => l.batchNumber)
        .slice(0, 3)
        .join(", ")}`,
      viecCanLam: "Xuất những lô này trước (FIFO) và soát lại hạn dùng.",
    });
  }

  if (thongSo.phieuChoKyLau > 0) {
    ra.push({
      ma: "cho-ky-lau",
      mucDo: "gap",
      tieuDe: `${thongSo.phieuChoKyLau} phiếu nhập chờ ảnh ký quá ${NGUONG.ngayChoKyLau} ngày`,
      chiTiet: `${thongSo.litChoKy} lít quy đổi đang nằm ngoài tồn kho.`,
      viecCanLam:
        "Chụp tờ phiếu đã ký rồi tải lên — chưa có ảnh thì hàng chưa vào tồn và chưa xuất bán được.",
    });
  }

  if (thongSo.donDiDuongLau > 0) {
    ra.push({
      ma: "di-duong-lau",
      mucDo: "canLam",
      tieuDe: `${thongSo.donDiDuongLau} đơn đi đường quá ${NGUONG.ngayDiDuongLau} ngày`,
      chiTiet: "Hàng đã rời kho nhưng chuyến giao chưa được đóng sổ.",
      viecCanLam: "Vào tab Đơn đi đường xác nhận đã giao, hoặc gỡ nếu nhập nhầm.",
    });
  }

  if (thongSo.donThieuAnh > 0) {
    ra.push({
      ma: "thieu-anh",
      mucDo: "canLam",
      tieuDe: `${thongSo.donThieuAnh} đơn xuất không có ảnh biên bản`,
      chiTiet: "Đã ghi nhận vào sổ nhưng không có chứng từ kèm theo.",
      viecCanLam: "Tìm lại biên bản giấy và tải ảnh lên trước khi chốt kỳ.",
    });
  }

  if (thongSo.tyLeHaoHut > NGUONG.tyLeHaoHutCao) {
    ra.push({
      ma: "hao-hut-cao",
      mucDo: "theoDoi",
      tieuDe: `Hao hụt ${(thongSo.tyLeHaoHut * 100).toFixed(1)}% so với lượng xuất`,
      chiTiet: `${thongSo.haoHutLit} lít trên ${thongSo.xuatLit} lít xuất trong kỳ.`,
      viecCanLam: "Soát lại khâu giao nhận: keg giao 20,6 lít mà biên bản ghi tròn 20.",
    });
  }

  if (
    thongSo.soNgayConBan !== null &&
    thongSo.soNgayConBan > NGUONG.ngayTonQuaNhieu
  ) {
    ra.push({
      ma: "ton-qua-nhieu",
      mucDo: "theoDoi",
      tieuDe: `Tồn hiện tại đủ bán ${thongSo.soNgayConBan} ngày`,
      chiTiet: `Trên ${NGUONG.ngayTonQuaNhieu} ngày là đọng vốn, và bia già đi trước khi tới quán.`,
      viecCanLam: "Giãn nhịp nhập lại, hoặc đẩy hàng cho các điểm bán chạy.",
    });
  }

  const khongLuanChuyen = v.duBan.filter(
    (d) => d.soNgayConBan === null && d.ton > 0,
  );
  if (khongLuanChuyen.length) {
    ra.push({
      ma: "khong-luan-chuyen",
      mucDo: "theoDoi",
      tieuDe: `${khongLuanChuyen.length} mặt hàng còn tồn mà cả kỳ không xuất`,
      chiTiet: khongLuanChuyen
        .slice(0, 3)
        .map((d) => `${d.tenHang}: ${lam1(d.ton)} ${d.unit}`)
        .join(" · "),
      viecCanLam: "Kiểm tra còn dùng được không, và tìm điểm bán nhận.",
    });
  }

  // Gấp lên trước, rồi cần làm, rồi theo dõi.
  const thuTu: Record<MucDo, number> = { gap: 0, canLam: 1, theoDoi: 2 };
  return ra.sort((a, b) => thuTu[a.mucDo] - thuTu[b.mucDo]);
}

/** Chữ và màu cho từng mức độ, dùng chung để giao diện không tự đặt lại. */
export const NHAN_MUC_DO: Record<MucDo, { ten: string; mau: string }> = {
  gap: { ten: "Gấp", mau: "rose" },
  canLam: { ten: "Cần làm", mau: "amber" },
  theoDoi: { ten: "Theo dõi", mau: "slate" },
};

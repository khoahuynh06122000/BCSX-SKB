/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CÔNG NỢ HÓA ĐƠN — DỰNG ĐÚNG SHEET "CHỐT" CỦA FILE THÁNG
 *
 * Toàn bộ quy tắc dưới đây đọc ra từ file thật `file công nợ T08.2026.xlsx`
 * (103 dòng, 89.609,9 đơn vị, 21 số hóa đơn). Ghi lại ở đây để lần sau đổi thì
 * sửa một chỗ, và để ai đọc cũng biết vì sao bảng lại có hình dạng như vậy.
 *
 * MỘT THÁNG CHIA LÀM NHIỀU ĐỢT CHỐT. T8 có bốn đợt, dài ngắn khác nhau:
 *
 *   01.08-12.08  → hóa đơn 15.08  (45 dòng, 10 đơn vị)
 *   13.08-16.08  → hóa đơn 19.08  (26 dòng,  6 đơn vị)
 *   17.08-19.08  → hóa đơn 21.08  (24 dòng,  4 đơn vị)
 *   20.08.2026   → hóa đơn 22.08  ( 8 dòng,  1 đơn vị)
 *
 * Đợt KHÔNG suy ra được từ dữ liệu: nó là quyết định của kế toán, phụ thuộc
 * lịch phát hành hóa đơn chứ không phụ thuộc ngày giao bia. Nên người dùng khai
 * đợt, còn app lo phần còn lại — và cảnh báo nếu có ngày xuất kho rơi ra ngoài
 * mọi đợt, vì đó chính là bia đã giao mà quên xuất hóa đơn.
 *
 * MỘT SỐ HÓA ĐƠN CHO MỖI (ĐỢT × ĐƠN VỊ). Trong file, cả 9 dòng bia của BNC đợt
 * một cùng mang số `C26TKB#00000192`; BNG liền sau là `...193`. Số chạy liên
 * tục qua các đợt, không reset.
 *
 * GỘP THEO MÃ BP, KHÔNG GỘP THEO TÊN. BNC trong app tách làm 20 bộ phận để biết
 * bia đi tới quán nào, nhưng với SAP thì cả 20 vẫn là một khách hàng `AD0103`,
 * và file công nợ chỉ có đúng một dòng "BNC" cho mỗi mã vật tư. Gộp theo mã BP
 * cũng chính là điều đúng về nghiệp vụ: hóa đơn xuất cho pháp nhân, không xuất
 * cho cái quán.
 *
 * HAI CHẶNG GIÁ nằm cạnh nhau trong cùng một dòng — xem `invoice.ts`.
 *
 * KHÔNG CÓ CỘT THUẾ TTĐB VÀ DOANH THU 511 trong file T8 (file T7 thì có). Bảng
 * kết xuất bám theo file T8. Hai số đó vẫn tính, nhưng để xem trên màn hình,
 * không ghi vào sheet — thêm cột lạ vào file là kế toán phải xóa tay mỗi tháng.
 */

import type { Partner, Product, Transaction } from "../types";
import {
  breakdown,
  exciseSplit,
  invoiceUnitOf,
  PRICE_TABLE,
  type InvoiceUnit,
} from "./invoice";
import { billableTransactions } from "./sapExport";

/** Một đợt chốt hóa đơn. Ngày dạng `yyyy-MM-dd`. */
export interface DotChot {
  id: string;
  tuNgay: string;
  denNgay: string;
  /** Ngày ghi ở cột "Ngày hóa đơn (ngày nhận)". */
  ngayHoaDon: string;
}

/**
 * Thứ tự mặt hàng trong file, chép từ sheet "Đơn giá".
 *
 * Không xếp theo mã cũng không xếp theo tên: file gốc xếp hàng Lít trước rồi
 * hàng Lon, trong mỗi khối thì theo đúng thứ tự bảng giá. Giữ nguyên để bảng
 * app dán chồng lên file tháng là khớp dòng.
 */
export const THU_TU_MAT_HANG: string[] = [
  "10168107",
  "10174040",
  "10168108",
  "10186383",
  "10191541",
  "10191539",
  "10218490",
  "10224742",
  "10168110",
  "10174039",
  "10168111",
];

/** Hạng để xếp dòng trong một đơn vị: khối Lít trước, khối Lon sau. */
export function hangMatHang(maVatTu: string, dvt: InvoiceUnit): number {
  const i = THU_TU_MAT_HANG.indexOf(maVatTu);
  // Mã lạ xếp cuối khối của nó, nhưng vẫn đúng khối Lít / Lon.
  return (dvt === "LON" ? 1000 : 0) + (i < 0 ? 900 : i);
}

/** `2026-08-01` → `01.08.2026`. Chuỗi rỗng nếu ngày không đọc được. */
export function ngayVietNam(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

/**
 * Nhãn cột "Ngày giao bia".
 *
 * Đợt nhiều ngày ghi `01.08-12.08` (không có năm), đợt một ngày ghi
 * `20.08.2026` (có năm). Trông thiếu nhất quán nhưng đó đúng là cách file gốc
 * ghi, và bảng này để dán vào file gốc.
 */
export function nhanNgayGiao(tuNgay: string, denNgay: string): string {
  const a = ngayVietNam(tuNgay);
  const b = ngayVietNam(denNgay);
  if (!a || !b) return a || b;
  if (a === b) return a;
  return `${a.slice(0, 5)}-${b.slice(0, 5)}`;
}

/** `C26TKB#` + 192 → `C26TKB#00000192`. */
export function soHoaDonThu(tienTo: string, so: number): string {
  return `${tienTo}${String(Math.max(0, Math.trunc(so))).padStart(8, "0")}`;
}

/**
 * Tên đơn vị ghi trên hóa đơn.
 *
 * Bộ phận của BNC đặt tên `BNC · Lễ Hội Bia`; hóa đơn chỉ ghi `BNC`. Cắt ở dấu
 * `·` là ra tên pháp nhân, và tên đơn vị thường không chứa dấu đó.
 */
export function tenTrenHoaDon(name: string): string {
  return String(name ?? "").split("·")[0].trim();
}

/** Một dòng của sheet "Chốt" — 18 cột, đúng thứ tự file gốc. */
export interface DongCongNo {
  ngayGiaoBia: string;
  ngayHoaDon: string;
  stt: number;
  donVi: string;
  maVatTu: string;
  tenHangHoa: string;
  dvt: InvoiceUnit;
  soLuong: number;
  /** Chặng SKB → DNC. */
  donGiaSkb: number;
  thanhTienSkb: number;
  vatSkb: number;
  sauThueSkb: number;
  soHoaDon: string;
  /** Chặng DNC → đơn vị thành viên. */
  donGiaDnc: number;
  thanhTienDnc: number;
  vatDnc: number;
  sauThueDnc: number;
  maBp: string;

  /**
   * Hai số dưới đây KHÔNG ghi vào file (file T8 không có cột này), chỉ để hiện
   * trên màn hình và cộng tổng. Bóc từ thành tiền chặng SKB.
   */
  thueTtdb: number;
  doanhThu511: number;
  /** Khoá các dòng xuất kho đã gộp vào đây — để tra ngược khi số lệch. */
  nguon: string[];
}

/** Tiêu đề 18 cột, đúng chính tả file gốc (kể cả dấu cách thừa cuối tên cột). */
export const COT_CHOT: string[] = [
  "Ngày giao bia",
  "Ngày hóa đơn (ngày nhận)",
  "STT",
  "Đơn vị ",
  "Mã vật tư",
  "Tên hàng hóa",
  "Đơn vị tính",
  "Số lượng",
  "Đơn giá",
  "Thành tiền ",
  "VAT",
  "Thành tiền sau thuế",
  "Số hóa đơn",
  "Đơn giá",
  "Thành tiền ",
  "VAT",
  "Thành tiền sau thuế",
  "Mã BP ",
];

/** Chuyển một dòng thành mảng 18 ô, đúng thứ tự cột file gốc. */
export function oCuaDong(d: DongCongNo): (string | number)[] {
  return [
    d.ngayGiaoBia,
    d.ngayHoaDon,
    d.stt,
    d.donVi,
    d.maVatTu,
    d.tenHangHoa,
    d.dvt,
    d.soLuong,
    d.donGiaSkb,
    d.thanhTienSkb,
    d.vatSkb,
    d.sauThueSkb,
    d.soHoaDon,
    d.donGiaDnc,
    d.thanhTienDnc,
    d.vatDnc,
    d.sauThueDnc,
    d.maBp,
  ];
}

/** Một việc cần người xử lý trước khi phát hành hóa đơn. */
export interface CanhBaoCongNo {
  loai:
    | "ngoai_dot"
    | "dot_chong_nhau"
    | "thieu_ma_vat_tu"
    | "thieu_ma_bp"
    | "dang_di_duong";
  moTa: string;
  soLuong: number;
  soDong: number;
}

/** Tổng của một đợt — phần "theo dõi thống kê". */
export interface TongDot {
  dotId: string;
  nhanNgayGiao: string;
  ngayHoaDon: string;
  soDong: number;
  soDonVi: number;
  soHoaDon: number;
  soLuong: number;
  thanhTienSkb: number;
  sauThueSkb: number;
  thanhTienDnc: number;
  sauThueDnc: number;
}

/** Tổng của một đơn vị trong cả kỳ. */
export interface TongDonVi {
  donVi: string;
  maBp: string;
  soDong: number;
  soLuong: number;
  thanhTienSkb: number;
  sauThueSkb: number;
  thanhTienDnc: number;
  sauThueDnc: number;
}

export interface BangCongNo {
  dong: DongCongNo[];
  theoDot: TongDot[];
  theoDonVi: TongDonVi[];
  canhBao: CanhBaoCongNo[];
  tong: {
    soDong: number;
    soLuong: number;
    thanhTienSkb: number;
    vatSkb: number;
    sauThueSkb: number;
    thanhTienDnc: number;
    vatDnc: number;
    sauThueDnc: number;
    thueTtdb: number;
    doanhThu511: number;
  };
  /** Số hóa đơn kế tiếp, để điền sẵn cho tháng sau. */
  soHoaDonTiepTheo: number;
}

export interface DungBangInput {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  dot: DotChot[];
  /** Tiền tố số hóa đơn, ví dụ `C26TKB#`. */
  tienToHoaDon: string;
  /** Số hóa đơn đầu tiên của kỳ, ví dụ 192. */
  soHoaDonBatDau: number;
}

/** Ngày của giao dịch, cắt về `yyyy-MM-dd` để so với biên đợt. */
function ngayKhoa(iso: string): string {
  return String(iso ?? "").slice(0, 10);
}

/**
 * Dựng toàn bộ bảng "Chốt" từ giao dịch xuất kho.
 *
 * Lấy dòng nào: dùng chung `billableTransactions()` với phần xuất hóa đơn SAP —
 * chỉ `OUT` đã giao xong. Hao hụt (`LOSS`) và hàng hỏng không phải bán nên
 * không lên hóa đơn, còn hàng đang đi đường thì chưa giao xong nên chưa lên,
 * nhưng có bao nhiêu dòng như vậy thì báo ra chứ không im lặng bỏ.
 */
export function dungBangCongNo(input: DungBangInput): BangCongNo {
  const sanPham = new Map<string, Product>();
  input.products.forEach((p) => sanPham.set(p.id, p));
  const doiTac = new Map<string, Partner>();
  input.partners.forEach((p) => doiTac.set(p.id, p));

  const dot = [...input.dot].sort((a, b) => a.tuNgay.localeCompare(b.tuNgay));

  const tatCaOut = input.transactions.filter((t) => t.type === "OUT");
  const diDuong = tatCaOut.filter((t) => t.status === "in_transit");
  const banDuoc = billableTransactions(input.transactions);

  // Gom theo (đợt, mã BP, mã vật tư). Mã BP chứ không phải tên: 20 bộ phận BNC
  // phải rơi vào cùng một dòng.
  interface Nhom {
    dotIndex: number;
    maBp: string;
    donVi: string;
    maVatTu: string;
    tenHangHoa: string;
    dvt: InvoiceUnit;
    soLuong: number;
    nguon: string[];
  }
  const nhom = new Map<string, Nhom>();

  let slNgoaiDot = 0;
  let dongNgoaiDot = 0;
  let slChongNhau = 0;
  let dongChongNhau = 0;
  const thieuMa = new Map<string, { sl: number; n: number }>();
  const thieuBp = new Map<string, { sl: number; n: number }>();

  banDuoc.forEach((t) => {
    const ngay = ngayKhoa(t.date);
    const thuoc = dot
      .map((d, i) => (ngay >= d.tuNgay && ngay <= d.denNgay ? i : -1))
      .filter((i) => i >= 0);

    if (thuoc.length === 0) {
      slNgoaiDot += Number(t.quantity) || 0;
      dongNgoaiDot += 1;
      return;
    }
    if (thuoc.length > 1) {
      slChongNhau += Number(t.quantity) || 0;
      dongChongNhau += 1;
      // Vẫn tính, nhưng chỉ vào đợt sớm nhất — không nhân đôi doanh thu.
    }
    const dotIndex = thuoc[0];

    const p = sanPham.get(t.productId);
    const dt = doiTac.get(t.partnerId);
    const tenSp = p?.name || t.productName || "(không rõ)";
    const sl = Number(t.quantity) || 0;

    const maVatTu = p?.materialCode || "";
    if (!maVatTu) {
      const cu = thieuMa.get(tenSp) || { sl: 0, n: 0 };
      thieuMa.set(tenSp, { sl: cu.sl + sl, n: cu.n + 1 });
    }

    const tenDonVi = tenTrenHoaDon(dt?.name || t.partnerName || "(không rõ)");
    const maBp = dt?.sapCode || "";
    if (!maBp) {
      const cu = thieuBp.get(tenDonVi) || { sl: 0, n: 0 };
      thieuBp.set(tenDonVi, { sl: cu.sl + sl, n: cu.n + 1 });
    }

    const dvt = invoiceUnitOf(p?.category || t.category);
    // Khoá gộp dùng mã BP; đơn vị chưa có mã BP thì lùi về tên để hai đơn vị
    // khác nhau không bị dồn chung một dòng.
    const khoa = [dotIndex, maBp || `?${tenDonVi}`, maVatTu || `?${tenSp}`].join(
      "|",
    );
    const cu = nhom.get(khoa);
    if (cu) {
      cu.soLuong += sl;
      cu.nguon.push(t.id);
    } else {
      nhom.set(khoa, {
        dotIndex,
        maBp,
        donVi: tenDonVi,
        maVatTu,
        tenHangHoa: tenSp,
        dvt,
        soLuong: sl,
        nguon: [t.id],
      });
    }
  });

  // Xếp: đợt → đơn vị (theo bảng chữ cái tiếng Việt) → khối Lít/Lon → bảng giá.
  const xep = Array.from(nhom.values()).sort(
    (a, b) =>
      a.dotIndex - b.dotIndex ||
      a.donVi.localeCompare(b.donVi, "vi") ||
      hangMatHang(a.maVatTu, a.dvt) - hangMatHang(b.maVatTu, b.dvt) ||
      a.maVatTu.localeCompare(b.maVatTu),
  );

  // Cấp số hóa đơn: một số cho mỗi (đợt × đơn vị), chạy liên tục qua các đợt.
  const soTheoDonVi = new Map<string, string>();
  let soChay = Math.trunc(input.soHoaDonBatDau) || 0;
  xep.forEach((g) => {
    const k = `${g.dotIndex}|${g.maBp || g.donVi}`;
    if (!soTheoDonVi.has(k)) {
      soTheoDonVi.set(k, soHoaDonThu(input.tienToHoaDon, soChay));
      soChay += 1;
    }
  });

  const dong: DongCongNo[] = xep.map((g, i) => {
    const d = dot[g.dotIndex];
    const gia = PRICE_TABLE[g.dvt];
    const skb = breakdown(g.soLuong, gia.skbToDnc);
    const dnc = breakdown(g.soLuong, gia.dncToMember);
    const { revenue511, exciseTax } = exciseSplit(skb.amount);
    return {
      ngayGiaoBia: nhanNgayGiao(d.tuNgay, d.denNgay),
      ngayHoaDon: ngayVietNam(d.ngayHoaDon),
      stt: i + 1,
      donVi: g.donVi,
      maVatTu: g.maVatTu,
      tenHangHoa: g.tenHangHoa,
      dvt: g.dvt,
      soLuong: g.soLuong,
      donGiaSkb: gia.skbToDnc,
      thanhTienSkb: skb.amount,
      vatSkb: skb.vat,
      sauThueSkb: skb.amountWithVat,
      soHoaDon: soTheoDonVi.get(`${g.dotIndex}|${g.maBp || g.donVi}`) || "",
      donGiaDnc: gia.dncToMember,
      thanhTienDnc: dnc.amount,
      vatDnc: dnc.vat,
      sauThueDnc: dnc.amountWithVat,
      maBp: g.maBp,
      thueTtdb: exciseTax,
      doanhThu511: revenue511,
      nguon: g.nguon,
    };
  });

  // ----- Thống kê theo đợt -----
  const theoDot: TongDot[] = dot.map((d, i) => {
    const cua = dong.filter(
      (r) =>
        r.ngayGiaoBia === nhanNgayGiao(d.tuNgay, d.denNgay) &&
        r.ngayHoaDon === ngayVietNam(d.ngayHoaDon),
    );
    void i;
    return {
      dotId: d.id,
      nhanNgayGiao: nhanNgayGiao(d.tuNgay, d.denNgay),
      ngayHoaDon: ngayVietNam(d.ngayHoaDon),
      soDong: cua.length,
      soDonVi: new Set(cua.map((r) => r.maBp || r.donVi)).size,
      soHoaDon: new Set(cua.map((r) => r.soHoaDon)).size,
      soLuong: cua.reduce((s, r) => s + r.soLuong, 0),
      thanhTienSkb: cua.reduce((s, r) => s + r.thanhTienSkb, 0),
      sauThueSkb: cua.reduce((s, r) => s + r.sauThueSkb, 0),
      thanhTienDnc: cua.reduce((s, r) => s + r.thanhTienDnc, 0),
      sauThueDnc: cua.reduce((s, r) => s + r.sauThueDnc, 0),
    };
  });

  // ----- Thống kê theo đơn vị, cả kỳ -----
  const gomDonVi = new Map<string, TongDonVi>();
  dong.forEach((r) => {
    const k = r.maBp || r.donVi;
    const cu = gomDonVi.get(k);
    if (cu) {
      cu.soDong += 1;
      cu.soLuong += r.soLuong;
      cu.thanhTienSkb += r.thanhTienSkb;
      cu.sauThueSkb += r.sauThueSkb;
      cu.thanhTienDnc += r.thanhTienDnc;
      cu.sauThueDnc += r.sauThueDnc;
    } else {
      gomDonVi.set(k, {
        donVi: r.donVi,
        maBp: r.maBp,
        soDong: 1,
        soLuong: r.soLuong,
        thanhTienSkb: r.thanhTienSkb,
        sauThueSkb: r.sauThueSkb,
        thanhTienDnc: r.thanhTienDnc,
        sauThueDnc: r.sauThueDnc,
      });
    }
  });
  const theoDonVi = Array.from(gomDonVi.values()).sort(
    (a, b) => b.thanhTienSkb - a.thanhTienSkb,
  );

  // ----- Cảnh báo -----
  const canhBao: CanhBaoCongNo[] = [];
  if (dongNgoaiDot > 0) {
    canhBao.push({
      loai: "ngoai_dot",
      moTa: "Giao dịch xuất kho không nằm trong đợt chốt nào — bia đã giao mà chưa xuất hóa đơn",
      soLuong: slNgoaiDot,
      soDong: dongNgoaiDot,
    });
  }
  if (dongChongNhau > 0) {
    canhBao.push({
      loai: "dot_chong_nhau",
      moTa: "Ngày rơi vào hai đợt cùng lúc — đã tính vào đợt sớm hơn, nên sửa lại biên đợt",
      soLuong: slChongNhau,
      soDong: dongChongNhau,
    });
  }
  thieuMa.forEach((v, ten) => {
    canhBao.push({
      loai: "thieu_ma_vat_tu",
      moTa: `Thiếu mã vật tư: ${ten}`,
      soLuong: v.sl,
      soDong: v.n,
    });
  });
  thieuBp.forEach((v, ten) => {
    canhBao.push({
      loai: "thieu_ma_bp",
      moTa: `Thiếu mã BP: ${ten}`,
      soLuong: v.sl,
      soDong: v.n,
    });
  });
  if (diDuong.length > 0) {
    canhBao.push({
      loai: "dang_di_duong",
      moTa: "Giao dịch còn đang đi đường, chưa tính vào kỳ này",
      soLuong: diDuong.reduce((s, t) => s + (Number(t.quantity) || 0), 0),
      soDong: diDuong.length,
    });
  }

  const cong = (f: (r: DongCongNo) => number) =>
    dong.reduce((s, r) => s + f(r), 0);

  return {
    dong,
    theoDot,
    theoDonVi,
    canhBao,
    tong: {
      soDong: dong.length,
      soLuong: cong((r) => r.soLuong),
      thanhTienSkb: cong((r) => r.thanhTienSkb),
      vatSkb: cong((r) => r.vatSkb),
      sauThueSkb: cong((r) => r.sauThueSkb),
      thanhTienDnc: cong((r) => r.thanhTienDnc),
      vatDnc: cong((r) => r.vatDnc),
      sauThueDnc: cong((r) => r.sauThueDnc),
      thueTtdb: cong((r) => r.thueTtdb),
      doanhThu511: cong((r) => r.doanhThu511),
    },
    soHoaDonTiepTheo: soChay,
  };
}

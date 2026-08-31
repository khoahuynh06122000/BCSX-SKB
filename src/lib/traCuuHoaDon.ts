/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TRA CỨU HÓA ĐƠN ĐÃ XUẤT
 *
 * Việc thật diễn ra theo bốn bước:
 *
 *   1. App gom xuất kho theo đợt → ra bảng công nợ.
 *   2. Tải tệp TEMPLATE, mang sang hệ thống hóa đơn để phát hành.
 *   3. Quay lại app điền SỐ HÓA ĐƠN và NGÀY HÓA ĐƠN thật (xem `hoaDon.ts`).
 *   4. Về sau cần tra lại: hóa đơn `C26TKB#00000192` là của đơn vị nào, đợt
 *      nào, gồm những mặt hàng gì, bao nhiêu tiền — và in ra một tệp đúng mẫu
 *      sheet "Chốt" để gửi cho người hỏi.
 *
 * Mô-đun này lo bước 4. Trước đây bước 4 không có: điền số xong là số nằm im
 * trong Firestore, muốn tra thì phải dựng lại đúng biên đợt cũ trên màn hình
 * kết xuất mới thấy — mà biên đợt lưu ở localStorage của MỘT máy, đổi máy hoặc
 * sang tháng sau là mất.
 *
 * KHÔNG PHỤ THUỘC BIÊN ĐỢT ĐANG KHAI. Mỗi tài liệu `hoa_don` tự mang biên đợt
 * của nó (`tuNgay`, `denNgay`) từ lúc được ghi. Nên đợt dựng lại được TỪ CHÍNH
 * CÁC HÓA ĐƠN ĐÃ GHI, không cần đọc localStorage. Đó là lý do tra cứu chạy
 * được trên máy khác và cho tháng đã đóng.
 *
 * DÒNG CHI TIẾT DỰNG LẠI TỪ GIAO DỊCH, KHÔNG LƯU SẴN. Chỉ số hóa đơn và biên
 * đợt được lưu; phần hàng hóa tính lại bằng `dungBangCongNo()` — cùng một hàm
 * đã dựng tệp lúc phát hành, nên tra cứu ra đúng số đã in ra. Nếu về sau ai sửa
 * hoặc xoá giao dịch thì bảng tra cứu đổi theo, và `thieuDong` đếm những hóa
 * đơn không còn dựng lại được dòng nào — đó là dấu hiệu dữ liệu bên dưới đã bị
 * sửa sau khi hóa đơn phát hành, cần người xem lại.
 */

import type { Partner, Product, Transaction } from "../types";
import {
  dungBangCongNo,
  nhanNgayGiao,
  ngayVietNam,
  type BangCongNo,
  type DongCongNo,
  type DotChot,
} from "./congNo";
import type { HoaDonGhiNhan } from "./hoaDon";

/** Một hóa đơn đã phát hành, kèm các dòng hàng hóa dựng lại được. */
export interface HoaDonDaXuat {
  soHoaDon: string;
  /** yyyy-MM-dd, ngày ghi trên tờ hóa đơn. */
  ngayHoaDon: string;
  /** Biên đợt lúc phát hành. */
  tuNgay: string;
  denNgay: string;
  /** Nhãn đợt như file gốc: `01.08-12.08`. */
  nhanDot: string;
  maBp: string;
  donVi: string;
  dong: DongCongNo[];
  soLuong: number;
  thanhTienSkb: number;
  vatSkb: number;
  sauThueSkb: number;
  thanhTienDnc: number;
  vatDnc: number;
  sauThueDnc: number;
  thueTtdb: number;
  doanhThu511: number;
  /** Ai điền số vào app và điền lúc nào — để truy khi số bị sai. */
  ghiLuc?: string;
  ghiBoi?: string;
}

export interface KetQuaTraCuu {
  /** Hóa đơn khớp bộ lọc, mới nhất trước. */
  hoaDon: HoaDonDaXuat[];
  /**
   * Bảng đã lọc, đánh lại STT từ 1 — đưa thẳng cho `taoWorkbookCongNo()` là ra
   * tệp đúng mẫu sheet "Chốt".
   */
  bang: BangCongNo;
  /** Tổng của phần đang xem. */
  tong: {
    soHoaDon: number;
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
  /**
   * Hóa đơn đã ghi số nhưng không dựng lại được dòng nào.
   *
   * Nghĩa là giao dịch xuất kho bên dưới đã bị sửa, bị xoá, hoặc đơn vị đã mất
   * mã BP sau khi hóa đơn phát hành. Im lặng bỏ qua thì bảng tra cứu thiếu hóa
   * đơn mà không ai biết.
   */
  thieuDong: HoaDonGhiNhan[];
}

/** Phần dữ liệu — đổi thì phải dựng lại bảng, tốn nhất. */
export interface DuLieuTraCuu {
  hoaDon: HoaDonGhiNhan[];
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
}

/** Phần bộ lọc — đổi liên tục khi người dùng gõ, phải rẻ. */
export interface BoLocTraCuu {
  /** Lọc theo NGÀY HÓA ĐƠN (yyyy-MM-dd). Rỗng = không chặn. */
  tuNgay?: string;
  denNgay?: string;
  /** Tìm trong số hóa đơn, tên đơn vị, mã BP. Không phân biệt hoa thường. */
  tuKhoa?: string;
}

export type TraCuuInput = DuLieuTraCuu & BoLocTraCuu;

/**
 * Kết quả dựng bảng, chưa lọc.
 *
 * TÁCH RA LÀM HAI BƯỚC LÀ CÓ LÝ DO. Dựng bảng phải chạy `dungBangCongNo()` trên
 * toàn bộ sổ xuất kho — vài nghìn dòng. Gộp chung với bộ lọc thì mỗi ký tự gõ
 * vào ô tìm kiếm là dựng lại cả bảng, trên điện thoại thấy rõ độ trễ. Giờ chỉ
 * `locTraCuu()` chạy lại theo từng ký tự, và nó chỉ đi qua danh sách hóa đơn.
 */
export interface NenTraCuu {
  daCoSo: HoaDonGhiNhan[];
  /** Dòng chi tiết, tra theo `<nhãn đợt>|<mã BP>`. */
  theoKhoa: Map<string, DongCongNo[]>;
  /** Thống kê theo đợt của bảng đầy đủ, để lọc lại về sau. */
  theoDot: BangCongNo["theoDot"];
}

/** Chỉ giữ hóa đơn đã có số thật. Hóa đơn chưa điền số không phải "đã xuất". */
export function hoaDonDaCoSo(ds: HoaDonGhiNhan[]): HoaDonGhiNhan[] {
  return (ds || []).filter((h) => h && String(h.soHoaDon || "").trim() !== "");
}

/**
 * Dựng lại danh sách đợt từ chính các hóa đơn đã ghi.
 *
 * Một (tuNgay, denNgay) là một đợt. `ngayHoaDon` của đợt chỉ dùng làm phương án
 * dự phòng — mỗi hóa đơn đã mang ngày riêng của nó — nên lấy ngày SỚM NHẤT đã
 * ghi trong đợt đó cho ổn định, không lấy ngày của tài liệu gặp đầu tiên (thứ
 * tự tài liệu từ Firestore không cố định, lấy như vậy thì mỗi lần tải lại ra
 * một kết quả khác).
 */
export function dotTuHoaDon(ds: HoaDonGhiNhan[]): DotChot[] {
  const m = new Map<string, DotChot>();
  hoaDonDaCoSo(ds).forEach((h) => {
    const tuNgay = String(h.tuNgay || "").slice(0, 10);
    const denNgay = String(h.denNgay || "").slice(0, 10);
    if (!tuNgay || !denNgay) return;
    const k = `${tuNgay}|${denNgay}`;
    const ngay = String(h.ngayHoaDon || "").slice(0, 10) || denNgay;
    const cu = m.get(k);
    if (!cu) {
      m.set(k, { id: `dot-${k}`, tuNgay, denNgay, ngayHoaDon: ngay });
    } else if (ngay < cu.ngayHoaDon) {
      cu.ngayHoaDon = ngay;
    }
  });
  return Array.from(m.values()).sort((a, b) => a.tuNgay.localeCompare(b.tuNgay));
}

/** Khoá nối một dòng bảng với một hóa đơn đã ghi: nhãn đợt + mã BP. */
function khoaDong(nhanDot: string, maBp: string): string {
  return `${nhanDot}|${maBp}`;
}

function trong(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .trim();
}

/** Bảng rỗng — dùng khi chưa có hóa đơn nào, hoặc lọc không ra gì. */
function ketQuaRong(): KetQuaTraCuu {
  return {
    hoaDon: [],
    bang: {
      dong: [],
      theoDot: [],
      theoDonVi: [],
      canhBao: [],
      tong: {
        soDong: 0,
        soLuong: 0,
        thanhTienSkb: 0,
        vatSkb: 0,
        sauThueSkb: 0,
        thanhTienDnc: 0,
        vatDnc: 0,
        sauThueDnc: 0,
        thueTtdb: 0,
        doanhThu511: 0,
      },
      soHoaDonTiepTheo: 0,
      chuaCoSoThat: 0,
    },
    tong: {
      soHoaDon: 0,
      soDong: 0,
      soLuong: 0,
      thanhTienSkb: 0,
      vatSkb: 0,
      sauThueSkb: 0,
      thanhTienDnc: 0,
      vatDnc: 0,
      sauThueDnc: 0,
      thueTtdb: 0,
      doanhThu511: 0,
    },
    thieuDong: [],
  };
}

/**
 * BƯỚC NẶNG: dựng lại toàn bộ dòng chi tiết của mọi hóa đơn đã ghi số.
 *
 * Dựng trên TOÀN BỘ đợt đã từng phát hành hóa đơn, không lọc giao dịch trước —
 * số hóa đơn gán theo (đợt × đơn vị), cắt bớt giao dịch đầu vào là gán sai số.
 *
 * Gọi lại chỉ khi dữ liệu đổi. Bộ lọc thì gọi `locTraCuu()`.
 */
export function nenTraCuu(input: DuLieuTraCuu): NenTraCuu {
  const daCoSo = hoaDonDaCoSo(input.hoaDon);
  const dot = dotTuHoaDon(daCoSo);
  if (dot.length === 0) {
    return { daCoSo: [], theoKhoa: new Map(), theoDot: [] };
  }

  /* Số thật để `dungBangCongNo` gán đúng số vào từng dòng. */
  const hoaDonThat = new Map<string, { soHoaDon: string; ngayHoaDon: string }>();
  daCoSo.forEach((h) => {
    hoaDonThat.set(
      [
        String(h.tuNgay || "").slice(0, 10),
        String(h.denNgay || "").slice(0, 10),
        h.maBp || h.donVi,
      ].join("|"),
      {
        soHoaDon: String(h.soHoaDon).trim(),
        ngayHoaDon: String(h.ngayHoaDon || "").slice(0, 10),
      },
    );
  });

  const dayDu = dungBangCongNo({
    transactions: input.transactions,
    products: input.products,
    partners: input.partners,
    dot,
    /*
     * Tiền tố rỗng và số 0: phần tra cứu chỉ nhận hóa đơn ĐÃ CÓ SỐ THẬT, nên số
     * app tự gợi ý không được dùng tới. Truyền tiền tố thật vào đây thì những
     * đơn vị chưa điền số cũng mang một số trông y như số thật, rất dễ lọt vào
     * bảng tra cứu.
     */
    tienToHoaDon: "",
    soHoaDonBatDau: 0,
    hoaDonThat,
  });

  /* Nhóm dòng theo (nhãn đợt | mã BP) để nối với hóa đơn đã ghi. */
  const theoKhoa = new Map<string, DongCongNo[]>();
  dayDu.dong.forEach((d) => {
    const k = khoaDong(d.ngayGiaoBia, d.maBp || d.donVi);
    const cu = theoKhoa.get(k);
    if (cu) cu.push(d);
    else theoKhoa.set(k, [d]);
  });

  return { daCoSo, theoKhoa, theoDot: dayDu.theoDot };
}

/**
 * BƯỚC NHẸ: lọc và cộng tổng. Chạy lại theo từng ký tự người dùng gõ.
 */
export function locTraCuu(nen: NenTraCuu, loc: BoLocTraCuu): KetQuaTraCuu {
  const { daCoSo, theoKhoa } = nen;
  if (daCoSo.length === 0) return ketQuaRong();

  const tu = loc.tuNgay ? loc.tuNgay.slice(0, 10) : "";
  const den = loc.denNgay ? loc.denNgay.slice(0, 10) : "";
  const q = trong(loc.tuKhoa);

  const ra: HoaDonDaXuat[] = [];
  const thieuDong: HoaDonGhiNhan[] = [];

  daCoSo.forEach((h) => {
    const tuNgay = String(h.tuNgay || "").slice(0, 10);
    const denNgay = String(h.denNgay || "").slice(0, 10);
    const ngayHoaDon = String(h.ngayHoaDon || "").slice(0, 10);
    const nhanDot = nhanNgayGiao(tuNgay, denNgay);
    const dong = theoKhoa.get(khoaDong(nhanDot, h.maBp || h.donVi)) || [];

    /*
     * Hóa đơn không còn dòng nào: báo ra kể cả khi đang lọc, vì đây là lỗi dữ
     * liệu chứ không phải một kết quả tìm kiếm. Nhưng vẫn tôn trọng bộ lọc ngày
     * để người xem tháng 8 không bị báo lỗi của tháng 3.
     */
    const trongNgay =
      (!tu || (ngayHoaDon && ngayHoaDon >= tu)) &&
      (!den || (ngayHoaDon && ngayHoaDon <= den));
    if (!trongNgay) return;

    if (dong.length === 0) {
      thieuDong.push(h);
      return;
    }

    if (
      q &&
      !trong(h.soHoaDon).includes(q) &&
      !trong(h.donVi).includes(q) &&
      !trong(h.maBp).includes(q) &&
      !trong(dong[0].donVi).includes(q)
    ) {
      return;
    }

    const cong = (f: (d: DongCongNo) => number) =>
      dong.reduce((s, d) => s + f(d), 0);

    ra.push({
      soHoaDon: String(h.soHoaDon).trim(),
      ngayHoaDon,
      tuNgay,
      denNgay,
      nhanDot,
      maBp: h.maBp || "",
      // Tên trong tài liệu là tên lúc ghi; tên dựng lại từ danh mục mới hơn.
      donVi: dong[0].donVi || h.donVi || "",
      dong,
      soLuong: cong((d) => d.soLuong),
      thanhTienSkb: cong((d) => d.thanhTienSkb),
      vatSkb: cong((d) => d.vatSkb),
      sauThueSkb: cong((d) => d.sauThueSkb),
      thanhTienDnc: cong((d) => d.thanhTienDnc),
      vatDnc: cong((d) => d.vatDnc),
      sauThueDnc: cong((d) => d.sauThueDnc),
      thueTtdb: cong((d) => d.thueTtdb),
      doanhThu511: cong((d) => d.doanhThu511),
      ghiLuc: h.updatedAt,
      ghiBoi: h.updatedBy,
    });
  });

  /*
   * Xếp: ngày hóa đơn MỚI NHẤT TRƯỚC. Tra cứu gần như luôn là tìm tờ vừa xuất,
   * còn hóa đơn tháng trước thì đã có trong file tháng.
   *
   * Trong cùng một ngày thì xếp theo số hóa đơn tăng dần — số chạy liên tục nên
   * đó cũng chính là thứ tự phát hành.
   */
  ra.sort(
    (a, b) =>
      b.ngayHoaDon.localeCompare(a.ngayHoaDon) ||
      a.soHoaDon.localeCompare(b.soHoaDon),
  );

  /*
   * Bảng để xuất tệp: xếp lại theo thứ tự file gốc (đợt cũ trước) và đánh lại
   * STT từ 1. Giữ thứ tự "mới nhất trước" của màn hình thì tệp mở ra ngược so
   * với file tháng của bộ phận.
   */
  const dongXuat = ra
    .slice()
    .sort(
      (a, b) =>
        a.ngayHoaDon.localeCompare(b.ngayHoaDon) ||
        a.soHoaDon.localeCompare(b.soHoaDon),
    )
    .flatMap((h) => h.dong)
    .map((d, i) => ({ ...d, stt: i + 1 }));

  const congXuat = (f: (d: DongCongNo) => number) =>
    dongXuat.reduce((s, d) => s + f(d), 0);

  const tong = {
    soHoaDon: ra.length,
    soDong: dongXuat.length,
    soLuong: congXuat((d) => d.soLuong),
    thanhTienSkb: congXuat((d) => d.thanhTienSkb),
    vatSkb: congXuat((d) => d.vatSkb),
    sauThueSkb: congXuat((d) => d.sauThueSkb),
    thanhTienDnc: congXuat((d) => d.thanhTienDnc),
    vatDnc: congXuat((d) => d.vatDnc),
    sauThueDnc: congXuat((d) => d.sauThueDnc),
    thueTtdb: congXuat((d) => d.thueTtdb),
    doanhThu511: congXuat((d) => d.doanhThu511),
  };

  /* Thống kê theo đơn vị, gộp cả kỳ đang xem. */
  const gomDonVi = new Map<string, BangCongNo["theoDonVi"][0]>();
  dongXuat.forEach((r) => {
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

  return {
    hoaDon: ra,
    bang: {
      dong: dongXuat,
      theoDot: nen.theoDot.filter((t) =>
        ra.some((h) => h.nhanDot === t.nhanNgayGiao),
      ),
      theoDonVi: Array.from(gomDonVi.values()).sort(
        (a, b) => b.thanhTienSkb - a.thanhTienSkb,
      ),
      canhBao: [],
      tong: {
        soDong: tong.soDong,
        soLuong: tong.soLuong,
        thanhTienSkb: tong.thanhTienSkb,
        vatSkb: tong.vatSkb,
        sauThueSkb: tong.sauThueSkb,
        thanhTienDnc: tong.thanhTienDnc,
        vatDnc: tong.vatDnc,
        sauThueDnc: tong.sauThueDnc,
        thueTtdb: tong.thueTtdb,
        doanhThu511: tong.doanhThu511,
      },
      soHoaDonTiepTheo: 0,
      chuaCoSoThat: 0,
    },
    tong,
    thieuDong,
  };
}

/**
 * Tra cứu hóa đơn đã xuất — dựng và lọc trong một lần gọi.
 *
 * Tiện cho bài kiểm tra và cho nơi gọi chỉ chạy một lượt. Giao diện thì gọi
 * `nenTraCuu()` và `locTraCuu()` riêng để gõ tìm kiếm không dựng lại cả bảng.
 */
export function traCuuHoaDon(input: TraCuuInput): KetQuaTraCuu {
  return locTraCuu(nenTraCuu(input), input);
}

/** Tên tệp tải về: `Hoa don da xuat 01.08.2026-31.08.2026.xlsx`. */
export function tenTepTraCuu(tuNgay: string, denNgay: string): string {
  const a = ngayVietNam(tuNgay);
  const b = ngayVietNam(denNgay);
  if (a && b) return `Hoa don da xuat ${a}-${b}.xlsx`;
  if (a) return `Hoa don da xuat tu ${a}.xlsx`;
  if (b) return `Hoa don da xuat den ${b}.xlsx`;
  return "Hoa don da xuat.xlsx";
}

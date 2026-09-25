/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỐ HÓA ĐƠN THẬT, DO NGƯỜI ĐIỀN SAU KHI PHÁT HÀNH
 *
 * Trình tự công việc thật:
 *
 *   1. Nạp các đơn đã giao  → app tính ra công nợ từng đơn vị.
 *   2. Cầm số đó đi phát hành hóa đơn (ngoài app, trên SAP).
 *   3. Quay lại app điền SỐ HÓA ĐƠN và NGÀY HÓA ĐƠN thật.
 *
 * Bước 3 mới là chỗ dữ liệu chốt. Trước đây app tự đánh số theo tiền tố cộng
 * số bắt đầu — tiện để dựng thử, nhưng số đó là app BỊA RA. Hóa đơn đã phát
 * hành là chứng từ đã lên cơ quan thuế; ghi một số không có thật vào sổ rồi
 * đối chiếu sau này thì không lần ra được gì.
 *
 * Nay số app tự đánh chỉ còn là GỢI Ý điền sẵn vào ô. Số người điền mới là số
 * được ghi và được kết xuất.
 *
 * MỘT HÓA ĐƠN = MỘT (ĐỢT × ĐƠN VỊ), đúng như file công nợ của bộ phận: cả 9
 * dòng bia của BNC đợt một cùng mang một số hóa đơn.
 *
 * KHOÁ SUY TỪ BIÊN ĐỢT VÀ MÃ BP. Sửa lại biên đợt thì khoá đổi và hóa đơn đã
 * ghi rời ra — CỐ Ý như vậy: đợt đã khác thì tập giao dịch bên dưới cũng khác,
 * gán số cũ cho tập mới là gán bừa. Nơi gọi đếm số hóa đơn bị rời ra và báo.
 */

/** Một hóa đơn đã phát hành, do người dùng điền lại vào app. */
export interface HoaDonGhiNhan {
  /** = khoaHoaDon(...). Cũng là khoá tài liệu trên Firestore. */
  id: string;
  /** Biên đợt, để tra ngược và để biết hóa đơn thuộc kỳ nào. */
  tuNgay: string;
  denNgay: string;
  /** Mã BP của đơn vị nhận hóa đơn. */
  maBp: string;
  /** Tên đơn vị lúc ghi, chỉ để đọc — tra cứu vẫn theo mã BP. */
  donVi: string;
  soHoaDon: string;
  /** yyyy-MM-dd */
  ngayHoaDon: string;
  /**
   * LÚC TỆP TEMPLATE CỦA ĐƠN NÀY ĐƯỢC TẢI VỀ. ISO, rỗng nghĩa là chưa tải.
   *
   * Đây là mốc chuyển đơn từ "chưa xuất" sang "đã xuất", chứ KHÔNG phải lúc
   * điền số hóa đơn. Tải tệp về là mang sang hệ thống hóa đơn để phát hành —
   * kể từ lúc ấy đơn đã đi khỏi tay, dù số hóa đơn thật vài hôm sau mới có.
   *
   * Tách riêng khỏi `soHoaDon` vì hai mốc khác nhau: lấy `soHoaDon` làm mốc
   * thì suốt quãng giữa — đã kết xuất, chưa có số — đơn vẫn nằm ở danh sách
   * "chưa xuất", và lần kết xuất sau sẽ gom nó vào tệp lần nữa.
   */
  ngayKetXuat?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Khoá của một hóa đơn.
 *
 * Nhận hàm băm từ ngoài để phần này không phụ thuộc gì, chạy thử được.
 */
export function khoaHoaDon(
  tuNgay: string,
  denNgay: string,
  maBp: string,
  bam: (s: string) => string,
): string {
  return "hd-" + bam([tuNgay, denNgay, maBp].join("|"));
}

/** Tra nhanh theo khoá. */
export function bangHoaDon(ds: HoaDonGhiNhan[]): Map<string, HoaDonGhiNhan> {
  const m = new Map<string, HoaDonGhiNhan>();
  ds.forEach((h) => {
    if (h?.id) m.set(h.id, h);
  });
  return m;
}

/** Một dòng cần điền số hóa đơn, gom từ bảng công nợ. */
export interface DongCanDien {
  khoa: string;
  tuNgay: string;
  denNgay: string;
  nhanDot: string;
  maBp: string;
  donVi: string;
  soDong: number;
  soLuong: number;
  thanhTien: number;
  /** Số app gợi ý — chỉ để điền sẵn, không phải số thật. */
  soGoiY: string;
  /** Đã điền và đã lưu chưa. */
  soDaGhi: string;
  ngayDaGhi: string;
  /** Tệp TEMPLATE của đơn này đã được tải về chưa. */
  daKetXuat: boolean;
}

/**
 * Gom bảng công nợ thành danh sách hóa đơn cần điền.
 *
 * Mỗi (đợt × mã BP) một dòng, kèm tổng tiền để người điền đối chiếu với tờ hóa
 * đơn trong tay trước khi gõ số vào.
 */
export function dongCanDienHoaDon(
  dong: {
    ngayGiaoBia: string;
    maBp: string;
    donVi: string;
    soLuong: number;
    thanhTienSkb: number;
    soHoaDon: string;
  }[],
  dot: { tuNgay: string; denNgay: string; nhan: string }[],
  daGhi: Map<string, HoaDonGhiNhan>,
  bam: (s: string) => string,
): DongCanDien[] {
  const theoNhan = new Map<string, { tuNgay: string; denNgay: string }>();
  dot.forEach((d) => theoNhan.set(d.nhan, { tuNgay: d.tuNgay, denNgay: d.denNgay }));

  const gom = new Map<string, DongCanDien>();
  dong.forEach((r) => {
    const bien = theoNhan.get(r.ngayGiaoBia);
    if (!bien) return;
    const khoa = khoaHoaDon(bien.tuNgay, bien.denNgay, r.maBp || r.donVi, bam);
    let o = gom.get(khoa);
    if (!o) {
      const h = daGhi.get(khoa);
      o = {
        khoa,
        tuNgay: bien.tuNgay,
        denNgay: bien.denNgay,
        nhanDot: r.ngayGiaoBia,
        maBp: r.maBp,
        donVi: r.donVi,
        soDong: 0,
        soLuong: 0,
        thanhTien: 0,
        soGoiY: r.soHoaDon,
        soDaGhi: h?.soHoaDon || "",
        ngayDaGhi: h?.ngayHoaDon || "",
        daKetXuat: !!String(h?.ngayKetXuat || "").trim(),
      };
      gom.set(khoa, o);
    }
    o.soDong += 1;
    o.soLuong += r.soLuong;
    o.thanhTien += r.thanhTienSkb;
  });

  return Array.from(gom.values());
}

/**
 * Hóa đơn đã ghi mà không còn khớp đợt nào đang khai.
 *
 * Xảy ra khi người dùng sửa lại biên đợt sau lúc đã điền số. Không tự xoá và
 * cũng không tự gán sang đợt khác — chỉ báo ra, để người biết mà quyết định.
 */
/**
 * Đánh dấu một loạt đơn là ĐÃ KẾT XUẤT, giữ nguyên số hóa đơn đã có.
 *
 * Trả về bản ghi để nơi gọi lưu xuống. CỐ Ý chép lại `soHoaDon` và
 * `ngayHoaDon` cũ thay vì để trống: bản ghi đi qua `merge` của Firestore, mà
 * một ngày nào đó đổi sang ghi đè thì để trống ở đây sẽ xoá sạch số đã điền.
 */
export function danhDauKetXuat(
  ds: DongCanDien[],
  luc: string,
): HoaDonGhiNhan[] {
  return ds.map((d) => ({
    id: d.khoa,
    tuNgay: d.tuNgay,
    denNgay: d.denNgay,
    maBp: d.maBp,
    donVi: d.donVi,
    soHoaDon: d.soDaGhi,
    ngayHoaDon: d.ngayDaGhi,
    ngayKetXuat: luc,
  }));
}

/**
 * Đưa một đơn NGƯỢC về "chưa xuất".
 *
 * Bấm nhầm nút tải tệp là đơn nhảy sang tab kia; không có đường lui thì phải
 * đi sửa thẳng dữ liệu. Xoá bằng chuỗi rỗng chứ không xoá hẳn trường, vì bản
 * ghi đi qua `merge` — `merge` không bỏ được trường.
 */
export function boDauKetXuat(d: DongCanDien): HoaDonGhiNhan {
  return {
    id: d.khoa,
    tuNgay: d.tuNgay,
    denNgay: d.denNgay,
    maBp: d.maBp,
    donVi: d.donVi,
    soHoaDon: d.soDaGhi,
    ngayHoaDon: d.ngayDaGhi,
    ngayKetXuat: "",
  };
}

export function hoaDonRoiRa(
  daGhi: HoaDonGhiNhan[],
  khoaDangDung: Set<string>,
): HoaDonGhiNhan[] {
  return daGhi.filter((h) => h.soHoaDon && !khoaDangDung.has(h.id));
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DÒNG NẠP TỪ TỆP XUẤT KHO, VÀ CÁCH ĐÁNH KHOÁ CHO NÓ.
 *
 * Tệp này từng chứa cả bộ đọc tệp BBGN dạng bảng chéo đời cũ cùng nút dựng
 * tệp mẫu. Màn hình nạp đã chuyển sang đọc thẳng tệp gốc của bộ phận qua
 * `tkhoXuat.ts`, nên bộ đọc cũ không còn ai gọi — và hàm đọc số của nó còn
 * đọc "1.234,5" ra 0. Gỡ ngày 14/10/2026; cần lại thì lấy từ lịch sử git
 * (commit trước 5656196).
 *
 * Còn lại hai thứ App đang dùng: kiểu một dòng nạp, và phép đánh khoá theo
 * nội dung để nạp lại không nhân đôi.
 */

/** Một dòng xuất kho đọc được từ tệp, đã khớp mặt hàng và đơn vị. */
export interface BbgnDraft {
  /** yyyy-MM-dd */
  dateKey: string;
  partnerId: string;
  partnerName: string;
  productId: string;
  productName: string;
  quantity: number;
  /** Điểm nhận (NH 1901, Cầu Vàng...) — ghi vào ghi chú của giao dịch. */
  outlet: string;
  /** Cột Note trong file, chỉ giữ khi khác với địa điểm. */
  note: string;
  /**
   * Hao hụt đi kèm chuyến giao này. Ghi thành giao dịch `LOSS` RIÊNG.
   *
   * Không cộng vào `quantity`: số lượng là phần lên công nợ và lên hóa đơn,
   * hao hụt là phần mình mất. Cộng chung là xuất hóa đơn cho phần không thu
   * tiền.
   */
  haoHut?: number;
  /**
   * Chỉ số cột trong sheet — danh tính của một CHUYẾN GIAO.
   *
   * Chỉ dòng đọc từ bảng chéo "T Kho" mới có. Cùng ngày một điểm bán có thể
   * nhận hai chuyến, sheet ghi mỗi chuyến một cột; thiếu số này thì hai chuyến
   * không phân biệt được và bị gom thành một đơn.
   */
  cot?: number;
}

/**
 * ĐÁNH KHOÁ TÀI LIỆU CHO TỪNG DÒNG NẠP TỪ FILE BBGN.
 *
 * Khoá suy từ NỘI DUNG chứ không từ `Date.now()`: nạp lại đúng một tệp thì ghi
 * đè lên chính nó, không sinh ra một bộ giao dịch mới làm tồn kho bị trừ hai
 * lần và doanh thu nhân đôi.
 *
 * VÌ SAO CẦN SỐ LẦN XUẤT HIỆN: một điểm bán có thể nhận nhiều chuyến trong
 * cùng một ngày, và sheet ghi mỗi chuyến một cột. Bốn trường (ngày, đơn vị,
 * mặt hàng, điểm bán) khi đó trùng nhau y hệt. Bản trước tin rằng mỗi tổ hợp
 * chỉ có một ô, nên dòng sau ghi đè dòng trước và số liệu âm thầm bay mất —
 * riêng tệp "BBGN Bia T8" mất 762,2 lít trên 6.882,2, hơn 11%, không một cảnh
 * báo nào.
 *
 * Thứ tự các ô do `parseTkhoXuat` duyệt từ trái sang phải nên ổn định: nạp lại
 * cùng một tệp cho ra đúng bộ khoá cũ.
 *
 * Trả về khoá GỐC. Nơi gọi nối thêm `-0` (đuôi giữ từ thời còn chia lô, để
 * nạp lại vẫn đè đúng lên dòng của những lần nạp trước).
 */
export function danhKhoaBbgn(
  drafts: {
    dateKey: string;
    partnerId: string;
    productId: string;
    outlet?: string;
    cot?: number;
  }[],
  bam: (s: string) => string,
): string[] {
  const dem = new Map<string, number>();
  return drafts.map((d) => {
    const goc =
      "bbgn-" +
      bam([d.dateKey, d.partnerId, d.productId, d.outlet || ""].join("|"));
    const lan = dem.get(goc) ?? 0;
    dem.set(goc, lan + 1);
    return `${goc}-l${lan}`;
  });
}

/**
 * DÒNG CỦA LẦN NẠP TRƯỚC MÀ TỆP LẦN NÀY KHÔNG CÒN.
 *
 * Nạp lại tệp đã sửa: lần nạp chỉ dọn được dòng cũ CÙNG KHOÁ với dòng mới.
 * Mà khoá suy từ ngày · đơn vị · mặt hàng · điểm bán, nên khi tệp sửa một
 * trong bốn thứ đó (ô ngày 21 thành 22, đổi tên điểm bán, gán điểm bán sang
 * đơn vị khác) thì khoá mới khác khoá cũ: dòng mới được ghi, dòng cũ NẰM LẠI.
 * Tồn kho bị trừ hai lần, công nợ và hóa đơn cộng hai lần — không ai thấy.
 *
 * Hàm này tìm những dòng như vậy để HỎI người nạp (không tự xoá: tệp có thể
 * chỉ là một phần kỳ). Phạm vi xét chặt:
 *   · mã bắt đầu bằng `tienTo` (`bbgn-` / `tkho-`) — chỉ dòng do nạp tệp sinh;
 *   · ngày nằm trong khoảng ngày của tệp;
 *   · cùng đơn vị với một dòng trong tệp (nếu có danh sách đơn vị);
 *   · KHÔNG thuộc khoá nào tệp lần này sẽ ghi.
 */
export function dongCuNgoaiTep<
  T extends { id: string; date: string; partnerId?: string },
>(
  dongCo: T[],
  tep: {
    tienTo: string;
    /** yyyy-MM-dd của mọi dòng trong tệp. */
    ngay: string[];
    /** Dòng cũ thuộc tệp lần này (sẽ bị ghi đè / dọn sẵn) — không tính. */
    thuocTep: (id: string) => boolean;
    donVi?: Set<string>;
  },
): T[] {
  const ngay = tep.ngay.filter(Boolean).sort();
  if (!ngay.length) return [];
  const tu = ngay[0];
  const den = ngay[ngay.length - 1];
  return dongCo.filter((t) => {
    if (!String(t.id ?? "").startsWith(tep.tienTo)) return false;
    const n = String(t.date ?? "").slice(0, 10);
    if (n < tu || n > den) return false;
    if (tep.donVi && !tep.donVi.has(String(t.partnerId ?? ""))) return false;
    return !tep.thuocTep(t.id);
  });
}

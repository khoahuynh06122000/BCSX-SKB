/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SOÁT XEM ẢNH MINH CHỨNG CÒN TẢI ĐƯỢC KHÔNG
 *
 * Thư viện ảnh có hàng trăm tấm, trong đó một phần đã mất. Nhìn từng ô thì chỉ
 * biết "tấm này mất"; câu cần trả lời là MẤT THEO QUY LUẬT NÀO — vì mỗi quy
 * luật chỉ ra một nguyên nhân khác nhau:
 *
 *   Mất hết trước một mốc ngày   → máy chủ ảnh đã bị dọn một lần, hoặc vượt
 *                                  hạn mức lưu trữ và ảnh cũ bị xoá
 *   Mất rải rác đều mọi ngày     → từng lần tải lên bị lỗi mà app không biết
 *   Mất theo đơn vị              → một đợt nhập liệu nào đó ghi sai đường dẫn
 *   Mất theo kiểu đường dẫn      → lỗi ở chỗ lưu, không phải ở máy chủ ảnh
 *
 * Ở đây CỐ Ý chỉ có phần gom nhóm và dựng báo cáo, không có phần tải ảnh. Việc
 * tải thuộc về màn hình — tách ra thì phần này chạy test được mà không cần mạng.
 */

import { kieuDuongDanAnh } from "./thuVienAnh";

/** Kết quả soát một tấm. */
export interface KetQuaMotAnh {
  id: string;
  url: string;
  /** ISO hoặc `yyyy-MM-dd`. */
  date: string;
  donVi: string;
  /** Tải được hay không. */
  duoc: boolean;
}

export interface DongNhom {
  ten: string;
  tong: number;
  hong: number;
}

export interface TomTatSoatAnh {
  tong: number;
  hong: number;
  /** Hỏng chia theo kiểu đường dẫn. */
  theoKieu: DongNhom[];
  /** Hỏng chia theo tháng, xếp cũ trước để thấy mốc thời gian. */
  theoThang: DongNhom[];
  /** Hỏng chia theo đơn vị, xếp nhiều hỏng nhất lên trước. */
  theoDonVi: DongNhom[];
  /**
   * Tháng gần nhất mà MỌI tấm đều hỏng, và tháng cũ nhất mà mọi tấm đều còn.
   *
   * Hai mốc này cạnh nhau thì gần như chắc chắn máy chủ ảnh bị dọn một lần —
   * chứ lỗi tải lên từng lần thì không thể sạch sẽ theo thời gian như vậy.
   */
  mocThoiGian: { hongHetToi: string; conHetTu: string } | null;
  /** Vài đường dẫn hỏng để xem mẫu. */
  viDuHong: string[];
}

const thang = (iso: string): string => String(iso ?? "").slice(0, 7);

function gom(
  ds: KetQuaMotAnh[],
  khoa: (a: KetQuaMotAnh) => string,
): Map<string, DongNhom> {
  const m = new Map<string, DongNhom>();
  ds.forEach((a) => {
    const k = khoa(a) || "(không rõ)";
    const o = m.get(k) ?? { ten: k, tong: 0, hong: 0 };
    o.tong += 1;
    if (!a.duoc) o.hong += 1;
    m.set(k, o);
  });
  return m;
}

/**
 * Tìm hai mốc thời gian: tháng gần nhất hỏng sạch, tháng cũ nhất còn sạch.
 *
 * Chỉ nhận khi hai mốc LIỀN KỀ nhau theo thứ tự tháng và không có tháng nào ở
 * giữa lẫn lộn — nửa hỏng nửa còn thì không phải một lần dọn, và nói là mốc
 * thì dẫn người đọc đi sai hướng.
 */
function timMoc(theoThang: DongNhom[]): TomTatSoatAnh["mocThoiGian"] {
  if (theoThang.length < 2) return null;
  const hongHet = (d: DongNhom) => d.hong === d.tong;
  const conHet = (d: DongNhom) => d.hong === 0;

  let i = 0;
  while (i < theoThang.length && hongHet(theoThang[i])) i++;
  if (i === 0 || i === theoThang.length) return null;
  // Từ chỗ đó về sau phải còn sạch hết.
  if (!theoThang.slice(i).every(conHet)) return null;
  return {
    hongHetToi: theoThang[i - 1].ten,
    conHetTu: theoThang[i].ten,
  };
}

export function tomTatSoatAnh(ds: KetQuaMotAnh[]): TomTatSoatAnh {
  const hong = ds.filter((a) => !a.duoc);

  const theoKieu = Array.from(gom(ds, (a) => kieuDuongDanAnh(a.url)).values())
    .sort((a, b) => b.hong - a.hong || b.tong - a.tong);

  // Tháng xếp CŨ TRƯỚC: mốc thời gian chỉ đọc được khi xếp theo dòng thời gian.
  const theoThang = Array.from(gom(ds, (a) => thang(a.date)).values()).sort(
    (a, b) => a.ten.localeCompare(b.ten),
  );

  const theoDonVi = Array.from(gom(ds, (a) => a.donVi).values()).sort(
    (a, b) => b.hong - a.hong || a.ten.localeCompare(b.ten, "vi"),
  );

  return {
    tong: ds.length,
    hong: hong.length,
    theoKieu,
    theoThang,
    theoDonVi,
    mocThoiGian: timMoc(theoThang),
    viDuHong: hong.slice(0, 3).map((a) => a.url),
  };
}

/** Báo cáo dạng chữ, để dán vào tin nhắn. */
export function baoCaoSoatAnh(t: TomTatSoatAnh): string {
  const d: string[] = [];
  const ty = (h: number, n: number) =>
    n > 0 ? ` (${Math.round((h / n) * 100)}%)` : "";
  d.push(`SOAT ANH MINH CHUNG`);
  d.push(`Tong ${t.tong} tam, hong ${t.hong}${ty(t.hong, t.tong)}`);

  d.push(``, `Theo kieu duong dan:`);
  t.theoKieu.forEach((o) => d.push(`  ${o.ten}: hong ${o.hong}/${o.tong}`));

  d.push(``, `Theo thang:`);
  t.theoThang.forEach((o) => d.push(`  ${o.ten}: hong ${o.hong}/${o.tong}`));

  d.push(``, `Theo don vi:`);
  t.theoDonVi.forEach((o) => d.push(`  ${o.ten}: hong ${o.hong}/${o.tong}`));

  if (t.mocThoiGian) {
    d.push(
      ``,
      `MOC THOI GIAN: hong sach toi ${t.mocThoiGian.hongHetToi}, con sach tu ${t.mocThoiGian.conHetTu}`,
    );
  }
  if (t.viDuHong.length) {
    d.push(``, `Vi du duong dan hong:`);
    t.viDuHong.forEach((u) => d.push(`  ${u}`));
  }
  return d.join("\n");
}

/**
 * Một câu kết luận đọc được ngay, không cần đọc cả bảng.
 *
 * Có câu này thì người dùng biết phải làm gì tiếp; bảng số ở dưới là để gửi
 * cho người viết code xem.
 */
export function nhanDinhSoatAnh(t: TomTatSoatAnh): string {
  if (t.tong === 0) return "Không có tấm nào để soát.";
  if (t.hong === 0) return `Cả ${t.tong} tấm đều tải được.`;

  const mangHong = t.theoKieu.find((o) => o.ten === "mang")?.hong ?? 0;
  const tatCaLaMang = mangHong === t.hong;

  if (t.mocThoiGian && tatCaLaMang) {
    return `Ảnh hỏng sạch tới ${t.mocThoiGian.hongHetToi} và còn sạch từ ${t.mocThoiGian.conHetTu} — đường dẫn vẫn đúng, tệp ảnh đã mất khỏi máy chủ ảnh. Dấu hiệu của MỘT LẦN DỌN hoặc vượt hạn mức lưu trữ, không phải lỗi lưu của app. Phải kiểm tra tài khoản máy chủ ảnh.`;
  }
  if (tatCaLaMang) {
    return `Cả ${t.hong} tấm hỏng đều có đường dẫn đúng nhưng tệp không còn trên máy chủ ảnh. Hỏng rải rác chứ không theo mốc thời gian, nên phải xem lại từng lần tải lên có báo lỗi mà app bỏ qua không.`;
  }
  const kieuKhac = t.theoKieu
    .filter((o) => o.hong > 0 && o.ten !== "mang")
    .map((o) => `${o.ten} ${o.hong}`)
    .join(", ");
  return `${t.hong} tấm hỏng, trong đó có tấm lỗi ngay ở đường dẫn (${kieuKhac}) — phần này là lỗi lúc lưu, sửa được bằng code.`;
}

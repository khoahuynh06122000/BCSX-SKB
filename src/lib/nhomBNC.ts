/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BỐN NHÓM CỦA BNC
 *
 * BNC là một khách hàng của SAP (mã `AD0103`) nhưng bên trong khu thì chia làm
 * BỐN PHẦN, theo cách bộ phận đang theo dõi:
 *
 *   Nội bộ        — 17 điểm bán trong khu (1901, Plaza, Cầu Vàng, ...)
 *   Ngoại giao    — hàng đối ngoại, biếu tặng
 *   HTKD          — điểm hợp tác kinh doanh (El Fresco, Mini Mart)
 *   Chi phí khác  — phần không thuộc ba nhóm trên
 *
 * NHÓM SUY RA TỪ MÃ BỘ PHẬN, KHÔNG LIỆT KÊ 17 ĐIỂM BÁN. Ba nhóm sau đúng bằng
 * một bộ phận và có mã cố định; còn lại là Nội bộ. Nhờ vậy mở thêm quán mới
 * trong khu chỉ cần thêm một bộ phận `AD0103-XX`, không phải sửa thêm chỗ nào —
 * nếu liệt kê thì mỗi lần mở quán lại phải nhớ thêm tên vào danh sách Nội bộ,
 * quên là quán đó rơi ra ngoài mọi nhóm.
 *
 * VÌ SAO CHIA NHÓM MÀ VẪN GIỮ 17 ĐIỂM BÁN RIÊNG. Hai câu hỏi khác nhau: "Nội bộ
 * uống bao nhiêu" và "quán nào uống bao nhiêu". Gom 17 điểm bán thành một mục
 * thì mất câu thứ hai — đã từng như thế và báo cáo chỉ hiện một dòng 53.026 lít.
 * Nhóm là tầng cộng thêm ở trên, không thay tầng bộ phận.
 */

/** Bộ phận của BNC đều mang khoá dạng `AD0103-XX`. */
export const TIEN_TO_BNC = "AD0103-";

export type MaNhomBNC = "NB" | "NG" | "HTKD" | "CPK";

export interface NhomBNC {
  ma: MaNhomBNC;
  ten: string;
  /**
   * Mã bộ phận nếu nhóm này đúng bằng MỘT bộ phận — chọn nhóm là chọn xong.
   *
   * `null` nghĩa là nhóm gồm nhiều bộ phận (chỉ Nội bộ), phải chọn tiếp điểm
   * bán. Không đặt mặc định một điểm bán nào: đoán sai là ghi sản lượng cho
   * nhầm quán.
   */
  boPhan: string | null;
  /** Câu giải thích ngắn hiện dưới nút chọn. */
  moTa: string;
}

export const NHOM_BNC: NhomBNC[] = [
  {
    ma: "NB",
    ten: "Nội bộ",
    boPhan: null,
    moTa: "Điểm bán trong khu",
  },
  {
    ma: "NG",
    ten: "Ngoại giao",
    boPhan: "AD0103-NG",
    moTa: "Đối ngoại, biếu tặng",
  },
  {
    ma: "HTKD",
    ten: "HTKD",
    boPhan: "AD0103-HTKD",
    moTa: "Hợp tác kinh doanh",
  },
  {
    ma: "CPK",
    ten: "Chi phí khác",
    boPhan: "AD0103-CPK",
    moTa: "Không thuộc ba nhóm trên",
  },
];

/** Bộ phận riêng của từng nhóm, tra ngược từ mã bộ phận về nhóm. */
const NHOM_THEO_BO_PHAN = new Map<string, MaNhomBNC>(
  NHOM_BNC.filter((n) => n.boPhan).map((n) => [n.boPhan as string, n.ma]),
);

export const laBoPhanBNC = (partnerId: string): boolean =>
  String(partnerId ?? "").startsWith(TIEN_TO_BNC);

/**
 * Bộ phận này thuộc nhóm nào. Không phải bộ phận của BNC thì trả `null`.
 *
 * Bộ phận lạ (mới thêm, chưa ai gán) rơi vào Nội bộ chứ không rơi ra ngoài:
 * quán mới mở trong khu thì đúng là Nội bộ, mà để rỗng thì sản lượng biến mất
 * khỏi cả bốn nhóm trong khi tổng vẫn có — sai lệch khó thấy nhất.
 */
export function nhomCuaBoPhan(partnerId: string): MaNhomBNC | null {
  const id = String(partnerId ?? "");
  if (!laBoPhanBNC(id)) return null;
  return NHOM_THEO_BO_PHAN.get(id) ?? "NB";
}

/** Tên nhóm để bày lên giao diện. */
export function tenNhomBNC(ma: MaNhomBNC | null): string {
  return NHOM_BNC.find((n) => n.ma === ma)?.ten ?? "";
}

/** Nhóm của một bộ phận, dạng tên đã sẵn để in ra. Rỗng nếu ngoài BNC. */
export function tenNhomCuaBoPhan(partnerId: string): string {
  return tenNhomBNC(nhomCuaBoPhan(partnerId));
}

/** Nhóm này có phải chọn tiếp bộ phận hay không. */
export function phaiChonBoPhan(ma: MaNhomBNC): boolean {
  return !NHOM_BNC.find((n) => n.ma === ma)?.boPhan;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BẢNG GẮN ĐIỂM BÁN VỚI ĐỐI TÁC
 *
 * Sheet "T Kho" của bộ phận ghi hàng đi tới đâu bằng TÊN ĐIỂM BÁN viết tắt —
 * "NH 1901", "SBVH", "MFV" — chứ không ghi mã đơn vị. Muốn dựng được giao dịch
 * xuất kho thì phải biết mỗi điểm bán đó thuộc đối tác nào.
 *
 * Bảng này KHÔNG đoán ra được bằng thuật toán. Phần lớn điểm bán là quán trong
 * khu du lịch, đều bán qua cùng một đối tác; còn "MFV" hay "SBVH" thì không có
 * chữ nào chung với tên đối tác. Nên bảng do người có nghiệp vụ gán, sinh ra từ
 * tệp map-diem-ban-T8.xlsx, không gõ tay lại.
 *
 * Điểm bán chưa có trong bảng thì KHÔNG tạo giao dịch — hiện ra để người dùng
 * gán. Đoán một cái tên lạ là gán sản lượng cho nhầm khách.
 *
 * Dựng từ tệp `map-diem-ban-T8.xlsx` (49 điểm bán, 56 cách viết). Thêm điểm bán
 * mới thì thêm thẳng vào mảng dưới đây — mỗi cách viết một dòng, vì lỗi gõ như
 * "KS Novotrl" / "KS Novotel" hay "KAKAZ" / "Kavkaz" không chuẩn hoá gộp được.
 */

export interface DiemBanEntry {
  /** Tên đúng như trong sheet, giữ nguyên cách viết. */
  ten: string;
  partnerId: string;
  /** Ghi vào ghi chú của giao dịch xuất kho. Rỗng nghĩa là bán thường. */
  note: string;
}

export const DIEM_BAN: DiemBanEntry[] = [
  { ten: "4 Mùa", partnerId: "AD0103", note: "" },
  { ten: "Aserana Hòa Bình", partnerId: "AC0130", note: "" },
  { ten: "B8", partnerId: "AD0103", note: "" },
  { ten: "Ban Đối Ngoại", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "BĐN Nha Trang", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "BPTDA Quảng Trị", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "Bulgogi", partnerId: "AD0103", note: "" },
  { ten: "CẦU VÀNG", partnerId: "AD0103", note: "" },
  { ten: "Cổng Thành 1", partnerId: "AD0103", note: "" },
  { ten: "Draf Beer", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "Đông Du TP HCM", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "El Fresco", partnerId: "AD0103", note: "HTKD" },
  { ten: "FV", partnerId: "AC0107", note: "" },
  { ten: "Gà Rán", partnerId: "AD0103", note: "" },
  { ten: "GA10", partnerId: "AD0103", note: "" },
  { ten: "Gastrobup", partnerId: "AD0103", note: "" },
  { ten: "Intercon", partnerId: "AC0103", note: "" },
  { ten: "KAKAZ", partnerId: "AD0103", note: "" },
  { ten: "Kavkaz", partnerId: "AD0103", note: "" },
  { ten: "KS  Capela", partnerId: "AC0132", note: "" },
  { ten: "KS Novotel", partnerId: "AC0104", note: "" },
  { ten: "KS Novotrl", partnerId: "AC0104", note: "" },
  { ten: "LĐTĐ 13 Hai Bà Trưng", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "Lễ Hội  Bia", partnerId: "AD0103", note: "" },
  { ten: "LH BIA", partnerId: "AD0103", note: "" },
  { ten: "MFV", partnerId: "AC0107", note: "" },
  { ten: "Mini Mart  Nhật Anh", partnerId: "AD0103", note: "HTKD" },
  { ten: "Nghệ An", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "NH  Hội An", partnerId: "AD0103", note: "" },
  { ten: "NH 1901", partnerId: "AD0103", note: "" },
  { ten: "NH 4 MÙA", partnerId: "AD0103", note: "" },
  { ten: "NH PLAZA", partnerId: "AD0103", note: "" },
  { ten: "NH TAIGA", partnerId: "AD0103", note: "" },
  { ten: "Quang Hanh Quảng Ninh", partnerId: "AC0129", note: "" },
  { ten: "Sân Gôn", partnerId: "AC0118", note: "" },
  { ten: "SBVH", partnerId: "AD0103", note: "" },
  { ten: "Shushi Rosa", partnerId: "AD0103", note: "" },
  { ten: "SPT Nha Trang", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "SPT Vũng Tàu", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "Sun bun VH", partnerId: "AD0103", note: "" },
  { ten: "Sunbun s", partnerId: "AD0103", note: "" },
  { ten: "SW  Cát Bà", partnerId: "AD0101", note: "" },
  { ten: "SW  Hạ Long", partnerId: "AD0100", note: "" },
  { ten: "SW  Vũng Tàu", partnerId: "AD0115", note: "" },
  { ten: "SW Fansipan   Sapa", partnerId: "AD0112", note: "" },
  { ten: "Taiga", partnerId: "AD0103", note: "" },
  { ten: "VMT", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "VMT   Kiểm Lâm", partnerId: "AD0103", note: "Ngoại giao" },
  { ten: "VMT A Cảnh", partnerId: "AD0103", note: "Ngoại giao" },
];

/**
 * Chuẩn hoá tên điểm bán để tra bảng.
 *
 * Bỏ dấu, bỏ khoảng trắng và ký tự lạ, hạ chữ thường — vì cùng một chỗ được gõ
 * "Ga 10" / "GA10", "Cầu Vàng" / "CẦU VÀNG" / "Cầu vàng". Chữ "đ" phải đổi
 * riêng: nó là chữ cái Latin độc lập nên normalize("NFD") không tách được.
 */
export function normalizeDiemBan(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

const BANG = new Map<string, DiemBanEntry>(
  DIEM_BAN.map((e) => [normalizeDiemBan(e.ten), e]),
);

/** Tra một tên điểm bán. Trả null nếu chưa gán — nơi gọi phải hiện ra để hỏi. */
export function lookupDiemBan(ten: string): DiemBanEntry | null {
  return BANG.get(normalizeDiemBan(ten)) ?? null;
}

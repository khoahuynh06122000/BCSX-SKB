/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * XOÁ DÒNG RỒI THÌ CHỨNG TỪ ĐI KÈM CÒN AI ĐỨNG SAU KHÔNG.
 *
 * Mỗi lượt giao nối sang hai phân hệ khác bằng một mã chung:
 *   · phiếu nhập: `slipCode` → tài liệu `slips/{mã}` (ảnh ký) và một dòng
 *     trong sổ số phiếu (`nguon` = mã phiếu);
 *   · đơn xuất: `referenceGroupId` → một dòng trong sổ số phiếu.
 *
 * Xoá lẻ một dòng / một đơn thì trước đây chỉ xoá giao dịch: sổ số phiếu vẫn
 * ghi "còn hiệu lực" cho một chứng từ không còn hàng nào phía sau, và phiếu
 * nhập vẫn giữ ảnh ký của lô đã xoá. Hàm này tìm những mã mà SAU lần xoá
 * không còn dòng nào dùng — chỉ những mã đó mới được dọn theo. Mã còn dòng
 * khác dùng (xoá một mặt hàng trong phiếu nhiều mặt hàng) thì để nguyên.
 */

interface DongCoMa {
  id: string;
  slipCode?: string;
  referenceGroupId?: string;
}

export function nguonMoCoi(
  xoa: DongCoMa[],
  tatCa: DongCoMa[],
): { phieuNhap: string[]; nhom: string[] } {
  const idXoa = new Set(xoa.map((t) => t.id));
  const conLai = tatCa.filter((t) => !idXoa.has(t.id));
  const maConDung = new Set(conLai.map((t) => t.slipCode).filter(Boolean));
  const nhomConDung = new Set(
    conLai.map((t) => t.referenceGroupId).filter(Boolean),
  );
  const phieuNhap = [
    ...new Set(
      xoa
        .map((t) => String(t.slipCode ?? "").trim())
        .filter((m) => m && !maConDung.has(m)),
    ),
  ];
  const nhom = [
    ...new Set(
      xoa
        .map((t) => String(t.referenceGroupId ?? "").trim())
        .filter((m) => m && !nhomConDung.has(m)),
    ),
  ];
  return { phieuNhap, nhom };
}

/** Số phiếu còn hiệu lực mà nguồn của nó vừa mất hết dòng. */
export function soPhieuMoCoi<
  G extends { soPhieu: string; nguon: string; trangThai: string },
>(so: G[], moCoi: { phieuNhap: string[]; nhom: string[] }): G[] {
  const nguon = new Set([...moCoi.phieuNhap, ...moCoi.nhom]);
  return so.filter((g) => g.trangThai === "hieu_luc" && nguon.has(g.nguon));
}

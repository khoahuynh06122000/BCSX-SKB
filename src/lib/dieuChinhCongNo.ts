/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ĐIỀU CHỈNH CÔNG NỢ — sửa hàng đã xuất nhầm đơn vị mà hóa đơn đã phát hành.
 *
 * Tình huống thật (30.09.2026): một đơn VINACS Hà Nội là của SPA, nhưng lúc
 * xuất kho chọn nhầm "BNC · Ngoại giao", và hóa đơn của đợt ấy đã phát hành,
 * đã điền số, công nợ đã chốt. Hóa đơn đã phát hành thì không sửa lại được —
 * cách làm của bộ phận là CÂN LẠI Ở LƯỢT HÓA ĐƠN KẾ TIẾP: ghi âm cho đơn vị
 * nhầm, ghi dương đúng số ấy cho đơn vị đúng.
 *
 * App ghi đúng như vậy: một CẶP dòng xuất kho cùng mặt hàng, cùng số lượng,
 *   · `-SL` cho đơn vị đã xuất nhầm,
 *   · `+SL` cho đơn vị đúng,
 * mang ngày GHI (rơi vào đợt hóa đơn sắp tới) và nhớ ngày giao GỐC.
 *
 * Vì sao như vậy là đúng ở cả ba nơi:
 *   · CÔNG NỢ: bảng Chốt gộp theo (đợt × mã BP × mã vật tư), nên đơn vị nhầm
 *     bị trừ, đơn vị đúng được cộng, đúng trong đợt kế tiếp.
 *   · TỒN KHO: cặp dòng cộng lại bằng 0 — hàng chỉ rời kho một lần, điều chỉnh
 *     không làm tồn kho đổi.
 *   · DẤU VẾT: hóa đơn cũ giữ nguyên, điều chỉnh nằm riêng, có ngày gốc và lý
 *     do — đối chiếu với cơ quan thuế lần ra được.
 *
 * KHÔNG ĐƯỢC rơi vào đợt đã kết xuất / đã có số hóa đơn: làm vậy là âm thầm
 * đổi số của một tờ hóa đơn đã phát hành. `kiemTraDieuChinh` chặn việc đó.
 */

import type { DotChot } from "./congNo";

/** Đánh dấu trên giao dịch để mọi phân hệ nhận ra đây là dòng điều chỉnh. */
export interface DauDieuChinh {
  /** yyyy-MM-dd — ngày giao của đơn bị xuất nhầm. */
  ngayGoc: string;
  lyDo: string;
  /** partnerId của đơn vị đã xuất nhầm và đơn vị đúng. */
  tuDoiTac: string;
  sangDoiTac: string;
}

export function laDongDieuChinh(t: { dieuChinh?: unknown }): boolean {
  return !!t?.dieuChinh;
}

export interface DongDieuChinhVao {
  productId: string;
  soLuong: number;
}

export interface YeuCauDieuChinh {
  ngayGoc: string;
  /** yyyy-MM-dd — ngày ghi, quyết định đợt hóa đơn nhận điều chỉnh. */
  ngayGhi: string;
  tuDoiTac: string;
  sangDoiTac: string;
  lyDo: string;
  dong: DongDieuChinhVao[];
}

/** Đợt chứa một ngày; `null` = chưa thuộc đợt nào (sẽ vào đợt khai sau). */
export function dotCuaNgay(dot: DotChot[], ngay: string): DotChot | null {
  return (
    [...dot]
      .sort((a, b) => a.tuNgay.localeCompare(b.tuNgay))
      .find((d) => ngay >= d.tuNgay && ngay <= d.denNgay) ?? null
  );
}

/**
 * Lỗi chặn (trả về chuỗi) hoặc rỗng nếu được ghi.
 *
 * `daKhoa(dot, maBp)` cho biết hóa đơn (đợt × mã BP) đã kết xuất hoặc đã có
 * số — nhận từ ngoài để phần này không phụ thuộc cách lưu hóa đơn.
 */
export function kiemTraDieuChinh(
  yc: YeuCauDieuChinh,
  ctx: {
    dot: DotChot[];
    maBpCua: (partnerId: string) => string;
    daKhoa: (dot: DotChot, maBp: string) => boolean;
  },
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yc.ngayGoc)) return "Chưa chọn ngày giao gốc.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yc.ngayGhi)) return "Chưa chọn ngày ghi điều chỉnh.";
  if (yc.ngayGhi < yc.ngayGoc)
    return "Ngày ghi điều chỉnh phải sau ngày giao gốc — điều chỉnh vào lượt hóa đơn KẾ TIẾP.";
  if (!yc.tuDoiTac || !yc.sangDoiTac) return "Chưa chọn đủ hai đơn vị.";
  if (yc.tuDoiTac === yc.sangDoiTac) return "Đơn vị nhầm và đơn vị đúng đang là một.";
  if (!yc.lyDo.trim()) return "Ghi lý do điều chỉnh — sau này đối chiếu hóa đơn cần tới.";
  const dong = yc.dong.filter((d) => d.productId);
  if (!dong.length) return "Chưa có mặt hàng nào.";
  if (dong.some((d) => !(Number(d.soLuong) > 0)))
    return "Số lượng điều chỉnh phải lớn hơn 0 (app tự ghi âm cho đơn vị nhầm).";
  if (new Set(dong.map((d) => d.productId)).size !== dong.length)
    return "Một mặt hàng xuất hiện hai lần — gộp lại thành một dòng.";

  const d = dotCuaNgay(ctx.dot, yc.ngayGhi);
  if (d) {
    for (const p of [yc.tuDoiTac, yc.sangDoiTac]) {
      const maBp = ctx.maBpCua(p);
      if (ctx.daKhoa(d, maBp)) {
        return (
          `Ngày ghi ${yc.ngayGhi} rơi vào đợt ${d.tuNgay} → ${d.denNgay}, mà hóa đơn ` +
          `đợt đó của ${maBp || p} đã kết xuất / đã có số. Ghi vào đó là âm thầm đổi ` +
          `một tờ hóa đơn đã phát hành. Chọn ngày ghi thuộc đợt CHƯA xuất.`
        );
      }
    }
  }
  return "";
}

/** Khoá ổn định cho một lần điều chỉnh — bấm hai lần không sinh hai cặp. */
export function khoaDieuChinh(
  yc: YeuCauDieuChinh,
  bam: (s: string) => string,
): string {
  const dong = [...yc.dong]
    .filter((d) => d.productId)
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((d) => `${d.productId}:${Number(d.soLuong)}`)
    .join(",");
  return "dc-" + bam([yc.ngayGoc, yc.ngayGhi, yc.tuDoiTac, yc.sangDoiTac, dong].join("|"));
}

export interface DongGhiDieuChinh {
  id: string;
  productId: string;
  partnerId: string;
  /** Âm cho đơn vị nhầm, dương cho đơn vị đúng. */
  quantity: number;
  referenceGroupId: string;
  date: string;
  notes: string;
  dieuChinh: DauDieuChinh;
}

/** Dựng cặp dòng cho từng mặt hàng. Gọi SAU `kiemTraDieuChinh`. */
export function lapDongDieuChinh(
  yc: YeuCauDieuChinh,
  ctx: {
    bam: (s: string) => string;
    tenDoiTac: (partnerId: string) => string;
    ngayCham: (iso: string) => string;
  },
): DongGhiDieuChinh[] {
  const nhom = khoaDieuChinh(yc, ctx.bam);
  const dau: DauDieuChinh = {
    ngayGoc: yc.ngayGoc,
    lyDo: yc.lyDo.trim(),
    tuDoiTac: yc.tuDoiTac,
    sangDoiTac: yc.sangDoiTac,
  };
  const ghiChu =
    `[Điều chỉnh công nợ] Giao ${ctx.ngayCham(yc.ngayGoc)} · ` +
    `${ctx.tenDoiTac(yc.tuDoiTac)} → ${ctx.tenDoiTac(yc.sangDoiTac)} · ${dau.lyDo}`;
  // Giờ 08:00Z như dòng nạp tệp: app hiện ngày, không bịa giờ.
  const date = `${yc.ngayGhi}T08:00:00.000Z`;
  return yc.dong
    .filter((d) => d.productId)
    .flatMap((d) => [
      {
        id: `${nhom}-${d.productId}-giam`,
        productId: d.productId,
        partnerId: yc.tuDoiTac,
        quantity: -Math.abs(Number(d.soLuong)),
        referenceGroupId: nhom,
        date,
        notes: ghiChu,
        dieuChinh: dau,
      },
      {
        id: `${nhom}-${d.productId}-tang`,
        productId: d.productId,
        partnerId: yc.sangDoiTac,
        quantity: Math.abs(Number(d.soLuong)),
        referenceGroupId: nhom,
        date,
        notes: ghiChu,
        dieuChinh: dau,
      },
    ]);
}

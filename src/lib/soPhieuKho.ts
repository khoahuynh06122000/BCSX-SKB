/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CẤP SỐ PHIẾU — PHẦN CHẠM VÀO FIRESTORE
 *
 * Quy tắc đánh số nằm ở `src/lib/soPhieu.ts` (thuần phép tính, chạy test được).
 * Tệp này lo đúng một việc khó: cấp số sao cho KHÔNG BAO GIỜ TRÙNG.
 *
 * VÌ SAO PHẢI DÙNG GIAO DỊCH CÓ KHOÁ. Cách dễ nhất là đọc danh sách phiếu đang
 * có rồi lấy số lớn nhất cộng một. Cách đó sai ngay khi hai người cùng bấm lưu:
 * cả hai đọc được 51260007, cả hai ghi 51260008, và sổ chứng từ có hai phiếu
 * cùng số — thứ không sửa lại được vì giấy đã in ra rồi.
 *
 * Nên số chạy qua MỘT bộ đếm trong `runTransaction`: Firestore khoá tài liệu bộ
 * đếm, ai vào sau phải đọc lại và nhận số kế tiếp. `thuTuKeTiep()` bên
 * `soPhieu.ts` chỉ là phương án dự phòng khi bộ đếm chưa dựng.
 *
 * KHOÁ TÀI LIỆU = SỐ PHIẾU. Đây là lớp chặn thứ hai: dù bộ đếm có lệch (ai đó
 * sửa tay, hoặc phục hồi dữ liệu cũ) thì ghi đè lên một số đã tồn tại vẫn bị
 * chặn, và hàm nhảy sang số kế tiếp còn trống.
 *
 * CẤP SỐ SAU KHI CHỨNG TỪ ĐÃ LƯU XONG, không cấp trước. Cấp trước rồi lưu hỏng
 * thì sổ có một số trỏ vào chỗ trống — đúng cái "nhảy số" mà kiểm toán hỏi đầu
 * tiên. Cấp sau thì tệ nhất là chứng từ tạm thời chưa có số, và màn hình Sổ số
 * phiếu có nút cấp bù.
 */

import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  DAU_SO,
  MA_LOAI,
  canTroHuy,
  docSoPhieu,
  dungPhieuHuy,
  dungSoPhieu,
  maNgay,
  soPhieuHuy,
  type GhiSoPhieu,
  type LoaiPhieu,
} from "./soPhieu";

/** Collection giữ sổ số phiếu. Khoá tài liệu = số phiếu. */
export const KHO_SO_PHIEU = "so_phieu";
/** Collection giữ bộ đếm. Một tài liệu cho mỗi DÃY ĐẾM. */
export const KHO_BO_DEM = "bo_dem";

/**
 * Khoá tài liệu bộ đếm, ví dụ `sophieu-PX-260911`.
 *
 * Nhận thẳng khoá dãy đếm (`kyDem` của `docSoPhieu`) nên số kiểu cũ vẫn có bộ
 * đếm riêng của nó (`sophieu-51-26`) — bộ đếm cũ không bị đụng tới, và không
 * có số cũ nào bị cấp lại.
 */
export function khoaBoDem(kyDem: string): string {
  return `sophieu-${String(kyDem ?? "").replace("|", "-")}`;
}

/**
 * Tìm bao nhiêu số kế tiếp trước khi chịu thua.
 *
 * Chỉ chạm tới khi bộ đếm lệch so với sổ thật. Mười lượt là quá đủ; lệch hơn
 * mười số nghĩa là có chuyện khác nghiêm trọng hơn, và lúc đó dừng lại báo lỗi
 * tốt hơn là dò tiếp trong im lặng.
 */
const SO_LAN_DO = 10;

export interface YeuCauCapSo {
  loai: Exclude<LoaiPhieu, "HUY_NHAP" | "HUY_XUAT">;
  /** Ngày trên biên bản, `yyyy-MM-dd`. Quyết định luôn dãy ngày của số phiếu. */
  documentDate: string;
  /** `slipCode` với phiếu nhập, `referenceGroupId` với phiếu xuất. */
  nguon: string;
  /**
   * SỐ PHIẾU ĐÃ CÓ SẴN — dùng đúng số này thay vì cấp số mới.
   *
   * Phiếu nhập kho đã mang mã phiếu in trên giấy (`PN-260911-01`, xem
   * `slip.ts`), và sổ phải ghi ĐÚNG số ấy chứ không cấp thêm một số thứ hai.
   * Trước đây một tờ phiếu mang hai số khác nhau, người đối chiếu phải nhớ số
   * nào đi với số nào.
   *
   * Để trống thì cấp số mới qua bộ đếm — đó là đường của phiếu xuất, vì phiếu
   * xuất không có mã nào in sẵn ra giấy.
   */
  soPhieu?: string;
  donVi?: string;
  soDong: number;
  soLuong: number;
  createdBy: string;
}

/**
 * Cấp một số phiếu mới và ghi vào sổ.
 *
 * Ném lỗi nếu ngày chứng từ không đọc được — thà không có số còn hơn có một số
 * nằm nhầm dãy năm.
 */
export async function capSoPhieu(
  db: Firestore,
  yc: YeuCauCapSo,
): Promise<GhiSoPhieu> {
  const ngayMa = maNgay(yc.documentDate);
  if (!ngayMa) {
    throw new Error(
      `Ngày chứng từ "${yc.documentDate}" không đọc được, chưa cấp được số phiếu.`,
    );
  }
  const maLoai = yc.loai === "NHAP" ? MA_LOAI.NHAP : MA_LOAI.XUAT;
  const kyDem = `${maLoai}|${ngayMa}`;
  const refDem = doc(db, KHO_BO_DEM, khoaBoDem(kyDem));

  /*
   * PHIẾU NHẬP DÙNG ĐÚNG MÃ PHIẾU ĐÃ IN RA GIẤY, không cấp số thứ hai.
   *
   * Không đi qua bộ đếm: số đã nằm trên tờ phiếu rồi, việc còn lại chỉ là ghi
   * nó vào sổ. Khoá tài liệu = số phiếu nên ghi trùng vẫn bị chặn ở lớp dưới.
   */
  const soCoSan = String(yc.soPhieu ?? "").trim();

  return runTransaction(db, async (tx) => {
    let thuTu = 0;
    let so = "";
    // Đọc bộ đếm ở CẢ HAI đường: nhánh dùng mã có sẵn cũng cần biết số hiện
    // tại để không đẩy bộ đếm lùi lại (xem chỗ ghi bộ đếm ở cuối).
    const demHienTai = Math.max(1, Number((await tx.get(refDem)).data()?.tiep) || 1);

    if (soCoSan) {
      const daCo = await tx.get(doc(db, KHO_SO_PHIEU, soCoSan));
      if (daCo.exists()) {
        throw new Error(
          `Số phiếu ${soCoSan} đã có trong sổ. Có thể phiếu này vừa được ghi sổ rồi.`,
        );
      }
      so = soCoSan;
      thuTu = docSoPhieu(soCoSan)?.thuTu ?? 0;
    } else {
      const batDau = demHienTai;

      /*
       * ĐỌC HẾT RỒI MỚI GHI. Firestore bắt buộc như vậy trong một giao dịch,
       * nên phải dò trước cả loạt số ứng viên chứ không dò-ghi xen kẽ.
       */
      for (let i = 0; i < SO_LAN_DO; i++) {
        const ung = batDau + i;
        const soUng = dungSoPhieu(maLoai, ngayMa, ung);
        const daCo = await tx.get(doc(db, KHO_SO_PHIEU, soUng));
        if (!daCo.exists()) {
          thuTu = ung;
          so = soUng;
          break;
        }
      }
      if (!so) {
        throw new Error(
          `Bộ đếm số phiếu đang lệch: ${SO_LAN_DO} số kế tiếp từ ${dungSoPhieu(maLoai, ngayMa, batDau)} đều đã có trong sổ. Cần xem lại sổ số phiếu trước khi cấp tiếp.`,
        );
      }
    }

    const ghi: GhiSoPhieu = {
      id: so,
      soPhieu: so,
      loai: yc.loai,
      documentDate: yc.documentDate.slice(0, 10),
      enteredOn: new Date().toISOString(),
      nguon: yc.nguon,
      donVi: yc.donVi || "",
      soDong: Math.max(0, Math.trunc(yc.soDong) || 0),
      soLuong: Number(yc.soLuong) || 0,
      trangThai: "hieu_luc",
      createdBy: yc.createdBy,
    };

    tx.set(doc(db, KHO_SO_PHIEU, so), ghi);
    /*
     * BỘ ĐẾM CHỈ TIẾN, KHÔNG BAO GIỜ LÙI.
     *
     * Số do phiếu nhập mang sẵn không nhất thiết lớn hơn số đếm hiện tại —
     * ghi sổ bù cho một phiếu cũ là gặp ngay. Đặt thẳng `thuTu + 1` thì bộ đếm
     * tụt xuống và lần cấp sau trả về một số ĐÃ IN RA GIẤY.
     *
     * Vẫn nhích lên cả ở nhánh dùng mã có sẵn: nhờ vậy nếu về sau phải cấp bù
     * một phiếu không có mã, số cấp ra không đè lên mã đã dùng trong ngày.
     */
    tx.set(
      refDem,
      { kyDem, tiep: Math.max(demHienTai, thuTu + 1) },
      { merge: true },
    );
    return ghi;
  });
}

/**
 * Hủy một phiếu: sinh phiếu hủy ghi âm, và đánh dấu phiếu gốc đã hủy.
 *
 * Cả hai việc trong MỘT giao dịch. Tách ra hai lần ghi thì có lúc phiếu hủy đã
 * tồn tại mà phiếu gốc vẫn ghi "còn hiệu lực" — nhìn vào sổ không biết tin bên
 * nào.
 */
export async function huyPhieu(
  db: Firestore,
  soGoc: string,
  opt: { documentDate: string; lyDo?: string; createdBy: string },
): Promise<GhiSoPhieu> {
  const soHuy = soPhieuHuy(soGoc);
  if (!soHuy) {
    throw new Error(`Số phiếu "${soGoc}" không hủy được.`);
  }

  return runTransaction(db, async (tx) => {
    const refGoc = doc(db, KHO_SO_PHIEU, soGoc);
    const snapGoc = await tx.get(refGoc);
    if (!snapGoc.exists()) {
      throw new Error(`Không tìm thấy phiếu ${soGoc} trong sổ.`);
    }
    const goc = { ...(snapGoc.data() as GhiSoPhieu), id: snapGoc.id };

    /*
     * Kiểm tra lại NGAY TRONG giao dịch, không tin vào bản đã tải về màn hình:
     * giữa lúc mở hộp thoại và lúc bấm xác nhận, người khác có thể đã hủy rồi.
     */
    const canTro = canTroHuy(goc);
    if (canTro) throw new Error(canTro);

    const daCoHuy = await tx.get(doc(db, KHO_SO_PHIEU, soHuy));
    if (daCoHuy.exists()) {
      throw new Error(
        `Số phiếu hủy ${soHuy} đã có trong sổ. Có thể phiếu ${soGoc} vừa được người khác hủy.`,
      );
    }

    const ghi = dungPhieuHuy(goc, {
      documentDate: opt.documentDate,
      enteredOn: new Date().toISOString(),
      createdBy: opt.createdBy,
      lyDo: opt.lyDo,
    });
    if (!ghi) throw new Error(`Không dựng được phiếu hủy cho ${soGoc}.`);

    tx.set(doc(db, KHO_SO_PHIEU, soHuy), ghi);
    tx.update(refGoc, { trangThai: "da_huy", huyBoi: soHuy });
    return ghi;
  });
}

/**
 * Tài liệu bộ đếm này có thuộc CHIỀU XUẤT không.
 *
 * Dùng khi xoá toàn bộ giao dịch xuất: xoá phiếu mà để nguyên bộ đếm thì lần
 * nạp lại sau không đánh từ 01 mà chạy tiếp con số cũ, người dùng nhìn sổ
 * trống mà số phiếu bắt đầu từ giữa chừng thì không hiểu nổi.
 *
 * Nhận cả hai kiểu đánh số vì bộ đếm cũ vẫn còn nằm đó: kiểu đang dùng
 * (`sophieu-PX-260904`) và kiểu cũ theo đầu số (`sophieu-60-26`, `sophieu-61-26`
 * cho phiếu hủy).
 *
 * Dò theo TIỀN TỐ CHÍNH XÁC chứ không phải "có chứa": một bộ đếm bên nhập mà
 * lỡ mang chữ PX ở giữa tên thì không được dính vào đây.
 */
export function laBoDemChieuXuat(id: string): boolean {
  const s = String(id ?? "");
  return [MA_LOAI.XUAT, DAU_SO.XUAT, DAU_SO.HUY_XUAT].some((ma) =>
    s.startsWith(`sophieu-${ma}-`),
  );
}

/**
 * Dựng lại bộ đếm từ sổ thật.
 *
 * Dùng khi bộ đếm lệch — chẳng hạn sau khi phục hồi dữ liệu, hoặc lần đầu bật
 * tính năng trên một cơ sở dữ liệu đã có sẵn số phiếu. Đặt bộ đếm về `max + 1`
 * của dãy đó.
 *
 * KHÔNG BAO GIỜ ĐẶT LÙI. Đặt lùi là cấp lại một số đã in ra giấy.
 */
export async function chinhLaiBoDem(
  db: Firestore,
  ds: GhiSoPhieu[],
  kyDem: string,
): Promise<number> {
  let max = 0;
  ds.forEach((g) => {
    const p = docSoPhieu(g?.soPhieu);
    if (p && p.kyDem === kyDem && p.thuTu > max) max = p.thuTu;
  });
  const ref = doc(db, KHO_BO_DEM, khoaBoDem(kyDem));
  const hienTai = Number((await getDoc(ref)).data()?.tiep) || 0;
  const tiep = Math.max(hienTai, max + 1);
  await setDoc(ref, { kyDem, tiep }, { merge: true });
  return tiep;
}

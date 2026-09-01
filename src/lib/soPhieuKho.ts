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
  canTroHuy,
  docSoPhieu,
  dungPhieuHuy,
  dungSoPhieu,
  namHaiSo,
  soPhieuHuy,
  type GhiSoPhieu,
  type LoaiPhieu,
} from "./soPhieu";

/** Collection giữ sổ số phiếu. Khoá tài liệu = số phiếu. */
export const KHO_SO_PHIEU = "so_phieu";
/** Collection giữ bộ đếm. Một tài liệu cho mỗi (đầu số × năm). */
export const KHO_BO_DEM = "bo_dem";

/** Khoá tài liệu bộ đếm, ví dụ `sophieu-51-26`. */
export function khoaBoDem(dauSo: string, namHai: string): string {
  return `sophieu-${dauSo}-${namHai}`;
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
  /** Ngày trên biên bản, `yyyy-MM-dd`. Quyết định luôn dãy năm của số phiếu. */
  documentDate: string;
  /** `slipCode` với phiếu nhập, `referenceGroupId` với phiếu xuất. */
  nguon: string;
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
  const namHai = namHaiSo(yc.documentDate);
  if (!namHai) {
    throw new Error(
      `Ngày chứng từ "${yc.documentDate}" không đọc được, chưa cấp được số phiếu.`,
    );
  }
  const dauSo = yc.loai === "NHAP" ? DAU_SO.NHAP : DAU_SO.XUAT;
  const refDem = doc(db, KHO_BO_DEM, khoaBoDem(dauSo, namHai));

  return runTransaction(db, async (tx) => {
    const dem = await tx.get(refDem);
    const batDau = Math.max(1, Number(dem.data()?.tiep) || 1);

    /*
     * ĐỌC HẾT RỒI MỚI GHI. Firestore bắt buộc như vậy trong một giao dịch, nên
     * phải dò trước cả loạt số ứng viên chứ không dò-ghi xen kẽ.
     */
    let thuTu = 0;
    let so = "";
    for (let i = 0; i < SO_LAN_DO; i++) {
      const ung = batDau + i;
      const soUng = dungSoPhieu(dauSo, namHai, ung);
      const daCo = await tx.get(doc(db, KHO_SO_PHIEU, soUng));
      if (!daCo.exists()) {
        thuTu = ung;
        so = soUng;
        break;
      }
    }
    if (!so) {
      throw new Error(
        `Bộ đếm số phiếu đang lệch: ${SO_LAN_DO} số kế tiếp từ ${dungSoPhieu(dauSo, namHai, batDau)} đều đã có trong sổ. Cần xem lại sổ số phiếu trước khi cấp tiếp.`,
      );
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
    tx.set(refDem, { dauSo, namHai, tiep: thuTu + 1 }, { merge: true });
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
  dauSo: string,
  namHai: string,
): Promise<number> {
  let max = 0;
  ds.forEach((g) => {
    const p = docSoPhieu(g?.soPhieu);
    if (p && p.dauSo === dauSo && p.namHai === namHai && p.thuTu > max) {
      max = p.thuTu;
    }
  });
  const ref = doc(db, KHO_BO_DEM, khoaBoDem(dauSo, namHai));
  const hienTai = Number((await getDoc(ref)).data()?.tiep) || 0;
  const tiep = Math.max(hienTai, max + 1);
  await setDoc(ref, { dauSo, namHai, tiep }, { merge: true });
  return tiep;
}

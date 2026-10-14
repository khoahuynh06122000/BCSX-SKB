/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ẢNH CHỜ LƯU — tải lên rồi mà chưa gắn vào dữ liệu nào.
 *
 * Ảnh minh chứng lên Cloudinary NGAY lúc chọn (để xem trước, để AI quét).
 * Người dùng đóng khung không lưu, bấm gỡ một tấm, hay lưu Firestore hỏng —
 * thì tệp đã nằm trên Cloudinary mà không dòng dữ liệu nào trỏ tới: không vào
 * sổ ảnh, không hiện ở Thư viện, không ai xoá được vì không ai thấy.
 *
 * "Dữ liệu và ảnh đi một cụm" nên xử lý NGAY lúc đó, không đợi dọn sau:
 *   · tải lên xong → ghi vào danh sách chờ (lưu cả vào máy, phòng đóng tab);
 *   · lưu dữ liệu xong → gỡ khỏi danh sách;
 *   · huỷ / gỡ / lưu hỏng → gọi máy chủ xoá tệp.
 * Lần mở app sau, tấm nào còn trong danh sách thì xoá nốt.
 *
 * Người thường được xoá ảnh CỦA CHÍNH MÌNH vừa tải mà CHƯA GẮN vào đâu —
 * máy chủ tự kiểm cả ba điều (xem `lyDoKhongXoaAnhCho` và api/anh/xoa.ts).
 * Ảnh đã gắn vào dữ liệu vẫn chỉ admin xoá.
 */

/** Ảnh tải lên quá lâu thì không coi là "vừa tải" nữa — máy chủ từ chối xoá. */
export const HAN_ANH_CHO_MS = 24 * 60 * 60 * 1000;

/** Tên khoá ngữ cảnh gắn lên ảnh lúc tải: uid người tải. */
export const KHOA_NGUOI_TAI = "nguoi";

/**
 * Máy chủ có được xoá tấm ảnh chờ này không. Trả về lý do TỪ CHỐI, rỗng là
 * được xoá. Thuần phép tính để chạy thử được; phần đi hỏi Cloudinary và
 * Firestore nằm ở api/anh/xoa.ts.
 */
export function lyDoKhongXoaAnhCho(x: {
  nguoiGoi: string;
  /** uid ghi trong ngữ cảnh ảnh lúc tải. Rỗng = ảnh không mang dấu người tải. */
  nguoiTai: string;
  /** `created_at` của Cloudinary (ISO). */
  taoLuc: string;
  bayGio: number;
  /** Có dòng dữ liệu / sổ ảnh nào đang trỏ tới tấm này không. */
  dangDung: boolean;
}): string {
  if (!x.nguoiGoi) return "không rõ người gọi";
  if (!x.nguoiTai) return "ảnh không mang dấu người tải";
  if (x.nguoiTai !== x.nguoiGoi) return "ảnh do người khác tải";
  const t = Date.parse(x.taoLuc);
  if (!Number.isFinite(t)) return "không rõ lúc tải";
  if (x.bayGio - t > HAN_ANH_CHO_MS) return "ảnh tải đã quá 24 giờ";
  if (x.dangDung) return "ảnh đã gắn vào dữ liệu";
  return "";
}

/* -------------------------------------------------------------------------
 * DANH SÁCH CHỜ TRÊN MÁY — chỉ chạy trong trình duyệt.
 * ---------------------------------------------------------------------- */

const KHOA_LUU = "bcsx-anh-cho";

function doc(): string[] {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(KHOA_LUU) || "[]");
    return Array.isArray(v) ? v.filter((u) => typeof u === "string") : [];
  } catch {
    return [];
  }
}

function ghi(ds: string[]) {
  try {
    globalThis.localStorage?.setItem(KHOA_LUU, JSON.stringify(ds));
  } catch {
    /* chế độ ẩn danh / bị chặn: vẫn chạy, chỉ mất phần phòng đóng tab */
  }
}

let cho: string[] | null = null;
const ds = () => (cho ??= doc());

export function themAnhCho(urls: readonly string[]) {
  cho = [...new Set([...ds(), ...urls.filter(Boolean)])];
  ghi(cho);
}

/** Đã gắn vào dữ liệu — không còn là ảnh chờ. */
export function daLuuAnhCho(urls: readonly string[]) {
  const bo = new Set(urls);
  cho = ds().filter((u) => !bo.has(u));
  ghi(cho);
}

export function anhChoConLai(): string[] {
  return [...ds()];
}

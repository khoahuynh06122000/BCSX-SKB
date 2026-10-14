/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SỨC KHỎE NGUỒN DỮ LIỆU — máy chủ có chuyện thì app nói NGAY, cho mọi người.
 *
 * Trước đây mỗi nút tự `alert` lỗi của riêng nó. Hỏng ở tầng máy chủ (hết hạn
 * mức ngày, mất mạng, phiên đăng nhập hết hạn, Cloudinary từ chối) thì người
 * dùng chỉ biết khi bấm trúng một nút — còn lúc đang xem, số liệu đứng yên mà
 * trông y như số thật. Nguy nhất là lệnh GHI treo: Firestore không báo lỗi,
 * nút cứ quay, người dùng đóng tab tưởng đã lưu.
 *
 * Tệp này là MỘT sổ ghi tình trạng, ba nguồn báo vào:
 *   · `firestoreDem.ts` — mọi lệnh ghi đi qua đó: ghi chờ quá lâu, ghi hỏng;
 *   · `cloudinary.ts`   — tải ảnh hỏng;
 *   · trình duyệt       — sự kiện mất / có mạng.
 * Dải cảnh báo `DaiSucKhoe` đọc sổ này. Hết lỗi thì dòng tự biến mất.
 *
 * Lỗi ĐỌC của từng bảng vẫn do App tự ghi (nó biết tên bảng); tệp này lo
 * phần App không thấy được.
 */

export type MucSucKhoe = "do" | "vang";

export interface VanDe {
  khoa: string;
  muc: MucSucKhoe;
  tieuDe: string;
  /** Việc người dùng nên làm — một câu, không thuật ngữ. */
  viec: string;
  /** Mã lỗi gốc, để chụp màn hình gửi lên là biết ngay. */
  ma?: string;
  /** Có phải tải lại trang mới hết không. */
  canTaiLai?: boolean;
  luc: number;
}

/**
 * Mã lỗi Firestore → câu người dùng hiểu. Chỉ những mã là CHUYỆN CỦA MÁY CHỦ;
 * lỗi do thao tác (thiếu quyền một việc cụ thể, dữ liệu sai) thì nút tự báo.
 */
export function phanLoaiLoiMayChu(
  err: unknown,
): Omit<VanDe, "khoa" | "luc"> | null {
  const e = err as { code?: string; message?: string } | null;
  const ma = String(e?.code ?? "").replace(/^firestore\//, "");
  const tin = String(e?.message ?? "");
  if (ma === "resource-exhausted" || /quota/i.test(tin)) {
    return {
      muc: "do",
      ma: "resource-exhausted",
      tieuDe: "Firebase đã hết hạn mức hôm nay",
      viec:
        "Dữ liệu mới không lưu được và số trên màn hình có thể đã cũ. Hạn mức " +
        "đặt lại lúc 14h–15h chiều giờ Việt Nam. Đừng nhập thêm cho tới lúc đó; " +
        "báo chủ sở hữu.",
      canTaiLai: true,
    };
  }
  if (ma === "unauthenticated") {
    return {
      muc: "do",
      ma,
      tieuDe: "Phiên đăng nhập đã hết hạn",
      viec: "Đăng xuất rồi đăng nhập lại. Những gì vừa bấm lưu có thể chưa vào.",
    };
  }
  if (ma === "unavailable" || ma === "deadline-exceeded") {
    return {
      muc: "do",
      ma,
      tieuDe: "Không kết nối được máy chủ dữ liệu",
      viec:
        "Kiểm tra mạng. Có mạng lại thì app tự nối; lệnh vừa bấm lưu mà báo lỗi " +
        "thì làm lại.",
    };
  }
  if (ma === "internal" || ma === "data-loss" || ma === "unknown") {
    return {
      muc: "do",
      ma,
      tieuDe: "Máy chủ dữ liệu báo lỗi nội bộ",
      viec: "Tải lại trang rồi làm lại. Lặp lại nhiều lần thì báo chủ sở hữu.",
      canTaiLai: true,
    };
  }
  return null;
}

type NguoiNghe = () => void;

export function taoSoSucKhoe(tuyChon: { choGhiMs?: number } = {}) {
  const CHO_GHI_MS = tuyChon.choGhiMs ?? 20_000;
  let vanDe: VanDe[] = [];
  const nghe = new Set<NguoiNghe>();
  const bao = () => nghe.forEach((f) => f());

  const dat = (v: Omit<VanDe, "luc">) => {
    const cu = vanDe.find((x) => x.khoa === v.khoa);
    if (cu && cu.tieuDe === v.tieuDe && cu.ma === v.ma) return;
    vanDe = [...vanDe.filter((x) => x.khoa !== v.khoa), { ...v, luc: Date.now() }];
    bao();
  };
  const go = (khoa: string) => {
    if (!vanDe.some((x) => x.khoa === khoa)) return;
    vanDe = vanDe.filter((x) => x.khoa !== khoa);
    bao();
  };

  /** Số lệnh ghi đang chờ quá hạn — nhiều lệnh treo chỉ hiện MỘT dòng. */
  let ghiTreo = 0;

  /**
   * Bọc một lệnh ghi. Không đổi kết quả hay lỗi của nó — chỉ quan sát:
   *   · quá `CHO_GHI_MS` chưa xong → dòng vàng "chưa lưu được lên máy chủ";
   *   · xong → gỡ dòng đó, và gỡ luôn lỗi ghi cũ (máy chủ đã nhận lại);
   *   · hỏng vì máy chủ → dòng đỏ, giữ tới lần ghi thành công kế tiếp.
   */
  async function theoDoiGhi<T>(viec: Promise<T>): Promise<T> {
    let daTreo = false;
    const hen = setTimeout(() => {
      daTreo = true;
      ghiTreo += 1;
      dat({
        khoa: "ghi-treo",
        muc: "vang",
        tieuDe: "Dữ liệu vừa lưu CHƯA lên tới máy chủ",
        viec:
          "Đừng đóng trang. Đợi dòng này tự tắt là đã lưu xong; quá vài phút " +
          "thì kiểm tra mạng.",
      });
    }, CHO_GHI_MS);
    const xongTreo = () => {
      clearTimeout(hen);
      if (daTreo) {
        ghiTreo -= 1;
        if (ghiTreo <= 0) {
          ghiTreo = 0;
          go("ghi-treo");
        }
      }
    };
    try {
      const kq = await viec;
      xongTreo();
      go("ghi-loi");
      return kq;
    } catch (e) {
      xongTreo();
      const p = phanLoaiLoiMayChu(e);
      if (p) dat({ khoa: "ghi-loi", ...p });
      throw e;
    }
  }

  /** Lỗi đọc mức máy chủ (từ listener) — tách khỏi lỗi phân quyền của App. */
  function baoLoiDoc(e: unknown) {
    const p = phanLoaiLoiMayChu(e);
    if (p) dat({ khoa: "doc-loi", ...p, canTaiLai: true });
  }

  function baoAnh(ok: boolean, chiTiet = "") {
    if (ok) return go("anh-loi");
    dat({
      khoa: "anh-loi",
      muc: "do",
      tieuDe: "Không tải được ảnh lên kho ảnh (Cloudinary)",
      viec:
        "Ảnh vừa chọn chưa được lưu. Kiểm tra mạng rồi chọn lại ảnh." +
        (chiTiet ? ` (${chiTiet})` : ""),
    });
  }

  function baoMang(coMang: boolean) {
    if (coMang) return go("mat-mang");
    dat({
      khoa: "mat-mang",
      muc: "do",
      tieuDe: "Máy đang mất mạng",
      viec:
        "Số trên màn hình là số lúc còn mạng. Đừng nhập liệu cho tới khi dòng " +
        "này tự tắt.",
    });
  }

  return {
    theoDoiGhi,
    baoLoiDoc,
    baoAnh,
    baoMang,
    dat,
    go,
    layVanDe: () => vanDe,
    dangKy(f: NguoiNghe) {
      nghe.add(f);
      return () => {
        nghe.delete(f);
      };
    },
  };
}

export type SoSucKhoe = ReturnType<typeof taoSoSucKhoe>;

/** Sổ dùng chung của app. */
export const SUC_KHOE = taoSoSucKhoe();

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => SUC_KHOE.baoMang(false));
  window.addEventListener("online", () => SUC_KHOE.baoMang(true));
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    SUC_KHOE.baoMang(false);
  }
}

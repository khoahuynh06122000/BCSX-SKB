/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DỌN ẢNH BASE64 CÒN KẸT TRONG FIRESTORE
 *
 * Bản đầu của app nén ảnh minh chứng thành chuỗi base64 rồi nhét thẳng vào
 * tài liệu Firestore. Bản sau đã đổi sang Cloudinary và chỉ lưu đường dẫn —
 * nhưng CHỈ ÁP DỤNG CHO ẢNH MỚI. Những tài liệu tạo từ thời trước vẫn đang
 * mang nguyên khối base64 trong mình, không có gì tự dọn chúng đi.
 *
 * Vì sao phải dọn:
 *
 *   · Một tài liệu Firestore tối đa 1 MiB. Ảnh điện thoại nén xuống vài trăm
 *     KB, thêm hai ba tấm là chạm trần — và lần ghi làm nó vượt trần sẽ hỏng,
 *     đúng lúc người dùng đang lưu một giao dịch thật.
 *   · Gói Spark chỉ có 1 GiB. Ảnh chiếm chỗ của số liệu, mà số liệu mới là
 *     thứ Firestore sinh ra để giữ.
 *   · Mở Firebase Console lên là thấy nguyên bãi ký tự base64 giữa các trường
 *     nghiệp vụ, không đọc nổi tài liệu.
 *
 * Cách nhận biết: chuỗi bắt đầu bằng `data:image/`. Đường dẫn Cloudinary thì
 * bắt đầu bằng `http`, nên hai loại không thể lẫn nhau.
 *
 * Ở đây CỐ Ý chỉ có phần nhận biết và đo đếm, không có phần ghi. Việc tải lên
 * Cloudinary rồi ghi đè thuộc về nơi gọi — tách ra thì phần này chạy test
 * được mà không cần mạng.
 */

import type { ImportSlip, Transaction } from "../types";

/** Chuỗi này có phải một tấm ảnh nhúng thẳng vào tài liệu không. */
export function laAnhBase64(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("data:image/");
}

/**
 * Ước lượng số byte một chuỗi base64 chiếm trong Firestore.
 *
 * Firestore tính chuỗi theo UTF-8 cộng một byte kết thúc. Base64 toàn ký tự
 * ASCII nên mỗi ký tự đúng một byte — độ dài chuỗi chính là số byte.
 */
export function soByte(s: string): number {
  return s.length + 1;
}

/** Một chỗ còn ảnh base64, đủ thông tin để ghi đè lại đúng chỗ đó. */
export interface ChoConAnh {
  loai: "transaction" | "slip";
  id: string;
  /** Tên trường trong tài liệu. */
  truong: "evidencePhotoUrl" | "evidencePhotoUrls" | "signedPhotoUrls";
  /** Vị trí trong mảng; trường không phải mảng thì để -1. */
  chiSo: number;
  base64: string;
  byte: number;
  /** Hiện lên màn hình cho người dùng biết đang dọn cái gì. */
  moTa: string;
}

export interface KetQuaDo {
  cho: ChoConAnh[];
  tongByte: number;
  soTaiLieu: number;
}

/**
 * Dò toàn bộ giao dịch và phiếu nhập, liệt kê từng chỗ còn ảnh base64.
 *
 * Trả về TỪNG CHỖ chứ không phải từng tài liệu: một giao dịch có thể mang ba
 * tấm ảnh trong mảng, mỗi tấm phải tải lên riêng và ghi lại đúng vị trí cũ
 * trong mảng — đảo thứ tự là ảnh của phiếu này nhảy sang phiếu kia.
 */
export function doAnhCu(
  transactions: Transaction[],
  slips: ImportSlip[],
): KetQuaDo {
  const cho: ChoConAnh[] = [];
  const taiLieu = new Set<string>();

  transactions.forEach((t) => {
    const nhan = `${t.productName || "(không rõ)"} · ${String(t.date).slice(0, 10)}`;

    if (laAnhBase64(t.evidencePhotoUrl)) {
      cho.push({
        loai: "transaction",
        id: t.id,
        truong: "evidencePhotoUrl",
        chiSo: -1,
        base64: t.evidencePhotoUrl,
        byte: soByte(t.evidencePhotoUrl),
        moTa: nhan,
      });
      taiLieu.add("t:" + t.id);
    }

    (t.evidencePhotoUrls || []).forEach((v, i) => {
      if (!laAnhBase64(v)) return;
      cho.push({
        loai: "transaction",
        id: t.id,
        truong: "evidencePhotoUrls",
        chiSo: i,
        base64: v,
        byte: soByte(v),
        moTa: `${nhan} · ảnh ${i + 1}`,
      });
      taiLieu.add("t:" + t.id);
    });
  });

  slips.forEach((s) => {
    (s.signedPhotoUrls || []).forEach((v, i) => {
      if (!laAnhBase64(v)) return;
      cho.push({
        loai: "slip",
        id: s.id || s.code,
        truong: "signedPhotoUrls",
        chiSo: i,
        base64: v,
        byte: soByte(v),
        moTa: `Phiếu ${s.code} · ảnh ${i + 1}`,
      });
      taiLieu.add("s:" + (s.id || s.code));
    });
  });

  return {
    cho,
    tongByte: cho.reduce((a, b) => a + b.byte, 0),
    soTaiLieu: taiLieu.size,
  };
}

/**
 * Thay một phần tử trong mảng ảnh, giữ nguyên mọi phần tử khác.
 *
 * Không dùng `filter` rồi `push`: thứ tự ảnh trong phiếu là thứ tự người dùng
 * đã tải lên và họ đang nhìn theo thứ tự đó.
 */
export function thayTrongMang(
  mang: string[] | undefined,
  chiSo: number,
  giaTriMoi: string,
): string[] {
  const ra = [...(mang || [])];
  if (chiSo >= 0 && chiSo < ra.length) ra[chiSo] = giaTriMoi;
  return ra;
}

/** `1234567` → `1,2 MB`. Để hiện dung lượng sẽ giải phóng. */
export function doDungLuong(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1)} MB`;
}

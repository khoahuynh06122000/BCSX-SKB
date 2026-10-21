/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TẢI NHIỀU ẢNH MỘT LẦN, GÓI VÀO MỘT TỆP ZIP
 *
 * Thư viện ảnh có hàng trăm tấm. Bấm từng tấm rồi bấm tải là không xuể, mà tải
 * rời từng tệp cũng không xong: trình duyệt chặn bớt khi một trang xin tải
 * nhiều tệp liên tiếp, và Windows thì rải hàng trăm tệp lẫn vào thư mục Tải về.
 *
 * VÌ SAO PHẢI TỰ VIẾT ZIP. Có thể thêm một thư viện nén, nhưng máy ở công ty
 * chặn tải gói từ mạng ngoài nên thêm phụ thuộc là một rủi ro thật. May là ta
 * không cần nén: ảnh JPEG/PNG đã nén sẵn rồi, nén lại chỉ tốn thời gian mà
 * không nhỏ đi. Nên chỉ cần định dạng ZIP kiểu "xếp nguyên" (store) — đủ đơn
 * giản để viết tay trong trăm dòng, và mở được bằng mọi công cụ.
 *
 * VÌ SAO KHÔNG DÙNG `<a download>`. Ảnh nằm trên Cloudinary, khác tên miền với
 * app. Với liên kết chéo tên miền, trình duyệt BỎ QUA thuộc tính `download` và
 * chỉ mở ảnh ra — đó là lý do bấm tải ở app hiện ra ảnh chứ không tải về. Muốn
 * tải thật thì phải `fetch` lấy dữ liệu rồi tự dựng tệp.
 */

/** Bảng tra CRC-32, dựng một lần rồi dùng lại. */
const BANG_CRC = (() => {
  const b = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    b[i] = c >>> 0;
  }
  return b;
})();

/** CRC-32 theo chuẩn ZIP. */
export function crc32(du: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < du.length; i++) c = BANG_CRC[(c ^ du[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Bỏ dấu tiếng Việt và mọi ký tự Windows không cho đặt tên tệp.
 *
 * Tên trong ZIP có cờ UTF-8 nên về lý thuyết giữ dấu được, nhưng File Explorer
 * và mấy công cụ giải nén cũ trên Windows vẫn hay hiện thành ký tự lạ. Bỏ dấu
 * thì chắc chắn đọc được ở mọi nơi.
 */
export function tenAnToan(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^0-9A-Za-z._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Đuôi tệp suy từ đường dẫn ảnh; không đoán ra thì coi là .jpg. */
export function duoiTep(url: string): string {
  const duong = String(url ?? "").split("?")[0].split("#")[0];
  const m = duong.match(/\.(png|jpe?g|webp|gif|heic|bmp)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

export interface TepZip {
  /** Tên bên trong tệp nén. Phải là duy nhất. */
  ten: string;
  duLieu: Uint8Array;
}

/** Kích thước tối đa một tệp ZIP thường (4 GB). Quá mức này cần ZIP64. */
export const TRAN_ZIP = 0xffffffff;

/**
 * Gói các tệp thành một ZIP kiểu "xếp nguyên", không nén.
 *
 * Ném lỗi nếu vượt 4 GB: định dạng ZIP thường ghi kích thước bằng 4 byte, quá
 * mức ấy phải chuyển sang ZIP64. Thà báo lỗi rõ ràng còn hơn tạo ra một tệp
 * hỏng mà mãi sau mới phát hiện.
 */
export function taoZip(tep: TepZip[]): Blob {
  const bo = new TextEncoder();
  const cuc: BlobPart[] = [];
  const muc: {
    ten: Uint8Array;
    crc: number;
    co: number;
    viTri: number;
  }[] = [];
  let viTri = 0;

  const so32 = (v: number) => {
    const a = new Uint8Array(4);
    new DataView(a.buffer).setUint32(0, v >>> 0, true);
    return a;
  };
  const so16 = (v: number) => {
    const a = new Uint8Array(2);
    new DataView(a.buffer).setUint16(0, v & 0xffff, true);
    return a;
  };

  for (const t of tep) {
    const ten = bo.encode(t.ten);
    const crc = crc32(t.duLieu);
    const co = t.duLieu.length;
    if (viTri + co > TRAN_ZIP) {
      throw new Error("Bộ ảnh vượt quá 4 GB, không gói vào một tệp ZIP được.");
    }
    // Đầu mục tệp cục bộ. Cờ 0x0800 báo tên tệp mã hoá UTF-8.
    cuc.push(
      so32(0x04034b50),
      so16(20),
      so16(0x0800),
      so16(0), // không nén
      so16(0), // giờ sửa — để 0, không ai dùng tới
      so16(0), // ngày sửa
      so32(crc),
      so32(co),
      so32(co),
      so16(ten.length),
      so16(0),
      ten,
      t.duLieu,
    );
    muc.push({ ten, crc, co, viTri });
    viTri += 30 + ten.length + co;
  }

  const dauMuc = viTri;
  for (const m of muc) {
    cuc.push(
      so32(0x02014b50),
      so16(20),
      so16(20),
      so16(0x0800),
      so16(0),
      so16(0),
      so16(0),
      so32(m.crc),
      so32(m.co),
      so32(m.co),
      so16(m.ten.length),
      so16(0), // extra
      so16(0), // ghi chú
      so16(0), // đĩa bắt đầu
      so16(0), // thuộc tính trong
      so32(0), // thuộc tính ngoài
      so32(m.viTri),
      m.ten,
    );
    viTri += 46 + m.ten.length;
  }

  cuc.push(
    so32(0x06054b50),
    so16(0),
    so16(0),
    so16(muc.length),
    so16(muc.length),
    so32(viTri - dauMuc),
    so32(dauMuc),
    so16(0),
  );
  return new Blob(cuc, { type: "application/zip" });
}

/**
 * TÊN TỆP ẢNH KHI TẢI VỀ: `ngày giao-điểm nhận-đối tác` (Khoa chốt 21/10/2026).
 *
 *   BNC · 1901, giao 16/10/2026          → `16.10.26-1901-BNC`
 *   OHL, điểm nhận Oakwood Hạ Long       → `16.10.26-Oakwood-Ha-Long-OHL`
 *   FV, không ghi điểm nhận riêng        → `16.10.26-FV`
 *   Phiếu nhập PN-261016-01              → `16.10.26-PN-261016-01-<đơn vị>`
 *
 * Đơn vị dạng "BNC · 1901" tách ở dấu "·": trước là đối tác, sau là điểm nhận.
 * Tên bỏ dấu tiếng Việt để mở được trên mọi máy (xem `tenAnToan`).
 */
export function tenGocAnh(anh: {
  date: string;
  donVi?: string;
  diemNhan?: string;
  tieuDe?: string;
  id?: string;
}): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(anh.date ?? ""));
  const ngay = m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : "khong-ngay";
  const [doiTac, ...sau] = String(anh.donVi ?? "").split("·").map((x) => x.trim());
  // Ảnh phiếu nhập: điểm nhận là mã phiếu, không có "·" trong tên đơn vị.
  const maPhieu = String(anh.id ?? "").startsWith("slip-")
    ? String(anh.tieuDe ?? "").replace(/^Phiếu\s*/, "")
    : "";
  const diem = sau.join(" ") || String(anh.diemNhan ?? "").trim() || maPhieu;
  return (
    [ngay, diem, doiTac]
      .map((x) => tenAnToan(x))
      .filter(Boolean)
      .join("-") || "anh"
  );
}

/**
 * Tên cho CẢ BỘ ảnh sẽ nén, theo đúng thứ tự đang xem. Tên trùng (một đơn
 * nhiều tờ, hay một điểm nhận hai chuyến trong ngày) thì thêm `-2`, `-3`… —
 * trùng tên trong ZIP là công cụ giải nén nuốt mất một tấm.
 */
export function tenTepTaiVe(
  ds: { date: string; donVi?: string; diemNhan?: string; tieuDe?: string; id?: string; url: string }[],
): string[] {
  const goc = ds.map((a) => tenGocAnh(a));
  const tong = new Map<string, number>();
  goc.forEach((g) => tong.set(g, (tong.get(g) || 0) + 1));
  const dem = new Map<string, number>();
  return ds.map((a, i) => {
    const g = goc[i];
    const n = (dem.get(g) || 0) + 1;
    dem.set(g, n);
    const ten = (tong.get(g) || 0) > 1 && n > 1 ? `${g}-${n}` : g;
    return `${ten}.${duoiTep(a.url)}`;
  });
}

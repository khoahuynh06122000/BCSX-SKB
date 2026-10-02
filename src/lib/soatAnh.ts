/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SOÁT ẢNH — HỎI CHO RA MÃ LỖI THẬT.
 *
 * Bản soát cũ tải thử bằng thẻ `<img>`. Thẻ ảnh chỉ biết nói "tôi tải không
 * được"; nó KHÔNG cho biết máy chủ trả về gì. Mà ba chuyện hoàn toàn khác
 * nhau lại cho ra đúng một tín hiệu ấy:
 *
 *     404  ảnh đã bị xoá khỏi máy chủ — phải đi tìm lại tờ biên bản
 *     429  bị chặn tạm vì hỏi quá nhiều — đợi một nhịp là ra, không mất gì
 *     403  tài khoản hết hạn mức tháng — phải xử lý ở tài khoản, không ở app
 *
 * Không phân biệt được ba thứ đó thì mọi câu chữ hiện lên màn hình đều là
 * phỏng đoán, và người dùng hoặc hoảng vì tưởng mất hết, hoặc quen mắt rồi bỏ
 * qua cả lần mất thật.
 *
 * Nay soát bằng `fetch`, đọc `res.status`. Hỏi trên bản THU NHỎ — đúng đường
 * dẫn mà lưới đang dùng, nên đo đúng cái người dùng gặp, lại tốn ít băng
 * thông hơn tải nguyên tấm.
 */

/** Kết quả hỏi thử một tấm. */
export interface KetQuaMotAnh {
  id: string;
  url: string;
  /** ISO. Để gom theo tháng. */
  date: string;
  donVi: string;
  /**
   * Mã trạng thái máy chủ trả về. `0` nghĩa là không hỏi tới nơi được —
   * mạng đứt, hoặc trình duyệt chặn vì thiếu quyền đọc chéo tên miền.
   */
  ma: number;
}

/** Nhóm nguyên nhân — mỗi nhóm cần một cách xử lý khác nhau. */
export type NhomLoiAnh =
  | "duoc"
  | "mat"
  | "chan-tam"
  | "het-han-muc"
  | "may-chu-loi"
  | "khong-hoi-duoc"
  | "khac";

/**
 * Xếp một mã trạng thái vào nhóm.
 *
 * 420 nằm riêng chứ không gộp vào 4xx linh tinh: Cloudinary dùng đúng mã này
 * cho "tài khoản vượt hạn mức", và đó là thứ duy nhất trong danh sách mà sửa
 * code không giúp được gì.
 */
export function nhomCuaMa(ma: number): NhomLoiAnh {
  const m = Math.trunc(Number(ma) || 0);
  if (m >= 200 && m < 300) return "duoc";
  if (m === 0) return "khong-hoi-duoc";
  if (m === 404 || m === 410) return "mat";
  if (m === 429) return "chan-tam";
  if (m === 403 || m === 420) return "het-han-muc";
  if (m >= 500) return "may-chu-loi";
  return "khac";
}

/** Câu chữ cho một nhóm, nói đúng việc phải làm tiếp. */
export function tenNhomLoi(n: NhomLoiAnh): string {
  switch (n) {
    case "duoc":
      return "Tải được";
    case "mat":
      return "Ảnh không còn trên máy chủ (404)";
    case "chan-tam":
      return "Bị chặn tạm vì hỏi dồn (429)";
    case "het-han-muc":
      return "Tài khoản ảnh từ chối — hết hạn mức hoặc bị khoá (403/420)";
    case "may-chu-loi":
      return "Máy chủ ảnh đang lỗi (5xx)";
    case "khong-hoi-duoc":
      return "Không hỏi tới máy chủ được — mạng đứt hoặc bị chặn đọc chéo";
    default:
      return "Mã lạ";
  }
}

/** Một dòng đếm trong bảng tổng kết. */
export interface DongDem {
  ten: string;
  tong: number;
  hong: number;
}

export interface TomTatSoatAnh {
  tong: number;
  hong: number;
  /** Đếm theo nhóm nguyên nhân — bảng quan trọng nhất. */
  theoNhom: DongDem[];
  theoThang: DongDem[];
  theoDonVi: DongDem[];
  /** Đường dẫn của những tấm 404, để đi tìm lại tờ biên bản. */
  dsMat: string[];
}

function dem(
  ds: KetQuaMotAnh[],
  khoa: (k: KetQuaMotAnh) => string,
  xepTheoTen = false,
): DongDem[] {
  const m = new Map<string, DongDem>();
  ds.forEach((k) => {
    const ten = khoa(k) || "(không rõ)";
    const o = m.get(ten) ?? { ten, tong: 0, hong: 0 };
    o.tong += 1;
    if (nhomCuaMa(k.ma) !== "duoc") o.hong += 1;
    m.set(ten, o);
  });
  const ra = Array.from(m.values());
  // Theo tháng thì xếp theo tên (tức theo thời gian); còn lại xếp hỏng nhiều
  // lên trước, vì người đọc đang đi tìm chỗ hỏng.
  return xepTheoTen
    ? ra.sort((a, b) => a.ten.localeCompare(b.ten))
    : ra.sort((a, b) => b.hong - a.hong || b.tong - a.tong);
}

export function tomTatSoatAnh(ds: KetQuaMotAnh[]): TomTatSoatAnh {
  const hong = ds.filter((k) => nhomCuaMa(k.ma) !== "duoc");
  return {
    tong: ds.length,
    hong: hong.length,
    theoNhom: dem(ds, (k) => tenNhomLoi(nhomCuaMa(k.ma))),
    theoThang: dem(ds, (k) => String(k.date ?? "").slice(0, 7), true),
    theoDonVi: dem(ds, (k) => k.donVi),
    dsMat: hong.filter((k) => nhomCuaMa(k.ma) === "mat").map((k) => k.url),
  };
}

/**
 * MỘT CÂU NÓI THẲNG PHẢI LÀM GÌ.
 *
 * Ba bảng số ở dưới là để gửi cho người viết code. Người dùng cần đúng một
 * câu, và câu ấy phải xuất phát từ nhóm nguyên nhân ĐÔNG NHẤT — chứ không
 * phải từ con số tổng, vì tổng thì gộp cả ba loại lại thành một đống.
 */
export function nhanDinhSoatAnh(t: TomTatSoatAnh): string {
  if (t.tong === 0) return "Không có tấm nào để soát.";
  if (t.hong === 0) return `Cả ${t.tong} tấm đều tải được. Không mất tấm nào.`;

  const nhom = t.theoNhom
    .filter((d) => d.ten !== tenNhomLoi("duoc") && d.hong > 0)
    .sort((a, b) => b.hong - a.hong)[0];
  const dau = `${t.hong}/${t.tong} tấm không tải được. `;

  switch (nhom?.ten) {
    case tenNhomLoi("mat"):
      return `${dau}Phần lớn là ảnh ĐÃ BỊ XOÁ khỏi máy chủ (404) — sửa app không lấy lại được, phải tìm lại tờ biên bản giấy. Danh sách đường dẫn ở dưới.`;
    case tenNhomLoi("chan-tam"):
      return `${dau}Phần lớn là BỊ CHẶN TẠM (429) vì hỏi dồn quá nhiều cùng lúc. Ảnh còn nguyên — soát lại sau vài phút là ra.`;
    case tenNhomLoi("het-han-muc"):
      return `${dau}Máy chủ ảnh TỪ CHỐI (403/420) — thường là tài khoản Cloudinary hết hạn mức tháng hoặc bị khoá. Ảnh còn nguyên, phải xử lý ở trang quản trị Cloudinary chứ không ở app.`;
    case tenNhomLoi("may-chu-loi"):
      return `${dau}Máy chủ ảnh đang LỖI (5xx). Ảnh còn nguyên, đợi rồi soát lại.`;
    case tenNhomLoi("khong-hoi-duoc"):
      return `${dau}Không hỏi tới máy chủ được — mạng đứt giữa chừng, hoặc máy chủ ảnh không cho đọc chéo tên miền. Chưa kết luận được gì về ảnh.`;
    default:
      return `${dau}Xem bảng theo nhóm nguyên nhân ở dưới.`;
  }
}

/** Bản chép tay gọn, để bấm sao chép rồi gửi đi. */
export function baoCaoSoatAnh(t: TomTatSoatAnh): string {
  const bang = (ten: string, ds: DongDem[]) =>
    [`## ${ten}`, ...ds.map((d) => `${d.ten}: hỏng ${d.hong}/${d.tong}`)].join(
      "\n",
    );
  const phan = [
    `SOÁT ẢNH — ${t.hong}/${t.tong} tấm không tải được`,
    nhanDinhSoatAnh(t),
    bang("Theo nhóm nguyên nhân", t.theoNhom),
    bang("Theo tháng", t.theoThang),
    bang("Theo đơn vị", t.theoDonVi),
  ];
  if (t.dsMat.length) {
    phan.push(
      ["## Đường dẫn của ảnh đã mất (404)", ...t.dsMat].join("\n"),
    );
  }
  return phan.join("\n\n");
}

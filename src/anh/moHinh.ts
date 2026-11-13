/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HỆ THỐNG ẢNH CHỨNG TỪ — MÔ HÌNH (dựng lại 13/11/2026).
 *
 * ẢNH GẮN VÀO CHỨNG TỪ, KHÔNG GẮN VÀO TỪNG DÒNG GIAO DỊCH.
 *
 * Bản cũ chép đường dẫn ảnh vào từng dòng giao dịch (`evidencePhotoUrls`) và
 * từng phiếu (`signedPhotoUrls`). Một tờ biên bản ký cho cả chuyến nên bị chép
 * vào năm, mười dòng; lượt ghi nào chạm tới một dòng — nạp lại tệp, xác nhận
 * đơn, sửa dòng — đều có thể làm rơi ảnh của dòng đó. Đọc thật ngày
 * 13/11/2026: 295 tệp còn nguyên trên Cloudinary, nhưng 5 tấm đã rời khỏi
 * chuyến của nó và 24 chuyến có các dòng mang ảnh lệch nhau.
 *
 * Nay mỗi tấm ảnh là MỘT bản ghi trong bảng `anh_chung_tu`, móc vào một hay vài
 * CHỨNG TỪ bằng mã:
 *
 *   · Phiếu nhập kho     → mã phiếu `PN-YYMMDD-NN`
 *   · Chuyến giao xuất   → `referenceGroupId` (một chuyến, một tờ biên bản)
 *   · Dòng lẻ không nhóm → `gd:<mã dòng>`
 *
 * Dòng giao dịch không giữ đường dẫn ảnh nào. Nó chỉ mang mã chứng từ (vốn đã
 * có sẵn), nên không lượt ghi giao dịch nào còn có thể làm mất ảnh.
 *
 * Luật máy chủ (firestore.rules, `anh_chung_tu`): chỉ được THÊM ảnh; sửa và xoá
 * chỉ admin. Xoá chứng từ thì xoá luôn ảnh của nó — dữ liệu và ảnh đi một cụm.
 *
 * Tệp này chỉ có phép tính thuần, chạy kiểm tra không cần mạng.
 */

/** Bảng Firestore của ảnh chứng từ. */
export const KHO_ANH_CHUNG_TU = "anh_chung_tu";

/** Nhãn dán lên mọi tệp app này tải lên Cloudinary, để lọc trên trang quản trị. */
export const NHAN_ANH = "bcsx-skb";

/** Khoá ngữ cảnh ghi uid người tải lên tệp Cloudinary. */
export const KHOA_NGUOI_TAI = "nguoi";

export type LoaiAnh = "NHAP" | "XUAT";

/** Một tấm ảnh chứng từ — một tài liệu trong `anh_chung_tu`. */
export interface AnhChungTu {
  /** Mã tài liệu = mã tệp Cloudinary, `/` đổi thành `~`. */
  id: string;
  url: string;
  /** Mã tệp trên Cloudinary — cần để xoá tệp thật. */
  publicId: string;
  /** Những chứng từ tấm ảnh này làm chứng. Không bao giờ rỗng. */
  chungTu: string[];
  loai: LoaiAnh;
  /** Ngày nghiệp vụ của chứng từ lúc gắn ảnh, `yyyy-MM-dd`. */
  ngay: string;
  maDoiTac: string;
  doiTac: string;
  /** Lúc tải lên, ISO. */
  taiLuc: string;
  /** Tên / email người tải. */
  taiBoi: string;
  /** uid người tải — luật máy chủ bắt khớp với người đang ghi. */
  uid: string;
}

/** Phần dòng giao dịch cần để biết nó thuộc chứng từ nào. */
export interface DongChungTu {
  id: string;
  type: string;
  slipCode?: string;
  referenceGroupId?: string;
}

/**
 * Mã chứng từ của một dòng giao dịch.
 *
 * Nhập có phiếu → mã phiếu. Còn lại → mã chuyến (`referenceGroupId`). Dòng
 * không thuộc nhóm nào → `gd:<mã dòng>`.
 */
export function maChungTuCuaDong(t: DongChungTu): string {
  const phieu = String(t.slipCode ?? "").trim();
  if (phieu && (t.type === "IN" || t.type === "OPENING")) return phieu;
  const nhom = String(t.referenceGroupId ?? "").trim();
  if (nhom) return nhom;
  return `gd:${t.id}`;
}

/** Loại ảnh của một dòng: nhập kho hay xuất kho. */
export function loaiCuaDong(type: string): LoaiAnh {
  return type === "IN" || type === "OPENING" ? "NHAP" : "XUAT";
}

/* ------------------------------------------------------------------ */
/* Mã tệp Cloudinary                                                   */
/* ------------------------------------------------------------------ */

const MOC = "/image/upload/";

/**
 * Mã tệp (`public_id`) từ đường dẫn Cloudinary. Không phải Cloudinary → rỗng.
 *
 *   .../image/upload/v1789640255/abc.jpg          → abc
 *   .../image/upload/f_auto,w_400/v1/thu/abc.jpg  → thu/abc
 */
export function maTepTuUrl(url: string): string {
  const u = String(url ?? "").trim();
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(u)) return "";
  const khuc = u
    .slice(u.indexOf(MOC) + MOC.length)
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean);
  const v = khuc.findIndex((k) => /^v\d+$/.test(k));
  let con = v >= 0 ? khuc.slice(v + 1) : khuc;
  if (v < 0) {
    // Bỏ các khúc biến đổi phía trước (`w_400`, `f_auto,q_auto`), giữ khúc cuối.
    while (con.length > 1 && con[0].split(",").every((p) => /^[a-z]{1,3}_[^/]+$/.test(p))) {
      con = con.slice(1);
    }
  }
  if (!con.length) return "";
  const cuoi = con[con.length - 1];
  const cham = cuoi.lastIndexOf(".");
  con = [...con.slice(0, -1), cham > 0 ? cuoi.slice(0, cham) : cuoi];
  return con.join("/");
}

/** Tên kho Cloudinary trong đường dẫn (`zjtjeyqd`). */
export function khoCuaUrl(url: string): string {
  return /^https:\/\/res\.cloudinary\.com\/([^/]+)\//i.exec(String(url ?? "").trim())?.[1] ?? "";
}

/** Mã tài liệu Firestore từ mã tệp: Firestore không cho `/` trong mã. */
export function idTuMaTep(publicId: string): string {
  return String(publicId ?? "").replace(/\//g, "~");
}

/* ------------------------------------------------------------------ */
/* Tra ảnh theo chứng từ                                               */
/* ------------------------------------------------------------------ */

/** Ảnh theo mã chứng từ, mỗi chứng từ xếp theo lúc tải (cũ trước). */
export function chiMucTheoChungTu(
  anh: readonly AnhChungTu[],
): Map<string, AnhChungTu[]> {
  const m = new Map<string, AnhChungTu[]>();
  anh.forEach((a) =>
    a.chungTu.forEach((c) => {
      const ds = m.get(c);
      if (ds) ds.push(a);
      else m.set(c, [a]);
    }),
  );
  m.forEach((ds) => ds.sort((x, y) => x.taiLuc.localeCompare(y.taiLuc)));
  return m;
}

/** Phiếu nhập nào đã có ảnh ký — điều kiện để hàng trên phiếu vào tồn. */
export function phieuDaCoAnhKy(anh: readonly AnhChungTu[]): Set<string> {
  const s = new Set<string>();
  anh.forEach((a) => {
    if (a.loai === "NHAP") a.chungTu.forEach((c) => s.add(c));
  });
  return s;
}

/* ------------------------------------------------------------------ */
/* Xoá chứng từ → ảnh đi theo                                          */
/* ------------------------------------------------------------------ */

export interface ViecAnhKhiXoa {
  /** Ảnh không còn chứng từ nào sống: xoá tệp và xoá bản ghi. */
  xoa: AnhChungTu[];
  /** Ảnh còn làm chứng cho chứng từ khác: chỉ gỡ những chứng từ đã mất. */
  go: { anh: AnhChungTu; conLai: string[] }[];
}

/**
 * Xoá một loạt chứng từ thì ảnh của chúng phải đi đâu.
 *
 * Chỉ xét ảnh của đúng những chứng từ BỊ XOÁ trong lượt này — không bao giờ
 * đụng tới ảnh của chứng từ khác, kể cả khi trông như không ai dùng.
 *
 * @param biXoa    mã chứng từ của những dòng / phiếu vừa xoá
 * @param conSong  mã chứng từ còn sống SAU lượt xoá (dòng, phiếu còn lại)
 */
export function viecAnhKhiXoa(
  anh: readonly AnhChungTu[],
  biXoa: Iterable<string>,
  conSong: ReadonlySet<string>,
): ViecAnhKhiXoa {
  const mat = new Set([...biXoa].filter((c) => !conSong.has(c)));
  const ra: ViecAnhKhiXoa = { xoa: [], go: [] };
  if (!mat.size) return ra;
  anh.forEach((a) => {
    if (!a.chungTu.some((c) => mat.has(c))) return;
    const conLai = a.chungTu.filter((c) => !mat.has(c));
    if (conLai.length) ra.go.push({ anh: a, conLai });
    else ra.xoa.push(a);
  });
  return ra;
}

/* ------------------------------------------------------------------ */
/* Chuyển dữ liệu cũ sang bảng mới                                     */
/* ------------------------------------------------------------------ */

/** Dòng giao dịch đời cũ, chỉ phần cần để chuyển ảnh. */
export interface GiaoDichCu extends DongChungTu {
  date?: string;
  partnerId?: string;
  partnerName?: string;
  createdBy?: string;
  evidencePhotoUrl?: string | null;
  evidencePhotoUrls?: string[] | null;
}

export interface PhieuCu {
  code: string;
  date?: string;
  signedPhotoUrls?: string[] | null;
  signedAt?: string;
  signedBy?: string;
}

/** Một dòng của sổ ảnh đời trước (`anh_minh_chung`). */
export interface SoAnhCu {
  url: string;
  chieu?: string;
  nhom?: string;
  ngay?: string;
  partnerId?: string;
  partnerName?: string;
  vaoSoLuc?: string;
  vaoSoBoi?: string;
}

export interface KetQuaChuyen {
  anh: AnhChungTu[];
  /** Đường dẫn không chuyển được (không phải Cloudinary của kho app), kèm lý do. */
  boQua: { url: string; lyDo: string }[];
  /** Ảnh sổ cũ đã rời khỏi chứng từ, nay gắn lại. */
  ganLai: number;
  /** Ảnh không còn chứng từ nào sống — để chứng từ `mo-coi:` cho admin xem. */
  moCoi: number;
}

const sach = (u: unknown) => String(u ?? "").trim();
const ngay10 = (s: unknown) => sach(s).slice(0, 10);

/**
 * Dựng bảng `anh_chung_tu` từ dữ liệu đời cũ.
 *
 *   1. Ảnh trên dòng giao dịch → gắn vào chứng từ của dòng. Cùng một tấm trên
 *      nhiều dòng của một chuyến thì chỉ là MỘT bản ghi.
 *   2. Ảnh trên phiếu nhập → gắn vào mã phiếu.
 *   3. Ảnh chỉ còn trong sổ cũ (đã rời khỏi đơn) → gắn lại vào chứng từ ghi
 *      trong sổ nếu chứng từ ấy còn sống; không thì để `mo-coi:<nhóm>`.
 *
 * Hợp các dòng của một chuyến lại: dòng nào thiếu ảnh của chuyến thì sau khi
 * chuyển, cả chuyến thấy đủ mọi tấm.
 */
export function chuyenTuDuLieuCu(input: {
  giaoDich: readonly GiaoDichCu[];
  phieu: readonly PhieuCu[];
  soCu: readonly SoAnhCu[];
  /** Tên kho Cloudinary của app — ảnh kho khác (ảnh mẫu `demo`) không chuyển. */
  kho: string;
  luc: string;
}): KetQuaChuyen {
  const theoId = new Map<string, AnhChungTu>();
  const boQua: KetQuaChuyen["boQua"] = [];
  const daBoQua = new Set<string>();

  const them = (
    urlTho: unknown,
    chungTu: string,
    loai: LoaiAnh,
    thongTin: { ngay: string; maDoiTac: string; doiTac: string; taiLuc: string; taiBoi: string },
  ): boolean => {
    const url = sach(urlTho);
    if (!url) return false;
    const pid = maTepTuUrl(url);
    const lyDo = !pid
      ? "không phải đường dẫn Cloudinary"
      : khoCuaUrl(url) !== input.kho
        ? `ảnh của kho khác (${khoCuaUrl(url)})`
        : "";
    if (lyDo) {
      if (!daBoQua.has(url)) {
        daBoQua.add(url);
        boQua.push({ url, lyDo });
      }
      return false;
    }
    const id = idTuMaTep(pid);
    const co = theoId.get(id);
    if (co) {
      if (!co.chungTu.includes(chungTu)) co.chungTu.push(chungTu);
      return true;
    }
    theoId.set(id, {
      id,
      url,
      publicId: pid,
      chungTu: [chungTu],
      loai,
      ngay: thongTin.ngay,
      maDoiTac: thongTin.maDoiTac,
      doiTac: thongTin.doiTac,
      taiLuc: thongTin.taiLuc || input.luc,
      taiBoi: thongTin.taiBoi,
      uid: "chuyen-du-lieu",
    });
    return true;
  };

  const chungTuSong = new Set<string>();
  const dauPhieu = new Map<string, GiaoDichCu>();
  input.giaoDich.forEach((t) => {
    chungTuSong.add(maChungTuCuaDong(t));
    if (t.slipCode && !dauPhieu.has(t.slipCode)) dauPhieu.set(t.slipCode, t);
  });
  input.phieu.forEach((p) => chungTuSong.add(p.code));

  // 2 trước 1: phiếu nói đúng tờ giấy hơn từng dòng hàng.
  input.phieu.forEach((p) => {
    const dau = dauPhieu.get(p.code);
    (p.signedPhotoUrls || []).forEach((u) =>
      them(u, p.code, "NHAP", {
        ngay: ngay10(dau?.date || p.date),
        maDoiTac: sach(dau?.partnerId),
        doiTac: sach(dau?.partnerName),
        taiLuc: sach(p.signedAt),
        taiBoi: sach(p.signedBy),
      }),
    );
  });

  input.giaoDich.forEach((t) => {
    const ct = maChungTuCuaDong(t);
    [t.evidencePhotoUrl, ...(t.evidencePhotoUrls || [])].forEach((u) =>
      them(u, ct, loaiCuaDong(t.type), {
        ngay: ngay10(t.date),
        maDoiTac: sach(t.partnerId),
        doiTac: sach(t.partnerName),
        taiLuc: "",
        taiBoi: sach(t.createdBy),
      }),
    );
  });

  // 3. Sổ cũ: tấm nào chưa có thì gắn lại theo nhóm ghi trong sổ.
  let ganLai = 0;
  let moCoi = 0;
  input.soCu.forEach((b) => {
    const pid = maTepTuUrl(b.url);
    if (!pid || theoId.has(idTuMaTep(pid))) return;
    const nhom = sach(b.nhom);
    const song = nhom && chungTuSong.has(nhom);
    const ok = them(b.url, song ? nhom : `mo-coi:${nhom || pid}`, b.chieu === "NHAP" ? "NHAP" : "XUAT", {
      ngay: ngay10(b.ngay),
      maDoiTac: sach(b.partnerId),
      doiTac: sach(b.partnerName),
      taiLuc: sach(b.vaoSoLuc),
      taiBoi: sach(b.vaoSoBoi),
    });
    if (ok) {
      if (song) ganLai++;
      else moCoi++;
    }
  });

  return { anh: [...theoId.values()], boQua, ganLai, moCoi };
}

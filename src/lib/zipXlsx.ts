/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MỞ VÀ ĐÓNG LẠI MỘT TỆP .XLSX
 *
 * Tệp .xlsx thật ra là một tệp ZIP chứa mấy chục tệp XML. Muốn giữ NGUYÊN XI
 * định dạng của tệp mẫu — kẻ ô, tô màu, gộp ô, ghi chú, vùng in, khổ giấy — thì
 * cách chắc chắn nhất là mở tệp mẫu ra, sửa đúng phần dữ liệu, rồi đóng lại,
 * còn lại chép nguyên byte.
 *
 * VÌ SAO KHÔNG DÙNG THƯ VIỆN EXCEL. Đã thử đọc tệp mẫu bằng `xlsx-js-style` rồi
 * ghi lại: từ 5220 ô có định dạng còn 1169. Thư viện bỏ hết những ô TRỐNG mà có
 * kẻ viền, vì với nó ô không giá trị là ô không tồn tại. Tệp mẫu có 117 cột mà
 * phần lớn để trống nhưng vẫn kẻ ô, nên mất gần hết.
 *
 * MỤC NÀO KHÔNG SỬA THÌ CHÉP CẢ PHẦN ĐÃ NÉN. Không giải nén rồi nén lại: vừa
 * nhanh hơn, vừa chắc chắn không sai một byte nào. Chỉ ba tệp XML cần sửa mới
 * phải giải nén.
 */

import { crc32 } from "./taiHangLoat";

/** Một mục trong tệp ZIP, giữ nguyên phần đã nén. */
export interface MucZip {
  ten: string;
  /** 0 là xếp nguyên, 8 là nén deflate. */
  cachNen: number;
  crc: number;
  /** Dữ liệu đúng như trong tệp, chưa giải nén. */
  nen: Uint8Array;
  coGoc: number;
}

const doc16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const doc32 = (b: Uint8Array, i: number) =>
  (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

/**
 * Đọc danh sách mục của một tệp ZIP, giữ đúng thứ tự trong danh mục trung tâm.
 *
 * Đọc từ DANH MỤC TRUNG TÂM ở cuối tệp chứ không quét từ đầu: danh mục là chỗ
 * duy nhất nói chắc chắn tệp có những mục nào, còn quét đầu mục cục bộ thì gặp
 * mục đã xoá hoặc phần đệm là hiểu sai.
 */
export function docZip(b: Uint8Array): MucZip[] {
  // Tìm dấu kết danh mục, quét từ cuối lên. Phần ghi chú tối đa 65535 byte.
  let ket = -1;
  for (let i = b.length - 22; i >= 0 && i > b.length - 22 - 65536; i--) {
    if (doc32(b, i) === 0x06054b50) {
      ket = i;
      break;
    }
  }
  if (ket < 0) throw new Error("Không phải tệp ZIP hợp lệ: thiếu dấu kết.");

  const so = doc16(b, ket + 10);
  let vt = doc32(b, ket + 16);
  const ra: MucZip[] = [];
  for (let k = 0; k < so; k++) {
    if (doc32(b, vt) !== 0x02014b50) {
      throw new Error("Danh mục ZIP hỏng ở mục thứ " + (k + 1));
    }
    const cachNen = doc16(b, vt + 10);
    const crc = doc32(b, vt + 16);
    const coNen = doc32(b, vt + 20);
    const coGoc = doc32(b, vt + 24);
    const daiTen = doc16(b, vt + 28);
    const daiThem = doc16(b, vt + 30);
    const daiGhiChu = doc16(b, vt + 32);
    const viTriCuc = doc32(b, vt + 42);
    const ten = new TextDecoder().decode(b.subarray(vt + 46, vt + 46 + daiTen));

    // Nhảy tới đầu mục cục bộ để lấy dữ liệu: độ dài phần "thêm" ở đầu cục bộ
    // có thể khác ở danh mục, nên phải đọc lại tại chỗ.
    if (doc32(b, viTriCuc) !== 0x04034b50) {
      throw new Error(`Mục ${ten} hỏng: sai dấu đầu mục.`);
    }
    const daiTenCuc = doc16(b, viTriCuc + 26);
    const daiThemCuc = doc16(b, viTriCuc + 28);
    const dauDuLieu = viTriCuc + 30 + daiTenCuc + daiThemCuc;
    ra.push({
      ten,
      cachNen,
      crc,
      coGoc,
      nen: b.subarray(dauDuLieu, dauDuLieu + coNen),
    });
    vt += 46 + daiTen + daiThem + daiGhiChu;
  }
  return ra;
}

/** Trình duyệt có sẵn bộ nén/giải nén deflate hay không. */
function coDeflate(): boolean {
  return (
    typeof DecompressionStream !== "undefined" &&
    typeof CompressionStream !== "undefined"
  );
}

async function chayDong(
  du: Uint8Array,
  dong: TransformStream<Uint8Array, Uint8Array>,
): Promise<Uint8Array> {
  const bd = new Blob([du as BlobPart]).stream().pipeThrough(dong);
  return new Uint8Array(await new Response(bd).arrayBuffer());
}

/** Giải nén một mục về nội dung gốc. */
export async function giaiNen(m: MucZip): Promise<Uint8Array> {
  if (m.cachNen === 0) return m.nen;
  if (m.cachNen !== 8) {
    throw new Error(`Mục ${m.ten} dùng cách nén ${m.cachNen}, chưa hỗ trợ.`);
  }
  if (!coDeflate()) {
    throw new Error(
      "Trình duyệt này không giải nén được tệp mẫu. Hãy dùng Chrome hoặc Edge bản mới.",
    );
  }
  return chayDong(m.nen, new DecompressionStream("deflate-raw"));
}

/** Nén lại một nội dung để đưa vào tệp ZIP. Không nén được thì xếp nguyên. */
export async function nenLai(
  du: Uint8Array,
): Promise<{ cachNen: number; nen: Uint8Array }> {
  if (!coDeflate()) return { cachNen: 0, nen: du };
  return {
    cachNen: 8,
    nen: await chayDong(du, new CompressionStream("deflate-raw")),
  };
}

/** Đóng danh sách mục thành một tệp ZIP. */
export function dongZip(ds: MucZip[]): Blob {
  const bo = new TextEncoder();
  const cuc: BlobPart[] = [];
  const ghi: { ten: Uint8Array; m: MucZip; viTri: number }[] = [];
  let vt = 0;
  const s32 = (v: number) => {
    const a = new Uint8Array(4);
    new DataView(a.buffer).setUint32(0, v >>> 0, true);
    return a;
  };
  const s16 = (v: number) => {
    const a = new Uint8Array(2);
    new DataView(a.buffer).setUint16(0, v & 0xffff, true);
    return a;
  };

  for (const m of ds) {
    const ten = bo.encode(m.ten);
    cuc.push(
      s32(0x04034b50),
      s16(20),
      s16(0x0800),
      s16(m.cachNen),
      s16(0),
      s16(0),
      s32(m.crc),
      s32(m.nen.length),
      s32(m.coGoc),
      s16(ten.length),
      s16(0),
      ten,
      m.nen,
    );
    ghi.push({ ten, m, viTri: vt });
    vt += 30 + ten.length + m.nen.length;
  }

  const dauDanhMuc = vt;
  for (const g of ghi) {
    cuc.push(
      s32(0x02014b50),
      s16(20),
      s16(20),
      s16(0x0800),
      s16(g.m.cachNen),
      s16(0),
      s16(0),
      s32(g.m.crc),
      s32(g.m.nen.length),
      s32(g.m.coGoc),
      s16(g.ten.length),
      s16(0),
      s16(0),
      s16(0),
      s16(0),
      s32(0),
      s32(g.viTri),
      g.ten,
    );
    vt += 46 + g.ten.length;
  }

  cuc.push(
    s32(0x06054b50),
    s16(0),
    s16(0),
    s16(ghi.length),
    s16(ghi.length),
    s32(vt - dauDanhMuc),
    s32(dauDanhMuc),
    s16(0),
  );
  return new Blob(cuc, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Thay nội dung một số mục rồi đóng lại thành tệp .xlsx.
 *
 * Mục nào không nằm trong `thay` thì chép nguyên phần đã nén. Mục nào có tên
 * trong `boBot` thì bỏ khỏi tệp.
 */
export async function suaXlsx(
  gocBytes: Uint8Array,
  thay: Record<string, string>,
  boBot: string[] = [],
): Promise<Blob> {
  const bo = new TextEncoder();
  const ds = docZip(gocBytes).filter((m) => !boBot.includes(m.ten));
  const ra: MucZip[] = [];
  for (const m of ds) {
    const moi = thay[m.ten];
    if (moi === undefined) {
      ra.push(m);
      continue;
    }
    const du = bo.encode(moi);
    const { cachNen, nen } = await nenLai(du);
    ra.push({ ten: m.ten, cachNen, crc: crc32(du), coGoc: du.length, nen });
  }
  return dongZip(ra);
}

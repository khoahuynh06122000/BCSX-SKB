/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TẢI MỘT BỘ ẢNH VỀ MÁY — đi qua trung chuyển của app (máy văn phòng chặn
 * Cloudinary), hỏng thì thử thẳng Cloudinary. Một tấm lưu thẳng; nhiều tấm gói
 * ZIP xếp nguyên (`taoZip`).
 */

import { quaTrungChuyen } from "./duongDan";
import { taoZip } from "./taiVe";

export interface KetQuaTaiBo {
  daTai: number;
  /** Tên những tấm không lấy được. */
  hong: string[];
}

const GIOI_HAN_BYTE = 800 * 1024 * 1024;

async function layByte(url: string): Promise<Uint8Array> {
  for (const u of [quaTrungChuyen(url), url]) {
    try {
      const r = await fetch(u);
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
    } catch {
      /* thử đường kế */
    }
  }
  throw new Error("khong tai duoc");
}

function luuBlob(blob: Blob, ten: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ten;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Tải `tep` (tên đã đặt sẵn, có thể kèm thư mục `a/b.jpg`).
 * `tenZip` = tên tệp ZIP khi có hơn một tấm, hoặc khi `luonZip`.
 */
export async function taiBoAnh(
  tep: readonly { ten: string; url: string }[],
  tenZip: string,
  tienDo?: (xong: number, tong: number) => void,
  luonZip = false,
): Promise<KetQuaTaiBo> {
  const duLieu: ({ ten: string; duLieu: Uint8Array } | null)[] = new Array(tep.length).fill(null);
  const hong: string[] = [];
  let ke = 0;
  let xong = 0;
  let tongByte = 0;
  let tran = false;
  const chay = async () => {
    while (ke < tep.length && !tran) {
      const k = ke++;
      try {
        const du = await layByte(tep[k].url);
        tongByte += du.length;
        if (tongByte > GIOI_HAN_BYTE) tran = true;
        else duLieu[k] = { ten: tep[k].ten, duLieu: du };
      } catch {
        hong.push(tep[k].ten);
      }
      tienDo?.(++xong, tep.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, tep.length) }, chay));
  if (tran) throw new Error("Bộ ảnh quá lớn (trên 800 MB). Thu hẹp bộ lọc rồi tải lại.");
  const co = duLieu.filter((x): x is { ten: string; duLieu: Uint8Array } => !!x);
  if (!co.length) return { daTai: 0, hong };
  if (co.length === 1 && tep.length === 1 && !luonZip) {
    luuBlob(new Blob([co[0].duLieu as BlobPart]), co[0].ten.split("/").pop() || co[0].ten);
  } else {
    luuBlob(taoZip(co), tenZip);
  }
  return { daTai: co.length, hong };
}

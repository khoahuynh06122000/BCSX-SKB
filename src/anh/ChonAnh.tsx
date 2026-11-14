/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trash2 } from "lucide-react";
import { compressFile } from "../lib/image";

/**
 * ẢNH ĐANG CHỌN, CHƯA LƯU — đã đọc và nén NGAY LÚC CHỌN, chưa lên Cloudinary.
 *
 * VÌ SAO ĐỌC NGAY (14/11/2026): bản trước giữ nguyên tệp của điện thoại tới
 * lúc bấm Xác nhận mới đọc. Trên Android, trong lúc người dùng tích từng mặt
 * hàng, máy thu lại quyền đọc tệp ảnh (nhất là ảnh vừa chụp) — tới lúc lưu thì
 * báo "Không đọc được tệp ảnh" và không ảnh nào lên được. Nay chọn xong là đọc
 * và nén luôn thành dữ liệu nằm trong app; lúc lưu không còn phải đọc lại tệp.
 *
 * Chỉ khi bấm Lưu / Xác nhận ảnh mới được tải lên và ghi cùng lô với chứng từ
 * (`kho.ts`). Gỡ một tấm hay đóng khung chỉ là bỏ dữ liệu trên máy.
 */

export interface TepCho {
  id: string;
  /** Ảnh đã nén, dạng data URI — dùng cả để xem trước lẫn để tải lên. */
  du: string;
}

let dem = 0;

/**
 * Đọc và nén ngay các tệp người dùng vừa chọn.
 *
 * PHẢI gọi ngay trong lúc xử lý sự kiện chọn ảnh (trước khi xoá giá trị ô
 * chọn tệp). Tấm nào máy không cho đọc thì đếm vào `hong` để báo người dùng
 * chọn lại, không âm thầm bỏ.
 */
export async function taoTepCho(
  files: FileList | readonly File[] | null | undefined,
): Promise<{ ds: TepCho[]; hong: number }> {
  const tep = Array.from(files ?? []);
  const ds: TepCho[] = [];
  let hong = 0;
  for (const f of tep) {
    try {
      const du = await compressFile(f, 2000, 2000, 0.85);
      if (!du.startsWith("data:image/")) throw new Error("không phải ảnh");
      ds.push({ id: `cho-${Date.now()}-${dem++}`, du });
    } catch {
      hong++;
    }
  }
  return { ds, hong };
}

interface Props {
  ds: TepCho[];
  onDoi: (ds: TepCho[]) => void;
}

/**
 * Ảnh to, không cắt, mỗi tấm một hàng: đây là tờ biên bản viết tay, người
 * dùng phải đọc được con số để dò với số lượng. Nút gỡ luôn hiện (điện thoại
 * không có rê chuột).
 */
export default function ChonAnh({ ds, onDoi }: Props) {
  if (!ds.length) return null;
  return (
    <div className="space-y-3 mt-4">
      {ds.map((t, i) => (
        <div key={t.id} className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
          <img src={t.du} alt={`Ảnh ${i + 1}`} className="w-full max-h-[60vh] object-contain" />
          <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-900/70 text-white text-[9px] font-black uppercase tracking-widest">
            Ảnh {i + 1}/{ds.length} · chưa lưu
          </span>
          <button
            type="button"
            onClick={() => onDoi(ds.filter((x) => x.id !== t.id))}
            className="absolute top-2 right-2 p-2.5 bg-rose-500 text-white rounded-xl shadow-lg active:scale-90 transition-transform"
            aria-label={`Bỏ ảnh ${i + 1}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

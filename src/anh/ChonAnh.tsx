/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trash2 } from "lucide-react";

/**
 * ẢNH ĐANG CHỌN, CHƯA LƯU — nằm trên máy, chưa lên Cloudinary.
 *
 * Xem trước bằng đường dẫn tạm của trình duyệt. Chỉ khi bấm Lưu / Xác nhận ảnh
 * mới được tải lên và ghi cùng lô với chứng từ (`kho.ts`). Gỡ một tấm hay đóng
 * khung thì chỉ là bỏ tệp trên máy — không có gì trên máy chủ phải dọn.
 */

export interface TepCho {
  id: string;
  tep: File;
  /** Đường dẫn tạm để xem trước (`blob:`). */
  xem: string;
}

let dem = 0;

/** Biến danh sách tệp người dùng chọn thành tệp chờ có ảnh xem trước. */
export function taoTepCho(files: FileList | readonly File[] | null | undefined): TepCho[] {
  return Array.from(files ?? [])
    .filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name))
    .map((tep) => ({ id: `cho-${Date.now()}-${dem++}`, tep, xem: URL.createObjectURL(tep) }));
}

/** Thu hồi đường dẫn tạm — gọi khi bỏ hẳn các tệp chờ. */
export function giaiPhong(ds: readonly TepCho[]): void {
  ds.forEach((t) => URL.revokeObjectURL(t.xem));
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
          <img src={t.xem} alt={`Ảnh ${i + 1}`} className="w-full max-h-[60vh] object-contain" />
          <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-900/70 text-white text-[9px] font-black uppercase tracking-widest">
            Ảnh {i + 1}/{ds.length} · chưa lưu
          </span>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(t.xem);
              onDoi(ds.filter((x) => x.id !== t.id));
            }}
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

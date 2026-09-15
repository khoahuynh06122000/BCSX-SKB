/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { goNgay, isoSangVn, vnSangIso } from "../lib/oNgay";

/**
 * Ô NHẬP NGÀY THEO KIỂU VIỆT NAM — ngày/tháng/năm.
 *
 * Thay cho `<input type="date">`, vì ô ngày của trình duyệt hiện theo ngôn ngữ
 * của MÁY người dùng: máy cài tiếng Anh thì ra `mm/dd/yyyy` và không có cách
 * nào đổi từ phía trang web. Xem `src/lib/oNgay.ts` để biết vì sao chuyện này
 * không chỉ là thẩm mỹ.
 *
 * NGOÀI VẪN LÀ `yyyy-MM-dd`. `value` nhận vào và `onChange` báo ra đều dùng
 * dạng ấy, y như `<input type="date">` cũ — nên chỗ gọi không phải sửa gì thêm
 * ngoài việc đổi tên thẻ.
 *
 * VẪN CÒN LỊCH ĐỂ BẤM. Nút lịch bên phải mở đúng bảng chọn ngày của trình
 * duyệt qua một ô `date` ẩn. Bỏ hẳn bảng chọn thì người quen bấm lịch mất một
 * thói quen, mà gõ tay tám chữ số cũng không phải lúc nào cũng nhanh hơn.
 */
/** Khuôn ô nhập mặc định — giống hệt `Input` trong `App.tsx`. */
const KHUON =
  "w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50/50 border border-slate-200 " +
  "rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold focus:ring-4 " +
  "focus:ring-primary/10 focus:border-primary focus:bg-white transition-all " +
  "outline-none placeholder:text-slate-400";

export default function ONgay({
  value,
  onChange,
  className,
  label,
  min,
  max,
  disabled,
  "aria-label": nhan,
  id,
}: {
  /** Ngày đang giữ, dạng `yyyy-MM-dd`. Rỗng nghĩa là chưa chọn. */
  value: string;
  /** Báo ra ngày mới, cũng dạng `yyyy-MM-dd`. Xoá trắng thì báo chuỗi rỗng. */
  onChange: (iso: string) => void;
  className?: string;
  /** Nhãn phía trên ô, bày đúng kiểu các ô nhập khác trong app. */
  label?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
}) {
  const [go, setGo] = useState(() => isoSangVn(value));
  const oLich = useRef<HTMLInputElement>(null);

  /*
   * Ngày do bên ngoài đổi thì ô phải đổi theo — ví dụ bấm nút "tháng này" hay
   * mở lại một đơn cũ.
   *
   * Nhưng CHỈ đổi khi nó thật sự khác ngày đang gõ, nếu không thì mỗi lần gõ
   * một ký tự là ô bị viết đè và con trỏ nhảy về cuối.
   */
  useEffect(() => {
    if (vnSangIso(go) !== value) setGo(isoSangVn(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const khiGo = (raw: string) => {
    const s = goNgay(raw);
    setGo(s);
    const iso = vnSangIso(s);
    // Gõ dở thì chưa báo ra, trừ khi xoá trắng — xoá trắng là một ý định rõ
    // ràng, thường để bỏ bộ lọc.
    if (iso) onChange(iso);
    else if (s === "") onChange("");
  };

  /*
   * Rời ô mà đang dở dang thì trả về ngày hợp lệ gần nhất, không để lại một
   * chuỗi cụt như `15/09/20`. Người dùng nhìn vào tưởng đã chọn xong.
   */
  const khiRoi = () => {
    if (!vnSangIso(go)) setGo(isoSangVn(value));
  };

  const oNhap = (
    <div className="relative w-full">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="ngày/tháng/năm"
        aria-label={nhan}
        disabled={disabled}
        value={go}
        onChange={(e) => khiGo(e.target.value)}
        onBlur={khiRoi}
        className={className ?? KHUON}
        /*
          Chừa chỗ cho nút lịch bằng style chứ không bằng lớp Tailwind: chỗ gọi
          tự đặt className riêng, mà hai lớp padding cùng loại thì lớp nào thắng
          là do thứ tự trong tệp CSS, không do thứ tự viết ở đây. Đặt thẳng vào
          style thì lúc nào cũng thắng.
        */
        style={{ paddingRight: "2.25rem" }}
      />

      {/*
        Ô ngày thật, để mượn bảng chọn lịch của trình duyệt. Không dùng
        `display:none` — trình duyệt từ chối mở bảng chọn của một ô đang ẩn.
      */}
      <input
        ref={oLich}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-2 top-1/2 h-0 w-0 -translate-y-1/2 opacity-0"
      />

      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label={nhan ? `Chọn ngày: ${nhan}` : "Chọn ngày trên lịch"}
        onClick={() => {
          const o = oLich.current;
          if (!o) return;
          // `showPicker` là cách duy nhất mở bảng chọn bằng lệnh. Trình duyệt
          // cũ chưa có thì bấm vào ô, coi như không có nút — chứ đừng để văng
          // lỗi giữa lúc người ta đang nhập liệu.
          if (typeof o.showPicker === "function") {
            try {
              o.showPicker();
              return;
            } catch {
              /* Trình duyệt chặn vì không phải cử chỉ người dùng — bỏ qua. */
            }
          }
          o.focus();
          o.click();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
      >
        <Calendar className="h-4 w-4" />
      </button>
    </div>
  );

  if (!label) return oNhap;

  return (
    <div className="w-full space-y-1.5 sm:space-y-2">
      <label
        htmlFor={id}
        className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:text-xs"
      >
        {label}
      </label>
      {oNhap}
    </div>
  );
}

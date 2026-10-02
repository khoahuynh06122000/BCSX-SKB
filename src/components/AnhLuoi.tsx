/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { traLuot, xinLuot } from "../lib/hangDoiAnh";

/**
 * MỘT Ô ẢNH CỦA LƯỚI, CÓ XẾP HÀNG.
 *
 * Thẻ `<img>` trần sẽ đi xin ảnh ngay khi được dựng ra. Lưới có 91 ô thì máy
 * chủ ảnh nhận 91 yêu cầu trong một nhịp — `loading="lazy"` chỉ hoãn những ô
 * ngoài tầm nhìn, mà cuộn một cái là vào tầm nhìn hết, còn HTTP/2 thì không
 * giới hạn sáu kết nối như HTTP/1.1. Máy chủ chặn bớt, một nhúm ô thành xám,
 * và không ai phân biệt được "bị chặn" với "ảnh đã mất".
 *
 * Ô này xin lượt trước rồi mới gắn `src`. Xem `hangDoiAnh.ts`.
 */

interface Props {
  src: string;
  alt: string;
  className?: string;
  /** Lớp cho ô chờ, lúc chưa tới lượt. Mặc định dùng luôn `className`. */
  classNameCho?: string;
  onError?: () => void;
}

/**
 * Quá lâu thì trả lượt, dù ảnh chưa xong.
 *
 * Một yêu cầu treo không bao giờ gọi `onload` lẫn `onerror` — máy chủ ngậm
 * kết nối, hoặc mạng đứt giữa chừng. Không có mốc này thì lượt ấy bị giữ mãi,
 * và vì hàng đợi chỉ có bốn chỗ nên bốn tấm treo là cả lưới đứng im. Hết giờ
 * thì nhả chỗ cho người sau, còn tấm này vẫn để nó tải tiếp — tải xong muộn
 * vẫn hơn không bao giờ.
 */
const HET_GIO = 15000;

export default function AnhLuoi({
  src,
  alt,
  className,
  classNameCho,
  onError,
}: Props) {
  const [nguon, setNguon] = useState("");
  /** Ô này có đang giữ một lượt không. Dùng ref vì phải đọc từ cả hai phía:
      hàm dọn của effect, và trình xử lý `onload`/`onerror` của thẻ ảnh. */
  const dangGiu = useRef(false);

  const tra = () => {
    if (!dangGiu.current) return;
    dangGiu.current = false;
    traLuot();
  };

  useEffect(() => {
    let huy = false;
    let dongHo: ReturnType<typeof setTimeout> | undefined;
    setNguon("");

    xinLuot().then(() => {
      if (huy) {
        // Ô đã bị gỡ khỏi màn hình trong lúc xếp hàng: trả ngay, đừng để
        // người sau chờ một ô không còn tồn tại.
        traLuot();
        return;
      }
      dangGiu.current = true;
      dongHo = setTimeout(tra, HET_GIO);
      setNguon(src);
    });

    return () => {
      huy = true;
      if (dongHo) clearTimeout(dongHo);
      tra();
    };
    // `tra` đọc toàn ref nên không cần vào danh sách phụ thuộc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!nguon) {
    return (
      <div
        className={`${classNameCho ?? className ?? ""} bg-slate-100 animate-pulse`}
        aria-label={`Đang chờ tải ảnh: ${alt}`}
      />
    );
  }

  return (
    <img
      src={nguon}
      alt={alt}
      className={className}
      onLoad={tra}
      onError={() => {
        tra();
        onError?.();
      }}
    />
  );
}

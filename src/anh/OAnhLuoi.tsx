/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { anhThuNho } from "./duongDan";
import { traLuot, xinLuot } from "./hangDoi";

/**
 * MỘT Ô ẢNH THU NHỎ, CÓ XẾP HÀNG VÀ CÓ ĐƯỜNG LÙI.
 *
 *   1. Xin lượt ở hàng đợi rồi mới gắn `src` (xem `hangDoi.ts`).
 *   2. Tải bản thu nhỏ 400px. Hỏng thì tải lại bằng ẢNH GỐC — bản thu nhỏ tính
 *      vào hạn mức biến đổi của Cloudinary, hết hạn mức thì bản thu nhỏ hỏng
 *      trong khi tệp gốc vẫn nguyên. Bản cũ dừng ở bước này và báo "ảnh hỏng".
 *   3. Gốc cũng hỏng mới báo lỗi, kèm nút Thử lại.
 */

const HET_GIO = 15000;

interface Props {
  url: string;
  alt: string;
  className?: string;
  rong?: number;
  /** Báo ra ngoài khi cả bản thu nhỏ lẫn ảnh gốc đều không tải được. */
  onHong?: () => void;
}

export default function OAnhLuoi({ url, alt, className = "", rong = 400, onHong }: Props) {
  const [nguon, setNguon] = useState("");
  const [buoc, setBuoc] = useState<"nho" | "goc" | "hong">("nho");
  const [lan, setLan] = useState(0);
  const giu = useRef(false);
  const tra = () => {
    if (!giu.current) return;
    giu.current = false;
    traLuot();
  };

  useEffect(() => {
    let huy = false;
    let dongHo: ReturnType<typeof setTimeout> | undefined;
    setNguon("");
    if (buoc === "hong") return;
    xinLuot().then(() => {
      if (huy) {
        traLuot();
        return;
      }
      giu.current = true;
      dongHo = setTimeout(tra, HET_GIO);
      setNguon(buoc === "nho" ? anhThuNho(url, rong) : url);
    });
    return () => {
      huy = true;
      if (dongHo) clearTimeout(dongHo);
      tra();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, buoc, lan]);

  if (buoc === "hong") {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1.5 px-3 text-center bg-slate-100`}>
        <ImageOff className="w-6 h-6 text-slate-300" />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Chưa tải được ảnh</span>
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            setBuoc("nho");
            setLan((n) => n + 1);
          }}
          className="mt-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
        >
          Thử lại
        </span>
      </div>
    );
  }
  if (!nguon) return <div className={`${className} bg-slate-100 animate-pulse`} aria-label={`Đang tải ảnh: ${alt}`} />;
  return (
    <img
      src={nguon}
      alt={alt}
      decoding="async"
      onLoad={tra}
      onError={() => {
        tra();
        if (buoc === "nho" && anhThuNho(url, rong) !== url) setBuoc("goc");
        else {
          setBuoc("hong");
          onHong?.();
        }
      }}
      className={className}
    />
  );
}

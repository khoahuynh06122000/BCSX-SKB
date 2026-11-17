/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { anhThuNho, chuanHoaUrlAnh } from "./duongDan";
import { traLuot, xinLuot } from "./hangDoi";
import { nhomCuaMa } from "./soat";

/**
 * MỘT Ô ẢNH THU NHỎ, CÓ XẾP HÀNG, TRÌ HOÃN THỬ LẠI VÀ CHẨN ĐOÁN LỖI THẬT.
 *
 *   1. Xin lượt ở hàng đợi 4 luồng (`hangDoi.ts`) rồi mới gắn `src`.
 *   2. Tải bản thu nhỏ `w_{rong}` (nếu là Cloudinary). Lỗi thì nghỉ 320ms rồi
 *      lùi sang ẢNH GỐC (tránh chùm lỗi 429 và vượt hạn mức biến đổi ảnh).
 *   3. Ảnh gốc lỗi tiếp thì thử lại 1 nhịp nữa sau 900ms (chống nghẽn mạng / 429).
 *   4. Thua hẳn mới hỏi HEAD 1 nhịp để báo rõ lý do: mất tệp 404, hết hạn mức
 *      Cloudinary (403/420), quá tải tạm (429), hay lỗi mạng — kèm nút Thử lại.
 */

const HET_GIO = 15000;

interface Props {
  url: string;
  alt: string;
  className?: string;
  /** Bề rộng thu nhỏ Cloudinary; truyền <= 0 để tải thẳng ảnh gốc. */
  rong?: number;
  /** Báo ra ngoài khi mọi lượt thử đều không tải được. */
  onHong?: () => void;
}

type BuocTai = "nho" | "goc" | "goc2" | "hong";

function buocDau(urlNorm: string, rong: number): BuocTai {
  if (!urlNorm) return "hong";
  if (rong <= 0) return "goc";
  return anhThuNho(urlNorm, rong) !== urlNorm ? "nho" : "goc";
}

function moTaLoiHttp(status: number): string {
  switch (nhomCuaMa(status)) {
    case "mat":
      return `Mất tệp gốc (${status})`;
    case "het-han-muc":
      return `Hết hạn mức ảnh (${status})`;
    case "chan-tam":
      return "Quá tải tạm (429)";
    case "may-chu-loi":
      return `Máy chủ ảnh lỗi (${status})`;
    default:
      return "Chưa tải được ảnh";
  }
}

export default function OAnhLuoi({ url, alt, className = "", rong = 400, onHong }: Props) {
  const urlNorm = useMemo(() => chuanHoaUrlAnh(url), [url]);
  const urlThuNho = useMemo(
    () => (rong > 0 ? anhThuNho(urlNorm, rong) : urlNorm),
    [urlNorm, rong],
  );
  const coBanThuNho = Boolean(urlNorm) && urlThuNho !== urlNorm;

  const [nguon, setNguon] = useState("");
  const [buoc, setBuoc] = useState<BuocTai>(() => buocDau(urlNorm, rong));
  const [lyDoLoi, setLyDoLoi] = useState<string>(
    urlNorm ? "" : "Thiếu đường dẫn ảnh",
  );
  const [lan, setLan] = useState(0);

  const giu = useRef(false);
  const dongHoQueueRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const huyDongHoQueue = () => {
    if (dongHoQueueRef.current) {
      clearTimeout(dongHoQueueRef.current);
      dongHoQueueRef.current = undefined;
    }
  };

  const tra = () => {
    huyDongHoQueue();
    if (!giu.current) return;
    giu.current = false;
    traLuot();
  };

  // Khi đường dẫn ảnh thay đổi thì đặt lại trạng thái thử từ đầu.
  useEffect(() => {
    setNguon("");
    setBuoc(buocDau(urlNorm, rong));
    setLyDoLoi(urlNorm ? "" : "Thiếu đường dẫn ảnh");
  }, [urlNorm, rong]);

  useEffect(() => {
    let huy = false;
    setNguon("");

    if (!urlNorm) {
      setLyDoLoi("Thiếu đường dẫn ảnh");
      return;
    }

    if (buoc === "hong") {
      // Hỏi nhẹ HEAD đúng 1 lần khi đã bó tay để nói rõ nguyên nhân mất ảnh.
      if (!/^https?:\/\//i.test(urlNorm)) {
        setLyDoLoi("Đường dẫn ảnh không hợp lệ");
        return;
      }
      fetch(urlNorm, { method: "HEAD", cache: "no-store" })
        .then((r) => {
          if (!huy && !r.ok) setLyDoLoi(moTaLoiHttp(r.status));
        })
        .catch(() => {
          if (!huy) setLyDoLoi("Lỗi mạng / bị chặn");
        });
      return () => {
        huy = true;
      };
    }

    const doTre = buoc === "goc" && coBanThuNho ? 320 : buoc === "goc2" ? 900 : 0;

    const batDau = () => {
      xinLuot().then(() => {
        if (huy) {
          traLuot();
          return;
        }
        giu.current = true;
        huyDongHoQueue();
        dongHoQueueRef.current = setTimeout(tra, HET_GIO);
        setNguon(buoc === "nho" ? urlThuNho : urlNorm);
      });
    };

    if (doTre > 0) {
      retryTimerRef.current = setTimeout(() => {
        if (!huy) batDau();
      }, doTre);
    } else {
      batDau();
    }

    return () => {
      huy = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = undefined;
      }
      tra();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlNorm, urlThuNho, coBanThuNho, buoc, lan]);

  if (buoc === "hong") {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1.5 px-2.5 text-center bg-slate-100`}>
        <ImageOff className="w-5 h-5 text-rose-400 shrink-0" />
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-600 leading-tight">
          {lyDoLoi || "Chưa tải được ảnh"}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLyDoLoi("");
            setBuoc(buocDau(urlNorm, rong));
            setLan((n) => n + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setLyDoLoi("");
              setBuoc(buocDau(urlNorm, rong));
              setLan((n) => n + 1);
            }
          }}
          className="mt-0.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          Thử lại
        </span>
      </div>
    );
  }

  if (!nguon) {
    return (
      <div
        className={`${className} bg-slate-100 animate-pulse`}
        aria-label={`Đang tải ảnh: ${alt}`}
      />
    );
  }

  return (
    <img
      src={nguon}
      alt={alt}
      decoding="async"
      onLoad={tra}
      onError={() => {
        tra();
        if (buoc === "nho" && coBanThuNho) {
          setBuoc("goc");
        } else if (buoc === "goc") {
          setBuoc("goc2");
        } else {
          setBuoc("hong");
          onHong?.();
        }
      }}
      className={className}
    />
  );
}

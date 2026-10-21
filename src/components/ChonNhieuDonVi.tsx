/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ô CHỌN NHIỀU ĐƠN VỊ cho Thư viện ảnh — tích FV và NVT là xem ảnh hai nhà
 * cùng lúc. Bấm ô thì bung danh sách có ô tích; bấm ra ngoài là đóng.
 *
 * Giữ nguyên dáng ô chọn cũ (một dòng, cùng chiều rộng) để thanh lọc không
 * xô lệch; chỉ khác là danh sách cho tích nhiều dòng.
 */

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import type { MucDonVi } from "../lib/thuVienAnh";
import { tenLocDonVi } from "../lib/thuVienAnh";
import { cn, formatNumber } from "../lib/utils";

interface Props {
  /** Đơn vị có ảnh trong khoảng đang xem. */
  ds: MucDonVi[];
  /** Giá trị đang chọn; rỗng = tất cả. */
  dangChon: string[];
  onDoi: (v: string[]) => void;
}

export default function ChonNhieuDonVi({ ds, dangChon, onDoi }: Props) {
  const [mo, setMo] = useState(false);
  const khung = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mo) return;
    const dong = (e: MouseEvent) => {
      if (khung.current && !khung.current.contains(e.target as Node)) setMo(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMo(false);
    document.addEventListener("mousedown", dong);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", dong);
      document.removeEventListener("keydown", esc);
    };
  }, [mo]);

  // Đơn vị đang chọn mà khoảng ngày mới không còn ảnh thì vẫn phải bày ra
  // (kèm ghi chú) — không thì lưới đang lọc mà ô lại như không chọn gì.
  const mat = dangChon.filter((g) => !ds.some((d) => d.gia === g));
  const tatCa: MucDonVi[] = [
    ...ds,
    ...mat.map((g) => ({ gia: g, ten: `${tenLocDonVi(g)} — không có ảnh trong khoảng này` })),
  ];

  const bat = (g: string) =>
    onDoi(dangChon.includes(g) ? dangChon.filter((x) => x !== g) : [...dangChon, g]);

  const nhan =
    dangChon.length === 0
      ? ds.length === 0
        ? "Không có đơn vị nào"
        : `Tất cả đơn vị (${formatNumber(ds.length)})`
      : dangChon.length <= 2
        ? dangChon.map((g) => tenLocDonVi(g)).join(", ")
        : `${dangChon.length} đơn vị`;

  return (
    <div ref={khung} className="relative w-full lg:w-56 shrink-0">
      <button
        type="button"
        aria-label="Lọc theo đơn vị"
        aria-expanded={mo}
        disabled={tatCa.length === 0}
        onClick={() => setMo((x) => !x)}
        className={cn(
          "w-full text-left pl-10 pr-8 py-2.5 bg-white border rounded-xl text-[11px] sm:text-xs font-black focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm uppercase tracking-widest truncate disabled:opacity-50",
          dangChon.length ? "border-primary text-primary" : "border-slate-200 text-slate-700",
        )}
      >
        {nhan}
      </button>
      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

      {mo && (
        <div className="absolute z-30 mt-2 w-full min-w-[240px] max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl p-1.5">
          <button
            type="button"
            onClick={() => onDoi([])}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-black text-left hover:bg-slate-50",
              dangChon.length === 0 ? "text-primary" : "text-slate-600",
            )}
          >
            <span
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                dangChon.length === 0 ? "bg-primary border-primary" : "border-slate-300",
              )}
            >
              {dangChon.length === 0 && <Check className="w-3 h-3 text-white" />}
            </span>
            Tất cả đơn vị
          </button>
          <div className="my-1 border-t border-slate-100" />
          {tatCa.map((d) => {
            const chon = dangChon.includes(d.gia);
            return (
              <button
                key={d.gia}
                type="button"
                onClick={() => bat(d.gia)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold text-left hover:bg-slate-50",
                  chon ? "text-slate-900" : "text-slate-600",
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                    chon ? "bg-primary border-primary" : "border-slate-300",
                  )}
                >
                  {chon && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate">{d.ten}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

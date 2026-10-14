/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DẢI CẢNH BÁO NGUỒN DỮ LIỆU — hiện cho MỌI người dùng, ngay đầu màn hình.
 *
 * Đọc sổ `SUC_KHOE` (src/lib/sucKhoe.ts). Không có vấn đề thì không vẽ gì.
 * Mỗi vấn đề một dòng: chuyện gì, nên làm gì, mã lỗi gốc để chụp gửi lên.
 */

import { useSyncExternalStore } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { SUC_KHOE } from "../lib/sucKhoe";
import { cn } from "../lib/utils";

export function DaiSucKhoe() {
  const vanDe = useSyncExternalStore(SUC_KHOE.dangKy, SUC_KHOE.layVanDe);
  if (vanDe.length === 0) return null;
  const coDo = vanDe.some((v) => v.muc === "do");
  const canTaiLai = vanDe.some((v) => v.canTaiLai);

  return (
    <div
      role="alert"
      className={cn(
        "p-3 rounded-2xl border flex gap-3",
        coDo ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50",
      )}
    >
      <AlertTriangle
        className={cn(
          "w-5 h-5 shrink-0 mt-0.5",
          coDo ? "text-rose-600" : "text-amber-600",
        )}
      />
      <div className="min-w-0 flex-1 space-y-2">
        {vanDe.map((v) => (
          <div key={v.khoa} className="space-y-0.5">
            <p
              className={cn(
                "text-[11px] font-black uppercase tracking-wider",
                v.muc === "do" ? "text-rose-800" : "text-amber-800",
              )}
            >
              {v.tieuDe}
              <span className="ml-2 font-bold normal-case tracking-normal opacity-70">
                từ {new Date(v.luc).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                {v.ma ? ` · mã ${v.ma}` : ""}
              </span>
            </p>
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
              {v.viec}
            </p>
          </div>
        ))}
        {canTaiLai && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-[11px] font-black text-rose-700 hover:bg-rose-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tải lại trang
          </button>
        )}
      </div>
    </div>
  );
}

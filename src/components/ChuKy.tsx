/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eraser, Loader2, PenLine, ShieldCheck, X } from "lucide-react";
import { bamSha256, chuKyDuNet, netTuDiem, XAC_THUC_KY, type ChuKyMau, type Diem } from "../lib/chuKy";
import type { ChuKyDienTu } from "../types";
import { cn } from "../lib/utils";

/**
 * CHỮ KÝ ĐIỆN TỬ — giao diện: khung vẽ, hình chữ ký, màn đăng ký mẫu, hộp ký
 * có nhập lại PIN. Phần tính (băm, khuôn id) ở `lib/chuKy.ts`.
 */

const RONG = 600;
const CAO = 220;

/** Hình chữ ký từ mẫu đã lưu (đường SVG, nét mực xanh đậm). */
export function HinhChuKy({
  mau,
  className,
}: {
  mau: Pick<ChuKyMau, "net" | "rong" | "cao">;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${mau.rong || RONG} ${mau.cao || CAO}`}
      className={cn("block", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Chữ ký"
    >
      <path
        d={mau.net}
        fill="none"
        stroke="#0B2A6F"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Khung vẽ chữ ký bằng ngón tay / bút / chuột. Báo ra danh sách nét. */
function KhungVe({ onDoi }: { onDoi: (cacNet: Diem[][]) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [cacNet, setCacNet] = useState<Diem[][]>([]);
  const dangVe = useRef(false);

  const diemCua = (e: React.PointerEvent): Diem => {
    const r = svg.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * RONG,
      y: ((e.clientY - r.top) / r.height) * CAO,
    };
  };
  const doi = (ds: Diem[][]) => {
    setCacNet(ds);
    onDoi(ds);
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white">
        <svg
          ref={svg}
          viewBox={`0 0 ${RONG} ${CAO}`}
          className="block w-full h-auto touch-none cursor-crosshair select-none"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            dangVe.current = true;
            doi([...cacNet, [diemCua(e)]]);
          }}
          onPointerMove={(e) => {
            if (!dangVe.current) return;
            const ds = cacNet.slice();
            ds[ds.length - 1] = [...ds[ds.length - 1], diemCua(e)];
            doi(ds);
          }}
          onPointerUp={() => (dangVe.current = false)}
          onPointerCancel={() => (dangVe.current = false)}
        >
          <line x1={30} x2={RONG - 30} y1={CAO - 45} y2={CAO - 45} stroke="#CBD5E1" strokeDasharray="6 6" />
          <path
            d={netTuDiem(cacNet)}
            fill="none"
            stroke="#0B2A6F"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {!cacNet.length && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-300">
            Ký vào đây
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => doi([])}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-extrabold text-slate-600 hover:bg-slate-50"
      >
        <Eraser className="h-3.5 w-3.5" /> Xoá, ký lại
      </button>
    </div>
  );
}

/**
 * ĐĂNG KÝ CHỮ KÝ MẪU — bắt buộc một lần sau khi đăng nhập (chưa có mẫu thì
 * không vào được app). Mở lại từ Cài đặt để đổi chữ ký: thêm mẫu MỚI, mẫu cũ
 * vẫn giữ cho chứng từ đã ký trước đó.
 */
export function DangKyChuKy({
  ten,
  email,
  laDoiMau = false,
  onLuu,
  onDong,
}: {
  ten: string;
  email: string;
  laDoiMau?: boolean;
  onLuu: (net: string, rong: number, cao: number) => Promise<boolean>;
  /** Có thì hiện nút đóng (đổi mẫu). Đăng ký lần đầu thì không cho đóng. */
  onDong?: () => void;
}) {
  const [cacNet, setCacNet] = useState<Diem[][]>([]);
  const [dongY, setDongY] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const du = chuKyDuNet(cacNet, RONG);

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-start sm:items-center justify-center overflow-y-auto bg-slate-900/70 p-3 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl anim-modal-enter">
        <div className="flex items-start justify-between gap-3 rounded-t-3xl bg-[#141A23] px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Chữ ký điện tử · {laDoiMau ? "đổi mẫu" : "đăng ký lần đầu"}
            </p>
            <h2 className="text-base font-extrabold">Đăng ký chữ ký của anh/chị</h2>
          </div>
          {onDong && (
            <button type="button" onClick={onDong} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="space-y-4 p-5">
          <p className="text-xs font-medium leading-relaxed text-slate-600">
            Chữ ký này sẽ được đóng lên các chứng từ anh/chị <strong>trình, duyệt hoặc ký nhận</strong>{" "}
            trong app, kèm họ tên, giờ ký và mã xác thực. Mỗi lần ký phải nhập lại mã PIN.
          </p>
          <KhungVe onDoi={setCacNet} />
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs">
            <p className="font-black text-slate-900">{ten || "(chưa có họ tên)"}</p>
            <p className="font-mono text-[11px] text-slate-500">{email}</p>
          </div>
          <label className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed text-slate-700">
            <input
              type="checkbox"
              checked={dongY}
              onChange={(e) => setDongY(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            <span>
              Tôi, <strong>{ten}</strong>, xác nhận đây là chữ ký của tôi và đồng ý dùng chữ ký điện tử
              này thay chữ ký tay trên chứng từ nội bộ của app. Mỗi lần ký có giá trị như tôi ký tay
              lên chứng từ đó.
            </span>
          </label>
          {!du && cacNet.length > 0 && (
            <p className="text-[11px] font-bold text-amber-700">Chữ ký quá ngắn — ký đầy đủ như trên giấy.</p>
          )}
          <button
            type="button"
            disabled={!du || !dongY || dangLuu || !ten}
            onClick={async () => {
              setDangLuu(true);
              const ok = await onLuu(netTuDiem(cacNet), RONG, CAO);
              setDangLuu(false);
              if (ok) onDong?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 py-3 text-sm font-extrabold text-white shadow hover:bg-amber-700 disabled:opacity-40"
          >
            {dangLuu ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            Lưu chữ ký
          </button>
          {!ten && (
            <p className="text-center text-[11px] font-bold text-rose-600">
              Tài khoản chưa có họ tên — nhờ admin điền họ tên trước khi đăng ký chữ ký.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export interface YeuCauKy {
  /** Ví dụ "Duyệt Rào 1 · PN-261120-01". */
  tieuDe: string;
  /** Vai trò ký in trên chứng từ, ví dụ "Quản lý xưởng (Rào 1)". */
  vaiTro: string;
  /** Tóm tắt nội dung đang ký — mỗi phần tử một dòng. */
  noiDung: string[];
  /** Cảnh báo chặn ký (ví dụ nội dung đã đổi sau chữ ký trước). */
  chan?: string;
}

/**
 * HỘP KÝ: hiện nội dung đang ký + chữ ký mẫu + họ tên, bắt nhập lại PIN.
 * `onKy(pin)` trả về câu lỗi (sai PIN...) hoặc null khi ký xong.
 */
export function HopKy({
  yeuCau,
  mau,
  ten,
  onKy,
  onHuy,
}: {
  yeuCau: YeuCauKy;
  mau: ChuKyMau;
  ten: string;
  onKy: (pin: string) => Promise<string | null>;
  onHuy: () => void;
}) {
  const [pin, setPin] = useState("");
  const [loi, setLoi] = useState("");
  const [dangKy, setDangKy] = useState(false);
  const oPin = useRef<HTMLInputElement>(null);
  useEffect(() => oPin.current?.focus(), []);

  const ky = async () => {
    if (pin.length !== 6 || dangKy || yeuCau.chan) return;
    setDangKy(true);
    setLoi("");
    const l = await onKy(pin);
    setDangKy(false);
    if (l) {
      setLoi(l);
      setPin("");
      oPin.current?.focus();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-start sm:items-center justify-center overflow-y-auto bg-slate-900/70 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl anim-modal-enter">
        <div className="flex items-start justify-between gap-3 rounded-t-3xl bg-[#141A23] px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Ký điện tử</p>
            <h2 className="text-sm font-extrabold">{yeuCau.tieuDe}</h2>
          </div>
          <button type="button" onClick={onHuy} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="Huỷ">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            {yeuCau.noiDung.map((d, i) => (
              <p key={i} className={cn(i === 0 ? "font-black text-slate-900" : "font-semibold text-slate-600")}>
                {d}
              </p>
            ))}
          </div>
          {yeuCau.chan ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
              {yeuCau.chan}
            </p>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{yeuCau.vaiTro}</p>
                <HinhChuKy mau={mau} className="mx-auto h-20 w-full max-w-[260px]" />
                <p className="text-sm font-black text-slate-900">{ten}</p>
              </div>
              <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
                Tôi đã kiểm tra và xác nhận nội dung chứng từ trên. Nhập mã PIN để ký.
              </p>
              <input
                ref={oPin}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && void ky()}
                placeholder="Mã PIN 6 số"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-center font-mono text-lg font-black tracking-[0.5em] outline-none focus:border-amber-600"
              />
              {loi && <p className="text-center text-xs font-bold text-rose-600">{loi}</p>}
              <button
                type="button"
                disabled={pin.length !== 6 || dangKy}
                onClick={() => void ky()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-extrabold text-white shadow hover:bg-emerald-700 disabled:opacity-40"
              >
                {dangKy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Ký
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Bảng chữ ký mẫu theo id — App cấp một lần, mọi biên bản đọc ra để vẽ chữ
 * ký (khỏi truyền qua từng tầng component).
 */
export const NguonChuKyMau = createContext<Map<string, ChuKyMau>>(new Map());

/**
 * KHỐI KÝ CỦA MỘT BIÊN BẢN (kiểm kê...): mỗi ô một người ký — chữ ký vẽ tay,
 * họ tên, giờ ký, và dấu soát nội dung (băm lại `noiDung` hiện tại, so với mã
 * băm lúc ký). Ô chưa ký hiện "Chưa ký".
 */
export function KhoiKyBienBan({
  cot,
  noiDung,
}: {
  cot: { nhan: string; sig?: ChuKyDienTu | null }[];
  noiDung: string;
}) {
  const mauTheoId = useContext(NguonChuKyMau);
  const [bam, setBam] = useState("");
  useEffect(() => {
    let huy = false;
    void bamSha256(noiDung).then((b) => !huy && setBam(b));
    return () => {
      huy = true;
    };
  }, [noiDung]);
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      {cot.map(({ nhan, sig }) => {
        if (!sig) {
          return (
            <div key={nhan} className="rounded-xl border border-dashed border-slate-300 bg-white p-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{nhan}</p>
              <p className="py-3 text-[10px] font-bold text-slate-300">Chưa ký</p>
            </div>
          );
        }
        const mau = sig.chuKyId ? mauTheoId.get(sig.chuKyId) : undefined;
        const khop = !sig.bamNoiDung || !bam ? null : sig.bamNoiDung === bam;
        return (
          <div
            key={nhan}
            className={cn(
              "rounded-xl border bg-white p-2 text-center",
              khop === false ? "border-rose-400 bg-rose-50/50" : "border-emerald-300",
            )}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{nhan}</p>
            {mau ? (
              <HinhChuKy mau={mau} className="mx-auto h-12 w-full max-w-[200px]" />
            ) : (
              <p className="py-3 font-black text-emerald-700">✓ Đã ký</p>
            )}
            <p className="font-black text-slate-900">{sig.name}</p>
            <p className="font-mono text-[9px] text-slate-500">
              {new Date(sig.signedAt).toLocaleString("vi-VN", { hour12: false })}
              {sig.xacThuc === XAC_THUC_KY ? " · Google + PIN" : ""}
            </p>
            {khop === true && <p className="text-[9px] font-bold text-emerald-700">✓ Nội dung nguyên vẹn từ lúc ký</p>}
            {khop === false && <p className="text-[9px] font-black text-rose-700">⚠ Nội dung ĐÃ ĐỔI sau khi ký</p>}
          </div>
        );
      })}
    </div>
  );
}

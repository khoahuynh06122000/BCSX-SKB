import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw, ShieldAlert, Unlock, X } from "lucide-react";
import type { UserProfile } from "../types";
import { generateStrongTempPin, isValidPinFormat, isWeakPin } from "../lib/pin";

interface Props {
  target: UserProfile | null;
  onClose: () => void;
  onIssueTempPin: (
    profile: UserProfile,
    tempPin: string,
    requireChange: boolean,
  ) => Promise<void>;
  onClearPinToReset: (profile: UserProfile) => Promise<void>;
}

/**
 * Hộp thoại cho Chủ sở hữu mở khóa & cấp lại mã PIN cho thành viên
 * (giống nút "Cấp lại mật khẩu" trên app Kiểm kê F&B):
 *   1) Cấp ngay 1 mã PIN tạm 6 số (mặc định, tùy chọn bắt tự đổi lại PIN cá nhân)
 *   2) Xóa trắng PIN cũ để nhân viên tự thiết lập lại 6 số mới
 */
export default function CapLaiPinDialog({
  target,
  onClose,
  onIssueTempPin,
  onClearPinToReset,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  const [mode, setMode] = useState<"temp" | "clear">("temp");
  const [tempPin, setTempPin] = useState("");
  const [requireChange, setRequireChange] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issuedResult, setIssuedResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    if (target) {
      setMode("temp");
      setTempPin(generateStrongTempPin());
      setRequireChange(true);
      setBusy(false);
      setError("");
      setIssuedResult(null);
      setCopied(false);
      if (!dlg.open) {
        dlg.showModal();
      }
    } else if (dlg.open) {
      dlg.close();
    }
  }, [target]);

  const handleClose = () => {
    const dlg = dialogRef.current;
    if (dlg) {
      dlg.returnValue = "";
      if (dlg.open) dlg.close();
    }
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target || busy) return;
    setError("");

    if (mode === "clear") {
      setBusy(true);
      try {
        await onClearPinToReset(target);
        handleClose();
      } catch (err: any) {
        setError(err?.message || "Không xóa được mã PIN cũ.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const cleaned = tempPin.replace(/\D/g, "").slice(0, 6);
    if (!isValidPinFormat(cleaned)) {
      setError("Mã PIN tạm phải gồm đúng 6 chữ số.");
      return;
    }
    if (isWeakPin(cleaned)) {
      setError("Tránh cấp dãy số lặp hoặc liên tiếp (123456, 000000...). Bấm Sinh số khác nhé.");
      return;
    }

    setBusy(true);
    try {
      await onIssueTempPin(target, cleaned, requireChange);
      setIssuedResult(cleaned);
    } catch (err: any) {
      setError(err?.message || "Không cấp lại được mã PIN.");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!issuedResult) return;
    try {
      await navigator.clipboard.writeText(issuedResult);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const isOutsideRect = (clientX: number, clientY: number, dlg: HTMLDialogElement) => {
    const r = dlg.getBoundingClientRect();
    return (
      clientX < r.left ||
      clientX > r.right ||
      clientY < r.top ||
      clientY > r.bottom
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Fallback light-dismiss cho Safari khi chua ho tro closedby="any"
      {...({ closedby: "any" } as Record<string, string>)}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = "";
        onClose();
      }}
      onPointerDown={(e) => {
        const dlg = dialogRef.current;
        if (!dlg) return;
        pressedOutsideRef.current = isOutsideRect(e.clientX, e.clientY, dlg);
      }}
      onPointerUp={(e) => {
        const dlg = dialogRef.current;
        if (!dlg) return;
        if (pressedOutsideRef.current && isOutsideRect(e.clientX, e.clientY, dlg)) {
          handleClose();
        }
        pressedOutsideRef.current = false;
      }}
      className="m-auto w-[min(94vw,460px)] rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl"
    >
      {target && (
        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                {target.pinLocked ? (
                  <Unlock className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <KeyRound className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <h3
                  id={titleId}
                  className="text-base font-black text-slate-900 leading-tight"
                >
                  {target.pinLocked ? "Mở khóa & cấp lại mã PIN" : "Cấp lại mã PIN"}
                </h3>
                <p className="text-xs font-bold text-slate-500 truncate mt-0.5">
                  {target.name || "Nhân viên"} · {target.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng hộp thoại"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {issuedResult ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  Đã cấp mã PIN mới & gỡ khóa thành công
                </p>
                <div className="py-2 font-mono text-3xl font-black tracking-[0.28em] text-slate-900 tabular-nums select-all">
                  {issuedResult}
                </div>
                <p className="text-xs font-semibold text-emerald-800/85 leading-relaxed">
                  {requireChange
                    ? "Gửi 6 chữ số này cho nhân viên. Sau khi mở khóa bằng PIN tạm, app sẽ tự yêu cầu họ đổi sang PIN cá nhân mới."
                    : "Gửi 6 chữ số này cho nhân viên để mở khóa ngay."}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" aria-hidden="true" />
                      Sao chép mã PIN
                    </>
                  )}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={handleClose}
                  className="min-h-[44px] px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {target.pinLocked && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-bold text-rose-700">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Tài khoản này đang bị khóa vì nhập sai mã PIN 5 lần liên tiếp. Thao tác dưới đây sẽ mở khóa ngay lập tức.
                  </span>
                </div>
              )}

              <fieldset className="space-y-2">
                <legend className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Chọn hình thức cấp lại
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`cursor-pointer rounded-2xl border p-3 text-xs font-bold transition-colors ${
                      mode === "temp"
                        ? "border-amber-500 bg-amber-50/70 text-slate-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pin-reissue-mode"
                      checked={mode === "temp"}
                      onChange={() => {
                        setMode("temp");
                        setError("");
                      }}
                      className="sr-only"
                    />
                    <span className="block font-black">Cấp PIN tạm 6 số</span>
                    <span className="block text-[11px] font-medium text-slate-500 mt-0.5">
                      Sinh sẵn 6 số để gửi ngay
                    </span>
                  </label>

                  <label
                    className={`cursor-pointer rounded-2xl border p-3 text-xs font-bold transition-colors ${
                      mode === "clear"
                        ? "border-amber-500 bg-amber-50/70 text-slate-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pin-reissue-mode"
                      checked={mode === "clear"}
                      onChange={() => {
                        setMode("clear");
                        setError("");
                      }}
                      className="sr-only"
                    />
                    <span className="block font-black">Để nhân viên tự đặt</span>
                    <span className="block text-[11px] font-medium text-slate-500 mt-0.5">
                      Xóa PIN cũ &amp; mở khóa
                    </span>
                  </label>
                </div>
              </fieldset>

              {mode === "temp" ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="cap-lai-pin-input"
                      className="text-xs font-black text-slate-700"
                    >
                      Mã PIN tạm cấp cho nhân viên (6 chữ số)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTempPin(generateStrongTempPin());
                        setError("");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 hover:text-amber-800"
                    >
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      Sinh số khác
                    </button>
                  </div>

                  <input
                    id="cap-lai-pin-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    aria-invalid={error ? "true" : "false"}
                    value={tempPin}
                    onChange={(e) => {
                      setTempPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (error) setError("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center font-mono text-xl font-black tracking-[0.35em] text-slate-900 outline-none focus:border-amber-500 tabular-nums"
                  />

                  <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireChange}
                      onChange={(e) => setRequireChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-amber-500"
                    />
                    <span>
                      Bắt buộc nhân viên tự đặt mã PIN cá nhân mới ngay sau khi nhập mã tạm này
                    </span>
                  </label>
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-600 leading-relaxed">
                  Thao tác này xóa mã PIN cũ và gỡ mọi trạng thái khóa ngay lập tức. Khi nhân viên mở lại app, màn hình sẽ hiện mục <strong>Thiết lập mã PIN</strong> mới (nhập 2 lần).
                </p>
              )}

              {error && (
                <p role="alert" className="text-xs font-bold text-rose-600">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-[44px] px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors disabled:opacity-50"
                >
                  {busy
                    ? "Đang xử lý..."
                    : mode === "temp"
                      ? "Xác nhận cấp PIN tạm"
                      : "Xác nhận mở khóa & xóa PIN"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </dialog>
  );
}

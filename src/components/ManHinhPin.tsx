import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Delete,
  KeyRound,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { isWeakPin } from "../lib/pin";

export type PinScreenMode = "nhap" | "dat" | "khoa" | "mang";
export type PinStageState = "idle" | "verify" | "ok" | "sai";

interface Props {
  email: string;
  /** Tên hiển thị của chủ tài khoản để chào mừng khi mở khóa PIN thành công. */
  displayName?: string;
  mode: PinScreenMode;
  isResetRecovery?: boolean;
  /** True khi người dùng vừa nhập đúng PIN tạm do quản trị cấp và cần đặt PIN cá nhân mới. */
  isTempChange?: boolean;
  pinStage: PinStageState;
  /** Hiệu ứng thoát mờ nhẹ ở cuối giây chào mừng trước khi vào app chính. */
  pinLeaving?: boolean;
  pinBusy: boolean;
  pinError: string;
  failsRemaining?: number;
  offlineHint?: string;
  onClearError: () => void;
  onVerifyPin: (pin: string) => void;
  onCreatePin: (pin: string, confirmPin: string) => void;
  onForgotPin: () => void;
  onRetryNetwork: () => void;
  onLogout: () => void;
}

const DOT_OFFSETS = [-55, -33, -11, 11, 33, 55];
const DOT_ANGLES = [0, 60, 120, 180, 240, 300];
const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

const cssVar = (vars: Record<string, string | number>): CSSProperties =>
  vars as CSSProperties;

const vibrateError = () => {
  try {
    globalThis.navigator?.vibrate?.([35, 30, 50]);
  } catch {
    // Bo qua tren thiet bi khong ho tro rung
  }
};

/**
 * Màn hình khóa PIN 6 số — đồng bộ cơ chế bảo mật với app Kiểm kê F&B:
 * luôn hỏi lại mỗi lần mở/tải lại trang, chặn vào app khi mất mạng,
 * khóa sau 5 lần sai (lưu trên máy chủ) và 6 chấm quỹ đạo chuyển động khi xác thực.
 */
export default function ManHinhPin({
  email,
  displayName,
  mode,
  isResetRecovery = false,
  isTempChange = false,
  pinStage,
  pinLeaving = false,
  pinBusy,
  pinError,
  failsRemaining,
  offlineHint,
  onClearError,
  onVerifyPin,
  onCreatePin,
  onForgotPin,
  onRetryNetwork,
  onLogout,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef("");
  const [step, setStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState("");
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState("");
  const [localSai, setLocalSai] = useState(false);
  const [confirmForgot, setConfirmForgot] = useState(false);

  const isInputMode = mode === "nhap" || mode === "dat";
  const needsSetup = mode === "dat";
  const locked = !isInputMode || pinBusy || pinStage === "verify" || pinStage === "ok";
  const effectiveStage: PinStageState =
    pinStage !== "idle" ? pinStage : localSai ? "sai" : "idle";
  const displayError = pinError || localError;
  const errorId = "skb-pin-error";

  const setPinValueSynced = (next: string) => {
    valueRef.current = next;
    setValue(next);
  };

  // Reset nhập liệu khi đổi chế độ (nhap / dat / khoa / mang)
  useEffect(() => {
    setStep(1);
    setFirstPin("");
    setPinValueSynced("");
    setLocalError("");
    setLocalSai(false);
    setConfirmForgot(false);
  }, [mode, isResetRecovery, isTempChange]);

  useEffect(() => {
    if (pinStage === "sai") {
      vibrateError();
      const id = window.setTimeout(() => {
        setPinValueSynced("");
        if (needsSetup && step === 2) {
          setStep(1);
          setFirstPin("");
        }
      }, 420);
      return () => window.clearTimeout(id);
    }
  }, [pinStage, needsSetup, step]);

  // Hỗ trợ gõ trực tiếp trên bàn phím máy tính (0–9, Backspace, Escape) và dán 6 số PIN tạm.
  // KHÔNG dùng <form>/<input type="password"> ẩn để tránh Chrome/Edge tự điền mật khẩu đã lưu!
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (locked) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        if (valueRef.current.length < 6) {
          handleDigitsChange(valueRef.current + e.key);
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDigitsChange(valueRef.current.slice(0, -1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleDigitsChange("");
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (locked) return;
      const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "");
      if (pasted.length === 6) {
        e.preventDefault();
        handleDigitsChange(pasted);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  });

  const triggerLocalError = (msg: string) => {
    vibrateError();
    setLocalError(msg);
    setLocalSai(true);
    window.setTimeout(() => {
      setLocalSai(false);
      setPinValueSynced("");
    }, 440);
  };

  const submitCompletedPin = (digits: string) => {
    if (mode === "nhap") {
      setPinValueSynced("");
      onVerifyPin(digits);
      return;
    }
    if (mode !== "dat") return;

    if (step === 1) {
      if (isWeakPin(digits)) {
        triggerLocalError("Mã PIN quá dễ đoán (số lặp hoặc liên tiếp). Chọn 6 số khác nhé.");
        return;
      }
      setFirstPin(digits);
      setPinValueSynced("");
      setStep(2);
      setLocalError("");
      setLocalSai(false);
      return;
    }

    // Bước 2 của thiết lập mới: đối chiếu khớp trước khi băm 310k + muối lưu Firestore
    if (digits !== firstPin) {
      triggerLocalError("Hai lần nhập chưa khớp nhau. Nhập lại lần 2 nhé.");
      return;
    }
    const pinCopy = firstPin;
    setFirstPin("");
    setPinValueSynced("");
    onCreatePin(pinCopy, digits);
  };

  const handleDigitsChange = (raw: string) => {
    if (locked) return;
    const cleaned = raw.replace(/\D/g, "").slice(0, 6);
    if (localError) setLocalError("");
    if (localSai) setLocalSai(false);
    if (pinError) onClearError();
    setPinValueSynced(cleaned);

    if (cleaned.length === 6) {
      submitCompletedPin(cleaned);
    }
  };

  const handlePadPress = (key: (typeof KEYPAD_KEYS)[number]) => {
    if (locked) return;
    if (key === "clear") {
      handleDigitsChange("");
    } else if (key === "back") {
      handleDigitsChange(valueRef.current.slice(0, -1));
    } else {
      handleDigitsChange(valueRef.current + key);
    }
  };

  const titleText =
    mode === "mang"
      ? "Chưa kết nối mạng"
      : mode === "khoa"
        ? "Mã PIN đang bị khóa"
        : needsSetup
          ? step === 1
            ? isTempChange
              ? "Đổi mã PIN cá nhân mới"
              : isResetRecovery
                ? "Đặt mã PIN mới"
                : "Thiết lập mã PIN"
            : "Xác nhận lại mã PIN"
          : "Nhập mã PIN";

  const subtitleText =
    mode === "mang"
      ? offlineHint ||
        "Mở app cần có mạng để kiểm tra mã PIN. Vui lòng kết nối Wi-Fi hoặc 4G rồi thử lại."
      : mode === "khoa"
        ? "Nhập sai 5 lần liên tiếp. Cần đăng nhập lại bằng Google để đặt lại mã PIN mới."
        : needsSetup
          ? step === 1
            ? isTempChange
              ? "Bạn đang dùng mã PIN tạm do quản trị cấp — chọn 6 chữ số riêng của bạn"
              : isResetRecovery
                ? "Xác thực Google thành công — chọn 6 chữ số PIN mới"
                : "Đặt 6 chữ số bảo vệ cho tài khoản của anh/chị"
            : "Nhập lại đúng 6 chữ số vừa đặt"
          : pinStage === "verify"
            ? "Đang xác thực & chuẩn bị dữ liệu..."
            : pinStage === "ok"
              ? "Dữ liệu làm việc đã sẵn sàng"
              : typeof failsRemaining === "number" && failsRemaining > 0 && failsRemaining < 5
                ? `Còn ${failsRemaining} lần thử trước khi khóa PIN`
                : "Mỗi lần mở hoặc tải lại trang đều cần nhập PIN";

  return (
    <div className="pin-backdrop relative min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 font-sans text-white overflow-hidden">
      {/* Lưới tọa độ mờ + 2 vòng quỹ đạo đồng bộ màn hình đăng nhập */}
      <div aria-hidden="true" className="dn-ambient-grid pointer-events-none fixed inset-0 z-0 opacity-60" />

      <div className="dn-card-wrap relative z-10 w-full max-w-[396px]">
        <div aria-hidden="true" className="pointer-events-none absolute -inset-16 overflow-visible">
          <div className="dn-ring dn-ring-1" />
          <div className="dn-ring dn-ring-2" />
        </div>

        <div className={`dn-khung-ao dn-anim-khung relative ${pinLeaving ? "dn-leaving" : ""}`}>
          <div aria-hidden="true" className="dn-vien-toa" />
          <div aria-hidden="true" className="dn-vien-chay" />

          <section
            aria-label="Khóa mã PIN"
            className="dn-khung-dang-nhap relative z-20 px-6 pb-6 pt-6 text-center sm:px-7"
          >
            {/* Header nhỏ & Email tài khoản */}
            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
              {mode === "mang" ? (
                <WifiOff className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              ) : mode === "khoa" ? (
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-[#f7c948]" aria-hidden="true" />
              )}
              <span className="max-w-[230px] truncate">{email}</span>
            </div>

            <h2 className="dn-card-title text-[22px] font-semibold tracking-tight text-[#fefce8]">
              {titleText}
            </h2>
            <p className="mt-1 text-[12.5px] font-medium text-white/65 leading-relaxed">
              {subtitleText}
            </p>

            {mode === "mang" ? (
              <div className="mt-6 space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                  <WifiOff className="h-8 w-8" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  disabled={pinBusy}
                  onClick={onRetryNetwork}
                  className="dn-nut-google w-full text-[13px] disabled:opacity-60"
                >
                  <span className="dn-gicon">
                    <RefreshCw className={`h-4 w-4 text-[#b45309] ${pinBusy ? "animate-spin" : ""}`} aria-hidden="true" />
                  </span>
                  <span className="text-center font-extrabold text-[#231303]">
                    {pinBusy ? "Đang kiểm tra mạng..." : "Thử lại kết nối"}
                  </span>
                  <span className="w-5" aria-hidden="true" />
                </button>
              </div>
            ) : mode === "khoa" ? (
              <div className="mt-5 space-y-3.5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/15 text-rose-300">
                  <ShieldAlert className="h-8 w-8" aria-hidden="true" />
                </div>
                {displayError ? (
                  <p role="alert" className="text-[12px] font-semibold text-rose-300">
                    {displayError}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={pinBusy}
                  onClick={onForgotPin}
                  className="dn-nut-google w-full text-[13px] disabled:opacity-60"
                >
                  <span className="dn-gicon">
                    <KeyRound className="h-4 w-4 text-[#b45309]" aria-hidden="true" />
                  </span>
                  <span className="text-center font-extrabold text-[#231303]">
                    Đăng nhập lại Google để cấp PIN mới
                  </span>
                  <span className="w-5" aria-hidden="true" />
                </button>
                <p className="text-[11px] leading-relaxed text-white/55">
                  Hoặc liên hệ Chủ sở hữu để mở khóa & cấp mã PIN tạm 6 số trong Cài đặt.
                </p>
              </div>
            ) : (
              /* Sân khấu 6 chấm tròn chuyển quỹ đạo xoay + bàn phím số kính chạm */
              <div className="mt-2">
                <div
                  ref={stageRef}
                  tabIndex={locked ? -1 : 0}
                  role="group"
                  aria-label={`${titleText}: đã nhập ${value.length} trên 6 chữ số`}
                  aria-describedby={displayError ? errorId : undefined}
                  onClick={() => stageRef.current?.focus()}
                  className={`pin-stage outline-none ${effectiveStage === "idle" ? "" : effectiveStage}`}
                >
                  <div aria-hidden="true" className="pin-ring" />
                  <div aria-hidden="true" className="pin-core" />
                  <div aria-hidden="true" className="pin-dots">
                    {DOT_OFFSETS.map((x, idx) => (
                      <i
                        key={idx}
                        className={idx < value.length ? "on" : undefined}
                        style={cssVar({
                          "--x": `${x}px`,
                          "--a": `${DOT_ANGLES[idx]}deg`,
                          "--k": idx,
                        })}
                      />
                    ))}
                  </div>
                  <div aria-hidden="true" className="pin-ok">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                      <path
                        pathLength={1}
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pin-ok-path"
                      />
                    </svg>
                  </div>
                  {pinStage === "ok" && (
                    <div className="pin-welcome" aria-live="polite">
                      <span className="pin-welcome-label">Xin chào</span>
                      <span className="pin-welcome-name">
                        {displayName?.trim() || email.split("@")[0] || "bạn"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Thông báo lỗi hoặc quay lại bước 1 */}
                <div aria-live="polite" className="min-h-[24px] mb-2 flex items-center justify-center">
                  {displayError ? (
                    <p
                      id={errorId}
                      role="alert"
                      className="dn-anim-loi inline-flex items-center gap-1.5 text-[12px] font-bold text-rose-300"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{displayError}</span>
                    </p>
                  ) : needsSetup && step === 2 ? (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStep(1);
                        setFirstPin("");
                        setPinValueSynced("");
                        setLocalError("");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300/90 hover:text-amber-200 transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                      Đổi lại mã PIN bước 1
                    </button>
                  ) : null}
                </div>

                {/* Bàn phím số kính chạm 3x4 */}
                <div className="pin-pad mt-1">
                  {KEYPAD_KEYS.map((key) => {
                    if (key === "clear") {
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={locked || value.length === 0}
                          onClick={() => handlePadPress("clear")}
                          className="pin-k text-[12px] font-bold uppercase tracking-wider text-white/60 disabled:opacity-35"
                        >
                          Xoá
                        </button>
                      );
                    }
                    if (key === "back") {
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-label="Xoá một chữ số"
                          disabled={locked || value.length === 0}
                          onClick={() => handlePadPress("back")}
                          className="pin-k text-white/80 disabled:opacity-35"
                        >
                          <Delete className="h-5 w-5" aria-hidden="true" />
                        </button>
                      );
                    }
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={locked}
                        onClick={() => handlePadPress(key)}
                        className="pin-k tabular-nums"
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nút cấp lại khi quên PIN & đổi tài khoản Google */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col items-center gap-2">
              {mode === "nhap" && !confirmForgot && (
                <button
                  type="button"
                  disabled={pinBusy}
                  onClick={() => setConfirmForgot(true)}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-full border border-amber-300/30 bg-amber-400/12 text-[11.5px] font-bold text-amber-200 hover:bg-amber-400/20 hover:text-amber-100 transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Quên mã PIN? Cấp lại qua Google
                </button>
              )}

              {mode === "nhap" && confirmForgot && (
                <div className="w-full rounded-xl border border-amber-300/25 bg-amber-500/12 px-3 py-2.5 text-[11.5px] text-amber-100 space-y-2">
                  <p className="font-semibold leading-snug">
                    Đăng xuất và đăng nhập lại bằng Google để cấp mã PIN 6 số mới?
                  </p>
                  <p className="text-[10.5px] text-white/65 leading-snug">
                    Hoặc liên hệ Chủ sở hữu để được cấp mã PIN tạm trong mục Cài đặt.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmForgot(false);
                        onForgotPin();
                      }}
                      className="min-h-[36px] rounded-lg bg-amber-400/30 hover:bg-amber-400/40 border border-amber-300/40 px-3.5 py-1 font-bold text-amber-50 transition-colors"
                    >
                      Xác nhận cấp lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmForgot(false)}
                      className="min-h-[36px] rounded-lg bg-white/10 hover:bg-white/15 px-3.5 py-1 font-semibold text-white/80 transition-colors"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-full text-[11px] font-bold text-white/60 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Đăng xuất · đổi tài khoản khác
              </button>
            </div>
          </section>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-300/75" aria-hidden="true" />
            Khóa mỗi lần mở app
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-300/75" aria-hidden="true" />
            Băm PBKDF2 310k + muối
          </span>
        </div>
      </div>
    </div>
  );
}

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Delete, Lock, LogOut, ShieldCheck } from "lucide-react";

export type PinStageState = "idle" | "verify" | "ok" | "sai";

interface Props {
  email: string;
  needsSetup: boolean;
  pinStage: PinStageState;
  pinBusy: boolean;
  pinError: string;
  onClearError: () => void;
  onVerifyPin: (pin: string) => void;
  onCreatePin: (pin: string, confirmPin: string) => void;
  onLogout: () => void;
}

const DOT_OFFSETS = [-55, -33, -11, 11, 33, 55];
const DOT_ANGLES = [0, 60, 120, 180, 240, 300];
const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

const cssVar = (vars: Record<string, string | number>): CSSProperties =>
  vars as CSSProperties;

/**
 * Màn hình khóa PIN 6 số — thiết kế đồng bộ theo app Kiểm kê F&B:
 * 6 chấm quỹ đạo bay xoay khi xác thực, vẽ tích xanh khi mở khóa, rung khi sai,
 * kèm bàn phím số kính chạm êm & hỗ trợ gõ phím cứng trực tiếp 0–9 / Backspace.
 */
export default function ManHinhPin({
  email,
  needsSetup,
  pinStage,
  pinBusy,
  pinError,
  onClearError,
  onVerifyPin,
  onCreatePin,
  onLogout,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef("");
  const [step, setStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState("");
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState("");
  const [localSai, setLocalSai] = useState(false);

  const locked = pinBusy || pinStage === "verify" || pinStage === "ok";
  const effectiveStage: PinStageState =
    pinStage !== "idle" ? pinStage : localSai ? "sai" : "idle";
  const displayError = pinError || localError;

  const setPinValueSynced = (next: string) => {
    valueRef.current = next;
    setValue(next);
  };

  // Reset nhập liệu khi chuyển chế độ setup <-> unlock hoặc khi sai PIN từ server
  useEffect(() => {
    setStep(1);
    setFirstPin("");
    setPinValueSynced("");
    setLocalError("");
    setLocalSai(false);
  }, [needsSetup]);

  useEffect(() => {
    if (pinStage === "sai") {
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

  // Hỗ trợ gõ trực tiếp trên bàn phím máy tính kể cả sau khi bấm nút trên màn hình
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (locked) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" && e.target === inputRef.current) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleDigitsChange(valueRef.current + e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDigitsChange(valueRef.current.slice(0, -1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleDigitsChange("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const triggerLocalError = (msg: string) => {
    setLocalError(msg);
    setLocalSai(true);
    window.setTimeout(() => {
      setLocalSai(false);
      setPinValueSynced("");
    }, 440);
  };

  const submitCompletedPin = (digits: string) => {
    if (!needsSetup) {
      onVerifyPin(digits);
      return;
    }

    if (step === 1) {
      if (/^(\d)\1{5}$/.test(digits) || digits === "123456" || digits === "654321") {
        triggerLocalError("Mã PIN quá dễ đoán. Anh/chị chọn 6 số khác nhé.");
        return;
      }
      setFirstPin(digits);
      setPinValueSynced("");
      setStep(2);
      setLocalError("");
      setLocalSai(false);
      return;
    }

    // Bước 2 của thiết lập mới: đối chiếu khớp trước khi băm lưu Firestore
    if (digits !== firstPin) {
      triggerLocalError("Hai lần nhập chưa khớp nhau. Nhập lại lần 2 nhé.");
      return;
    }
    onCreatePin(firstPin, digits);
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

  const titleText = needsSetup
    ? step === 1
      ? "Thiết lập mã PIN"
      : "Xác nhận lại mã PIN"
    : "Nhập mã PIN";

  const subtitleText = needsSetup
    ? step === 1
      ? "Đặt 6 chữ số bảo vệ khi dùng máy chung"
      : "Nhập lại đúng 6 chữ số vừa đặt"
    : pinStage === "verify"
      ? "Đang kiểm tra mã PIN..."
      : pinStage === "ok"
        ? "Mở khóa thành công"
        : "Lớp bảo vệ thứ 2 cho tài khoản";

  return (
    <div className="pin-backdrop relative min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 font-sans text-white overflow-hidden">
      {/* Lưới tọa độ mờ + 2 vòng quỹ đạo đồng bộ màn hình đăng nhập */}
      <div aria-hidden="true" className="dn-ambient-grid pointer-events-none fixed inset-0 z-0 opacity-60" />

      <div className="dn-card-wrap relative z-10 w-full max-w-[396px]">
        <div aria-hidden="true" className="pointer-events-none absolute -inset-16 overflow-visible">
          <div className="dn-ring dn-ring-1" />
          <div className="dn-ring dn-ring-2" />
        </div>

        <div className={`dn-khung-ao dn-anim-khung relative ${pinStage === "ok" ? "dn-leaving" : ""}`}>
          <div aria-hidden="true" className="dn-vien-toa" />
          <div aria-hidden="true" className="dn-vien-chay" />

          <section
            aria-label="Khóa mã PIN"
            className="dn-khung-dang-nhap relative z-20 px-6 pb-6 pt-6 text-center sm:px-7"
          >
            {/* Header nhỏ & Email tài khoản */}
            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
              <Lock className="h-3.5 w-3.5 text-[#f7c948]" aria-hidden="true" />
              <span className="max-w-[230px] truncate">{email}</span>
            </div>

            <h2 className="dn-card-title text-[22px] font-semibold tracking-tight text-[#fefce8]">
              {titleText}
            </h2>
            <p className="mt-1 text-[12.5px] font-medium text-white/65">
              {subtitleText}
            </p>

            {/* Sân khấu 6 chấm tròn chuyển quỹ đạo xoay khi xác thực */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (value.length === 6 && !locked) submitCompletedPin(value);
              }}
              className="mt-2"
            >
              <label htmlFor="skb-pin-input" className="sr-only">
                {titleText} (6 chữ số)
              </label>
              <input
                ref={inputRef}
                id="skb-pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                maxLength={6}
                autoFocus
                disabled={locked}
                value={value}
                onChange={(e) => handleDigitsChange(e.target.value)}
                className="sr-only"
              />

              <div
                onClick={() => inputRef.current?.focus()}
                className={`pin-stage cursor-text ${effectiveStage === "idle" ? "" : effectiveStage}`}
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
              </div>

              {/* Thông báo lỗi */}
              <div aria-live="polite" className="min-h-[24px] mb-2 flex items-center justify-center">
                {displayError ? (
                  <p role="alert" className="dn-anim-loi inline-flex items-center gap-1.5 text-[12px] font-bold text-rose-300">
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
            </form>

            {/* Nút đổi tài khoản Google & ghi chú quên PIN */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white/55 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Đăng xuất · đổi tài khoản khác
              </button>
              {!needsSetup && (
                <p className="text-[11px] text-white/40">
                  Quên mã PIN? Liên hệ quản trị viên để đặt lại.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-300/75" aria-hidden="true" />
            Khóa phiên máy dùng chung
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-300/75" aria-hidden="true" />
            Băm PBKDF2-SHA256
          </span>
        </div>
      </div>
    </div>
  );
}

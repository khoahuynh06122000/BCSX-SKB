import { type FormEvent, useState } from "react";
import { Check, KeyRound, Lock } from "lucide-react";
import type { UserProfile } from "../types";
import {
  generatePinSalt,
  hashPin,
  isValidPinFormat,
  isWeakPin,
  verifyPin,
} from "../lib/pin";

interface Props {
  profile: UserProfile;
  onSaveNewPin: (
    pinHash: string,
    pinSalt: string,
    pinUpdatedAt: string,
  ) => Promise<void>;
}

/**
 * Thẻ đổi mã PIN cá nhân nằm trong modal "Thông tin tài khoản":
 * cho phép mọi tài khoản đang đăng nhập tự đổi PIN 6 số chủ động bất kỳ lúc nào.
 */
export default function DoiPinCaNhanCard({ profile, onSaveNewPin }: Props) {
  const [open, setOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedOk, setSavedOk] = useState(false);

  const resetFields = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setSavedOk(false);

    if (profile.pinHash) {
      if (!isValidPinFormat(currentPin)) {
        setError("Nhập đúng 6 chữ số mã PIN hiện tại.");
        return;
      }
      const match = await verifyPin(
        currentPin,
        profile.uid,
        profile.pinHash,
        profile.pinSalt,
      );
      if (!match) {
        setError("Mã PIN hiện tại chưa đúng.");
        return;
      }
    }

    if (!isValidPinFormat(newPin)) {
      setError("Mã PIN mới phải gồm đúng 6 chữ số.");
      return;
    }
    if (isWeakPin(newPin)) {
      setError("Mã PIN quá dễ đoán (số lặp hoặc liên tiếp). Chọn 6 số khác nhé.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Hai lần nhập mã PIN mới chưa khớp.");
      return;
    }

    setBusy(true);
    try {
      const salt = generatePinSalt();
      const hash = await hashPin(newPin, profile.uid, salt);
      await onSaveNewPin(hash, salt, new Date().toISOString());
      resetFields();
      setOpen(false);
      setSavedOk(true);
      window.setTimeout(() => setSavedOk(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Không đổi được mã PIN.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl border border-amber-200/80 bg-amber-50/50 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-black text-amber-900 uppercase tracking-wider">
              Mã PIN khóa màn hình (6 số)
            </p>
            <p className="text-[11px] font-bold text-amber-800/75 mt-0.5">
              {savedOk ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  Đã cập nhật mã PIN mới thành công
                </span>
              ) : profile.pinHash ? (
                "Đang bật bảo vệ 310k PBKDF2 — hỏi lại mỗi lần mở/F5"
              ) : (
                "Chưa cài mã PIN"
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            resetFields();
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-amber-200 hover:border-amber-400 text-[11px] font-black text-amber-800 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          {open ? "Đóng" : profile.pinHash ? "Đổi mã PIN" : "Đặt mã PIN"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-2.5 pt-2 border-t border-amber-200/70">
          {profile.pinHash && (
            <div>
              <label
                htmlFor="self-pin-old"
                className="block text-[10px] font-black uppercase tracking-wider text-amber-900/75 mb-1"
              >
                Mã PIN hiện tại
              </label>
              <input
                id="self-pin-old"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={currentPin}
                onChange={(e) => {
                  setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (error) setError("");
                }}
                placeholder="••••••"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-mono font-bold tracking-[0.3em] text-slate-900 outline-none focus:border-amber-500 tabular-nums"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="self-pin-new"
                className="block text-[10px] font-black uppercase tracking-wider text-amber-900/75 mb-1"
              >
                Mã PIN mới (6 số)
              </label>
              <input
                id="self-pin-new"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (error) setError("");
                }}
                placeholder="••••••"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-mono font-bold tracking-[0.3em] text-slate-900 outline-none focus:border-amber-500 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="self-pin-confirm"
                className="block text-[10px] font-black uppercase tracking-wider text-amber-900/75 mb-1"
              >
                Nhập lại PIN mới
              </label>
              <input
                id="self-pin-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (error) setError("");
                }}
                placeholder="••••••"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-mono font-bold tracking-[0.3em] text-slate-900 outline-none focus:border-amber-500 tabular-nums"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-[11px] font-bold text-rose-600">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-0.5">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-colors disabled:opacity-50"
            >
              {busy ? "Đang lưu..." : "Lưu mã PIN mới"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * Băm mã PIN trước khi lưu.
 *
 * KHÔNG BAO GIỜ lưu mã PIN dạng số thật.
 *
 * Dùng PBKDF2-SHA256 với 310.000 vòng lặp + muối ngẫu nhiên 16 bytes theo người
 * dùng (giữ tương thích ngược 200.000 vòng cho tài khoản chưa có pinSalt).
 */

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_ITERATIONS = 310_000;
export const PIN_LEGACY_ITERATIONS = 200_000;
export const PIN_RESET_INTENT_TTL_MS = 15 * 60 * 1000;

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Sinh chuỗi muối ngẫu nhiên 16 bytes dạng hex (32 ký tự). */
export function generatePinSalt(): string {
  const buf = new Uint8Array(16);
  globalThis.crypto.getRandomValues(buf);
  return toHex(buf);
}

export async function hashPin(
  pin: string,
  uid: string,
  salt?: string | null,
): Promise<string> {
  const enc = new TextEncoder();
  const cleanSalt = typeof salt === 'string' && salt.trim().length > 0 ? salt.trim() : null;

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(
        cleanSalt ? `skb-pin-v2:${cleanSalt}:${uid}` : `bialogistics-pin-v1:${uid}`,
      ),
      iterations: cleanSalt ? PIN_ITERATIONS : PIN_LEGACY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return toHex(bits);
}

/** So sánh theo kiểu chống dò thời gian phản hồi. */
export async function verifyPin(
  pin: string,
  uid: string,
  storedHash: string,
  salt?: string | null,
): Promise<boolean> {
  if (!storedHash || !isValidPinFormat(pin)) return false;
  const computed = await hashPin(pin, uid, salt);
  if (computed.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Chặn các dãy PIN quá dễ đoán (giống chuẩn app Kiểm kê):
 * 6 số giống nhau (000000, 111111...) hoặc 6 số tăng/giảm liên tiếp (123456, 654321...).
 */
export function isWeakPin(pin: string): boolean {
  if (!isValidPinFormat(pin)) return true;
  if (/^(\d)\1{5}$/.test(pin)) return true;
  return '0123456789'.includes(pin) || '9876543210'.includes(pin);
}

/** Sinh mã PIN tạm 6 chữ số ngẫu nhiên an toàn (không lặp hoặc liên tiếp). */
export function generateStrongTempPin(): string {
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    const candidate = String(buf[0] % 1_000_000).padStart(6, '0');
    if (!isWeakPin(candidate)) return candidate;
  }
}

/**
 * Tên khóa cũ từng lưu trạng thái mở khóa theo tab.
 * Từ bản siết bảo mật: LUÔN xóa khóa này mỗi lần tải trang — KHÔNG tự mở khóa sau F5.
 */
export const PIN_SESSION_KEY = 'bt_pin_unlocked';
export const PIN_RESET_INTENT_KEY = 'skb_pin_reset_intent';

/** Xóa sạch mọi dấu vết mở khóa PIN cũ trên trình duyệt. */
export function clearLegacyPinStorage(): void {
  try {
    globalThis.sessionStorage?.removeItem(PIN_SESSION_KEY);
  } catch {
    // Bo qua trong moi truong khong co sessionStorage
  }
  try {
    globalThis.localStorage?.removeItem(PIN_SESSION_KEY);
  } catch {
    // Bo qua trong moi truong khong co localStorage
  }
}

export function savePinResetIntent(uid: string, email?: string): void {
  try {
    globalThis.localStorage?.setItem(
      PIN_RESET_INTENT_KEY,
      JSON.stringify({ uid, email: email || '', ts: Date.now() }),
    );
  } catch {
    // Bo qua neu trinh duyet chan storage
  }
}

export function getActivePinResetHint(now = Date.now()): { uid: string; email: string } | null {
  try {
    const raw = globalThis.localStorage?.getItem(PIN_RESET_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: string; email?: string; ts?: number };
    if (!parsed || typeof parsed.uid !== 'string' || typeof parsed.ts !== 'number') {
      return null;
    }
    if (now - parsed.ts < 0 || now - parsed.ts > PIN_RESET_INTENT_TTL_MS) {
      return null;
    }
    return { uid: parsed.uid, email: parsed.email || '' };
  } catch {
    return null;
  }
}

export function hasPinResetIntentFor(uid: string, now = Date.now()): boolean {
  const active = getActivePinResetHint(now);
  return Boolean(active && active.uid === uid);
}

export function clearPinResetIntent(): void {
  try {
    globalThis.localStorage?.removeItem(PIN_RESET_INTENT_KEY);
  } catch {
    // Bo qua neu khong co localStorage
  }
}

/**
 * Bam ma PIN truoc khi luu.
 *
 * KHONG BAO GIO luu ma PIN dang so that. Ban cu cua app luu thang "061220"
 * vao Firestore nen ai doc duoc tai lieu la biet PIN.
 *
 * Dung PBKDF2-SHA256 voi 200.000 vong lap: PIN chi co 6 chu so (1 trieu to
 * hop) nen neu bam mot vong don gian thi do het chi mat vai giay. Voi 200.000
 * vong, moi lan thu mat vai phan tram giay, do het 1 trieu to hop se mat
 * nhieu ngay - du de ngan trong boi canh nay.
 *
 * Muoi (salt) lay theo uid cua tung nguoi, nen hai nguoi dat cung mot PIN se
 * cho ra hai chuoi bam khac nhau.
 */

const ITERATIONS = 200_000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPin(pin: string, uid: string): Promise<string> {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      // Them tien to co dinh de muoi khong trung voi du lieu khac
      salt: enc.encode('bialogistics-pin-v1:' + uid),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return toHex(bits);
}

/** So sanh theo kieu chong do thoi gian phan hoi. */
export async function verifyPin(
  pin: string,
  uid: string,
  storedHash: string,
): Promise<boolean> {
  const computed = await hashPin(pin, uid);
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

/** Khoa danh dau da mo khoa PIN trong phien lam viec cua tab hien tai. */
export const PIN_SESSION_KEY = 'bt_pin_unlocked';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Bảng tra CRC-32, dựng một lần rồi dùng lại. */
const BANG = (() => {
  const b = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    b[i] = c >>> 0;
  }
  return b;
})();

/** CRC-32 theo chuẩn ZIP. */
export function crc32(du: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < du.length; i++) c = BANG[(c ^ du[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

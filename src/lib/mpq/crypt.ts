/** StormLib-compatible MPQ hash/crypt table. */

export const HASH_TABLE_INDEX = 0;
export const HASH_NAME_A = 1;
export const HASH_NAME_B = 2;
export const HASH_FILE_KEY = 3;

const cryptTable = (() => {
  const table = new Uint32Array(0x500);
  let seed = 0x00100001;
  for (let i = 0; i < 0x100; i++) {
    for (let j = 0; j < 5; j++) {
      seed = (Math.imul(seed, 125) + 3) % 0x2aaaab;
      const a = (seed & 0xffff) << 16;
      seed = (Math.imul(seed, 125) + 3) % 0x2aaaab;
      const b = seed & 0xffff;
      table[i + j * 0x100] = (a | b) >>> 0;
    }
  }
  return table;
})();

function toMpqBytes(name: string): Uint8Array {
  const normalized = name.replace(/\//g, "\\").toUpperCase();
  const out = new Uint8Array(normalized.length);
  for (let i = 0; i < normalized.length; i++) {
    out[i] = normalized.charCodeAt(i) & 0xff;
  }
  return out;
}

export function hashString(name: string, type: number): number {
  const bytes = toMpqBytes(name);
  let seed1 = 0x7fed7fed;
  let seed2 = 0xeeeeeeee;
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes[i]!;
    seed1 = (cryptTable[type * 0x100 + ch]! ^ ((seed1 + seed2) >>> 0)) >>> 0;
    seed2 = (ch + seed1 + seed2 + ((seed2 << 5) >>> 0) + 3) >>> 0;
  }
  return seed1 >>> 0;
}

export function decryptBlock(data: Uint8Array, key: number): Uint8Array {
  const out = data.slice();
  let seed = 0xeeeeeeee;
  let k = key >>> 0;
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const n = (out.length >> 2) << 2;
  for (let i = 0; i < n; i += 4) {
    seed = (seed + cryptTable[0x400 + (k & 0xff)]!) >>> 0;
    let val = view.getUint32(i, true);
    val = (val ^ ((k + seed) >>> 0)) >>> 0;
    view.setUint32(i, val, true);
    k = (((~k << 21) + 0x11111111) | (k >>> 11)) >>> 0;
    seed = (val + seed + ((seed << 5) >>> 0) + 3) >>> 0;
  }
  return out;
}

export function encryptBlock(data: Uint8Array, key: number): Uint8Array {
  const out = data.slice();
  let seed = 0xeeeeeeee;
  let k = key >>> 0;
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const n = (out.length >> 2) << 2;
  for (let i = 0; i < n; i += 4) {
    seed = (seed + cryptTable[0x400 + (k & 0xff)]!) >>> 0;
    const orig = view.getUint32(i, true);
    const val = (orig ^ ((k + seed) >>> 0)) >>> 0;
    view.setUint32(i, val, true);
    k = (((~k << 21) + 0x11111111) | (k >>> 11)) >>> 0;
    seed = (orig + seed + ((seed << 5) >>> 0) + 3) >>> 0;
  }
  return out;
}

export function fileKey(fileName: string, filePos: number, fileSize: number, fixKey: boolean): number {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  let key = hashString(base, HASH_FILE_KEY);
  if (fixKey) key = ((key + filePos) ^ fileSize) >>> 0;
  return key;
}

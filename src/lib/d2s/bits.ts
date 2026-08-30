/** LSB-first bit reader/writer matching D2 / D2SSharp. */

export class BitReader {
  readonly data: Uint8Array;
  bit = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  get byte(): number {
    return this.bit >> 3;
  }

  get bitsLeft(): number {
    return this.data.length * 8 - this.bit;
  }

  read(n: number): number {
    if (n <= 0) return 0;
    if (n > 32) throw new Error(`cannot read ${n} bits`);
    let result = 0;
    let got = 0;
    while (got < n) {
      const bi = this.bit >> 3;
      const bo = this.bit & 7;
      if (bi >= this.data.length) throw new Error(`세이브가 아이템 중간에 끝났습니다 (bit ${this.bit})`);
      const avail = 8 - bo;
      const take = Math.min(avail, n - got);
      const mask = (1 << take) - 1;
      const bits = (this.data[bi]! >> bo) & mask;
      result += bits * 2 ** got;
      this.bit += take;
      got += take;
    }
    return result >>> 0;
  }

  readBool(): boolean {
    return this.read(1) === 1;
  }

  readU32(): number {
    return this.read(32);
  }

  readU16(): number {
    return this.read(16);
  }

  readU8(): number {
    return this.read(8);
  }

  align() {
    const rem = this.bit & 7;
    if (rem) this.bit += 8 - rem;
  }

  readString(max = 16): string {
    const chars: number[] = [];
    for (let i = 0; i < max; i++) {
      const c = this.read(8);
      if (c === 0) break;
      chars.push(c);
    }
    return String.fromCharCode(...chars);
  }
}

export class BitWriter {
  private bytes: number[] = [];
  bit = 0;

  write(value: number, n: number) {
    if (n <= 0) return;
    if (n > 32) throw new Error(`cannot write ${n} bits`);
    let v = value >>> 0;
    let left = n;
    while (left > 0) {
      const bi = this.bit >> 3;
      const bo = this.bit & 7;
      while (this.bytes.length <= bi) this.bytes.push(0);
      const avail = 8 - bo;
      const take = Math.min(avail, left);
      const mask = (1 << take) - 1;
      this.bytes[bi] = (this.bytes[bi]! | ((v & mask) << bo)) & 0xff;
      v = Math.floor(v / 2 ** take);
      this.bit += take;
      left -= take;
    }
  }

  writeBool(v: boolean) {
    this.write(v ? 1 : 0, 1);
  }

  writeU32(v: number) {
    this.write(v >>> 0, 32);
  }

  writeU16(v: number) {
    this.write(v & 0xffff, 16);
  }

  writeU8(v: number) {
    this.write(v & 0xff, 8);
  }

  writeString(s: string, max = 16) {
    const n = Math.min(s.length, max - 1);
    for (let i = 0; i < n; i++) this.write(s.charCodeAt(i) & 0xff, 8);
    this.write(0, 8);
  }

  align() {
    const rem = this.bit & 7;
    if (rem) this.write(0, 8 - rem);
  }

  toBytes(): Uint8Array {
    this.align();
    return Uint8Array.from(this.bytes);
  }
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function u32le(data: Uint8Array, off: number): number {
  return (
    (data[off]! |
      (data[off + 1]! << 8) |
      (data[off + 2]! << 16) |
      (data[off + 3]! << 24)) >>>
    0
  );
}

export function writeU32le(data: Uint8Array, off: number, value: number) {
  const v = value >>> 0;
  data[off] = v & 0xff;
  data[off + 1] = (v >>> 8) & 0xff;
  data[off + 2] = (v >>> 16) & 0xff;
  data[off + 3] = (v >>> 24) & 0xff;
}

export function u16le(data: Uint8Array, off: number): number {
  return data[off]! | (data[off + 1]! << 8);
}

export function findMagic(data: Uint8Array, magic: string, from = 0): number {
  const a = magic.charCodeAt(0);
  const b = magic.charCodeAt(1);
  for (let i = from; i + 1 < data.length; i++) {
    if (data[i] === a && data[i + 1] === b) return i;
  }
  return -1;
}

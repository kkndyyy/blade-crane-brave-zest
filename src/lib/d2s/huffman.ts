import type { BitReader, BitWriter } from "./bits.ts";

/** Huffman table from the D2R binary (MSB-first codes). */
const TABLE: { ch: string; bits: number; len: number }[] = [
  { ch: "0", bits: 0b11111011, len: 8 },
  { ch: " ", bits: 0b10, len: 2 },
  { ch: "1", bits: 0b1111100, len: 7 },
  { ch: "2", bits: 0b001100, len: 6 },
  { ch: "3", bits: 0b1101101, len: 7 },
  { ch: "4", bits: 0b11111010, len: 8 },
  { ch: "5", bits: 0b00010110, len: 8 },
  { ch: "6", bits: 0b1101111, len: 7 },
  { ch: "7", bits: 0b01111, len: 5 },
  { ch: "8", bits: 0b000100, len: 6 },
  { ch: "9", bits: 0b01110, len: 5 },
  { ch: "a", bits: 0b11110, len: 5 },
  { ch: "b", bits: 0b0101, len: 4 },
  { ch: "c", bits: 0b01000, len: 5 },
  { ch: "d", bits: 0b110001, len: 6 },
  { ch: "e", bits: 0b110000, len: 6 },
  { ch: "f", bits: 0b010011, len: 6 },
  { ch: "g", bits: 0b11010, len: 5 },
  { ch: "h", bits: 0b00011, len: 5 },
  { ch: "i", bits: 0b1111110, len: 7 },
  { ch: "j", bits: 0b000101110, len: 9 },
  { ch: "k", bits: 0b010010, len: 6 },
  { ch: "l", bits: 0b11101, len: 5 },
  { ch: "m", bits: 0b01101, len: 5 },
  { ch: "n", bits: 0b001101, len: 6 },
  { ch: "o", bits: 0b1111111, len: 7 },
  { ch: "p", bits: 0b11001, len: 5 },
  { ch: "q", bits: 0b11011001, len: 8 },
  { ch: "r", bits: 0b11100, len: 5 },
  { ch: "s", bits: 0b0010, len: 4 },
  { ch: "t", bits: 0b01100, len: 5 },
  { ch: "u", bits: 0b00001, len: 5 },
  { ch: "v", bits: 0b1101110, len: 7 },
  { ch: "w", bits: 0b00000, len: 5 },
  { ch: "x", bits: 0b00111, len: 5 },
  { ch: "y", bits: 0b0001010, len: 7 },
  { ch: "z", bits: 0b11011000, len: 8 },
];

function reverseBits(value: number, length: number): number {
  let result = 0;
  let v = value;
  for (let i = 0; i < length; i++) {
    result = (result << 1) | (v & 1);
    v >>= 1;
  }
  return result;
}

const ENCODE = new Map<string, { bits: number; len: number }>();
const DECODE: Map<number, string>[] = Array.from({ length: 10 }, () => new Map());

for (const row of TABLE) {
  ENCODE.set(row.ch, { bits: reverseBits(row.bits, row.len), len: row.len });
  DECODE[row.len]!.set(row.bits, row.ch);
}

export function decodeItemCode(r: BitReader): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    let code = 0;
    let decoded: string | undefined;
    for (let length = 1; length <= 9; length++) {
      code = (code << 1) | r.read(1);
      decoded = DECODE[length]!.get(code);
      if (decoded !== undefined) break;
    }
    if (decoded === undefined) throw new Error("아이템 코드 허프만 디코드에 실패했습니다");
    out += decoded;
  }
  return out.replace(/ /g, "").replace(/\0/g, "");
}

export function encodeItemCode(w: BitWriter, code: string) {
  const padded = (code + "    ").slice(0, 4);
  for (let i = 0; i < 4; i++) {
    const ch = padded[i]!;
    if (ch === "\0") break;
    const enc = ENCODE.get(ch);
    if (!enc) throw new Error(`허프만에 없는 문자 '${ch}'`);
    w.write(enc.bits, enc.len);
  }
}

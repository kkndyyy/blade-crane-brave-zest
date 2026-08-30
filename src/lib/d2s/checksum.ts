import { u32le, writeU32le } from "./bits.ts";

const CHECKSUM_OFF = 12;

export function computeChecksum(data: Uint8Array): number {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    const b = i >= CHECKSUM_OFF && i < CHECKSUM_OFF + 4 ? 0 : data[i]!;
    checksum = (((checksum << 1) | (checksum >>> 31)) + b) >>> 0;
  }
  return checksum;
}

export function storedChecksum(data: Uint8Array): number {
  return u32le(data, CHECKSUM_OFF);
}

export function verifyChecksum(data: Uint8Array): boolean {
  if (data.length < 16) return false;
  return storedChecksum(data) === computeChecksum(data);
}

export function patchChecksum(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data);
  writeU32le(out, CHECKSUM_OFF, 0);
  writeU32le(out, CHECKSUM_OFF, computeChecksum(out));
  return out;
}

export function patchSizeAndChecksum(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data);
  writeU32le(out, 8, out.length);
  writeU32le(out, CHECKSUM_OFF, 0);
  writeU32le(out, CHECKSUM_OFF, computeChecksum(out));
  return out;
}

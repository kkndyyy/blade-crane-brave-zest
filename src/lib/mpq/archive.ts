import { inflateSync, unzlibSync } from "fflate";
import {
  HASH_FILE_KEY,
  HASH_NAME_A,
  HASH_NAME_B,
  HASH_TABLE_INDEX,
  decryptBlock,
  encryptBlock,
  fileKey,
  hashString,
} from "./crypt.ts";
import { explodePkware } from "./explode.ts";
import { EXCEL, STRINGS } from "../d2/paths.ts";

export const MPQ_FILE_IMPLODE = 0x00000100;
export const MPQ_FILE_COMPRESS = 0x00000200;
export const MPQ_FILE_ENCRYPTED = 0x00010000;
export const MPQ_FILE_FIX_KEY = 0x00020000;
export const MPQ_FILE_SINGLE_UNIT = 0x01000000;
export const MPQ_FILE_SECTOR_CRC = 0x04000000;
export const MPQ_FILE_EXISTS = 0x80000000;

const COMPRESSION_MASK = 0x01 | 0x02 | 0x08 | 0x10 | 0x20 | 0x40 | 0x80;

const FALLBACK_NAMES = [...Object.values(EXCEL), ...Object.values(STRINGS), "(listfile)", "(attributes)"];

export type MpqFileEntry = {
  name: string;
  pos: number;
  compSize: number;
  fileSize: number;
  flags: number;
  locale: number;
  raw: Uint8Array;
};

type HashEnt = { name1: number; name2: number; locale: number; blockIndex: number };
type BlockEnt = { pos: number; csize: number; fsize: number; flags: number };

function normalizeName(name: string) {
  return name.replace(/\//g, "\\");
}

const EXCEL_DIR = "data\\global\\excel\\";
const EXCEL_BASE_DIR = "data\\global\\excel\\base\\";

/**
 * D2R (and Yupgoolg packs that ship precompiled excel) load sibling .bin
 * unless -txt is set — leftover bins make edited .txt invisible in-game.
 * Returns lowercase normalized names of companion bins to drop.
 */
export function companionBinNamesToOmit(
  replacementNames: Iterable<string>,
  archiveNames: Iterable<string>,
): Set<string> {
  const existing = new Map<string, string>();
  for (const n of archiveNames) {
    const norm = normalizeName(n);
    existing.set(norm.toLowerCase(), norm);
  }
  const replacedList = [...replacementNames].map((raw) => normalizeName(raw));
  const replaced = new Set(replacedList.map((n) => n.toLowerCase()));
  const omit = new Set<string>();
  const addIfStale = (candidate: string) => {
    const key = normalizeName(candidate).toLowerCase();
    if (replaced.has(key)) return;
    if (existing.has(key)) omit.add(key);
  };
  for (const name of replacedList) {
    const lower = name.toLowerCase();
    if (!lower.endsWith(".txt")) continue;
    addIfStale(`${name.slice(0, -4)}.bin`);
    if (lower.startsWith(EXCEL_DIR) && !lower.startsWith(EXCEL_BASE_DIR)) {
      const stem = lower.slice(EXCEL_DIR.length, -4);
      addIfStale(`${EXCEL_BASE_DIR}${stem}.bin`);
    }
  }
  return omit;
}

function decodeText(data: Uint8Array): string {
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(data);
  }
  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(data.subarray(3));
  }
  return new TextDecoder("utf-8").decode(data);
}

function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** StormLib compression 0x02 is zlib (RFC 1950), not raw DEFLATE. */
function looksLikeZlib(data: Uint8Array): boolean {
  if (data.length < 2) return false;
  const cmf = data[0]!;
  const flg = data[1]!;
  return (cmf & 0x0f) === 8 && cmf >>> 4 <= 7 && ((cmf << 8) | flg) % 31 === 0;
}

function inflatePayload(data: Uint8Array): Uint8Array {
  if (looksLikeZlib(data)) {
    try {
      return unzlibSync(data);
    } catch {
      /* some streams spoof a zlib CMF/FLG; try raw DEFLATE */
    }
  }
  try {
    return inflateSync(data);
  } catch (rawErr) {
    try {
      return unzlibSync(data);
    } catch {
      const msg = rawErr instanceof Error ? rawErr.message : String(rawErr);
      throw new Error(
        msg === "unexpected EOF"
          ? "MPQ zlib 압축을 풀 수 없습니다"
          : `MPQ 압축을 풀 수 없습니다: ${msg}`,
      );
    }
  }
}

function decompressChunk(chunk: Uint8Array, expected: number, flags = 0): Uint8Array {
  if (chunk.length === 0) return chunk;
  if (chunk.length === expected) return chunk;

  // IMPLODE-only sectors have no compression-type prefix.
  if ((flags & MPQ_FILE_IMPLODE) && !(flags & MPQ_FILE_COMPRESS)) {
    return explodePkware(chunk);
  }

  // Some packers store a bare zlib stream (no 0x02 mask byte).
  if (looksLikeZlib(chunk)) return inflatePayload(chunk);

  let ctype = chunk[0]!;
  let payload = chunk.subarray(1);
  if (ctype === 0 || (ctype & ~COMPRESSION_MASK) !== 0) {
    if ((flags & MPQ_FILE_IMPLODE) || chunk[0] === 0 || chunk[0] === 1) {
      try {
        return explodePkware(chunk);
      } catch {
        /* fall through */
      }
    }
    return inflatePayload(chunk);
  }
  if (ctype & 0x08) {
    payload = explodePkware(payload);
    ctype &= ~0x08;
  }
  if (ctype & 0x02) {
    payload = inflatePayload(payload);
    ctype &= ~0x02;
  }
  if (ctype & 0x01) throw new Error("Huffman 압축은 지원하지 않습니다");
  if (ctype & 0x10) throw new Error("BZip2 압축은 지원하지 않습니다");
  if (ctype & 0x20) throw new Error("Sparse 압축은 지원하지 않습니다");
  return payload;
}

export class MpqArchive {
  readonly buffer: ArrayBuffer;
  readonly bytes: Uint8Array;
  readonly headerOffset: number;
  readonly sectorSize: number;
  readonly files: MpqFileEntry[];
  readonly byName: Map<string, MpqFileEntry>;
  private readonly hashEntries: HashEnt[];
  private readonly blockEntries: BlockEnt[];

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    let headerOffset = 0;
    const magic = String.fromCharCode(this.bytes[0]!, this.bytes[1]!, this.bytes[2]!, this.bytes[3]!);
    if (magic === "MPQ\x1b") {
      headerOffset = view.getUint32(8, true);
    } else if (magic !== "MPQ\x1a") {
      let found = -1;
      for (let i = 0; i < Math.min(this.bytes.length, 0x10000); i += 0x200) {
        if (
          this.bytes[i] === 0x4d &&
          this.bytes[i + 1] === 0x50 &&
          this.bytes[i + 2] === 0x51 &&
          this.bytes[i + 3] === 0x1a
        ) {
          found = i;
          break;
        }
      }
      if (found < 0) throw new Error("MPQ 시그니처를 찾을 수 없습니다");
      headerOffset = found;
    }

    this.headerOffset = headerOffset;
    if (headerOffset + 32 > this.bytes.length) throw new Error("MPQ 헤더가 잘렸습니다");

    const headerSize = view.getUint32(headerOffset + 4, true);
    const formatVersion = view.getUint16(headerOffset + 12, true);
    const blockSize = view.getUint16(headerOffset + 14, true);
    this.sectorSize = 512 << blockSize;
    let hashOff = view.getUint32(headerOffset + 16, true);
    let blockOff = view.getUint32(headerOffset + 20, true);
    const hashCount = view.getUint32(headerOffset + 24, true);
    const blockCount = view.getUint32(headerOffset + 28, true);

    if (formatVersion >= 2 && headerSize >= 0x2c && headerOffset + 0x2c <= this.bytes.length) {
      hashOff += view.getUint16(headerOffset + 0x28, true) * 0x100000000;
      blockOff += view.getUint16(headerOffset + 0x2a, true) * 0x100000000;
    }

    if (!hashCount || !blockCount) throw new Error("MPQ 해시/블록 테이블이 비어 있습니다");
    if (headerOffset + hashOff + hashCount * 16 > this.bytes.length) {
      throw new Error("MPQ 해시 테이블이 파일 범위를 벗어났습니다");
    }
    if (headerOffset + blockOff + blockCount * 16 > this.bytes.length) {
      throw new Error("MPQ 블록 테이블이 파일 범위를 벗어났습니다");
    }

    const hashRaw = decryptBlock(
      this.bytes.subarray(headerOffset + hashOff, headerOffset + hashOff + hashCount * 16),
      hashString("(hash table)", HASH_FILE_KEY),
    );
    const blockRaw = decryptBlock(
      this.bytes.subarray(headerOffset + blockOff, headerOffset + blockOff + blockCount * 16),
      hashString("(block table)", HASH_FILE_KEY),
    );
    const hashView = new DataView(hashRaw.buffer, hashRaw.byteOffset, hashRaw.byteLength);
    const blockView = new DataView(blockRaw.buffer, blockRaw.byteOffset, blockRaw.byteLength);

    const hashes: HashEnt[] = [];
    for (let i = 0; i < hashCount; i++) {
      hashes.push({
        name1: hashView.getUint32(i * 16, true),
        name2: hashView.getUint32(i * 16 + 4, true),
        locale: hashView.getUint16(i * 16 + 8, true),
        blockIndex: hashView.getUint32(i * 16 + 12, true),
      });
    }
    const blocks: BlockEnt[] = [];
    for (let i = 0; i < blockCount; i++) {
      blocks.push({
        pos: blockView.getUint32(i * 16, true),
        csize: blockView.getUint32(i * 16 + 4, true),
        fsize: blockView.getUint32(i * 16 + 8, true),
        flags: blockView.getUint32(i * 16 + 12, true),
      });
    }

    this.hashEntries = hashes;
    this.blockEntries = blocks;
    this.files = [];
    this.byName = new Map();

    let names: string[] = [];
    const listEntry = this.lookupHash(hashes, "(listfile)");
    if (listEntry && blocks[listEntry.blockIndex]) {
      try {
        const listBlock = blocks[listEntry.blockIndex]!;
        const listRaw = this.sliceBlock(listBlock);
        const listBytes = this.extractFromRaw("(listfile)", listRaw, listBlock, headerOffset);
        names = decodeText(listBytes)
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      } catch {
        names = [];
      }
    }
    if (names.length === 0) {
      names = FALLBACK_NAMES.filter((n) => this.lookupHash(hashes, n));
    }

    for (const name of names) {
      const h = this.lookupHash(hashes, name);
      if (!h) continue;
      const b = blocks[h.blockIndex];
      if (!b || !(b.flags & MPQ_FILE_EXISTS)) continue;
      try {
        const raw = this.sliceBlock(b);
        const entry: MpqFileEntry = {
          name: normalizeName(name),
          pos: b.pos,
          compSize: b.csize,
          fileSize: b.fsize,
          flags: b.flags,
          locale: h.locale,
          raw,
        };
        this.files.push(entry);
        this.byName.set(entry.name.toLowerCase(), entry);
      } catch {
        /* skip truncated blocks */
      }
    }
  }

  private sliceBlock(block: BlockEnt): Uint8Array {
    const start = this.headerOffset + block.pos;
    const end = start + block.csize;
    if (start < 0 || end > this.bytes.length || start > this.bytes.length) {
      throw new Error("MPQ 블록이 파일 범위를 벗어났습니다");
    }
    return this.bytes.subarray(start, end);
  }

  private lookupHash(
    hashes: HashEnt[],
    name: string,
  ) {
    if (!hashes.length) return null;
    const ha = hashString(name, HASH_NAME_A);
    const hb = hashString(name, HASH_NAME_B);
    const start = hashString(name, HASH_TABLE_INDEX) % hashes.length;
    for (let i = 0; i < hashes.length; i++) {
      const idx = (start + i) % hashes.length;
      const h = hashes[idx]!;
      if (h.blockIndex === 0xffffffff) return null;
      if (h.name1 === ha && h.name2 === hb && h.blockIndex !== 0xfffffffe) return h;
    }
    return null;
  }

  get(name: string): MpqFileEntry | undefined {
    const n = normalizeName(name).toLowerCase();
    return this.byName.get(n);
  }

  extract(name: string): Uint8Array {
    const entry = this.get(name);
    if (entry) {
      return this.extractFromRaw(
        entry.name,
        entry.raw,
        {
          pos: entry.pos,
          csize: entry.compSize,
          fsize: entry.fileSize,
          flags: entry.flags,
        },
        this.headerOffset,
      );
    }
    const h = this.lookupHash(this.hashEntries, name);
    if (!h) throw new Error(`파일을 찾을 수 없습니다: ${name}`);
    const b = this.blockEntries[h.blockIndex];
    if (!b || !(b.flags & MPQ_FILE_EXISTS)) throw new Error(`파일을 찾을 수 없습니다: ${name}`);
    const raw = this.sliceBlock(b);
    return this.extractFromRaw(normalizeName(name), raw, b, this.headerOffset);
  }

  tryExtract(name: string): Uint8Array | null {
    try {
      return this.extract(name);
    } catch {
      return null;
    }
  }

  extractText(name: string): string {
    return decodeText(this.extract(name));
  }

  private extractFromRaw(
    name: string,
    rawIn: Uint8Array,
    block: { pos: number; csize: number; fsize: number; flags: number },
    _headerOffset: number,
  ): Uint8Array {
    const { fsize, flags, pos } = block;
    let raw = rawIn.slice();
    const key =
      flags & MPQ_FILE_ENCRYPTED
        ? fileKey(name, pos, fsize, Boolean(flags & MPQ_FILE_FIX_KEY))
        : 0;

    if (flags & MPQ_FILE_SINGLE_UNIT) {
      if (flags & MPQ_FILE_ENCRYPTED) raw = new Uint8Array(decryptBlock(raw, key));
      if ((flags & (MPQ_FILE_COMPRESS | MPQ_FILE_IMPLODE)) && raw.length !== fsize) {
        raw = new Uint8Array(decompressChunk(raw, fsize, flags));
      }
      return raw.subarray(0, Math.min(fsize, raw.length));
    }

    if (!(flags & (MPQ_FILE_COMPRESS | MPQ_FILE_IMPLODE | MPQ_FILE_ENCRYPTED))) {
      return raw.subarray(0, fsize);
    }

    const nsectors = Math.ceil(fsize / this.sectorSize) || 1;
    const extraCrc = flags & MPQ_FILE_SECTOR_CRC ? 1 : 0;
    const tableBytes = (nsectors + 1 + extraCrc) * 4;
    let table = raw.subarray(0, tableBytes);
    if (flags & MPQ_FILE_ENCRYPTED) table = new Uint8Array(decryptBlock(table, (key - 1) >>> 0));
    const tview = new DataView(table.buffer, table.byteOffset, table.byteLength);
    const offsets: number[] = [];
    for (let i = 0; i <= nsectors; i++) offsets.push(tview.getUint32(i * 4, true));

    const parts: Uint8Array[] = [];
    for (let s = 0; s < nsectors; s++) {
      const start = offsets[s]!;
      const end = offsets[s + 1]!;
      if (start < 0 || end > raw.length || start > end) {
        throw new Error(`섹터 오프셋이 올바르지 않습니다: ${name}`);
      }
      let chunk = raw.subarray(start, end).slice();
      if (flags & MPQ_FILE_ENCRYPTED) chunk = new Uint8Array(decryptBlock(chunk, (key + s) >>> 0));
      const expected = Math.min(this.sectorSize, fsize - s * this.sectorSize);
      if (flags & (MPQ_FILE_COMPRESS | MPQ_FILE_IMPLODE)) {
        parts.push(chunk.length === expected ? chunk : decompressChunk(chunk, expected, flags));
      } else {
        parts.push(chunk);
      }
    }
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out.subarray(0, fsize);
  }

  rebuild(replacements: Map<string, Uint8Array>): Uint8Array {
    replacements = new Map(replacements);
    const omit = companionBinNamesToOmit(
      replacements.keys(),
      this.files.map((f) => f.name),
    );
    const files = this.files
      .filter((f) => !omit.has(normalizeName(f.name).toLowerCase()))
      .map((f) => ({ ...f }));
    const listName = "(listfile)";
    const names = files.map((f) => f.name);
    if (!names.some((n) => n.toLowerCase() === listName)) names.push(listName);

    const listContent = encodeText(names.join("\r\n") + "\r\n");
    replacements.set(listName, listContent);

    type Packed = { name: string; data: Uint8Array; flags: number; fileSize: number; locale: number };
    const packed: Packed[] = [];

    const hasReplacement = (name: string) =>
      replacements.has(name) || replacements.has(name.toLowerCase());

    for (const file of files) {
      const replacement =
        replacements.get(file.name) ?? replacements.get(file.name.toLowerCase());
      if (replacement) {
        packed.push({
          name: file.name,
          data: replacement,
          flags: MPQ_FILE_EXISTS,
          fileSize: replacement.length,
          locale: file.locale,
        });
      } else {
        packed.push({
          name: file.name,
          data: file.raw.slice(),
          flags: file.flags,
          fileSize: file.fileSize,
          locale: file.locale,
        });
      }
    }
    for (const [name, data] of replacements) {
      if (omit.has(normalizeName(name).toLowerCase())) continue;
      if (!packed.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        packed.push({
          name: normalizeName(name),
          data,
          flags: MPQ_FILE_EXISTS,
          fileSize: data.length,
          locale: 0,
        });
      }
    }

    const hashCount = nextPow2(Math.max(packed.length * 2, 16));
    const blockCount = packed.length;
    const headerSize = 32;
    let cursor = headerSize;

    const fileBlobs: { pos: number; blob: Uint8Array; flags: number; csize: number; fsize: number }[] = [];
    for (const p of packed) {
      if (hasReplacement(p.name) || (p.flags & ~MPQ_FILE_EXISTS) === 0) {
        const blob = p.data;
        fileBlobs.push({ pos: cursor, blob, flags: MPQ_FILE_EXISTS, csize: blob.length, fsize: p.fileSize });
        cursor += blob.length;
      } else if (p.flags & MPQ_FILE_FIX_KEY) {
        const oldPos = this.files.find((f) => f.name === p.name)?.pos ?? 0;
        const oldKey = fileKey(p.name, oldPos, p.fileSize, true);
        const newKey = fileKey(p.name, cursor, p.fileSize, true);
        const blob = reencryptRaw(p.data, p.flags, oldKey, newKey, this.sectorSize, p.fileSize);
        fileBlobs.push({ pos: cursor, blob, flags: p.flags, csize: blob.length, fsize: p.fileSize });
        cursor += blob.length;
      } else {
        fileBlobs.push({
          pos: cursor,
          blob: p.data,
          flags: p.flags,
          csize: p.data.length,
          fsize: p.fileSize,
        });
        cursor += p.data.length;
      }
    }

    const hashOff = cursor;
    const hashTable = new Uint8Array(hashCount * 16);
    hashTable.fill(0xff);
    const hashView = new DataView(hashTable.buffer);
    for (let i = 0; i < hashCount; i++) {
      hashView.setUint32(i * 16 + 12, 0xffffffff, true);
    }
    packed.forEach((p, blockIndex) => {
      const start = hashString(p.name, HASH_TABLE_INDEX) % hashCount;
      for (let i = 0; i < hashCount; i++) {
        const idx = (start + i) % hashCount;
        const existing = hashView.getUint32(idx * 16 + 12, true);
        if (existing === 0xffffffff || existing === 0xfffffffe) {
          hashView.setUint32(idx * 16, hashString(p.name, HASH_NAME_A), true);
          hashView.setUint32(idx * 16 + 4, hashString(p.name, HASH_NAME_B), true);
          hashView.setUint16(idx * 16 + 8, p.locale, true);
          hashView.setUint16(idx * 16 + 10, 0, true);
          hashView.setUint32(idx * 16 + 12, blockIndex, true);
          return;
        }
      }
      throw new Error("해시 테이블이 가득 찼습니다");
    });
    const encHash = encryptBlock(hashTable, hashString("(hash table)", HASH_FILE_KEY));
    cursor += encHash.length;

    const blockOff = cursor;
    const blockTable = new Uint8Array(blockCount * 16);
    const blockView = new DataView(blockTable.buffer);
    fileBlobs.forEach((b, i) => {
      blockView.setUint32(i * 16, b.pos, true);
      blockView.setUint32(i * 16 + 4, b.csize, true);
      blockView.setUint32(i * 16 + 8, b.fsize, true);
      blockView.setUint32(i * 16 + 12, b.flags, true);
    });
    const encBlock = encryptBlock(blockTable, hashString("(block table)", HASH_FILE_KEY));
    cursor += encBlock.length;

    const archiveSize = cursor;
    const out = new Uint8Array(archiveSize);
    const ov = new DataView(out.buffer);
    out[0] = 0x4d;
    out[1] = 0x50;
    out[2] = 0x51;
    out[3] = 0x1a;
    ov.setUint32(4, 32, true);
    ov.setUint32(8, archiveSize, true);
    ov.setUint16(12, 0, true);
    ov.setUint16(14, 3, true);
    ov.setUint32(16, hashOff, true);
    ov.setUint32(20, blockOff, true);
    ov.setUint32(24, hashCount, true);
    ov.setUint32(28, blockCount, true);

    for (const b of fileBlobs) out.set(b.blob, b.pos);
    out.set(encHash, hashOff);
    out.set(encBlock, blockOff);
    return out;
  }
}

function nextPow2(n: number) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function reencryptRaw(
  raw: Uint8Array,
  flags: number,
  oldKey: number,
  newKey: number,
  sectorSize: number,
  fileSize: number,
): Uint8Array {
  if (!(flags & MPQ_FILE_ENCRYPTED)) return raw;
  if (flags & MPQ_FILE_SINGLE_UNIT) {
    const plain = decryptBlock(raw, oldKey);
    return encryptBlock(plain, newKey);
  }
  const nsectors = Math.ceil(fileSize / sectorSize) || 1;
  const extraCrc = flags & MPQ_FILE_SECTOR_CRC ? 1 : 0;
  const tableBytes = (nsectors + 1 + extraCrc) * 4;
  const table = decryptBlock(raw.subarray(0, tableBytes), (oldKey - 1) >>> 0);
  const tview = new DataView(table.buffer, table.byteOffset, table.byteLength);
  const out = raw.slice();
  out.set(encryptBlock(table, (newKey - 1) >>> 0), 0);
  for (let s = 0; s < nsectors; s++) {
    const start = tview.getUint32(s * 4, true);
    const end = tview.getUint32((s + 1) * 4, true);
    const chunk = decryptBlock(raw.subarray(start, end), (oldKey + s) >>> 0);
    out.set(encryptBlock(chunk, (newKey + s) >>> 0), start);
  }
  return out;
}

export function buildMpqFromFiles(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const archive = Object.create(MpqArchive.prototype) as MpqArchive;
  Object.assign(archive, {
    buffer: new ArrayBuffer(0),
    bytes: new Uint8Array(0),
    headerOffset: 0,
    sectorSize: 4096,
    files: files.map((f) => ({
      name: normalizeName(f.name),
      pos: 0,
      compSize: f.data.length,
      fileSize: f.data.length,
      flags: MPQ_FILE_EXISTS,
      locale: 0,
      raw: f.data,
    })),
    byName: new Map(),
    hashEntries: [],
    blockEntries: [],
  });
  const replacements = new Map<string, Uint8Array>();
  for (const f of files) replacements.set(normalizeName(f.name), f.data);
  return archive.rebuild(replacements);
}

export { decodeText, encodeText, normalizeName, inflatePayload };

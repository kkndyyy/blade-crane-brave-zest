import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deflateSync, zlibSync } from "fflate";
import {
  MpqArchive,
  MPQ_FILE_COMPRESS,
  MPQ_FILE_EXISTS,
  MPQ_FILE_SINGLE_UNIT,
  buildMpqFromFiles,
  companionBinNamesToOmit,
  encodeText,
  inflatePayload,
} from "./archive.ts";
import {
  HASH_FILE_KEY,
  HASH_NAME_A,
  HASH_NAME_B,
  HASH_TABLE_INDEX,
  encryptBlock,
  hashString,
} from "./crypt.ts";

function nextPow2(n: number) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

type PackedFile = { name: string; data: Uint8Array };

function buildMpq(files: PackedFile[], mode: "raw" | "zlib" | "deflate"): Uint8Array {
  const list = [...files.map((f) => f.name.replace(/\//g, "\\")), "(listfile)"];
  const all: PackedFile[] = [
    ...files.map((f) => ({ name: f.name.replace(/\//g, "\\"), data: f.data })),
    { name: "(listfile)", data: encodeText(list.join("\r\n") + "\r\n") },
  ];

  const hashCount = nextPow2(Math.max(all.length * 2, 16));
  const headerSize = 32;
  let cursor = headerSize;

  const blobs: {
    name: string;
    pos: number;
    blob: Uint8Array;
    flags: number;
    csize: number;
    fsize: number;
  }[] = [];

  for (const f of all) {
    let blob: Uint8Array;
    let flags = MPQ_FILE_EXISTS;
    if (mode === "raw") {
      blob = f.data;
    } else {
      const packed = mode === "zlib" ? zlibSync(f.data) : deflateSync(f.data);
      blob = new Uint8Array(1 + packed.length);
      blob[0] = 0x02;
      blob.set(packed, 1);
      flags |= MPQ_FILE_COMPRESS | MPQ_FILE_SINGLE_UNIT;
    }
    blobs.push({
      name: f.name,
      pos: cursor,
      blob,
      flags,
      csize: blob.length,
      fsize: f.data.length,
    });
    cursor += blob.length;
  }

  const hashOff = cursor;
  const hashTable = new Uint8Array(hashCount * 16);
  const hv = new DataView(hashTable.buffer);
  for (let i = 0; i < hashCount; i++) hv.setUint32(i * 16 + 12, 0xffffffff, true);
  blobs.forEach((b, blockIndex) => {
    const start = hashString(b.name, HASH_TABLE_INDEX) % hashCount;
    for (let i = 0; i < hashCount; i++) {
      const idx = (start + i) % hashCount;
      const existing = hv.getUint32(idx * 16 + 12, true);
      if (existing === 0xffffffff || existing === 0xfffffffe) {
        hv.setUint32(idx * 16, hashString(b.name, HASH_NAME_A), true);
        hv.setUint32(idx * 16 + 4, hashString(b.name, HASH_NAME_B), true);
        hv.setUint16(idx * 16 + 8, 0, true);
        hv.setUint16(idx * 16 + 10, 0, true);
        hv.setUint32(idx * 16 + 12, blockIndex, true);
        return;
      }
    }
    throw new Error("hash full");
  });
  const encHash = encryptBlock(hashTable, hashString("(hash table)", HASH_FILE_KEY));
  cursor += encHash.length;

  const blockOff = cursor;
  const blockTable = new Uint8Array(blobs.length * 16);
  const bv = new DataView(blockTable.buffer);
  blobs.forEach((b, i) => {
    bv.setUint32(i * 16, b.pos, true);
    bv.setUint32(i * 16 + 4, b.csize, true);
    bv.setUint32(i * 16 + 8, b.fsize, true);
    bv.setUint32(i * 16 + 12, b.flags, true);
  });
  const encBlock = encryptBlock(blockTable, hashString("(block table)", HASH_FILE_KEY));
  cursor += encBlock.length;

  const out = new Uint8Array(cursor);
  const ov = new DataView(out.buffer);
  out[0] = 0x4d;
  out[1] = 0x50;
  out[2] = 0x51;
  out[3] = 0x1a;
  ov.setUint32(4, 32, true);
  ov.setUint32(8, cursor, true);
  ov.setUint16(12, 0, true);
  ov.setUint16(14, 3, true);
  ov.setUint32(16, hashOff, true);
  ov.setUint32(20, blockOff, true);
  ov.setUint32(24, hashCount, true);
  ov.setUint32(28, blobs.length, true);
  for (const b of blobs) out.set(b.blob, b.pos);
  out.set(encHash, hashOff);
  out.set(encBlock, blockOff);
  return out;
}

const EXCEL_PATH = "data\\global\\excel\\itemratio.txt";
const SAMPLE_TXT = "Unique\tVersion\r\nUber\t100\r\n".repeat(80);

describe("inflatePayload", () => {
  it("unzips StormLib zlib (RFC 1950) streams", () => {
    const src = encodeText("hello listfile");
    const out = inflatePayload(zlibSync(src));
    assert.equal(new TextDecoder().decode(out), "hello listfile");
  });

  it("inflates raw DEFLATE streams", () => {
    const src = encodeText("hello listfile");
    const out = inflatePayload(deflateSync(src));
    assert.equal(new TextDecoder().decode(out), "hello listfile");
  });
});

describe("MpqArchive", () => {
  it("opens uncompressed archives from buildMpqFromFiles", () => {
    const bytes = buildMpqFromFiles([{ name: EXCEL_PATH, data: encodeText(SAMPLE_TXT) }]);
    const archive = new MpqArchive(bytes.buffer as ArrayBuffer);
    const text = archive.extractText(EXCEL_PATH);
    assert.equal(text, SAMPLE_TXT);
  });

  it("opens StormLib-style zlib compressed MPQ without unexpected EOF", () => {
    const bytes = buildMpq([{ name: EXCEL_PATH, data: encodeText(SAMPLE_TXT) }], "zlib");
    const archive = new MpqArchive(bytes.buffer as ArrayBuffer);
    assert.ok(archive.files.length >= 1);
    const text = archive.extractText(EXCEL_PATH);
    assert.equal(text, SAMPLE_TXT);
    const list = archive.extractText("(listfile)");
    assert.match(list, /itemratio\.txt/i);
  });

  it("opens raw-DEFLATE compressed MPQ as a fallback", () => {
    const bytes = buildMpq([{ name: EXCEL_PATH, data: encodeText(SAMPLE_TXT) }], "deflate");
    const archive = new MpqArchive(bytes.buffer as ArrayBuffer);
    assert.equal(archive.extractText(EXCEL_PATH), SAMPLE_TXT);
  });

  it("opens a zlib MPQ even when compressed size is larger than the original", () => {
    const tiny = "x";
    const bytes = buildMpq([{ name: EXCEL_PATH, data: encodeText(tiny) }], "zlib");
    const archive = new MpqArchive(bytes.buffer as ArrayBuffer);
    assert.equal(archive.extractText(EXCEL_PATH), tiny);
  });

  it("still finds known D2 files when (listfile) is missing", () => {
    const withList = buildMpq([{ name: EXCEL_PATH, data: encodeText(SAMPLE_TXT) }], "zlib");
    // Corrupt the listfile block payload after the header so hash/block tables remain valid.
    const archive = new MpqArchive(withList.buffer as ArrayBuffer);
    const listEntry = archive.get("(listfile)");
    assert.ok(listEntry);
    const damaged = withList.slice();
    damaged.fill(0x7f, listEntry.pos, listEntry.pos + listEntry.compSize);
    const recovered = new MpqArchive(damaged.buffer as ArrayBuffer);
    assert.equal(recovered.extractText(EXCEL_PATH), SAMPLE_TXT);
  });

  it("drops companion excel .bin (and excel\\base\\*.bin) when the .txt is replaced", () => {
    const txtPath = "data\\global\\excel\\uniqueitems.txt";
    const binPath = "data\\global\\excel\\uniqueitems.bin";
    const baseBin = "data\\global\\excel\\base\\uniqueitems.bin";
    const otherBin = "data\\global\\excel\\levels.bin";
    const bytes = buildMpqFromFiles([
      { name: txtPath, data: encodeText("a\tb\r\n1\t2\r\n") },
      { name: binPath, data: new Uint8Array([1, 2, 3, 4]) },
      { name: baseBin, data: new Uint8Array([5, 6, 7, 8]) },
      { name: otherBin, data: new Uint8Array([9, 9, 9]) },
    ]);
    const archive = new MpqArchive(bytes.buffer as ArrayBuffer);
    assert.ok(archive.get(binPath));
    assert.ok(archive.get(baseBin));
    const omit = companionBinNamesToOmit([txtPath], archive.files.map((f) => f.name));
    assert.equal(omit.has(binPath.toLowerCase()), true);
    assert.equal(omit.has(baseBin.toLowerCase()), true);
    assert.equal(omit.has(otherBin.toLowerCase()), false);

    const next = encodeText("a\tb\r\n3\t4\r\n");
    const rebuiltBytes = archive.rebuild(new Map([[txtPath, next]]));
    const rebuilt = new MpqArchive(rebuiltBytes.buffer as ArrayBuffer);
    assert.equal(rebuilt.extractText(txtPath), "a\tb\r\n3\t4\r\n");
    assert.equal(rebuilt.get(binPath), undefined);
    assert.equal(rebuilt.get(baseBin), undefined);
    assert.ok(rebuilt.get(otherBin));
    const list = rebuilt.extractText("(listfile)");
    assert.equal(/uniqueitems\.bin/i.test(list), false);
    assert.match(list, /uniqueitems\.txt/i);
    assert.match(list, /levels\.bin/i);
  });
});

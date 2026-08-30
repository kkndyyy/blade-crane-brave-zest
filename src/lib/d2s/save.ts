import { BitReader, BitWriter, concatBytes, findMagic, u32le, writeU32le } from "./bits.ts";
import { patchSizeAndChecksum, verifyChecksum } from "./checksum.ts";
import type { ItemCatalog } from "./catalog.ts";
import {
  STAT_GOLD,
  STAT_GOLDBANK,
  STAT_LEVEL,
  STAT_TERMINATOR,
  type StatTable,
} from "./itemstatcost.ts";
import {
  cloneItem,
  findEmptySlot,
  MODE,
  PAGE,
  newItemSeed,
  readItemsSection,
  writeItemsSection,
  type D2sItem,
} from "./items.ts";

export const CLASS_KO = ["아마존", "소서리스", "네크로맨서", "팔라딘", "바바리안", "드루이드", "어쌔신", "워록"];

export type PlayerStat = { id: number; name: string; value: number };

export type ParsedSave = {
  bytes: Uint8Array;
  version: number;
  name: string;
  classId: number;
  headerLevel: number;
  gold: number | null;
  stashGold: number | null;
  level: number | null;
  goldBits: number;
  goldBankBits: number;
  goldValueBit: number | null;
  stashValueBit: number | null;
  items: D2sItem[];
  mercItems: D2sItem[];
  corpseItems: D2sItem[];
  prefix: Uint8Array;
  suffix: Uint8Array;
  jmOffset: number;
  statsError: string | null;
  mercError: string | null;
};

function readUtf8z(data: Uint8Array, off: number, max: number): string {
  let end = off;
  const last = Math.min(data.length, off + max);
  while (end < last && data[end] !== 0) end += 1;
  return new TextDecoder("utf-8").decode(data.subarray(off, end));
}

function gfOffset(version: number): number {
  const charSize = version >= 104 ? 387 : 319;
  return 16 + charSize + 298 + 80 + 52;
}

function nameOffset(version: number): number {
  if (version >= 104) return 299;
  return 20;
}

function classOffset(version: number): number {
  return version >= 104 ? 24 : 40;
}

function parsePlayerStats(
  r: BitReader,
  stats: StatTable,
): { list: PlayerStat[]; goldBit: number | null; stashBit: number | null; error: string | null } {
  const mag = String.fromCharCode(r.readU8(), r.readU8());
  if (mag !== "gf") return { list: [], goldBit: null, stashBit: null, error: "플레이어 스탯 헤더(gf)를 찾지 못했습니다" };
  const list: PlayerStat[] = [];
  let goldBit: number | null = null;
  let stashBit: number | null = null;
  try {
    for (;;) {
      const id = r.read(9);
      if (id === STAT_TERMINATOR) break;
      const st = stats.get(id);
      if (!st) throw new Error(`알 수 없는 플레이어 스탯 ${id}`);
      if (st.csvParam) r.read(st.csvParam);
      if (st.csvBits <= 0) throw new Error(`플레이어 스탯 ${id} (${st.name}) CSvBits가 0입니다`);
      if (id === STAT_GOLD) goldBit = r.bit;
      if (id === STAT_GOLDBANK) stashBit = r.bit;
      const value = r.read(st.csvBits);
      list.push({ id, name: st.name, value });
    }
    r.align();
    return { list, goldBit, stashBit, error: null };
  } catch (err) {
    return { list, goldBit, stashBit, error: err instanceof Error ? err.message : String(err) };
  }
}

function patchBits(data: Uint8Array, bitOff: number, width: number, value: number) {
  let v = value >>> 0;
  let bit = bitOff;
  let left = width;
  const out = data;
  while (left > 0) {
    const bi = bit >> 3;
    const bo = bit & 7;
    const avail = 8 - bo;
    const take = Math.min(avail, left);
    const mask = (1 << take) - 1;
    out[bi] = (out[bi]! & ~(mask << bo)) | ((v & mask) << bo);
    v = Math.floor(v / 2 ** take);
    bit += take;
    left -= take;
  }
}

export function parseSave(
  data: Uint8Array,
  stats: StatTable,
  catalog: ItemCatalog,
): ParsedSave {
  if (data.length < 16) throw new Error("세이브 파일이 너무 짧습니다");
  const magic = u32le(data, 0);
  if (magic !== 0xaa55aa55) throw new Error("D2R 세이브 파일(.d2s)이 아닙니다");
  const version = u32le(data, 4);
  if (version < 96) throw new Error(`지원하지 않는 세이브 버전 ${version}`);
  if (!verifyChecksum(data)) throw new Error("체크섬이 맞지 않습니다. 파일이 손상됐거나 다른 에디터 결과일 수 있습니다");

  const classId = data[classOffset(version)] ?? 0;
  const headerLevel = data[classOffset(version) + 3] ?? 0;
  const name = readUtf8z(data, nameOffset(version), version >= 104 ? 96 : 16);

  const gfAt = gfOffset(version);
  const r = new BitReader(data);
  if (gfAt + 2 < data.length && data[gfAt] === 0x67 && data[gfAt + 1] === 0x66) {
    r.bit = gfAt * 8;
  } else {
    const found = findMagic(data, "gf", 700);
    if (found < 0) throw new Error("플레이어 스탯(gf) 구간을 찾지 못했습니다");
    r.bit = found * 8;
  }

  const parsedStats = parsePlayerStats(r, stats);
  let gold: number | null = null;
  let stashGold: number | null = null;
  let level: number | null = null;
  for (const s of parsedStats.list) {
    if (s.id === STAT_GOLD) gold = s.value;
    if (s.id === STAT_GOLDBANK) stashGold = s.value;
    if (s.id === STAT_LEVEL) level = s.value;
  }

  const jmOffset = findMagic(data, "JM", r.byte);
  if (jmOffset < 0) throw new Error("아이템 목록(JM)을 찾지 못했습니다");
  r.bit = jmOffset * 8;

  const items = readItemsSection(r, version, stats, catalog);
  const afterPlayer = r.byte;
  const prefix = data.subarray(0, jmOffset);
  let mercItems: D2sItem[] = [];
  let corpseItems: D2sItem[] = [];
  let mercError: string | null = null;

  try {
    if (r.byte + 4 <= data.length) {
      const mag = String.fromCharCode(data[r.byte]!, data[r.byte + 1]!);
      if (mag === "JM") {
        r.bit = r.byte * 8;
        r.readU8();
        r.readU8();
        const corpses = r.readU16();
        for (let i = 0; i < corpses; i++) {
          r.readU32();
          r.readU32();
          r.readU32();
          corpseItems = corpseItems.concat(readItemsSection(r, version, stats, catalog));
        }
      }
    }
    const jf = findMagic(data, "jf", r.byte);
    if (jf >= 0 && data[jf + 2] === 0x4a && data[jf + 3] === 0x4d) {
      r.bit = (jf + 2) * 8;
      mercItems = readItemsSection(r, version, stats, catalog);
    }
  } catch (err) {
    mercError = err instanceof Error ? err.message : String(err);
  }

  const suffix = data.subarray(afterPlayer);

  const goldBits = stats.get(STAT_GOLD)?.csvBits ?? 25;
  const goldBankBits = stats.get(STAT_GOLDBANK)?.csvBits ?? 25;

  return {
    bytes: data,
    version,
    name,
    classId,
    headerLevel,
    gold,
    stashGold,
    level,
    goldBits,
    goldBankBits,
    goldValueBit: parsedStats.goldBit,
    stashValueBit: parsedStats.stashBit,
    items,
    mercItems,
    corpseItems,
    prefix,
    suffix,
    jmOffset,
    statsError: parsedStats.error,
    mercError,
  };
}

export function rebuildSave(
  parsed: ParsedSave,
  stats: StatTable,
  catalog: ItemCatalog,
  opts: { gold?: number; stashGold?: number; items?: D2sItem[] },
): Uint8Array {
  const items = opts.items ?? parsed.items;
  const w = new BitWriter();
  writeItemsSection(w, items, parsed.version, stats, catalog);
  const itemBytes = w.toBytes();
  let prefix = new Uint8Array(parsed.prefix);
  if (opts.gold != null && parsed.goldValueBit != null) {
    const max = 2 ** parsed.goldBits - 1;
    patchBits(prefix, parsed.goldValueBit, parsed.goldBits, Math.min(Math.max(opts.gold, 0), max));
  }
  if (opts.stashGold != null && parsed.stashValueBit != null) {
    const max = 2 ** parsed.goldBankBits - 1;
    patchBits(prefix, parsed.stashValueBit, parsed.goldBankBits, Math.min(Math.max(opts.stashGold, 0), max));
  }
  const raw = concatBytes([prefix, itemBytes, parsed.suffix]);
  return patchSizeAndChecksum(raw);
}

export function setItemQuantity(item: D2sItem, qty: number): D2sItem {
  const n = Math.min(511, Math.max(1, Math.floor(qty)));
  return { ...item, quantity: n };
}

export function duplicateItem(parsed: ParsedSave, index: number, from: "player" | "merc" | "corpse" = "player"): D2sItem {
  const source =
    from === "merc" ? parsed.mercItems : from === "corpse" ? parsed.corpseItems : parsed.items;
  const item = source[index];
  if (!item) throw new Error("복사할 아이템이 없습니다");
  const copy = cloneItem(item, newItemSeed());
  const slot = findEmptySlot(parsed.items, copy.w, copy.h);
  if (!slot) throw new Error("인벤·창고·큐브에 빈 칸이 없습니다. 칸을 비운 뒤 다시 복사하세요");
  copy.mode = MODE.STORED;
  copy.body = 0;
  copy.x = slot.x;
  copy.y = slot.y;
  copy.page = slot.page;
  return copy;
}

export function locationLabel(item: D2sItem): string {
  if (item.mode === MODE.EQUIPPED) return "착용";
  if (item.mode === MODE.BELT) return "벨트";
  if (item.mode === MODE.SOCKETED) return "소켓";
  if (item.mode === MODE.CURSOR) return "커서";
  if (item.mode === MODE.GROUND || item.mode === MODE.DROPPING) return "바닥";
  if (item.page === PAGE.CUBE) return "큐브";
  if (item.page === PAGE.STASH || item.page === PAGE.STASH2) return "창고";
  return "인벤";
}

export function qualityLabel(q: number): string {
  switch (q) {
    case 1:
      return "하급";
    case 2:
      return "일반";
    case 3:
      return "상급";
    case 4:
      return "매직";
    case 5:
      return "세트";
    case 6:
      return "레어";
    case 7:
      return "유니크";
    case 8:
      return "크래프트";
    case 9:
      return "템퍼드";
    default:
      return "—";
  }
}

export function qualityTone(q: number): "muted" | "unique" | "set" | "rune" {
  if (q === 7) return "unique";
  if (q === 5) return "set";
  if (q === 6 || q === 8) return "rune";
  return "muted";
}

export function classLabel(id: number): string {
  return CLASS_KO[id] ?? `직업 ${id}`;
}

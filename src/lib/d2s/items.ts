import { BitReader, BitWriter } from "./bits.ts";
import { decodeItemCode, encodeItemCode } from "./huffman.ts";
import {
  PAIRED_STATS,
  STAT_ARMORCLASS,
  STAT_DURABILITY,
  STAT_MAXDURABILITY,
  STAT_NUMSOCKETS,
  STAT_POISON_COUNT,
  STAT_POISON_MIN,
  STAT_QUEST_DIFF,
  STAT_TERMINATOR,
  type StatCost,
  type StatTable,
} from "./itemstatcost.ts";
import { infoFor, type ItemCatalog, type ItemInfo } from "./catalog.ts";

export const FLAGS = {
  IDENTIFIED: 0x00000010,
  HAS_QUANTITY: 0x00000020,
  SOCKETED: 0x00000800,
  EAR: 0x00010000,
  COMPACT: 0x00200000,
  ETHEREAL: 0x00400000,
  JUST_SAVED: 0x00800000,
  PERSONALIZED: 0x01000000,
  RUNEWORD: 0x04000000,
  CHRONICLE: 0x10000000,
  CHRONICLE_COMPACT: 0x20000000,
};

export const QUALITY = {
  INFERIOR: 1,
  NORMAL: 2,
  SUPERIOR: 3,
  MAGIC: 4,
  SET: 5,
  RARE: 6,
  UNIQUE: 7,
  CRAFT: 8,
  TEMPERED: 9,
};

export const MODE = {
  STORED: 0,
  EQUIPPED: 1,
  BELT: 2,
  GROUND: 3,
  CURSOR: 4,
  DROPPING: 5,
  SOCKETED: 6,
};

export const PAGE = {
  INVENTORY: 0,
  CUBE: 3,
  STASH: 4,
  STASH2: 5,
};

export type ItemStat = { id: number; layer: number; value: number };

export type QualityBits = {
  low?: number;
  sup?: number;
  pref?: number;
  suff?: number;
  file?: number;
  rare1?: number;
  rare2?: number;
  aff?: { pref: number; suff: number; hasPref: boolean; hasSuff: boolean }[];
  t1?: number;
  t2?: number;
  charmHasPref?: boolean;
  charmAff?: number;
  body?: number;
  spell?: number;
};

export type D2sItem = {
  flags: number;
  compact: boolean;
  version: number;
  code: string;
  mode: number;
  body: number;
  x: number;
  y: number;
  page: number;
  groundX?: number;
  groundY?: number;
  seed?: number;
  ilvl: number;
  quality: number;
  hasGfx: boolean;
  gfx?: number;
  hasAuto: boolean;
  autoAffix?: number;
  qualityBits: QualityBits;
  runewordId?: number;
  personalizedName?: string;
  ear?: { classId: number; level: number; name: string };
  realm?: number[];
  defense?: number;
  maxDur?: number;
  dur?: number;
  goldAmount?: number;
  playerGold?: boolean;
  quantity?: number;
  nsockets?: number;
  socketedCount: number;
  setMask?: number;
  stats: ItemStat[];
  setBonus: ItemStat[][];
  runewordStats?: ItemStat[];
  chronicle?: { id: number; timestamp?: number; recipients: { account: number; character: number }[] };
  advStash?: number;
  questDiff?: number;
  sockets: D2sItem[];
  stackable: boolean;
  w: number;
  h: number;
  kind: ItemInfo["kind"];
};

function mustStat(stats: StatTable, id: number): StatCost {
  const st = stats.get(id);
  if (!st) throw new Error(`itemstatcost에 스탯 ${id} 가 없습니다`);
  return st;
}

function readStatList(r: BitReader, stats: StatTable): ItemStat[] {
  const out: ItemStat[] = [];
  for (;;) {
    const id = r.read(9);
    if (id === STAT_TERMINATOR) break;
    const st = stats.get(id);
    if (!st) throw new Error(`알 수 없는 아이템 스탯 ${id}. 엽굵 MPQ를 연 뒤 다시 세이브를 여세요.`);
    const layer = st.saveParam ? r.read(st.saveParam) : 0;
    if (st.saveBits <= 0) throw new Error(`스탯 ${id} (${st.name}) 의 Save Bits가 0입니다`);
    const raw = r.read(st.saveBits) - st.saveAdd;
    out.push({ id, layer, value: raw * 2 ** st.valShift });
    for (const pid of PAIRED_STATS[id] ?? []) {
      const pst = mustStat(stats, pid);
      const praw = r.read(pst.saveBits) - pst.saveAdd;
      out.push({ id: pid, layer: 0, value: praw * 2 ** pst.valShift });
    }
    if (id === STAT_POISON_MIN) out.push({ id: STAT_POISON_COUNT, layer: 0, value: 1 });
  }
  return out;
}

function writeStatList(w: BitWriter, list: ItemStat[], stats: StatTable) {
  const written = new Set<number>();
  const byId = new Map<number, ItemStat>();
  for (const s of list) byId.set(s.id, s);
  for (const s of list) {
    if (written.has(s.id) || s.id === STAT_POISON_COUNT) continue;
    const st = stats.get(s.id);
    if (!st || st.saveBits <= 0) continue;
    const shifted = Math.trunc(s.value / 2 ** st.valShift);
    if (shifted === 0) continue;
    w.write(s.id, 9);
    if (st.saveParam) w.write(s.layer >>> 0, st.saveParam);
    w.write((shifted + st.saveAdd) >>> 0, st.saveBits);
    for (const pid of PAIRED_STATS[s.id] ?? []) {
      written.add(pid);
      const pst = mustStat(stats, pid);
      const paired = byId.get(pid);
      const pshifted = paired ? Math.trunc(paired.value / 2 ** pst.valShift) : 0;
      w.write((pshifted + pst.saveAdd) >>> 0, pst.saveBits);
    }
  }
  w.write(STAT_TERMINATOR, 9);
}

function readItemVersion(r: BitReader, saveVersion: number): number {
  if (saveVersion > 96) {
    const high = r.readBool();
    const value = r.read(2);
    return high ? value + 99 : value;
  }
  return r.read(10);
}

function writeItemVersion(w: BitWriter, version: number, saveVersion: number) {
  if (saveVersion > 96) {
    if (version >= 100) {
      w.writeBool(true);
      w.write(Math.min(version - 99, 3), 2);
    } else {
      w.writeBool(false);
      w.write(Math.min(version, 3), 2);
    }
  } else {
    w.write(Math.min(version, 1023), 10);
  }
}

function readPosition(r: BitReader, mode: number) {
  if (mode === MODE.GROUND || mode === MODE.DROPPING) {
    return { body: 0, x: 0, y: 0, page: -1, groundX: r.read(16), groundY: r.read(16) };
  }
  return { body: r.read(4), x: r.read(4), y: r.read(4), page: r.read(3) - 1 };
}

function writePosition(w: BitWriter, item: D2sItem) {
  if (item.mode === MODE.GROUND || item.mode === MODE.DROPPING) {
    w.write(item.groundX ?? 0, 16);
    w.write(item.groundY ?? 0, 16);
    return;
  }
  w.write(item.body & 0xf, 4);
  w.write(item.x & 0xf, 4);
  w.write(item.y & 0xf, 4);
  const raw = item.page < 0 ? 0 : Math.min(item.page + 1, 7);
  w.write(raw, 3);
}

function readRealm(r: BitReader, saveVersion: number): number[] | undefined {
  if (saveVersion <= 86) return undefined;
  if (!r.readBool()) return undefined;
  const n = saveVersion > 96 ? 4 : saveVersion > 93 ? 3 : 2;
  return Array.from({ length: n }, () => r.readU32());
}

function writeRealm(w: BitWriter, realm: number[] | undefined, saveVersion: number) {
  if (saveVersion <= 86) return;
  const has = Boolean(realm && realm.some((v) => v !== 0));
  w.writeBool(has);
  if (!has) return;
  const n = saveVersion > 96 ? 4 : saveVersion > 93 ? 3 : 2;
  for (let i = 0; i < n; i++) w.writeU32(realm![i] ?? 0);
}

function readAdvStash(r: BitReader, saveVersion: number): number | undefined {
  if (saveVersion <= 99) return undefined;
  if (saveVersion <= 101) return undefined;
  if (!r.readBool()) return undefined;
  return r.read(8);
}

function writeAdvStash(w: BitWriter, value: number | undefined, saveVersion: number) {
  if (saveVersion <= 99) return;
  if (saveVersion <= 101) return;
  w.writeBool(value != null);
  if (value != null) w.write(value & 0xff, 8);
}

function readQualityBits(r: BitReader, quality: number, info: ItemInfo): QualityBits {
  if (quality === QUALITY.INFERIOR) return { low: r.read(3) };
  if (quality === QUALITY.SUPERIOR) return { sup: r.read(3) };
  if (quality === QUALITY.MAGIC) return { pref: r.read(11), suff: r.read(11) };
  if (quality === QUALITY.SET || quality === QUALITY.UNIQUE) return { file: r.read(12) };
  if (quality === QUALITY.RARE || quality === QUALITY.CRAFT) {
    const rare1 = r.read(8);
    const rare2 = r.read(8);
    const aff = [];
    for (let i = 0; i < 3; i++) {
      const hasPref = r.readBool();
      const pref = hasPref ? r.read(11) : 0;
      const hasSuff = r.readBool();
      const suff = hasSuff ? r.read(11) : 0;
      aff.push({ pref, suff, hasPref, hasSuff });
    }
    return { rare1, rare2, aff };
  }
  if (quality === QUALITY.TEMPERED) return { t1: r.read(8), t2: r.read(8) };
  if (quality === QUALITY.NORMAL) {
    if (info.isCharm) {
      const charmHasPref = r.readBool();
      return { charmHasPref, charmAff: r.read(11) };
    }
    if (info.isBodyPart && !info.isPlayerBodyPart) return { body: r.read(10) };
    if (info.isScrollOrBook) return { spell: r.read(5) };
  }
  return {};
}

function writeQualityBits(w: BitWriter, quality: number, q: QualityBits, info: ItemInfo) {
  if (quality === QUALITY.INFERIOR) w.write(q.low ?? 0, 3);
  else if (quality === QUALITY.SUPERIOR) w.write(q.sup ?? 0, 3);
  else if (quality === QUALITY.MAGIC) {
    w.write(q.pref ?? 0, 11);
    w.write(q.suff ?? 0, 11);
  } else if (quality === QUALITY.SET || quality === QUALITY.UNIQUE) {
    w.write(q.file ?? 0, 12);
  } else if (quality === QUALITY.RARE || quality === QUALITY.CRAFT) {
    w.write(q.rare1 ?? 0, 8);
    w.write(q.rare2 ?? 0, 8);
    const aff = q.aff ?? [];
    for (let i = 0; i < 3; i++) {
      const a = aff[i] ?? { pref: 0, suff: 0, hasPref: false, hasSuff: false };
      w.writeBool(a.hasPref);
      if (a.hasPref) w.write(a.pref, 11);
      w.writeBool(a.hasSuff);
      if (a.hasSuff) w.write(a.suff, 11);
    }
  } else if (quality === QUALITY.TEMPERED) {
    w.write(q.t1 ?? 0, 8);
    w.write(q.t2 ?? 0, 8);
  } else if (quality === QUALITY.NORMAL) {
    if (info.isCharm) {
      w.writeBool(Boolean(q.charmHasPref));
      w.write(q.charmAff ?? 0, 11);
    } else if (info.isBodyPart && !info.isPlayerBodyPart) {
      w.write(q.body ?? 0, 10);
    } else if (info.isScrollOrBook) {
      w.write(q.spell ?? 0, 5);
    }
  }
}

function readGold(r: BitReader, saveVersion: number) {
  const big = r.readBool();
  const goldAmount = big ? r.readU32() : r.read(12);
  const playerGold = saveVersion > 96 ? r.readBool() : false;
  return { goldAmount, playerGold };
}

function writeGold(w: BitWriter, amount: number, playerGold: boolean, saveVersion: number) {
  const big = amount >= 4096;
  w.writeBool(big);
  if (big) w.writeU32(amount);
  else w.write(amount, 12);
  if (saveVersion > 96) w.writeBool(playerGold);
}

export function readItem(
  r: BitReader,
  saveVersion: number,
  stats: StatTable,
  catalog: ItemCatalog,
): D2sItem {
  const flags = r.readU32();
  const compact = Boolean(flags & FLAGS.COMPACT);
  const version = readItemVersion(r, saveVersion);
  const mode = r.read(3);
  const pos = readPosition(r, mode);

  const item: D2sItem = {
    flags,
    compact,
    version,
    code: "",
    mode,
    body: pos.body,
    x: pos.x,
    y: pos.y,
    page: pos.page,
    groundX: pos.groundX,
    groundY: pos.groundY,
    ilvl: 1,
    quality: QUALITY.NORMAL,
    hasGfx: false,
    hasAuto: false,
    qualityBits: {},
    socketedCount: 0,
    stats: [],
    setBonus: [],
    sockets: [],
    stackable: false,
    w: 1,
    h: 1,
    kind: "other",
  };

  if (compact) {
    if (flags & FLAGS.EAR) {
      item.code = "ear";
      item.ear = { classId: r.read(3), level: r.read(7), name: r.readString() };
    } else {
      item.code = decodeItemCode(r);
      const info = infoFor(catalog, item.code);
      item.kind = info.kind;
      item.w = info.w;
      item.h = info.h;
      item.stackable = info.stackable;
      if (info.isGold) {
        const g = readGold(r, saveVersion);
        item.goldAmount = g.goldAmount;
        item.playerGold = g.playerGold;
      }
      if (saveVersion > 92 && info.quest && info.questDiff) {
        const qs = mustStat(stats, STAT_QUEST_DIFF);
        item.questDiff = r.read(qs.saveBits) - qs.saveAdd;
      }
      item.realm = readRealm(r, saveVersion);
      item.advStash = readAdvStash(r, saveVersion);
    }
    r.align();
    return item;
  }

  item.code = decodeItemCode(r);
  const info = infoFor(catalog, item.code);
  item.kind = info.kind;
  item.w = info.w;
  item.h = info.h;
  item.stackable = info.stackable;
  item.socketedCount = r.read(3);
  item.seed = r.readU32();
  item.ilvl = Math.max(1, r.read(7));
  item.quality = r.read(4);
  item.hasGfx = r.readBool();
  if (item.hasGfx) item.gfx = r.read(3);
  item.hasAuto = r.readBool();
  if (item.hasAuto) item.autoAffix = r.read(11);
  item.qualityBits = readQualityBits(r, item.quality, info);
  if (flags & FLAGS.RUNEWORD) item.runewordId = r.read(16);
  if (flags & FLAGS.EAR) {
    item.ear = { classId: r.read(3), level: r.read(7), name: r.readString() };
  } else if (flags & FLAGS.PERSONALIZED) {
    item.personalizedName = r.readString();
  }
  item.realm = readRealm(r, saveVersion);

  if (info.isArmor) {
    const ac = mustStat(stats, STAT_ARMORCLASS);
    const md = mustStat(stats, STAT_MAXDURABILITY);
    const du = mustStat(stats, STAT_DURABILITY);
    item.defense = r.read(ac.saveBits) - ac.saveAdd;
    item.maxDur = r.read(md.saveBits) - md.saveAdd;
    if ((item.maxDur ?? 0) > 0) item.dur = r.read(du.saveBits) - du.saveAdd;
  } else if (info.isWeapon) {
    const md = mustStat(stats, STAT_MAXDURABILITY);
    const du = mustStat(stats, STAT_DURABILITY);
    item.maxDur = r.read(md.saveBits) - md.saveAdd;
    if ((item.maxDur ?? 0) > 0) item.dur = r.read(du.saveBits) - du.saveAdd;
  } else if (info.isGold) {
    const g = readGold(r, saveVersion);
    item.goldAmount = g.goldAmount;
    item.playerGold = g.playerGold;
  }

  if (saveVersion > 104) {
    if (r.readBool()) item.quantity = r.read(9);
  } else if (info.stackable) {
    item.quantity = r.read(9);
  }

  if (flags & FLAGS.SOCKETED) {
    const ns = mustStat(stats, STAT_NUMSOCKETS);
    item.nsockets = r.read(ns.saveBits);
  }
  if (item.quality === QUALITY.SET) item.setMask = r.read(5);
  item.stats = readStatList(r, stats);
  if (item.quality === QUALITY.SET && item.setMask) {
    for (let i = 0; i < 5; i++) {
      if (item.setMask & (1 << i)) item.setBonus.push(readStatList(r, stats));
    }
  }
  if (flags & FLAGS.RUNEWORD) item.runewordStats = readStatList(r, stats);
  if (saveVersion > 99 && flags & FLAGS.CHRONICLE) {
    const id = r.read(16);
    const compactChr = Boolean(flags & FLAGS.CHRONICLE_COMPACT);
    const timestamp = compactChr ? undefined : r.readU32();
    let count = compactChr ? 1 : r.read(4);
    if (count > 8) count = 8;
    const recipients = [];
    for (let i = 0; i < Math.max(count, 0); i++) {
      recipients.push({ account: r.readU32(), character: r.readU32() });
    }
    item.chronicle = { id, timestamp, recipients };
  }
  item.advStash = readAdvStash(r, saveVersion);
  r.align();
  for (let i = 0; i < item.socketedCount; i++) {
    item.sockets.push(readItem(r, saveVersion, stats, catalog));
  }
  if (item.quantity != null) item.stackable = true;
  return item;
}

export function writeItem(
  w: BitWriter,
  item: D2sItem,
  saveVersion: number,
  stats: StatTable,
  catalog: ItemCatalog,
) {
  const flags = (item.flags | FLAGS.JUST_SAVED) >>> 0;
  w.writeU32(flags);
  writeItemVersion(w, item.version, saveVersion);
  w.write(Math.min(item.mode, 7), 3);
  writePosition(w, item);
  const info = infoFor(catalog, item.code);

  if (flags & FLAGS.COMPACT) {
    if (flags & FLAGS.EAR && item.ear) {
      w.write(item.ear.classId, 3);
      w.write(item.ear.level, 7);
      w.writeString(item.ear.name);
    } else {
      encodeItemCode(w, item.code);
      if (info.isGold) writeGold(w, item.goldAmount ?? 0, Boolean(item.playerGold), saveVersion);
      if (saveVersion > 92 && info.quest && info.questDiff) {
        const qs = mustStat(stats, STAT_QUEST_DIFF);
        w.write(((item.questDiff ?? 0) + qs.saveAdd) >>> 0, qs.saveBits);
      }
      writeRealm(w, item.realm, saveVersion);
      writeAdvStash(w, item.advStash, saveVersion);
    }
    w.align();
    return;
  }

  encodeItemCode(w, item.code);
  w.write(Math.min(item.sockets.filter(Boolean).length, 7), 3);
  w.writeU32(item.seed ?? 0);
  w.write(Math.min(Math.max(item.ilvl, 1), 127), 7);
  w.write(item.quality, 4);
  w.writeBool(item.hasGfx);
  if (item.hasGfx) w.write(item.gfx ?? 0, 3);
  w.writeBool(item.hasAuto);
  if (item.hasAuto) w.write(item.autoAffix ?? 0, 11);
  writeQualityBits(w, item.quality, item.qualityBits, info);
  if (flags & FLAGS.RUNEWORD) w.write(item.runewordId ?? 0, 16);
  if (flags & FLAGS.EAR && item.ear) {
    w.write(item.ear.classId, 3);
    w.write(item.ear.level, 7);
    w.writeString(item.ear.name);
  } else if (flags & FLAGS.PERSONALIZED) {
    w.writeString(item.personalizedName ?? "");
  }
  writeRealm(w, item.realm, saveVersion);

  if (info.isArmor) {
    const ac = mustStat(stats, STAT_ARMORCLASS);
    const md = mustStat(stats, STAT_MAXDURABILITY);
    const du = mustStat(stats, STAT_DURABILITY);
    w.write(((item.defense ?? 0) + ac.saveAdd) >>> 0, ac.saveBits);
    w.write(((item.maxDur ?? 0) + md.saveAdd) >>> 0, md.saveBits);
    if ((item.maxDur ?? 0) > 0) w.write(((item.dur ?? 0) + du.saveAdd) >>> 0, du.saveBits);
  } else if (info.isWeapon) {
    const md = mustStat(stats, STAT_MAXDURABILITY);
    const du = mustStat(stats, STAT_DURABILITY);
    w.write(((item.maxDur ?? 0) + md.saveAdd) >>> 0, md.saveBits);
    if ((item.maxDur ?? 0) > 0) w.write(((item.dur ?? 0) + du.saveAdd) >>> 0, du.saveBits);
  } else if (info.isGold) {
    writeGold(w, item.goldAmount ?? 0, Boolean(item.playerGold), saveVersion);
  }

  if (saveVersion > 104) {
    w.writeBool(item.quantity != null);
    if (item.quantity != null) w.write(Math.min(Math.max(item.quantity, 0), 511), 9);
  } else if (info.stackable) {
    w.write(Math.min(item.quantity ?? 0, 511), 9);
  }

  if (flags & FLAGS.SOCKETED) {
    const ns = mustStat(stats, STAT_NUMSOCKETS);
    w.write(item.nsockets ?? item.sockets.length, ns.saveBits);
  }
  if (item.quality === QUALITY.SET) w.write(item.setMask ?? 0, 5);
  writeStatList(w, item.stats, stats);
  if (item.quality === QUALITY.SET && item.setMask) {
    let bonusIndex = 0;
    for (let i = 0; i < 5; i++) {
      if (item.setMask & (1 << i)) {
        writeStatList(w, item.setBonus[bonusIndex] ?? [], stats);
        bonusIndex += 1;
      }
    }
  }
  if (flags & FLAGS.RUNEWORD) writeStatList(w, item.runewordStats ?? [], stats);
  if (saveVersion > 99 && flags & FLAGS.CHRONICLE && item.chronicle) {
    w.write(item.chronicle.id, 16);
    const compactChr = Boolean(flags & FLAGS.CHRONICLE_COMPACT);
    if (!compactChr) w.writeU32(item.chronicle.timestamp ?? 0);
    if (!compactChr) w.write(Math.min(item.chronicle.recipients.length, 8), 4);
    const recs = compactChr ? item.chronicle.recipients.slice(0, 1) : item.chronicle.recipients.slice(0, 8);
    for (const rec of recs) {
      w.writeU32(rec.account);
      w.writeU32(rec.character);
    }
  }
  writeAdvStash(w, item.advStash, saveVersion);
  w.align();
  for (const sock of item.sockets) writeItem(w, sock, saveVersion, stats, catalog);
}

export function readItemsSection(
  r: BitReader,
  saveVersion: number,
  stats: StatTable,
  catalog: ItemCatalog,
): D2sItem[] {
  const mag = String.fromCharCode(r.readU8(), r.readU8());
  if (mag !== "JM") throw new Error(`아이템 목록 헤더가 JM이 아닙니다 (${mag})`);
  const count = r.readU16();
  const items: D2sItem[] = [];
  for (let i = 0; i < count; i++) {
    try {
      items.push(readItem(r, saveVersion, stats, catalog));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`아이템 ${i + 1}/${count} 읽기 실패: ${msg}`);
    }
  }
  return items;
}

export function writeItemsSection(
  w: BitWriter,
  items: D2sItem[],
  saveVersion: number,
  stats: StatTable,
  catalog: ItemCatalog,
) {
  w.writeU8(0x4a);
  w.writeU8(0x4d);
  w.writeU16(items.length);
  for (const item of items) writeItem(w, item, saveVersion, stats, catalog);
}

export function cloneItem(item: D2sItem, seed: number): D2sItem {
  const copy: D2sItem = {
    ...item,
    seed,
    sockets: item.sockets.map((s, i) => cloneItem(s, (seed ^ ((i + 1) * 0x9e3779b9)) >>> 0)),
    stats: item.stats.map((s) => ({ ...s })),
    setBonus: item.setBonus.map((list) => list.map((s) => ({ ...s }))),
    runewordStats: item.runewordStats?.map((s) => ({ ...s })),
    qualityBits: {
      ...item.qualityBits,
      aff: item.qualityBits.aff?.map((a) => ({ ...a })),
    },
    realm: item.realm ? [...item.realm] : undefined,
    ear: item.ear ? { ...item.ear } : undefined,
    chronicle: item.chronicle
      ? { ...item.chronicle, recipients: item.chronicle.recipients.map((r) => ({ ...r })) }
      : undefined,
  };
  return copy;
}

export function newItemSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] || 1) >>> 0;
  }
  return ((Math.random() * 0xffffffff) >>> 0) || 1;
}

type Grid = { w: number; h: number; page: number };

const GRIDS: Grid[] = [
  { w: 10, h: 8, page: PAGE.INVENTORY },
  { w: 10, h: 10, page: PAGE.INVENTORY },
  { w: 10, h: 10, page: PAGE.STASH },
  { w: 10, h: 10, page: PAGE.STASH2 },
  { w: 3, h: 4, page: PAGE.CUBE },
];

export function findEmptySlot(
  items: D2sItem[],
  w: number,
  h: number,
): { x: number; y: number; page: number } | null {
  for (const grid of GRIDS) {
    if (w > grid.w || h > grid.h) continue;
    const occ: boolean[][] = Array.from({ length: grid.h }, () => Array(grid.w).fill(false));
    for (const it of items) {
      if (it.mode !== MODE.STORED || it.page !== grid.page) continue;
      for (let dy = 0; dy < it.h; dy++) {
        for (let dx = 0; dx < it.w; dx++) {
          const yy = it.y + dy;
          const xx = it.x + dx;
          if (yy >= 0 && yy < grid.h && xx >= 0 && xx < grid.w) occ[yy]![xx] = true;
        }
      }
    }
    for (let y = 0; y <= grid.h - h; y++) {
      for (let x = 0; x <= grid.w - w; x++) {
        let ok = true;
        for (let dy = 0; dy < h && ok; dy++) {
          for (let dx = 0; dx < w && ok; dx++) {
            if (occ[y + dy]![x + dx]) ok = false;
          }
        }
        if (ok) return { x, y, page: grid.page };
      }
    }
  }
  return null;
}

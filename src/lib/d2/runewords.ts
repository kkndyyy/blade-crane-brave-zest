import { RUNE_TYPES } from "./labels.ts";
import { CUBE_TYPE_KO } from "./cubeRecipes.ts";
import { getCell, isDataRow, type TsvTable } from "./tsv.ts";

export const RUNE_SLOTS = ["Rune1", "Rune2", "Rune3", "Rune4", "Rune5", "Rune6"] as const;
export const ITYPE_SLOTS = ["itype1", "itype2", "itype3", "itype4", "itype5", "itype6"] as const;
export const ETYPE_SLOTS = ["etype1", "etype2", "etype3"] as const;

export type RuneNameLookup = {
  lookup(key: string | undefined | null): { ko: string; en: string } | null;
};

const GROUP_ORDER = ["일반", "스택", "참", "기타"] as const;

export type RuneGroup = (typeof GROUP_ORDER)[number];

export type RuneChoice = {
  code: string;
  ko: string;
  en: string;
  type: string;
  group: RuneGroup;
};

function groupForType(type: string): RuneGroup {
  if (type === "rune") return "일반";
  if (type === "runx" || type === "run2") return "스택";
  if (type === "runc") return "참";
  return "기타";
}

export function runeLabel(code: string, strings: RuneNameLookup): { ko: string; en: string } {
  const c = code.trim();
  if (!c) return { ko: "", en: "" };
  const short = strings.lookup(`${c}L`);
  if (short) return { ko: short.ko || short.en, en: short.en || short.ko };
  const full = strings.lookup(c);
  if (full) return { ko: full.ko || full.en, en: full.en || full.ko };
  return { ko: c, en: c };
}

export function runeSlots(row: string[], table: TsvTable): string[] {
  return RUNE_SLOTS.map((col) => getCell(row, table, col).trim());
}

export function formatRunesUsed(codes: string[], strings: RuneNameLookup): string {
  return codes
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const en = runeLabel(c, strings).en.replace(/\s*Rune'?s?\s*/gi, "").trim();
      return en || c;
    })
    .join("");
}

export function runewordRuneSummary(codes: string[], strings: RuneNameLookup): string {
  const names = codes.filter(Boolean).map((c) => runeLabel(c, strings).ko || c);
  return names.join(" + ");
}

export function filledRuneCount(codes: string[]): number {
  return codes.filter(Boolean).length;
}

export function hasRuneGap(codes: string[]): boolean {
  let seenEmpty = false;
  for (const c of codes) {
    if (!c) seenEmpty = true;
    else if (seenEmpty) return true;
  }
  return false;
}

export function listRuneChoices(
  misc: TsvTable | undefined,
  strings: RuneNameLookup,
  extraCodes: string[] = [],
): RuneChoice[] {
  const byCode = new Map<string, RuneChoice>();
  const add = (code: string, type: string) => {
    const c = code.trim();
    if (!c) return;
    const key = c.toLowerCase();
    if (byCode.has(key)) return;
    const { ko, en } = runeLabel(c, strings);
    byCode.set(key, { code: c, ko: ko || c, en: en || c, type, group: groupForType(type) });
  };
  if (misc) {
    for (const row of misc.rows) {
      if (!isDataRow(row)) continue;
      const type = getCell(row, misc, "type");
      if (!RUNE_TYPES.has(type)) continue;
      add(getCell(row, misc, "code"), type);
    }
  }
  for (const code of extraCodes) add(code, "");
  return [...byCode.values()].sort((a, b) => {
    const g = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    if (g) return g;
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  });
}

export function groupedRuneChoices(choices: RuneChoice[]): { group: RuneGroup; items: RuneChoice[] }[] {
  const buckets = new Map<RuneGroup, RuneChoice[]>();
  for (const g of GROUP_ORDER) buckets.set(g, []);
  for (const c of choices) buckets.get(c.group)!.push(c);
  return GROUP_ORDER.filter((g) => buckets.get(g)!.length).map((group) => ({ group, items: buckets.get(group)! }));
}

const TYPE_GROUP_ORDER = ["무기", "방어구", "참", "피규어", "기타"] as const;
export type ItemTypeGroup = (typeof TYPE_GROUP_ORDER)[number];

export type ItemTypeChoice = {
  code: string;
  ko: string;
  group: ItemTypeGroup;
  sockets: string;
};

function typeGroup(code: string, equiv1: string, equiv2: string): ItemTypeGroup {
  const keys = [code, equiv1, equiv2].map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (keys.some((k) => k.includes("dol"))) return "피규어";
  if (keys.some((k) => ["char", "lcha", "gcha", "mcha", "scha", "pcha"].includes(k))) return "참";
  if (keys.some((k) => ["weap", "mele", "miss", "thro", "misl"].includes(k))) return "무기";
  if (keys.some((k) => ["armo", "shld", "shie", "tors", "helm", "boot", "glov", "belt", "merc"].includes(k))) return "방어구";
  return "기타";
}

export function itemTypeLabel(code: string, itemTypes?: TsvTable): string {
  const c = code.trim();
  if (!c) return "";
  if (CUBE_TYPE_KO[c]) return CUBE_TYPE_KO[c]!;
  if (itemTypes) {
    for (const row of itemTypes.rows) {
      if (!isDataRow(row)) continue;
      if (getCell(row, itemTypes, "Code").trim() === c) {
        return getCell(row, itemTypes, "ItemType").trim() || c;
      }
    }
  }
  return c;
}

export function typeSlots(row: string[], table: TsvTable, slots: readonly string[]): string[] {
  return slots.map((col) => getCell(row, table, col).trim());
}

export function runewordTypeSummary(codes: string[], itemTypes?: TsvTable): string {
  return codes.filter(Boolean).map((c) => itemTypeLabel(c, itemTypes)).join(" · ");
}

export function listItemTypeChoices(itemTypes?: TsvTable, extraCodes: string[] = []): ItemTypeChoice[] {
  const byCode = new Map<string, ItemTypeChoice>();
  const add = (code: string, equiv1: string, equiv2: string, sockets: string) => {
    const c = code.trim();
    if (!c || c.toLowerCase() === "none") return;
    const key = c.toLowerCase();
    if (byCode.has(key)) return;
    byCode.set(key, {
      code: c,
      ko: itemTypeLabel(c, itemTypes),
      group: typeGroup(c, equiv1, equiv2),
      sockets,
    });
  };
  if (itemTypes) {
    for (const row of itemTypes.rows) {
      if (!isDataRow(row)) continue;
      add(
        getCell(row, itemTypes, "Code"),
        getCell(row, itemTypes, "Equiv1"),
        getCell(row, itemTypes, "Equiv2"),
        getCell(row, itemTypes, "MaxSockets3") || getCell(row, itemTypes, "MaxSockets1"),
      );
    }
  }
  for (const code of extraCodes) add(code, "", "", "");
  return [...byCode.values()].sort((a, b) => {
    const g = TYPE_GROUP_ORDER.indexOf(a.group) - TYPE_GROUP_ORDER.indexOf(b.group);
    if (g) return g;
    return a.ko.localeCompare(b.ko, "ko");
  });
}

export function groupedItemTypes(choices: ItemTypeChoice[]): { group: ItemTypeGroup; items: ItemTypeChoice[] }[] {
  const buckets = new Map<ItemTypeGroup, ItemTypeChoice[]>();
  for (const g of TYPE_GROUP_ORDER) buckets.set(g, []);
  for (const c of choices) buckets.get(c.group)!.push(c);
  return TYPE_GROUP_ORDER.filter((g) => buckets.get(g)!.length).map((group) => ({ group, items: buckets.get(group)! }));
}

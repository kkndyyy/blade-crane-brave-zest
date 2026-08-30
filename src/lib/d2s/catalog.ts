import { getCell, isDataRow, type TsvTable } from "../d2/tsv.ts";
import type { StringTable } from "../d2/strings.ts";

export type ItemKind = "armor" | "weapon" | "other";

export type ItemInfo = {
  code: string;
  kind: ItemKind;
  name: string;
  type: string;
  stackable: boolean;
  quest: boolean;
  questDiff: boolean;
  compact: boolean;
  w: number;
  h: number;
  isGold: boolean;
  isArmor: boolean;
  isWeapon: boolean;
  isCharm: boolean;
  isScrollOrBook: boolean;
  isBodyPart: boolean;
  isPlayerBodyPart: boolean;
};

export type ItemCatalog = {
  byCode: Map<string, ItemInfo>;
  uniqueById: Map<number, { key: string; code: string }>;
  setById: Map<number, { key: string; code: string }>;
};

const FALLBACK: ItemInfo = {
  code: "",
  kind: "other",
  name: "",
  type: "",
  stackable: false,
  quest: false,
  questDiff: false,
  compact: false,
  w: 1,
  h: 1,
  isGold: false,
  isArmor: false,
  isWeapon: false,
  isCharm: false,
  isScrollOrBook: false,
  isBodyPart: false,
  isPlayerBodyPart: false,
};

function ancestorsOf(type: string, parents: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [type.toLowerCase()];
  while (stack.length) {
    const t = stack.pop()!;
    if (!t || seen.has(t)) continue;
    seen.add(t);
    const next = parents.get(t);
    if (next) for (const p of next) stack.push(p);
  }
  return seen;
}

function typeParents(itemTypes?: TsvTable): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!itemTypes) return map;
  for (const row of itemTypes.rows) {
    if (!isDataRow(row)) continue;
    const code = getCell(row, itemTypes, "Code") || getCell(row, itemTypes, "code");
    if (!code) continue;
    const e1 = (getCell(row, itemTypes, "Equiv1") || "").trim().toLowerCase();
    const e2 = (getCell(row, itemTypes, "Equiv2") || "").trim().toLowerCase();
    const list = [];
    if (e1) list.push(e1);
    if (e2) list.push(e2);
    map.set(code.trim().toLowerCase(), list);
  }
  return map;
}

function loadKind(
  table: TsvTable | undefined,
  kind: ItemKind,
  parents: Map<string, string[]>,
  out: Map<string, ItemInfo>,
) {
  if (!table) return;
  for (const row of table.rows) {
    if (!isDataRow(row)) continue;
    const code = (getCell(row, table, "code") || "").trim();
    if (!code) continue;
    const type = (getCell(row, table, "type") || "").trim().toLowerCase();
    const tree = ancestorsOf(type, parents);
    const w = Number(getCell(row, table, "invwidth") || "1") || 1;
    const h = Number(getCell(row, table, "invheight") || "1") || 1;
    out.set(code, {
      code,
      kind,
      name: getCell(row, table, "name") || code,
      type,
      stackable: getCell(row, table, "stackable") === "1",
      quest: !["", "0"].includes(getCell(row, table, "quest").trim()),
      questDiff: ["1", "true"].includes(getCell(row, table, "questdiffcheck").trim().toLowerCase()),
      compact: getCell(row, table, "compactsave") === "1",
      w,
      h,
      isGold: tree.has("gold") || code === "gld",
      isArmor: kind === "armor" || tree.has("armo"),
      isWeapon: kind === "weapon" || tree.has("weap"),
      isCharm: tree.has("char"),
      isScrollOrBook: tree.has("scro") || tree.has("book") || code === "tbk" || code === "ibk" || code === "tsc" || code === "isc",
      isBodyPart: tree.has("body"),
      isPlayerBodyPart: tree.has("play"),
    });
  }
}

function indexMap(table: TsvTable | undefined, codeCol: string): Map<number, { key: string; code: string }> {
  const out = new Map<number, { key: string; code: string }>();
  if (!table) return out;
  let i = 0;
  for (const row of table.rows) {
    if (!isDataRow(row)) continue;
    const idRaw = getCell(row, table, "*ID") || getCell(row, table, "*Id");
    const id = idRaw.trim() === "" ? i : Number(idRaw);
    const key = getCell(row, table, "index");
    const code = getCell(row, table, codeCol) || getCell(row, table, "code");
    if (Number.isFinite(id)) out.set(id, { key, code });
    i += 1;
  }
  return out;
}

export function buildCatalog(opts: {
  armor?: TsvTable;
  weapons?: TsvTable;
  misc?: TsvTable;
  itemTypes?: TsvTable;
  uniqueItems?: TsvTable;
  setItems?: TsvTable;
}): ItemCatalog {
  const parents = typeParents(opts.itemTypes);
  const byCode = new Map<string, ItemInfo>();
  loadKind(opts.armor, "armor", parents, byCode);
  loadKind(opts.weapons, "weapon", parents, byCode);
  loadKind(opts.misc, "other", parents, byCode);
  return {
    byCode,
    uniqueById: indexMap(opts.uniqueItems, "code"),
    setById: indexMap(opts.setItems, "item"),
  };
}

export function infoFor(catalog: ItemCatalog, code: string): ItemInfo {
  const hit = catalog.byCode.get(code) ?? catalog.byCode.get(code.slice(0, 3));
  if (hit) return hit;
  return { ...FALLBACK, code, name: code };
}

export function itemDisplayName(
  catalog: ItemCatalog,
  strings: StringTable | undefined,
  code: string,
  quality: number,
  fileIndex?: number,
): string {
  if (quality === 7 && fileIndex != null) {
    const u = catalog.uniqueById.get(fileIndex);
    if (u?.key) {
      const named = strings?.display(u.key, "") || strings?.tryDisplay(u.key);
      if (named) return named;
    }
  }
  if (quality === 5 && fileIndex != null) {
    const s = catalog.setById.get(fileIndex);
    if (s?.key) {
      const named = strings?.display(s.key, "") || strings?.tryDisplay(s.key);
      if (named) return named;
    }
  }
  const info = infoFor(catalog, code);
  return strings?.display(code, strings?.display(info.name, info.name) || info.name) || info.name || code;
}

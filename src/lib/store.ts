import { create } from "zustand";
import { MpqArchive, buildMpqFromFiles, encodeText, normalizeName } from "./mpq/archive";
import { parseTsv, serializeTsv, type TsvTable, colIndex, getCell, setCell, num, isDataRow } from "./d2/tsv";
import { StringTable, parseStringJson } from "./d2/strings";
import { EXCEL, STRINGS, SAMPLE_FILES, tcDifficulty, isRuneTc, isFigureTc, matchesDifficulty } from "./d2/paths";
import { applySkillExtra, type ExtraId } from "./d2/skillExtras";
import { applyAllNpcsSellAllPotions, applyVendorStock, type VendorTableKey } from "./d2/vendors";
import { applyRuneOpmSplitDouble } from "./d2/cubeRecipes";
import { applyHireableIcons } from "./d2/hirelings";
import { applyVanillaItemRatio, applyVanillaTcQuality } from "./d2/vanillaDrops";
import { FIGURE_TYPES, RUNE_TYPES, isSlamtrapMonster, type Difficulty } from "./d2/labels";

export type SourceKind = "empty" | "sample" | "mpq";

export type NavId = "drops" | "uniques" | "sets" | "runes" | "figures" | "skills" | "monsters" | "shops" | "potions" | "hirelings" | "files";

type Tables = Partial<{
  itemRatio: TsvTable;
  uniqueItems: TsvTable;
  setItems: TsvTable;
  treasure: TsvTable;
  misc: TsvTable;
  armor: TsvTable;
  weapons: TsvTable;
  skills: TsvTable;
  skilldesc: TsvTable;
  missiles: TsvTable;
  monstats: TsvTable;
  cubemain: TsvTable;
  hireling: TsvTable;
}>;

type EditorState = {
  source: SourceKind;
  fileName: string;
  archive: MpqArchive | null;
  originalTexts: Record<string, string>;
  tables: Tables;
  strings: StringTable;
  dirty: boolean;
  error: string | null;
  loading: boolean;
  nav: NavId;
  difficulty: Difficulty;
  search: string;
  openMpq: (file: File) => Promise<void>;
  loadSample: () => Promise<void>;
  setNav: (id: NavId) => void;
  setDifficulty: (d: Difficulty) => void;
  setSearch: (q: string) => void;
  patchCell: (tableKey: keyof Tables, rowIndex: number, column: string, value: string) => void;
  applyQualityBoost: (diff: Difficulty, unique: number, set: number) => void;
  scaleQuality: (diff: Difficulty, uniqueFactor: number, setFactor: number, fromCurrent?: boolean) => void;
  scaleNoDrop: (kind: "rune" | "figure", diff: Difficulty, factor: number, fromCurrent?: boolean) => void;
  scaleRarity: (kind: "unique" | "set" | "rune" | "figure", factor: number, fromCurrent?: boolean) => void;
  setSlamtrapSkillsDisabled: (disabled: boolean) => void;
  setSkillExtra: (skillIndex: number, extraId: string, enabled: boolean) => void;
  setVendorStock: (tableKey: "misc" | "armor" | "weapons", rowIndex: number, npc: string, add: boolean) => void;
  setAllNpcsSellAllPotions: (enabled: boolean) => void;
  setRuneOpmSplitDouble: (enabled: boolean) => void;
  setHireableSkillIcons: (enabled: boolean) => void;
  applyVanillaD2rDrops: () => void;
  scaleSkillDamage: (factor: number, classFilter: string) => void;
  resetTable: (tableKey: keyof Tables) => void;
  exportMpq: () => { bytes: Uint8Array; name: string };
  changedCount: () => number;
};

const TABLE_PATH: Record<keyof Tables, string> = {
  itemRatio: EXCEL.itemRatio,
  uniqueItems: EXCEL.uniqueItems,
  setItems: EXCEL.setItems,
  treasure: EXCEL.treasure,
  misc: EXCEL.misc,
  armor: EXCEL.armor,
  weapons: EXCEL.weapons,
  skills: EXCEL.skills,
  skilldesc: EXCEL.skillDesc,
  missiles: EXCEL.missiles,
  monstats: EXCEL.monstats,
  cubemain: EXCEL.cubemain,
  hireling: EXCEL.hireling,
};

function textDecoderFile(data: Uint8Array) {
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(data);
  }
  let start = 0;
  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) start = 3;
  return new TextDecoder("utf-8").decode(data.subarray(start));
}

function ingestTexts(texts: Record<string, string>) {
  const tables: Tables = {};
  const pick = (path: string) => texts[path] ?? texts[path.replace(/\\/g, "/")];
  if (pick(EXCEL.itemRatio)) tables.itemRatio = parseTsv(pick(EXCEL.itemRatio)!);
  if (pick(EXCEL.uniqueItems)) tables.uniqueItems = parseTsv(pick(EXCEL.uniqueItems)!);
  if (pick(EXCEL.setItems)) tables.setItems = parseTsv(pick(EXCEL.setItems)!);
  if (pick(EXCEL.treasure)) tables.treasure = parseTsv(pick(EXCEL.treasure)!);
  if (pick(EXCEL.misc)) tables.misc = parseTsv(pick(EXCEL.misc)!);
  if (pick(EXCEL.armor)) tables.armor = parseTsv(pick(EXCEL.armor)!);
  if (pick(EXCEL.weapons)) tables.weapons = parseTsv(pick(EXCEL.weapons)!);
  if (pick(EXCEL.skills)) tables.skills = parseTsv(pick(EXCEL.skills)!);
  if (pick(EXCEL.skillDesc)) tables.skilldesc = parseTsv(pick(EXCEL.skillDesc)!);
  if (pick(EXCEL.missiles)) tables.missiles = parseTsv(pick(EXCEL.missiles)!);
  if (pick(EXCEL.monstats)) tables.monstats = parseTsv(pick(EXCEL.monstats)!);
  if (pick(EXCEL.cubemain)) tables.cubemain = parseTsv(pick(EXCEL.cubemain)!);
  if (pick(EXCEL.hireling)) tables.hireling = parseTsv(pick(EXCEL.hireling)!);

  const strings = new StringTable();
  for (const p of [STRINGS.itemNames, STRINGS.itemRunes, STRINGS.skills, STRINGS.monsters]) {
    const raw = pick(p);
    if (!raw) continue;
    try {
      strings.add(parseStringJson(raw));
    } catch {
      /* ignore malformed */
    }
  }
  return { tables, strings };
}

function cloneTable(t: TsvTable): TsvTable {
  return { headers: [...t.headers], rows: t.rows.map((r) => [...r]) };
}

const PLAYER_CLASSES = new Set(["ama", "sor", "nec", "pal", "war", "bar", "dru", "ass"]);

const SKILL_DMG_COLS = [
  "MinDam", "MaxDam",
  "MinLevDam1", "MinLevDam2", "MinLevDam3", "MinLevDam4", "MinLevDam5",
  "MaxLevDam1", "MaxLevDam2", "MaxLevDam3", "MaxLevDam4", "MaxLevDam5",
  "EMin", "EMax",
  "EMinLev1", "EMinLev2", "EMinLev3", "EMinLev4", "EMinLev5",
  "EMaxLev1", "EMaxLev2", "EMaxLev3", "EMaxLev4", "EMaxLev5",
  "SrcDam",
];

const MISSILE_DMG_COLS = [
  "MinDamage", "MaxDamage",
  "MinLevDam1", "MinLevDam2", "MinLevDam3", "MinLevDam4", "MinLevDam5",
  "MaxLevDam1", "MaxLevDam2", "MaxLevDam3", "MaxLevDam4", "MaxLevDam5",
  "EMin", "EMax",
  "MinELev1", "MinELev2", "MinELev3", "MinELev4", "MinELev5",
  "MaxELev1", "MaxELev2", "MaxELev3", "MaxELev4", "MaxELev5",
  "SrcDamage",
];

const SKILL_MISSILE_COLS = [
  "srvmissile", "srvmissilea", "srvmissileb", "srvmissilec",
  "cltmissile", "cltmissilea", "cltmissileb", "cltmissilec", "cltmissiled",
];

function skillMatchesClass(charclass: string, filter: string) {
  const c = charclass.trim().toLowerCase();
  if (filter === "all") return PLAYER_CLASSES.has(c);
  if (filter === "none") return !c;
  return c === filter;
}

function scaleNumericCell(row: string[], table: TsvTable, col: string, factor: number) {
  const raw = getCell(row, table, col);
  if (!raw.trim()) return;
  const src = num(raw, 0);
  if (src <= 0) return;
  let v = Math.round(src * factor);
  v = Math.min(32767, v);
  v = factor < 1 ? Math.max(1, v) : Math.max(0, v);
  setCell(row, table, col, String(v));
}

export const useEditor = create<EditorState>((set, get) => ({
  source: "empty",
  fileName: "",
  archive: null,
  originalTexts: {},
  tables: {},
  strings: new StringTable(),
  dirty: false,
  error: null,
  loading: false,
  nav: "drops",
  difficulty: "hell",
  search: "",

  setNav: (id) => set({ nav: id }),
  setDifficulty: (d) => set({ difficulty: d }),
  setSearch: (q) => set({ search: q }),

  openMpq: async (file) => {
    set({ loading: true, error: null });
    try {
      const buf = await file.arrayBuffer();
      const archive = new MpqArchive(buf);
      const texts: Record<string, string> = {};
      const wanted = [...Object.values(EXCEL), ...Object.values(STRINGS)];
      for (const path of wanted) {
        const data = archive.tryExtract(path);
        if (data) texts[path] = textDecoderFile(data);
      }
      const { tables, strings } = ingestTexts(texts);
      if (!Object.keys(tables).length) {
        throw new Error(
          "MPQ에서 엑셀 테이블을 찾지 못했습니다. 엽굵/D2R 데이터(data\\global\\excel)가 들어 있는 파일인지 확인하세요.",
        );
      }
      set({
        source: "mpq",
        fileName: file.name,
        archive,
        originalTexts: texts,
        tables,
        strings,
        dirty: false,
        loading: false,
        error: null,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "MPQ를 열 수 없습니다",
      });
    }
  },

  loadSample: async () => {
    set({ loading: true, error: null });
    try {
      const texts: Record<string, string> = {};
      await Promise.all(
        SAMPLE_FILES.map(async ({ path, url }) => {
          const res = await fetch(url);
          if (!res.ok) return;
          texts[path] = await res.text();
        }),
      );
      const { tables, strings } = ingestTexts(texts);
      set({
        source: "sample",
        fileName: "yupgoolg131.mpq (샘플)",
        archive: null,
        originalTexts: texts,
        tables,
        strings,
        dirty: false,
        loading: false,
        error: null,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "샘플 데이터를 불러오지 못했습니다",
      });
    }
  },

  patchCell: (tableKey, rowIndex, column, value) => {
    const tables = { ...get().tables };
    const table = tables[tableKey];
    if (!table) return;
    const next = cloneTable(table);
    const row = next.rows[rowIndex];
    if (!row) return;
    setCell(row, next, column, value);
    tables[tableKey] = next;
    set({ tables, dirty: true });
  },

  applyQualityBoost: (diff, unique, setVal) => {
    const table = get().tables.treasure;
    if (!table) return;
    const next = cloneTable(table);
    const nameI = colIndex(next, "Treasure Class");
    for (let i = 0; i < next.rows.length; i++) {
      const row = next.rows[i]!;
      if (!isDataRow(row)) continue;
      const name = row[nameI] ?? "";
      const d = tcDifficulty(name);
      if (d !== diff && d !== "all") continue;
      if (unique >= 0) setCell(row, next, "Unique", String(unique));
      if (setVal >= 0) setCell(row, next, "Set", String(setVal));
    }
    set({ tables: { ...get().tables, treasure: next }, dirty: true });
  },

  scaleQuality: (diff, uniqueFactor, setFactor, fromCurrent = false) => {
    const table = get().tables.treasure;
    if (!table) return;
    const orig = fromCurrent ? null : parseTsv(get().originalTexts[EXCEL.treasure] ?? serializeTsv(table));
    const next = cloneTable(table);
    const nameI = colIndex(next, "Treasure Class");
    for (let i = 0; i < next.rows.length; i++) {
      const row = next.rows[i]!;
      if (!isDataRow(row)) continue;
      const name = row[nameI] ?? "";
      if (!matchesDifficulty(name, diff)) continue;
      const origRow = orig?.rows[i];
      const scaleCol = (col: "Unique" | "Set", factor: number) => {
        const curVal = num(getCell(row, next, col), 0);
        const origVal = origRow ? num(getCell(origRow, orig!, col), 0) : 0;
        const src = fromCurrent ? curVal : (origVal > 0 ? origVal : curVal);
        if (src <= 0) return;
        let v = Math.round(src * factor);
        v = Math.min(1024, v);
        v = factor < 1 ? Math.max(1, v) : Math.max(0, v);
        setCell(row, next, col, String(v));
      };
      scaleCol("Unique", uniqueFactor);
      scaleCol("Set", setFactor);
    }
    set({ tables: { ...get().tables, treasure: next }, dirty: true });
  },

  scaleNoDrop: (kind, diff, factor, fromCurrent = false) => {
    const table = get().tables.treasure;
    if (!table) return;
    const orig = fromCurrent ? null : parseTsv(get().originalTexts[EXCEL.treasure] ?? serializeTsv(table));
    const next = cloneTable(table);
    const nameI = colIndex(next, "Treasure Class");
    for (let i = 0; i < next.rows.length; i++) {
      const row = next.rows[i]!;
      if (!isDataRow(row)) continue;
      const name = row[nameI] ?? "";
      if (!matchesDifficulty(name, diff)) continue;
      const match = kind === "rune" ? isRuneTc(name) : isFigureTc(name);
      if (!match) continue;
      const origRow = orig?.rows[i];
      const cur = num(getCell(row, next, "NoDrop"), 0);
      const base = fromCurrent ? cur : (origRow ? num(getCell(origRow, orig!, "NoDrop"), 0) : cur);
      setCell(row, next, "NoDrop", String(Math.max(0, Math.round(base * factor))));
    }
    set({ tables: { ...get().tables, treasure: next }, dirty: true });
  },

  scaleRarity: (kind, factor, fromCurrent = false) => {
    const map: Record<typeof kind, keyof Tables> = {
      unique: "uniqueItems",
      set: "setItems",
      rune: "misc",
      figure: "misc",
    };
    const key = map[kind];
    const table = get().tables[key];
    if (!table) return;
    const path = TABLE_PATH[key];
    const orig = fromCurrent ? null : parseTsv(get().originalTexts[path] ?? serializeTsv(table));
    const next = cloneTable(table);
    for (let i = 0; i < next.rows.length; i++) {
      const row = next.rows[i]!;
      if (!isDataRow(row)) continue;
      if (kind === "rune") {
        const t = getCell(row, next, "type");
        if (!RUNE_TYPES.has(t)) continue;
      }
      if (kind === "figure") {
        const t = getCell(row, next, "type");
        if (!FIGURE_TYPES.has(t)) continue;
      }
      const origRow = orig?.rows[i];
      const cur = num(getCell(row, next, "rarity"), 1);
      const base = fromCurrent ? cur : (origRow ? num(getCell(origRow, orig!, "rarity"), 1) : cur);
      const scaled = Math.max(1, Math.round(base * factor));
      setCell(row, next, "rarity", String(scaled));
    }
    set({ tables: { ...get().tables, [key]: next }, dirty: true });
  },

  setSlamtrapSkillsDisabled: (disabled) => {
    const table = get().tables.monstats;
    if (!table) return;
    const orig = parseTsv(get().originalTexts[EXCEL.monstats] ?? serializeTsv(table));
    const next = cloneTable(table);
    const skillCols = Array.from({ length: 8 }, (_, i) => ({
      skill: `Skill${i + 1}`,
      lvl: `Sk${i + 1}lvl`,
      mode: `Sk${i + 1}mode`,
    }));
    for (let i = 0; i < next.rows.length; i++) {
      const row = next.rows[i]!;
      if (!isDataRow(row)) continue;
      if (!isSlamtrapMonster(getCell(row, next, "Id"), getCell(row, next, "NameStr"))) continue;
      const origRow = orig.rows[i];
      for (const c of skillCols) {
        if (disabled) {
          setCell(row, next, c.skill, "");
          setCell(row, next, c.lvl, "");
          setCell(row, next, c.mode, "");
        } else if (origRow) {
          setCell(row, next, c.skill, getCell(origRow, orig, c.skill));
          setCell(row, next, c.lvl, getCell(origRow, orig, c.lvl));
          setCell(row, next, c.mode, getCell(origRow, orig, c.mode));
        }
      }
    }
    set({ tables: { ...get().tables, monstats: next }, dirty: true });
  },

  setSkillExtra: (skillIndex, extraId, enabled) => {
    const skills = get().tables.skills;
    if (!skills) return;
    const missiles = get().tables.missiles;
    const origSkills = parseTsv(get().originalTexts[EXCEL.skills] ?? serializeTsv(skills));
    const origMissiles = missiles
      ? parseTsv(get().originalTexts[EXCEL.missiles] ?? serializeTsv(missiles))
      : undefined;
    const nextSkills = cloneTable(skills);
    const nextMissiles = missiles ? cloneTable(missiles) : undefined;
    applySkillExtra({
      skills: nextSkills,
      missiles: nextMissiles,
      origSkills,
      origMissiles,
      skillIndex,
      extraId: extraId as ExtraId,
      enabled,
    });
    set({
      tables: {
        ...get().tables,
        skills: nextSkills,
        ...(nextMissiles ? { missiles: nextMissiles } : {}),
      },
      dirty: true,
    });
  },

  setVendorStock: (tableKey, rowIndex, npc, add) => {
    const table = get().tables[tableKey as VendorTableKey];
    if (!table) return;
    const next = cloneTable(table);
    const row = next.rows[rowIndex];
    if (!row) return;
    applyVendorStock(row, next, npc, add, tableKey);
    set({ tables: { ...get().tables, [tableKey]: next }, dirty: true });
  },

  setAllNpcsSellAllPotions: (enabled) => {
    const table = get().tables.misc;
    if (!table) return;
    const orig = parseTsv(get().originalTexts[EXCEL.misc] ?? serializeTsv(table));
    const next = cloneTable(table);
    applyAllNpcsSellAllPotions(next, orig, enabled);
    set({ tables: { ...get().tables, misc: next }, dirty: true });
  },

  setRuneOpmSplitDouble: (enabled) => {
    const table = get().tables.cubemain;
    if (!table) return;
    const orig = parseTsv(get().originalTexts[EXCEL.cubemain] ?? serializeTsv(table));
    const next = cloneTable(table);
    applyRuneOpmSplitDouble(next, orig, enabled);
    set({ tables: { ...get().tables, cubemain: next }, dirty: true });
  },

  setHireableSkillIcons: (enabled) => {
    const skilldesc = get().tables.skilldesc;
    const hireling = get().tables.hireling;
    if (!skilldesc || !hireling) return;
    const orig = parseTsv(get().originalTexts[EXCEL.skillDesc] ?? serializeTsv(skilldesc));
    const next = cloneTable(skilldesc);
    applyHireableIcons(next, orig, hireling, get().tables.skills, enabled);
    set({ tables: { ...get().tables, skilldesc: next }, dirty: true });
  },

  applyVanillaD2rDrops: () => {
    const treasure = get().tables.treasure;
    const itemRatio = get().tables.itemRatio;
    const nextTables = { ...get().tables };
    if (itemRatio) {
      const next = cloneTable(itemRatio);
      applyVanillaItemRatio(next);
      nextTables.itemRatio = next;
    }
    if (treasure) {
      const next = cloneTable(treasure);
      applyVanillaTcQuality(next);
      nextTables.treasure = next;
    }
    set({ tables: nextTables, dirty: true });
    get().scaleRarity("unique", 1);
    get().scaleRarity("set", 1);
    get().scaleRarity("rune", 1);
    get().scaleRarity("figure", 1);
  },

  scaleSkillDamage: (factor, classFilter) => {
    const skills = get().tables.skills;
    if (!skills) return;
    const nextSkills = cloneTable(skills);
    const missilesUsed = new Set<string>();
    for (const row of nextSkills.rows) {
      if (!isDataRow(row)) continue;
      if (!skillMatchesClass(getCell(row, nextSkills, "charclass"), classFilter)) continue;
      for (const col of SKILL_DMG_COLS) scaleNumericCell(row, nextSkills, col, factor);
      for (const col of SKILL_MISSILE_COLS) {
        const name = getCell(row, nextSkills, col).trim();
        if (name) missilesUsed.add(name.toLowerCase());
      }
    }
    const nextTables: Tables = { ...get().tables, skills: nextSkills };
    const missiles = get().tables.missiles;
    if (missiles && missilesUsed.size) {
      const nextMissiles = cloneTable(missiles);
      for (const row of nextMissiles.rows) {
        if (!isDataRow(row)) continue;
        const name = (getCell(row, nextMissiles, "Missile") || row[0] || "").trim().toLowerCase();
        if (!missilesUsed.has(name)) continue;
        for (const col of MISSILE_DMG_COLS) scaleNumericCell(row, nextMissiles, col, factor);
      }
      nextTables.missiles = nextMissiles;
    }
    set({ tables: nextTables, dirty: true });
  },

  resetTable: (tableKey) => {
    const path = TABLE_PATH[tableKey];
    const original = get().originalTexts[path];
    if (!original) return;
    set({
      tables: { ...get().tables, [tableKey]: parseTsv(original) },
      dirty: true,
    });
  },

  exportMpq: () => {
    const { tables, originalTexts, archive, fileName, source } = get();
    const replacements = new Map<string, Uint8Array>();
    (Object.keys(TABLE_PATH) as (keyof Tables)[]).forEach((key) => {
      const table = tables[key];
      if (!table) return;
      const path = TABLE_PATH[key];
      const text = serializeTsv(table);
      const orig = originalTexts[path];
      if (orig && orig.replace(/\r\n/g, "\n") === text.replace(/\r\n/g, "\n")) return;
      replacements.set(normalizeName(path), encodeText(text));
    });
    const base = fileName.replace(/\.mpq$/i, "") || "hellforge";
    const outName = `${base}-edited.mpq`;
    if (archive) {
      return { bytes: archive.rebuild(replacements), name: outName };
    }
    const files = Object.entries(originalTexts).map(([name, text]) => {
      const n = normalizeName(name);
      const edited = replacements.get(n);
      return { name: n, data: edited ?? encodeText(text) };
    });
    for (const [name, data] of replacements) {
      if (!files.some((f) => f.name === name)) files.push({ name, data });
    }
    return { bytes: buildMpqFromFiles(files), name: source === "sample" ? "yupgoolg-edited.mpq" : outName };
  },

  changedCount: () => {
    const { tables, originalTexts } = get();
    let n = 0;
    (Object.keys(TABLE_PATH) as (keyof Tables)[]).forEach((key) => {
      const table = tables[key];
      if (!table) return;
      const orig = originalTexts[TABLE_PATH[key]];
      if (!orig) return;
      if (serializeTsv(table).replace(/\r\n/g, "\n") !== orig.replace(/\r\n/g, "\n")) n += 1;
    });
    return n;
  },
}));

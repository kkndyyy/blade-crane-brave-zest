import { getCell, isDataRow, type TsvTable } from "./tsv";

export type StringEntry = { Key?: string; enUS?: string; koKR?: string };

const COLOR_RE = /\u00ffc./g;
const PUA_RE = /[\uE000-\uF8FF]/g;
const JUNK_RE = /[\u00ff\u0001-\u0008\u000b\u000e-\u001f]/g;

export function stripD2Codes(text: string): string {
  return text
    .replace(COLOR_RE, "")
    .replace(PUA_RE, "")
    .replace(JUNK_RE, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function firstLine(text: string): string {
  const clean = stripD2Codes(text);
  const line = clean.split("\n")[0] ?? clean;
  return line.trim();
}

/** Prefer the titled 【name】 lockup used by 엽굵, else a short last line. */
export function itemTitle(text: string): string {
  const clean = stripD2Codes(text);
  const boxed = clean.match(/【\s*([^】]+?)\s*】/);
  if (boxed?.[1]) return boxed[1].replace(/\s+/g, " ").trim();
  const lines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  const short = [...lines].reverse().find((l) => l.length <= 36 && !/^\d/.test(l) && !l.includes("+"));
  return (short ?? lines[0]!).replace(/\s+/g, " ").trim();
}

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

function labelOf(e: StringEntry, key: string): { ko: string; en: string } {
  return {
    ko: itemTitle(e.koKR || "") || firstLine(e.koKR || e.enUS || key),
    en: itemTitle(e.enUS || "") || firstLine(e.enUS || e.koKR || key),
  };
}

export class StringTable {
  private byKey = new Map<string, StringEntry>();
  private byEn = new Map<string, StringEntry>();
  private byCompact = new Map<string, StringEntry>();

  add(entries: StringEntry[]) {
    for (const e of entries) {
      if (!e.Key) continue;
      this.byKey.set(e.Key, e);
      this.byKey.set(e.Key.toLowerCase(), e);
      const en = firstLine(e.enUS || "");
      if (en) {
        const low = en.toLowerCase();
        if (!this.byEn.has(low)) this.byEn.set(low, e);
        const c = compact(en);
        if (c && !this.byCompact.has(c)) this.byCompact.set(c, e);
      }
      const ck = compact(e.Key);
      if (ck && !this.byCompact.has(ck)) this.byCompact.set(ck, e);
    }
  }

  lookup(key: string | undefined | null): { ko: string; en: string } | null {
    if (!key) return null;
    const e =
      this.byKey.get(key) ??
      this.byKey.get(key.toLowerCase()) ??
      this.byEn.get(key.toLowerCase()) ??
      this.byCompact.get(compact(key));
    if (!e) return null;
    return labelOf(e, key);
  }

  display(key: string | undefined | null, fallback?: string): string {
    const hit = this.lookup(key);
    if (hit) return hit.ko || hit.en;
    return fallback || key || "";
  }

  tryDisplay(key: string | undefined | null): string {
    const hit = this.lookup(key);
    return hit ? hit.ko || hit.en : "";
  }
}

export function parseStringJson(text: string): StringEntry[] {
  const trimmed = text.replace(/^\uFEFF/, "");
  const parsed = JSON.parse(trimmed) as StringEntry[];
  return Array.isArray(parsed) ? parsed : [];
}

function pascalNameKey(raw: string): string {
  const parts = raw
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "";
  return parts.map((w) => w[0]!.toUpperCase() + w.slice(1)).join("") + "Name";
}

/** Korean in-game skill title from skills.json + skilldesc.txt str name. */
export function koreanSkillName(
  strings: StringTable,
  opts: {
    skill?: string;
    skilldesc?: string;
    id?: string;
    skilldescTable?: TsvTable;
    skillsTable?: TsvTable;
  },
): string {
  let skill = (opts.skill ?? "").trim();
  let desc = (opts.skilldesc ?? "").trim();
  let id = (opts.id ?? "").trim();

  if (opts.skillsTable && skill) {
    const row = opts.skillsTable.rows.find(
      (r) => isDataRow(r) && getCell(r, opts.skillsTable!, "skill").toLowerCase() === skill.toLowerCase(),
    );
    if (row) {
      desc = desc || getCell(row, opts.skillsTable, "skilldesc");
      id = id || getCell(row, opts.skillsTable, "*Id") || getCell(row, opts.skillsTable, "Id");
    }
  }

  if (opts.skilldescTable && desc) {
    const row = opts.skilldescTable.rows.find(
      (r) => isDataRow(r) && getCell(r, opts.skilldescTable!, "skilldesc").toLowerCase() === desc.toLowerCase(),
    );
    if (row) {
      const strName = getCell(row, opts.skilldescTable, "str name");
      const named = strings.tryDisplay(strName);
      if (named) return named;
    }
  }

  const keys = [skill, desc, id ? `skillname${id}` : "", id ? `Skillname${id}` : "", pascalNameKey(skill), pascalNameKey(desc)];
  for (const k of keys) {
    if (!k) continue;
    const hit = strings.tryDisplay(k);
    if (hit) return hit;
  }
  return skill || desc || id;
}

export function figureKorean(englishName: string, code: string): string | null {
  const bags: Record<string, string> = {
    "doll bag": "피규어 가방",
    "mini doll bag": "미니 피규어 가방",
    dol: "피규어 가방",
    mol: "미니 피규어 가방",
  };
  const lower = englishName.toLowerCase();
  if (bags[lower]) return bags[lower];
  if (bags[code]) return bags[code];
  const m = englishName.match(/^(R|O)?Doll(\d+)$/i);
  if (m) {
    const kind = m[1]?.toUpperCase() === "R" ? "레어 피규어" : m[1]?.toUpperCase() === "O" ? "전설 피규어" : "피규어";
    return `${kind} ${m[2]}`;
  }
  if (/^card\s*\d+/i.test(englishName)) return englishName.replace(/^card\s*/i, "카드 ");
  return null;
}

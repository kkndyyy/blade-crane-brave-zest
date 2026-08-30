import { colIndex, getCell, isDataRow, type TsvTable } from "./tsv.ts";
import type { StringTable } from "./strings.ts";

export type LnPair = { baseCol: string; perCol: string; cap?: number };
export type BlvlStep = { at: number; value: number };

export type SkillOption = {
  id: string;
  label: string;
  hint: string;
  calcCol: string;
  calc: string;
  kind: "param" | "ln" | "cap" | "formula";
  paramCol?: string;
  ln?: LnPair;
  steps?: BlvlStep[];
};

const SKIP_DESC_IDS = new Set(["18", "40", "2"]);
const SKIP_TEXT = /^(sksyn|skillname|sksyn)$/i;

function unquote(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

export function tooltipLabel(raw: string): string {
  const clean = raw
    .replace(/\u00ffc./g, "")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/\r/g, "");
  const first = (clean.split("\n")[0] ?? clean).trim();
  return first
    .replace(/:%?\s*%[+0-9.]*[sd].*$/i, "")
    .replace(/%[+0-9.]*[sd]/g, "")
    .replace(/[:：]\s*$/, "")
    .trim();
}

function unwrapParens(s: string): string {
  let t = s;
  while (t.startsWith("(") && t.endsWith(")")) {
    let depth = 0;
    let wrapped = true;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === "(") depth++;
      else if (t[i] === ")") depth--;
      if (depth === 0 && i < t.length - 1) {
        wrapped = false;
        break;
      }
    }
    if (!wrapped || depth !== 0) break;
    t = t.slice(1, -1);
  }
  return t;
}

export function parseBlvlSteps(expr: string): BlvlStep[] | null {
  let rest = unwrapParens(unquote(expr).replace(/\s+/g, ""));
  if (!rest) return null;
  const steps: BlvlStep[] = [];
  for (let i = 0; i < 6; i++) {
    const m = rest.match(/^\(blvl>=(\d+)\)\?(-?\d+):(.*)$/);
    if (!m) break;
    steps.push({ at: Number(m[1]), value: Number(m[2]) });
    rest = unwrapParens(m[3]!);
  }
  if (!/^-?\d+$/.test(rest) || !steps.length) return null;
  steps.push({ at: 1, value: Number(rest) });
  steps.sort((a, b) => a.at - b.at);
  return steps;
}

export function formatBlvlSteps(steps: BlvlStep[]): string {
  const ordered = [...steps].sort((a, b) => b.at - a.at);
  const base = ordered[ordered.length - 1];
  if (!base) return "1";
  let expr = String(base.value);
  for (let i = ordered.length - 2; i >= 0; i--) {
    const s = ordered[i]!;
    expr = `((blvl>=${s.at})?${s.value}:${expr})`;
  }
  return expr;
}

export const BIND_RANKS = [
  { id: "normal", ko: "일반", en: "Normal" },
  { id: "champion", ko: "챔피언", en: "Champion" },
  { id: "unique", ko: "유니크", en: "Unique" },
  { id: "superunique", ko: "슈퍼유니크", en: "Super Unique" },
  { id: "boss", ko: "보스", en: "Boss" },
] as const;

export type BindRankId = (typeof BIND_RANKS)[number]["id"];
export type BindRankBand = { at: number; ranks: BindRankId[] };
export type BindRankEditor = { key: string; ko: string; en: string; bands: BindRankBand[] };

const RANK_ALIAS: Record<string, BindRankId> = {
  일반: "normal",
  노멀: "normal",
  normal: "normal",
  normals: "normal",
  챔피언: "champion",
  champion: "champion",
  champions: "champion",
  유니크: "unique",
  unique: "unique",
  uniques: "unique",
  슈퍼유니크: "superunique",
  superunique: "superunique",
  superuniques: "superunique",
  보스: "boss",
  boss: "boss",
  bosses: "boss",
};

const DEFAULT_BIND_BANDS: BindRankBand[] = [
  { at: 1, ranks: ["normal"] },
  { at: 10, ranks: ["champion"] },
  { at: 15, ranks: ["unique"] },
  { at: 20, ranks: ["superunique"] },
];

const BIND_HEADER_KO = "직접 투자한 스킬이 아래 이상이어야 해당 등급 악마를 속박 가능";
const BIND_HEADER_EN = "Requires hard points to bind each monster rank";

function compactRankToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

function parseRankToken(raw: string): BindRankId | null {
  return RANK_ALIAS[compactRankToken(raw)] ?? null;
}

function parseBindRankPart(part: string): BindRankBand | null {
  const m = part.trim().match(/^(.*?)(\d+)\s*$/);
  if (!m) return null;
  const names = m[1]!.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const ranks = names.map(parseRankToken).filter((x): x is BindRankId => Boolean(x));
  if (!ranks.length) return null;
  const uniq: BindRankId[] = [];
  for (const r of ranks) if (!uniq.includes(r)) uniq.push(r);
  return { at: Number(m[2]), ranks: uniq };
}

function parseBindRankLine(line: string): BindRankBand[] | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s*\/\s*/);
  const bands: BindRankBand[] = [];
  for (const part of parts) {
    const band = parseBindRankPart(part);
    if (!band) return null;
    bands.push(band);
  }
  return bands.length ? bands : null;
}

export function parseBindRanks(text: string): BindRankBand[] | null {
  for (const line of text.split(/\r?\n/)) {
    const bands = parseBindRankLine(line);
    if (bands) return bands;
  }
  return null;
}

export function formatBindRankLine(bands: BindRankBand[], lang: "ko" | "en"): string {
  const ordered = [...bands]
    .filter((b) => Number.isFinite(b.at) && b.at >= 1 && b.ranks.length)
    .sort((a, b) => a.at - b.at);
  return ordered
    .map((b) => {
      const names = b.ranks.map((id) => BIND_RANKS.find((r) => r.id === id)?.[lang] ?? id);
      return `${names.join(", ")} ${Math.floor(b.at)}`;
    })
    .join(" / ");
}

function isBindHeader(line: string): boolean {
  const t = line.trim();
  return t.includes("해당 등급") || t.includes("Requires hard points to bind") || t.includes("base skill levels");
}

export function replaceBindRankText(text: string, bands: BindRankBand[], lang: "ko" | "en"): string {
  const line = formatBindRankLine(bands, lang);
  const header = lang === "ko" ? BIND_HEADER_KO : BIND_HEADER_EN;
  const kept: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (parseBindRankLine(raw) || isBindHeader(raw)) continue;
    kept.push(raw);
  }
  while (kept.length && kept[kept.length - 1]!.trim() === "") kept.pop();
  if (line) {
    kept.push("");
    kept.push(header);
    kept.push(line);
  }
  return kept.join("\n");
}

function isBindDemonSkill(skillRow: string[], skills: TsvTable, longKey: string): boolean {
  const name = getCell(skillRow, skills, "skill").toLowerCase();
  const desc = getCell(skillRow, skills, "skilldesc").toLowerCase();
  const key = longKey.toLowerCase();
  return name.includes("bind demon") || desc.includes("bind demon") || key.includes("binddemon");
}

export function findBindRankEditor(
  skillRow: string[],
  skills: TsvTable,
  skilldesc: TsvTable | undefined,
  strings: StringTable,
): BindRankEditor | null {
  if (!skilldesc) return null;
  const descKey = getCell(skillRow, skills, "skilldesc").trim();
  if (!descKey) return null;
  const descRow = skilldesc.rows.find(
    (r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc").toLowerCase() === descKey.toLowerCase(),
  );
  if (!descRow) return null;
  const longKey =
    getCell(descRow, skilldesc, "str long").trim() || getCell(descRow, skilldesc, "str short").trim();
  if (!longKey) return null;
  const raw = strings.rawText(longKey);
  const ko = raw?.ko ?? "";
  const en = raw?.en ?? "";
  const bands = parseBindRanks(ko) ?? parseBindRanks(en);
  if (!bands && !isBindDemonSkill(skillRow, skills, longKey)) return null;
  return { key: longKey, ko, en, bands: bands ?? DEFAULT_BIND_BANDS };
}

export function blvlToPetmax(skillName: string, tooltipCalc: string): string {
  const calc = unquote(tooltipCalc).replace(/\s+/g, "");
  if (/^-?\d+$/.test(calc)) return calc;
  return calc.replace(/blvl/g, `skill('${skillName}'.blvl)`);
}

export function replaceRelatedPetmax(petmax: string, skillName: string, tooltipCalc: string): string | null {
  const token = `skill('${skillName}'.blvl)`;
  if (!petmax.includes(token)) return null;
  const core = blvlToPetmax(skillName, tooltipCalc);
  const suffixMatch = petmax.match(/(\+stat\('val1'\.accr\))\s*$/);
  const suffix = suffixMatch?.[1] ?? "";
  return core + suffix;
}

function parseLn(calc: string): LnPair | null {
  const s = unquote(calc).replace(/\s+/g, "");
  let cap: number | undefined;
  let body = s;
  const minm = body.match(/^min\((ln\d{2}),(\d+)\)$/i);
  if (minm) {
    body = minm[1]!;
    cap = Number(minm[2]);
  }
  const m = body.match(/^ln(\d)(\d)$/i);
  if (!m) return null;
  return { baseCol: `Param${m[1]}`, perCol: `Param${m[2]}`, cap };
}

function parseDm(calc: string): LnPair | null {
  const s = unquote(calc).replace(/\s+/g, "");
  const m = s.match(/^dm(\d)(\d)$/i);
  if (!m) return null;
  return { baseCol: `Param${m[1]}`, perCol: `Param${m[2]}` };
}

function parsePar(calc: string): string | null {
  const s = unquote(calc).replace(/\s+/g, "");
  const m = s.match(/^par(\d+)$/i);
  return m ? `Param${Number(m[1])}` : null;
}

const DESC_GROUPS = [
  { line: "descline", texta: "desctexta", textb: "desctextb", calca: "desccalca", calcb: "desccalcb", n: 6 },
  { line: "dsc2line", texta: "dsc2texta", textb: "dsc2textb", calca: "dsc2calca", calcb: "dsc2calcb", n: 6 },
] as const;

export function listSkillOptions(
  skillRow: string[],
  skills: TsvTable,
  skilldesc: TsvTable | undefined,
  strings: StringTable,
): SkillOption[] {
  const descKey = getCell(skillRow, skills, "skilldesc").trim();
  if (!descKey || !skilldesc) return [];
  const descRow = skilldesc.rows.find(
    (r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc").toLowerCase() === descKey.toLowerCase(),
  );
  if (!descRow) return [];

  const out: SkillOption[] = [];
  const seen = new Set<string>();

  for (const g of DESC_GROUPS) {
    for (let i = 1; i <= g.n; i++) {
      const lineId = getCell(descRow, skilldesc, `${g.line}${i}`).trim();
      if (!lineId || SKIP_DESC_IDS.has(lineId)) continue;
      const texta = getCell(descRow, skilldesc, `${g.texta}${i}`).trim();
      const textb = getCell(descRow, skilldesc, `${g.textb}${i}`).trim();
      const calca = getCell(descRow, skilldesc, `${g.calca}${i}`);
      if (!texta || SKIP_TEXT.test(texta)) continue;
      const rawLabel = strings.display(texta, texta);
      const label = tooltipLabel(rawLabel) || texta;
      if (SKIP_TEXT.test(label) || /^skillname/i.test(texta)) continue;
      const calcCol = `${g.calca}${i}`;
      const calc = unquote(calca);
      if (!calc) continue;
      const id = `${descKey}:${calcCol}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const hint = textb && strings.tryDisplay(textb) ? tooltipLabel(strings.tryDisplay(textb)) : "";
      const steps = parseBlvlSteps(calc);
      const ln = parseLn(calc) ?? parseDm(calc);
      const paramCol = parsePar(calc);

      if (steps) {
        out.push({ id, label, hint, calcCol, calc, kind: "cap", steps });
      } else if (ln) {
        out.push({ id, label, hint, calcCol, calc, kind: "ln", ln });
      } else if (paramCol) {
        out.push({ id, label, hint, calcCol, calc, kind: "param", paramCol });
      } else {
        out.push({ id, label, hint, calcCol, calc, kind: "formula" });
      }
    }
  }
  return out;
}

export function applyRelatedPetmax(skills: TsvTable, skillName: string, tooltipCalc: string): number {
  const idx = colIndex(skills, "petmax");
  if (idx < 0) return 0;
  let n = 0;
  for (const row of skills.rows) {
    if (!isDataRow(row)) continue;
    const cur = row[idx] ?? "";
    const next = replaceRelatedPetmax(cur, skillName, tooltipCalc);
    if (next != null && next !== cur) {
      row[idx] = next;
      n++;
    }
  }
  return n;
}

export function findSkilldescRow(skilldesc: TsvTable, descKey: string): { index: number; row: string[] } | null {
  const i = skilldesc.rows.findIndex(
    (r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc").toLowerCase() === descKey.toLowerCase(),
  );
  if (i < 0) return null;
  return { index: i, row: skilldesc.rows[i]! };
}

export function paramHint(row: string[], skills: TsvTable, col: string): string {
  for (const c of [`*${col} Description`, `*${col} Description2`, `*${col} desc`, `*${col}desc`, `*${col}Description`]) {
    const v = getCell(row, skills, c).trim();
    if (v) return v;
  }
  return "";
}

export function usedParamCols(options: SkillOption[]): Set<string> {
  const s = new Set<string>();
  for (const o of options) {
    if (o.paramCol) s.add(o.paramCol);
    if (o.ln) {
      s.add(o.ln.baseCol);
      s.add(o.ln.perCol);
    }
  }
  return s;
}

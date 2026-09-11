import { getCell, isDataRow, setCell, type TsvTable } from "./tsv.ts";
import { skillIdOf } from "./skillPicker.ts";

export const SYNERGY_KINDS = [
  { id: "edmg", col: "EDmgSymPerCalc", label: "속성 피해", hint: "화염·냉기·번개처럼 속성 피해가 시너지 레벨당 늘어납니다." },
  { id: "dmg", col: "DmgSymPerCalc", label: "물리 피해", hint: "무기 타격 피해가 시너지 레벨당 늘어납니다." },
  { id: "elen", col: "ELenSymPerCalc", label: "지속시간", hint: "빙결·독 같은 지속 시간이 시너지 레벨당 늘어납니다." },
] as const;

export type SynergyKindId = (typeof SYNERGY_KINDS)[number]["id"];

export type SynergyTerm = {
  skill: string;
  stat: "blvl" | "lvl";
  percent: number;
  percentSrc: { kind: "par"; n: number } | { kind: "literal" } | { kind: "expr"; raw: string };
};

export type ParsedSynergy = {
  terms: SynergyTerm[];
  extra: string;
  raw: string;
  editable: boolean;
};

const PAR_REF = /^(?:par|pa)(\d+)$/i;

function compact(s: string): string {
  let out = "";
  let quote = false;
  for (const ch of s) {
    if (ch === "'") quote = !quote;
    if (!quote && /\s/.test(ch)) continue;
    out += ch;
  }
  return out;
}

function unwrap(s: string): string {
  let t = s.trim();
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

function splitTopPlus(s: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  let quote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "'" || ch === '"') quote = !quote;
    if (!quote) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === "+" && depth === 0) {
        if (buf) out.push(buf);
        buf = "";
        continue;
      }
    }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

function parseParToken(raw: string): number | null {
  const m = compact(raw).match(PAR_REF);
  return m ? Number(m[1]) : null;
}

function parseTerm(raw: string, params: Record<number, number>, selfName: string): SynergyTerm | { extra: string } {
  const t = unwrap(compact(raw));
  const m = t.match(/^skill\('([^']+)'\.(blvl|lvl)\)(?:\*(.+))?$/i);
  if (!m) {
    const selfPar = t.match(/^skill\('([^']+)'\.par(\d+)\)$/i);
    if (selfPar && selfPar[1]!.toLowerCase() === selfName.toLowerCase()) {
      return { extra: `par${selfPar[2]}` };
    }
    return { extra: raw };
  }
  const skill = m[1]!;
  const stat = m[2]!.toLowerCase() === "lvl" ? "lvl" : "blvl";
  const mult = m[3] ? unwrap(m[3]) : "";
  if (!mult) {
    return { skill, stat, percent: 1, percentSrc: { kind: "literal" } };
  }
  const parN = parseParToken(mult);
  if (parN != null) {
    return { skill, stat, percent: params[parN] ?? 0, percentSrc: { kind: "par", n: parN } };
  }
  const selfPar = mult.match(/^skill\('([^']+)'\.par(\d+)\)$/i);
  if (selfPar && selfPar[1]!.toLowerCase() === selfName.toLowerCase()) {
    const n = Number(selfPar[2]);
    return { skill, stat, percent: params[n] ?? 0, percentSrc: { kind: "par", n } };
  }
  if (/^-?\d+(?:\.\d+)?$/.test(mult)) {
    return { skill, stat, percent: Number(mult), percentSrc: { kind: "literal" } };
  }
  return { skill, stat, percent: 0, percentSrc: { kind: "expr", raw: mult } };
}

export function readParamMap(row: string[], skills: TsvTable): Record<number, number> {
  const out: Record<number, number> = {};
  for (let n = 1; n <= 16; n++) {
    const v = getCell(row, skills, `Param${n}`).trim();
    if (!v) continue;
    const num = Number(v);
    if (Number.isFinite(num)) out[n] = num;
  }
  return out;
}

export function parseSynergyCalc(expr: string, params: Record<number, number>, selfName = ""): ParsedSynergy {
  const raw = expr.trim();
  if (!raw) return { terms: [], extra: "", raw: "", editable: true };
  const c = unwrap(compact(raw));

  const group = c.match(/^(.*)\*(par\d+|pa\d+|-?\d+(?:\.\d+)?|skill\('[^']+'\.par\d+\))$/i);
  if (group) {
    const inner = unwrap(group[1]!);
    const parts = splitTopPlus(inner);
    const terms: SynergyTerm[] = [];
    let extraParts: string[] = [];
    let ok = true;
    for (const p of parts) {
      const parsed = parseTerm(p, params, selfName);
      if ("extra" in parsed) {
        extraParts.push(parsed.extra);
        ok = false;
        continue;
      }
      if (parsed.percentSrc.kind === "expr") ok = false;
      terms.push(parsed);
    }
    if (terms.length && terms.every((t) => t.percentSrc.kind !== "expr")) {
      const mult = group[2]!;
      const parN = parseParToken(mult);
      let src: SynergyTerm["percentSrc"];
      let percent = 0;
      if (parN != null) {
        src = { kind: "par", n: parN };
        percent = params[parN] ?? 0;
      } else {
        const selfPar = mult.match(/^skill\('([^']+)'\.par(\d+)\)$/i);
        if (selfPar && selfPar[1]!.toLowerCase() === selfName.toLowerCase()) {
          const n = Number(selfPar[2]);
          src = { kind: "par", n };
          percent = params[n] ?? 0;
        } else if (/^-?\d+(?:\.\d+)?$/.test(mult)) {
          src = { kind: "literal" };
          percent = Number(mult);
        } else {
          src = { kind: "expr", raw: mult };
        }
      }
      const applied = terms.map((t) => ({ ...t, percent, percentSrc: src }));
      const extraOnly = extraParts.filter((e) => e && e !== "+" && !PAR_REF.test(compact(e)));
      return {
        terms: applied,
        extra: extraOnly.join("+"),
        raw,
        editable: src.kind !== "expr" && extraOnly.length === 0,
      };
    }
  }

  const parts = splitTopPlus(c);
  const terms: SynergyTerm[] = [];
  const extras: string[] = [];
  for (const p of parts) {
    const parsed = parseTerm(p, params, selfName);
    if ("extra" in parsed) extras.push(parsed.extra);
    else terms.push(parsed);
  }
  const editable =
    terms.length > 0 &&
    terms.every((t) => t.percentSrc.kind !== "expr") &&
    extras.length === 0;
  return { terms, extra: extras.join("+"), raw, editable: editable || terms.length === 0 };
}

function formatMult(src: SynergyTerm["percentSrc"], percent: number): string {
  if (src.kind === "par") return src.n > 8 ? `pa${src.n}` : `par${src.n}`;
  if (src.kind === "literal") return String(percent);
  return src.raw;
}

function formatSkillRef(term: SynergyTerm): string {
  return `skill('${term.skill}'.${term.stat})`;
}

export function formatSynergyCalc(parsed: ParsedSynergy): string {
  if (!parsed.terms.length) return parsed.extra || "";
  const terms = parsed.terms.filter((t) => t.skill.trim());
  if (!terms.length) return parsed.extra || "";

  const samePar =
    terms.length > 0 &&
    terms.every(
      (t) =>
        t.percentSrc.kind === "par" &&
        t.percentSrc.n === (terms[0]!.percentSrc.kind === "par" ? terms[0]!.percentSrc.n : -1) &&
        t.percent === terms[0]!.percent,
    );
  const sameLiteral =
    terms.length > 0 &&
    terms.every((t) => t.percentSrc.kind === "literal" && t.percent === terms[0]!.percent);

  let body: string;
  if (samePar || sameLiteral) {
    const inner = terms.map(formatSkillRef).join("+");
    const wrapped = terms.length > 1 ? `(${inner})` : inner;
    body = `${wrapped}*${formatMult(terms[0]!.percentSrc, terms[0]!.percent)}`;
  } else {
    body = terms
      .map((t) => `(${formatSkillRef(t)}*${formatMult(t.percentSrc, t.percent)})`)
      .join("+");
  }
  if (parsed.extra) body += parsed.extra.startsWith("+") ? parsed.extra : `+${parsed.extra}`;
  return body;
}

export function defaultParamFor(kind: SynergyKindId, used: Set<number>): number {
  const prefer = kind === "elen" ? [7, 8, 6, 5, 4] : [8, 7, 6, 5, 4];
  for (const n of prefer) if (!used.has(n)) return n;
  for (let n = 1; n <= 16; n++) if (!used.has(n)) return n;
  return kind === "elen" ? 7 : 8;
}

export function assignParams(terms: SynergyTerm[], kind: SynergyKindId): SynergyTerm[] {
  const used = new Set<number>();
  for (const t of terms) if (t.percentSrc.kind === "par") used.add(t.percentSrc.n);
  const percents = terms.map((t) => t.percent);
  const allSame = percents.length > 0 && percents.every((p) => p === percents[0]);
  if (allSame) {
    const existing = terms.find((t) => t.percentSrc.kind === "par");
    const n = existing && existing.percentSrc.kind === "par" ? existing.percentSrc.n : defaultParamFor(kind, new Set());
    return terms.map((t) => ({
      ...t,
      percentSrc: { kind: "par", n },
      percent: percents[0] ?? 0,
    }));
  }
  return terms.map((t) => {
    if (t.percentSrc.kind === "par") return t;
    const n = defaultParamFor(kind, used);
    used.add(n);
    return { ...t, percentSrc: { kind: "par", n } };
  });
}

function findSkillRow(skills: TsvTable, name: string): string[] | undefined {
  const want = name.trim().toLowerCase();
  return skills.rows.find((r) => isDataRow(r) && getCell(r, skills, "skill").trim().toLowerCase() === want);
}

const DMG_DESC: Record<string, string> = {
  fire: "Firedplev",
  cold: "Colddplev",
  ltng: "Ltngdplev",
  mag: "Magdplev",
  pois: "Poisdplev",
};

const LEN_DESC: Record<string, string> = {
  cold: "FrezLenplev",
  pois: "Secplev2",
  fire: "Durateplev",
  ltng: "Durateplev",
};

const MANAGED_DESCA = new Set([
  "Damplev",
  "Firedplev",
  "Colddplev",
  "Ltngdplev",
  "Magdplev",
  "Poisdplev",
  "FrezLenplev",
  "Durateplev",
  "Secplev2",
]);

function skillNameKey(id: string): string {
  return id ? `skillname${id}` : "";
}

function calcaOf(term: SynergyTerm): string {
  if (term.percentSrc.kind === "par") return term.percentSrc.n > 8 ? `pa${term.percentSrc.n}` : `par${term.percentSrc.n}`;
  return String(term.percent);
}

type DescSlot = { line: string; texta: string; textb: string; calca: string; calcb: string };

function readDescSlots(row: string[], skilldesc: TsvTable): DescSlot[] {
  const slots: DescSlot[] = [];
  for (let i = 1; i <= 7; i++) {
    slots.push({
      line: getCell(row, skilldesc, `dsc3line${i}`),
      texta: getCell(row, skilldesc, `dsc3texta${i}`),
      textb: getCell(row, skilldesc, `dsc3textb${i}`),
      calca: getCell(row, skilldesc, `dsc3calca${i}`),
      calcb: getCell(row, skilldesc, `dsc3calcb${i}`),
    });
  }
  return slots;
}

function writeDescSlots(row: string[], skilldesc: TsvTable, slots: DescSlot[]) {
  for (let i = 1; i <= 7; i++) {
    const s = slots[i - 1] ?? { line: "", texta: "", textb: "", calca: "", calcb: "" };
    setCell(row, skilldesc, `dsc3line${i}`, s.line);
    setCell(row, skilldesc, `dsc3texta${i}`, s.texta);
    setCell(row, skilldesc, `dsc3textb${i}`, s.textb);
    setCell(row, skilldesc, `dsc3calca${i}`, s.calca);
    setCell(row, skilldesc, `dsc3calcb${i}`, s.calcb);
  }
}

function termSlots(
  terms: SynergyTerm[],
  texta: string,
  skills: TsvTable,
): DescSlot[] {
  const out: DescSlot[] = [];
  for (const t of terms) {
    if (!t.skill.trim()) continue;
    const row = findSkillRow(skills, t.skill);
    const id = row ? skillIdOf(row, skills) : "";
    const key = skillNameKey(id);
    if (!key) continue;
    out.push({ line: "76", texta, textb: key, calca: calcaOf(t), calcb: "" });
  }
  return out;
}

export function applySynergyToSkill(
  skills: TsvTable,
  skillRowIndex: number,
  kind: SynergyKindId,
  nextTerms: SynergyTerm[],
  extra: string,
): string {
  const row = skills.rows[skillRowIndex];
  if (!row) return "";
  const def = SYNERGY_KINDS.find((k) => k.id === kind)!;
  const assigned = assignParams(nextTerms.filter((t) => t.skill.trim()), kind);
  const formula = formatSynergyCalc({ terms: assigned, extra, raw: "", editable: true });
  setCell(row, skills, def.col, formula);
  for (const t of assigned) {
    if (t.percentSrc.kind === "par") setCell(row, skills, `Param${t.percentSrc.n}`, String(Math.round(t.percent)));
  }
  return formula;
}

export function applySynergyDesc(
  skills: TsvTable,
  skilldesc: TsvTable,
  skillRowIndex: number,
): number {
  const skillRow = skills.rows[skillRowIndex];
  if (!skillRow) return 0;
  const descKey = getCell(skillRow, skills, "skilldesc").trim();
  if (!descKey) return 0;
  const found = skilldesc.rows.findIndex(
    (r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc").toLowerCase() === descKey.toLowerCase(),
  );
  if (found < 0) return 0;
  const descRow = skilldesc.rows[found]!;
  const params = readParamMap(skillRow, skills);
  const self = getCell(skillRow, skills, "skill");
  const etype = getCell(skillRow, skills, "EType").trim().toLowerCase();
  const ownId = skillIdOf(skillRow, skills);

  const edmg = parseSynergyCalc(getCell(skillRow, skills, "EDmgSymPerCalc"), params, self);
  const dmg = parseSynergyCalc(getCell(skillRow, skills, "DmgSymPerCalc"), params, self);
  const elen = parseSynergyCalc(getCell(skillRow, skills, "ELenSymPerCalc"), params, self);

  const existing = readDescSlots(descRow, skilldesc);
  const preserved = existing.filter((s) => {
    if (!s.line.trim() && !s.texta.trim()) return false;
    if (s.line.trim() === "40") return false;
    if (s.line.trim() === "76" && MANAGED_DESCA.has(s.texta.trim())) return false;
    return true;
  });

  const built: DescSlot[] = [];
  const hasAny = edmg.terms.length + dmg.terms.length + elen.terms.length > 0;
  if (hasAny) {
    built.push({
      line: "40",
      texta: "Sksyn",
      textb: skillNameKey(ownId),
      calca: "2",
      calcb: "",
    });
  }
  built.push(...termSlots(edmg.terms, DMG_DESC[etype] ?? "Damplev", skills));
  built.push(...termSlots(dmg.terms, "Damplev", skills));
  built.push(...termSlots(elen.terms, LEN_DESC[etype] ?? "Durateplev", skills));
  built.push(...preserved);

  writeDescSlots(descRow, skilldesc, built.slice(0, 7));
  return 1;
}

export function synergyKindByCol(col: string): SynergyKindId | null {
  const hit = SYNERGY_KINDS.find((k) => k.col.toLowerCase() === col.toLowerCase());
  return hit ? hit.id : null;
}

export function listedSynergySkills(expr: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const re = /skill\('([^']+)'\.(blvl|lvl)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr))) {
    const n = m[1]!;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    names.push(n);
  }
  return names;
}

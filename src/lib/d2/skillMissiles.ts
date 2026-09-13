import { getCell, isDataRow, num, setCell, type TsvTable } from "./tsv.ts";
import { paramHint } from "./skillOptions.ts";

export type MissileCountKind = "ln" | "fixed" | "minmax" | "every";

export type MissileMirror = { skill: string; col: string };

export type MissileCountField = {
  id: string;
  kind: MissileCountKind;
  label: string;
  hint: string;
  baseCol: string;
  perCol?: string;
  maxCol?: string;
  cap?: number;
  baseMirrors: MissileMirror[];
  perMirrors: MissileMirror[];
  maxMirrors: MissileMirror[];
  synthetic?: boolean;
};

const COUNT_FUNCS = new Set(["8", "11", "12", "14", "17", "43", "45", "118"]);

function classify(desc: string): "base" | "per" | "fixed" | "min" | "max" | "every" | "shots" | null {
  const s = desc.toLowerCase().replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (/synergy/.test(s)) return null;
  if (/activation frame|duration of missile|velocity|rollback|damage %|radius of|search radius|periodic/.test(s)) {
    return null;
  }
  if (/levels needed per|# of levels needed|per n levels|created per n levels/.test(s)) return "every";
  if (/shots fired min/.test(s)) return "min";
  if (/shots fired max/.test(s)) return "max";
  if (/# of shots/.test(s)) return "shots";
  if (/additional missiles/.test(s)) return "per";
  if (/per level/.test(s) && /missile|bolt/.test(s)) return "per";
  if (/baseline/.test(s) && /missile|bolt/.test(s)) return "base";
  if (/^number of missiles/.test(s)) return "base";
  if (/# of (?:\w+ )?(?:missile|bolt)/.test(s) && !/per/.test(s) && !/modifier/.test(s)) return "fixed";
  if (/missiles created$/.test(s) && !/per/.test(s) && !/modifier/.test(s)) return "fixed";
  return null;
}

function parseMirrors(desc: string): MissileMirror[] {
  const out: MissileMirror[] = [];
  const re = /must match\s+(.+?)\s+param(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(desc))) {
    out.push({ skill: m[1]!.trim(), col: `Param${Number(m[2])}` });
  }
  return out;
}

function parseCapFromDesc(skills: TsvTable, skillRow: string[], skilldesc?: TsvTable): number | undefined {
  if (!skilldesc) return undefined;
  const descKey = getCell(skillRow, skills, "skilldesc").trim();
  if (!descKey) return undefined;
  const descRow = skilldesc.rows.find(
    (r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc").toLowerCase() === descKey.toLowerCase(),
  );
  if (!descRow) return undefined;
  const groups = [
    { calc: "desccalca", n: 6 },
    { calc: "dsc2calca", n: 6 },
  ];
  for (const g of groups) {
    for (let i = 1; i <= g.n; i++) {
      const calc = getCell(descRow, skilldesc, `${g.calc}${i}`).replace(/["'\s]/g, "");
      const cap = calc.match(/^min\((?:ln\d{2},(\d+)|(\d+),ln\d{2})\)$/i);
      if (cap) return Number(cap[1] || cap[2]);
    }
  }
  return undefined;
}

function descLooksUsed(desc: string): boolean {
  const s = desc.toLowerCase().trim();
  if (!s) return false;
  if (/synergy/.test(s)) return false;
  return true;
}

function paramFree(row: string[], skills: TsvTable, n: number): boolean {
  const val = getCell(row, skills, `Param${n}`).trim();
  const desc = paramHint(row, skills, `Param${n}`);
  if (descLooksUsed(desc)) return false;
  if (!val || val === "0") return true;
  return false;
}

function primaryMissile(row: string[], skills: TsvTable): string {
  return getCell(row, skills, "srvmissile").trim() || getCell(row, skills, "cltmissile").trim();
}

function emptyDoFunc(value: string): boolean {
  const v = value.trim();
  return !v || v === "0";
}

/** Projectile skills that launch a missile without a special do-func (Fire Bolt, Fire Ball, Ice Blast…). */
export function isSimpleMissileSkill(row: string[], skills: TsvTable): boolean {
  if (!primaryMissile(row, skills)) return false;
  if (!emptyDoFunc(getCell(row, skills, "srvdofunc"))) return false;
  if (!emptyDoFunc(getCell(row, skills, "cltdofunc"))) return false;
  return true;
}

export function rewriteParamRefs(expr: string, from: number, to: number): string {
  if (from === to) return expr;
  let s = expr;
  s = s.replace(new RegExp(`\\bln${from}(\\d)\\b`, "gi"), (_, b: string) => `ln${to}${b}`);
  s = s.replace(new RegExp(`\\bln(\\d)${from}\\b`, "gi"), (_, a: string) => `ln${a}${to}`);
  s = s.replace(new RegExp(`\\bdm${from}(\\d)\\b`, "gi"), (_, b: string) => `dm${to}${b}`);
  s = s.replace(new RegExp(`\\bdm(\\d)${from}\\b`, "gi"), (_, a: string) => `dm${a}${to}`);
  s = s.replace(new RegExp(`\\bpar${from}\\b`, "gi"), `par${to}`);
  s = s.replace(new RegExp(`\\bpa${from}\\b`, "gi"), to > 8 ? `pa${to}` : `par${to}`);
  return s;
}

function rewriteTableFormulas(table: TsvTable, row: string[], from: number, to: number) {
  for (let i = 0; i < table.headers.length; i++) {
    const h = table.headers[i] ?? "";
    if (/^Param\d+$/i.test(h) || /^\*Param/i.test(h)) continue;
    const v = row[i];
    if (!v || !/(?:par|pa|ln|dm)\d/i.test(v)) continue;
    row[i] = rewriteParamRefs(v, from, to);
  }
}

function findFreeParam(row: string[], skills: TsvTable, reserved: Set<number>, start = 1): number | null {
  for (let n = start; n <= 16; n++) {
    if (reserved.has(n)) continue;
    if (paramFree(row, skills, n)) return n;
  }
  return null;
}

function countDesc(desc: string): boolean {
  return classify(desc) != null;
}

export function isExplosionRadiusDesc(desc: string): boolean {
  return /explosion radius|radius of impact/i.test(desc);
}

function forceDesc(row: string[], skills: TsvTable, n: number, text: string) {
  for (const col of [`*Param${n} Description`, `*Param${n} Description2`, `*Param${n} desc`]) {
    if (skills.headers.some((h) => h.toLowerCase() === col.toLowerCase())) {
      setCell(row, skills, col, text);
      return;
    }
  }
}

function setCalcDesc(row: string[], skills: TsvTable, calc: string, text: string) {
  for (const col of [`*${calc} desc`, `*${calc} Desc`, `*${calc} Description`]) {
    if (skills.headers.some((h) => h.toLowerCase() === col.toLowerCase())) {
      setCell(row, skills, col, text);
      return;
    }
  }
}

function calcLooksLikeCount(expr: string): boolean {
  return /ln\d{2}/i.test(expr.replace(/\s+/g, ""));
}

export type CountSlots = { baseN: number; perN: number; actN: number };

export function pickCountSlots(row: string[], skills: TsvTable): CountSlots | null {
  const reserved = new Set<number>();
  for (let n = 1; n <= 16; n++) {
    const desc = paramHint(row, skills, `Param${n}`);
    if (countDesc(desc)) continue;
    if (/activation frame/i.test(desc)) continue;
    if (!paramFree(row, skills, n)) reserved.add(n);
  }
  let actN: number | null = null;
  if (!reserved.has(3)) actN = 3;
  else actN = findFreeParam(row, skills, reserved);
  if (actN == null) return null;
  reserved.add(actN);

  let baseN: number | null = null;
  let perN: number | null = null;
  for (let n = 1; n <= 16; n++) {
    const kind = classify(paramHint(row, skills, `Param${n}`));
    if (kind === "base" && baseN == null) baseN = n;
    if (kind === "per" && perN == null) perN = n;
  }
  if (baseN != null) reserved.add(baseN);
  if (perN != null) reserved.add(perN);
  if (baseN == null) {
    baseN = findFreeParam(row, skills, reserved);
    if (baseN == null) return null;
    reserved.add(baseN);
  }
  if (perN == null) {
    perN = findFreeParam(row, skills, reserved);
    if (perN == null) return null;
  }
  return { baseN, perN, actN };
}

/** Undo v1.6.15/16 stealing Param1 (count) and parking radius on Param4+. */
export function restoreExplosionRadiusParam(
  row: string[],
  skills: TsvTable,
  skilldesc?: TsvTable,
  origRow?: string[],
  origSkills?: TsvTable,
) {
  const origDesc = origRow && origSkills ? paramHint(origRow, origSkills, "Param1") : "";
  const origVal = origRow && origSkills ? getCell(origRow, origSkills, "Param1").trim() : "";
  const liveDesc = paramHint(row, skills, "Param1");
  if (isExplosionRadiusDesc(liveDesc)) {
    if (origVal && isExplosionRadiusDesc(origDesc)) setCell(row, skills, "Param1", origVal);
    return;
  }
  for (let n = 2; n <= 16; n++) {
    if (!isExplosionRadiusDesc(paramHint(row, skills, `Param${n}`))) continue;
    const radius = origVal && isExplosionRadiusDesc(origDesc) ? origVal : getCell(row, skills, `Param${n}`);
    setCell(row, skills, "Param1", radius);
    forceDesc(row, skills, 1, "Explosion Radius");
    setCell(row, skills, `Param${n}`, "");
    forceDesc(row, skills, n, "");
    rewriteTableFormulas(skills, row, n, 1);
    const descKey = getCell(row, skills, "skilldesc").trim();
    if (skilldesc && descKey) {
      const found = skilldesc.rows.find(
        (r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc").toLowerCase() === descKey.toLowerCase(),
      );
      if (found) rewriteTableFormulas(skilldesc, found, n, 1);
    }
    return;
  }
}

function findMissileRow(missiles: TsvTable, name: string): string[] | undefined {
  const want = name.trim().toLowerCase();
  if (!want) return undefined;
  return missiles.rows.find((r) => isDataRow(r) && getCell(r, missiles, "Missile").toLowerCase() === want);
}

/** Map v1.6.17 clones like fireballp back to the vanilla missile D2R already knows. */
export function canonicalMissileName(name: string, missiles?: TsvTable): string {
  const n = name.trim();
  if (!n || !missiles) return n;
  const m = n.match(/^(.*)p\d*$/i);
  const stem = m?.[1]?.trim() ?? "";
  if (!stem || stem.toLowerCase() === n.toLowerCase()) return n;
  if (findMissileRow(missiles, stem)) return stem;
  return n;
}

function listedMissile(row: string[], skills: TsvTable): string {
  for (const col of ["srvmissile", "srvmissilea", "srvmissileb", "cltmissile", "cltmissilea", "cltmissileb"]) {
    const v = getCell(row, skills, col).trim();
    if (v) return v;
  }
  return "";
}

/** Caster skills (Fire Ball, Fire Bolt) must use Charged Bolt 17/23 — AmaDoMultipleShot 8 does not fire on staff/orb. */
export function useChargedBoltFuncs(row: string[], skills: TsvTable, origRow?: string[], origSkills?: TsvTable): boolean {
  if (origRow && origSkills && isSimpleMissileSkill(origRow, origSkills)) return true;
  if (isSimpleMissileSkill(row, skills)) return true;
  if (isExplosionRadiusDesc(paramHint(row, skills, "Param1"))) return true;
  const func = getCell(row, skills, "srvdofunc").trim();
  if (func === "17") return true;
  if (func !== "8") return false;
  const st = getCell(row, skills, "cltstfunc").trim();
  const itype = getCell(row, skills, "itypea1").trim().toLowerCase();
  if (itype === "miss") return false;
  if (st === "19" || st === "11") return false;
  return true;
}

function applyDoFuncs(row: string[], skills: TsvTable, bolt: boolean) {
  if (bolt) {
    setCell(row, skills, "srvdofunc", "17");
    setCell(row, skills, "cltdofunc", "23");
    return;
  }
  setCell(row, skills, "srvdofunc", "8");
  setCell(row, skills, "cltdofunc", "17");
  if (!getCell(row, skills, "cltstfunc").trim()) setCell(row, skills, "cltstfunc", "19");
}

/** Pin sHitPar1 on the existing missile so explosion stays off skill calc1. Never clone — D2R ignores new missile IDs. */
export function pinMissileExplosion(
  missiles: TsvTable | undefined,
  sourceName: string,
  radius: string,
): string | null {
  const name = canonicalMissileName(sourceName, missiles);
  if (!name) return null;
  if (!missiles) return name;
  const src = findMissileRow(missiles, name);
  if (!src) return name;
  setCell(src, missiles, "sHitPar1", radius || "4");
  return name;
}

export function syncExplosionRadiusToMissile(
  skillRow: string[],
  skills: TsvTable,
  missiles: TsvTable,
  radius: string,
) {
  const names = ["srvmissile", "srvmissilea", "srvmissileb", "cltmissile", "cltmissilea"].map((c) =>
    canonicalMissileName(getCell(skillRow, skills, c).trim(), missiles),
  );
  const seen = new Set<string>();
  for (const name of names) {
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const row = findMissileRow(missiles, name);
    if (!row) continue;
    const hit = getCell(row, missiles, "sHitPar1").trim();
    if (!hit || hit === "0") continue;
    setCell(row, missiles, "sHitPar1", radius);
  }
}

function assignMultiMissiles(row: string[], skills: TsvTable, name: string) {
  setCell(row, skills, "srvmissile", "");
  setCell(row, skills, "cltmissile", "");
  for (const col of ["srvmissilea", "srvmissileb", "cltmissilea", "cltmissileb"]) {
    if (!skills.headers.some((h) => h.toLowerCase() === col.toLowerCase())) continue;
    setCell(row, skills, col, name);
  }
}

export function isMissileCountEnabled(row: string[], skills: TsvTable): boolean {
  const func = getCell(row, skills, "srvdofunc").trim();
  if (COUNT_FUNCS.has(func)) return true;
  return countDesc(paramHint(row, skills, "Param1")) || countDesc(paramHint(row, skills, "Param2"));
}

export function countInputValue(field: MissileCountField, row: string[], skills: TsvTable, col: string): string {
  if (field.synthetic && !isMissileCountEnabled(row, skills)) {
    if (col === field.baseCol) return "1";
    if (col === field.perCol) return "0";
  }
  return getCell(row, skills, col);
}

function emptyMirrors(): Pick<MissileCountField, "baseMirrors" | "perMirrors" | "maxMirrors"> {
  return { baseMirrors: [], perMirrors: [], maxMirrors: [] };
}

function syntheticMissileCountField(
  row: string[],
  skills: TsvTable,
  skilldesc?: TsvTable,
): MissileCountField | null {
  if (!isSimpleMissileSkill(row, skills) && !COUNT_FUNCS.has(getCell(row, skills, "srvdofunc").trim())) return null;
  const slots = pickCountSlots(row, skills);
  if (!slots) return null;
  return {
    id: "synthetic-ln",
    kind: "ln",
    label: "투사체 개수",
    hint: "원래 1발입니다. 개수를 바꾸면 여러 발을 부채꼴로 발사합니다. 폭발 반경은 Param1에 그대로 둡니다.",
    baseCol: `Param${slots.baseN}`,
    perCol: `Param${slots.perN}`,
    cap: parseCapFromDesc(skills, row, skilldesc) ?? 24,
    synthetic: true,
    ...emptyMirrors(),
  };
}

function setDesc(row: string[], skills: TsvTable, n: number, text: string) {
  const cur = paramHint(row, skills, `Param${n}`);
  if (descLooksUsed(cur) && !countDesc(cur) && !/activation frame/i.test(cur)) return;
  forceDesc(row, skills, n, text);
}

export function applyMissileCountTooltip(
  skilldesc: TsvTable | undefined,
  descKey: string,
  formula = "ln12",
): boolean {
  if (!skilldesc || !descKey.trim()) return false;
  const found = skilldesc.rows.find(
    (r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc").toLowerCase() === descKey.toLowerCase(),
  );
  if (!found) return false;
  const compact = formula.replace(/\s+/g, "");
  for (let i = 1; i <= 6; i++) {
    const calc = (getCell(found, skilldesc, `desccalca${i}`) + getCell(found, skilldesc, `dsc2calca${i}`)).replace(
      /\s+/g,
      "",
    );
    if (
      calc.toLowerCase().includes(compact.toLowerCase()) ||
      (/ln\d{2}/i.test(calc) && /strskill27/i.test(getCell(found, skilldesc, `desctexta${i}`)))
    ) {
      return false;
    }
  }
  for (let i = 1; i <= 6; i++) {
    const line = getCell(found, skilldesc, `descline${i}`).trim();
    const texta = getCell(found, skilldesc, `desctexta${i}`).trim();
    const calca = getCell(found, skilldesc, `desccalca${i}`).trim();
    if (line || texta || calca) continue;
    setCell(found, skilldesc, `descline${i}`, "74");
    setCell(found, skilldesc, `desctexta${i}`, "StrSkill27");
    setCell(found, skilldesc, `desccalca${i}`, formula);
    return true;
  }
  return false;
}

export function enableMissileCount(
  skills: TsvTable,
  rowIndex: number,
  skilldesc?: TsvTable,
  origSkills?: TsvTable,
  missiles?: TsvTable,
): boolean {
  const row = skills.rows[rowIndex];
  if (!row) return false;
  const origRow = origSkills?.rows[rowIndex];
  restoreExplosionRadiusParam(row, skills, skilldesc, origRow, origSkills);
  const func = getCell(row, skills, "srvdofunc").trim();
  if (!COUNT_FUNCS.has(func) && !isSimpleMissileSkill(row, skills)) return false;
  const slots = pickCountSlots(row, skills);
  if (!slots) return false;
  const bolt = useChargedBoltFuncs(row, skills, origRow, origSkills);
  const srcMissile = canonicalMissileName(listedMissile(row, skills), missiles);
  const hasExplosion = isExplosionRadiusDesc(paramHint(row, skills, "Param1"));
  const radius = getCell(row, skills, "Param1").trim() || "4";
  const missileName = hasExplosion ? pinMissileExplosion(missiles, srcMissile, radius) || srcMissile : srcMissile;
  if (missileName) assignMultiMissiles(row, skills, missileName);
  applyDoFuncs(row, skills, bolt);
  if (!getCell(row, skills, `Param${slots.actN}`).trim()) setCell(row, skills, `Param${slots.actN}`, "1");
  if (!getCell(row, skills, `Param${slots.baseN}`).trim()) setCell(row, skills, `Param${slots.baseN}`, "1");
  if (!getCell(row, skills, `Param${slots.perN}`).trim()) setCell(row, skills, `Param${slots.perN}`, "0");
  setDesc(row, skills, slots.baseN, "# of Missiles created baseline");
  setDesc(row, skills, slots.perN, "# of Missiles created per level");
  setDesc(row, skills, slots.actN, "Missile Activation Frame");
  const ln = `ln${slots.baseN}${slots.perN}`;
  const countCalc = `min(24,${ln})`;
  if (!calcLooksLikeCount(getCell(row, skills, "calc1"))) {
    setCell(row, skills, "calc1", countCalc);
    setCalcDesc(row, skills, "calc1", "# missiles");
  }
  if (!bolt) {
    if (!getCell(row, skills, "calc2").trim()) {
      setCell(row, skills, "calc2", `par${slots.actN}`);
      setCalcDesc(row, skills, "calc2", "activation frame");
    }
    if (!getCell(row, skills, "calc3").trim() || calcLooksLikeCount(getCell(row, skills, "calc3"))) {
      setCell(row, skills, "calc3", "2");
      setCalcDesc(row, skills, "calc3", "# of missiles that can trigger item modifier events");
    }
  }
  applyMissileCountTooltip(skilldesc, getCell(row, skills, "skilldesc"), countCalc);
  return true;
}

export function listMissileCountFields(
  row: string[],
  skills: TsvTable,
  skilldesc?: TsvTable,
): MissileCountField[] {
  const tagged: { n: number; col: string; kind: NonNullable<ReturnType<typeof classify>>; desc: string; mirrors: MissileMirror[] }[] = [];
  for (let n = 1; n <= 16; n++) {
    const col = `Param${n}`;
    const desc = paramHint(row, skills, col);
    const kind = classify(desc);
    if (!kind) continue;
    tagged.push({ n, col, kind, desc, mirrors: parseMirrors(desc) });
  }

  if (!tagged.length) {
    const func = getCell(row, skills, "srvdofunc").trim();
    if (COUNT_FUNCS.has(func) && getCell(row, skills, "Param1").trim()) {
      const per = getCell(row, skills, "Param2").trim();
      return [
        {
          id: "fallback",
          kind: per ? "ln" : "fixed",
          label: "투사체 개수",
          hint: "이 스킬 함수가 파라미터 1·2를 투사체 수로 씁니다.",
          baseCol: "Param1",
          perCol: per ? "Param2" : undefined,
          cap: parseCapFromDesc(skills, row, skilldesc),
          ...emptyMirrors(),
        },
      ];
    }
    const syn = syntheticMissileCountField(row, skills, skilldesc);
    return syn ? [syn] : [];
  }

  const cap = parseCapFromDesc(skills, row, skilldesc);
  const used = new Set<number>();
  const fields: MissileCountField[] = [];

  const take = (kind: string) => {
    const i = tagged.findIndex((t) => !used.has(t.n) && t.kind === kind);
    return i < 0 ? undefined : tagged[i];
  };

  const base = take("base");
  const per = take("per");
  if (base && per) {
    used.add(base.n);
    used.add(per.n);
    fields.push({
      id: `ln-${base.col}`,
      kind: "ln",
      label: "투사체 개수",
      hint: "1레벨 개수에 레벨이 오를 때마다 더합니다.",
      baseCol: base.col,
      perCol: per.col,
      cap,
      baseMirrors: base.mirrors,
      perMirrors: per.mirrors,
      maxMirrors: [],
    });
  }

  const min = take("min");
  const max = take("max");
  if (min && max) {
    used.add(min.n);
    used.add(max.n);
    fields.push({
      id: `minmax-${min.col}`,
      kind: "minmax",
      label: "발사 횟수",
      hint: "최소는 레벨이 오를 때마다 1씩 늘고, 최대에서 멈춥니다.",
      baseCol: min.col,
      maxCol: max.col,
      baseMirrors: min.mirrors,
      perMirrors: [],
      maxMirrors: max.mirrors,
    });
  }

  const every = take("every");
  const fixedForEvery = take("fixed") ?? take("base") ?? take("shots");
  if (every && fixedForEvery && !used.has(fixedForEvery.n) && !used.has(every.n)) {
    used.add(fixedForEvery.n);
    used.add(every.n);
    fields.push({
      id: `every-${fixedForEvery.col}`,
      kind: "every",
      label: "투사체 개수",
      hint: "기본 개수에 N레벨마다 1발씩 늘어납니다.",
      baseCol: fixedForEvery.col,
      perCol: every.col,
      cap,
      baseMirrors: fixedForEvery.mirrors,
      perMirrors: every.mirrors,
      maxMirrors: [],
    });
  }

  for (const t of tagged) {
    if (used.has(t.n)) continue;
    if (t.kind === "fixed" || t.kind === "shots" || t.kind === "base") {
      used.add(t.n);
      fields.push({
        id: `fixed-${t.col}`,
        kind: "fixed",
        label: t.kind === "shots" ? "발사 횟수" : "투사체 개수",
        hint: t.desc,
        baseCol: t.col,
        cap,
        baseMirrors: t.mirrors,
        perMirrors: [],
        maxMirrors: [],
      });
    }
  }

  return fields;
}

export function missileCountParamCols(fields: MissileCountField[]): Set<string> {
  const s = new Set<string>();
  for (const f of fields) {
    s.add(f.baseCol);
    if (f.perCol) s.add(f.perCol);
    if (f.maxCol) s.add(f.maxCol);
  }
  return s;
}

export function countAtLevel(field: MissileCountField, base: number, extra: number, level: number): number {
  let v = base;
  if (field.kind === "ln") v = base + extra * Math.max(0, level - 1);
  else if (field.kind === "every") {
    const step = Math.max(1, extra);
    v = base + Math.floor(Math.max(0, level - 1) / step);
  } else if (field.kind === "minmax") v = Math.min(extra, base + Math.max(0, level - 1));
  if (field.cap != null) v = Math.min(field.cap, v);
  return v;
}

export function applyMissileMirrors(skills: TsvTable, mirrors: MissileMirror[], value: string): number {
  if (!mirrors.length) return 0;
  let n = 0;
  for (const m of mirrors) {
    const want = m.skill.trim().toLowerCase();
    for (const row of skills.rows) {
      if (!isDataRow(row)) continue;
      if (getCell(row, skills, "skill").trim().toLowerCase() !== want) continue;
      if (getCell(row, skills, m.col) === value) continue;
      setCell(row, skills, m.col, value);
      n++;
    }
  }
  return n;
}

export function previewLevels(maxLvl: number): number[] {
  const cap = Math.max(20, num(String(maxLvl), 20));
  const levels = [1, 5, 10, 20, Math.min(25, cap)];
  return levels.filter((v, i, a) => a.indexOf(v) === i);
}

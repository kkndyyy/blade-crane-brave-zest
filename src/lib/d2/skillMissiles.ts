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

export function isSimpleMissileSkill(row: string[], skills: TsvTable): boolean {
  if (!primaryMissile(row, skills)) return false;
  const srvdo = getCell(row, skills, "srvdofunc").trim();
  const cltdo = getCell(row, skills, "cltdofunc").trim();
  if (srvdo && srvdo !== "0") return false;
  if (cltdo && cltdo !== "0") return false;
  if (!paramFree(row, skills, 1) || !paramFree(row, skills, 2)) return false;
  return true;
}

function emptyMirrors(): Pick<MissileCountField, "baseMirrors" | "perMirrors" | "maxMirrors"> {
  return { baseMirrors: [], perMirrors: [], maxMirrors: [] };
}

function syntheticMissileCountField(
  row: string[],
  skills: TsvTable,
  skilldesc?: TsvTable,
): MissileCountField | null {
  if (!isSimpleMissileSkill(row, skills)) return null;
  return {
    id: "synthetic-ln",
    kind: "ln",
    label: "투사체 개수",
    hint: "원래 1발입니다. 개수를 바꾸면 여러 발을 부채꼴로 발사합니다.",
    baseCol: "Param1",
    perCol: "Param2",
    cap: parseCapFromDesc(skills, row, skilldesc),
    synthetic: true,
    ...emptyMirrors(),
  };
}

function moveMissileCol(row: string[], skills: TsvTable, from: string, to: string) {
  const src = getCell(row, skills, from).trim();
  if (!src) return;
  if (!getCell(row, skills, to).trim()) setCell(row, skills, to, src);
  setCell(row, skills, from, "");
}

function setDesc(row: string[], skills: TsvTable, n: number, text: string) {
  const cur = paramHint(row, skills, `Param${n}`);
  if (descLooksUsed(cur)) return;
  for (const col of [`*Param${n} Description`, `*Param${n} Description2`, `*Param${n} desc`]) {
    if (skills.headers.some((h) => h.toLowerCase() === col.toLowerCase())) {
      setCell(row, skills, col, text);
      return;
    }
  }
}

export function applyMissileCountTooltip(skilldesc: TsvTable | undefined, descKey: string): boolean {
  if (!skilldesc || !descKey.trim()) return false;
  const found = skilldesc.rows.find(
    (r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc").toLowerCase() === descKey.toLowerCase(),
  );
  if (!found) return false;
  for (let i = 1; i <= 6; i++) {
    const calc = getCell(found, skilldesc, `desccalca${i}`) + getCell(found, skilldesc, `dsc2calca${i}`);
    if (/ln12/i.test(calc.replace(/\s+/g, ""))) return false;
  }
  for (let i = 1; i <= 6; i++) {
    const line = getCell(found, skilldesc, `descline${i}`).trim();
    const texta = getCell(found, skilldesc, `desctexta${i}`).trim();
    const calca = getCell(found, skilldesc, `desccalca${i}`).trim();
    if (line || texta || calca) continue;
    setCell(found, skilldesc, `descline${i}`, "74");
    setCell(found, skilldesc, `desctexta${i}`, "StrSkill27");
    setCell(found, skilldesc, `desccalca${i}`, "ln12");
    return true;
  }
  return false;
}

/** Turn a 1-missile skill into func-8 multi-missile so Param1/Param2 control count. */
export function enableMissileCount(skills: TsvTable, rowIndex: number, skilldesc?: TsvTable): boolean {
  const row = skills.rows[rowIndex];
  if (!row) return false;
  const func = getCell(row, skills, "srvdofunc").trim();
  if (COUNT_FUNCS.has(func)) {
    if (!getCell(row, skills, "Param1").trim()) setCell(row, skills, "Param1", "1");
    return false;
  }
  if (!isSimpleMissileSkill(row, skills)) return false;
  moveMissileCol(row, skills, "srvmissile", "srvmissilea");
  moveMissileCol(row, skills, "cltmissile", "cltmissilea");
  setCell(row, skills, "srvdofunc", "8");
  setCell(row, skills, "cltdofunc", "17");
  if (!getCell(row, skills, "Param3").trim()) setCell(row, skills, "Param3", "1");
  setDesc(row, skills, 1, "# of Missiles created baseline");
  setDesc(row, skills, 2, "# of Missiles created per level");
  if (!getCell(row, skills, "Param1").trim()) setCell(row, skills, "Param1", "1");
  if (!getCell(row, skills, "Param2").trim()) setCell(row, skills, "Param2", "0");
  applyMissileCountTooltip(skilldesc, getCell(row, skills, "skilldesc"));
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

import { colIndex, getCell, num, setCell, type TsvTable } from "./tsv";

export const RESULT_KNOCKBACK = 8;

export type ExtraId = "knockback" | "pierce" | "gethit" | "explode" | "alwayshit";

export type ExtraDef = {
  id: ExtraId;
  label: string;
  hint: string;
  needsMissile: boolean;
};

export const EXTRA_DEFS: ExtraDef[] = [
  { id: "knockback", label: "넉백", hint: "맞힌 적을 뒤로 밀칩니다.", needsMissile: false },
  { id: "pierce", label: "관통", hint: "투사체가 적을 통과합니다.", needsMissile: true },
  { id: "gethit", label: "피격 경직", hint: "맞은 적이 경직(겟힛)됩니다.", needsMissile: true },
  { id: "explode", label: "항상 폭발", hint: "투사체가 충돌하면 항상 폭발합니다.", needsMissile: true },
  { id: "alwayshit", label: "항상 명중", hint: "명중 굴림 없이 무조건 맞습니다.", needsMissile: false },
];

export type ExtraState = ExtraDef & {
  enabled: boolean;
  available: boolean;
  source: string;
};

const SKILL_MISSILE_COLS = ["srvmissile", "srvmissilea", "srvmissileb", "srvmissilec"];

export function skillMissileNames(row: string[], skills: TsvTable): string[] {
  const names: string[] = [];
  for (const c of SKILL_MISSILE_COLS) {
    const v = getCell(row, skills, c).trim();
    if (v && !names.includes(v)) names.push(v);
  }
  return names;
}

export function findMissileRows(missiles: TsvTable | undefined, names: string[]): { index: number; row: string[] }[] {
  if (!missiles || !names.length) return [];
  const out: { index: number; row: string[] }[] = [];
  const want = new Set(names.map((n) => n.toLowerCase()));
  missiles.rows.forEach((row, index) => {
    const id = getCell(row, missiles, "Missile").toLowerCase();
    if (want.has(id)) out.push({ index, row });
  });
  return out;
}

function truthyFlag(value: string): boolean {
  const v = value.trim();
  return v !== "" && v !== "0";
}

function missileHas(row: string[], table: TsvTable, id: ExtraId): boolean {
  if (id === "knockback") {
    return num(getCell(row, table, "KnockBack")) > 0 || (num(getCell(row, table, "ResultFlags")) & RESULT_KNOCKBACK) !== 0;
  }
  if (id === "pierce") return truthyFlag(getCell(row, table, "Pierce"));
  if (id === "gethit") return truthyFlag(getCell(row, table, "GetHit"));
  if (id === "explode") return truthyFlag(getCell(row, table, "AlwaysExplode"));
  return false;
}

function skillHas(row: string[], table: TsvTable, id: ExtraId): boolean {
  if (id === "knockback") {
    return (num(getCell(row, table, "ResultFlags")) & RESULT_KNOCKBACK) !== 0 || truthyFlag(getCell(row, table, "Kick"));
  }
  if (id === "alwayshit") return truthyFlag(getCell(row, table, "alwayshit"));
  return false;
}

export function listSkillExtras(
  skillRow: string[],
  skills: TsvTable,
  missiles?: TsvTable,
): ExtraState[] {
  const names = skillMissileNames(skillRow, skills);
  const mrows = findMissileRows(missiles, names);
  const source = names.length ? `투사체 ${names.join(", ")}` : "스킬";
  return EXTRA_DEFS.map((def) => {
    const onMissile = mrows.some(({ row }) => missiles && missileHas(row, missiles, def.id));
    const onSkill = skillHas(skillRow, skills, def.id);
    const needsMissile = def.needsMissile;
    const available = !needsMissile || mrows.length > 0;
    return {
      ...def,
      enabled: onMissile || onSkill,
      available,
      source: onMissile || needsMissile ? source : "스킬",
    };
  });
}

function restoreCell(row: string[], table: TsvTable, col: string, origRow: string[] | undefined, origTable: TsvTable | undefined, fallback: string) {
  if (colIndex(table, col) < 0) return;
  const orig = origRow && origTable ? getCell(origRow, origTable, col).trim() : "";
  setCell(row, table, col, orig && orig !== "0" ? orig : fallback);
}

function setMissileFlag(row: string[], table: TsvTable, col: string, enabled: boolean, origRow: string[] | undefined, origTable: TsvTable | undefined, onValue: string) {
  if (colIndex(table, col) < 0) return;
  if (!enabled) {
    setCell(row, table, col, "0");
    return;
  }
  restoreCell(row, table, col, origRow, origTable, onValue);
}

function setKnockbackFlags(
  row: string[],
  table: TsvTable,
  enabled: boolean,
  origRow: string[] | undefined,
  origTable: TsvTable | undefined,
) {
  if (colIndex(table, "ResultFlags") >= 0) {
    const cur = num(getCell(row, table, "ResultFlags"));
    if (enabled) {
      const orig = origRow && origTable ? num(getCell(origRow, origTable, "ResultFlags")) : 0;
      const next = orig & RESULT_KNOCKBACK ? orig : cur | RESULT_KNOCKBACK;
      setCell(row, table, "ResultFlags", String(next || RESULT_KNOCKBACK));
    } else {
      setCell(row, table, "ResultFlags", String(cur & ~RESULT_KNOCKBACK));
    }
  }
  if (colIndex(table, "KnockBack") >= 0) {
    setMissileFlag(row, table, "KnockBack", enabled, origRow, origTable, "100");
  }
}

export function applySkillExtra(opts: {
  skills: TsvTable;
  missiles?: TsvTable;
  origSkills: TsvTable;
  origMissiles?: TsvTable;
  skillIndex: number;
  extraId: ExtraId;
  enabled: boolean;
}) {
  const row = opts.skills.rows[opts.skillIndex];
  if (!row) return;
  const origSkill = opts.origSkills.rows[opts.skillIndex];
  const names = skillMissileNames(row, opts.skills);
  const mrows = findMissileRows(opts.missiles, names);
  const origMrows = findMissileRows(opts.origMissiles, names);
  const origByName = new Map(origMrows.map((m) => [getCell(m.row, opts.origMissiles!, "Missile").toLowerCase(), m.row]));

  if (opts.extraId === "alwayshit") {
    setMissileFlag(row, opts.skills, "alwayshit", opts.enabled, origSkill, opts.origSkills, "1");
    return;
  }

  if (mrows.length && opts.missiles) {
    for (const m of mrows) {
      const orig = origByName.get(getCell(m.row, opts.missiles, "Missile").toLowerCase());
      if (opts.extraId === "knockback") setKnockbackFlags(m.row, opts.missiles, opts.enabled, orig, opts.origMissiles);
      else if (opts.extraId === "pierce") setMissileFlag(m.row, opts.missiles, "Pierce", opts.enabled, orig, opts.origMissiles, "1");
      else if (opts.extraId === "gethit") setMissileFlag(m.row, opts.missiles, "GetHit", opts.enabled, orig, opts.origMissiles, "1");
      else if (opts.extraId === "explode") setMissileFlag(m.row, opts.missiles, "AlwaysExplode", opts.enabled, orig, opts.origMissiles, "1");
    }
    return;
  }

  if (opts.extraId === "knockback") {
    setKnockbackFlags(row, opts.skills, opts.enabled, origSkill, opts.origSkills);
    if (colIndex(opts.skills, "Kick") >= 0) {
      setMissileFlag(row, opts.skills, "Kick", opts.enabled, origSkill, opts.origSkills, "1");
    }
  }
}

import { getCell, isDataRow, setCell, type TsvTable } from "./tsv";

export const HIRE_KO: Record<string, string> = {
  "Rogue Scout": "로그 용병",
  "Desert Mercenary": "사막 용병",
  "Eastern Sorceror": "아이언 울프",
  Barbarian: "바바리안 용병",
};

export const ROLE_KO: Record<string, string> = {
  Fire: "화염",
  Ice: "냉기",
  Cold: "냉기",
  Ltng: "번개",
  Comb: "전투",
  Def: "방어",
  Off: "공격",
  Prayer: "기도",
  Defiance: "저항",
  BlessedAim: "명중",
  Thorns: "가시",
  HolyFreeze: "신성빙결",
  Might: "힘",
  "2hs": "양손",
  "1hs": "한손쌍수",
};

export const DIFF_NUM: Record<string, string> = { "1": "노멀", "2": "나이트메어", "3": "헬" };

export const STAT_GROUPS: { title: string; fields: { col: string; label: string }[] }[] = [
  {
    title: "생명 · 방어",
    fields: [
      { col: "HP", label: "생명" },
      { col: "HP/Lvl", label: "레벨당 생명" },
      { col: "Defense", label: "방어" },
      { col: "Def/Lvl", label: "레벨당 방어" },
    ],
  },
  {
    title: "힘 · 민첩 · 명중 · 피해",
    fields: [
      { col: "Str", label: "힘" },
      { col: "Str/Lvl", label: "레벨당 힘" },
      { col: "Dex", label: "민첩" },
      { col: "Dex/Lvl", label: "레벨당 민첩" },
      { col: "AR", label: "명중" },
      { col: "AR/Lvl", label: "레벨당 명중" },
      { col: "Dmg-Min", label: "최소 피해" },
      { col: "Dmg-Max", label: "최대 피해" },
      { col: "Dmg/Lvl", label: "레벨당 피해" },
    ],
  },
  {
    title: "저항",
    fields: [
      { col: "ResistFire", label: "화염" },
      { col: "ResistFire/Lvl", label: "레벨당 화염" },
      { col: "ResistCold", label: "냉기" },
      { col: "ResistCold/Lvl", label: "레벨당 냉기" },
      { col: "ResistLightning", label: "번개" },
      { col: "ResistLightning/Lvl", label: "레벨당 번개" },
      { col: "ResistPoison", label: "독" },
      { col: "ResistPoison/Lvl", label: "레벨당 독" },
    ],
  },
];

export function parseRole(subtype: string): string {
  const m = subtype.trim().match(/^(.*?)[\s-]+(Normal|Nightmare|Hell)$/i);
  return (m ? m[1] : subtype).replace(/-+$/, "").trim();
}

export function roleLabel(role: string): string {
  return ROLE_KO[role] ?? role;
}

export function hireLabel(name: string): string {
  return HIRE_KO[name] ?? name;
}

export const HIRE_SKILL_SLOTS = [1, 2, 3, 4, 5, 6] as const;

export const HIRE_SKILL_FIELDS = ["Skill", "Mode", "Chance", "ChancePerLvl", "Level", "LvlPerLvl"] as const;

export type HireSkillScope = "row" | "levels" | "allDiffs";

export function hireSkillColumns(): string[] {
  const cols: string[] = [];
  for (const n of HIRE_SKILL_SLOTS) {
    for (const f of HIRE_SKILL_FIELDS) cols.push(`${f}${n}`);
  }
  return cols;
}

export function matchingHirelingRows(table: TsvTable, sourceIndex: number, scope: HireSkillScope): number[] {
  const src = table.rows[sourceIndex];
  if (!src || !isDataRow(src)) return [];
  if (scope === "row") return [sourceIndex];
  const hireling = getCell(src, table, "Hireling");
  const role = parseRole(getCell(src, table, "*SubType"));
  const diff = getCell(src, table, "Difficulty") || "1";
  const out: number[] = [];
  table.rows.forEach((row, i) => {
    if (!isDataRow(row)) return;
    if (getCell(row, table, "Hireling") !== hireling) return;
    if (parseRole(getCell(row, table, "*SubType")) !== role) return;
    if (scope === "levels" && (getCell(row, table, "Difficulty") || "1") !== diff) return;
    out.push(i);
  });
  return out;
}

export function listHirelingSkills(hireling: TsvTable): string[] {
  const names = new Set<string>();
  for (const row of hireling.rows) {
    if (!isDataRow(row)) continue;
    for (let i = 1; i <= 6; i++) {
      const s = getCell(row, hireling, `Skill${i}`).trim();
      if (s) names.add(s);
    }
  }
  return [...names];
}

export function isHireableIconsEnabled(hireling: TsvTable, skills: TsvTable | undefined, skilldesc: TsvTable | undefined): boolean {
  if (!skilldesc) return false;
  const needed = listHirelingSkills(hireling);
  if (!needed.length) return false;
  const descBySkill = skillToDesc(skills);
  for (const name of needed) {
    const desc = descBySkill.get(name) ?? name;
    const row = skilldesc.rows.find((r) => isDataRow(r) && getCell(r, skilldesc, "skilldesc") === desc);
    if (!row) return false;
    if (!getCell(row, skilldesc, "HireableIconCel").trim()) return false;
  }
  return true;
}

export function applyHireableIcons(skilldesc: TsvTable, orig: TsvTable, hireling: TsvTable, skills: TsvTable | undefined, enabled: boolean) {
  const needed = new Set(listHirelingSkills(hireling));
  const descBySkill = skillToDesc(skills);
  const descKeys = new Set<string>();
  for (const name of needed) descKeys.add(descBySkill.get(name) ?? name);

  for (let i = 0; i < skilldesc.rows.length; i++) {
    const row = skilldesc.rows[i]!;
    if (!isDataRow(row)) continue;
    const key = getCell(row, skilldesc, "skilldesc");
    if (!descKeys.has(key)) continue;
    const origRow = orig.rows[i];
    if (!enabled) {
      if (origRow) setCell(row, skilldesc, "HireableIconCel", getCell(origRow, orig, "HireableIconCel"));
      continue;
    }
    if (getCell(row, skilldesc, "HireableIconCel").trim()) continue;
    const icon = getCell(row, skilldesc, "IconCel").trim();
    setCell(row, skilldesc, "HireableIconCel", icon || "0");
  }
}

function skillToDesc(skills: TsvTable | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!skills) return map;
  for (const row of skills.rows) {
    if (!isDataRow(row)) continue;
    const name = getCell(row, skills, "skill").trim();
    const desc = getCell(row, skills, "skilldesc").trim() || name;
    if (name) map.set(name, desc);
  }
  return map;
}

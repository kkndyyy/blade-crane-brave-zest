import { getCell, isDataRow, type TsvTable } from "./tsv.ts";
import { koreanSkillName, type StringTable } from "./strings.ts";
import { labelClass } from "./labels.ts";

export type SkillChoice = {
  id: string;
  skill: string;
  ko: string;
  group: string;
};

const CLASS_ORDER = ["ama", "sor", "nec", "war", "pal", "bar", "dru", "ass", ""];

export function skillIdOf(row: string[], table: TsvTable): string {
  return (getCell(row, table, "*Id") || getCell(row, table, "Id")).trim();
}

export function listSkillChoices(
  skills?: TsvTable,
  skilldesc?: TsvTable,
  strings?: StringTable,
): SkillChoice[] {
  if (!skills) return [];
  const out: SkillChoice[] = [];
  const seen = new Set<string>();
  for (const row of skills.rows) {
    if (!isDataRow(row)) continue;
    const skill = getCell(row, skills, "skill").trim();
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id = skillIdOf(row, skills);
    const charclass = getCell(row, skills, "charclass").trim().toLowerCase();
    const ko = strings
      ? koreanSkillName(strings, {
          skill,
          skilldesc: getCell(row, skills, "skilldesc"),
          id,
          skillsTable: skills,
          skilldescTable: skilldesc,
        })
      : skill;
    out.push({ id, skill, ko: ko || skill, group: labelClass(charclass) });
  }
  const classRank = (group: string) => {
    const code = CLASS_ORDER.find((c) => labelClass(c) === group);
    const i = code === undefined ? CLASS_ORDER.length : CLASS_ORDER.indexOf(code);
    return i;
  };
  return out.sort((a, b) => {
    const g = classRank(a.group) - classRank(b.group);
    if (g) return g;
    return a.ko.localeCompare(b.ko, "ko");
  });
}

export function matchSkillChoice(par: string, choices: SkillChoice[]): SkillChoice | undefined {
  const p = par.trim();
  if (!p) return undefined;
  const lower = p.toLowerCase();
  return choices.find((c) => c.skill.toLowerCase() === lower || c.id === p);
}

export function groupedSkillChoices(
  choices: SkillChoice[],
): { group: string; items: SkillChoice[] }[] {
  const buckets = new Map<string, SkillChoice[]>();
  const order: string[] = [];
  for (const c of choices) {
    if (!buckets.has(c.group)) {
      buckets.set(c.group, []);
      order.push(c.group);
    }
    buckets.get(c.group)!.push(c);
  }
  return order.map((group) => ({ group, items: buckets.get(group)! }));
}

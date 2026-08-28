import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/lib/store";
import { getCell, isDataRow } from "@/lib/d2/tsv";
import {
  DIFF_NUM,
  HIRE_SKILL_SLOTS,
  STAT_GROUPS,
  hireLabel,
  isHireableIconsEnabled,
  matchingHirelingRows,
  parseRole,
  roleLabel,
  type HireSkillScope,
} from "@/lib/d2/hirelings";
import { koreanSkillName } from "@/lib/d2/strings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SKILL_SCOPES: { id: HireSkillScope; label: string; hint: string }[] = [
  { id: "row", label: "이 레벨만", hint: "지금 고른 레벨 구간만 바꿉니다." },
  { id: "levels", label: "이 난이도 모든 레벨", hint: "같은 난이도의 모든 레벨 구간에 넣습니다." },
  { id: "allDiffs", label: "모든 난이도 모든 레벨", hint: "노멀·나이트메어·헬의 모든 레벨 구간에 넣습니다." },
];

export function HirelingTable() {
  const table = useEditor((s) => s.tables.hireling);
  const skills = useEditor((s) => s.tables.skills);
  const skilldesc = useEditor((s) => s.tables.skilldesc);
  const strings = useEditor((s) => s.strings);
  const patchCell = useEditor((s) => s.patchCell);
  const patchHirelingSkill = useEditor((s) => s.patchHirelingSkill);
  const copyHirelingSkills = useEditor((s) => s.copyHirelingSkills);
  const resetTable = useEditor((s) => s.resetTable);
  const setHireableSkillIcons = useEditor((s) => s.setHireableSkillIcons);

  const groups = useMemo(() => {
    if (!table) return [];
    const seen = new Map<string, { hireling: string; role: string; act: string; diffs: Set<string> }>();
    table.rows.forEach((row) => {
      if (!isDataRow(row)) return;
      const hireling = getCell(row, table, "Hireling");
      const role = parseRole(getCell(row, table, "*SubType"));
      const act = getCell(row, table, "Act") || "1";
      const diff = getCell(row, table, "Difficulty") || "1";
      const key = `${hireling}||${role}`;
      const g = seen.get(key) ?? { hireling, role, act, diffs: new Set() };
      g.diffs.add(diff);
      seen.set(key, g);
    });
    return [...seen.values()].sort((a, b) => Number(a.act) - Number(b.act) || a.role.localeCompare(b.role));
  }, [table]);

  const [kind, setKind] = useState(0);
  const [diff, setDiff] = useState("1");
  const [band, setBand] = useState(0);
  const [skillScope, setSkillScope] = useState<HireSkillScope>("levels");
  const [copySlots, setCopySlots] = useState<Set<number>>(() => new Set(HIRE_SKILL_SLOTS));

  const group = groups[kind] ?? groups[0];
  const rows = useMemo(() => {
    if (!table || !group) return [] as { index: number; level: string; version: string }[];
    const out: { index: number; level: string; version: string }[] = [];
    table.rows.forEach((row, index) => {
      if (!isDataRow(row)) return;
      if (getCell(row, table, "Hireling") !== group.hireling) return;
      if (parseRole(getCell(row, table, "*SubType")) !== group.role) return;
      if ((getCell(row, table, "Difficulty") || "1") !== diff) return;
      out.push({
        index,
        level: getCell(row, table, "Level") || "1",
        version: getCell(row, table, "Version") || "0",
      });
    });
    return out;
  }, [table, group, diff]);

  const rowIndex = rows[Math.min(band, Math.max(0, rows.length - 1))]?.index;
  const row = table && rowIndex != null ? table.rows[rowIndex] : undefined;
  const scopeCount = table && rowIndex != null ? matchingHirelingRows(table, rowIndex, skillScope).length : 0;
  const showVersion = new Set(rows.map((r) => r.version)).size > 1;

  const skillNames = useMemo(() => {
    if (!skills) return [] as string[];
    const names: string[] = [];
    skills.rows.forEach((r) => {
      if (!isDataRow(r)) return;
      const n = getCell(r, skills, "skill").trim();
      if (n) names.push(n);
    });
    return names;
  }, [skills]);

  if (!table) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
        <p className="font-display text-xl">용병 테이블이 없습니다</p>
        <p className="mt-2 text-sm text-fg-muted">MPQ를 열거나 엽굵 샘플을 불러오세요.</p>
      </div>
    );
  }

  const acts = [...new Set(groups.map((g) => g.act))].sort((a, b) => Number(a) - Number(b));
  const currentAct = group?.act ?? acts[0];
  const kindsInAct = groups.map((g, i) => ({ ...g, i })).filter((g) => g.act === currentAct);
  const iconsOn = skilldesc ? isHireableIconsEnabled(table, skills, skilldesc) : false;
  const scopeMeta = SKILL_SCOPES.find((s) => s.id === skillScope) ?? SKILL_SCOPES[1]!;

  const onCopySkills = () => {
    if (rowIndex == null) return;
    const slots = [...copySlots].sort((a, b) => a - b);
    if (!slots.length) {
      toast.error("복사할 스킬 슬롯을 체크하세요");
      return;
    }
    const n = copyHirelingSkills(rowIndex, skillScope, slots);
    toast.success(`슬롯 ${slots.join(", ")} 을 ${n}개 레벨 구간에 넣었습니다`);
  };

  const toggleCopySlot = (n: number, on: boolean) => {
    setCopySlots((prev) => {
      const next = new Set(prev);
      if (on) next.add(n);
      else next.delete(n);
      return next;
    });
  };

  const allSlotsChecked = copySlots.size === HIRE_SKILL_SLOTS.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">용병</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed">
            막·유형·난이도·레벨 구간을 고른 뒤 생명·저항·스킬을 바꿉니다. 스킬은 모든 레벨 구간에 한 번에 넣을 수 있습니다.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetTable("hireling");
            resetTable("skilldesc");
            toast.success("용병 값을 원본으로 되돌렸습니다");
          }}
        >
          원본
        </Button>
      </header>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={iconsOn}
          disabled={!skilldesc}
          onChange={(e) => {
            const on = e.target.checked;
            setHireableSkillIcons(on);
            toast.success(on ? "용병 정보창에 스킬 아이콘을 표시합니다" : "용병 스킬 아이콘을 원본으로 되돌렸습니다");
          }}
        />
        <span>
          <span className="block text-sm font-medium">인게임 용병 정보창에 스킬 아이콘 표시</span>
          <span className="mt-0.5 block text-xs text-fg-muted leading-relaxed">
            용병이 쓰는 스킬의 HireableIconCel 이 비어 있으면 스킬 아이콘(IconCel)으로 채웁니다. 정보창에 아이콘이 안 뜨는 커스텀 스킬에 씁니다.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        {acts.map((a) => (
          <Button
            key={a}
            size="sm"
            variant={currentAct === a ? "primary" : "secondary"}
            onClick={() => {
              const first = groups.findIndex((g) => g.act === a);
              setKind(first < 0 ? 0 : first);
              setBand(0);
            }}
          >
            {a}막
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {kindsInAct.map((g) => (
          <Button
            key={g.i}
            size="sm"
            variant={kind === g.i ? "primary" : "secondary"}
            onClick={() => {
              setKind(g.i);
              setBand(0);
            }}
          >
            {hireLabel(g.hireling)} · {roleLabel(g.role)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["1", "2", "3"] as const).map((d) => (
          <Button
            key={d}
            size="sm"
            variant={diff === d ? "primary" : "secondary"}
            onClick={() => {
              setDiff(d);
              setBand(0);
            }}
          >
            {DIFF_NUM[d]}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
          이 난이도에 해당 용병이 없습니다.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg-muted">레벨 구간</span>
            {rows.map((r, i) => (
              <Button key={r.index} size="sm" variant={band === i ? "primary" : "secondary"} onClick={() => setBand(i)}>
                {r.level}
                {showVersion ? <span className="text-xs opacity-70">{r.version === "100" ? "확장" : "클래식"}</span> : null}
              </Button>
            ))}
          </div>

          {row && rowIndex != null
            ? STAT_GROUPS.map((g) => (
                <section key={g.title} className="rounded-xl border border-border bg-bg-elevated p-4">
                  <h3 className="text-sm font-medium">{g.title}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {g.fields.map((f) => (
                      <label key={f.col} className="block">
                        <span className="text-xs text-fg-muted">{f.label}</span>
                        <NumInput value={getCell(row, table, f.col)} onChange={(v) => patchCell("hireling", rowIndex, f.col, v)} />
                      </label>
                    ))}
                  </div>
                </section>
              ))
            : null}

          {row && rowIndex != null ? (
            <section className="rounded-xl border border-border bg-bg-elevated p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium">스킬</h3>
                  <p className="mt-1 text-xs text-fg-muted">
                    모드 4=원거리공격, 1=오라, 7=시전, 14=근접, 5=패시브. 체크한 슬롯만 복사됩니다. {scopeMeta.hint}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={onCopySkills} disabled={copySlots.size === 0}>
                  체크한 스킬을 {scopeCount}개 구간에 복사
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SKILL_SCOPES.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={skillScope === s.id ? "primary" : "secondary"}
                    onClick={() => setSkillScope(s.id)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
              <div className="mt-3 overflow-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-fg-muted">
                      <th className="px-2 py-2 font-medium">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={allSlotsChecked}
                            onChange={(e) => setCopySlots(e.target.checked ? new Set(HIRE_SKILL_SLOTS) : new Set())}
                            aria-label="모든 스킬 슬롯 선택"
                          />
                          <span>복사</span>
                        </label>
                      </th>
                      <th className="px-2 py-2 font-medium">슬롯</th>
                      <th className="px-2 py-2 font-medium">스킬</th>
                      <th className="px-2 py-2 font-medium">한글</th>
                      <th className="px-2 py-2 font-medium">모드</th>
                      <th className="px-2 py-2 font-medium">확률</th>
                      <th className="px-2 py-2 font-medium">레벨</th>
                      <th className="px-2 py-2 font-medium">레벨당</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map((n) => {
                      const skill = getCell(row, table, `Skill${n}`);
                      return (
                        <tr key={n} className="border-t border-border">
                          <td className="px-2 py-1.5">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={copySlots.has(n)}
                              onChange={(e) => toggleCopySlot(n, e.target.checked)}
                              aria-label={`슬롯 ${n} 복사`}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-fg-muted">{n}</td>
                          <td className="px-2 py-1.5">
                            <input
                              list="hireling-skills"
                              className={inputClass()}
                              value={skill}
                              onChange={(e) => patchHirelingSkill(rowIndex, `Skill${n}`, e.target.value, skillScope)}
                            />
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {skill
                              ? koreanSkillName(strings, {
                                  skill,
                                  skillsTable: skills,
                                  skilldescTable: skilldesc,
                                })
                              : "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <NumInput
                              value={getCell(row, table, `Mode${n}`)}
                              onChange={(v) => patchHirelingSkill(rowIndex, `Mode${n}`, v, skillScope)}
                              w="w-16"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <NumInput
                              value={getCell(row, table, `Chance${n}`)}
                              onChange={(v) => patchHirelingSkill(rowIndex, `Chance${n}`, v, skillScope)}
                              w="w-16"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <NumInput
                              value={getCell(row, table, `Level${n}`)}
                              onChange={(v) => patchHirelingSkill(rowIndex, `Level${n}`, v, skillScope)}
                              w="w-16"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <NumInput
                              value={getCell(row, table, `LvlPerLvl${n}`)}
                              onChange={(v) => patchHirelingSkill(rowIndex, `LvlPerLvl${n}`, v, skillScope)}
                              w="w-16"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <datalist id="hireling-skills">
                  {skillNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function inputClass(w = "w-full") {
  return cn(
    "h-9 rounded-xs border border-transparent bg-transparent px-2 text-sm tabular-nums text-fg",
    "hover:border-border focus:border-primary/50 focus:bg-bg",
    w,
  );
}

function NumInput({ value, onChange, w = "w-full" }: { value: string; onChange: (v: string) => void; w?: string }) {
  return <input className={inputClass(w)} value={value} onChange={(e) => onChange(e.target.value)} />;
}

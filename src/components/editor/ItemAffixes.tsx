import { useMemo } from "react";
import { useEditor } from "@/lib/store";
import { getCell, isDataRow, type TsvTable } from "@/lib/d2/tsv";
import { koreanSkillName } from "@/lib/d2/strings";
import { labelProp, isSkillProp, type AffixSlot } from "@/lib/d2/itemProps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ItemAffixEditor({
  tableKey,
  table,
  row,
  rowIndex,
  slots,
  title,
  subtitle,
  onClose,
}: {
  tableKey: "uniqueItems" | "setItems" | "runes";
  table: TsvTable;
  row: string[];
  rowIndex: number;
  slots: AffixSlot[];
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const patchCell = useEditor((s) => s.patchCell);
  const skills = useEditor((s) => s.tables.skills);
  const skilldesc = useEditor((s) => s.tables.skilldesc);
  const strings = useEditor((s) => s.strings);

  const knownProps = useMemo(() => {
    const set = new Set<string>();
    for (const slot of slots) {
      for (const r of table.rows) {
        if (!isDataRow(r)) continue;
        const v = getCell(r, table, slot.prop).trim();
        if (v) set.add(v);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [table, slots]);

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

  return (
    <section className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl tracking-tight">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-fg-muted">{subtitle}</p> : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>
      <p className="mt-2 text-xs text-fg-muted leading-relaxed">
        코드는 게임 속성 키입니다. 최소/최대가 같으면 고정 수치입니다. 스킬 계열은 파라미터에 스킬 이름을 넣습니다.
      </p>
      <div className="mt-4 overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-fg-muted">
              <th className="px-2 py-2 font-medium whitespace-nowrap">슬롯</th>
              <th className="px-2 py-2 font-medium">속성</th>
              <th className="px-2 py-2 font-medium">한글</th>
              <th className="px-2 py-2 font-medium">파라미터</th>
              <th className="px-2 py-2 font-medium">최소</th>
              <th className="px-2 py-2 font-medium">최대</th>
              <th className="px-2 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              if (colMissing(table, slot.prop)) return null;
              const prop = getCell(row, table, slot.prop);
              const par = getCell(row, table, slot.par);
              const skillKo =
                prop && isSkillProp(prop) && par
                  ? koreanSkillName(strings, { skill: par, skillsTable: skills, skilldescTable: skilldesc })
                  : "";
              return (
                <tr key={slot.prop} className="border-t border-border">
                  <td className="px-2 py-1.5 text-fg-muted whitespace-nowrap">{slot.label}</td>
                  <td className="px-2 py-1.5">
                    <input
                      list="item-prop-codes"
                      className={fieldClass()}
                      value={prop}
                      onChange={(e) => patchCell(tableKey, rowIndex, slot.prop, e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-fg">{labelProp(prop) || "—"}</td>
                  <td className="px-2 py-1.5">
                    <input
                      list={isSkillProp(prop) ? "item-skill-names" : undefined}
                      className={fieldClass("w-40")}
                      value={par}
                      onChange={(e) => patchCell(tableKey, rowIndex, slot.par, e.target.value)}
                    />
                    {skillKo && skillKo !== par ? (
                      <span className="mt-0.5 block text-[11px] text-fg-muted">{skillKo}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={fieldClass("w-20")}
                      value={getCell(row, table, slot.min)}
                      onChange={(e) => patchCell(tableKey, rowIndex, slot.min, e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={fieldClass("w-20")}
                      value={getCell(row, table, slot.max)}
                      onChange={(e) => patchCell(tableKey, rowIndex, slot.max, e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        patchCell(tableKey, rowIndex, slot.prop, "");
                        patchCell(tableKey, rowIndex, slot.par, "");
                        patchCell(tableKey, rowIndex, slot.min, "");
                        patchCell(tableKey, rowIndex, slot.max, "");
                      }}
                    >
                      비우기
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="item-prop-codes">
          {knownProps.map((p) => (
            <option key={p} value={p} label={labelProp(p)} />
          ))}
        </datalist>
        <datalist id="item-skill-names">
          {skillNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>
    </section>
  );
}

function colMissing(table: TsvTable, name: string) {
  return !table.headers.some((h) => h.toLowerCase() === name.toLowerCase());
}

function fieldClass(w = "w-36") {
  return cn(
    "h-9 rounded-xs border border-transparent bg-transparent px-2 text-sm text-fg",
    "hover:border-border focus:border-primary/50 focus:bg-bg",
    w,
  );
}

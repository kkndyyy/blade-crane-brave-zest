import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/lib/store";
import { getCell, isDataRow, type TsvTable } from "@/lib/d2/tsv";
import { isSlamtrapMonster } from "@/lib/d2/labels";
import {
  EL_MODES,
  EL_TYPES,
  MONSTER_DIFFS,
  MONSTER_FLAGS,
  MONSTER_RESIST_ROWS,
  MONSTER_STAT_ROWS,
  elTypeLabel,
  findMonPropRow,
  findSuperUniqueRows,
  monsterDiffCol,
  umodLabel,
} from "@/lib/d2/monsterStats";
import { DataGrid, SearchField } from "./DataGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "boss", label: "보스" },
  { id: "enabled", label: "활성" },
  { id: "npc", label: "NPC" },
  { id: "slamtrap", label: "콰과광" },
] as const;

const TABS = [
  { id: "stats", label: "능력치" },
  { id: "resist", label: "저항" },
  { id: "effects", label: "특수효과" },
  { id: "skills", label: "스킬" },
] as const;

const LIST_COLS = ["Level", "Level(H)", "minHP", "MinHP(H)", "A1MinD", "A1MaxD", "A1MinD(H)", "A1MaxD(H)", "boss", "enabled"];

type FilterId = (typeof FILTERS)[number]["id"];
type TabId = (typeof TABS)[number]["id"];

export function MonsterTable() {
  const table = useEditor((s) => s.tables.monstats);
  const monprop = useEditor((s) => s.tables.monprop);
  const superuniques = useEditor((s) => s.tables.superuniques);
  const strings = useEditor((s) => s.strings);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const resetTable = useEditor((s) => s.resetTable);
  const setSlamtrapSkillsDisabled = useEditor((s) => s.setSlamtrapSkillsDisabled);
  const scaleMonsterCombat = useEditor((s) => s.scaleMonsterCombat);
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [tab, setTab] = useState<TabId>("stats");

  const slamtraps = useMemo(() => {
    if (!table) return [] as { index: number; row: string[] }[];
    const rows: { index: number; row: string[] }[] = [];
    table.rows.forEach((row, index) => {
      if (!isDataRow(row)) return;
      if (isSlamtrapMonster(getCell(row, table, "Id"), getCell(row, table, "NameStr"))) {
        rows.push({ index, row });
      }
    });
    return rows;
  }, [table]);

  if (!table) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
        <p className="font-display text-xl">몬스터 테이블이 없습니다</p>
        <p className="mt-2 text-sm text-fg-muted">MPQ를 열거나 엽굵 샘플을 불러오세요.</p>
      </div>
    );
  }

  const slamtrapOff = slamtraps.length > 0 && slamtraps.every(({ row }) => !getCell(row, table, "Skill1").trim());
  const selectedRow = selected != null ? table.rows[selected] : undefined;
  const monsterName = selectedRow
    ? strings.display(getCell(selectedRow, table, "NameStr"), strings.display(getCell(selectedRow, table, "Id"), getCell(selectedRow, table, "Id")))
    : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight">몬스터</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">
              몬스터를 고르면 HP·피해·저항과 속성 공격, 보스 플래그 같은 특수효과를 난이도별로 바꿀 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField value={search} onChange={setSearch} placeholder="몬스터 이름 · ID" />
            <Button variant="ghost" size="sm" onClick={() => resetTable("monstats")}>
              원본
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button key={f.id} size="sm" variant={filter === f.id ? "primary" : "secondary"} onClick={() => setFilter(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>
      </header>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={slamtrapOff}
          disabled={!slamtraps.length}
          onChange={(e) => {
            const off = e.target.checked;
            setSlamtrapSkillsDisabled(off);
            toast.success(off ? "콰과광이 스킬을 쓰지 않습니다" : "콰과광 스킬을 원본대로 되돌렸습니다");
          }}
        />
        <span>
          <span className="block text-sm font-medium">콰과광이 스킬을 쓰지 않음</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
            {slamtraps.length
              ? `slamtrap ${slamtraps.length}마리의 Skill1–8을 비웁니다. 체크를 끄면 연 파일 원본 스킬이 복구됩니다.`
              : "이 모드에 slamtrap(콰과광) 항목이 없습니다."}
          </span>
        </span>
      </label>

      {selectedRow && isDataRow(selectedRow) ? (
        <MonsterDetail
          table={table}
          row={selectedRow}
          rowIndex={selected!}
          name={monsterName}
          tab={tab}
          setTab={setTab}
          monprop={monprop}
          superuniques={superuniques}
          onChange={(col, val) => patchCell("monstats", selected!, col, val)}
          onScale={(kind, factor) => {
            const n = scaleMonsterCombat(selected!, kind, factor);
            toast.success(kind === "hp" ? `HP를 ×${factor} (난이도 ${n}칸)` : `피해를 ×${factor} (난이도 ${n}칸)`);
          }}
          onClose={() => setSelected(null)}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
          목록에서 몬스터를 선택하면 능력치와 특수효과를 수정할 수 있습니다.
        </p>
      )}

      <DataGrid
        table={table}
        columns={LIST_COLS}
        search={search}
        selectedIndex={selected}
        onSelectRow={setSelected}
        filterRow={(row) => {
          const id = getCell(row, table, "Id");
          const ns = getCell(row, table, "NameStr");
          if (filter === "boss") return getCell(row, table, "boss") === "1" || getCell(row, table, "primeevil") === "1";
          if (filter === "enabled") return getCell(row, table, "enabled") === "1";
          if (filter === "npc") return getCell(row, table, "npc") === "1";
          if (filter === "slamtrap") return isSlamtrapMonster(id, ns);
          return true;
        }}
        onChange={(r, c, v) => patchCell("monstats", r, c, v)}
        displayName={(row) => {
          const id = getCell(row, table, "Id");
          const ns = getCell(row, table, "NameStr");
          const name = strings.display(ns, strings.display(id, id));
          return isSlamtrapMonster(id, ns) ? `${name}  ·  콰과광` : name;
        }}
        empty="조건에 맞는 몬스터가 없습니다."
      />
    </div>
  );
}

function MonsterDetail({
  table,
  row,
  rowIndex,
  name,
  tab,
  setTab,
  monprop,
  superuniques,
  onChange,
  onScale,
  onClose,
}: {
  table: TsvTable;
  row: string[];
  rowIndex: number;
  name: string;
  tab: TabId;
  setTab: (t: TabId) => void;
  monprop?: TsvTable;
  superuniques?: TsvTable;
  onChange: (col: string, val: string) => void;
  onScale: (kind: "hp" | "damage", factor: number) => void;
  onClose: () => void;
}) {
  const id = getCell(row, table, "Id");
  const propId = getCell(row, table, "MonProp");
  const propIndex = findMonPropRow(monprop, propId);
  const uniqueRows = findSuperUniqueRows(superuniques, id);
  const patchProp = useEditor((s) => s.patchCell);
  const patchUnique = useEditor((s) => s.patchCell);

  return (
    <section className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-fg-subtle">
            #{rowIndex} · {id}
          </p>
          <h3 className="font-display text-xl tracking-tight">{name || id}</h3>
          <p className="mt-1 text-xs text-fg-muted">
            레벨 {getCell(row, table, "Level") || "—"} / NM {getCell(row, table, "Level(N)") || "—"} / 헬 {getCell(row, table, "Level(H)") || "—"}
            {getCell(row, table, "boss") === "1" ? " · 보스" : ""}
            {getCell(row, table, "primeevil") === "1" ? " · 프라임 이블" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onScale("hp", 0.5)}>
            HP ½
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onScale("hp", 2)}>
            HP ×2
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onScale("damage", 0.5)}>
            피해 ½
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onScale("damage", 2)}>
            피해 ×2
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "primary" : "secondary"} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "stats" ? <DiffGrid table={table} row={row} rows={MONSTER_STAT_ROWS} extras onChange={onChange} /> : null}
      {tab === "resist" ? (
        <>
          <p className="mt-3 text-xs text-fg-muted">100 이상이면 해당 속성 면역입니다. 음수는 약점입니다.</p>
          <DiffGrid table={table} row={row} rows={MONSTER_RESIST_ROWS} onChange={onChange} />
        </>
      ) : null}
      {tab === "effects" ? (
        <EffectsPanel
          table={table}
          row={row}
          onChange={onChange}
          propId={propId}
          monprop={monprop}
          propIndex={propIndex}
          superuniques={superuniques}
          uniqueRows={uniqueRows}
          patchProp={patchProp}
          patchUnique={patchUnique}
        />
      ) : null}
      {tab === "skills" ? <SkillsPanel table={table} row={row} onChange={onChange} /> : null}
    </section>
  );
}

function DiffGrid({
  table,
  row,
  rows,
  extras,
  onChange,
}: {
  table: TsvTable;
  row: string[];
  rows: { base: string; label: string }[];
  extras?: boolean;
  onChange: (col: string, val: string) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="text-xs text-fg-muted">
            <th className="py-2 pr-3 font-medium">항목</th>
            {MONSTER_DIFFS.map((d) => (
              <th key={d.suffix || "n"} className="py-2 pr-3 font-medium">
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.base} className="border-t border-border">
              <td className="py-1.5 pr-3 text-fg-muted whitespace-nowrap">{r.label}</td>
              {MONSTER_DIFFS.map((d) => {
                const col = monsterDiffCol(r.base, d.suffix);
                return (
                  <td key={col} className="py-1.5 pr-3">
                    <Input className="h-9 tabular-nums" value={getCell(row, table, col)} onChange={(e) => onChange(col, e.target.value)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {extras ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <NumField label="이동속도" value={getCell(row, table, "Velocity")} onChange={(v) => onChange("Velocity", v)} />
          <NumField label="달리기" value={getCell(row, table, "Run")} onChange={(v) => onChange("Run", v)} />
          <NumField label="생명 재생" value={getCell(row, table, "DamageRegen")} onChange={(v) => onChange("DamageRegen", v)} />
          <NumField label="희귀도" value={getCell(row, table, "Rarity")} onChange={(v) => onChange("Rarity", v)} />
        </div>
      ) : null}
    </div>
  );
}

function EffectsPanel({
  table,
  row,
  onChange,
  propId,
  monprop,
  propIndex,
  superuniques,
  uniqueRows,
  patchProp,
  patchUnique,
}: {
  table: TsvTable;
  row: string[];
  onChange: (col: string, val: string) => void;
  propId: string;
  monprop?: TsvTable;
  propIndex: number;
  superuniques?: TsvTable;
  uniqueRows: number[];
  patchProp: (key: "monprop", i: number, col: string, val: string) => void;
  patchUnique: (key: "superuniques", i: number, col: string, val: string) => void;
}) {
  return (
    <div className="mt-4 space-y-6">
      <div>
        <h4 className="text-sm font-medium">속성 공격</h4>
        <p className="mt-0.5 text-xs text-fg-muted">평타·스킬에 붙는 화염/냉기/번개/독 피해입니다. Pct는 발동 확률입니다.</p>
        <div className="mt-3 space-y-4">
          {[1, 2, 3].map((n) => (
            <ElementBlock key={n} n={n} table={table} row={row} onChange={onChange} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium">특수 플래그</h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {MONSTER_FLAGS.map((f) => {
            const on = getCell(row, table, f.col) === "1";
            return (
              <label key={f.col} className="flex items-start gap-2 rounded-lg border border-border bg-bg px-3 py-2" title={f.hint}>
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={on}
                  onChange={(e) => onChange(f.col, e.target.checked ? "1" : "")}
                />
                <span>
                  <span className="block text-sm">{f.label}</span>
                  <span className="block text-[11px] text-fg-subtle">{f.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <NumField label="무리 최소" value={getCell(row, table, "MinGrp")} onChange={(v) => onChange("MinGrp", v)} />
        <NumField label="무리 최대" value={getCell(row, table, "MaxGrp")} onChange={(v) => onChange("MaxGrp", v)} />
        <NumField label="파티 최소" value={getCell(row, table, "PartyMin")} onChange={(v) => onChange("PartyMin", v)} />
        <NumField label="파티 최대" value={getCell(row, table, "PartyMax")} onChange={(v) => onChange("PartyMax", v)} />
      </div>

      <label className="block">
        <span className="text-sm font-medium">MonProp 키</span>
        <span className="mt-0.5 block text-xs text-fg-muted">monprop.txt 의 Id. 비우면 고유 속성이 없습니다.</span>
        <Input className="mt-1.5 h-10 font-mono text-xs" value={propId} onChange={(e) => onChange("MonProp", e.target.value)} />
      </label>

      {monprop && propIndex >= 0 ? (
        <MonPropEditor table={monprop} rowIndex={propIndex} onChange={(c, v) => patchProp("monprop", propIndex, c, v)} />
      ) : propId ? (
        <p className="text-xs text-fg-muted">
          {monprop ? `monprop.txt에 '${propId}' 항목이 없습니다.` : "MPQ에 monprop.txt가 없어 속성 슬롯을 직접 고칠 수 없습니다. 키만 바뀝니다."}
        </p>
      ) : null}

      {superuniques && uniqueRows.length ? (
        <div>
          <h4 className="text-sm font-medium">슈퍼유니크 모드</h4>
          <p className="mt-0.5 text-xs text-fg-muted">이 몬스터를 Class로 쓰는 슈퍼유니크의 Mod1–3 입니다.</p>
          <div className="mt-3 space-y-3">
            {uniqueRows.map((i) => {
              const urow = superuniques.rows[i]!;
              return (
                <div key={i} className="rounded-lg border border-border bg-bg px-3 py-3">
                  <p className="text-sm font-medium">{getCell(urow, superuniques, "Name") || getCell(urow, superuniques, "Superunique")}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {["Mod1", "Mod2", "Mod3"].map((col) => (
                      <label key={col}>
                        <span className="text-xs text-fg-muted">
                          {col} {umodLabel(getCell(urow, superuniques, col)) ? `· ${umodLabel(getCell(urow, superuniques, col))}` : ""}
                        </span>
                        <Input
                          className="mt-1 h-9"
                          value={getCell(urow, superuniques, col)}
                          onChange={(e) => patchUnique("superuniques", i, col, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ElementBlock({
  n,
  table,
  row,
  onChange,
}: {
  n: number;
  table: TsvTable;
  row: string[];
  onChange: (col: string, val: string) => void;
}) {
  const mode = getCell(row, table, `El${n}Mode`);
  const type = getCell(row, table, `El${n}Type`);
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">속성 {n}</span>
        {type ? <Badge>{elTypeLabel(type)}</Badge> : null}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label>
          <span className="text-xs text-fg-muted">공격 모드</span>
          <select
            className="mt-1 h-10 w-full rounded-sm border border-border bg-bg px-2 text-sm"
            value={mode}
            onChange={(e) => onChange(`El${n}Mode`, e.target.value)}
          >
            {EL_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
            {mode && !EL_MODES.some((m) => m.id === mode) ? <option value={mode}>{mode}</option> : null}
          </select>
        </label>
        <label>
          <span className="text-xs text-fg-muted">속성</span>
          <select
            className="mt-1 h-10 w-full rounded-sm border border-border bg-bg px-2 text-sm"
            value={type}
            onChange={(e) => onChange(`El${n}Type`, e.target.value)}
          >
            {EL_TYPES.map((t) => (
              <option key={t || "none"} value={t}>
                {t ? `${elTypeLabel(t)} (${t})` : "(없음)"}
              </option>
            ))}
            {type && !EL_TYPES.includes(type) ? <option value={type}>{type}</option> : null}
          </select>
        </label>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead className="text-fg-muted">
            <tr>
              <th className="py-1 font-medium" />
              <th className="py-1 font-medium">확률 %</th>
              <th className="py-1 font-medium">최소</th>
              <th className="py-1 font-medium">최대</th>
              <th className="py-1 font-medium">지속</th>
            </tr>
          </thead>
          <tbody>
            {MONSTER_DIFFS.map((d) => (
              <tr key={d.suffix || "n"}>
                <td className="py-1 pr-2 text-fg-muted whitespace-nowrap">{d.label}</td>
                {["Pct", "MinD", "MaxD", "Dur"].map((kind) => {
                  const col = `El${n}${kind}${d.suffix}`;
                  return (
                    <td key={col} className="py-1 pr-2">
                      <Input className="h-8" value={getCell(row, table, col)} onChange={(e) => onChange(col, e.target.value)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonPropEditor({
  table,
  rowIndex,
  onChange,
}: {
  table: TsvTable;
  rowIndex: number;
  onChange: (col: string, val: string) => void;
}) {
  const row = table.rows[rowIndex];
  if (!row) return null;
  const diffs = [
    { suffix: "", label: "노멀" },
    { suffix: " (N)", label: "NM" },
    { suffix: " (H)", label: "헬" },
  ];
  return (
    <div>
      <h4 className="text-sm font-medium">몬스터 속성 (monprop)</h4>
      <p className="mt-0.5 text-xs text-fg-muted">아이템 옵션 코드와 같습니다. 예: aura, dmg-fire, res-all.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="text-fg-muted">
            <tr>
              <th className="py-1 font-medium">난이도</th>
              <th className="py-1 font-medium">#</th>
              <th className="py-1 font-medium">속성</th>
              <th className="py-1 font-medium">확률</th>
              <th className="py-1 font-medium">param</th>
              <th className="py-1 font-medium">최소</th>
              <th className="py-1 font-medium">최대</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d) =>
              [1, 2, 3, 4, 5, 6].map((n) => {
                const prop = `prop${n}${d.suffix}`;
                if (!table.headers.includes(prop) && !table.headers.some((h) => h.toLowerCase() === prop.toLowerCase())) {
                  return null;
                }
                return (
                  <tr key={prop} className="border-t border-border">
                    <td className="py-1 pr-2 text-fg-muted">{n === 1 ? d.label : ""}</td>
                    <td className="py-1 pr-2 tabular-nums">{n}</td>
                    {["", "chance", "par", "min", "max"].map((kind) => {
                      const col = kind ? `${kind}${n}${d.suffix}` : prop;
                      return (
                        <td key={col} className="py-1 pr-2">
                          <Input className="h-8 font-mono" value={getCell(row, table, col)} onChange={(e) => onChange(col, e.target.value)} />
                        </td>
                      );
                    })}
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkillsPanel({
  table,
  row,
  onChange,
}: {
  table: TsvTable;
  row: string[];
  onChange: (col: string, val: string) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <p className="text-xs text-fg-muted">Skill 칸에는 Skills.txt 의 skill 키를 넣습니다.</p>
      <table className="mt-3 w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="text-xs text-fg-muted">
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">스킬</th>
            <th className="py-2 pr-3 font-medium">레벨</th>
            <th className="py-2 pr-3 font-medium">모드</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <tr key={n} className="border-t border-border">
              <td className="py-1.5 pr-3 text-fg-muted">{n}</td>
              <td className="py-1.5 pr-3">
                <Input className="h-9 font-mono text-xs" value={getCell(row, table, `Skill${n}`)} onChange={(e) => onChange(`Skill${n}`, e.target.value)} />
              </td>
              <td className="py-1.5 pr-3">
                <Input className="h-9" value={getCell(row, table, `Sk${n}lvl`)} onChange={(e) => onChange(`Sk${n}lvl`, e.target.value)} />
              </td>
              <td className="py-1.5 pr-3">
                <Input className="h-9" value={getCell(row, table, `Sk${n}mode`)} onChange={(e) => onChange(`Sk${n}mode`, e.target.value)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="text-xs text-fg-muted">{label}</span>
      <Input className="mt-1 h-10" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

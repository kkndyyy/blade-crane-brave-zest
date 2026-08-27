import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useEditor } from "@/lib/store";
import { HINTS, MONSTER_EDITOR_COLS, SKILL_EDITOR_COLS, isSlamtrapMonster, labelClass, labelCol } from "@/lib/d2/labels";
import { koreanSkillName } from "@/lib/d2/strings";
import { listSkillExtras, type ExtraId } from "@/lib/d2/skillExtras";
import { getCell, isDataRow, num, type TsvTable } from "@/lib/d2/tsv";
import { DataGrid, SearchField } from "./DataGrid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CLASSES = [
  { id: "all", code: "", label: "전체" },
  { id: "ama", code: "ama", label: "아마존" },
  { id: "sor", code: "sor", label: "소서리스" },
  { id: "nec", code: "nec", label: "네크로맨서" },
  { id: "war", code: "war", label: "악마술사" },
  { id: "pal", code: "pal", label: "팔라딘" },
  { id: "bar", code: "bar", label: "바바리안" },
  { id: "dru", code: "dru", label: "드루이드" },
  { id: "ass", code: "ass", label: "어쌔신" },
  { id: "none", code: "__none__", label: "공용·몬스터" },
];

type DetailTab = "damage" | "synergy" | "params" | "basic";

export function SkillTable() {
  const table = useEditor((s) => s.tables.skills);
  const skilldesc = useEditor((s) => s.tables.skilldesc);
  const strings = useEditor((s) => s.strings);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const resetTable = useEditor((s) => s.resetTable);
  const scaleSkillDamage = useEditor((s) => s.scaleSkillDamage);
  const [cls, setCls] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<DetailTab>("damage");
  if (!table) return <NeedFile kind="스킬" />;

  const selectedRow = selected != null ? table.rows[selected] : undefined;
  const selectedName = selectedRow
    ? koreanSkillName(strings, {
        skill: getCell(selectedRow, table, "skill"),
        skilldesc: getCell(selectedRow, table, "skilldesc"),
        id: getCell(selectedRow, table, "*Id"),
        skilldescTable: skilldesc,
      })
    : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight">캐릭터 스킬</h2>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed">
              직업을 고르고 스킬을 선택하면 피해·시너지·파라미터를 수정할 수 있습니다. 데미지 2배 버튼은 선택한 직업의 현재 값에 누적됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField value={search} onChange={setSearch} placeholder="스킬 이름 검색" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                scaleSkillDamage(2, cls);
                toast.success("데미지 2배 상승 — 현재 값에 누적");
              }}
            >
              데미지 2배 상승
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                scaleSkillDamage(0.5, cls);
                toast.success("데미지 2배 하향 — 현재 값에 누적");
              }}
            >
              데미지 2배 하향
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { resetTable("skills"); resetTable("missiles"); }}>원본</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CLASSES.map((c) => (
            <Button key={c.id} size="sm" variant={cls === c.id ? "primary" : "secondary"} onClick={() => setCls(c.id)}>
              {c.label}
            </Button>
          ))}
        </div>
      </header>

      {selectedRow && isDataRow(selectedRow) ? (
        <SkillDetail
          table={table}
          row={selectedRow}
          rowIndex={selected!}
          tab={tab}
          onTab={setTab}
          title={selectedName}
          klass={labelClass(getCell(selectedRow, table, "charclass"))}
          onChange={(col, val) => patchCell("skills", selected!, col, val)}
          onClose={() => setSelected(null)}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
          목록에서 스킬을 선택하면 데미지, 시너지, 파라미터를 수정할 수 있습니다.
        </p>
      )}

      <DataGrid
        table={table}
        columns={SKILL_EDITOR_COLS}
        search={search}
        selectedIndex={selected}
        onSelectRow={setSelected}
        filterRow={(row) => {
          const code = getCell(row, table, "charclass").toLowerCase();
          if (cls === "all") return true;
          if (cls === "none") return !code;
          return code === CLASSES.find((c) => c.id === cls)?.code;
        }}
        onChange={(r, c, v) => patchCell("skills", r, c, v)}
        displayName={(row) => {
          const name = koreanSkillName(strings, {
            skill: getCell(row, table, "skill"),
            skilldesc: getCell(row, table, "skilldesc"),
            id: getCell(row, table, "*Id"),
            skilldescTable: skilldesc,
          });
          const klass = labelClass(getCell(row, table, "charclass"));
          return `${name}  ·  ${klass}`;
        }}
        empty="조건에 맞는 스킬이 없습니다."
      />
    </div>
  );
}

const PHYS_COLS = [
  "MinDam", "MaxDam",
  "MinLevDam1", "MinLevDam2", "MinLevDam3", "MinLevDam4", "MinLevDam5",
  "MaxLevDam1", "MaxLevDam2", "MaxLevDam3", "MaxLevDam4", "MaxLevDam5",
  "SrcDam", "HitShift", "ToHit", "LevToHit",
];
const ELEM_COLS = [
  "EType", "EMin", "EMax",
  "EMinLev1", "EMaxLev1",
  "EMinLev2", "EMaxLev2",
  "EMinLev3", "EMaxLev3",
  "EMinLev4", "EMaxLev4",
  "EMinLev5", "EMaxLev5",
  "ELen",
];
const DAMAGE_COLS = [...ELEM_COLS, ...PHYS_COLS];

const SYNERGY_COLS = ["DmgSymPerCalc", "EDmgSymPerCalc", "ELenSymPerCalc", "ToHitCalc", "calc1", "calc2", "calc3", "calc4"];
const PARAM_COLS = ["Param1", "Param2", "Param3", "Param4", "Param5", "Param6", "Param7", "Param8"];
const BASIC_COLS = ["reqlevel", "maxlvl", "minmana", "mana", "lvlmana", "manashift", "delay", "localdelay", "globaldelay", "InGame", "leftskill", "rightskill", "passive", "aura"];

const ETYPE_KO: Record<string, string> = {
  fire: "화염",
  cold: "냉기",
  ltng: "번개",
  mag: "마법",
  pois: "독",
  burn: "화상",
  stun: "기절",
  steal: "흡수",
};

const TABS: { id: DetailTab; label: string }[] = [
  { id: "damage", label: "데미지" },
  { id: "synergy", label: "시너지" },
  { id: "params", label: "파라미터" },
  { id: "basic", label: "기본" },
];

function fieldHint(table: TsvTable, row: string[], col: string): string {
  const candidates = [`*${col} Description`, `*${col} desc`, `*${col}desc`, `*${col} Description2`];
  for (const c of candidates) {
    const v = getCell(row, table, c).trim();
    if (v) return v;
  }
  return HINTS[col] ?? "";
}

function SkillDetail({
  table,
  row,
  rowIndex,
  tab,
  onTab,
  title,
  klass,
  onChange,
  onClose,
}: {
  table: TsvTable;
  row: string[];
  rowIndex: number;
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
  title: string;
  klass: string;
  onChange: (col: string, val: string) => void;
  onClose: () => void;
}) {
  const cols = tab === "damage" ? DAMAGE_COLS : tab === "synergy" ? SYNERGY_COLS : tab === "params" ? PARAM_COLS : BASIC_COLS;
  const wide = tab === "synergy";
  const eType = getCell(row, table, "EType");
  const eMin = getCell(row, table, "EMin");
  const eMax = getCell(row, table, "EMax");
  const minDam = getCell(row, table, "MinDam");
  const maxDam = getCell(row, table, "MaxDam");
  const missile = getCell(row, table, "srvmissilea") || getCell(row, table, "srvmissile");
  const elemOnly = Boolean(eType && !minDam && !maxDam);

  return (
    <section className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-fg-subtle">{klass}</p>
          <h3 className="font-display text-xl tracking-tight">{title || getCell(row, table, "skill")}</h3>
          <p className="mt-1 text-xs text-fg-muted">#{rowIndex} · {getCell(row, table, "skill")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>닫기</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "primary" : "secondary"} onClick={() => onTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      <SkillExtras skillIndex={rowIndex} skillRow={row} skills={table} />

      {tab === "damage" ? (
        <div className="mt-4 space-y-5">
          {elemOnly ? (
            <p className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg-muted leading-relaxed">
              이 스킬은 물리 피해(최소/최대 피해)를 쓰지 않습니다.
              실제 피해는 <span className="text-fg">{ETYPE_KO[eType] ?? eType} {eMin || "0"}–{eMax || "0"}</span>
              {" "}속성 칸에 들어 있습니다.
              {missile ? <> 투사체 <span className="text-fg">{missile}</span>로 나갑니다.</> : null}
            </p>
          ) : null}
          <FieldGroup
            title="속성 피해"
            hint="1레벨 값은 속성 최소/최대입니다. 1~5번 칸은 스킬 레벨 구간에 들어갈 때마다 더하는 값입니다."
            cols={ELEM_COLS}
            table={table}
            row={row}
            onChange={onChange}
            extra={<ElemDamagePreview table={table} row={row} />}
          />
          <FieldGroup
            title="물리 피해"
            hint="무기 타격형 스킬만 사용합니다. 화염 고리처럼 투사체 스킬은 비어 있는 것이 정상입니다."
            cols={PHYS_COLS}
            table={table}
            row={row}
            onChange={onChange}
          />
        </div>
      ) : (
        <div className={cn("mt-4 grid gap-3", wide ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3")}>
          {cols.filter((c) => hasCol(table, c)).map((c) => (
            <SkillField key={c} table={table} row={row} col={c} wide={wide} onChange={onChange} />
          ))}
        </div>
      )}
    </section>
  );
}

function SkillExtras({ skillIndex, skillRow, skills }: { skillIndex: number; skillRow: string[]; skills: TsvTable }) {
  const missiles = useEditor((s) => s.tables.missiles);
  const setSkillExtra = useEditor((s) => s.setSkillExtra);
  const extras = listSkillExtras(skillRow, skills, missiles);
  return (
    <div className="mt-4 rounded-lg border border-border bg-bg px-3 py-3">
      <p className="text-sm font-medium">부가 옵션</p>
      <p className="mt-0.5 text-xs text-fg-muted leading-relaxed">
        스킬·투사체에 붙은 효과를 켜거나 끕니다. 화염 고리의 넉백은 투사체 ringoffire의 KnockBack입니다.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {extras.map((ex) => (
          <label
            key={ex.id}
            className={cn(
              "flex items-start gap-3 rounded-md px-2 py-1.5",
              ex.available ? "hover:bg-bg-subtle/80" : "opacity-50",
            )}
          >
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={ex.enabled}
              disabled={!ex.available}
              onChange={(e) => {
                const on = e.target.checked;
                setSkillExtra(skillIndex, ex.id as ExtraId, on);
                toast.success(on ? `${ex.label} 적용` : `${ex.label} 해제`);
              }}
            />
            <span>
              <span className="block text-sm">{ex.label}</span>
              <span className="block text-xs text-fg-muted leading-relaxed">
                {ex.hint}
                {ex.available ? ` · ${ex.source}` : " · 이 스킬에는 투사체가 없어 바꿀 수 없습니다"}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function hasCol(table: TsvTable, col: string) {
  return table.headers.some((h) => h.toLowerCase() === col.toLowerCase());
}

function FieldGroup({
  title,
  hint,
  cols,
  table,
  row,
  onChange,
  extra,
}: {
  title: string;
  hint: string;
  cols: string[];
  table: TsvTable;
  row: string[];
  onChange: (col: string, val: string) => void;
  extra?: ReactNode;
}) {
  const visible = cols.filter((c) => hasCol(table, c));
  if (!visible.length) return null;
  return (
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="mt-0.5 text-xs text-fg-muted leading-relaxed">{hint}</p>
      {extra}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <SkillField key={c} table={table} row={row} col={c} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

const DMG_BANDS = [
  { start: 2, end: 8 },
  { start: 9, end: 16 },
  { start: 17, end: 22 },
  { start: 23, end: 28 },
  { start: 29, end: 99 },
] as const;

function d2Scaled(level: number, base: number, per: number[]): number {
  let v = base;
  for (let i = 0; i < DMG_BANDS.length; i++) {
    const { start, end } = DMG_BANDS[i]!;
    if (level < start) break;
    v += (per[i] ?? 0) * (Math.min(level, end) - start + 1);
  }
  return v;
}

function ElemDamagePreview({ table, row }: { table: TsvTable; row: string[] }) {
  const eType = getCell(row, table, "EType");
  const baseMin = num(getCell(row, table, "EMin"));
  const baseMax = num(getCell(row, table, "EMax"));
  if (!eType && !baseMin && !baseMax) return null;
  const perMin = [1, 2, 3, 4, 5].map((i) => num(getCell(row, table, `EMinLev${i}`)));
  const perMax = [1, 2, 3, 4, 5].map((i) => num(getCell(row, table, `EMaxLev${i}`)));
  const maxLvl = Math.max(25, num(getCell(row, table, "maxlvl"), 20));
  const levels = [1, 5, 10, 20, Math.min(25, maxLvl)].filter((v, i, a) => a.indexOf(v) === i);
  const kind = ETYPE_KO[eType] ?? eType ?? "속성";
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-bg">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-fg-muted">
            <th className="px-3 py-2 font-medium">스킬 레벨</th>
            {levels.map((lv) => (
              <th key={lv} className="px-3 py-2 font-medium tabular-nums">
                {lv}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-2 text-fg-muted">{kind} 피해</td>
            {levels.map((lv) => (
              <td key={lv} className="px-3 py-2 tabular-nums text-fg">
                {d2Scaled(lv, baseMin, perMin)}–{d2Scaled(lv, baseMax, perMax)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="border-t border-border px-3 py-2 text-xs text-fg-muted leading-relaxed">
        시너지·히트시프트 제외. 구간은 2–8 / 9–16 / 17–22 / 23–28 / 29+ 입니다.
      </p>
    </div>
  );
}

function SkillField({
  table,
  row,
  col,
  wide,
  onChange,
}: {
  table: TsvTable;
  row: string[];
  col: string;
  wide?: boolean;
  onChange: (col: string, val: string) => void;
}) {
  const hint = fieldHint(table, row, col);
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium">{labelCol(col)}</span>
      {hint ? <span className="mt-0.5 block text-xs text-fg-muted leading-snug">{hint}</span> : null}
      <input
        className={cn(
          "mt-1.5 h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg",
          "hover:border-border-strong focus:border-primary/50",
          wide ? "font-mono text-xs" : "tabular-nums",
        )}
        value={getCell(row, table, col)}
        onChange={(e) => onChange(col, e.target.value)}
      />
    </label>
  );
}

export function MonsterTable() {
  const table = useEditor((s) => s.tables.monstats);
  const strings = useEditor((s) => s.strings);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const resetTable = useEditor((s) => s.resetTable);
  const setSlamtrapSkillsDisabled = useEditor((s) => s.setSlamtrapSkillsDisabled);
  if (!table) return <NeedFile kind="몬스터" />;

  const slamtraps = useMemo(() => {
    const rows: { index: number; row: string[] }[] = [];
    table.rows.forEach((row, index) => {
      if (!isDataRow(row)) return;
      if (isSlamtrapMonster(getCell(row, table, "Id"), getCell(row, table, "NameStr"))) {
        rows.push({ index, row });
      }
    });
    return rows;
  }, [table]);

  const slamtrapOff = slamtraps.length > 0 && slamtraps.every(({ row }) => !getCell(row, table, "Skill1").trim());

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-tight">몬스터 스킬</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed">
            Skill1–8 과 레벨, 난이도별 레벨/TC를 수정합니다. 스킬 칸에는 Skills.txt 의 skill 키를 넣습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchField value={search} onChange={setSearch} placeholder="몬스터 이름 · ID" />
          <Button variant="ghost" size="sm" onClick={() => resetTable("monstats")}>원본</Button>
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
          <span className="mt-0.5 block text-xs text-fg-muted leading-relaxed">
            {slamtraps.length
              ? `slamtrap ${slamtraps.length}마리의 Skill1–8을 비웁니다. 체크를 끄면 연 파일 원본 스킬이 복구됩니다.`
              : "이 모드에 slamtrap(콰과광) 항목이 없습니다."}
          </span>
        </span>
      </label>

      <DataGrid
        table={table}
        columns={MONSTER_EDITOR_COLS}
        search={search}
        onChange={(r, c, v) => patchCell("monstats", r, c, v)}
        displayName={(row) => {
          const id = getCell(row, table, "Id");
          const ns = getCell(row, table, "NameStr");
          const name = strings.display(ns, strings.display(id, id));
          return isSlamtrapMonster(id, ns) ? `${name}  ·  콰과광` : name;
        }}
        empty="몬스터가 없습니다."
      />
    </div>
  );
}

function NeedFile({ kind }: { kind: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
      <p className="font-display text-xl">{kind} 테이블이 없습니다</p>
      <p className="mt-2 text-sm text-fg-muted">MPQ를 열거나 엽굵 샘플을 불러오세요.</p>
    </div>
  );
}

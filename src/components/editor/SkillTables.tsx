import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useEditor } from "@/lib/store";
import { HINTS, SKILL_EDITOR_COLS, labelClass, labelCol } from "@/lib/d2/labels";
import { koreanSkillName } from "@/lib/d2/strings";
import { listSkillExtras, type ExtraId } from "@/lib/d2/skillExtras";
import {
  BIND_RANKS,
  findBindRankEditor,
  formatBlvlSteps,
  listSkillOptions,
  paramHint,
  replaceBindRankText,
  usedParamCols,
  type BindRankBand,
  type BindRankEditor,
  type BindRankId,
  type SkillOption,
} from "@/lib/d2/skillOptions";
import { getCell, isDataRow, num, type TsvTable } from "@/lib/d2/tsv";
import { DataGrid, SearchField } from "./DataGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function parseScaleFactor(raw: string): number | null {
  const n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 0.01 || n > 100) return null;
  return n;
}

function formatScaleFactor(n: number): string {
  const s = n.toFixed(4).replace(/\.?0+$/, "");
  return s || "1";
}

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
  const [dmgFactor, setDmgFactor] = useState("2");
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
              직업을 고르고 스킬을 선택하면 피해·시너지·상세 옵션을 수정할 수 있습니다. 악마 숙련의 악마 최대 수처럼 게임 설명에 나오는 값은 상세 옵션에서 바꿉니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField value={search} onChange={setSearch} placeholder="스킬 이름 검색" />
            <label className="flex items-center gap-1.5 text-xs text-fg-muted">
              배율
              <Input
                className="h-9 w-[4.5rem] px-2 text-center tabular-nums"
                inputMode="decimal"
                value={dmgFactor}
                onChange={(e) => setDmgFactor(e.target.value)}
                aria-label="스킬 데미지 배율"
              />
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const n = parseScaleFactor(dmgFactor);
                if (n == null) {
                  toast.error("배율은 0.01 ~ 100 사이 숫자로 입력하세요");
                  return;
                }
                scaleSkillDamage(n, cls);
                toast.success(`데미지 ${formatScaleFactor(n)}배 상승 — 현재 값에 누적`);
              }}
            >
              배율만큼 상승
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const n = parseScaleFactor(dmgFactor);
                if (n == null) {
                  toast.error("배율은 0.01 ~ 100 사이 숫자로 입력하세요");
                  return;
                }
                scaleSkillDamage(1 / n, cls);
                toast.success(`데미지 ${formatScaleFactor(n)}배 하향 — 현재 값에 누적`);
              }}
            >
              배율만큼 하향
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
          목록에서 스킬을 선택하면 데미지, 시너지, 상세 옵션을 수정할 수 있습니다.
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
const PARAM_COLS = [
  "petmax",
  "Param1", "Param2", "Param3", "Param4", "Param5", "Param6", "Param7", "Param8",
  "Param9", "Param10", "Param11", "Param12", "Param13", "Param14", "Param15", "Param16",
];
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
  { id: "params", label: "상세 옵션" },
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
      ) : tab === "params" ? (
        <SkillOptionsPanel table={table} row={row} onChange={onChange} />
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

function SkillOptionsPanel({
  table,
  row,
  onChange,
}: {
  table: TsvTable;
  row: string[];
  onChange: (col: string, val: string) => void;
}) {
  const skilldesc = useEditor((s) => s.tables.skilldesc);
  const strings = useEditor((s) => s.strings);
  const setSkillDescCalc = useEditor((s) => s.setSkillDescCalc);
  const patchSkillString = useEditor((s) => s.patchSkillString);
  const options = listSkillOptions(row, table, skilldesc, strings);
  const bindRanks = findBindRankEditor(row, table, skilldesc, strings);
  const used = usedParamCols(options);
  const skillName = getCell(row, table, "skill");
  const descKey = getCell(row, table, "skilldesc");
  const leftover = PARAM_COLS.filter((c) => {
    if (!hasCol(table, c)) return false;
    if (used.has(c)) return false;
    const v = getCell(row, table, c).trim();
    const hint = paramHint(row, table, c);
    return Boolean(v || hint);
  });

  return (
    <div className="mt-4 space-y-5">
      {bindRanks ? (
        <BindRankField
          key={bindRanks.key}
          editor={bindRanks}
          onCommit={(bands) => {
            patchSkillString(bindRanks.key, {
              koKR: replaceBindRankText(bindRanks.ko, bands, "ko"),
              enUS: replaceBindRankText(bindRanks.en, bands, "en"),
            });
            toast.success("속박 가능 등급 적용 · 스킬 설명에 반영");
          }}
        />
      ) : null}
      {options.length ? (
        <div>
          <h4 className="text-sm font-medium">게임 설명에 나오는 값</h4>
          <p className="mt-0.5 text-xs text-fg-muted leading-relaxed">
            스킬 창에 표시되는 항목입니다. 최대 수처럼 소환 상한과 연결된 값은 같이 바뀝니다.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((opt) => (
              <SkillOptionField
                key={opt.id}
                opt={opt}
                table={table}
                row={row}
                onChange={onChange}
                onDescCalc={(col, val, sync) => {
                  const n = setSkillDescCalc(descKey, col, val, sync ? skillName : undefined);
                  toast.success(n > 0 ? `${opt.label} 적용 · 소환 상한 ${n}개 스킬 반영` : `${opt.label} 적용`);
                }}
              />
            ))}
          </div>
        </div>
      ) : bindRanks ? null : (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-fg-muted">
          이 스킬은 설명 테이블에 숫자 옵션이 없습니다. 아래 파라미터를 직접 수정하세요.
        </p>
      )}
      {leftover.length ? (
        <FieldGroup
          title="그 외 파라미터"
          hint="설명 창에 안 나오지만 스킬이 쓰는 값입니다."
          cols={leftover}
          table={table}
          row={row}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}

function SkillOptionField({
  opt,
  table,
  row,
  onChange,
  onDescCalc,
}: {
  opt: SkillOption;
  table: TsvTable;
  row: string[];
  onChange: (col: string, val: string) => void;
  onDescCalc: (col: string, val: string, syncPetmax: boolean) => void;
}) {
  if (opt.kind === "cap" && opt.steps) {
    return (
      <BlvlCapField
        key={opt.calc}
        label={opt.label}
        hint={opt.hint}
        steps={opt.steps}
        onCommit={(next) => onDescCalc(opt.calcCol, next, true)}
      />
    );
  }
  if (opt.kind === "ln" && opt.ln) {
    return (
      <div className="rounded-lg border border-border bg-bg px-3 py-3 sm:col-span-2">
        <p className="text-sm font-medium">{opt.label}</p>
        {opt.hint ? <p className="mt-0.5 text-xs text-fg-muted">{opt.hint}</p> : null}
        {opt.ln.cap != null ? <p className="mt-0.5 text-xs text-fg-muted">상한 {opt.ln.cap}</p> : null}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <MiniNum
            label="기본"
            value={getCell(row, table, opt.ln.baseCol)}
            onChange={(v) => onChange(opt.ln!.baseCol, v)}
          />
          <MiniNum
            label="레벨당"
            value={getCell(row, table, opt.ln.perCol)}
            onChange={(v) => onChange(opt.ln!.perCol, v)}
          />
        </div>
      </div>
    );
  }
  if (opt.kind === "param" && opt.paramCol) {
    return (
      <label className="block min-w-0">
        <span className="text-sm font-medium">{opt.label}</span>
        {opt.hint ? <span className="mt-0.5 block text-xs text-fg-muted">{opt.hint}</span> : null}
        <input
          className="mt-1.5 h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm tabular-nums text-fg hover:border-border-strong focus:border-primary/50"
          value={getCell(row, table, opt.paramCol)}
          onChange={(e) => onChange(opt.paramCol!, e.target.value)}
        />
      </label>
    );
  }
  return (
    <label className="block min-w-0 sm:col-span-2">
      <span className="text-sm font-medium">{opt.label}</span>
      {opt.hint ? <span className="mt-0.5 block text-xs text-fg-muted">{opt.hint}</span> : null}
      <input
        className="mt-1.5 h-10 w-full rounded-sm border border-border bg-bg px-3 font-mono text-xs text-fg hover:border-border-strong focus:border-primary/50"
        value={opt.calc}
        onChange={(e) => onDescCalc(opt.calcCol, e.target.value, /blvl|최대 수|max/i.test(`${opt.label} ${opt.calc}`))}
      />
    </label>
  );
}

function BlvlCapField({
  label,
  hint,
  steps,
  onCommit,
}: {
  label: string;
  hint: string;
  steps: { at: number; value: number }[];
  onCommit: (formula: string) => void;
}) {
  const [flat, setFlat] = useState(() => (steps.length === 1 ? String(steps[0]!.value) : ""));
  const [local, setLocal] = useState(steps);
  const localRef = useRef(local);
  localRef.current = local;
  const useFlat = flat !== "";

  const commit = (next: { at: number; value: number }[]) => {
    const cleaned = next
      .filter((s) => Number.isFinite(s.at) && Number.isFinite(s.value) && s.at >= 1)
      .map((s) => ({ at: Math.floor(s.at), value: Math.floor(s.value) }));
    const seen = new Set<number>();
    const uniq: { at: number; value: number }[] = [];
    for (const s of [...cleaned].sort((a, b) => a.at - b.at)) {
      if (seen.has(s.at)) continue;
      seen.add(s.at);
      uniq.push(s);
    }
    if (!uniq.length) return;
    if (uniq[0]!.at !== 1) uniq.unshift({ at: 1, value: uniq[0]!.value });
    setLocal(uniq);
    setFlat("");
    onCommit(uniq.length === 1 ? String(uniq[0]!.value) : formatBlvlSteps(uniq));
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 sm:col-span-2 lg:col-span-3">
      <p className="text-sm font-medium">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-fg-muted">{hint}</p> : null}
      <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="w-16 shrink-0 text-fg-muted">고정</span>
        <input
          className="h-10 w-24 rounded-sm border border-border bg-bg px-3 text-sm tabular-nums"
          placeholder="예: 8"
          value={useFlat ? flat : ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            setFlat(v);
            if (v && /^-?\d+$/.test(v)) onCommit(v);
          }}
        />
        <span className="text-xs text-fg-muted">숫자를 넣으면 모든 레벨이 그 수입니다</span>
      </label>
      <div className="mt-3 overflow-x-auto rounded-md border border-border bg-bg">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-fg-muted">
              <th className="px-3 py-2 text-left font-medium">레벨</th>
              <th className="px-3 py-2 text-left font-medium">값</th>
              <th className="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {local.map((s, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2">
                  {i === 0 ? (
                    <span className="text-fg-muted">1렙부터</span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <input
                        className="h-8 w-16 rounded-sm border border-border bg-bg px-2 tabular-nums"
                        value={Number.isFinite(s.at) ? s.at : ""}
                        disabled={useFlat}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          const next = local.map((x, j) => (j === i ? { ...x, at: n } : x)); setLocal(next); localRef.current = next;
                        }}
                        onBlur={() => commit(localRef.current)}
                      />
                      <span className="text-xs text-fg-muted">렙 이상</span>
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    className="h-8 w-20 rounded-sm border border-border bg-bg px-2 tabular-nums"
                    value={Number.isFinite(s.value) ? s.value : ""}
                    disabled={useFlat}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      const next = local.map((x, j) => (j === i ? { ...x, value: n } : x)); setLocal(next); localRef.current = next;
                    }}
                    onBlur={() => commit(localRef.current)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  {i > 0 ? (
                    <button
                      type="button"
                      className="text-xs text-fg-muted hover:text-danger"
                      disabled={useFlat}
                      onClick={() => commit(local.filter((_, j) => j !== i))}
                    >
                      삭제
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={useFlat}
          onClick={() => {
            const last = local[local.length - 1] ?? { at: 1, value: 1 };
            commit([...local, { at: last.at + 5, value: last.value + 1 }]);
          }}
        >
          구간 추가
        </Button>
      </div>
    </div>
  );
}

function BindRankField({
  editor,
  onCommit,
}: {
  editor: BindRankEditor;
  onCommit: (bands: BindRankBand[]) => void;
}) {
  const [local, setLocal] = useState<BindRankBand[]>(() => editor.bands.map((b) => ({ at: b.at, ranks: [...b.ranks] })));
  const localRef = useRef(local);
  localRef.current = local;

  const commit = (next: BindRankBand[]) => {
    const cleaned: BindRankBand[] = [];
    const seen = new Set<number>();
    for (const b of [...next].sort((a, c) => a.at - c.at)) {
      const at = Math.floor(b.at);
      if (!Number.isFinite(at) || at < 1 || !b.ranks.length) continue;
      if (seen.has(at)) continue;
      seen.add(at);
      const ranks: BindRankId[] = [];
      for (const r of b.ranks) if (!ranks.includes(r)) ranks.push(r);
      cleaned.push({ at, ranks });
    }
    if (!cleaned.length) return;
    setLocal(cleaned);
    onCommit(cleaned);
  };

  const toggleRank = (index: number, id: BindRankId) => {
    const next = localRef.current.map((b, i) => {
      if (i !== index) return b;
      const has = b.ranks.includes(id);
      if (has && b.ranks.length === 1) return b;
      const ranks = has ? b.ranks.filter((r) => r !== id) : [...b.ranks, id];
      return { ...b, ranks };
    });
    setLocal(next);
    localRef.current = next;
    if (next[index]?.ranks.length) commit(next);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
      <p className="text-sm font-medium">속박 가능 몬스터 등급</p>
      <p className="mt-0.5 text-xs text-fg-muted leading-relaxed">
        직접 투자한 스킬 레벨 이상이어야 해당 등급을 속박할 수 있습니다. 레벨 구간과 등급을 같이 바꿉니다. 스킬 설명 텍스트에
        반영됩니다.
      </p>
      <div className="mt-3 overflow-x-auto rounded-md border border-border bg-bg">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-fg-muted">
              <th className="px-3 py-2 text-left font-medium">레벨</th>
              <th className="px-3 py-2 text-left font-medium">몬스터 등급</th>
              <th className="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {local.map((b, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 align-top">
                  {i === 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        className="h-8 w-16 rounded-sm border border-border bg-bg px-2 tabular-nums"
                        value={Number.isFinite(b.at) ? b.at : ""}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          const next = local.map((x, j) => (j === i ? { ...x, at: n } : x));
                          setLocal(next);
                          localRef.current = next;
                        }}
                        onBlur={() => commit(localRef.current)}
                      />
                      <span className="text-xs text-fg-muted">렙부터</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <input
                        className="h-8 w-16 rounded-sm border border-border bg-bg px-2 tabular-nums"
                        value={Number.isFinite(b.at) ? b.at : ""}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          const next = local.map((x, j) => (j === i ? { ...x, at: n } : x));
                          setLocal(next);
                          localRef.current = next;
                        }}
                        onBlur={() => commit(localRef.current)}
                      />
                      <span className="text-xs text-fg-muted">렙 이상</span>
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {BIND_RANKS.map((rank) => {
                      const on = b.ranks.includes(rank.id);
                      return (
                        <button
                          key={rank.id}
                          type="button"
                          onClick={() => toggleRank(i, rank.id)}
                          className={cn(
                            "h-8 rounded-md px-2.5 text-xs",
                            on ? "bg-primary text-primary-fg" : "bg-bg-subtle text-fg-muted hover:text-fg",
                          )}
                        >
                          {rank.ko}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="px-3 py-2 text-right align-top">
                  {local.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-fg-muted hover:text-danger"
                      onClick={() => commit(local.filter((_, j) => j !== i))}
                    >
                      삭제
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const last = local[local.length - 1] ?? { at: 1, ranks: ["normal"] };
            const unused = BIND_RANKS.map((r) => r.id).find((id) => !local.some((b) => b.ranks.includes(id)));
            commit([...local, { at: last.at + 5, ranks: [unused ?? last.ranks[0] ?? "normal"] }]);
          }}
        >
          구간 추가
        </Button>
      </div>
    </div>
  );
}

function MiniNum({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs text-fg-muted">{label}</span>
      <input
        className="mt-1 h-10 w-full rounded-sm border border-border bg-bg px-3 text-sm tabular-nums text-fg hover:border-border-strong focus:border-primary/50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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

function NeedFile({ kind }: { kind: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
      <p className="font-display text-xl">{kind} 테이블이 없습니다</p>
      <p className="mt-2 text-sm text-fg-muted">MPQ를 열거나 엽굵 샘플을 불러오세요.</p>
    </div>
  );
}

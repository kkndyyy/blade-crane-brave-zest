import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/lib/store";
import { colIndex, getCell, isDataRow, type TsvTable } from "@/lib/d2/tsv";
import type { StringTable } from "@/lib/d2/strings";
import {
  CUBE_FLAG_KO,
  CUBE_OP_KO,
  INPUT_COLS,
  OUTPUT_SLOTS,
  countedInputs,
  cubePartLabel,
  formatCubeField,
  parseCubeField,
  recipeKind,
  recipeSummary,
  type CubeKind,
} from "@/lib/d2/cubeRecipes";
import { CUBE_EDITOR_COLS } from "@/lib/d2/labels";
import { DataGrid, SearchField } from "./DataGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | "on" | "off" | CubeKind; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "on", label: "활성" },
  { id: "off", label: "비활성" },
  { id: "rune", label: "룬" },
  { id: "gem", label: "보석" },
  { id: "socket", label: "소켓" },
  { id: "craft", label: "크래프트" },
  { id: "upgrade", label: "유지·변환" },
  { id: "other", label: "기타" },
];

function buildNameMap(
  strings: StringTable,
  misc?: TsvTable,
  armor?: TsvTable,
  weapons?: TsvTable,
  itemTypes?: TsvTable,
): Map<string, string> {
  const names = new Map<string, string>();
  const add = (code: string, key: string, fallback: string) => {
    const c = code.trim();
    if (!c) return;
    const label = strings.display(key, strings.display(c, fallback || c));
    if (label) names.set(c.toLowerCase(), label);
  };
  for (const table of [misc, armor, weapons]) {
    if (!table) continue;
    for (const row of table.rows) {
      if (!isDataRow(row)) continue;
      const code = getCell(row, table, "code") || getCell(row, table, "normcode");
      add(code, getCell(row, table, "namestr") || getCell(row, table, "name") || code, getCell(row, table, "name"));
    }
  }
  if (itemTypes) {
    for (const row of itemTypes.rows) {
      if (!isDataRow(row)) continue;
      const code = getCell(row, itemTypes, "Code").trim();
      const type = getCell(row, itemTypes, "ItemType").trim();
      if (code && type && !names.has(code.toLowerCase())) names.set(code.toLowerCase(), type);
    }
  }
  for (const [k, v] of Object.entries(CUBE_FLAG_KO)) names.set(k, v);
  return names;
}

export function CubeTable() {
  const table = useEditor((s) => s.tables.cubemain);
  const misc = useEditor((s) => s.tables.misc);
  const armor = useEditor((s) => s.tables.armor);
  const weapons = useEditor((s) => s.tables.weapons);
  const itemTypes = useEditor((s) => s.tables.itemTypes);
  const strings = useEditor((s) => s.strings);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const resetTable = useEditor((s) => s.resetTable);
  const addCubeRecipe = useEditor((s) => s.addCubeRecipe);
  const duplicateCubeRecipe = useEditor((s) => s.duplicateCubeRecipe);
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const names = useMemo(
    () => buildNameMap(strings, misc, armor, weapons, itemTypes),
    [strings, misc, armor, weapons, itemTypes],
  );

  if (!table) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
        <p className="font-display text-xl">큐브 조합 테이블이 없습니다</p>
        <p className="mt-2 text-sm text-fg-muted">MPQ를 열거나 엽굵 샘플을 불러오세요.</p>
      </div>
    );
  }

  const selectedRow = selected != null ? table.rows[selected] : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight">큐브 조합</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">
              호라드릭 큐브 공식을 고르면 재료·결과·수량을 바꿀 수 있습니다. 수량 있는 재료는 numinputs가 자동으로 맞춰집니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField value={search} onChange={setSearch} placeholder="설명 · 코드 · 한글 이름" />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const i = addCubeRecipe();
                if (i >= 0) {
                  setSelected(i);
                  toast.success("새 조합을 맨 위에 추가했습니다");
                }
              }}
            >
              새 조합
            </Button>
            <Button variant="ghost" size="sm" onClick={() => resetTable("cubemain")}>
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

      {selectedRow && isDataRow(selectedRow) ? (
        <CubeDetail
          table={table}
          row={selectedRow}
          rowIndex={selected!}
          names={names}
          onChange={(col, val) => patchCell("cubemain", selected!, col, val)}
          onDuplicate={() => {
            const i = duplicateCubeRecipe(selected!);
            if (i >= 0) {
              setSelected(i);
              toast.success("조합을 복사했습니다");
            }
          }}
          onClose={() => setSelected(null)}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
          목록에서 조합을 선택하면 재료와 결과를 수정할 수 있습니다.
        </p>
      )}

      <DataGrid
        table={table}
        columns={CUBE_EDITOR_COLS}
        search={search}
        selectedIndex={selected}
        onSelectRow={setSelected}
        filterRow={(row) => {
          if (filter === "all") return true;
          const on = getCell(row, table, "enabled") === "1";
          if (filter === "on") return on;
          if (filter === "off") return !on;
          return recipeKind(row, table) === filter;
        }}
        onChange={(r, c, v) => patchCell("cubemain", r, c, v)}
        displayName={(row) => recipeSummary(row, table, names)}
        empty="조건에 맞는 큐브 조합이 없습니다."
      />
    </div>
  );
}

function CubeDetail({
  table,
  row,
  rowIndex,
  names,
  onChange,
  onDuplicate,
  onClose,
}: {
  table: TsvTable;
  row: string[];
  rowIndex: number;
  names: Map<string, string>;
  onChange: (col: string, val: string) => void;
  onDuplicate: () => void;
  onClose: () => void;
}) {
  const enabled = getCell(row, table, "enabled") === "1";
  const summary = recipeSummary(row, table, names);
  const counted = countedInputs(row, table);

  const setField = (col: string, val: string, syncCount = false) => {
    onChange(col, val);
    if (!syncCount) return;
    const i = colIndex(table, col);
    const next = [...row];
    if (i >= 0) next[i] = val;
    onChange("numinputs", String(countedInputs(next, table) || 0));
  };

  return (
    <section className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-fg-subtle">#{rowIndex}</p>
          <h3 className="font-display text-xl tracking-tight">{getCell(row, table, "description") || "이름 없는 조합"}</h3>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onDuplicate}>
            복사
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="text-xs text-fg-muted">설명</span>
          <Input className="mt-1 h-10" value={getCell(row, table, "description")} onChange={(e) => onChange("description", e.target.value)} />
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-border bg-bg px-3">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={enabled}
            onChange={(e) => onChange("enabled", e.target.checked ? "1" : "0")}
          />
          <span className="text-sm">활성</span>
        </label>
        <label>
          <span className="text-xs text-fg-muted">재료 칸 수 (numinputs)</span>
          <Input
            className="mt-1 h-10"
            value={getCell(row, table, "numinputs")}
            onChange={(e) => onChange("numinputs", e.target.value)}
          />
          <span className="mt-1 block text-[11px] text-fg-subtle">재료 수량 합 {counted}</span>
        </label>
      </div>

      <h4 className="mt-6 text-sm font-medium">재료</h4>
      <p className="mt-0.5 text-xs text-fg-muted">코드와 옵션을 쉼표로 넣습니다. 예: r01 / weap,sock / gem3,qty=3</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {INPUT_COLS.map((col, i) => (
          <CubePartField
            key={col}
            label={`재료 ${i + 1}`}
            raw={getCell(row, table, col)}
            names={names}
            onChange={(v) => setField(col, v, true)}
          />
        ))}
      </div>

      <h4 className="mt-6 text-sm font-medium">결과</h4>
      <div className="mt-3 space-y-4">
        {OUTPUT_SLOTS.map((slot) => (
          <OutputBlock
            key={slot.field}
            table={table}
            row={row}
            slot={slot}
            names={names}
            onChange={onChange}
          />
        ))}
      </div>

      <h4 className="mt-6 text-sm font-medium">조건</h4>
      <p className="mt-0.5 text-xs text-fg-muted">
        재료 아이템의 스탯을 검사합니다. op 18 = 같음, 16 = 이상, 15 = 이하. param은 스탯 ID입니다.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="text-xs text-fg-muted">op {CUBE_OP_KO[getCell(row, table, "op")] ? `· ${CUBE_OP_KO[getCell(row, table, "op")]}` : ""}</span>
          <Input className="mt-1 h-10" value={getCell(row, table, "op")} onChange={(e) => onChange("op", e.target.value)} />
        </label>
        <label>
          <span className="text-xs text-fg-muted">param (스탯 ID)</span>
          <Input className="mt-1 h-10" value={getCell(row, table, "param")} onChange={(e) => onChange("param", e.target.value)} />
        </label>
        <label>
          <span className="text-xs text-fg-muted">value</span>
          <Input className="mt-1 h-10" value={getCell(row, table, "value")} onChange={(e) => onChange("value", e.target.value)} />
        </label>
        <label>
          <span className="text-xs text-fg-muted">직업 제한</span>
          <Input className="mt-1 h-10" value={getCell(row, table, "class")} onChange={(e) => onChange("class", e.target.value)} />
        </label>
      </div>
    </section>
  );
}

function CubePartField({
  label,
  raw,
  names,
  onChange,
}: {
  label: string;
  raw: string;
  names: Map<string, string>;
  onChange: (v: string) => void;
}) {
  const part = parseCubeField(raw);
  const preview = cubePartLabel(part, names);
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {preview ? <span className="truncate text-xs text-fg-muted">{preview}</span> : null}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          className="h-10 flex-1 font-mono text-xs"
          value={raw}
          placeholder="비움"
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          className="h-10 w-24"
          type="number"
          min={0}
          placeholder="수량"
          value={part.qty ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            const qty = v === "" ? null : Number(v);
            onChange(formatCubeField(part.tokens, Number.isFinite(qty as number) ? (qty as number) : null));
          }}
          disabled={!part.tokens.length && !raw.trim()}
        />
      </div>
    </div>
  );
}

function OutputBlock({
  table,
  row,
  slot,
  names,
  onChange,
}: {
  table: TsvTable;
  row: string[];
  slot: (typeof OUTPUT_SLOTS)[number];
  names: Map<string, string>;
  onChange: (col: string, val: string) => void;
}) {
  const raw = getCell(row, table, slot.field);
  const part = parseCubeField(raw);
  const preview = cubePartLabel(part, names);
  const lvl = `${slot.prefix}lvl`;
  const plvl = `${slot.prefix}plvl`;
  const ilvl = `${slot.prefix}ilvl`;
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{slot.label}</span>
        {preview ? <Badge tone="muted">{preview}</Badge> : null}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <Input
          className="h-10 font-mono text-xs sm:col-span-2"
          value={raw}
          placeholder="예: r02 또는 usetype,mag"
          onChange={(e) => onChange(slot.field, e.target.value)}
        />
        <Input
          className="h-10 w-full"
          placeholder="수량"
          type="number"
          min={0}
          value={part.qty ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            const qty = v === "" ? null : Number(v);
            onChange(slot.field, formatCubeField(part.tokens, Number.isFinite(qty as number) ? (qty as number) : null));
          }}
          disabled={!part.tokens.length && !raw.trim()}
        />
        <div className="grid grid-cols-3 gap-1">
          {[
            [lvl, "lvl"],
            [plvl, "plvl"],
            [ilvl, "ilvl"],
          ].map(([col, lab]) => (
            <label key={col}>
              <span className="block text-[10px] text-fg-subtle">{lab}</span>
              <Input className="h-9" value={getCell(row, table, col!)} onChange={(e) => onChange(col!, e.target.value)} />
            </label>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="text-fg-muted">
            <tr>
              <th className="py-1 font-medium">옵션</th>
              <th className="py-1 font-medium">확률</th>
              <th className="py-1 font-medium">param</th>
              <th className="py-1 font-medium">최소</th>
              <th className="py-1 font-medium">최대</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((n) => {
              const base = `${slot.prefix}mod ${n}`;
              return (
                <tr key={n}>
                  {["", " chance", " param", " min", " max"].map((suf) => {
                    const col = `${base}${suf}`;
                    return (
                      <td key={col} className="pr-2 py-1">
                        <Input className="h-8 font-mono" value={getCell(row, table, col)} onChange={(e) => onChange(col, e.target.value)} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

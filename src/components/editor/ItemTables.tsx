import type { ReactNode } from "react";
import { useState } from "react";
import { useEditor } from "@/lib/store";
import { FIGURE_TYPES, RUNE_TYPES, UNIQUE_EDITOR_COLS, SET_EDITOR_COLS, MISC_EDITOR_COLS, DIFF_KO } from "@/lib/d2/labels";
import { getCell, isDataRow } from "@/lib/d2/tsv";
import { figureKorean } from "@/lib/d2/strings";
import { setBonusAffixSlots, setItemAffixSlots, uniqueAffixSlots, runewordAffixSlots } from "@/lib/d2/itemProps";
import { DataGrid, SearchField } from "./DataGrid";
import { ItemAffixEditor } from "./ItemAffixes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { isRuneOpmSplitDouble } from "@/lib/d2/cubeRecipes";

export function UniqueTable() {
  const table = useEditor((s) => s.tables.uniqueItems);
  const strings = useEditor((s) => s.strings);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const scaleRarity = useEditor((s) => s.scaleRarity);
  const resetTable = useEditor((s) => s.resetTable);
  const [selected, setSelected] = useState<number | null>(null);
  if (!table) return <NeedFile kind="유니크 아이템" />;
  const selectedRow = selected != null ? table.rows[selected] : undefined;
  const selectedName = selectedRow
    ? strings.tryDisplay(getCell(selectedRow, table, "index")) ||
      strings.tryDisplay(getCell(selectedRow, table, "*ItemName")) ||
      getCell(selectedRow, table, "index")
    : "";
  return (
    <Panel
      title="유니크 아이템"
      blurb="목록에서 아이템을 고르면 옵션(속성·파라미터·최소/최대)을 바꿀 수 있습니다. 희귀도가 작을수록 더 자주 나옵니다."
      search={search}
      setSearch={setSearch}
      placeholder="유니크 이름 · 코드"
      onHalf={() => scaleRarity("unique", 0.5)}
      onReset={() => resetTable("uniqueItems")}
      badge={<Badge tone="unique">Unique</Badge>}
    >
      {selectedRow && isDataRow(selectedRow) ? (
        <ItemAffixEditor
          tableKey="uniqueItems"
          table={table}
          row={selectedRow}
          rowIndex={selected!}
          slots={uniqueAffixSlots()}
          title={selectedName}
          subtitle={`${getCell(selectedRow, table, "code")} · 요구 ${getCell(selectedRow, table, "lvl req") || "—"}`}
          onClose={() => setSelected(null)}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
          목록에서 유니크를 선택하면 옵션을 수정할 수 있습니다.
        </p>
      )}
      <DataGrid
        table={table}
        columns={UNIQUE_EDITOR_COLS}
        search={search}
        selectedIndex={selected}
        onSelectRow={setSelected}
        onChange={(r, c, v) => patchCell("uniqueItems", r, c, v)}
        displayName={(row) =>
          strings.tryDisplay(getCell(row, table, "index")) ||
          strings.tryDisplay(getCell(row, table, "*ItemName")) ||
          getCell(row, table, "index")
        }
        empty="유니크 아이템이 없습니다."
      />
    </Panel>
  );
}

export function SetTable() {
  const table = useEditor((s) => s.tables.setItems);
  const strings = useEditor((s) => s.strings);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const scaleRarity = useEditor((s) => s.scaleRarity);
  const resetTable = useEditor((s) => s.resetTable);
  const [selected, setSelected] = useState<number | null>(null);
  if (!table) return <NeedFile kind="세트 아이템" />;
  const selectedRow = selected != null ? table.rows[selected] : undefined;
  const selectedName = selectedRow
    ? strings.tryDisplay(getCell(selectedRow, table, "index")) ||
      strings.tryDisplay(getCell(selectedRow, table, "*ItemName")) ||
      getCell(selectedRow, table, "index")
    : "";
  return (
    <Panel
      title="세트 아이템"
      blurb="세트를 고르면 피스 옵션과 부분 세트 보너스를 수정할 수 있습니다."
      search={search}
      setSearch={setSearch}
      placeholder="세트 아이템 검색"
      onHalf={() => scaleRarity("set", 0.5)}
      onReset={() => resetTable("setItems")}
      badge={<Badge tone="set">Set</Badge>}
    >
      {selectedRow && isDataRow(selectedRow) ? (
        <>
          <ItemAffixEditor
            tableKey="setItems"
            table={table}
            row={selectedRow}
            rowIndex={selected!}
            slots={setItemAffixSlots()}
            title={selectedName}
            subtitle={`${getCell(selectedRow, table, "set")} · ${getCell(selectedRow, table, "item")}`}
            onClose={() => setSelected(null)}
          />
          <ItemAffixEditor
            tableKey="setItems"
            table={table}
            row={selectedRow}
            rowIndex={selected!}
            slots={setBonusAffixSlots()}
            title="부분 세트 보너스"
            subtitle="2세트부터 발동하는 aprop 옵션입니다."
            onClose={() => setSelected(null)}
          />
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
          목록에서 세트 피스를 선택하면 옵션을 수정할 수 있습니다.
        </p>
      )}
      <DataGrid
        table={table}
        columns={SET_EDITOR_COLS}
        search={search}
        selectedIndex={selected}
        onSelectRow={setSelected}
        onChange={(r, c, v) => patchCell("setItems", r, c, v)}
        displayName={(row) =>
          strings.tryDisplay(getCell(row, table, "index")) ||
          strings.tryDisplay(getCell(row, table, "*ItemName")) ||
          getCell(row, table, "index")
        }
        empty="세트 아이템이 없습니다."
      />
    </Panel>
  );
}

export function RuneTable() {
  const table = useEditor((s) => s.tables.misc);
  const runes = useEditor((s) => s.tables.runes);
  const cube = useEditor((s) => s.tables.cubemain);
  const strings = useEditor((s) => s.strings);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const scaleRarity = useEditor((s) => s.scaleRarity);
  const resetTable = useEditor((s) => s.resetTable);
  const setRuneOpmSplitDouble = useEditor((s) => s.setRuneOpmSplitDouble);
  const difficulty = useEditor((s) => s.difficulty);
  const scaleRuneDropRate = useEditor((s) => s.scaleRuneDropRate);
  const resetRuneDropRate = useEditor((s) => s.resetRuneDropRate);
  const [runeWord, setRuneWord] = useState<number | null>(null);
  if (!table) return <NeedFile kind="룬" />;
  const rw = runeWord != null && runes ? runes.rows[runeWord] : undefined;
  const rwName = rw
    ? strings.tryDisplay(getCell(rw, runes!, "Name")) ||
      strings.tryDisplay(getCell(rw, runes!, "*Rune Name")) ||
      getCell(rw, runes!, "Name")
    : "";
  return (
    <Panel
      title="룬"
      blurb="아래 룬 아이템은 드랍·희귀도, 그 다음 룬워드는 완성 아이템 옵션입니다."
      search={search}
      setSearch={setSearch}
      placeholder="룬 · 룬워드 이름"
      onHalf={() => scaleRarity("rune", 0.5)}
      onReset={() => {
        resetTable("misc");
        resetTable("runes");
      }}
      badge={<Badge tone="rune">Rune</Badge>}
    >
      <div className="flex flex-col gap-2 rounded-xl border border-rune/30 bg-rune/5 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">룬 드랍률 · {DIFF_KO[difficulty]}</span>
          <span className="text-xs text-fg-muted">클릭할 때마다 현재 값에 누적됩니다</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const n = scaleRuneDropRate(difficulty, 0.5);
              toast.success(n ? `룬 드랍 2배 하락 — ${DIFF_KO[difficulty]} ${n}칸 누적` : "바꿀 룬 가중치가 없습니다");
            }}
          >
            2배 하락
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const n = scaleRuneDropRate(difficulty, 2);
              toast.success(n ? `룬 드랍 2배 — ${DIFF_KO[difficulty]} ${n}칸 누적` : "바꿀 룬 가중치가 없습니다");
            }}
          >
            2배
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const n = resetRuneDropRate();
              toast.success(n ? `룬 드랍률을 원본으로 되돌렸습니다 (${n}칸)` : "룬 드랍률이 이미 원본입니다");
            }}
          >
            드랍 초기화
          </Button>
        </div>
      </div>
      {cube ? (
        <label className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            checked={isRuneOpmSplitDouble(cube)}
            onChange={(e) => {
              const on = e.target.checked;
              setRuneOpmSplitDouble(on);
              toast.success(on ? "룬+폭발포션 조합이 하위 룬 2개를 줍니다" : "룬+폭발포션 조합을 원본(하위 1개)으로 되돌렸습니다");
            }}
          />
          <span>
            <span className="block text-sm font-medium">룬 + 폭발포션 → 하위 룬 2개</span>
            <span className="mt-0.5 block text-xs text-fg-muted leading-relaxed">
              큐브에 룬과 폭발 포션을 넣으면 한 단계 낮은 룬이 2개 나옵니다. 기본 엽굵은 1개입니다.
            </span>
          </span>
        </label>
      ) : (
        <p className="text-xs text-fg-muted">큐브 조합(cubemain.txt)이 없어 폭발포션 레시피를 바꿀 수 없습니다.</p>
      )}
      <DataGrid
        table={table}
        columns={MISC_EDITOR_COLS}
        search={search}
        filterRow={(row) => RUNE_TYPES.has(getCell(row, table, "type"))}
        onChange={(r, c, v) => patchCell("misc", r, c, v)}
        displayName={(row) =>
          strings.tryDisplay(getCell(row, table, "namestr")) ||
          strings.tryDisplay(getCell(row, table, "code")) ||
          getCell(row, table, "name")
        }
        empty="룬 아이템이 없습니다."
      />
      {runes ? (
        <div className="mt-2 flex min-h-0 flex-col gap-3">
          <h3 className="font-display text-lg tracking-tight">룬워드 옵션</h3>
          {rw && isDataRow(rw) ? (
            <ItemAffixEditor
              tableKey="runes"
              table={runes}
              row={rw}
              rowIndex={runeWord!}
              slots={runewordAffixSlots()}
              title={rwName}
              subtitle={getCell(rw, runes, "*RunesUsed") || getCell(rw, runes, "Rune1")}
              onClose={() => setRuneWord(null)}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-fg-muted">
              룬워드를 선택하면 완성 옵션을 수정할 수 있습니다.
            </p>
          )}
          <DataGrid
            table={runes}
            columns={["Name", "*Rune Name", "complete", "Rune1", "Rune2", "Rune3", "itype1"]}
            search={search}
            selectedIndex={runeWord}
            onSelectRow={setRuneWord}
            onChange={(r, c, v) => patchCell("runes", r, c, v)}
            displayName={(row) =>
              strings.tryDisplay(getCell(row, runes, "Name")) ||
              strings.tryDisplay(getCell(row, runes, "*Rune Name")) ||
              getCell(row, runes, "Name")
            }
            empty="룬워드가 없습니다."
          />
        </div>
      ) : null}
    </Panel>
  );
}

export function FigureTable() {
  const table = useEditor((s) => s.tables.misc);
  const strings = useEditor((s) => s.strings);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const scaleRarity = useEditor((s) => s.scaleRarity);
  const resetTable = useEditor((s) => s.resetTable);
  if (!table) return <NeedFile kind="피규어" />;
  return (
    <Panel
      title="피규어"
      blurb="엽굵 모드의 컬렉션 피규어입니다. dols / rdol / odol 유형과 만화책 컬렉션(dolk)이 포함됩니다. 필드 드랍은 보물 클래스 dolls* 의 미드랍도 함께 보세요."
      search={search}
      setSearch={setSearch}
      placeholder="피규어 · 컬렉션 검색"
      onHalf={() => scaleRarity("figure", 0.5)}
      onReset={() => resetTable("misc")}
      badge={<Badge tone="figure">Figure</Badge>}
    >
      <DataGrid
        table={table}
        columns={MISC_EDITOR_COLS}
        search={search}
        filterRow={(row) => FIGURE_TYPES.has(getCell(row, table, "type"))}
        onChange={(r, c, v) => patchCell("misc", r, c, v)}
        displayName={(row) => {
          const code = getCell(row, table, "code");
          const name = getCell(row, table, "name");
          return (
            strings.tryDisplay(code) ||
            strings.tryDisplay(getCell(row, table, "namestr")) ||
            figureKorean(name, code) ||
            name
          );
        }}
        empty="피규어 아이템이 없습니다. 엽굵 MPQ를 열면 컬렉션이 나타납니다."
      />
    </Panel>
  );
}

function Panel({
  title,
  blurb,
  search,
  setSearch,
  placeholder,
  onHalf,
  onReset,
  badge,
  children,
}: {
  title: string;
  blurb: string;
  search: string;
  setSearch: (v: string) => void;
  placeholder: string;
  onHalf: () => void;
  onReset: () => void;
  badge: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl tracking-tight">{title}</h2>
            {badge}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed">{blurb}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchField value={search} onChange={setSearch} placeholder={placeholder} />
          <Button variant="secondary" size="sm" onClick={onHalf}>희귀도 절반</Button>
          <Button variant="ghost" size="sm" onClick={onReset}>원본</Button>
        </div>
      </header>
      {children}
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

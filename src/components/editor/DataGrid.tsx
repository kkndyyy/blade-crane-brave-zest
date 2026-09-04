import { useMemo, useState } from "react";
import type { TsvTable } from "@/lib/d2/tsv";
import { colIndex, getCell, isDataRow } from "@/lib/d2/tsv";
import { labelCol, HINTS } from "@/lib/d2/labels";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE = 40;

const NUMERIC = new Set([
  "rarity",
  "spawnable",
  "disabled",
  "enabled",
  "numinputs",
  "lvl",
  "lvl req",
  "level",
  "levelreq",
  "reqlevel",
  "maxlvl",
  "Unique",
  "Set",
  "Rare",
  "Magic",
  "NoDrop",
  "Picks",
  "mana",
  "minmana",
  "lvlmana",
  "manashift",
  "Param1",
  "Param2",
  "Param3",
  "Param4",
  "MinDam",
  "MaxDam",
  "EMin",
  "EMax",
  "ToHit",
  "Sk1lvl",
  "Sk2lvl",
  "Sk3lvl",
  "Sk4lvl",
  "Sk5lvl",
  "Sk6lvl",
  "Sk7lvl",
  "Sk8lvl",
  "minHP",
  "maxHP",
  "MinHP(N)",
  "MaxHP(N)",
  "MinHP(H)",
  "MaxHP(H)",
  "A1MinD",
  "A1MaxD",
  "A1MinD(H)",
  "A1MaxD(H)",
  "boss",
  "Level",
  "Level(N)",
  "Level(H)",
  "Prob1",
  "Prob2",
  "Prob3",
  "InGame",
  "leftskill",
  "rightskill",
  "passive",
  "aura",
]);

type Props = {
  table: TsvTable;
  columns: string[];
  onChange: (rowIndex: number, column: string, value: string) => void;
  displayName?: (row: string[], rowIndex: number) => string;
  filterRow?: (row: string[], rowIndex: number) => boolean;
  search: string;
  empty: string;
  selectedIndex?: number | null;
  onSelectRow?: (index: number) => void;
};

export function DataGrid({ table, columns, onChange, displayName, filterRow, search, empty, selectedIndex, onSelectRow }: Props) {
  const [page, setPage] = useState(0);
  const visibleCols = columns.filter((c) => colIndex(table, c) >= 0);

  const indexed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: { row: string[]; index: number }[] = [];
    table.rows.forEach((row, index) => {
      if (!isDataRow(row)) return;
      if (filterRow && !filterRow(row, index)) return;
      if (q) {
        const name = displayName?.(row, index) ?? "";
        const blob = (name + " " + visibleCols.map((c) => getCell(row, table, c)).join(" ")).toLowerCase();
        if (!blob.includes(q)) return;
      }
      out.push({ row, index });
    });
    return out;
  }, [table, search, filterRow, displayName, visibleCols]);

  const pages = Math.max(1, Math.ceil(indexed.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = indexed.slice(safePage * PAGE, safePage * PAGE + PAGE);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="overflow-auto rounded-lg border border-border bg-bg-elevated">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-bg-subtle">
            <tr>
              {displayName ? (
                <th className="px-3 py-3 font-medium text-fg-muted whitespace-nowrap">한글 이름</th>
              ) : null}
              {visibleCols.map((c) => (
                <th key={c} className="px-3 py-3 font-medium text-fg-muted whitespace-nowrap" title={HINTS[c]}>
                  {labelCol(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map(({ row, index }) => (
              <tr
                key={index}
                onClick={() => onSelectRow?.(index)}
                className={cn(
                  "border-t border-border hover:bg-bg-subtle/60",
                  onSelectRow ? "cursor-pointer" : "",
                  selectedIndex === index ? "bg-primary/10" : "",
                )}
              >
                {displayName ? (
                  <td className="px-3 py-2 text-fg font-medium whitespace-nowrap">{displayName(row, index)}</td>
                ) : null}
                {visibleCols.map((c) => {
                  const value = getCell(row, table, c);
                  const editable = NUMERIC.has(c) || c === "Skill1" || c === "Skill2" || c === "Skill3" || c === "Skill4" || c === "Skill5" || c === "Skill6" || c === "Skill7" || c === "Skill8" || c === "Item1" || c === "Item2" || c === "Item3";
                  const isId = c === "index" || c === "skill" || c === "Id" || c === "Treasure Class" || c === "name" || c === "code";
                  return (
                    <td key={c} className="px-2 py-1.5 align-middle">
                      {editable && !isId ? (
                        <input
                          className={cn(
                            "h-9 w-24 rounded-xs border border-transparent bg-transparent px-2 text-sm tabular-nums text-fg",
                            "hover:border-border focus:border-primary/50 focus:bg-bg",
                          )}
                          value={value}
                          onChange={(e) => onChange(index, c, e.target.value)}
                        />
                      ) : (
                        <span className="block max-w-[14rem] truncate px-2 text-fg-muted">{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {slice.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-fg-muted" colSpan={visibleCols.length + (displayName ? 1 : 0)}>
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span className="tabular-nums">
          {indexed.length.toLocaleString()}개 중 {indexed.length === 0 ? 0 : safePage * PAGE + 1}–{Math.min(indexed.length, safePage * PAGE + PAGE)}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-9" disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="이전">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-16 text-center tabular-nums">
            {safePage + 1} / {pages}
          </span>
          <Button variant="ghost" size="icon" className="size-9" disabled={safePage >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="다음">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="max-w-sm"
    />
  );
}

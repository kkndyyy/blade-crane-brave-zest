import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/lib/store";
import { DIFF_KO, type Difficulty } from "@/lib/d2/labels";
import { colIndex, getCell, isDataRow, num } from "@/lib/d2/tsv";
import { matchesDifficulty, isRuneTc, isFigureTc } from "@/lib/d2/paths";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataGrid, SearchField } from "./DataGrid";

const PRESETS: {
  id: string;
  label: string;
  unique: number;
  set: number;
  nodrop: number;
  rarity: number;
  qualityScale?: number;
  stack?: boolean;
}[] = [
  { id: "stock", label: "원본 수준", unique: -1, set: -1, nodrop: 1, rarity: 1 },
  { id: "half", label: "드랍 2배 하향", unique: -1, set: -1, nodrop: 2, rarity: 2, qualityScale: 0.5, stack: true },
  { id: "x2", label: "드랍 2배", unique: -1, set: -1, nodrop: 0.5, rarity: 0.5, qualityScale: 2, stack: true },
  { id: "high", label: "고드랍", unique: 256, set: 256, nodrop: 0.25, rarity: 0.35 },
  { id: "max", label: "극드랍", unique: 512, set: 512, nodrop: 0.1, rarity: 0.2 },
];

export function DropRates() {
  const difficulty = useEditor((s) => s.difficulty);
  const setDifficulty = useEditor((s) => s.setDifficulty);
  const treasure = useEditor((s) => s.tables.treasure);
  const itemRatio = useEditor((s) => s.tables.itemRatio);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const patchCell = useEditor((s) => s.patchCell);
  const applyQualityBoost = useEditor((s) => s.applyQualityBoost);
  const scaleQuality = useEditor((s) => s.scaleQuality);
  const scaleNoDrop = useEditor((s) => s.scaleNoDrop);
  const scaleRarity = useEditor((s) => s.scaleRarity);
  const resetTable = useEditor((s) => s.resetTable);
  const applyVanillaD2rDrops = useEditor((s) => s.applyVanillaD2rDrops);

  const stats = useMemo(() => {
    if (!treasure) return null;
    const nameI = colIndex(treasure, "Treasure Class");
    let uniqueSum = 0, setSum = 0, n = 0, runeDrop = 0, runeN = 0, figDrop = 0, figN = 0;
    for (const row of treasure.rows) {
      if (!isDataRow(row)) continue;
      const name = row[nameI] ?? "";
      if (!matchesDifficulty(name, difficulty)) continue;
      n += 1;
      uniqueSum += num(getCell(row, treasure, "Unique"));
      setSum += num(getCell(row, treasure, "Set"));
      if (isRuneTc(name)) {
        runeN += 1;
        runeDrop += num(getCell(row, treasure, "NoDrop"));
      }
      if (isFigureTc(name)) {
        figN += 1;
        figDrop += num(getCell(row, treasure, "NoDrop"));
      }
    }
    return {
      n,
      uniqueAvg: n ? Math.round(uniqueSum / n) : 0,
      setAvg: n ? Math.round(setSum / n) : 0,
      runeNoDrop: runeN ? Math.round(runeDrop / runeN) : 0,
      figNoDrop: figN ? Math.round(figDrop / figN) : 0,
      runeN,
      figN,
    };
  }, [treasure, difficulty]);

  const [uniqueBoost, setUniqueBoost] = useState(128);
  const [setBoost, setSetBoost] = useState(128);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const fromCurrent = !!p.stack;
    if (p.qualityScale != null) scaleQuality(difficulty, p.qualityScale, p.qualityScale, fromCurrent);
    else if (p.unique >= 0) applyQualityBoost(difficulty, p.unique, p.set);
    scaleNoDrop("rune", difficulty, p.nodrop, fromCurrent);
    scaleNoDrop("figure", difficulty, p.nodrop, fromCurrent);
    scaleRarity("unique", p.rarity, fromCurrent);
    scaleRarity("set", p.rarity, fromCurrent);
    scaleRarity("rune", p.rarity, fromCurrent);
    scaleRarity("figure", p.rarity, fromCurrent);
    if (p.stack) toast.success(`${p.label} — 현재 값에 누적 적용`);
  };

  const resetDrops = () => {
    resetTable("treasure");
    resetTable("uniqueItems");
    resetTable("setItems");
    resetTable("misc");
    resetTable("itemRatio");
    toast.success("드랍 설정을 기본값으로 되돌렸습니다");
  };

  if (!treasure) {
    return <EmptyState />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">난이도별 드랍률</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed">
            보물 클래스의 유니크/세트 보정(0–1024)과 노드랍 가중치를 난이도별로 바꿉니다. 희귀도는 개별 아이템 탭에서 더 정밀하게 조절할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DIFF_KO) as Difficulty[]).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={difficulty === d ? "primary" : "secondary"}
              onClick={() => setDifficulty(d)}
            >
              {DIFF_KO[d]}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="유니크 보정 평균" value={stats?.uniqueAvg ?? "—"} hint="1024 = 확정" tone="unique" />
        <StatCard label="세트 보정 평균" value={stats?.setAvg ?? "—"} hint="1024 = 확정" tone="set" />
        <StatCard label="룬 TC 노드랍" value={stats?.runeNoDrop ?? "—"} hint={`${stats?.runeN ?? 0}개 클래스`} tone="rune" />
        <StatCard label="피규어 TC 노드랍" value={stats?.figNoDrop ?? "—"} hint={`${stats?.figN ?? 0}개 클래스`} tone="figure" />
      </div>

      <section className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-5">
        <h3 className="font-medium">빠른 프리셋 · {DIFF_KO[difficulty]}</h3>
        <p className="mt-1 text-xs text-fg-muted">드랍 2배 / 2배 하향은 클릭할 때마다 현재 값에 누적됩니다. 유니크 보정은 1~1024 사이로 막습니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              variant="secondary"
              size="sm"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              applyVanillaD2rDrops();
              toast.success("원본 디아블로2 레저렉션 드랍률을 적용했습니다");
            }}
          >
            바닐라 D2R
          </Button>
          <Button variant="ghost" size="sm" onClick={resetDrops}>
            기본값으로 초기화
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <BoostControl
            label="유니크 품질 보정"
            hint="선택한 난이도의 모든 보물 클래스 Unique 칸"
            value={uniqueBoost}
            onChange={setUniqueBoost}
            max={1024}
          />
          <BoostControl
            label="세트 품질 보정"
            hint="선택한 난이도의 모든 보물 클래스 Set 칸"
            value={setBoost}
            onChange={setSetBoost}
            max={1024}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => applyQualityBoost(difficulty, uniqueBoost, setBoost)}>보정값 적용</Button>
          <Button variant="secondary" onClick={() => { scaleNoDrop("rune", difficulty, 0.5); scaleNoDrop("figure", difficulty, 0.5); }}>
            룬·피규어 노드랍 절반
          </Button>
        </div>
      </section>

      {itemRatio ? (
        <section className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-5">
          <h3 className="font-medium">전역 품질 확률 (ItemRatio)</h3>
          <p className="mt-1 text-sm text-fg-muted">난이도와 무관한 베이스 확률입니다. 숫자가 클수록 유니크/세트가 희귀해집니다.</p>
          <div className="mt-3 overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-fg-muted">
                  {["Function", "Unique", "UniqueDivisor", "Set", "SetDivisor", "Uber", "Class Specific"].map((c) => (
                    <th key={c} className="px-2 py-2 text-left font-medium">{c === "Function" ? "구분" : c === "Unique" ? "유니크" : c === "Set" ? "세트" : c === "UniqueDivisor" ? "유니크 나누기" : c === "SetDivisor" ? "세트 나누기" : c === "Uber" ? "우버" : "직업전용"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemRatio.rows.filter(isDataRow).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {["Function", "Unique", "UniqueDivisor", "Set", "SetDivisor", "Uber", "Class Specific"].map((c) => (
                      <td key={c} className="px-2 py-1.5">
                        {c === "Function" ? (
                          <span className="text-fg-muted">{getCell(row, itemRatio, c)}</span>
                        ) : (
                          <input
                            className="h-9 w-20 rounded-xs border border-transparent bg-transparent px-2 tabular-nums hover:border-border focus:border-primary/50 focus:bg-bg"
                            value={getCell(row, itemRatio, c)}
                            onChange={(e) => patchCell("itemRatio", itemRatio.rows.indexOf(row), c, e.target.value)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-medium">보물 클래스 · {DIFF_KO[difficulty]}</h3>
          <SearchField value={search} onChange={setSearch} placeholder="클래스 이름 검색" />
        </div>
        <DataGrid
          table={treasure}
          columns={["Treasure Class", "Picks", "Unique", "Set", "Rare", "Magic", "NoDrop", "Item1", "Prob1"]}
          onChange={(row, col, val) => patchCell("treasure", row, col, val)}
          search={search}
          filterRow={(row) => matchesDifficulty(getCell(row, treasure, "Treasure Class"), difficulty)}
          empty="이 난이도에 해당하는 보물 클래스가 없습니다."
        />
      </section>
    </div>
  );
}

function StatCard({ label, value, hint, tone }: { label: string; value: number | string; hint: string; tone: "unique" | "set" | "rune" | "figure" }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">{label}</p>
        <Badge tone={tone}>{tone === "unique" ? "유니크" : tone === "set" ? "세트" : tone === "rune" ? "룬" : "피규어"}</Badge>
      </div>
      <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
    </div>
  );
}

function BoostControl({ label, hint, value, onChange, max }: { label: string; hint: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-0.5 block text-xs text-fg-muted">{hint}</span>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 appearance-none rounded-full bg-bg-subtle accent-primary"
        />
        <span className="w-14 text-right text-sm tabular-nums">{value}</span>
      </div>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
      <p className="font-display text-xl">열린 모드가 없습니다</p>
      <p className="mt-2 text-sm text-fg-muted">MPQ를 열거나 엽굵 샘플을 불러오면 드랍 테이블이 표시됩니다.</p>
    </div>
  );
}

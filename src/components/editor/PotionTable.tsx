import { useMemo } from "react";
import { toast } from "sonner";
import { useEditor } from "@/lib/store";
import { getCell, isDataRow, num } from "@/lib/d2/tsv";
import { Button } from "@/components/ui/button";
import { isAllNpcsSellAllPotions } from "@/lib/d2/vendors";
import { cn } from "@/lib/utils";

type Kind = "hp" | "mp" | "rj";

function potionKind(code: string, type: string, stat1: string): Kind | null {
  const c = code.toLowerCase();
  if (type === "rpot" || c === "rvs" || c === "rvl") return "rj";
  if (type === "hpot" || stat1 === "hpregen" || /^hp[1-5]$/.test(c)) return "hp";
  if (type === "mpot" || stat1 === "manarecovery" || /^mp[1-5]$/.test(c)) return "mp";
  return null;
}

const GROUPS: { id: Kind; title: string; hint: string }[] = [
  { id: "hp", title: "체력 포션", hint: "회복량은 툴팁과 실제 hpregen(calc1)에 같이 들어갑니다. 지속은 프레임(25 = 1초)입니다." },
  { id: "mp", title: "마나 포션", hint: "회복량은 manarecovery(calc1)와 툴팁 수치를 함께 바꿉니다." },
  { id: "rj", title: "리쥬브 포션", hint: "체력·마나를 퍼센트로 즉시 회복합니다." },
];

export function PotionTable() {
  const table = useEditor((s) => s.tables.misc);
  const strings = useEditor((s) => s.strings);
  const patchCell = useEditor((s) => s.patchCell);
  const resetTable = useEditor((s) => s.resetTable);
  const setAllNpcsSellAllPotions = useEditor((s) => s.setAllNpcsSellAllPotions);
  const items = useMemo(() => {
    if (!table) return [];
    const out: { index: number; kind: Kind; code: string; name: string }[] = [];
    table.rows.forEach((row, index) => {
      if (!isDataRow(row)) return;
      if (getCell(row, table, "useable") !== "1") return;
      const code = getCell(row, table, "code");
      const kind = potionKind(code, getCell(row, table, "type"), getCell(row, table, "stat1"));
      if (!kind) return;
      if (!getCell(row, table, "calc1").trim() && kind !== "rj") return;
      const key = getCell(row, table, "namestr") || code;
      out.push({
        index,
        kind,
        code,
        name: strings.display(key, strings.display(code, getCell(row, table, "name") || code)),
      });
    });
    return out;
  }, [table, strings]);

  if (!table) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
        <p className="font-display text-xl">포션 테이블이 없습니다</p>
        <p className="mt-2 text-sm text-fg-muted">MPQ를 열거나 엽굵 샘플을 불러오세요.</p>
      </div>
    );
  }

  const setHeal = (index: number, col: "calc1" | "calc2", value: string) => {
    patchCell("misc", index, col, value);
    if (col === "calc1") patchCell("misc", index, "spelldesccalc", value);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">포션 회복</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed">
            체력·마나 포션이 채워 주는 수치와 지속 시간을 바꿉니다. 저장하면 misc.txt 에 반영됩니다.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { resetTable("misc"); toast.success("포션 값을 원본으로 되돌렸습니다"); }}>
          원본
        </Button>
      </header>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={isAllNpcsSellAllPotions(table)}
          onChange={(e) => {
            const on = e.target.checked;
            setAllNpcsSellAllPotions(on);
            toast.success(on ? "모든 NPC가 체력·마나 포션 전 등급을 팝니다" : "포션 상점을 원본 진열로 되돌렸습니다");
          }}
        />
        <span>
          <span className="block text-sm font-medium">모든 NPC가 전 등급 체력·마나 포션을 판매</span>
          <span className="mt-0.5 block text-xs text-fg-muted leading-relaxed">
            1~5막 상인 전원에게 체력1–5, 마나1–5를 넣고, 난이도별 업그레이드(나이트메어→4, 헬→5)를 끕니다. 노멀에서도 슈퍼 포션을 살 수 있습니다.
          </span>
        </span>
      </label>

      {GROUPS.map((g) => {
        const rows = items.filter((i) => i.kind === g.id);
        if (!rows.length) return null;
        const rejuv = g.id === "rj";
        return (
          <section key={g.id}>
            <h3 className="font-display text-xl tracking-tight">{g.title}</h3>
            <p className="mt-1 text-xs text-fg-muted leading-relaxed">{g.hint}</p>
            <div className="mt-3 overflow-auto rounded-lg border border-border bg-bg-elevated">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-bg-subtle">
                  <tr>
                    <th className="px-3 py-3 font-medium text-fg-muted">한글 이름</th>
                    <th className="px-3 py-3 font-medium text-fg-muted">코드</th>
                    <th className="px-3 py-3 font-medium text-fg-muted whitespace-nowrap">
                      {rejuv ? "체력 %" : "회복량"}
                    </th>
                    {rejuv ? (
                      <th className="px-3 py-3 font-medium text-fg-muted whitespace-nowrap">마나 %</th>
                    ) : (
                      <>
                        <th className="px-3 py-3 font-medium text-fg-muted whitespace-nowrap">지속(프레임)</th>
                        <th className="px-3 py-3 font-medium text-fg-muted whitespace-nowrap">약 초</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const row = table.rows[item.index]!;
                    const len = num(getCell(row, table, "len"));
                    return (
                      <tr key={item.index} className="border-t border-border hover:bg-bg-subtle/60">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{item.name}</td>
                        <td className="px-3 py-2 text-fg-muted">{item.code}</td>
                        <td className="px-2 py-1.5">
                          <NumInput value={getCell(row, table, "calc1")} onChange={(v) => setHeal(item.index, "calc1", v)} />
                        </td>
                        {rejuv ? (
                          <td className="px-2 py-1.5">
                            <NumInput value={getCell(row, table, "calc2")} onChange={(v) => patchCell("misc", item.index, "calc2", v)} />
                          </td>
                        ) : (
                          <>
                            <td className="px-2 py-1.5">
                              <NumInput value={getCell(row, table, "len")} onChange={(v) => patchCell("misc", item.index, "len", v)} />
                            </td>
                            <td className="px-3 py-2 tabular-nums text-fg-muted">{len ? (len / 25).toFixed(1) : "—"}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function NumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className={cn(
        "h-9 w-24 rounded-xs border border-transparent bg-transparent px-2 text-sm tabular-nums text-fg",
        "hover:border-border focus:border-primary/50 focus:bg-bg",
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

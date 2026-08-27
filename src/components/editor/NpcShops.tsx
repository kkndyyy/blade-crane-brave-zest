import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/lib/store";
import { getCell } from "@/lib/d2/tsv";
import {
  NPCS,
  VENDOR_TABLES,
  itemCode,
  itemNameKey,
  listCatalog,
  npcSells,
  vendorCols,
  type VendorTableKey,
} from "@/lib/d2/vendors";
import { Button } from "@/components/ui/button";
import { SearchField } from "./DataGrid";
import { cn } from "@/lib/utils";

const STOCK_FIELDS = [
  { key: "min" as const, label: "최소" },
  { key: "max" as const, label: "최대" },
  { key: "magicMin" as const, label: "매직 최소" },
  { key: "magicMax" as const, label: "매직 최대" },
  { key: "magicLvl" as const, label: "매직 레벨" },
];

export function NpcShops() {
  const tables = useEditor((s) => s.tables);
  const strings = useEditor((s) => s.strings);
  const patchCell = useEditor((s) => s.patchCell);
  const setVendorStock = useEditor((s) => s.setVendorStock);
  const search = useEditor((s) => s.search);
  const setSearch = useEditor((s) => s.setSearch);
  const [npcId, setNpcId] = useState("Akara");
  const [adding, setAdding] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const npc = NPCS.find((n) => n.id === npcId) ?? NPCS[0]!;
  const cols = vendorCols(npc.id);

  const displayItem = (tableKey: VendorTableKey, row: string[]) => {
    const table = tables[tableKey];
    if (!table) return itemCode(row, { headers: ["code"], rows: [row] });
    const key = itemNameKey(row, table);
    const code = itemCode(row, table);
    return strings.display(key, strings.display(code, getCell(row, table, "name") || code));
  };

  const stock = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: { tableKey: VendorTableKey; index: number; row: string[]; kind: string; name: string; code: string }[] = [];
    for (const { key, label } of VENDOR_TABLES) {
      const table = tables[key];
      if (!table) continue;
      for (const { row, index } of listCatalog(table)) {
        if (!npcSells(row, table, npc.id)) continue;
        const name = displayItem(key, row);
        const code = itemCode(row, table);
        if (q && !(name + " " + code + " " + getCell(row, table, "name")).toLowerCase().includes(q)) continue;
        out.push({ tableKey: key, index, row, kind: label, name, code });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.misc, tables.armor, tables.weapons, npc.id, search, strings]);

  const catalog = useMemo(() => {
    if (!adding) return [];
    const q = addQuery.trim().toLowerCase();
    const out: { tableKey: VendorTableKey; index: number; kind: string; name: string; code: string }[] = [];
    for (const { key, label } of VENDOR_TABLES) {
      const table = tables[key];
      if (!table) continue;
      for (const { row, index } of listCatalog(table)) {
        if (npcSells(row, table, npc.id)) continue;
        const name = displayItem(key, row);
        const code = itemCode(row, table);
        if (q && !(name + " " + code + " " + getCell(row, table, "name")).toLowerCase().includes(q)) continue;
        out.push({ tableKey: key, index, kind: label, name, code });
        if (out.length >= 80) return out;
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adding, addQuery, tables.misc, tables.armor, tables.weapons, npc.id, strings]);

  const hasTables = Boolean(tables.misc || tables.armor || tables.weapons);
  if (!hasTables) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
        <p className="font-display text-xl">상점 테이블이 없습니다</p>
        <p className="mt-2 text-sm text-fg-muted">MPQ를 열거나 엽굵 샘플을 불러오세요.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight">NPC 상점</h2>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted leading-relaxed">
              상인이 진열하는 아이템의 수량·매직 레벨을 바꿉니다. 목록에 없는 아이템을 넣거나, 진열을 지울 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField value={search} onChange={setSearch} placeholder="판매 아이템 검색" />
            <Button size="sm" variant={adding ? "primary" : "secondary"} onClick={() => setAdding((v) => !v)}>
              {adding ? "추가 닫기" : "물품 추가"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((act) => (
            <div key={act} className="flex flex-wrap items-center gap-2">
              <span className="w-10 shrink-0 text-xs text-fg-subtle">{act}막</span>
              {NPCS.filter((n) => n.act === act).map((n) => (
                <Button
                  key={n.id}
                  size="sm"
                  variant={npcId === n.id ? "primary" : "secondary"}
                  onClick={() => {
                    setNpcId(n.id);
                    setAdding(false);
                  }}
                >
                  {n.label}
                </Button>
              ))}
            </div>
          ))}
        </div>
        <p className="text-sm text-fg-muted">
          {npc.label} · {npc.role} · {stock.length}종
        </p>
      </header>

      {adding ? (
        <section className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="text-sm font-medium">{npc.label}에게 넣을 아이템</p>
          <p className="mt-1 text-xs text-fg-muted">이미 파는 물건은 목록에서 빠집니다. 기본 수량 1–1로 들어갑니다.</p>
          <div className="mt-3">
            <SearchField value={addQuery} onChange={setAddQuery} placeholder="이름 · 코드 검색" />
          </div>
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
            {catalog.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-fg-muted">검색 결과가 없습니다.</p>
            ) : (
              <ul>
                {catalog.map((item) => (
                  <li key={`${item.tableKey}-${item.index}`} className="border-t border-border first:border-t-0">
                    <button
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-bg-subtle"
                      onClick={() => {
                        setVendorStock(item.tableKey, item.index, npc.id, true);
                        toast.success(`${item.name} 을(를) ${npc.label} 상점에 넣었습니다`);
                      }}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-xs text-fg-muted">{item.code}</span>
                      </span>
                      <span className="shrink-0 text-xs text-fg-subtle">{item.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      <div className="overflow-auto rounded-lg border border-border bg-bg-elevated">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-bg-subtle">
            <tr>
              <th className="px-3 py-3 font-medium text-fg-muted">한글 이름</th>
              <th className="px-3 py-3 font-medium text-fg-muted">코드</th>
              <th className="px-3 py-3 font-medium text-fg-muted">종류</th>
              {STOCK_FIELDS.map((f) => (
                <th key={f.key} className="px-3 py-3 font-medium text-fg-muted whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-3 font-medium text-fg-muted"> </th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item) => {
              const table = tables[item.tableKey]!;
              return (
                <tr key={`${item.tableKey}-${item.index}`} className="border-t border-border hover:bg-bg-subtle/60">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{item.name}</td>
                  <td className="px-3 py-2 text-fg-muted">{item.code}</td>
                  <td className="px-3 py-2 text-fg-muted">{item.kind}</td>
                  {STOCK_FIELDS.map((f) => (
                    <td key={f.key} className="px-2 py-1.5">
                      <input
                        className={cn(
                          "h-9 w-20 rounded-xs border border-transparent bg-transparent px-2 text-sm tabular-nums text-fg",
                          "hover:border-border focus:border-primary/50 focus:bg-bg",
                        )}
                        value={getCell(item.row, table, cols[f.key])}
                        onChange={(e) => patchCell(item.tableKey, item.index, cols[f.key], e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setVendorStock(item.tableKey, item.index, npc.id, false);
                        toast.success(`${item.name} 진열을 뺐습니다`);
                      }}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              );
            })}
            {stock.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-fg-muted" colSpan={9}>
                  {npc.label}가 파는 아이템이 없습니다. 물품 추가로 넣을 수 있습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

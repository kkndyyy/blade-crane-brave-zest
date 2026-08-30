import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, FolderOpen } from "lucide-react";
import { useEditor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseTsv, type TsvTable } from "@/lib/d2/tsv";
import { StringTable, parseStringJson } from "@/lib/d2/strings";
import { EXCEL, SAMPLE_FILES, STRINGS } from "@/lib/d2/paths";
import {
  buildCatalog,
  classLabel,
  duplicateItem,
  itemDisplayName,
  locationLabel,
  MODE,
  PAGE,
  qualityLabel,
  qualityTone,
  parseSave,
  rebuildSave,
  statTableFromTsv,
  type D2sItem,
  type ItemCatalog,
  type ParsedSave,
  type StatTable,
} from "@/lib/d2s";

type LocFilter = "all" | "inv" | "eq" | "belt" | "stash" | "cube" | "merc";

const LOC_TABS: { id: LocFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "inv", label: "인벤" },
  { id: "eq", label: "착용" },
  { id: "belt", label: "벨트" },
  { id: "stash", label: "창고" },
  { id: "cube", label: "큐브" },
  { id: "merc", label: "용병" },
];

type DataPack = { catalog: ItemCatalog; stats: StatTable; strings: StringTable };

function tablesToPack(
  tables: {
    armor?: TsvTable;
    weapons?: TsvTable;
    misc?: TsvTable;
    itemTypes?: TsvTable;
    uniqueItems?: TsvTable;
    setItems?: TsvTable;
    itemstatcost?: TsvTable;
  },
  strings: StringTable,
): DataPack | null {
  if (!tables.misc || !tables.itemstatcost) return null;
  return {
    catalog: buildCatalog({
      armor: tables.armor,
      weapons: tables.weapons,
      misc: tables.misc,
      itemTypes: tables.itemTypes,
      uniqueItems: tables.uniqueItems,
      setItems: tables.setItems,
    }),
    stats: statTableFromTsv(tables.itemstatcost),
    strings,
  };
}

async function fetchSamplePack(): Promise<DataPack> {
  const wanted = new Set<string>([
    EXCEL.misc,
    EXCEL.armor,
    EXCEL.weapons,
    EXCEL.itemTypes,
    EXCEL.itemstatcost,
    EXCEL.uniqueItems,
    EXCEL.setItems,
    STRINGS.itemNames,
    STRINGS.itemRunes,
  ]);
  const texts: Record<string, string> = {};
  await Promise.all(
    SAMPLE_FILES.filter((f) => wanted.has(f.path)).map(async ({ path, url }) => {
      const res = await fetch(url);
      if (res.ok) texts[path] = await res.text();
    }),
  );
  const strings = new StringTable();
  for (const p of [STRINGS.itemNames, STRINGS.itemRunes]) {
    const raw = texts[p];
    if (!raw) continue;
    try {
      strings.add(parseStringJson(raw));
    } catch {
      /* ignore */
    }
  }
  const pack = tablesToPack(
    {
      armor: texts[EXCEL.armor] ? parseTsv(texts[EXCEL.armor]!) : undefined,
      weapons: texts[EXCEL.weapons] ? parseTsv(texts[EXCEL.weapons]!) : undefined,
      misc: texts[EXCEL.misc] ? parseTsv(texts[EXCEL.misc]!) : undefined,
      itemTypes: texts[EXCEL.itemTypes] ? parseTsv(texts[EXCEL.itemTypes]!) : undefined,
      uniqueItems: texts[EXCEL.uniqueItems] ? parseTsv(texts[EXCEL.uniqueItems]!) : undefined,
      setItems: texts[EXCEL.setItems] ? parseTsv(texts[EXCEL.setItems]!) : undefined,
      itemstatcost: texts[EXCEL.itemstatcost] ? parseTsv(texts[EXCEL.itemstatcost]!) : undefined,
    },
    strings,
  );
  if (!pack) throw new Error("샘플 아이템 테이블을 불러오지 못했습니다");
  return pack;
}

function matchesLoc(item: D2sItem, loc: LocFilter, bag: "player" | "merc"): boolean {
  if (loc === "all") return true;
  if (loc === "merc") return bag === "merc";
  if (bag === "merc") return false;
  if (loc === "eq") return item.mode === MODE.EQUIPPED;
  if (loc === "belt") return item.mode === MODE.BELT;
  if (loc === "cube") return item.mode === MODE.STORED && item.page === PAGE.CUBE;
  if (loc === "stash") return item.mode === MODE.STORED && (item.page === PAGE.STASH || item.page === PAGE.STASH2);
  return item.mode === MODE.STORED && item.page === PAGE.INVENTORY;
}

type Row = { item: D2sItem; index: number; bag: "player" | "merc" };

export function SaveEditor() {
  const tables = useEditor((s) => s.tables);
  const strings = useEditor((s) => s.strings);
  const pending = useEditor((s) => s.pendingSaveFile);
  const setPendingSaveFile = useEditor((s) => s.setPendingSaveFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [samplePack, setSamplePack] = useState<DataPack | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedSave | null>(null);
  const [items, setItems] = useState<D2sItem[]>([]);
  const [gold, setGold] = useState("");
  const [stashGold, setStashGold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loc, setLoc] = useState<LocFilter>("all");
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);

  const storePack = useMemo(() => tablesToPack(tables, strings), [tables, strings]);
  const pack = storePack ?? samplePack;

  useEffect(() => {
    if (storePack) return;
    let cancel = false;
    fetchSamplePack()
      .then((p) => {
        if (!cancel) setSamplePack(p);
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : "카탈로그를 불러오지 못했습니다");
      });
    return () => {
      cancel = true;
    };
  }, [storePack]);

  const openBytes = useCallback(
    (bytes: Uint8Array, name: string) => {
      if (!pack) {
        setError("아이템 테이블이 아직 없습니다. 잠시 뒤 다시 열거나 MPQ를 먼저 여세요.");
        return;
      }
      try {
        const next = parseSave(bytes, pack.stats, pack.catalog);
        setParsed(next);
        setItems(next.items);
        setGold(next.gold == null ? "" : String(next.gold));
        setStashGold(next.stashGold == null ? "" : String(next.stashGold));
        setFileName(name);
        setError(next.statsError);
        setDirty(false);
        toast.success(`${name} · 아이템 ${next.items.length}개`);
      } catch (e) {
        setParsed(null);
        setItems([]);
        setError(e instanceof Error ? e.message : "세이브를 열 수 없습니다");
        toast.error(e instanceof Error ? e.message : "세이브를 열 수 없습니다");
      }
    },
    [pack],
  );

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const buf = new Uint8Array(await file.arrayBuffer());
      openBytes(buf, file.name);
    },
    [openBytes],
  );

  useEffect(() => {
    if (!pending || !pack) return;
    const file = pending;
    setPendingSaveFile(null);
    void onFile(file);
  }, [pending, pack, onFile, setPendingSaveFile]);

  const rows: Row[] = useMemo(() => {
    const list: Row[] = items.map((item, index) => ({ item, index, bag: "player" as const }));
    if (parsed) {
      parsed.mercItems.forEach((item, index) => list.push({ item, index, bag: "merc" }));
    }
    const q = search.trim().toLowerCase();
    return list.filter(({ item, bag }) => {
      if (!matchesLoc(item, loc, bag)) return false;
      if (!q) return true;
      const name = pack ? itemDisplayName(pack.catalog, pack.strings, item.code, item.quality, item.qualityBits.file) : item.code;
      return name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || locationLabel(item).includes(q);
    });
  }, [items, parsed, loc, search, pack]);

  const setQty = (index: number, value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: Math.min(511, Math.max(1, Math.floor(n))) } : it)));
    setDirty(true);
  };

  const onClone = (row: Row) => {
    if (!parsed) return;
    try {
      const snapshot = { ...parsed, items };
      const copy = duplicateItem(snapshot, row.index, row.bag);
      setItems((prev) => [...prev, copy]);
      setDirty(true);
      const where = locationLabel(copy);
      toast.success(`복사함 · ${where} (${copy.x}, ${copy.y})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "복사에 실패했습니다");
    }
  };

  const onDownload = () => {
    if (!parsed || !pack) return;
    try {
      const goldN = gold.trim() === "" ? undefined : Number(gold.replace(/,/g, ""));
      const stashN = stashGold.trim() === "" ? undefined : Number(stashGold.replace(/,/g, ""));
      if (goldN != null && !Number.isFinite(goldN)) throw new Error("소지 골드가 숫자가 아닙니다");
      if (stashN != null && !Number.isFinite(stashN)) throw new Error("창고 골드가 숫자가 아닙니다");
      const bytes = rebuildSave(parsed, pack.stats, pack.catalog, {
        gold: goldN,
        stashGold: stashN,
        items,
      });
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "character.d2s";
      a.click();
      URL.revokeObjectURL(url);
      setDirty(false);
      toast.success(`${fileName} 저장 · 체크섬 갱신됨`, {
        duration: 12000,
        description:
          "원본은 그대로 둡니다. 받은 파일로 Saved Games\\Diablo II Resurrected 의 .d2s 를 교체하세요. 먼저 원본을 복사해 두세요. 오프라인 싱글만 쓰세요.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">세이브</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">
            오프라인 .d2s 의 골드와 아이템 수량·복사를 다룹니다. 배틀넷/래더에는 쓰지 마세요. 체크섬은 저장할 때 다시 계산합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".d2s,application/octet-stream"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <FolderOpen className="size-4" />
            .d2s 열기
          </Button>
          <Button size="sm" onClick={onDownload} disabled={!parsed}>
            <Download className="size-4" />
            세이브 저장
          </Button>
        </div>
      </header>

      <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3 text-xs leading-relaxed text-fg-muted">
        <p className="font-medium text-fg">오프라인 전용</p>
        <p className="mt-1">
          싱글플레이 캐릭터만 고치세요. 복사한 아이템은 새 지문(시드)을 받습니다. 원본 파일은 브라우저가 건드리지 않으니, 받은 .d2s
          로 직접 교체하면 됩니다.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      {!parsed ? (
        <div
          className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 py-16 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = [...e.dataTransfer.files].find((f) => f.name.toLowerCase().endsWith(".d2s"));
            if (file) void onFile(file);
            else toast.error(".d2s 파일을 놓아 주세요");
          }}
        >
          <p className="font-display text-xl">세이브 파일이 없습니다</p>
          <p className="mt-2 max-w-md text-sm text-fg-muted">
            Saved Games\Diablo II Resurrected 에 있는 캐릭터 .d2s 를 열거나 여기로 끌어다 놓으세요. 엽굵 아이템 이름이 필요하면
            MPQ를 먼저 여는 편이 정확합니다.
          </p>
          <Button className="mt-6" onClick={() => inputRef.current?.click()}>
            <FolderOpen className="size-4" />
            .d2s 열기
          </Button>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="캐릭터" value={parsed.name || fileName} hint={`${classLabel(parsed.classId)} · 레벨 ${parsed.level ?? parsed.headerLevel}`} />
            <GoldField
              label="소지 골드"
              value={gold}
              onChange={(v) => {
                setGold(v);
                setDirty(true);
              }}
              disabled={parsed.goldValueBit == null}
            />
            <GoldField
              label="창고 골드"
              value={stashGold}
              onChange={(v) => {
                setStashGold(v);
                setDirty(true);
              }}
              disabled={parsed.stashValueBit == null}
            />
            <InfoCard
              label="아이템"
              value={`${items.length}개`}
              hint={dirty ? "수정됨 · 저장하면 체크섬 갱신" : parsed.mercItems.length ? `용병 ${parsed.mercItems.length}개` : "변경 없음"}
            />
          </section>

          <div className="flex flex-wrap items-center gap-2">
            {LOC_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLoc(tab.id)}
                className={cn(
                  "h-9 rounded-md px-3 text-sm",
                  loc === tab.id ? "bg-primary text-primary-fg" : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
                )}
              >
                {tab.label}
              </button>
            ))}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름·코드 검색"
              className="ml-auto h-9 max-w-xs"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-bg-subtle text-xs text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">위치</th>
                  <th className="px-3 py-2 font-medium">아이템</th>
                  <th className="px-3 py-2 font-medium">품질</th>
                  <th className="px-3 py-2 font-medium">칸</th>
                  <th className="px-3 py-2 font-medium">수량</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-fg-muted">
                      이 위치에 아이템이 없습니다
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const { item } = row;
                    const name = pack
                      ? itemDisplayName(pack.catalog, pack.strings, item.code, item.quality, item.qualityBits.file)
                      : item.code;
                    const locText = row.bag === "merc" ? `용병 · ${locationLabel(item)}` : locationLabel(item);
                    const canQty = row.bag === "player" && item.quantity != null;
                    return (
                      <tr key={`${row.bag}-${row.index}-${item.seed ?? item.code}`} className="border-t border-border">
                        <td className="px-3 py-2 text-fg-muted">{locText}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-fg-subtle">{item.code}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={qualityTone(item.quality)}>{qualityLabel(item.quality)}</Badge>
                        </td>
                        <td className="px-3 py-2 text-fg-muted">
                          {item.mode === MODE.STORED ? `${item.x}, ${item.y}` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {canQty ? (
                            <Input
                              type="number"
                              min={1}
                              max={511}
                              value={item.quantity}
                              onChange={(e) => setQty(row.index, e.target.value)}
                              className="h-9 w-24"
                            />
                          ) : (
                            <span className="text-fg-subtle">{item.compact ? "—" : item.quantity ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => onClone(row)}>
                            <Copy className="size-4" />
                            복사
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-4 py-3">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
    </div>
  );
}

function GoldField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="rounded-xl border border-border bg-bg-elevated px-4 py-3">
      <p className="text-xs text-fg-muted">{label}</p>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 h-9"
      />
      {disabled ? <p className="mt-1 text-xs text-fg-subtle">이 세이브에서 골드를 읽지 못했습니다</p> : null}
    </label>
  );
}

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Anvil,
  BookOpen,
  Download,
  Droplets,
  FolderOpen,
  Gem,
  Ghost,
  Layers,
  Shield,
  Sparkles,
  Store,
  Swords,
  Table2,
} from "lucide-react";
import { useEditor, type NavId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropRates } from "./DropRates";
import { FigureTable, RuneTable, SetTable, UniqueTable } from "./ItemTables";
import { MonsterTable, SkillTable } from "./SkillTables";
import { NpcShops } from "./NpcShops";
import { PotionTable } from "./PotionTable";
import { HirelingTable } from "./HirelingTable";
import { cn } from "@/lib/utils";

const NAV: { id: NavId; label: string; icon: typeof Anvil }[] = [
  { id: "drops", label: "드랍률", icon: Layers },
  { id: "uniques", label: "유니크", icon: Sparkles },
  { id: "sets", label: "세트", icon: BookOpen },
  { id: "runes", label: "룬", icon: Gem },
  { id: "figures", label: "피규어", icon: Ghost },
  { id: "skills", label: "캐릭터 스킬", icon: Swords },
  { id: "monsters", label: "몬스터 스킬", icon: Table2 },
  { id: "shops", label: "NPC 상점", icon: Store },
  { id: "potions", label: "포션 회복", icon: Droplets },
  { id: "hirelings", label: "용병", icon: Shield },
];

export function Workbench() {
  const inputRef = useRef<HTMLInputElement>(null);
  const source = useEditor((s) => s.source);
  const fileName = useEditor((s) => s.fileName);
  const loading = useEditor((s) => s.loading);
  const error = useEditor((s) => s.error);
  const nav = useEditor((s) => s.nav);
  const setNav = useEditor((s) => s.setNav);
  const openMpq = useEditor((s) => s.openMpq);
  const loadSample = useEditor((s) => s.loadSample);
  const exportMpq = useEditor((s) => s.exportMpq);
  const dirty = useEditor((s) => s.dirty);
  const changedCount = useEditor((s) => s.changedCount());
  const archive = useEditor((s) => s.archive);
  const [dragging, setDragging] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    fetch("/version.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (v?.version) setAppVersion(String(v.version));
      })
      .catch(() => {});
  }, []);

  const onOpen = async (file: File | undefined) => {
    if (!file) return;
    await openMpq(file);
    const err = useEditor.getState().error;
    if (err) toast.error(err);
    else toast.success(`${file.name} 을 열었습니다`);
  };

  const onSave = () => {
    try {
      const { bytes, name } = exportMpq();
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${name} 저장`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다");
    }
  };

  return (
    <div
      className="relative flex min-h-dvh flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = [...e.dataTransfer.files].find((f) => f.name.toLowerCase().endsWith(".mpq"));
        if (file) void onOpen(file);
        else toast.error("MPQ 파일을 놓아 주세요");
      }}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-bg/80 text-lg font-medium">
          MPQ 파일을 여기에 놓으세요
        </div>
      ) : null}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg-elevated">
              <Anvil className="size-5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg leading-none tracking-tight">헬포지</p>
              <p className="mt-1 truncate text-xs text-fg-muted">
                엽굵 · D2R 모드 작업대{appVersion ? ` · v${appVersion}` : ""}
              </p>
            </div>
          </div>
          <div className="hidden min-w-0 max-w-xs truncate text-xs text-fg-muted sm:block">
            {fileName ? fileName : "파일 없음"}
            {dirty ? " · 수정됨" : ""}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".mpq,application/octet-stream"
            className="hidden"
            onChange={(e) => onOpen(e.target.files?.[0])}
          />
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={loading}>
            <FolderOpen className="size-4" />
            <span className="hidden sm:inline">MPQ 열기</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => loadSample()} disabled={loading}>
            샘플
          </Button>
          <Button size="sm" onClick={onSave} disabled={source === "empty" || loading}>
            <Download className="size-4" />
            <span className="hidden sm:inline">다른 이름 저장</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:py-6">
        <nav className="flex shrink-0 gap-2 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id)}
                className={cn(
                  "flex h-11 min-w-max items-center gap-2 rounded-md px-3 text-sm transition-colors",
                  active ? "bg-primary text-primary-fg" : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
          <div className="hidden lg:mt-auto lg:block">
            <div className="rounded-lg border border-border bg-bg-elevated p-3 text-xs text-fg-muted leading-relaxed">
              {archive ? (
                <p>
                  원본 파일 {archive.files.length.toLocaleString()}개. 수정된 엑셀만 갈아 끼워 새 MPQ로 내보냅니다.
                </p>
              ) : source === "sample" ? (
                <p>엽굵 샘플 테이블입니다. 저장하면 엑셀만 담긴 작은 MPQ가 내려갑니다.</p>
              ) : (
                <p>내 컴퓨터의 .mpq 를 열거나, 엽굵 샘플로 먼저 살펴보세요.</p>
              )}
              {changedCount > 0 ? (
                <Badge className="mt-2" tone="ok">
                  {changedCount}개 테이블 변경
                </Badge>
              ) : null}
            </div>
          </div>
        </nav>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {error ? (
            <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          ) : null}
          {source === "empty" ? <Welcome onSample={loadSample} onOpen={() => inputRef.current?.click()} /> : <ActivePanel />}
        </main>
      </div>
    </div>
  );
}

function ActivePanel() {
  const nav = useEditor((s) => s.nav);
  switch (nav) {
    case "drops":
      return <DropRates />;
    case "uniques":
      return <UniqueTable />;
    case "sets":
      return <SetTable />;
    case "runes":
      return <RuneTable />;
    case "figures":
      return <FigureTable />;
    case "skills":
      return <SkillTable />;
    case "monsters":
      return <MonsterTable />;
    case "shops":
      return <NpcShops />;
    case "potions":
      return <PotionTable />;
    case "hirelings":
      return <HirelingTable />;
    default:
      return <DropRates />;
  }
}

function Welcome({ onSample, onOpen }: { onSample: () => void; onOpen: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-10">
      <p className="text-xs tracking-[0.2em] text-fg-subtle uppercase">Sanctuary Workbench</p>
      <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
        모드를 열고
        <br />
        드랍과 스킬을 다듬으세요
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted">
        엽굵 모드 MPQ를 브라우저에서 읽고, 난이도별 유니크·세트·룬·피규어 드랍과 캐릭터/몬스터 스킬을 한글 이름으로 수정한 뒤 새 .mpq 로 저장합니다. 원본 파일은 덮어쓰지 않습니다.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={onOpen}>
          <FolderOpen className="size-4" />
          MPQ 열기
        </Button>
        <Button size="lg" variant="secondary" onClick={onSample}>
          엽굵 샘플 불러오기
        </Button>
      </div>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          ["다른 이름 저장", "수정본만 새 MPQ로 내려받습니다"],
          ["난이도별 드랍", "노멀 / 나이트메어 / 헬 보물 클래스"],
          ["피규어 컬렉션", "엽굵 인형·만화책 컬렉션 테이블"],
          ["스킬 한글화", "직업·몬스터 스킬을 한국어로 표시"],
        ].map(([t, d]) => (
          <li key={t} className="rounded-lg border border-border bg-bg-elevated px-4 py-3">
            <p className="text-sm font-medium">{t}</p>
            <p className="mt-1 text-xs text-fg-muted">{d}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

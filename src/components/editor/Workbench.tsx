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
  Save,
  Box,
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
import { CubeTable } from "./CubeTable";
import { SaveEditor } from "./SaveEditor";
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
  { id: "cube", label: "큐브", icon: Box },
  { id: "saves", label: "세이브", icon: Save },
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
    fetch("/version.json?t=" + Date.now(), { cache: "no-store" })
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
      const { bytes, name, omittedBins } = exportMpq();
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${name} 저장`, {
        duration: 14000,
        description:
          omittedBins > 0
            ? `예전 엑셀 .bin ${omittedBins}개를 빼 두었습니다. 바로가기에 -mod 모드이름 -txt 를 넣고, 게임이 실제로 여는 MPQ와 같은 이름·같은 폴더로 교체하세요. 그래도 안 되면 Saved Games\\Diablo II Resurrected 아래 모드 캐시를 지운 뒤 다시 실행하세요.`
            : "바로가기가 여는 MPQ와 같은 이름·같은 폴더로 교체하세요. 엽굵은 -mod 모드이름 -txt 가 필요합니다.",
      });
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
        const file =
          [...e.dataTransfer.files].find((f) => f.name.toLowerCase().endsWith(".mpq")) ??
          [...e.dataTransfer.files].find((f) => f.name.toLowerCase().endsWith(".d2s"));
        if (!file) {
          toast.error("MPQ 또는 .d2s 파일을 놓아 주세요");
          return;
        }
        if (file.name.toLowerCase().endsWith(".d2s")) {
          useEditor.getState().setPendingSaveFile(file);
          setNav("saves");
          toast.success(`${file.name} 을 세이브 탭에서 엽니다`);
          return;
        }
        void onOpen(file);
      }}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-bg/80 text-lg font-medium">
          MPQ 또는 .d2s 파일을 여기에 놓으세요
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
            <span className="hidden sm:inline">MPQ 저장</span>
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
                  원본 {archive.files.length.toLocaleString()}개. 수정한 엑셀만 갈아 끼우고, 짝이 되는 예전 .bin 은
                  빼서 내보냅니다. 게임은 -txt 로 켜야 반영됩니다.
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
          {source === "mpq" ? (
            <div className="mb-3 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs leading-relaxed text-fg-muted">
              <p className="font-medium text-fg">게임에 안 들어가면</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                <li>
                  저장한 파일로 <span className="text-fg">바로가기가 여는 MPQ</span>를 덮어쓰세요.{" "}
                  <code className="text-[11px] text-fg">-mod yupgoolg</code> 이면{" "}
                  <code className="text-[11px] text-fg">mods\yupgoolg\yupgoolg.mpq</code> 입니다.
                </li>
                <li>
                  바로가기 대상 끝에 <code className="text-[11px] text-fg">-mod 모드이름 -txt</code> 가 있어야
                  합니다. 최신 엽굵은 엑셀 .bin 을 같이 넣어, -txt 없이는 헬포지 수정이 무시됩니다.
                </li>
                <li>
                  그래도 이전 드랍이면{" "}
                  <code className="text-[11px] text-fg">Saved Games\Diablo II Resurrected</code> 아래 해당 모드
                  캐시를 지우고 다시 실행하세요.
                </li>
              </ol>
            </div>
          ) : null}
          {source === "empty" && nav !== "saves" ? <Welcome onSample={loadSample} onOpen={() => inputRef.current?.click()} /> : <ActivePanel />}
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
    case "cube":
      return <CubeTable />;
    case "saves":
      return <SaveEditor />;
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
        엽굵 모드 MPQ를 브라우저에서 읽고, 난이도별 유니크·세트·룬·피규어 드랍과 캐릭터/몬스터 스킬을 한글 이름으로
        수정한 뒤 같은 이름의 .mpq 로 저장합니다. 브라우저 원본은 건드리지 않으니, 게임이 여는 모드 파일만 교체하면
        됩니다.
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
          ["MPQ 저장", "연 파일과 같은 이름으로 내려받습니다"],
          ["난이도별 드랍", "노멀 / 나이트메어 / 헬 보물 클래스"],
          ["-txt 필요", "최신 엽굵은 .bin 이 있어 -txt 없이는 수정이 게임에 안 들어갑니다"],
          ["스킬 한글화", "직업·몬스터 스킬을 한국어로 표시"],
          ["세이브 편집", "오프라인 .d2s 골드·수량·아이템 복사"],
          ["큐브 조합", "호라드릭 큐브 재료·결과·수량을 수정"],
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

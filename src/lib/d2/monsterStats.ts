import { getCell, isDataRow, type TsvTable } from "./tsv.ts";

export const MONSTER_DIFFS = [
  { suffix: "", label: "노멀" },
  { suffix: "(N)", label: "NM" },
  { suffix: "(H)", label: "헬" },
] as const;

const HP_BASE: Record<string, string> = {
  minHP: "MinHP",
  maxHP: "MaxHP",
};

export function monsterDiffCol(base: string, suffix: string): string {
  if (!suffix) return base;
  return `${HP_BASE[base] ?? base}${suffix}`;
}

export const EL_TYPE_KO: Record<string, string> = {
  fire: "화염",
  cold: "냉기",
  ltng: "번개",
  pois: "독",
  mag: "마법",
  stun: "기절",
  mana: "마나",
  stam: "스테미나",
  life: "생명",
  rand: "랜덤",
};

export const EL_TYPES = [
  "",
  "fire",
  "cold",
  "ltng",
  "pois",
  "mag",
  "stun",
  "mana",
  "stam",
  "life",
  "rand",
];

export const EL_MODES = [
  { id: "", label: "(없음)" },
  { id: "A1", label: "평타 1" },
  { id: "A2", label: "평타 2" },
  { id: "S1", label: "스킬 1" },
  { id: "S2", label: "스킬 2" },
  { id: "S3", label: "스킬 3" },
  { id: "S4", label: "스킬 4" },
];

export function elTypeLabel(type: string): string {
  const t = type.trim().toLowerCase();
  if (!t) return "";
  return EL_TYPE_KO[t] ?? type;
}

export const UMOD_KO: Record<string, string> = {
  "17": "엑스트라 스트롱",
  "18": "엑스트라 패스트",
  "19": "커스드",
  "20": "마법 저항",
  "21": "화염 부여",
  "23": "번개 부여",
  "24": "냉기 부여",
  "25": "마나 번",
  "26": "텔레포트",
  "27": "스펙트럴 히트",
  "28": "스톤 스킨",
  "29": "멀티샷",
  "30": "도둑",
  "31": "오라 부여",
  "36": "랜덤 부여",
};

export function umodLabel(id: string): string {
  const t = id.trim();
  if (!t || t === "0") return "";
  return UMOD_KO[t] ? `${t} · ${UMOD_KO[t]}` : t;
}

export const MONSTER_FLAGS: { col: string; label: string; hint: string }[] = [
  { col: "boss", label: "보스", hint: "보스 AI·드랍 보정을 씁니다." },
  { col: "primeevil", label: "프라임 이블", hint: "안다리엘·디아블로급 보스 처리." },
  { col: "demon", label: "악마", hint: "악마 타입. 성기사 스킬 등에 영향." },
  { col: "lUndead", label: "언데드(저)", hint: "스켈·좀비류 언데드." },
  { col: "hUndead", label: "언데드(고)", hint: "뱀파이어·고스트류 언데드." },
  { col: "flying", label: "비행", hint: "지형 무시하고 날아다닙니다." },
  { col: "rangedtype", label: "원거리", hint: "원거리 몬스터로 취급." },
  { col: "isMelee", label: "근접", hint: "근접 공격형." },
  { col: "killable", label: "처치 가능", hint: "끄면 죽일 수 없습니다." },
  { col: "noAura", label: "오라 면역", hint: "팔라딘 오라를 받지 않습니다." },
  { col: "nomultishot", label: "멀티샷 불가", hint: "유니크 멀티샷 모드가 안 붙습니다." },
  { col: "neverCount", label: "킬 제외", hint: "퀘스트/카운터에 안 잡힙니다." },
  { col: "petIgnore", label: "소환수 무시", hint: "용병·소환수가 타깃하지 않습니다." },
  { col: "deathDmg", label: "사망 피해", hint: "죽을 때 주변에 피해." },
  { col: "npc", label: "NPC", hint: "마을/대화 가능 NPC." },
  { col: "enabled", label: "활성", hint: "1이면 게임에 등장합니다." },
];

export const MONSTER_STAT_ROWS: { base: string; label: string }[] = [
  { base: "Level", label: "레벨" },
  { base: "minHP", label: "최소 HP" },
  { base: "maxHP", label: "최대 HP" },
  { base: "AC", label: "방어력" },
  { base: "Exp", label: "경험치" },
  { base: "A1MinD", label: "평타1 최소" },
  { base: "A1MaxD", label: "평타1 최대" },
  { base: "A1TH", label: "평타1 명중" },
  { base: "A2MinD", label: "평타2 최소" },
  { base: "A2MaxD", label: "평타2 최대" },
  { base: "A2TH", label: "평타2 명중" },
  { base: "S1MinD", label: "스킬1 최소" },
  { base: "S1MaxD", label: "스킬1 최대" },
  { base: "S1TH", label: "스킬1 명중" },
  { base: "ToBlock", label: "블록 %" },
  { base: "Crit", label: "치명타 %" },
];

export const MONSTER_RESIST_ROWS: { base: string; label: string }[] = [
  { base: "ResDm", label: "물리" },
  { base: "ResMa", label: "마법" },
  { base: "ResFi", label: "화염" },
  { base: "ResLi", label: "번개" },
  { base: "ResCo", label: "냉기" },
  { base: "ResPo", label: "독" },
  { base: "Drain", label: "생명 흡수 효율" },
  { base: "coldeffect", label: "냉기 감속" },
];

export const MONSTER_HP_COLS = ["minHP", "maxHP", "MinHP(N)", "MaxHP(N)", "MinHP(H)", "MaxHP(H)"];

export const MONSTER_DMG_COLS = [
  "A1MinD",
  "A1MaxD",
  "A2MinD",
  "A2MaxD",
  "S1MinD",
  "S1MaxD",
  "A1MinD(N)",
  "A1MaxD(N)",
  "A2MinD(N)",
  "A2MaxD(N)",
  "S1MinD(N)",
  "S1MaxD(N)",
  "A1MinD(H)",
  "A1MaxD(H)",
  "A2MinD(H)",
  "A2MaxD(H)",
  "S1MinD(H)",
  "S1MaxD(H)",
  "El1MinD",
  "El1MaxD",
  "El2MinD",
  "El2MaxD",
  "El3MinD",
  "El3MaxD",
  "El1MinD(N)",
  "El1MaxD(N)",
  "El2MinD(N)",
  "El2MaxD(N)",
  "El3MinD(N)",
  "El3MaxD(N)",
  "El1MinD(H)",
  "El1MaxD(H)",
  "El2MinD(H)",
  "El2MaxD(H)",
  "El3MinD(H)",
  "El3MaxD(H)",
];

export function findMonPropRow(table: TsvTable | undefined, id: string): number {
  if (!table || !id.trim()) return -1;
  const key = id.trim().toLowerCase();
  return table.rows.findIndex((row) => isDataRow(row) && getCell(row, table, "Id").trim().toLowerCase() === key);
}

export function findSuperUniqueRows(table: TsvTable | undefined, monsterId: string): number[] {
  if (!table || !monsterId.trim()) return [];
  const key = monsterId.trim().toLowerCase();
  const out: number[] = [];
  table.rows.forEach((row, i) => {
    if (!isDataRow(row)) return;
    if (getCell(row, table, "Class").trim().toLowerCase() === key) out.push(i);
  });
  return out;
}

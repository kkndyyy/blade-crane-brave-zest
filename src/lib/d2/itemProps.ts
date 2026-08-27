/** Korean labels for D2/D2R (and 엽굵) item property codes. */
export const PROP_KO: Record<string, string> = {
  str: "힘",
  dex: "민첩",
  vit: "체력",
  enr: "에너지",
  hp: "생명",
  mana: "마나",
  stam: "지구력",
  "hp%": "생명 +%",
  "mana%": "마나 +%",
  regen: "생명 회복",
  "regen-stam": "지구력 회복",
  "regen-mana": "마나 회복",
  ac: "방어",
  "ac%": "방어 +%",
  "ac-miss": "원거리 방어",
  "ac-hth": "근접 방어",
  "red-dmg": "물리 피해 감소",
  "red-dmg%": "물리 피해 감소 %",
  "red-mag": "마법 피해 감소",
  "dmg-to-mana": "피해의 마나 전환",
  "dmg%": "피해 +%",
  "dmg-min": "최소 피해",
  "dmg-max": "최대 피해",
  "dmg-norm": "추가 물리 피해",
  "dmg-fire": "화염 피해",
  "dmg-cold": "냉기 피해",
  "dmg-ltng": "번개 피해",
  "dmg-pois": "독 피해",
  "dmg-mag": "마법 피해",
  "dmg-elem": "원소 피해",
  "dmg-undead": "언데드 피해",
  "dmg-demon": "악마 피해",
  att: "명중",
  "att%": "명중 +%",
  "att-undead": "언데드 명중",
  "att-demon": "악마 명중",
  "res-fire": "화염 저항",
  "res-cold": "냉기 저항",
  "res-ltng": "번개 저항",
  "res-pois": "독 저항",
  "res-all": "모든 저항",
  "res-mag": "마법 저항",
  "res-fire-max": "최대 화염 저항",
  "res-cold-max": "최대 냉기 저항",
  "res-ltng-max": "최대 번개 저항",
  "res-pois-max": "최대 독 저항",
  "abs-fire": "화염 흡수",
  "abs-cold": "냉기 흡수",
  "abs-ltng": "번개 흡수",
  "abs-mag": "마법 흡수",
  "abs-fire%": "화염 흡수 %",
  "abs-cold%": "냉기 흡수 %",
  "abs-ltng%": "번개 흡수 %",
  lifesteal: "생명 훔치기",
  manasteal: "마나 훔치기",
  "hit-skill": "타격 시 스킬",
  "gethit-skill": "피격 시 스킬",
  "death-skill": "사망 시 스킬",
  "death-skill-new": "사망 시 스킬",
  "kill-skill": "처치 시 스킬",
  charged: "충전 스킬",
  skill: "스킬 레벨",
  oskill: "부여 스킬",
  allskills: "모든 스킬",
  skilltab: "스킬 탭",
  aura: "오라",
  sock: "소켓",
  indestruct: "파괴 불가",
  ethereal: "에더리얼",
  durability: "내구도",
  dur: "내구도",
  "dur%": "내구도 +%",
  light: "시야",
  thorns: "가시",
  "thorns%": "가시 %",
  "gold%": "골드 획득",
  "mag%": "매직 아이템 발견",
  ease: "요구치 감소",
  noheal: "회복 불가",
  freeze: "빙결",
  nofreeze: "빙결 불가",
  openwounds: "열린 상처",
  crush: "강타",
  deadly: "치명타",
  "ignore-ac": "방어 무시",
  "reduce-ac": "적 방어 감소",
  howl: "공포",
  knock: "넉백",
  slow: "감속",
  swing1: "공격 속도",
  swing2: "공격 속도",
  swing3: "공격 속도",
  balance1: "타격 회복",
  balance2: "타격 회복",
  balance3: "타격 회복",
  move1: "이동 속도",
  move2: "이동 속도",
  move3: "이동 속도",
  cast1: "시전 속도",
  cast2: "시전 속도",
  cast3: "시전 속도",
  block: "막기",
  block2: "막기 속도",
  fireskill: "화염 스킬",
  "extra-fire": "화염 숙련",
  "extra-cold": "냉기 숙련",
  "extra-ltng": "번개 숙련",
  "extra-pois": "독 숙련",
  pierce: "관통",
  "pierce-fire": "화염 관통",
  "pierce-cold": "냉기 관통",
  "pierce-ltng": "번개 관통",
  "pierce-pois": "독 관통",
  "half-freeze": "빙결 시간 반감",
  "res-pois-len": "독 지속 감소",
  stupidity: "암흑",
  reanimate: "시체 소생",
  "rep-dur": "내구 수리",
  "rep-quant": "수량 회복",
  cheap: "상점 가격 감소",
  rip: "시체 소멸",
  ilvlx: "아이템 레벨 보정",
  onlyoneitem: "동일 유니크 1개만",
  onlyoneAllitem: "동일 아이템 1개만",
  reversalrune: "역방향 룬워드",
  addxp: "경험치 +%",
  "heal-kill": "처치 시 생명",
  "mana-kill": "처치 시 마나",
  "dmg-ac": "방어 무시 피해",
};

const SKILL_PROPS = new Set([
  "skill",
  "oskill",
  "aura",
  "charged",
  "hit-skill",
  "gethit-skill",
  "death-skill",
  "death-skill-new",
  "kill-skill",
]);

export function labelProp(code: string): string {
  const c = code.trim();
  if (!c) return "";
  return PROP_KO[c] || PROP_KO[c.toLowerCase()] || c;
}

export function isSkillProp(code: string): boolean {
  return SKILL_PROPS.has(code.trim().toLowerCase());
}

export type AffixSlot = {
  prop: string;
  par: string;
  min: string;
  max: string;
  label: string;
};

export function uniqueAffixSlots(): AffixSlot[] {
  return Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    return { prop: `prop${n}`, par: `par${n}`, min: `min${n}`, max: `max${n}`, label: `옵션 ${n}` };
  });
}

export function setItemAffixSlots(): AffixSlot[] {
  return Array.from({ length: 9 }, (_, i) => {
    const n = i + 1;
    return { prop: `prop${n}`, par: `par${n}`, min: `min${n}`, max: `max${n}`, label: `옵션 ${n}` };
  });
}

export function setBonusAffixSlots(): AffixSlot[] {
  const out: AffixSlot[] = [];
  for (let i = 1; i <= 5; i++) {
    out.push({
      prop: `aprop${i}a`,
      par: `apar${i}a`,
      min: `amin${i}a`,
      max: `amax${i}a`,
      label: `${i + 1}세트 · A`,
    });
    out.push({
      prop: `aprop${i}b`,
      par: `apar${i}b`,
      min: `amin${i}b`,
      max: `amax${i}b`,
      label: `${i + 1}세트 · B`,
    });
  }
  return out;
}

export function runewordAffixSlots(): AffixSlot[] {
  return Array.from({ length: 7 }, (_, i) => {
    const n = i + 1;
    return { prop: `T1Code${n}`, par: `T1Param${n}`, min: `T1Min${n}`, max: `T1Max${n}`, label: `옵션 ${n}` };
  });
}

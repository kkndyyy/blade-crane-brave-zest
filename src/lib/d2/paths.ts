export const EXCEL = {
  itemRatio: "data\\global\\excel\\itemratio.txt",
  uniqueItems: "data\\global\\excel\\uniqueitems.txt",
  setItems: "data\\global\\excel\\setitems.txt",
  treasure: "data\\global\\excel\\treasureclassex.txt",
  misc: "data\\global\\excel\\misc.txt",
  armor: "data\\global\\excel\\armor.txt",
  weapons: "data\\global\\excel\\weapons.txt",
  skills: "data\\global\\excel\\skills.txt",
  skillDesc: "data\\global\\excel\\skilldesc.txt",
  missiles: "data\\global\\excel\\missiles.txt",
  monstats: "data\\global\\excel\\monstats.txt",
  monprop: "data\\global\\excel\\monprop.txt",
  superuniques: "data\\global\\excel\\superuniques.txt",
  runes: "data\\global\\excel\\runes.txt",
  itemTypes: "data\\global\\excel\\itemtypes.txt",
  charStats: "data\\global\\excel\\charstats.txt",
  cubemain: "data\\global\\excel\\cubemain.txt",
  hireling: "data\\global\\excel\\hireling.txt",
  itemstatcost: "data\\global\\excel\\itemstatcost.txt",
} as const;

export const STRINGS = {
  itemNames: "data\\local\\lng\\strings\\item-names.json",
  itemRunes: "data\\local\\lng\\strings\\item-runes.json",
  skills: "data\\local\\lng\\strings\\skills.json",
  monsters: "data\\local\\lng\\strings\\monsters.json",
} as const;

export const SAMPLE_FILES: { path: string; url: string }[] = [
  { path: EXCEL.itemRatio, url: "/sample-data/yupgoolg/itemratio.txt" },
  { path: EXCEL.uniqueItems, url: "/sample-data/yupgoolg/uniqueitems.txt" },
  { path: EXCEL.setItems, url: "/sample-data/yupgoolg/setitems.txt" },
  { path: EXCEL.treasure, url: "/sample-data/yupgoolg/treasureclassex.txt" },
  { path: EXCEL.misc, url: "/sample-data/yupgoolg/misc.txt" },
  { path: EXCEL.armor, url: "/sample-data/yupgoolg/armor.txt" },
  { path: EXCEL.weapons, url: "/sample-data/yupgoolg/weapons.txt" },
  { path: EXCEL.skills, url: "/sample-data/yupgoolg/skills.txt" },
  { path: EXCEL.skillDesc, url: "/sample-data/yupgoolg/skilldesc.txt" },
  { path: EXCEL.missiles, url: "/sample-data/yupgoolg/missiles.txt" },
  { path: EXCEL.monstats, url: "/sample-data/yupgoolg/monstats.txt" },
  { path: EXCEL.runes, url: "/sample-data/yupgoolg/runes.txt" },
  { path: EXCEL.itemTypes, url: "/sample-data/yupgoolg/itemtypes.txt" },
  { path: EXCEL.cubemain, url: "/sample-data/yupgoolg/cubemain.txt" },
  { path: EXCEL.hireling, url: "/sample-data/yupgoolg/hireling.txt" },
  { path: EXCEL.itemstatcost, url: "/sample-data/yupgoolg/itemstatcost.txt" },
  { path: STRINGS.itemNames, url: "/sample-data/yupgoolg/item-names.json" },
  { path: STRINGS.itemRunes, url: "/sample-data/yupgoolg/item-runes.json" },
  { path: STRINGS.skills, url: "/sample-data/yupgoolg/skills.json" },
  { path: STRINGS.monsters, url: "/sample-data/yupgoolg/monsters.json" },
];

export function tcDifficulty(name: string): "normal" | "nightmare" | "hell" | "all" {
  if (/\(H\)\s*$/.test(name) || /\s\(H\)$/.test(name)) return "hell";
  if (/\(N\)\s*$/.test(name) || /\s\(N\)$/.test(name)) return "nightmare";
  if (isRuneTc(name) || isFigureTc(name)) return "all";
  return "normal";
}

export function matchesDifficulty(name: string, diff: "normal" | "nightmare" | "hell"): boolean {
  const d = tcDifficulty(name);
  return d === diff || d === "all";
}

export function isRuneTc(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("rune") || n.startsWith("runes");
}

export function isFigureTc(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("doll") || n.includes("figure") || n.includes("figur") || n.includes("balldoll");
}

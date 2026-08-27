import { getCell, isDataRow, num, setCell, type TsvTable } from "./tsv";

export type VendorTableKey = "misc" | "armor" | "weapons";

export type NpcInfo = {
  id: string;
  label: string;
  act: 1 | 2 | 3 | 4 | 5;
  role: string;
};

export const NPCS: NpcInfo[] = [
  { id: "Akara", label: "아카라", act: 1, role: "마법·물약" },
  { id: "Charsi", label: "찰시", act: 1, role: "무기·방어구" },
  { id: "Gheed", label: "기드", act: 1, role: "잡화" },
  { id: "Fara", label: "파라", act: 2, role: "무기·방어구" },
  { id: "Drognan", label: "드로그난", act: 2, role: "마법" },
  { id: "Elzix", label: "엘직스", act: 2, role: "잡화" },
  { id: "Lysander", label: "라이샌더", act: 2, role: "물약" },
  { id: "Hratli", label: "흐라틀리", act: 3, role: "무기·방어구" },
  { id: "Ormus", label: "오르무스", act: 3, role: "마법" },
  { id: "Alkor", label: "알코르", act: 3, role: "물약" },
  { id: "Asheara", label: "아시아라", act: 3, role: "용병·잡화" },
  { id: "Cain", label: "케인", act: 3, role: "잡화" },
  { id: "Halbu", label: "할부", act: 4, role: "무기" },
  { id: "Jamella", label: "자멜라", act: 4, role: "방어·마법" },
  { id: "Larzuk", label: "라르주크", act: 5, role: "무기·방어구" },
  { id: "Malah", label: "말라", act: 5, role: "물약·마법" },
  { id: "Anya", label: "안야", act: 5, role: "방어구" },
];

export const VENDOR_TABLES: { key: VendorTableKey; label: string }[] = [
  { key: "armor", label: "방어구" },
  { key: "weapons", label: "무기" },
  { key: "misc", label: "기타" },
];

export function vendorCols(npc: string) {
  return {
    min: `${npc}Min`,
    max: `${npc}Max`,
    magicMin: `${npc}MagicMin`,
    magicMax: `${npc}MagicMax`,
    magicLvl: `${npc}MagicLvl`,
  };
}

export function npcSells(row: string[], table: TsvTable, npc: string): boolean {
  const c = vendorCols(npc);
  return (
    num(getCell(row, table, c.min)) > 0 ||
    num(getCell(row, table, c.max)) > 0 ||
    num(getCell(row, table, c.magicMin)) > 0 ||
    num(getCell(row, table, c.magicMax)) > 0
  );
}

export function itemCode(row: string[], table: TsvTable): string {
  return getCell(row, table, "code").trim();
}

export function itemNameKey(row: string[], table: TsvTable): string {
  return getCell(row, table, "namestr") || getCell(row, table, "name") || itemCode(row, table);
}

export function applyVendorStock(row: string[], table: TsvTable, npc: string, add: boolean, kind: VendorTableKey) {
  const c = vendorCols(npc);
  if (!add) {
    setCell(row, table, c.min, "");
    setCell(row, table, c.max, "");
    setCell(row, table, c.magicMin, "");
    setCell(row, table, c.magicMax, "");
    return;
  }
  setCell(row, table, c.min, "1");
  setCell(row, table, c.max, "1");
  if (kind === "misc") {
    setCell(row, table, c.magicMin, "");
    setCell(row, table, c.magicMax, "");
    if (!getCell(row, table, c.magicLvl).trim()) setCell(row, table, c.magicLvl, "255");
  } else {
    setCell(row, table, c.magicMin, "1");
    setCell(row, table, c.magicMax, "1");
    if (!getCell(row, table, c.magicLvl).trim()) setCell(row, table, c.magicLvl, "20");
  }
}

export const HP_MP_POTION_CODES = new Set(["hp1", "hp2", "hp3", "hp4", "hp5", "mp1", "mp2", "mp3", "mp4", "mp5"]);

export function isHpMpPotionCode(code: string): boolean {
  return HP_MP_POTION_CODES.has(code.toLowerCase());
}

function vendorFieldNames(npc: string): string[] {
  const c = vendorCols(npc);
  return [c.min, c.max, c.magicMin, c.magicMax, c.magicLvl];
}

const POTION_SHOP_EXTRA = ["NightmareUpgrade", "HellUpgrade", "PermStoreItem", "multibuy"];

export function isAllNpcsSellAllPotions(table: TsvTable): boolean {
  let seen = 0;
  for (const row of table.rows) {
    if (!isDataRow(row)) continue;
    if (!isHpMpPotionCode(itemCode(row, table))) continue;
    seen += 1;
    const nm = getCell(row, table, "NightmareUpgrade").trim().toLowerCase();
    const hell = getCell(row, table, "HellUpgrade").trim().toLowerCase();
    if (nm && nm !== "xxx") return false;
    if (hell && hell !== "xxx") return false;
    for (const npc of NPCS) {
      if (table.headers.includes(`${npc.id}Min`) && !npcSells(row, table, npc.id)) return false;
    }
  }
  return seen >= 10;
}

export function applyAllNpcsSellAllPotions(table: TsvTable, orig: TsvTable, enabled: boolean) {
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i]!;
    if (!isDataRow(row)) continue;
    if (!isHpMpPotionCode(itemCode(row, table))) continue;
    const origRow = orig.rows[i];
    if (enabled) {
      setCell(row, table, "NightmareUpgrade", "xxx");
      setCell(row, table, "HellUpgrade", "xxx");
      setCell(row, table, "PermStoreItem", "1");
      setCell(row, table, "multibuy", "1");
      for (const npc of NPCS) {
        const c = vendorCols(npc.id);
        if (!table.headers.includes(c.min)) continue;
        if (!npcSells(row, table, npc.id)) {
          setCell(row, table, c.min, "1");
          setCell(row, table, c.max, "1");
        }
      }
    } else if (origRow) {
      for (const col of POTION_SHOP_EXTRA) setCell(row, table, col, getCell(origRow, orig, col));
      for (const npc of NPCS) {
        for (const col of vendorFieldNames(npc.id)) {
          if (table.headers.includes(col)) setCell(row, table, col, getCell(origRow, orig, col));
        }
      }
    }
  }
}

export function listCatalog(table: TsvTable | undefined) {
  if (!table) return [] as { row: string[]; index: number }[];
  const out: { row: string[]; index: number }[] = [];
  table.rows.forEach((row, index) => {
    if (!isDataRow(row)) return;
    if (!itemCode(row, table)) return;
    out.push({ row, index });
  });
  return out;
}

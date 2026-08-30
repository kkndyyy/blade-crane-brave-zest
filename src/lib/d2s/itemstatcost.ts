import { getCell, isDataRow, num, parseTsv, type TsvTable } from "../d2/tsv.ts";

export type StatCost = {
  id: number;
  name: string;
  csvBits: number;
  csvParam: number;
  csvSigned: boolean;
  saveBits: number;
  saveAdd: number;
  saveParam: number;
  valShift: number;
};

export type StatTable = Map<number, StatCost>;

export function parseItemStatCost(text: string): StatTable {
  const table = parseTsv(text);
  return statTableFromTsv(table);
}

export function statTableFromTsv(table: TsvTable): StatTable {
  const out: StatTable = new Map();
  for (const row of table.rows) {
    if (!isDataRow(row)) continue;
    const id = num(getCell(row, table, "*ID") || getCell(row, table, "*Id"), -1);
    if (id < 0) continue;
    out.set(id, {
      id,
      name: getCell(row, table, "Stat") || getCell(row, table, "stat") || String(id),
      csvBits: num(getCell(row, table, "CSvBits"), 0),
      csvParam: num(getCell(row, table, "CSvParam"), 0),
      csvSigned: num(getCell(row, table, "CSvSigned"), 0) !== 0,
      saveBits: num(getCell(row, table, "Save Bits"), 0),
      saveAdd: num(getCell(row, table, "Save Add"), 0),
      saveParam: num(getCell(row, table, "Save Param Bits"), 0),
      valShift: num(getCell(row, table, "ValShift"), 0),
    });
  }
  return out;
}

/** Stats that follow without their own id in the item bitstream. */
export const PAIRED_STATS: Record<number, number[]> = {
  17: [18],
  48: [49],
  50: [51],
  52: [53],
  54: [55, 56],
  57: [58, 59],
};

export const STAT_POISON_MIN = 57;
export const STAT_POISON_COUNT = 60;
export const STAT_TERMINATOR = 0x1ff;
export const STAT_ARMORCLASS = 31;
export const STAT_DURABILITY = 72;
export const STAT_MAXDURABILITY = 73;
export const STAT_NUMSOCKETS = 194;
export const STAT_QUEST_DIFF = 356;
export const STAT_GOLD = 14;
export const STAT_GOLDBANK = 15;
export const STAT_LEVEL = 12;

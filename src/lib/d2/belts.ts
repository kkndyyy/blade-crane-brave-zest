import { getCell, isDataRow, setCell, type TsvTable } from "./tsv.ts";

export function isBeltItem(row: string[], table: TsvTable): boolean {
  return getCell(row, table, "type").trim().toLowerCase() === "belt";
}

/** D2R belts.txt: 3 = girdle/plated 16, 6 = uber/exceptional 16. */
export function pickSixteenBeltIndex(table: TsvTable): string {
  const seen = new Set<string>();
  for (const row of table.rows) {
    if (!isDataRow(row) || !isBeltItem(row, table)) continue;
    const v = getCell(row, table, "belt").trim();
    if (v) seen.add(v);
  }
  if (seen.has("6")) return "6";
  if (seen.has("3")) return "3";
  let best = 0;
  for (const v of seen) {
    const n = Number(v);
    if (Number.isFinite(n) && n > best) best = n;
  }
  return best > 0 ? String(best) : "6";
}

export function isAllBeltsSixteen(table: TsvTable | undefined): boolean {
  if (!table) return false;
  const target = pickSixteenBeltIndex(table);
  let n = 0;
  for (const row of table.rows) {
    if (!isDataRow(row) || !isBeltItem(row, table)) continue;
    n += 1;
    if (getCell(row, table, "belt").trim() !== target) return false;
  }
  return n > 0;
}

export function applyAllBeltsSixteen(table: TsvTable, orig: TsvTable, enabled: boolean): number {
  const target = pickSixteenBeltIndex(orig.rows.length ? orig : table);
  let n = 0;
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i]!;
    if (!isDataRow(row) || !isBeltItem(row, table)) continue;
    if (enabled) {
      if (getCell(row, table, "belt").trim() === target) continue;
      setCell(row, table, "belt", target);
      n += 1;
    } else {
      const origRow = orig.rows[i];
      if (!origRow) continue;
      const prev = getCell(origRow, orig, "belt");
      if (getCell(row, table, "belt") === prev) continue;
      setCell(row, table, "belt", prev);
      n += 1;
    }
  }
  return n;
}

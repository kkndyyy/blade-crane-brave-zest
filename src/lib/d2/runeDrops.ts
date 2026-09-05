import { isRuneTc, matchesDifficulty } from "./paths.ts";
import type { Difficulty } from "./labels.ts";
import { colIndex, getCell, isDataRow, num, setCell, type TsvTable } from "./tsv.ts";

export function treasureItemSlots(table: TsvTable): number[] {
  const slots: number[] = [];
  for (const h of table.headers) {
    const m = /^Item(\d+)$/i.exec(h.trim());
    if (m) slots.push(Number(m[1]));
  }
  slots.sort((a, b) => a - b);
  return slots;
}

/** Keep integer TC weights at least 1 so a slot never disappears on halving. */
export function scaleIntWeight(value: number, factor: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(factor) || factor <= 0) return value;
  return Math.max(1, Math.round(value * factor));
}

/**
 * Multiply how often rune treasure classes are chosen from parent TCs.
 * `factor` 2 = twice as many rune drops, 0.5 = half. Stacks on current values.
 * Nested Runes N ladders are left alone so high-rune odds stay the same.
 */
export function applyRuneDropRateScale(
  table: TsvTable,
  difficulty: Difficulty,
  factor: number,
): number {
  const slots = treasureItemSlots(table);
  const nameI = colIndex(table, "Treasure Class");
  let changed = 0;
  for (const row of table.rows) {
    if (!isDataRow(row)) continue;
    const name = row[nameI] ?? "";
    if (!matchesDifficulty(name, difficulty)) continue;
    if (isRuneTc(name)) {
      const raw = getCell(row, table, "NoDrop");
      const cur = num(raw, 0);
      if (cur <= 0) continue;
      const next = scaleIntWeight(cur, 1 / factor);
      if (String(next) !== raw) {
        setCell(row, table, "NoDrop", String(next));
        changed += 1;
      }
      continue;
    }
    for (const n of slots) {
      const item = getCell(row, table, `Item${n}`);
      if (!isRuneTc(item)) continue;
      const raw = getCell(row, table, `Prob${n}`);
      const cur = num(raw, 0);
      if (cur <= 0) continue;
      const next = scaleIntWeight(cur, factor);
      if (String(next) !== raw) {
        setCell(row, table, `Prob${n}`, String(next));
        changed += 1;
      }
    }
  }
  return changed;
}

/** Restore rune-TC NoDrop and parent-TC rune weights from the original table. */
export function restoreRuneDropRate(table: TsvTable, orig: TsvTable): number {
  const slots = treasureItemSlots(table);
  const nameI = colIndex(table, "Treasure Class");
  let changed = 0;
  const n = Math.min(table.rows.length, orig.rows.length);
  for (let i = 0; i < n; i++) {
    const row = table.rows[i]!;
    const origRow = orig.rows[i]!;
    if (!isDataRow(row) || !isDataRow(origRow)) continue;
    const name = row[nameI] ?? "";
    if (isRuneTc(name)) {
      const from = getCell(origRow, orig, "NoDrop");
      if (getCell(row, table, "NoDrop") !== from) {
        setCell(row, table, "NoDrop", from);
        changed += 1;
      }
      continue;
    }
    for (const s of slots) {
      const origItem = getCell(origRow, orig, `Item${s}`);
      const curItem = getCell(row, table, `Item${s}`);
      if (!isRuneTc(origItem) && !isRuneTc(curItem)) continue;
      const from = getCell(origRow, orig, `Prob${s}`);
      if (getCell(row, table, `Prob${s}`) !== from) {
        setCell(row, table, `Prob${s}`, from);
        changed += 1;
      }
    }
  }
  return changed;
}

export function runeParentWeightStats(table: TsvTable, difficulty: Difficulty) {
  const slots = treasureItemSlots(table);
  const nameI = colIndex(table, "Treasure Class");
  let weight = 0;
  let n = 0;
  for (const row of table.rows) {
    if (!isDataRow(row)) continue;
    const name = row[nameI] ?? "";
    if (!matchesDifficulty(name, difficulty)) continue;
    if (isRuneTc(name)) continue;
    for (const s of slots) {
      if (!isRuneTc(getCell(row, table, `Item${s}`))) continue;
      n += 1;
      weight += num(getCell(row, table, `Prob${s}`), 0);
    }
  }
  return {
    n,
    weight,
    avg: n ? Math.round(weight / n) : 0,
  };
}

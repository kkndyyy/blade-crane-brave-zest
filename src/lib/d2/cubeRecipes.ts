import { getCell, isDataRow, setCell, type TsvTable } from "./tsv";

function stripQuotes(s: string): string {
  return s.replace(/^"+|"+$/g, "").trim();
}

function parsePart(raw: string): { code: string; qty: number | null } {
  const parts = stripQuotes(raw)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const code = (parts[0] ?? "").toLowerCase();
  let qty: number | null = null;
  for (const p of parts.slice(1)) {
    const m = p.match(/^qty=(\d+)$/i);
    if (m) qty = Number(m[1]);
  }
  return { code, qty };
}

function isRuneCode(code: string): boolean {
  return /^[ar]\d+$/i.test(code);
}

function lowerRuneCode(code: string): string | null {
  const m = code.toLowerCase().match(/^([ar])(\d+)$/);
  if (!m) return null;
  const n = Number(m[2]);
  if (n <= 1) return null;
  return `${m[1]}${String(n - 1).padStart(m[2].length, "0")}`;
}

function recipeInputs(row: string[], table: TsvTable) {
  return [1, 2, 3, 4, 5, 6, 7].map((i) => parsePart(getCell(row, table, `input ${i}`))).filter((p) => p.code);
}

function hasUseitem(raw: string): boolean {
  return stripQuotes(raw).toLowerCase().includes("useitem");
}

export function isRuneOpmDowngrade(row: string[], table: TsvTable): boolean {
  const inputs = recipeInputs(row, table);
  if (!inputs.some((p) => p.code === "opm")) return false;
  const runeIn = inputs.find((p) => isRuneCode(p.code));
  if (!runeIn) return false;
  const expected = lowerRuneCode(runeIn.code);
  if (!expected) return false;
  const outs = [parsePart(getCell(row, table, "output")), parsePart(getCell(row, table, "output b"))];
  return outs.some((o) => o.code === expected);
}

function isDoubleLower(row: string[], table: TsvTable): boolean {
  const outRaw = getCell(row, table, "output");
  const outbRaw = getCell(row, table, "output b");
  const outb = parsePart(outbRaw);
  if (hasUseitem(outRaw)) return isRuneCode(outb.code) && outb.qty === 2;
  const out = parsePart(outRaw);
  return isRuneCode(out.code) && outb.code === out.code;
}

export function isRuneOpmSplitDouble(table: TsvTable | undefined): boolean {
  if (!table) return false;
  let seen = 0;
  for (const row of table.rows) {
    if (!isDataRow(row) || !isRuneOpmDowngrade(row, table)) continue;
    seen += 1;
    if (!isDoubleLower(row, table)) return false;
  }
  return seen > 0;
}

export function applyRuneOpmSplitDouble(table: TsvTable, orig: TsvTable, enabled: boolean) {
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i]!;
    if (!isDataRow(row) || !isRuneOpmDowngrade(row, table)) continue;
    const origRow = orig.rows[i];
    if (!enabled) {
      if (!origRow) continue;
      setCell(row, table, "output", getCell(origRow, orig, "output"));
      setCell(row, table, "output b", getCell(origRow, orig, "output b"));
      setCell(row, table, "output c", getCell(origRow, orig, "output c"));
      continue;
    }
    const outRaw = getCell(row, table, "output");
    if (hasUseitem(outRaw)) {
      const outb = parsePart(getCell(row, table, "output b"));
      if (isRuneCode(outb.code)) setCell(row, table, "output b", `${outb.code},qty=2`);
      continue;
    }
    const out = parsePart(outRaw);
    if (isRuneCode(out.code) && !parsePart(getCell(row, table, "output b")).code) {
      setCell(row, table, "output b", out.code);
    }
  }
}

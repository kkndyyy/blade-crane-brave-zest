import { getCell, isDataRow, setCell, type TsvTable } from "./tsv.ts";

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

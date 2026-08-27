export type TsvTable = {
  headers: string[];
  rows: string[][];
};

export function parseTsv(text: string): TsvTable {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0]!.split("\t");
  const rows = lines.slice(1).map((line) => {
    const cols = line.split("\t");
    while (cols.length < headers.length) cols.push("");
    return cols;
  });
  return { headers, rows };
}

export function serializeTsv(table: TsvTable): string {
  const lines = [table.headers.join("\t")];
  for (const row of table.rows) {
    const cols = table.headers.map((_, i) => row[i] ?? "");
    lines.push(cols.join("\t"));
  }
  return lines.join("\r\n") + "\r\n";
}

export function colIndex(table: TsvTable, name: string): number {
  const exact = table.headers.indexOf(name);
  if (exact >= 0) return exact;
  const lower = name.toLowerCase();
  return table.headers.findIndex((h) => h.toLowerCase() === lower);
}

export function getCell(row: string[], table: TsvTable, name: string): string {
  const i = colIndex(table, name);
  return i < 0 ? "" : (row[i] ?? "");
}

export function setCell(row: string[], table: TsvTable, name: string, value: string) {
  const i = colIndex(table, name);
  if (i < 0) return;
  row[i] = value;
}

export function num(value: string, fallback = 0): number {
  if (value === "" || value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function isDataRow(row: string[]): boolean {
  const first = (row[0] ?? "").trim();
  if (!first) return false;
  if (first === "Expansion") return false;
  return true;
}

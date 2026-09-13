import { getCell, isDataRow, setCell, type TsvTable } from "./tsv.ts";

function stripQuotes(s: string): string {
  return s.replace(/^"+|"+$/g, "").trim();
}

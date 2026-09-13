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

export type CubePart = {
  raw: string;
  tokens: string[];
  qty: number | null;
};

export const CUBE_FLAG_KO: Record<string, string> = {
  useitem: "재료 유지",
  usetype: "같은 유형",
  mod: "옵션 부여",
  low: "하급",
  nor: "일반",
  hiq: "상급",
  mag: "매직",
  rar: "레어",
  set: "세트",
  uni: "유니크",
  crf: "크래프트",
  tmp: "템퍼드",
  eth: "에테리얼",
  noe: "비에테",
  sock: "소켓",
  nos: "무소켓",
  upg: "업그레이드",
  bas: "노멀급",
  exc: "익셉셔널",
  eli: "엘리트",
  any: "아무거나",
  nru: "비룬",
};

export const CUBE_TYPE_KO: Record<string, string> = {
  weap: "무기",
  armo: "방어구",
  shie: "방패",
  tors: "갑옷",
  boot: "신발",
  glov: "장갑",
  belt: "허리띠",
  helm: "투구",
  head: "머리",
  circ: "서클릿",
  phlm: "프리나 헬름",
  ring: "반지",
  amul: "목걸이",
  amu: "목걸이",
  char: "참",
  gem: "보석",
  gem0: "깨진 보석",
  gem1: "일반 보석",
  gem2: "흠있는 보석",
  gem3: "티없는 보석",
  gem4: "완벽한 보석",
  rune: "룬",
  jewl: "주얼",
  jew: "주얼",
  poti: "포션",
  hpot: "체력 포션",
  mpot: "마나 포션",
  scro: "스크롤",
  miss: "원거리 무기",
  mele: "근접 무기",
  axe: "도끼",
  swor: "도검",
  wand: "원드",
  staf: "지팡이",
  scep: "셉터",
  spea: "창",
  pole: "폴암",
  bow: "활",
  xbow: "석궁",
  knif: "단검",
  club: "클럽",
  hamm: "해머",
  mace: "메이스",
  tpot: "투척 포션",
  abow: "아마존 활",
  aspe: "아마존 창",
  ajav: "아마존 자벨린",
  orb: "오브",
  h2h: "너클",
  h2h2: "너클",
  rod: "지팡이류",
  blun: "둔기",
  thrown: "투척",
  combo: "조합 무기",
  shld: "방패(전체)",
  thro: "투척 무기",
  misl: "투사체",
  lcha: "대형 참",
  mcha: "중형 참",
  scha: "소형 참",
  gcha: "그레이트 참",
  pcha: "펫 참",
  dols: "피규어",
  pala: "팔라딘 전용",
  ashd: "성기사 방패",
  pelt: "드루이드 펠트",
  merc: "투구",
  grim: "그리모어",
  lob: "전설 지팡이",
  lwd: "전설 원드",
  bowq: "화살통",
  xboq: "석궁 화살통",
  blde: "도검·단검",
  com2: "조합 무기",
  jave: "자벨린",
  tkni: "투척 단검",
  taxe: "투척 도끼",
};

export const CUBE_OP_KO: Record<string, string> = {
  "15": "스탯이 값 이하",
  "16": "스탯이 값 이상",
  "17": "스탯이 값과 다름",
  "18": "스탯이 값과 같음",
  "28": "비트 플래그 포함",
};

export const INPUT_COLS = ["input 1", "input 2", "input 3", "input 4", "input 5", "input 6", "input 7"] as const;
export const OUTPUT_SLOTS = [
  { field: "output", prefix: "", label: "결과 A" },
  { field: "output b", prefix: "b ", label: "결과 B" },
  { field: "output c", prefix: "c ", label: "결과 C" },
] as const;

export type CubeKind = "rune" | "gem" | "socket" | "craft" | "upgrade" | "other";

export function parseCubeField(raw: string): CubePart {
  const trimmed = stripQuotes(raw);
  if (!trimmed) return { raw, tokens: [], qty: null };
  const bits = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let qty: number | null = null;
  const tokens: string[] = [];
  for (const bit of bits) {
    const m = bit.match(/^qty=(\d+)$/i);
    if (m) {
      qty = Number(m[1]);
      continue;
    }
    tokens.push(bit);
  }
  return { raw, tokens, qty };
}

export function formatCubeField(tokens: string[], qty: number | null): string {
  const parts = tokens.map((t) => t.trim()).filter(Boolean);
  if (qty != null && Number.isFinite(qty)) parts.push(`qty=${Math.max(0, Math.floor(qty))}`);
  if (!parts.length) return "";
  const joined = parts.join(",");
  return parts.length > 1 ? `"${joined}"` : joined;
}

export function countedInputs(row: string[], table: TsvTable): number {
  let n = 0;
  for (const col of INPUT_COLS) {
    const part = parseCubeField(getCell(row, table, col));
    if (!part.tokens.length && part.qty == null) continue;
    n += part.qty != null && part.qty > 0 ? part.qty : 1;
  }
  return n;
}

export function syncNumInputs(row: string[], table: TsvTable) {
  const n = countedInputs(row, table);
  setCell(row, table, "numinputs", n ? String(n) : "");
}

export function recipeKind(row: string[], table: TsvTable): CubeKind {
  const blob = [
    getCell(row, table, "description"),
    ...INPUT_COLS.map((c) => getCell(row, table, c)),
    getCell(row, table, "output"),
    getCell(row, table, "output b"),
    getCell(row, table, "output c"),
    getCell(row, table, "mod 1"),
  ]
    .join(" ")
    .toLowerCase();
  if (/\bsock\b|socket/.test(blob)) return "socket";
  if (/\bcrf\b|craft/.test(blob)) return "craft";
  if (/\buseitem\b|\busetype\b/.test(blob)) return "upgrade";
  if (/\bgem[0-4]\b|\bgem\b|\bgp[vsdbermw]\b|jewel|\bjew\b/.test(blob)) return "gem";
  if (/\b[ar]\d{2}\b|rune/.test(blob)) return "rune";
  return "other";
}

export function cubeTokenLabel(token: string, names: Map<string, string>): string {
  const t = token.trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if (CUBE_FLAG_KO[low]) return CUBE_FLAG_KO[low];
  if (CUBE_TYPE_KO[low]) return CUBE_TYPE_KO[low];
  return names.get(low) || names.get(t) || t;
}

export function cubePartLabel(part: CubePart, names: Map<string, string>): string {
  if (!part.tokens.length && part.qty == null) return "";
  const bits = part.tokens.map((t) => cubeTokenLabel(t, names));
  let s = bits.join(" · ");
  if (part.qty != null && part.qty > 0) s = s ? `${s} ×${part.qty}` : `×${part.qty}`;
  return s;
}

export function recipeSummary(row: string[], table: TsvTable, names: Map<string, string>): string {
  const ins = INPUT_COLS.map((c) => cubePartLabel(parseCubeField(getCell(row, table, c)), names)).filter(Boolean);
  const outs = OUTPUT_SLOTS.map((s) => cubePartLabel(parseCubeField(getCell(row, table, s.field)), names)).filter(Boolean);
  const left = ins.join(" + ") || "재료 없음";
  const right = outs.join(" + ") || "결과 없음";
  return `${left} → ${right}`;
}

export function emptyCubeRow(table: TsvTable): string[] {
  const row = table.headers.map((h) => (h === "*eol" ? "0" : ""));
  setCell(row, table, "description", "새 조합");
  setCell(row, table, "enabled", "1");
  setCell(row, table, "version", "100");
  setCell(row, table, "numinputs", "1");
  return row;
}

export const SET_AMULET_DESC_PREFIX = "형상변환 목걸이";
export const SET_AMULET_UNIQUE_PREFIX = "Amu";

function cloneRow(row: string[], table: TsvTable): string[] {
  return table.headers.map((_, i) => row[i] ?? "");
}

function outputCode(row: string[], table: TsvTable): string {
  return parseCubeField(getCell(row, table, "output")).tokens[0] ?? "";
}

function hasTx4x10(row: string[], table: TsvTable): boolean {
  return tx4x10Col(row, table) != null;
}

function tx4x10Col(row: string[], table: TsvTable): (typeof INPUT_COLS)[number] | null {
  for (const col of INPUT_COLS) {
    const p = parseCubeField(getCell(row, table, col));
    if (p.tokens.some((t) => t.toLowerCase() === "tx4") && p.qty === 10) return col;
  }
  return null;
}

function firstEmptyInputCol(row: string[], table: TsvTable): (typeof INPUT_COLS)[number] | null {
  for (const col of INPUT_COLS) {
    if (!parseCubeField(getCell(row, table, col)).tokens.length) return col;
  }
  return null;
}

/** Full-set + tx4×10 → Set* ring. The x10 (tx6) compact copies are skipped. */
export function isSetTransmuteSource(row: string[], table: TsvTable): boolean {
  if (!isDataRow(row)) return false;
  const desc = getCell(row, table, "description").trim();
  if (!desc || /x10/i.test(desc) || desc.startsWith(SET_AMULET_DESC_PREFIX)) return false;
  const out = outputCode(row, table);
  if (!/^Set/i.test(out)) return false;
  return hasTx4x10(row, table);
}

export function isSetAmuletTransmuteRecipe(row: string[], table: TsvTable): boolean {
  return isDataRow(row) && getCell(row, table, "description").startsWith(SET_AMULET_DESC_PREFIX);
}

export function isSetAmuletUnique(row: string[], table: TsvTable): boolean {
  if (!isDataRow(row)) return false;
  const index = getCell(row, table, "index").trim();
  return index.startsWith(SET_AMULET_UNIQUE_PREFIX) && index.slice(SET_AMULET_UNIQUE_PREFIX.length).startsWith("Set");
}

export function isSetAmuletTransmuteEnabled(cube?: TsvTable): boolean {
  if (!cube) return false;
  return cube.rows.some((row) => isSetAmuletTransmuteRecipe(row, cube));
}

function nextUniqueId(uniques: TsvTable): number {
  let max = 0;
  for (const row of uniques.rows) {
    if (!isDataRow(row)) continue;
    const n = Number(getCell(row, uniques, "*ID"));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function findUnique(uniques: TsvTable, index: string): string[] | undefined {
  const want = index.trim().toLowerCase();
  return uniques.rows.find((r) => isDataRow(r) && getCell(r, uniques, "index").trim().toLowerCase() === want);
}

export type SetAmuletString = { key: string; enUS: string; koKR: string };

type NameEntry = { Key?: string; enUS?: string; koKR?: string };

function findName(entries: NameEntry[] | undefined, key: string): NameEntry | undefined {
  if (!entries) return undefined;
  const want = key.trim().toLowerCase();
  return entries.find((e) => (e.Key || "").trim().toLowerCase() === want);
}

function withSuffix(text: string, suffix: string): string {
  const t = text.trimEnd();
  const s = suffix.trim();
  if (!t) return s;
  if (t.endsWith(s)) return t;
  return `${t} ${s}`;
}

export function applySetAmuletTransmute(
  cube: TsvTable,
  uniques: TsvTable | undefined,
  enabled: boolean,
  existingNames?: NameEntry[],
): { recipes: number; uniques: number; names: SetAmuletString[]; skipped: number } {
  const names: SetAmuletString[] = [];
  cube.rows = cube.rows.filter((row) => !isSetAmuletTransmuteRecipe(row, cube));
  if (uniques) uniques.rows = uniques.rows.filter((row) => !isSetAmuletUnique(row, uniques));
  if (!enabled) return { recipes: 0, uniques: 0, names, skipped: 0 };

  const sources = cube.rows.filter((row) => isSetTransmuteSource(row, cube));
  let uid = uniques ? nextUniqueId(uniques) : 0;
  let nUni = 0;
  let nRec = 0;
  let skipped = 0;

  for (const src of sources) {
    const setOut = outputCode(src, cube);
    if (!setOut) continue;
    const slot = firstEmptyInputCol(src, cube);
    const gemCol = tx4x10Col(src, cube);
    // 6-piece sets already fill all 7 input types (pieces + tx4×10).
    // Replacing the gem column with the amulet keeps the recipe distinct
    // from the ring transmute instead of colliding on identical inputs.
    if (!slot && !gemCol) {
      skipped += 1;
      continue;
    }

    const amuIndex = `${SET_AMULET_UNIQUE_PREFIX}${setOut}`;
    const srcDesc = getCell(src, cube, "description").trim() || setOut;
    const srcUnique = uniques ? findUnique(uniques, setOut) : undefined;
    const commentName = srcUnique && uniques ? getCell(srcUnique, uniques, "*ItemName").trim() : "";
    const srcName = findName(existingNames, setOut);
    const fallback = commentName || setOut.replace(/^Set/i, "").trim() || srcDesc;
    const enUS = srcName?.enUS ? withSuffix(srcName.enUS, "Amulet") : withSuffix(fallback, "Amulet");
    const koKR = srcName?.koKR ? withSuffix(srcName.koKR, "목걸이") : withSuffix(fallback, "목걸이");

    if (uniques && srcUnique && !findUnique(uniques, amuIndex)) {
      const copy = cloneRow(srcUnique, uniques);
      setCell(copy, uniques, "index", amuIndex);
      setCell(copy, uniques, "*ID", String(uid++));
      setCell(copy, uniques, "code", "amu");
      setCell(copy, uniques, "spawnable", "");
      setCell(copy, uniques, "nolimit", "1");
      setCell(copy, uniques, "*ItemName", withSuffix(commentName || fallback, "Amulet"));
      uniques.rows.push(copy);
      nUni += 1;
      names.push({ key: amuIndex, enUS, koKR });
    }
    if (uniques && !findUnique(uniques, amuIndex)) continue;

    for (const q of ["mag", "rar"] as const) {
      const row = cloneRow(src, cube);
      const tag = q === "mag" ? "매직" : "레어";
      const compact = !slot;
      setCell(
        row,
        cube,
        "description",
        compact
          ? `${SET_AMULET_DESC_PREFIX} ${srcDesc} (${tag}, 보석생략)`
          : `${SET_AMULET_DESC_PREFIX} ${srcDesc} (${tag})`,
      );
      setCell(row, cube, "enabled", "1");
      setCell(row, cube, "output", amuIndex);
      setCell(row, cube, slot ?? gemCol!, `"amu,${q}"`);
      syncNumInputs(row, cube);
      cube.rows.push(row);
      nRec += 1;
    }
  }

  return { recipes: nRec, uniques: nUni, names, skipped };
}


import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applySetAmuletTransmute,
  countedInputs,
  formatCubeField,
  INPUT_COLS,
  isSetAmuletTransmuteEnabled,
  isSetTransmuteSource,
  parseCubeField,
  recipeKind,
  recipeSummary,
} from "./cubeRecipes.ts";
import { getCell, parseTsv } from "./tsv.ts";

describe("cubeRecipes fields", () => {
  it("parses qty and quality tokens", () => {
    assert.deepEqual(parseCubeField('"r01,qty=3"'), { raw: '"r01,qty=3"', tokens: ["r01"], qty: 3 });
    assert.deepEqual(parseCubeField('"weap,sock"'), { raw: '"weap,sock"', tokens: ["weap", "sock"], qty: null });
    assert.deepEqual(parseCubeField('"useitem,qty=1"'), { raw: '"useitem,qty=1"', tokens: ["useitem"], qty: 1 });
    assert.deepEqual(parseCubeField("jew"), { raw: "jew", tokens: ["jew"], qty: null });
  });

  it("round-trips cube fields", () => {
    assert.equal(formatCubeField(["r01"], 3), '"r01,qty=3"');
    assert.equal(formatCubeField(["weap", "sock"], null), '"weap,sock"');
    assert.equal(formatCubeField(["jew"], null), "jew");
    assert.equal(formatCubeField([], null), "");
  });

  it("counts qty=3 as three inputs", () => {
    const table = parseTsv("description\tnuminputs\tinput 1\tinput 2\toutput\r\n3 El\t3\t\"r01,qty=3\"\t\tr02\r\n");
    const row = table.rows[0]!;
    assert.equal(countedInputs(row, table), 3);
    assert.equal(recipeKind(row, table), "rune");
  });

  it("summarizes a socket recipe in Korean", () => {
    const table = parseTsv(
      "description\tinput 1\tinput 2\toutput\r\nsock\t\"weap,sock\"\t\"gem2,qty=3\"\t\"usetype,mag\"\r\n",
    );
    const names = new Map<string, string>([
      ["weap", "무기"],
      ["gem2", "흠있는 보석"],
    ]);
    assert.equal(recipeSummary(table.rows[0]!, table, names), "무기 · 소켓 + 흠있는 보석 ×3 → 같은 유형 · 매직");
    assert.equal(recipeKind(table.rows[0]!, table), "socket");
  });
});

describe("set amulet transmute", () => {
  const cubeHeader =
    "description\tenabled\tversion\tnuminputs\tinput 1\tinput 2\tinput 3\tinput 4\tinput 5\tinput 6\tinput 7\toutput\tlvl\t*eol";
  const uniqueHeader = "index\t*ID\tversion\tspawnable\tnolimit\tlvl\tcode\t*ItemName\t*eol";

  it("adds mag/rar recipes and an amulet unique, then removes them", () => {
    const cube = parseTsv(
      [
        cubeHeader,
        "Civerb's Vestments\t1\t100\t13\tCiverb's Ward\tCiverb's Icon\tCiverb's Cudgel\t\"tx4,qty=10\"\t\t\t\tSetCiverb's Vestments\t255\t0",
        "Civerb's Vestments x10\t1\t100\t4\tCiverb's Ward\tCiverb's Icon\tCiverb's Cudgel\ttx6\t\t\t\tSetCiverb's Vestments\t255\t0",
      ].join("\r\n") + "\r\n",
    );
    const uniques = parseTsv(
      `${uniqueHeader}\r\nSetCiverb's Vestments\t753\t100\t\t1\t225\trin\tCiverb's Vestments\t0\r\n`,
    );
    assert.equal(isSetTransmuteSource(cube.rows[0]!, cube), true);
    assert.equal(isSetTransmuteSource(cube.rows[1]!, cube), false);

    const on = applySetAmuletTransmute(cube, uniques, true, [
      { Key: "SetCiverb's Vestments", enUS: "ÿcACiverb's Vestments", koKR: "ÿcA시버브의 예복" },
    ]);
    assert.equal(on.recipes, 2);
    assert.equal(on.uniques, 1);
    assert.equal(on.skipped, 0);
    assert.equal(isSetAmuletTransmuteEnabled(cube), true);
    assert.equal(cube.rows.length, 4);
    const mag = cube.rows.find((r) => getCell(r, cube, "description").includes("매직"))!;
    assert.equal(getCell(mag, cube, "output"), "AmuSetCiverb's Vestments");
    assert.equal(getCell(mag, cube, "input 5"), '"amu,mag"');
    assert.equal(getCell(mag, cube, "numinputs"), "14");
    const rar = cube.rows.find((r) => getCell(r, cube, "description").includes("레어"))!;
    assert.equal(getCell(rar, cube, "input 5"), '"amu,rar"');
    const amu = uniques.rows.find((r) => getCell(r, uniques, "index").startsWith("Amu"))!;
    assert.equal(getCell(amu, uniques, "code"), "amu");
    assert.equal(getCell(amu, uniques, "*ID"), "754");
    assert.equal(on.names[0]!.koKR, "ÿcA시버브의 예복 목걸이");
    assert.equal(on.names[0]!.enUS, "ÿcACiverb's Vestments Amulet");

    const again = applySetAmuletTransmute(cube, uniques, true);
    assert.equal(again.recipes, 2);
    assert.equal(cube.rows.filter((r) => getCell(r, cube, "description").startsWith("형상변환 목걸이")).length, 2);

    const off = applySetAmuletTransmute(cube, uniques, false);
    assert.equal(off.recipes, 0);
    assert.equal(isSetAmuletTransmuteEnabled(cube), false);
    assert.equal(cube.rows.length, 2);
    assert.equal(uniques.rows.length, 1);
  });

  it("skips 6-piece sets that already fill all 7 input columns", () => {
    const cube = parseTsv(
      [
        cubeHeader,
        "Immortal King\t1\t100\t16\tA\tB\tC\tD\tE\tF\t\"tx4,qty=10\"\tSetImmortal King\t255\t0",
      ].join("\r\n") + "\r\n",
    );
    const uniques = parseTsv(`${uniqueHeader}\r\nSetImmortal King\t771\t100\t\t1\t225\trin\tImmortal King\t0\r\n`);
    const on = applySetAmuletTransmute(cube, uniques, true);
    assert.equal(on.recipes, 0);
    assert.equal(on.uniques, 0);
    assert.equal(on.skipped, 1);
    assert.equal(cube.rows.length, 1);
    assert.equal(uniques.rows.length, 1);
  });

  it("adds mag/rar recipes for yupgoolg sample without colliding with ring recipes", () => {
    const cube = parseTsv(readFileSync("public/sample-data/yupgoolg/cubemain.txt", "utf8"));
    const uniques = parseTsv(readFileSync("public/sample-data/yupgoolg/uniqueitems.txt", "utf8"));
    const names = JSON.parse(readFileSync("public/sample-data/yupgoolg/item-names.json", "utf8")) as {
      Key?: string;
      enUS?: string;
      koKR?: string;
    }[];
    const before = cube.rows.length;
    const uniqueBefore = uniques.rows.length;
    const ringSigs = new Set(
      cube.rows
        .filter((r) => isSetTransmuteSource(r, cube))
        .map((r) => INPUT_COLS.map((c) => getCell(r, cube, c)).join("|")),
    );

    const on = applySetAmuletTransmute(cube, uniques, true, names);
    assert.equal(on.skipped, 3);
    assert.equal(on.recipes, 66);
    assert.equal(on.uniques, 33);
    assert.equal(cube.rows.length, before + 66);
    assert.equal(uniques.rows.length, uniqueBefore + 33);
    assert.equal(isSetAmuletTransmuteEnabled(cube), true);

    const added = cube.rows.filter((r) => getCell(r, cube, "description").startsWith("형상변환 목걸이"));
    for (const row of added) {
      const sig = INPUT_COLS.map((c) => getCell(row, cube, c)).join("|");
      assert.equal(ringSigs.has(sig), false, `amulet recipe collides: ${getCell(row, cube, "description")}`);
      const ins = INPUT_COLS.map((c) => parseCubeField(getCell(row, cube, c)));
      assert.ok(ins.some((p) => p.tokens.includes("amu") && (p.tokens.includes("mag") || p.tokens.includes("rar"))));
      assert.ok(getCell(row, cube, "output").startsWith("AmuSet"));
    }
    const civerb = names.find((n) => n.Key === "AmuSetCiverb's Vestments") || on.names.find((n) => n.key === "AmuSetCiverb's Vestments");
    assert.ok(civerb?.koKR?.includes("목걸이"));

    const off = applySetAmuletTransmute(cube, uniques, false);
    assert.equal(off.recipes, 0);
    assert.equal(cube.rows.length, before);
    assert.equal(uniques.rows.length, uniqueBefore);
  });
});

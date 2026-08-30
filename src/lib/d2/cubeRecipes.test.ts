import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countedInputs,
  formatCubeField,
  parseCubeField,
  recipeKind,
  recipeSummary,
} from "./cubeRecipes.ts";
import { parseTsv } from "./tsv.ts";

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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTsv, getCell } from "./tsv.ts";
import { tcDifficulty } from "./paths.ts";
import {
  applyRuneDropRateScale,
  restoreRuneDropRate,
  runeParentWeightStats,
  scaleIntWeight,
} from "./runeDrops.ts";

const HEADER =
  "Treasure Class\tPicks\tNoDrop\tItem1\tProb1\tItem2\tProb2\tItem3\tProb3";

function sample() {
  return parseTsv(
    [
      HEADER,
      "Runes 1\t1\t\ta01\t3\ta02\t2\t",
      "Runes 2\t1\t\ta03\t3\tRunes 1\t3\t",
      "Countess Rune\t1\t15\tRunes 6\t15\t\t",
      "Countess Rune (H)\t1\t5\tRunes 11\t6\tRunes 15\t2",
      "Act 2 Good\t5\t\tJewelry B\t20\tRunes 1\t3\tRunes 2\t3",
      "Act 5 (H) Good\t5\t\tJewelry C\t60\tRunes 17\t14\tdolls16\t14",
      "Countess (H)\t-2\t0\tCountess Item (H)\t1\tCountess Rune (H)\t1\t",
    ].join("\r\n") + "\r\n",
  );
}

describe("runeDrops", () => {
  it("classifies Act (H) Good as hell even when (H) is not at the end", () => {
    assert.equal(tcDifficulty("Act 5 (H) Good"), "hell");
    assert.equal(tcDifficulty("Act 1 (N) Good"), "nightmare");
    assert.equal(tcDifficulty("Countess (H)"), "hell");
    assert.equal(tcDifficulty("Act 2 Good"), "normal");
    assert.equal(tcDifficulty("Runes 17"), "all");
  });
  it("keeps halved weights at least 1", () => {
    assert.equal(scaleIntWeight(3, 2), 6);
    assert.equal(scaleIntWeight(3, 0.5), 2);
    assert.equal(scaleIntWeight(1, 0.5), 1);
    assert.equal(scaleIntWeight(0, 2), 0);
  });

  it("doubles parent rune weights and halves Countess NoDrop, not the ladder", () => {
    const table = sample();
    const n = applyRuneDropRateScale(table, "hell", 2);
    assert.ok(n >= 3);
    assert.equal(getCell(table.rows[0]!, table, "Prob1"), "3");
    assert.equal(getCell(table.rows[1]!, table, "Prob2"), "3");
    assert.equal(getCell(table.rows[2]!, table, "NoDrop"), "8");
    assert.equal(getCell(table.rows[3]!, table, "NoDrop"), "3");
    assert.equal(getCell(table.rows[4]!, table, "Prob2"), "3");
    assert.equal(getCell(table.rows[5]!, table, "Prob2"), "28");
    assert.equal(getCell(table.rows[6]!, table, "Prob2"), "2");
  });

  it("stacks a second double and resets to the original", () => {
    const orig = sample();
    const table = sample();
    applyRuneDropRateScale(table, "hell", 2);
    applyRuneDropRateScale(table, "hell", 2);
    assert.equal(getCell(table.rows[5]!, table, "Prob2"), "56");
    const restored = restoreRuneDropRate(table, orig);
    assert.ok(restored >= 3);
    assert.equal(getCell(table.rows[3]!, table, "NoDrop"), "5");
    assert.equal(getCell(table.rows[5]!, table, "Prob2"), "14");
    assert.equal(getCell(table.rows[6]!, table, "Prob2"), "1");
  });

  it("sums parent rune weights for the selected difficulty", () => {
    const table = sample();
    const hell = runeParentWeightStats(table, "hell");
    assert.equal(hell.n, 2);
    assert.equal(hell.weight, 15);
    const normal = runeParentWeightStats(table, "normal");
    assert.equal(normal.weight, 6);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTsv, getCell } from "./tsv.ts";
import { applyAllBeltsSixteen, isAllBeltsSixteen, pickSixteenBeltIndex } from "./belts.ts";

const SAMPLE = [
  "name\ttype\tcode\tbelt",
  "Cap\thelm\tcap\t0",
  "Sash\tbelt\tlbl\t1",
  "Light Belt\tbelt\tvbl\t4",
  "Belt\tbelt\tmbl\t0",
  "Heavy Belt\tbelt\ttbl\t5",
  "Plated Belt\tbelt\thbl\t3",
  "Demonhide Sash\tbelt\tzlb\t6",
].join("\r\n") + "\r\n";

describe("all belts 16 slots", () => {
  it("picks uber/exceptional index 6 when present", () => {
    assert.equal(pickSixteenBeltIndex(parseTsv(SAMPLE)), "6");
  });

  it("sets every belt item to the 16-slot index and restores", () => {
    const orig = parseTsv(SAMPLE);
    const table = parseTsv(SAMPLE);
    assert.equal(isAllBeltsSixteen(table), false);
    const n = applyAllBeltsSixteen(table, orig, true);
    assert.equal(n, 5);
    assert.equal(isAllBeltsSixteen(table), true);
    for (const row of table.rows) {
      if (getCell(row, table, "type") !== "belt") {
        assert.equal(getCell(row, table, "belt"), "0");
        continue;
      }
      assert.equal(getCell(row, table, "belt"), "6");
    }
    applyAllBeltsSixteen(table, orig, false);
    assert.equal(isAllBeltsSixteen(table), false);
    assert.equal(getCell(table.rows[1]!, table, "belt"), "1");
    assert.equal(getCell(table.rows[3]!, table, "belt"), "0");
    assert.equal(getCell(table.rows[6]!, table, "belt"), "6");
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTsv, getCell } from "./tsv.ts";
import { ensureElemSkillProperties } from "./itemProps.ts";

describe("elem skill properties", () => {
  it("clones fireskill into cold/lightning/poison/magic", () => {
    const table = parseTsv(
      [
        "code\t*Id\t*Enabled\tfunc1\tstat1\tset1\tval1\tfunc2\tstat2\t*Tooltip\t*eol",
        "fireskill\t103\t1\t21\titem_elemskill\t\t1\t3\titem_elemskillfire\t+# to Fire Skills\t0",
      ].join("\r\n") + "\r\n",
    );
    assert.equal(ensureElemSkillProperties(table), 4);
    assert.equal(ensureElemSkillProperties(table), 0);
    const cold = table.rows.find((r) => getCell(r, table, "code") === "coldskill")!;
    assert.equal(getCell(cold, table, "val1"), "4");
    assert.equal(getCell(cold, table, "func1"), "21");
    assert.equal(getCell(cold, table, "stat1"), "item_elemskill");
    assert.equal(getCell(cold, table, "stat2"), "");
    assert.equal(getCell(cold, table, "*Id"), "104");
    assert.equal(getCell(table.rows.find((r) => getCell(r, table, "code") === "lightningskill")!, table, "val1"), "2");
    assert.equal(getCell(table.rows.find((r) => getCell(r, table, "code") === "poisonskill")!, table, "val1"), "5");
    assert.equal(getCell(table.rows.find((r) => getCell(r, table, "code") === "magicskill")!, table, "val1"), "3");
  });

  it("builds rows from headers when fireskill is missing", () => {
    const table = parseTsv("code\t*Enabled\tfunc1\tstat1\tval1\t*eol\r\nac\t1\t1\tarmorclass\t\t0\r\n");
    assert.equal(ensureElemSkillProperties(table), 4);
    const mag = table.rows.find((r) => getCell(r, table, "code") === "magicskill")!;
    assert.equal(getCell(mag, table, "func1"), "21");
    assert.equal(getCell(mag, table, "stat1"), "item_elemskill");
    assert.equal(getCell(mag, table, "val1"), "3");
  });
});

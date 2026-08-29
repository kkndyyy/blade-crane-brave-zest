import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  blvlToPetmax,
  formatBlvlSteps,
  parseBlvlSteps,
  replaceRelatedPetmax,
  tooltipLabel,
} from "./skillOptions.ts";

describe("skillOptions", () => {
  it("parses and formats demonic mastery max-demon steps", () => {
    const expr = "((blvl>=10)?3:((blvl>=5)?2:1))";
    const steps = parseBlvlSteps(expr);
    assert.deepEqual(steps, [
      { at: 1, value: 1 },
      { at: 5, value: 2 },
      { at: 10, value: 3 },
    ]);
    assert.equal(formatBlvlSteps(steps!), expr);
  });

  it("rewrites related petmax formulas from tooltip calc", () => {
    const petmax =
      "(skill('Demonic Mastery'.blvl)>=10)?3:((skill('Demonic Mastery'.blvl)>=5)?2:1)+stat('val1'.accr)";
    const next = replaceRelatedPetmax(petmax, "Demonic Mastery", "((blvl>=10)?8:((blvl>=5)?5:3))");
    assert.equal(
      next,
      "((skill('Demonic Mastery'.blvl)>=10)?8:((skill('Demonic Mastery'.blvl)>=5)?5:3))+stat('val1'.accr)",
    );
    const flat = replaceRelatedPetmax(petmax, "Demonic Mastery", "6");
    assert.equal(flat, "6+stat('val1'.accr)");
  });

  it("strips tooltip format tokens for labels", () => {
    assert.equal(tooltipLabel("악마 최대 수: %d"), "악마 최대 수");
    assert.equal(tooltipLabel("공격력: %+d%%"), "공격력");
  });

  it("maps blvl calc onto skill() petmax core", () => {
    assert.equal(
      blvlToPetmax("Demonic Mastery", "((blvl>=10)?3:((blvl>=5)?2:1))"),
      "((skill('Demonic Mastery'.blvl)>=10)?3:((skill('Demonic Mastery'.blvl)>=5)?2:1))",
    );
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  blvlToPetmax,
  formatBindRankLine,
  formatBlvlSteps,
  parseBindRanks,
  parseBlvlSteps,
  replaceBindRankText,
  replaceRelatedPetmax,
  tooltipLabel,
  type BindRankBand,
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

  it("formats custom level breakpoints", () => {
    assert.equal(
      formatBlvlSteps([
        { at: 1, value: 2 },
        { at: 8, value: 4 },
        { at: 15, value: 6 },
      ]),
      "((blvl>=15)?6:((blvl>=8)?4:2))",
    );
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

  it("parses yupgoolg bind-demon rank bands", () => {
    const text =
      "부상당한 악마가 명령을 따르도록 만듭니다.\n\n직접 투자한 스킬이 아래 이상이어야 해당 등급 악마를 속박 가능\n일반 10 / 챔피언, 유니크 15 / 슈퍼유니크 20";
    assert.deepEqual(parseBindRanks(text), [
      { at: 10, ranks: ["normal"] },
      { at: 15, ranks: ["champion", "unique"] },
      { at: 20, ranks: ["superunique"] },
    ]);
  });

  it("formats and replaces bind rank lines", () => {
    const bands: BindRankBand[] = [
      { at: 1, ranks: ["normal"] },
      { at: 8, ranks: ["champion"] },
      { at: 12, ranks: ["unique", "superunique"] },
    ];
    assert.equal(formatBindRankLine(bands, "ko"), "일반 1 / 챔피언 8 / 유니크, 슈퍼유니크 12");
    const next = replaceBindRankText(
      "부상당한 악마가 명령을 따르도록 만듭니다.\n\n직접 투자한 스킬이 아래 이상이어야 해당 등급 악마를 속박 가능\n일반 10 / 챔피언, 유니크 15 / 슈퍼유니크 20",
      bands,
      "ko",
    );
    assert.match(next, /일반 1 \/ 챔피언 8 \/ 유니크, 슈퍼유니크 12/);
    assert.match(next, /부상당한 악마가 명령을 따르도록 만듭니다/);
    assert.deepEqual(parseBindRanks(next), [
      { at: 1, ranks: ["normal"] },
      { at: 8, ranks: ["champion"] },
      { at: 12, ranks: ["unique", "superunique"] },
    ]);
  });
});

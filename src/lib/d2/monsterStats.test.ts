import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { elTypeLabel, monsterDiffCol, umodLabel } from "./monsterStats.ts";

describe("monsterStats", () => {
  it("maps HP columns across difficulties", () => {
    assert.equal(monsterDiffCol("minHP", ""), "minHP");
    assert.equal(monsterDiffCol("minHP", "(N)"), "MinHP(N)");
    assert.equal(monsterDiffCol("A1MinD", "(H)"), "A1MinD(H)");
    assert.equal(monsterDiffCol("ResFi", "(N)"), "ResFi(N)");
  });

  it("labels elemental types and unique mods", () => {
    assert.equal(elTypeLabel("pois"), "독");
    assert.equal(elTypeLabel("ltng"), "번개");
    assert.equal(umodLabel("18"), "18 · 엑스트라 패스트");
    assert.equal(umodLabel("0"), "");
  });
});

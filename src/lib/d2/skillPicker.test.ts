import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTsv } from "./tsv.ts";
import { StringTable, koreanSkillName } from "./strings.ts";
import { groupedSkillChoices, listSkillChoices, matchSkillChoice } from "./skillPicker.ts";

const SKILLS = parseTsv(
  [
    "skill\t*Id\tskilldesc\tcharclass",
    "Attack\t0\tattack\t",
    "Fire Bolt\t36\tfirebolt\tsor",
    "Telekinesis\t43\ttelekinesis\tsor",
    "Teleport\t54\tteleport\tsor",
    "Bone Armor\t68\tbone armor\tnec",
  ].join("\r\n") + "\r\n",
);

function strings() {
  const t = new StringTable();
  t.add([
    { Key: "skillname36", enUS: "Fire Bolt", koKR: "파이어 볼트" },
  ]);
  return t;
}

describe("skill picker", () => {
  it("matches par by numeric id or English name", () => {
    const choices = listSkillChoices(SKILLS, undefined, strings());
    assert.equal(matchSkillChoice("36", choices)?.skill, "Fire Bolt");
    assert.equal(matchSkillChoice("Fire Bolt", choices)?.id, "36");
    assert.equal(matchSkillChoice("teleport", choices)?.id, "54");
    assert.equal(matchSkillChoice("999", choices), undefined);
  });

  it("groups by Korean class name", () => {
    const groups = groupedSkillChoices(listSkillChoices(SKILLS, undefined, strings()));
    assert.deepEqual(
      groups.map((g) => g.group),
      ["소서리스", "네크로맨서", "공용/몬스터"],
    );
  });

  it("resolves numeric skill par to the Korean title", () => {
    const name = koreanSkillName(strings(), { skill: "36", skillsTable: SKILLS });
    assert.equal(name, "파이어 볼트");
  });
});

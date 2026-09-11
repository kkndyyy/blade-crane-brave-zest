import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTsv, getCell } from "./tsv.ts";
import {
  parseSynergyCalc,
  formatSynergyCalc,
  assignParams,
  applySynergyToSkill,
  applySynergyDesc,
} from "./skillSynergy.ts";

describe("skill synergy parse/format", () => {
  it("parses uniform (skill+skill)*par8", () => {
    const p = parseSynergyCalc("(skill('Fire Bolt'.blvl)+skill('Meteor'.blvl))*par8", { 8: 14 });
    assert.equal(p.editable, true);
    assert.deepEqual(
      p.terms.map((t) => [t.skill, t.percent, t.percentSrc]),
      [
        ["Fire Bolt", 14, { kind: "par", n: 8 }],
        ["Meteor", 14, { kind: "par", n: 8 }],
      ],
    );
    assert.equal(formatSynergyCalc(p), "(skill('Fire Bolt'.blvl)+skill('Meteor'.blvl))*par8");
  });

  it("parses a single skill*par8", () => {
    const p = parseSynergyCalc("skill('Warmth'.blvl)*par8", { 8: 16 });
    assert.equal(p.terms.length, 1);
    assert.equal(p.terms[0]!.skill, "Warmth");
    assert.equal(p.terms[0]!.percent, 16);
    assert.equal(formatSynergyCalc(p), "skill('Warmth'.blvl)*par8");
  });

  it("parses per-skill par7/par8 like Fire Wall", () => {
    const p = parseSynergyCalc("(skill('Warmth'.blvl) * par8) + (skill('Inferno'.blvl) * par7)", { 7: 1, 8: 4 });
    assert.equal(p.editable, true);
    assert.equal(p.terms[0]!.skill, "Warmth");
    assert.equal(p.terms[0]!.percent, 4);
    assert.equal(p.terms[1]!.skill, "Inferno");
    assert.equal(p.terms[1]!.percent, 1);
    assert.equal(formatSynergyCalc(p), "(skill('Warmth'.blvl)*par8)+(skill('Inferno'.blvl)*par7)");
  });

  it("keeps leftover extra on Holy-Bolt-like formulas", () => {
    const p = parseSynergyCalc("skill('Fist of the Heavens'.blvl)*par8+stat('passive_mag_mastery'.accr)", { 8: 50 });
    assert.equal(p.terms[0]!.skill, "Fist of the Heavens");
    assert.match(p.extra, /stat\(/);
  });

  it("collapses equal percents onto one param", () => {
    const assigned = assignParams(
      [
        { skill: "A", stat: "blvl", percent: 10, percentSrc: { kind: "par", n: 8 } },
        { skill: "B", stat: "blvl", percent: 10, percentSrc: { kind: "literal" } },
      ],
      "edmg",
    );
    assert.ok(assigned.every((t) => t.percentSrc.kind === "par" && t.percentSrc.n === 8));
  });
});

describe("skill synergy apply", () => {
  it("writes the calc, param, and skilldesc synergy lines", () => {
    const skills = parseTsv(
      [
        "skill\t*Id\tskilldesc\tEType\tParam7\tParam8\tEDmgSymPerCalc\tDmgSymPerCalc\tELenSymPerCalc",
        "Fire Ball\t47\tfireball\tfire\t\t14\t(skill('Fire Bolt'.blvl)+skill('Meteor'.blvl))*par8\t\t",
        "Fire Bolt\t36\tfirebolt\tfire\t\t16\t\t\t",
        "Meteor\t56\tmeteor\tfire\t\t5\t\t\t",
        "Warmth\t37\twarmth\tfire\t\t\t\t\t",
      ].join("\r\n") + "\r\n",
    );
    const skilldesc = parseTsv(
      [
        "skilldesc\tdsc3line1\tdsc3texta1\tdsc3textb1\tdsc3calca1\tdsc3calcb1\tdsc3line2\tdsc3texta2\tdsc3textb2\tdsc3calca2\tdsc3calcb2\tdsc3line3\tdsc3texta3\tdsc3textb3\tdsc3calca3\tdsc3calcb3\tdsc3line4\tdsc3texta4\tdsc3textb4\tdsc3calca4\tdsc3calcb4\tdsc3line5\tdsc3texta5\tdsc3textb5\tdsc3calca5\tdsc3calcb5\tdsc3line6\tdsc3texta6\tdsc3textb6\tdsc3calca6\tdsc3calcb6\tdsc3line7\tdsc3texta7\tdsc3textb7\tdsc3calca7\tdsc3calcb7",
        "fireball\t40\tSksyn\tskillname47\t2\t\t76\tFiredplev\tskillname36\tpar8\t\t76\tFiredplev\tskillname56\tpar8\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t",
      ].join("\r\n") + "\r\n",
    );
    applySynergyToSkill(
      skills,
      0,
      "edmg",
      [
        { skill: "Fire Bolt", stat: "blvl", percent: 20, percentSrc: { kind: "par", n: 8 } },
        { skill: "Warmth", stat: "blvl", percent: 20, percentSrc: { kind: "par", n: 8 } },
      ],
      "",
    );
    assert.equal(getCell(skills.rows[0]!, skills, "EDmgSymPerCalc"), "(skill('Fire Bolt'.blvl)+skill('Warmth'.blvl))*par8");
    assert.equal(getCell(skills.rows[0]!, skills, "Param8"), "20");
    applySynergyDesc(skills, skilldesc, 0);
    assert.equal(getCell(skilldesc.rows[0]!, skilldesc, "dsc3textb2"), "skillname36");
    assert.equal(getCell(skilldesc.rows[0]!, skilldesc, "dsc3textb3"), "skillname37");
    assert.equal(getCell(skilldesc.rows[0]!, skilldesc, "dsc3calca3"), "par8");
    assert.equal(getCell(skilldesc.rows[0]!, skilldesc, "dsc3line4"), "");
  });
});

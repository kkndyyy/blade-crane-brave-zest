import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTsv, getCell } from "./tsv.ts";
import {
  applyMissileMirrors,
  countAtLevel,
  listMissileCountFields,
  missileCountParamCols,
} from "./skillMissiles.ts";

function table(rows: string[]) {
  return parseTsv(rows.join("\r\n") + "\r\n");
}

describe("missile count fields", () => {
  it("reads charged-bolt baseline + per level", () => {
    const skills = table([
      "skill\tsrvdofunc\tskilldesc\tParam1\t*Param1 Description\tParam2\t*Param2 Description\tParam8\t*Param8 Description",
      "Charged Bolt\t17\tchargedbolt\t3\t# of Bolt Missiles created baseline\t1\t# of Bolt Missiles created per level\t6\tDamage synergy",
    ]);
    const fields = listMissileCountFields(skills.rows[0]!, skills);
    assert.equal(fields.length, 1);
    assert.equal(fields[0]!.kind, "ln");
    assert.equal(fields[0]!.baseCol, "Param1");
    assert.equal(fields[0]!.perCol, "Param2");
    assert.equal(countAtLevel(fields[0]!, 3, 1, 1), 3);
    assert.equal(countAtLevel(fields[0]!, 3, 1, 10), 12);
  });

  it("reads a fixed twister count", () => {
    const skills = table([
      "skill\tsrvdofunc\tParam1\t*Param1 Description\tParam2\t*Param2 Description",
      "Twister\t118\t3\t# of Missiles created\t10\tStun Length",
    ]);
    const fields = listMissileCountFields(skills.rows[0]!, skills);
    assert.equal(fields[0]!.kind, "fixed");
    assert.equal(fields[0]!.baseCol, "Param1");
  });

  it("reads strafe min/max shots", () => {
    const skills = table([
      "skill\tsrvdofunc\tParam3\t*Param3 Description\tParam4\t*Param4 Description",
      "Strafe\t12\t4\t# of shots fired Min (+1 per level)\t10\t# of shots fired Max",
    ]);
    const fields = listMissileCountFields(skills.rows[0]!, skills);
    assert.equal(fields[0]!.kind, "minmax");
    assert.equal(countAtLevel(fields[0]!, 4, 10, 1), 4);
    assert.equal(countAtLevel(fields[0]!, 4, 10, 20), 10);
  });

  it("reads shock-field every-N-levels extra missile", () => {
    const skills = table([
      "skill\tsrvdofunc\tParam1\t*Param1 Description\tParam2\t*Param2 Description",
      "Shock Field\t43\t6\t# of Missiles created\t5\t# of Levels needed per Missile created gained",
    ]);
    const fields = listMissileCountFields(skills.rows[0]!, skills);
    assert.equal(fields[0]!.kind, "every");
    assert.equal(countAtLevel(fields[0]!, 6, 5, 1), 6);
    assert.equal(countAtLevel(fields[0]!, 6, 5, 6), 7);
  });

  it("parses sentry mirror targets and writes them", () => {
    const skills = table([
      "skill\tsrvdofunc\tParam1\t*Param1 Description\tParam3\t*Param3 Description\tParam4\t*Param4 Description\tParam8\t*Param8 Description",
      "Charged Bolt Sentry\t45\t5\t# of shots (must match BoltSentry Param8)\t4\t# of Bolt Missiles created baseline (must match BoltSentry Param1)\t1\t# of Bolt Missiles created per level (must match BoltSentry Param2)\t\tDamage synergy",
      "BoltSentry\t17\t4\t# of Bolt Missiles created baseline\t1\t# of Bolt Missiles created per level\t5\t# of shots",
    ]);
    const fields = listMissileCountFields(skills.rows[0]!, skills);
    const cols = [...missileCountParamCols(fields)].sort();
    assert.ok(cols.includes("Param1"));
    assert.ok(cols.includes("Param3"));
    const ln = fields.find((f) => f.kind === "ln")!;
    assert.deepEqual(ln.baseMirrors, [{ skill: "BoltSentry", col: "Param1" }]);
    assert.deepEqual(ln.perMirrors, [{ skill: "BoltSentry", col: "Param2" }]);
    applyMissileMirrors(skills, [{ skill: "BoltSentry", col: "Param8" }], "9");
    assert.equal(getCell(skills.rows[1]!, skills, "Param8"), "9");
  });

  it("respects tooltip caps", () => {
    const skills = table([
      "skill\tsrvdofunc\tskilldesc\tParam1\t*Param1 Description\tParam2\t*Param2 Description",
      "Charged Bolt\t17\tchargedbolt\t3\t# of Bolt Missiles created baseline\t1\t# of Bolt Missiles created per level",
    ]);
    const skilldesc = table([
      "skilldesc\tdescline1\tdesctexta1\tdesccalca1",
      'chargedbolt\t74\tStrSkill27\t"min(24,ln12)"',
    ]);
    const fields = listMissileCountFields(skills.rows[0]!, skills, skilldesc);
    assert.equal(fields[0]!.cap, 24);
    assert.equal(countAtLevel(fields[0]!, 3, 1, 40), 24);
  });
});

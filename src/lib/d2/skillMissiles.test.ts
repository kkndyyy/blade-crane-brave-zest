import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTsv, getCell } from "./tsv.ts";
import {
  applyMissileMirrors,
  canonicalMissileName,
  countAtLevel,
  countInputValue,
  enableMissileCount,
  isSimpleMissileSkill,
  listMissileCountFields,
  missileCountParamCols,
  pickCountSlots,
  rewriteParamRefs,
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

  it("offers a synthetic count editor for fire-bolt-like skills", () => {
    const skills = table([
      "skill\tsrvdofunc\tcltdofunc\tsrvmissile\tcltmissile\tsrvmissilea\tcltmissilea\tParam1\t*Param1 Description\tParam2\t*Param2 Description\tParam3\tskilldesc",
      "Fire Bolt\t\t\tfirebolt\tfirebolt\t\t\t\t\t\t\t\tfirebolt",
    ]);
    assert.equal(isSimpleMissileSkill(skills.rows[0]!, skills), true);
    const fields = listMissileCountFields(skills.rows[0]!, skills);
    assert.equal(fields[0]!.synthetic, true);
    assert.equal(fields[0]!.baseCol, "Param1");
  });

  it("keeps fire ball explosion on Param1 and fires the vanilla missile", () => {
    const skills = table([
      "skill\tsrvdofunc\tcltdofunc\tsrvmissile\tcltmissile\tsrvmissilea\tsrvmissileb\tcltmissilea\tcltmissileb\tcalc1\t*calc1 desc\tcalc2\t*calc2 desc\tcalc3\tParam1\t*Param1 Description\tParam2\t*Param2 Description\tParam3\t*Param3 Description\tParam4\t*Param4 Description\tParam8\tskilldesc",
      "Fire Ball\t\t\tfireball\tfireball\t\t\t\t\tpar1\tExplosion Radius\t\t\t\t4\tExplosion Radius\t\t\t\t\t\t\t14\tfire ball",
    ]);
    const missiles = table([
      "Missile\t*ID\tsHitPar1\t*server hit param1 desc\tSkill",
      'fireball\t62\t0\t"Explosion Radius (If 0, then use Skill Calc1)"\tFire Ball',
    ]);
    const slots = pickCountSlots(skills.rows[0]!, skills);
    assert.deepEqual(slots, { baseN: 2, perN: 4, actN: 3 });
    assert.equal(listMissileCountFields(skills.rows[0]!, skills)[0]!.baseCol, "Param2");
    assert.equal(
      countInputValue(listMissileCountFields(skills.rows[0]!, skills)[0]!, skills.rows[0]!, skills, "Param2"),
      "1",
    );
    const skilldesc = table([
      "skilldesc\tdescline1\tdesctexta1\tdesccalca1\tdsc2line1\tdsc2texta1\tdsc2calca1\tdescline2\tdesctexta2\tdesccalca2",
      "fire ball\t75\tStrSkill5\tenma\t36\tStrSkillRadiusSingular\tpar1*2\t\t\t",
    ]);
    assert.equal(enableMissileCount(skills, 0, skilldesc, undefined, missiles), true);
    const row = skills.rows[0]!;
    assert.equal(getCell(row, skills, "Param1"), "4");
    assert.match(getCell(row, skills, "*Param1 Description"), /Explosion Radius/i);
    assert.equal(getCell(row, skills, "Param2"), "1");
    assert.equal(getCell(row, skills, "Param4"), "0");
    assert.equal(getCell(row, skills, "calc1"), "min(24,ln24)");
    assert.equal(getCell(row, skills, "calc2"), "par3");
    assert.equal(getCell(row, skills, "calc3"), "min(24,ln24)");
    assert.equal(getCell(skilldesc.rows[0]!, skilldesc, "dsc2calca1"), "par1*2");
    assert.equal(getCell(row, skills, "srvdofunc"), "8");
    assert.equal(getCell(row, skills, "srvmissilea"), "fireball");
    assert.equal(getCell(row, skills, "srvmissileb"), "fireball");
    assert.equal(missiles.rows.filter((r) => getCell(r, missiles, "Missile") === "fireballp").length, 0);
    assert.equal(getCell(missiles.rows[0]!, missiles, "sHitPar1"), "4");
  });

  it("rewrites fireballp clones back onto fireball and fills calc3", () => {
    const header =
      "skill\tsrvdofunc\tcltdofunc\tsrvmissile\tsrvmissilea\tsrvmissileb\tcltmissilea\tcltmissileb\tcalc1\tcalc2\tcalc3\tParam1\t*Param1 Description\tParam2\t*Param2 Description\tParam3\t*Param3 Description\tParam4\t*Param4 Description";
    const skills = table([
      header,
      "Fire Ball\t8\t17\t\tfireballp\tfireballp\tfireballp\tfireballp\tmin(24,ln24)\tpar3\t\t8\tExplosion Radius\t2\t# of Missiles created baseline\t1\tMissile Activation Frame\t0\t# of Missiles created per level",
    ]);
    const missiles = table([
      "Missile\t*ID\tsHitPar1\tSkill",
      "fireball\t62\t0\tFire Ball",
      "fireballp\t1044\t8\tFire Ball",
    ]);
    assert.equal(canonicalMissileName("fireballp", missiles), "fireball");
    assert.equal(enableMissileCount(skills, 0, undefined, undefined, missiles), true);
    const row = skills.rows[0]!;
    assert.equal(getCell(row, skills, "srvmissilea"), "fireball");
    assert.equal(getCell(row, skills, "srvmissileb"), "fireball");
    assert.equal(getCell(row, skills, "cltmissilea"), "fireball");
    assert.equal(getCell(row, skills, "calc3"), "min(24,ln24)");
    assert.equal(getCell(row, skills, "Param1"), "8");
    assert.equal(getCell(missiles.rows[0]!, missiles, "sHitPar1"), "8");
  });

  it("restores stolen explosion radius back onto Param1", () => {
    const header =
      "skill\tsrvdofunc\tcltdofunc\tsrvmissile\tcltmissile\tsrvmissilea\tsrvmissileb\tcltmissilea\tcalc1\tParam1\t*Param1 Description\tParam2\t*Param2 Description\tParam3\tParam4\t*Param4 Description\tParam8\tskilldesc";
    const orig = table([header, "Fire Ball\t\t\tfireball\tfireball\t\t\t\tpar1\t4\tExplosion Radius\t\t\t\t\t\t14\tfire ball"]);
    const skills = table([header, "Fire Ball\t8\t17\t\t\tfireball\t\t\tpar4\t1\t# of Missiles created baseline\t0\t# of Missiles created per level\t1\t4\tExplosion Radius\t14\tfire ball"]);
    const missiles = table([
      "Missile\t*ID\tsHitPar1\tSkill",
      "fireball\t62\t0\tFire Ball",
    ]);
    assert.equal(enableMissileCount(skills, 0, undefined, orig, missiles), true);
    assert.equal(getCell(skills.rows[0]!, skills, "Param1"), "4");
    assert.match(getCell(skills.rows[0]!, skills, "*Param1 Description"), /Explosion Radius/i);
    assert.match(getCell(skills.rows[0]!, skills, "calc1"), /ln\d{2}/);
    assert.equal(getCell(skills.rows[0]!, skills, "srvmissilea"), "fireball");
  });

  it("rewrites ln12 when freeze params move", () => {
    assert.equal(rewriteParamRefs("ln12", 1, 4), "ln42");
    assert.equal(rewriteParamRefs("ln42", 2, 5), "ln45");
    assert.equal(rewriteParamRefs("min(24,ln12)", 1, 4), "min(24,ln42)");
    assert.equal(rewriteParamRefs("par10+par1", 1, 4), "par10+par4");
  });

  it("enables func-8 multi-missile and writes count params", () => {
    const skills = table([
      "skill\tsrvdofunc\tcltdofunc\tsrvmissile\tcltmissile\tsrvmissilea\tsrvmissileb\tcltmissilea\tcltmissileb\tcalc1\tcalc2\tcalc3\tParam1\t*Param1 Description\tParam2\t*Param2 Description\tParam3\tskilldesc",
      "Fire Bolt\t\t\tfirebolt\tfirebolt\t\t\t\t\t\t\t\t\t\t\t\t\tfirebolt",
    ]);
    const skilldesc = table([
      "skilldesc\tdescline1\tdesctexta1\tdesccalca1\tdescline2\tdesctexta2\tdesccalca2",
      "firebolt\t75\tStrSkill5\tenma\t\t\t",
    ]);
    assert.equal(enableMissileCount(skills, 0, skilldesc), true);
    const row = skills.rows[0]!;
    assert.equal(getCell(row, skills, "srvdofunc"), "8");
    assert.equal(getCell(row, skills, "cltdofunc"), "17");
    assert.equal(getCell(row, skills, "srvmissile"), "");
    assert.equal(getCell(row, skills, "srvmissilea"), "firebolt");
    assert.equal(getCell(row, skills, "cltmissilea"), "firebolt");
    assert.equal(getCell(row, skills, "srvmissileb"), "firebolt");
    assert.equal(getCell(row, skills, "Param1"), "1");
    assert.equal(getCell(row, skills, "Param2"), "0");
    assert.equal(getCell(row, skills, "Param3"), "1");
    assert.match(getCell(row, skills, "*Param1 Description"), /Missiles created baseline/i);
    assert.equal(getCell(row, skills, "calc1"), "min(24,ln12)");
    assert.equal(getCell(row, skills, "calc3"), "min(24,ln12)");
    assert.equal(getCell(skilldesc.rows[0]!, skilldesc, "desccalca2"), "min(24,ln12)");
    const fields = listMissileCountFields(row, skills, skilldesc);
    assert.equal(fields[0]!.synthetic, undefined);
    assert.equal(fields[0]!.kind, "ln");
  });
});

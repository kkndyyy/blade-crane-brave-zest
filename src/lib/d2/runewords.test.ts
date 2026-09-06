import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTsv } from "./tsv.ts";
import type { RuneNameLookup } from "./runewords.ts";
import {
  filledRuneCount,
  formatRunesUsed,
  hasRuneGap,
  itemTypeLabel,
  listItemTypeChoices,
  listRuneChoices,
  runeLabel,
  runeSlots,
  runewordRuneSummary,
  runewordTypeSummary,
  typeSlots,
  ITYPE_SLOTS,
} from "./runewords.ts";

function strings(): RuneNameLookup {
  const map: Record<string, { ko: string; en: string }> = {
    r01L: { ko: "엘", en: "El" },
    r07L: { ko: "탈", en: "Tal" },
    r08L: { ko: "랄", en: "Ral" },
    r09L: { ko: "오르트", en: "Ort" },
  };
  return { lookup: (key) => (key ? map[key] ?? null : null) };
}

describe("runeword rune recipe", () => {
  it("labels r01 as El / 엘 from the L key", () => {
    const s = strings();
    assert.deepEqual(runeLabel("r01", s), { ko: "엘", en: "El" });
    assert.deepEqual(runeLabel("r08", s), { ko: "랄", en: "Ral" });
  });

  it("builds *RunesUsed and Korean summary", () => {
    const s = strings();
    assert.equal(formatRunesUsed(["r08", "r09", "r07"], s), "RalOrtTal");
    assert.equal(runewordRuneSummary(["r08", "r09", "r07"], s), "랄 + 오르트 + 탈");
  });

  it("reads six rune slots and flags gaps", () => {
    const table = parseTsv("Name\tRune1\tRune2\tRune3\tRune4\tRune5\tRune6\r\nPledge\tr08\tr09\tr07\t\t\t\r\n");
    const codes = runeSlots(table.rows[0]!, table);
    assert.deepEqual(codes, ["r08", "r09", "r07", "", "", ""]);
    assert.equal(filledRuneCount(codes), 3);
    assert.equal(hasRuneGap(codes), false);
    assert.equal(hasRuneGap(["r08", "", "r07", "", "", ""]), true);
  });

  it("lists misc runes and keeps unknown extra codes", () => {
    const misc = parseTsv("name\tcode\ttype\r\nEl Rune\tr01\trune\r\nEl Stack\ta01\trunx\r\nGem\tgcv\tgem\r\n");
    const list = listRuneChoices(misc, strings(), ["r99"]);
    assert.deepEqual(
      list.map((c) => c.code),
      ["r01", "a01", "r99"],
    );
    assert.equal(list[0]!.group, "일반");
    assert.equal(list[1]!.group, "스택");
    assert.equal(list[2]!.ko, "r99");
  });

  it("labels runeword item types in Korean", () => {
    const types = parseTsv("ItemType\tCode\tEquiv1\tEquiv2\tMaxSockets3\r\nWeapon\tweap\t\t\t0\r\nArmor\ttors\tarmo\t\t3\r\nDolls\tdols\t\t\t6\r\n");
    assert.equal(itemTypeLabel("weap", types), "무기");
    assert.equal(itemTypeLabel("tors", types), "갑옷");
    assert.equal(itemTypeLabel("dols", types), "피규어");
    const list = listItemTypeChoices(types, ["xyz"]);
    assert.equal(list.find((c) => c.code === "weap")?.group, "무기");
    assert.equal(list.find((c) => c.code === "tors")?.group, "방어구");
    assert.equal(list.find((c) => c.code === "dols")?.group, "피규어");
    assert.equal(list.find((c) => c.code === "xyz")?.group, "기타");
  });

  it("reads itype slots and summarizes them", () => {
    const table = parseTsv("Name\titype1\titype2\titype3\titype4\titype5\titype6\r\nSpirit\tweap\tshld\t\t\t\t\r\n");
    const codes = typeSlots(table.rows[0]!, table, ITYPE_SLOTS);
    assert.deepEqual(codes, ["weap", "shld", "", "", "", ""]);
    assert.equal(runewordTypeSummary(codes.filter(Boolean)), "무기 · 방패(전체)");
  });
});

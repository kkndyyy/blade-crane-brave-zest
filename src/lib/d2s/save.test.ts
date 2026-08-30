import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTsv } from "../d2/tsv.ts";
import { BitReader, BitWriter } from "./bits.ts";
import { computeChecksum, patchSizeAndChecksum, verifyChecksum } from "./checksum.ts";
import { decodeItemCode, encodeItemCode } from "./huffman.ts";
import { parseItemStatCost } from "./itemstatcost.ts";
import { buildCatalog } from "./catalog.ts";
import { duplicateItem, parseSave, rebuildSave } from "./save.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

function loadPack() {
  const sample = join(root, "public/sample-data/yupgoolg");
  const stats = parseItemStatCost(readFileSync(join(sample, "itemstatcost.txt"), "utf8"));
  const catalog = buildCatalog({
    armor: parseTsv(readFileSync(join(sample, "armor.txt"), "utf8")),
    weapons: parseTsv(readFileSync(join(sample, "weapons.txt"), "utf8")),
    misc: parseTsv(readFileSync(join(sample, "misc.txt"), "utf8")),
    itemTypes: parseTsv(readFileSync(join(sample, "itemtypes.txt"), "utf8")),
    uniqueItems: parseTsv(readFileSync(join(sample, "uniqueitems.txt"), "utf8")),
    setItems: parseTsv(readFileSync(join(sample, "setitems.txt"), "utf8")),
  });
  return { stats, catalog };
}

describe("d2s bits and checksum", () => {
  it("round-trips huffman item codes", () => {
    for (const code of ["key", "r22", "cm3", "hp5", "gld"]) {
      const w = new BitWriter();
      encodeItemCode(w, code);
      const bytes = w.toBytes();
      const r = new BitReader(bytes);
      assert.equal(decodeItemCode(r), code);
    }
  });

  it("verifies and rewrites the warlock checksum", () => {
    const data = new Uint8Array(readFileSync(join(here, "fixtures/warlock.d2s")));
    assert.equal(verifyChecksum(data), true);
    const patched = patchSizeAndChecksum(data);
    assert.equal(verifyChecksum(patched), true);
    assert.equal(computeChecksum(patched), computeChecksum(data));
  });
});

describe("d2s save editor", () => {
  const pack = loadPack();
  const raw = new Uint8Array(readFileSync(join(here, "fixtures/warlock.d2s")));

  it("parses the warlock save including gold and stacked keys", () => {
    const save = parseSave(raw, pack.stats, pack.catalog);
    assert.equal(save.name, "악마술사");
    assert.equal(save.classId, 7);
    assert.equal(save.gold, 87220);
    assert.equal(save.stashGold, 422608);
    assert.equal(save.items.length, 60);
    const key = save.items.find((it) => it.code === "key");
    assert.ok(key);
    assert.equal(key!.quantity, 500);
    const tome = save.items.find((it) => it.code === "ibk");
    assert.ok(tome);
    assert.equal(tome!.quantity, 96);
  });

  it("changes stack quantity and keeps a valid checksum", () => {
    const save = parseSave(raw, pack.stats, pack.catalog);
    const items = save.items.map((it) => (it.code === "key" ? { ...it, quantity: 77 } : it));
    const out = rebuildSave(save, pack.stats, pack.catalog, { items, gold: 1000, stashGold: 2000 });
    assert.equal(verifyChecksum(out), true);
    const again = parseSave(out, pack.stats, pack.catalog);
    assert.equal(again.gold, 1000);
    assert.equal(again.stashGold, 2000);
    assert.equal(again.items.find((it) => it.code === "key")?.quantity, 77);
    assert.equal(again.items.length, 60);
  });

  it("clones an item with a new seed into a free slot", () => {
    const save = parseSave(raw, pack.stats, pack.catalog);
    const boxIdx = save.items.findIndex((it) => it.code === "box");
    assert.ok(boxIdx >= 0);
    const copy = duplicateItem(save, boxIdx);
    assert.notEqual(copy.seed, save.items[boxIdx]!.seed);
    const out = rebuildSave(save, pack.stats, pack.catalog, { items: [...save.items, copy] });
    const again = parseSave(out, pack.stats, pack.catalog);
    assert.equal(again.items.length, 61);
    const boxes = again.items.filter((it) => it.code === "box");
    assert.equal(boxes.length, 2);
    assert.notEqual(boxes[0]!.seed, boxes[1]!.seed);
  });
});

import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applySetAmuletTransmute,
  countedInputs,
  formatCubeField,
  INPUT_COLS,
  isSetAmuletTransmuteEnabled,
  isSetTransmuteSource,
  parseCubeField,
  recipeKind,
  recipeSummary,
} from "./cubeRecipes.ts";
import { getCell, parseTsv } from "./tsv.ts";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/camera/toggle-field.tsx", "utf8");

test("toggle thumb is anchored inside its track", () => {
  assert.match(source, /absolute left-1 top-1 h-4 w-4/);
  assert.match(source, /checked \? "translate-x-5" : "translate-x-0"/);
});

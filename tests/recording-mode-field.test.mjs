import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/pages/camera.tsx", "utf8");

test("recordingModes constant defines off, always, and motion", () => {
  assert.match(source, /const recordingModes\b/);
  assert.match(source, /value: "off"/);
  assert.match(source, /value: "always"/);
  assert.match(source, /value: "motion"/);
});

test("SelectField component renders a native select with options", () => {
  assert.match(source, /function SelectField\(/);
  assert.match(source, /<select/);
  assert.match(source, /<option key=/);
});

test("recording mode field uses SelectField, not a free-text input", () => {
  assert.match(source, /<SelectField\s+label="Recording mode"/);
  assert.doesNotMatch(source, /<TextField\s+label="Recording mode"/);
});

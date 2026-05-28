import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const constantsSource = readFileSync("src/components/camera/camera-constants.ts", "utf8");
const modalSource = readFileSync("src/components/camera/camera-form-modal.tsx", "utf8");
const selectFieldSource = readFileSync("src/components/common/select-field.tsx", "utf8");

test("recordingModes constant defines off, always, and motion", () => {
  assert.match(constantsSource, /recordingModes\b/);
  assert.match(constantsSource, /value: "off"/);
  assert.match(constantsSource, /value: "always"/);
  assert.match(constantsSource, /value: "motion"/);
});

test("SelectField component renders a native select with options", () => {
  assert.match(selectFieldSource, /function SelectField\(/);
  assert.match(selectFieldSource, /<select/);
  assert.match(selectFieldSource, /<option key=/);
});

test("recording mode field uses SelectField, not a free-text input", () => {
  assert.match(modalSource, /<SelectField\s+label="Recording mode"/);
  assert.doesNotMatch(modalSource, /<TextField\s+label="Recording mode"/);
});

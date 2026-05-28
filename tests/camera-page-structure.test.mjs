import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync("src/pages/camera.tsx", "utf8");

test("camera page delegates UI and logic to feature modules", () => {
  assert.match(pageSource, /from "@\/components\/camera\/camera-dashboard"/);
  assert.match(pageSource, /from "@\/hooks\/use-camera-manager"/);
  assert.doesNotMatch(pageSource, /function CameraFormModal/);
  assert.doesNotMatch(pageSource, /function CameraCard/);
  assert.doesNotMatch(pageSource, /function ToggleField/);
});

# Recording Mode Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the camera form's free-text `recordingMode` input with a dropdown limited to `off` / `always` / `motion`, defaulting to `off`.

**Architecture:** Two source files change. `src/lib/camera-view-model.js` gains an `|| "off"` fallback so the form always starts on a valid mode. `src/pages/camera.tsx` gets a new `SelectField` presentational component (a native `<select>` styled like the existing `TextField`) and a `recordingModes` options constant; the existing `TextField` for "Recording mode" is swapped for `SelectField`. This is plain React/JSX — no Next.js APIs are touched, so no framework docs need consulting. The `recordingEnabled` toggle and the backend payload contract are unchanged.

**Tech Stack:** Next.js 16 (React 19, TypeScript), Tailwind CSS v4. Tests are `node:test` files in `tests/` run with `node --test`.

---

## Spec

Design doc: `docs/superpowers/specs/2026-05-21-recording-mode-dropdown-design.md`

| Field | Type | Default | Values |
|-------|------|---------|--------|
| `recordingMode` | string | `off` | `off` = no recording · `always` = continuous recording · `motion` = keep only motion segments |

## File Structure

- **Modify** `src/lib/camera-view-model.js` — `getCameraFormDefaults` defaults `recordingMode` to `"off"` when the camera value is empty/missing.
- **Modify** `src/pages/camera.tsx` — add `recordingModes` constant, add `SelectField` component, swap the "Recording mode" `TextField` for `SelectField`.
- **Modify** `tests/camera-view-model.test.mjs` — add a test for the `off` default.
- **Create** `tests/recording-mode-field.test.mjs` — source-text test asserting the form uses `SelectField` with the three options (mirrors the existing `tests/camera-toggle-source.test.mjs` pattern).

---

## Task 1: Default `recordingMode` to `off` in the view model

**Files:**
- Modify: `src/lib/camera-view-model.js:150`
- Test: `tests/camera-view-model.test.mjs`

- [ ] **Step 1: Write the failing test**

Append this test to the end of `tests/camera-view-model.test.mjs` (after the `buildCameraPayload` test, after line 144):

```js
test("getCameraFormDefaults defaults recordingMode to off when missing or blank", () => {
  assert.equal(getCameraFormDefaults().recordingMode, "off");
  assert.equal(getCameraFormDefaults({ recordingMode: "" }).recordingMode, "off");
  assert.equal(getCameraFormDefaults({ recordingMode: "   " }).recordingMode, "off");
  assert.equal(
    getCameraFormDefaults({ recordingMode: "motion" }).recordingMode,
    "motion",
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/camera-view-model.test.mjs`
Expected: FAIL — the new test reports `'' !== 'off'` (current code returns an empty string for a missing/blank `recordingMode`). The other 5 tests still pass.

- [ ] **Step 3: Write the minimal implementation**

In `src/lib/camera-view-model.js`, change line 150 inside `getCameraFormDefaults`.

From:

```js
    recordingMode: asText(camera.recordingMode),
```

To:

```js
    recordingMode: asText(camera.recordingMode) || "off",
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/camera-view-model.test.mjs`
Expected: PASS — all 7 tests pass (the pre-existing `getCameraFormDefaults` test with `recordingMode: "continuous"` is unaffected because `"continuous"` is truthy).

- [ ] **Step 5: Commit**

```bash
git add src/lib/camera-view-model.js tests/camera-view-model.test.mjs
git commit -m "feat: default camera recordingMode to off"
```

---

## Task 2: Add `SelectField` and swap the recording mode input

**Files:**
- Modify: `src/pages/camera.tsx` (add constant near line 64, add component near line 188, swap field at lines 310-314)
- Test: `tests/recording-mode-field.test.mjs` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/recording-mode-field.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/recording-mode-field.test.mjs`
Expected: FAIL — all three tests fail. `camera.tsx` has no `recordingModes` constant, no `SelectField`, and the recording mode field is still a `<TextField label="Recording mode"`.

- [ ] **Step 3a: Add the `recordingModes` constant**

In `src/pages/camera.tsx`, after the `featureFilters` constant (which ends at line 64), add:

```tsx
const recordingModes: Array<{ value: string; label: string }> = [
    { value: "off", label: "Off — no recording" },
    { value: "always", label: "Always — continuous" },
    { value: "motion", label: "Motion — motion segments only" },
];
```

- [ ] **Step 3b: Add the `SelectField` component**

In `src/pages/camera.tsx`, immediately after the `TextField` component (which ends at line 188, just before `function ToggleField`), add:

```tsx
function SelectField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {label}
            </span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee]"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
```

- [ ] **Step 3c: Swap the recording mode field**

In `src/pages/camera.tsx`, inside `CameraFormModal`, replace the `TextField` at lines 310-314.

From:

```tsx
                        <TextField
                            label="Recording mode"
                            value={form.recordingMode}
                            onChange={(value) => onChange("recordingMode", value)}
                        />
```

To:

```tsx
                        <SelectField
                            label="Recording mode"
                            value={form.recordingMode}
                            options={recordingModes}
                            onChange={(value) => onChange("recordingMode", value)}
                        />
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/recording-mode-field.test.mjs`
Expected: PASS — all three tests pass.

- [ ] **Step 5: Run the full test suite and lint**

Run: `node --test tests/`
Expected: PASS — all tests pass (7 in `camera-view-model.test.mjs`, 1 in `camera-toggle-source.test.mjs`, 3 in `recording-mode-field.test.mjs`).

Run: `npm run lint`
Expected: no errors for `src/pages/camera.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/camera.tsx tests/recording-mode-field.test.mjs
git commit -m "feat: make camera recordingMode a constrained dropdown"
```

---

## Manual Verification

After Task 2, verify in the running app (`npm run dev`, open the camera page):

- Click **Add Camera** → the "Recording mode" field is a dropdown showing **Off — no recording** selected.
- The dropdown offers exactly three options: Off, Always, Motion (with descriptive labels).
- Edit an existing camera whose `recordingMode` is `always` or `motion` → that option is preselected.
- Edit a camera with a blank/missing `recordingMode` → **Off** is preselected.
- Pick a mode, save → the chosen value (`off` / `always` / `motion`) is sent in the payload.

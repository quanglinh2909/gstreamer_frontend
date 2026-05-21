# Recording mode as a constrained dropdown

**Date:** 2026-05-21
**Status:** Approved

## Problem

In the camera configuration form, `recordingMode` is a free-text input
([`src/pages/camera.tsx:310-314`](../../../src/pages/camera.tsx)). The backend
only accepts three values, so free text lets users submit invalid modes. There
is no default, so new cameras are created with an empty `recordingMode`.

## Goal

Constrain `recordingMode` to a fixed set of values via a dropdown, with a
sensible default.

| Field | Type | Default | Values |
|-------|------|---------|--------|
| `recordingMode` | string | `off` | `off` = no recording · `always` = continuous recording · `motion` = keep only motion segments |

## Scope

- In scope: the `recordingMode` input in the camera form, its default value.
- Out of scope: the `recordingEnabled` toggle. It stays an independent field
  (decision: keep independent — no syncing, no replacement). The backend
  payload contract is unchanged.
- Out of scope: the camera card display at `camera.tsx:517`, which keeps
  showing the raw `recordingMode` string.

## Design

### 1. `SelectField` component

A new presentational component in `src/pages/camera.tsx`, alongside the
existing `TextField` and `ToggleField`. It renders a native `<select>` styled
to match `TextField` — same label treatment (uppercase, tracked), same control
height/border/focus ring (`focus:border-[#4369ee]`).

Props:

- `label: string`
- `value: string`
- `onChange: (value: string) => void`
- `options: Array<{ value: string; label: string }>`

What it does: renders a labelled dropdown. How it is used: same call shape as
`TextField`. Depends on: nothing beyond `cn` and the shared styling.

### 2. Recording mode options

A module-level constant in `camera.tsx`:

```ts
const recordingModes: Array<{ value: string; label: string }> = [
    { value: "off", label: "Off — no recording" },
    { value: "always", label: "Always — continuous" },
    { value: "motion", label: "Motion — motion segments only" },
];
```

Labels are in English to match the rest of the form. The descriptive suffix
keeps the meaning of each mode visible inside the dropdown (chosen approach A:
descriptive option labels, no separate helper row).

### 3. Replace the field

In `CameraFormModal`, replace the `TextField` for "Recording mode"
([`camera.tsx:310-314`](../../../src/pages/camera.tsx)) with:

```tsx
<SelectField
    label="Recording mode"
    value={form.recordingMode}
    options={recordingModes}
    onChange={(value) => onChange("recordingMode", value)}
/>
```

### 4. Default value

In [`src/lib/camera-view-model.js`](../../../src/lib/camera-view-model.js),
`getCameraFormDefaults` currently sets `recordingMode: asText(camera.recordingMode)`.
Change it to fall back to `"off"`:

```js
recordingMode: asText(camera.recordingMode) || "off",
```

This covers two cases:

- **New camera** — `getCameraFormDefaults()` is called with no argument, so the
  form opens with `off` selected.
- **Existing camera with a blank mode** — editing a legacy camera whose
  `recordingMode` is empty shows `off` selected rather than an empty dropdown
  with no valid option.

`buildCameraPayload` keeps `recordingMode: asText(form.recordingMode)`. Since
the dropdown can only emit one of the three valid values, no extra fallback is
needed there.

### 5. Types

`recordingMode` stays typed `string` in both `ICameraCreate` and
`ICameraResponse` ([`src/interface/camera.ts`](../../../src/interface/camera.ts)).
The backend contract types it as `string`; the dropdown enforces the allowed
values at the UI layer. No type narrowing.

## Data flow

1. Form opens → `getCameraFormDefaults(camera?)` produces form state with
   `recordingMode` defaulting to `off`.
2. User picks a mode → `SelectField.onChange` → `updateCameraForm("recordingMode", value)`.
3. Submit → `buildCameraPayload(form)` → `recordingMode` is one of
   `off` / `always` / `motion` → sent to the backend unchanged via
   `createCamera` / `updateCamera`.

## Error handling

No new error paths. The dropdown cannot produce an invalid value, which removes
the previous (unvalidated) free-text failure mode.

## Testing

Manual verification in the camera form:

- Open "Add camera" → "Recording mode" shows a dropdown defaulting to **Off**.
- The dropdown offers exactly: Off, Always, Motion (with descriptive labels).
- Edit an existing camera that has a recording mode set → that mode is
  preselected.
- Edit a camera with a blank/missing recording mode → **Off** is preselected.
- Save → the chosen value reaches the payload (`off` / `always` / `motion`).

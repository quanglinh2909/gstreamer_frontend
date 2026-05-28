# AI Recognition Tracking Options

**Date:** 2026-05-27
**Status:** Approved for implementation

## Goal

Add overlap-threshold and tracker configuration to the existing face and
license-plate recognition settings.

## Confirmed Contract

Both recognition payloads and hydrated backend config values use:

```ts
overlap_threshold: number; // API value from 0 to 1
tracker: "bytetrack" | "botsort";
```

The frontend stores `overlapThreshold` as a percentage from `0` to `100`, as
it already does for confidence controls. When a legacy backend response does
not include either new field, the UI defaults to `30%` and `"bytetrack"`.
Face and license-plate recognition also default `Max FPS` to `5`.

## Interface

Only the **Khuon mat** and **Bien so** setting cards show the new controls:

- A range control labeled **Nguong chong lap**, displaying its selected value
  as `0%` through `100%`.
- A **Tracker** radio group with the labels **ByteTrack** and **BoT-SORT**.

The controls sit in `AiFeatureRow` beneath existing confidence sliders and
before Max FPS. Restricted-zone and tripwire features retain their current
settings only.

## Data Flow

- `AiFeatureConfig` gains optional UI fields `overlapThreshold` and `tracker`.
- The view model applies the recognition defaults, normalizes hydrated API
  `overlap_threshold` values into percentages, validates tracker values, and
  serializes `overlapThreshold / 100` into recognition POST payloads.
- `useAiConfigManager` gains focused setters for these two active-feature
  values and passes them through the dashboard/settings panel to
  `AiFeatureRow`.
- Face and plate API request interfaces include both new API fields.

## Eager Config Loading

Selecting a camera loads `cameras/{id}/config-ai` immediately, independent of
the snapshot request, so recognition settings appear without waiting for an
image. The raw backend config is retained per camera while the snapshot loads.

When the snapshot dimensions become available, the view model rebuilds the
backend polygon shapes and merges only `shapes` into the current in-memory
config. This keeps slider, tracker, toggle, and FPS edits made while the image
was loading instead of replacing them with the earlier server response.

## Testing

- View-model tests cover defaults, hydration, clamping, tracker fallback, and
  both recognition payloads.
- Structure/API tests cover the request interfaces, hook wiring, slider, and
  radio controls.
- View-model and hook-structure tests cover immediate settings hydration and
  delayed shape-only polygon hydration.
- Run all Node tests, TypeScript, ESLint, and production build afterward.

## Scope

This change does not alter drawing, event handling, endpoints, or settings for
restricted-zone/tripwire features.

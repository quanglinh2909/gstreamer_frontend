# AI Recognition Tracking Options Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add overlap threshold percentage sliders and ByteTrack/BoT-SORT selection for face and plate recognition settings.

**Architecture:** Extend the existing recognition feature state instead of introducing a second form model. Pure view-model functions own defaults, API/UI percentage conversion, and payload serialization; the existing manager and active feature row own interaction and display.

**Tech Stack:** React, TypeScript, Tailwind CSS, Axios-backed APIs, Node test runner, Next.js Pages Router.

**Design spec:** `docs/superpowers/specs/2026-05-27-ai-recognition-tracking-options-design.md`

---

## Chunk 1: Data Contract And Serialization

### Task 1: View Model State And Payload Fields

**Files:**
- Modify: `tests/ai-config-view-model.test.mjs`
- Modify: `src/lib/ai-config-view-model.js`

- [x] Add failing tests for default recognition overlap/tracker values,
  backend hydration, invalid tracker fallback, and POST serialization.
- [x] Run `node tests/ai-config-view-model.test.mjs` and verify RED.
- [x] Implement normalization and API/UI conversion for
  `overlap_threshold`/`tracker`.
- [x] Run the same test and verify GREEN.

### Task 2: Typed Recognition Request Contracts

**Files:**
- Modify: `tests/vehicle-ai-api.test.mjs`
- Modify: `src/interface/ai-config.ts`
- Modify: `src/interface/face-recognition.ts`
- Modify: `src/interface/plate-recognition.ts`

- [x] Add failing assertions for `overlap_threshold` and tracker types on
  face/plate request interfaces.
- [x] Run `node tests/vehicle-ai-api.test.mjs` and verify RED.
- [x] Extend the TypeScript contracts with the new API and UI fields.
- [x] Run the same test and verify GREEN.

## Chunk 2: Active Settings Controls

### Task 3: Hook And Panel Wiring

**Files:**
- Modify: `tests/ai-config-page-structure.test.mjs`
- Modify: `src/hooks/use-ai-config-manager.ts`
- Modify: `src/components/ai-config/ai-config-dashboard.tsx`
- Modify: `src/components/ai-config/ai-settings-panel.tsx`
- Modify: `src/components/ai-config/ai-feature-row.tsx`

- [x] Add failing assertions for overlap/tracker setters and recognition-only
  slider/radio UI.
- [x] Run `node tests/ai-config-page-structure.test.mjs` and verify RED.
- [x] Wire controlled settings through the manager and active feature card.
- [x] Run the same test and verify GREEN.

## Chunk 3: Verification

- [x] Run `node --test tests/*.test.mjs`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run lint`, reporting existing warnings separately.
- [x] Run `npm run build` outside sandbox if Turbopack requires bind-port
  permissions.

## Chunk 4: Default Value Revision

- [x] Add failing checks for `30%` overlap threshold and recognition `Max FPS = 5`.
- [x] Run focused AI config tests and verify RED against previous defaults.
- [x] Change recognition-only defaults and UI fallback while leaving other feature defaults unchanged.
- [x] Run focused tests and full verification for the revision.

## Chunk 5: Eager Config Loading

### Task 4: Preserve Edited Settings During Delayed Polygon Hydration

**Files:**
- Modify: `tests/ai-config-view-model.test.mjs`
- Modify: `src/lib/ai-config-view-model.js`

- [x] Add a failing test for merging late snapshot-derived shapes without
  replacing an edited overlap/tracker value.
- [x] Run `node tests/ai-config-view-model.test.mjs` and verify RED.
- [x] Implement a shape-only merge helper.
- [x] Run the same test and verify GREEN.

### Task 5: Load Config Before Snapshot Completes

**Files:**
- Modify: `tests/ai-config-page-structure.test.mjs`
- Modify: `src/hooks/use-ai-config-manager.ts`

- [x] Add failing assertions for stored backend config values, an immediate
  config hydrate without `snapshotSize`, and delayed shape-only merging.
- [x] Run `node tests/ai-config-page-structure.test.mjs` and verify RED.
- [x] Split loading effects so config data is fetched immediately and polygon
  hydration runs only when snapshot dimensions become available.
- [x] Run the same test and verify GREEN.

### Task 6: Verification

- [ ] Run `node --test tests/*.test.mjs`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`, reporting existing warnings separately.
- [ ] Run `npm run build` outside sandbox if Turbopack requires bind-port
  permissions.

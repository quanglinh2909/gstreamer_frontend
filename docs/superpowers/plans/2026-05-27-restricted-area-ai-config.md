# Restricted Area AI Config Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and debug the existing restricted-zone AI editor through the new `restricted-area` API.

**Architecture:** Extend the existing `AiCameraConfig` and pure view model with `restricted_area` rather than creating another screen. Add a focused backend API/type for its payload; the existing manager/settings/debug modal then handle the third persisted feature through the established paths.

**Tech Stack:** Next.js Pages Router, React 19, TypeScript, Axios-backed APIs, Node test runner, ESLint.

**Design spec:** `docs/superpowers/specs/2026-05-27-restricted-area-ai-config-design.md`

---

## Chunk 1: Contract And View Model

### Task 1: Restricted-Area Defaults, Hydration, And Payload

**Files:**
- Modify: `tests/ai-config-view-model.test.mjs`
- Modify: `src/interface/ai-config.ts`
- Modify: `src/lib/ai-config-view-model.js`

- [x] Add failing checks for restricted defaults, `restricted_area` hydrate/debug mapping, and POST payload serialization without `secondaryConf`.
- [x] Run `node tests/ai-config-view-model.test.mjs` and verify RED.
- [x] Extend the view model and backend config type.
- [x] Run the same test and verify GREEN.

### Task 2: Restricted-Area API Contract

**Files:**
- Modify: `tests/vehicle-ai-api.test.mjs`
- Create: `src/interface/restricted-area.ts`
- Create: `src/backend-api/restricted-area-api.ts`

- [x] Add failing checks for the restricted payload interface and `POST "restricted-area"` API method.
- [x] Run `node tests/vehicle-ai-api.test.mjs` and verify RED.
- [x] Implement the typed API wrapper.
- [x] Run the same test and verify GREEN.

## Chunk 2: Existing Screen Integration

### Task 3: Controls, Save, And Debug Wiring

**Files:**
- Modify: `tests/ai-config-page-structure.test.mjs`
- Modify: `src/components/ai-config/ai-feature-row.tsx`
- Modify: `src/components/ai-config/ai-settings-panel.tsx`
- Modify: `src/hooks/use-ai-config-manager.ts`

- [x] Add failing checks that restricted-zone gets overlap/tracker controls, save support, API dispatch, and debug lookup.
- [x] Run `node tests/ai-config-page-structure.test.mjs` and verify RED.
- [x] Integrate restricted-area into existing controlled settings and save handler.
- [x] Run the same test and verify GREEN.

## Chunk 3: Verification

- [x] Run `node --test tests/*.test.mjs`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run lint`, reporting remaining warnings separately.
- [x] Run `npm run build` outside sandbox if Turbopack requires process/port permissions.

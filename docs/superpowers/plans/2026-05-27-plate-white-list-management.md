# Plate White List Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/plate-white-list` table page with search, pagination, create, update, and delete actions for allowed plates.

**Architecture:** Follow the current management-page split: typed API and interface contracts, pure view-model helpers, a stateful manager hook, presentational components, and a thin Pages Router route inside `MainLayout`. The backend remains accessed through the existing `/api/backend/` Axios proxy.

**Tech Stack:** Next.js Pages Router, React 19, TypeScript, Axios, Tailwind CSS, Node test runner, ESLint.

**Design spec:** `docs/superpowers/specs/2026-05-27-plate-white-list-management-design.md`

---

## Chunk 1: Contract And Pure Behavior

### Task 1: View Model Helpers

**Files:**
- Create: `tests/plate-white-list-view-model.test.mjs`
- Create: `src/lib/plate-white-list-view-model.js`

- [x] Write failing tests for trimming/uppercasing `plate_number`, required
  fields, JSON payload creation, and compact pagination.
- [x] Run `node tests/plate-white-list-view-model.test.mjs` and verify RED.
- [x] Implement the minimal pure helpers.
- [x] Run the same test and verify GREEN.

### Task 2: Typed API Contract

**Files:**
- Create: `tests/plate-white-list-page-structure.test.mjs`
- Create: `src/interface/plate-white-list.ts`
- Create: `src/backend-api/plate-white-list-api.ts`

- [x] Write failing assertions for item/page types and typed JSON CRUD
  endpoints using `plate-white-list`.
- [x] Run the structure test and verify RED.
- [x] Implement the interface and API wrapper.
- [x] Run the structure test and verify the contract checks pass.

## Chunk 2: State And Table UI

### Task 3: Manager Hook

**Files:**
- Create: `src/hooks/use-plate-white-list-manager.ts`
- Modify: `tests/plate-white-list-page-structure.test.mjs`

- [x] Add failing assertions for search, `PLATE_WHITE_LIST_PAGE_SIZE = 20`,
  pagination, create/update/delete, JSON payload helper, and last-row delete
  page handling.
- [x] Run the structure test and verify RED.
- [x] Implement list normalization, search, dialog state, mutation actions, and
  refresh/page fallback.
- [x] Run the structure test and verify GREEN.

### Task 4: Table, Dialogs And Pagination

**Files:**
- Create: `src/components/plate-white-list/plate-white-list-utils.ts`
- Create: `src/components/plate-white-list/plate-white-list-table.tsx`
- Create: `src/components/plate-white-list/plate-white-list-form-modal.tsx`
- Create: `src/components/plate-white-list/delete-plate-white-list-modal.tsx`
- Create: `src/components/plate-white-list/plate-white-list-pagination.tsx`
- Create: `src/components/plate-white-list/plate-white-list-dashboard.tsx`
- Modify: `tests/plate-white-list-page-structure.test.mjs`

- [x] Add failing assertions for table columns, search, modal actions, delete
  confirmation, pagination and loading/empty handling.
- [x] Run the structure test and verify RED.
- [x] Implement responsive table and dialogs matching the existing dashboard
  styling.
- [x] Run the structure test and verify GREEN.

## Chunk 3: Route, Navigation And Verification

### Task 5: Page Route And Menu

**Files:**
- Create: `src/pages/plate-white-list.tsx`
- Modify: `src/components/leftmenu/leftmenu.tsx`
- Modify: `tests/plate-white-list-page-structure.test.mjs`

- [x] Add failing assertions for `MainLayout`, manager/dashboard composition,
  and `/plate-white-list` sidebar link.
- [x] Run the structure test and verify RED.
- [x] Implement the page and sidebar item.
- [x] Run the structure test and verify GREEN.

### Task 6: Full Verification

- [x] Run `node --test tests/*.test.mjs`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run lint`.
- [x] Run `npm run build` outside sandbox if Turbopack requires bind-port
  permissions, and report any existing warnings separately.

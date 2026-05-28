# Recognition Events WebSocket Endpoints Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the events gallery to live face and plate streams derived from the `WEBSOCKET_ORIGIN` base URL.

**Architecture:** Keep REST as paginated history and place realtime lifecycle in one Zustand store keyed by the active recognition tab. Pure view-model helpers construct endpoint URLs and merge live cards so URL behavior and pagination updates can be tested without mounting React.

**Tech Stack:** Next.js Pages Router, React 19, TypeScript, Zustand, browser WebSocket, Node test runner, ESLint.

**Design spec:** `docs/superpowers/specs/2026-05-27-face-events-websocket-design.md`

---

## Chunk 1: Socket URL And Live Page Behavior

### Task 1: Pure Event Helpers

**Files:**
- Modify: `tests/event-view-model.test.mjs`
- Modify: `src/lib/event-view-model.js`

- [x] Add failing tests that derive `/face-events` and `/plate-events` from a base URL and merge a live plate event without duplicate totals.
- [x] Run `node tests/event-view-model.test.mjs` and verify RED.
- [x] Add `getEventSocketUrl` and generalize live page merging for both tabs.
- [x] Run the same test and verify GREEN.

## Chunk 2: Shared Socket State And Active Tab Wiring

### Task 2: Zustand And Hook Integration

**Files:**
- Modify: `tests/events-page-structure.test.mjs`
- Create: `src/stores/use-event-socket-store.ts`
- Delete: `src/stores/use-face-event-socket-store.ts`
- Modify: `src/hooks/use-event-manager.ts`
- Modify: `src/components/events/event-dashboard.tsx`

- [x] Add failing source assertions for shared socket state, plate payload validation, tab-specific URL construction, and generic pending-live UI.
- [x] Run `node tests/events-page-structure.test.mjs` and verify RED.
- [x] Implement a shared active-tab socket store with validation and reconnect behavior.
- [x] Wire the hook/dashboard so the visible tab connects and receives live updates.
- [x] Run the same test and verify GREEN.

## Chunk 3: Verification

- [x] Run `node --test tests/*.test.mjs`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run lint` and report existing warnings separately.
- [x] Run `npm run build` outside sandbox only if permission is available for Turbopack.

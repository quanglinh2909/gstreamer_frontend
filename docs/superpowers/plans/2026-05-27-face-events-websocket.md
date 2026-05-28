# Face Events WebSocket Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live face recognition updates to the Events face tab through a Zustand-managed WebSocket connection configured by `WEBSOCKET_ORIGIN`.

**Architecture:** Keep REST as the source for history and pagination. A focused Zustand store owns the browser WebSocket lifecycle and recent validated messages; `useEventManager` merges matching live items into the currently shown face page and exposes realtime UI state. The page supplies the non-secret socket URL from server runtime config via `getServerSideProps`.

**Tech Stack:** Next.js Pages Router, React 19, TypeScript, Zustand, browser WebSocket, Node test runner, ESLint.

**Design spec:** `docs/superpowers/specs/2026-05-27-face-events-websocket-design.md`

---

## Chunk 1: Pure Realtime Page Updates

### Task 1: Event View-Model Merge Helpers

**Files:**
- Modify: `tests/event-view-model.test.mjs`
- Modify: `src/lib/event-view-model.js`

- [x] **Step 1: Write failing tests**

Add cases proving that a matching live face event is prepended without
duplicates, a different camera is ignored, the page remains capped to 20
items, and multiple buffered events preserve newest-first order.

- [x] **Step 2: Run tests to verify RED**

Run: `node tests/event-view-model.test.mjs`
Expected: FAIL because realtime merge helpers are not exported yet.

- [x] **Step 3: Implement minimal pure helpers**

Export helpers equivalent to:

```js
export function mergeLiveFaceEvents(page, events, selectedCameraId) {
    return events
        .filter((event) => !selectedCameraId || event.camera_id === selectedCameraId)
        .slice()
        .reverse()
        .reduce((currentPage, event) => prependLiveFaceEvent(currentPage, event), page);
}
```

Ensure each new event increases `total`, recalculates `pages`, is de-duplicated
by `id`, and trims `items` to the existing page `size`.

- [x] **Step 4: Run tests to verify GREEN**

Run: `node tests/event-view-model.test.mjs`
Expected: PASS.

## Chunk 2: Zustand Socket Boundary

### Task 2: Store And Dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/stores/use-face-event-socket-store.ts`
- Modify: `tests/events-page-structure.test.mjs`

- [x] **Step 1: Add failing structure assertions**

Assert the event feature has a Zustand store using `create`, opens
`new WebSocket`, validates incoming messages, buffers recent events, and
provides connect/disconnect handling with reconnect status.

- [x] **Step 2: Run test to verify RED**

Run: `node tests/events-page-structure.test.mjs`
Expected: FAIL because the store does not exist.

- [x] **Step 3: Install Zustand and implement the store**

Run: `npm install zustand`

Create a store with:

```ts
type FaceEventSocketStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";
type ReceivedFaceEvent = { sequence: number; event: FaceRecognitionEvent };
```

Use module-private socket/timer state; validate parsed JSON as a face event,
ignore duplicate `id` messages, retain a bounded buffer, auto-reconnect on
unexpected close, and cancel reconnect on deliberate `disconnect()`.

- [x] **Step 4: Run test to verify GREEN**

Run: `node tests/events-page-structure.test.mjs`
Expected: PASS for store assertions.

## Chunk 3: Events Integration

### Task 3: Runtime Config, Hook And Status UI

**Files:**
- Modify: `.env`
- Modify: `src/pages/events.tsx`
- Modify: `src/hooks/use-event-manager.ts`
- Modify: `src/components/events/event-dashboard.tsx`
- Modify: `tests/events-page-structure.test.mjs`

- [x] **Step 1: Add failing integration assertions**

Assert that `events.tsx` reads `process.env.WEBSOCKET_ORIGIN` in
`getServerSideProps`, the hook consumes the socket store only for the face tab,
and the dashboard renders live status and a new-events action.

- [x] **Step 2: Run test to verify RED**

Run: `node tests/events-page-structure.test.mjs`
Expected: FAIL because runtime socket integration is absent.

- [x] **Step 3: Implement page and hook integration**

Change `.env` to a valid full URL:

```dotenv
WEBSOCKET_ORIGIN=ws://192.168.103.97:8010/ws/face-events
```

Pass `websocketOrigin` from server-side page props into `useEventManager`.
Connect only while `activeTab === "face"`. For page 1, prepend matching
messages and retain 20 visible cards. For later pages, preserve visible cards,
update totals, and track pending messages. Merge socket messages received
during an in-flight REST fetch before committing its response.

- [x] **Step 4: Implement dashboard feedback**

Display compact connection state on the face tab and a button for pending live
events that returns to page 1/refetches current data.

- [x] **Step 5: Run tests to verify GREEN**

Run: `node tests/events-page-structure.test.mjs tests/event-view-model.test.mjs`
Expected: PASS.

## Chunk 4: Verification

### Task 4: Full Checks

**Files:**
- Test: `tests/*.test.mjs`

- [x] **Step 1: Run all Node tests**

Run: `node --test tests/*.test.mjs`
Expected: PASS.

- [x] **Step 2: Run lint**

Run: `npm run lint`
Expected: no new errors; report existing warnings independently.

- [x] **Step 3: Run production build if permitted**

Run: `npm run build`
Expected: PASS outside the restricted sandbox. If sandbox blocks Turbopack
subprocess port binding again, report that exact limitation.

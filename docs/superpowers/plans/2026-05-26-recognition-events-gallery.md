# Recognition Events Gallery Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are explicitly authorized and available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an `/events` image gallery with plate/face tabs, optional camera filtering, numbered pagination, and a full-image preview modal.

**Architecture:** Follow the current Pages Router feature split: a thin page mounts `MainLayout`, a hook owns remote state and interactions, presentational components render the gallery, and pure helpers normalize display behavior. Recognition endpoints remain the source of event data and are adjusted only to allow the already-supported all-camera query.

**Tech Stack:** Next.js 16 Pages Router, React 19, TypeScript, Tailwind CSS v4, Axios, `node:test`.

**Safety note:** The required API, sidebar, and feature folders already contain untracked user work in this checkout. During execution, do not create code commits that would capture those pre-existing files; edit them carefully in place and verify the final diff/tests instead.

**Design spec:** `docs/superpowers/specs/2026-05-26-recognition-events-gallery-design.md`

---

## File Structure

- Create `src/lib/event-view-model.js`: pure event labels, display formatting, image proxy URLs, and compact pagination.
- Create `src/interface/recognition-event.ts`: shared and per-tab event/page contracts.
- Modify `src/backend-api/plate-recognition-api.ts`: typed events response with optional `camera_id`.
- Modify `src/backend-api/face-recognition-api.ts`: typed events response with optional `camera_id`.
- Create `src/hooks/use-event-manager.ts`: fetch cameras/events and own tab/filter/page/modal state.
- Create `src/components/events/event-dashboard.tsx`: page-level UI states and layout.
- Create `src/components/events/event-card.tsx`: visual result card with crop preview.
- Create `src/components/events/event-image-modal.tsx`: full image modal and keyboard close.
- Create `src/components/events/event-pagination.tsx`: numbered pagination controls.
- Create `src/components/events/event-utils.ts`: CSS class join helper.
- Create `src/pages/events.tsx`: thin route composition.
- Modify `src/components/leftmenu/leftmenu.tsx`: add the `/events` navigation item.
- Create `tests/event-view-model.test.mjs`: behavioral tests for pure utilities.
- Create `tests/events-page-structure.test.mjs`: integration/source-contract tests.

## Chunk 1: Event Domain And Requests

### Task 1: Display Helpers And Numbered Pagination

**Files:**
- Create: `tests/event-view-model.test.mjs`
- Create: `src/lib/event-view-model.js`

- [x] **Step 1: Write the failing utility tests**

Add tests that import these desired exports:

```js
import {
    formatEventConfidence,
    getEventImageUrl,
    getEventResultLabel,
    getVisibleEventPages,
} from "../src/lib/event-view-model.js";

test("labels face events without a known name", () => {
    assert.equal(getEventResultLabel({ name: "" }, "face"), "Không xác định");
    assert.equal(getEventResultLabel({ plate_number: "61M-10352" }, "plate"), "61M-10352");
});

test("formats event confidence and backend image URLs", () => {
    assert.equal(formatEventConfidence(0.2961), "29.6%");
    assert.equal(getEventImageUrl("/uploads/plates/a.jpg"), "/api/backend/uploads/plates/a.jpg");
    assert.equal(getEventImageUrl(""), "");
});

test("returns compact nearby numbered pagination", () => {
    assert.deepEqual(getVisibleEventPages(5, 10), [1, "ellipsis-left", 4, 5, 6, "ellipsis-right", 10]);
    assert.deepEqual(getVisibleEventPages(1, 3), [1, 2, 3]);
});
```

- [x] **Step 2: Run the utility test and confirm RED**

Run: `node --test tests/event-view-model.test.mjs`
Expected: FAIL because `src/lib/event-view-model.js` does not exist.

- [x] **Step 3: Add the smallest useful pure implementation**

Export `getEventResultLabel`, `formatEventConfidence`, `formatEventTimestamp`,
`getEventImageUrl`, and `getVisibleEventPages`. Treat invalid values safely;
prefix backend-relative `/uploads/` values with `/api/backend`; and render a
window containing the current page plus its immediate neighbors, bounded by
the first/last page with ellipses as necessary.

- [x] **Step 4: Run the utility test and confirm GREEN**

Run: `node --test tests/event-view-model.test.mjs`
Expected: PASS.

### Task 2: Endpoint Contracts And Optional Camera Filter

**Files:**
- Create: `src/interface/recognition-event.ts`
- Modify: `src/backend-api/plate-recognition-api.ts`
- Modify: `src/backend-api/face-recognition-api.ts`
- Create/Modify: `tests/events-page-structure.test.mjs`

- [x] **Step 1: Write failing source-contract assertions**

Create `tests/events-page-structure.test.mjs` with assertions that the
recognition APIs import event types, expose `camera_id?: string`, and call
their existing `/events` endpoints. Assert that
`src/interface/recognition-event.ts` declares `plate_number`, optional
`name`, and `RecognitionEventPage`.

- [x] **Step 2: Run the structure test and confirm RED**

Run: `node --test tests/events-page-structure.test.mjs`
Expected: FAIL because the event contract file and optional API parameter are
not present.

- [x] **Step 3: Implement typed event API contracts**

Create `RecognitionEventPage<T>`, `PlateRecognitionEvent`,
`FaceRecognitionEvent`, `RecognitionEventTab`, and a union for modal cards.
Change `plateRecognitionApi.events` to return
`RecognitionEventPage<PlateRecognitionEvent>` from
`"plate-recognition/events"` and `faceRecognitionApi.events` to return
`RecognitionEventPage<FaceRecognitionEvent>` from
`"face-recognition/events"`, each using the optional parameter form:

```ts
events(param: { page: number; size: number; camera_id?: string }) { /* typed GET */ }
```

- [x] **Step 4: Run the relevant tests and confirm GREEN**

Run: `node --test tests/events-page-structure.test.mjs tests/vehicle-ai-api.test.mjs`
Expected: PASS.

## Chunk 2: Gallery Experience

### Task 3: Event Manager Hook

**Files:**
- Create: `src/hooks/use-event-manager.ts`
- Modify: `tests/events-page-structure.test.mjs`

- [x] **Step 1: Add failing hook contract tests**

Assert that the hook imports `cameraApi`, `plateRecognitionApi`, and
`faceRecognitionApi`; defines `EVENT_PAGE_SIZE = 20`; holds selected
camera/tab/page state; and invokes both `.events` sources based on active tab.

- [x] **Step 2: Run the structure test and confirm RED**

Run: `node --test tests/events-page-structure.test.mjs`
Expected: FAIL because the manager hook does not exist.

- [x] **Step 3: Implement the manager**

On mount, request up to 100 cameras for filter labels and load plate page 1
without `camera_id`. Use `useEffect` and `useCallback` with cancellation
guards for active-tab queries. Maintain page values independently for
`plate`/`face`; changing camera resets both to page 1; switching tabs loads
that tab's retained page; refresh repeats the active query. Return response,
loading/error states, camera-loading warning, handlers, and modal selection.

- [x] **Step 4: Run the structure test and confirm GREEN**

Run: `node --test tests/events-page-structure.test.mjs`
Expected: PASS.

### Task 4: Cards, Modal, Pagination, Page, And Navigation

**Files:**
- Create: `src/components/events/event-utils.ts`
- Create: `src/components/events/event-card.tsx`
- Create: `src/components/events/event-image-modal.tsx`
- Create: `src/components/events/event-pagination.tsx`
- Create: `src/components/events/event-dashboard.tsx`
- Create: `src/pages/events.tsx`
- Modify: `src/components/leftmenu/leftmenu.tsx`
- Modify: `tests/events-page-structure.test.mjs`

- [x] **Step 1: Add failing UI composition assertions**

Assert that the page mounts `MainLayout`, `useEventManager`, and
`EventDashboard`; the dashboard contains both Vietnamese tab labels, the
all-camera option, a grid, loading/error/empty rendering, and passes cards to
a modal; the modal handles `Escape`; pagination consumes
`getVisibleEventPages`; and sidebar includes `href: "/events"`.

- [x] **Step 2: Run the structure test and confirm RED**

Run: `node --test tests/events-page-structure.test.mjs`
Expected: FAIL because page/components/menu link are not implemented.

- [x] **Step 3: Implement the gallery components**

Use the visual language of `CameraDashboard`: slate page background, white
bordered cards, blue selected state, `lucide-react` icons, and responsive
Tailwind grids. Use `next/image` with `unoptimized` for proxied event images,
an error fallback in both card and modal, `<button>` cards for accessibility,
and labelled tab/filter/pagination controls.

- [x] **Step 4: Implement the thin page and menu entry**

Mount the dashboard beneath `MainLayout` in `/events` and add the linked
sidebar button with a recognition-history appropriate icon.

- [x] **Step 5: Run UI and utility tests and confirm GREEN**

Run: `node --test tests/event-view-model.test.mjs tests/events-page-structure.test.mjs`
Expected: PASS.

### Task 5: Full Verification

**Files:**
- Verify all modified and created feature files.

- [x] **Step 1: Run all repository node tests**

Run: `node --test tests/*.test.mjs`
Expected: PASS with zero failed tests.

- [x] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit code 0.

- [x] **Step 3: Run the Next production build**

Run: `npm run build`
Expected: exit code 0 and `/events` builds successfully.

- [x] **Step 4: Review working-tree scope**

Run: `git status --short` and `git diff --stat`
Expected: event feature changes are present; existing unrelated work remains
untouched and is not discarded or bundled into an implementation commit.

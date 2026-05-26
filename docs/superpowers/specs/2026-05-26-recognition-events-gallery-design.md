# Recognition Events Gallery

**Date:** 2026-05-26
**Status:** Approved for implementation

## Goal

Add an `/events` page for browsing recognition history visually. The page has
two tabs, **Bien so** and **Khuon mat**, backed by
`plateRecognitionApi.events` and `faceRecognitionApi.events`.

## Confirmed Requirements

- Default to events from all cameras; `camera_id` is omitted from the request.
- Provide an optional camera filter. When selected, send its id as
  `camera_id`.
- Show 20 events per page with numbered pagination and nearby page numbers.
- Present events as a responsive gallery of image cards rather than a table.
- Clicking a card opens a modal with the full event image.
- Face events use `name`; an empty or missing name displays `Khong xac dinh`.

## Data Contracts

Both event endpoints return a paged response:

```ts
interface RecognitionEventPage<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
```

Plate event items:

```ts
interface PlateRecognitionEvent {
    id: number;
    camera_id: string;
    plate_number: string;
    confidence: number;
    timestamp: number;
    image_full: string;
    image_crop: string;
}
```

Face event items have the same common fields and replace `plate_number` with
an optional nullable `name`.

The backend image values are paths such as `/uploads/plates/...jpg`. The UI
maps them to `/api/backend/uploads/...jpg`, using the existing backend proxy
instead of exposing the upstream backend origin.

## Interface

The route is `src/pages/events.tsx`, wrapped in the existing `MainLayout`.
The sidebar gains an `Events` link.

The page contains:

1. A header with title, description, result count, and a refresh action.
2. A camera filter whose initial value is **Tat ca camera**.
3. Two tabs: **Bien so** (initial tab) and **Khuon mat**.
4. A responsive grid of up to 20 event cards.
5. Numbered pagination below the grid.
6. A full-image modal opened from an event card.

Each card prominently displays `image_crop`, then the event result, camera
label, confidence as a percentage, and a localized event timestamp. Camera
names come from the camera list when available, with `camera_id` as fallback.
For face cards without `name`, the result label is `Khong xac dinh`.

## Architecture

The feature follows the repository's existing page/manager/dashboard split:

- `src/pages/events.tsx`: thin route composing `MainLayout`,
  `useEventManager`, and `EventDashboard`.
- `src/hooks/use-event-manager.ts`: owns selected tab, optional camera id,
  per-tab page number, current response/loading/error state, camera filter
  loading, refresh, and selected modal event.
- `src/components/events/`: presentational dashboard, card, image modal, and
  pagination components.
- `src/interface/recognition-event.ts`: endpoint and UI event types.
- `src/lib/event-view-model.js`: pure formatting and pagination/image URL
  utilities testable without rendering React.
- Existing recognition APIs: accept an optional `camera_id` and type their
  event responses.

Only the active tab is requested. Switching tabs loads that tab at its
remembered page; changing the camera resets both tab page numbers to page 1
and reloads the active tab. Refresh reloads the currently selected query.

## States And Error Handling

- Until event data arrives, show gallery skeleton cards.
- A failed event request shows an inline error with a retry action and leaves
  the filter/tab controls available.
- A camera-list failure leaves **Tat ca camera** usable; event loading is not
  blocked.
- An empty successful page shows an empty-state message appropriate to the
  active tab/filter.
- If an image path is absent or an image fails to render, the card/modal
  displays a neutral image placeholder.
- The modal closes with its close button, overlay click, or the `Escape` key.

## Testing

Use focused `node:test` coverage consistent with the current repository:

- Pure view-model tests cover event label fallback, percent/time/image
  formatting, and compact numbered pagination.
- Source-structure tests assert the `/events` composition, sidebar link,
  endpoint usage, optional `camera_id`, grid/modal controls, and `size=20`.
- Run the repository test suite, ESLint, and Next build after implementation.

## Scope

In scope: browsing, filtering, paging, refreshing, and previewing existing
plate and face events.

Out of scope: live polling, date/search filters, deletion/export, recognition
configuration changes, and new backend endpoints.

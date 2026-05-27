# Recognition Events WebSocket Design

**Date:** 2026-05-27
**Status:** Revised and approved for implementation

## Goal

Extend both `/events` recognition tabs with live updates. Treat
`WEBSOCKET_ORIGIN` as the socket base URL and connect to a tab-specific
endpoint. Use Zustand to own the socket lifecycle and incoming message buffer
while preserving the existing REST history, camera filter, numbered
pagination, and image preview behavior.

## Confirmed Socket Message

Each WebSocket emits one item with the same fields as its REST event response.
The face endpoint emits:

```json
{
  "id": 1,
  "camera_id": "camera-id",
  "name": "Hau",
  "confidence": 0.84,
  "timestamp": 1779777414,
  "image_full": "/uploads/faces/full.jpg",
  "image_crop": "/uploads/faces/crop.jpg"
}
```

`name` may be absent or empty and continues to display as `Khong xac dinh`
through the current event label helper.

The plate endpoint emits the common event fields plus `plate_number`.

## Configuration

`WEBSOCKET_ORIGIN` remains a server-side environment value. The Events page
exposes only this non-secret base URL through `getServerSideProps` and passes
it to the client hook that controls the socket.

The local value is the common socket base URL, for example:

```dotenv
WEBSOCKET_ORIGIN=ws://192.168.103.97:8010/ws
```

The client derives these endpoints, removing a trailing slash from the base
when necessary:

```text
ws://192.168.103.97:8010/ws/face-events
ws://192.168.103.97:8010/ws/plate-events
```

## Architecture

- `src/pages/events.tsx` receives `websocketOrigin` from
  `getServerSideProps` and passes it into `useEventManager`.
- `src/stores/use-event-socket-store.ts` is a Zustand store responsible for
  active-tab connection status, reconnect scheduling, tab-specific message
  validation, de-duplication by event type plus `id`, and a bounded
  recent-event buffer.
- `src/hooks/use-event-manager.ts` remains the page interaction owner. It
  derives the endpoint for the active tab, merges matching live events into
  page 1, tracks pending events on later pages independently by tab, and
  retains REST fetching for initial/history data.
- `src/lib/event-view-model.js` owns pure helpers for endpoint construction,
  merging either live event type into an existing page, and adjusting page
  totals without duplicating cards.
- `src/components/events/event-dashboard.tsx` displays connection state and
  offers a compact action to return to recent events when live messages arrive
  while an older page is visible.

## Data Flow

1. Opening `/events` loads paginated data through the existing REST endpoint.
2. Selecting a tab calls `connect(getEventSocketUrl(websocketOrigin, tab),
   tab)` in the Zustand store. Changing tabs or unmounting closes the previous
   connection.
3. A valid incoming event for the selected tab is de-duplicated and appended
   to the store buffer with a monotonically increasing sequence number.
4. If the active page is page 1 and the event matches the selected camera
   filter, the hook prepends it to the gallery, trims the page to 20 items,
   and updates totals/pages.
5. If a matching event arrives while a later page is visible, the current
   cards remain stable; totals are adjusted and a `new events` action guides
   the user back to page 1.
6. Events from a different camera than the active filter do not modify the
   displayed page or pending count.

## REST And Socket Coordination

REST remains authoritative for history and pagination. A REST request records
the latest socket sequence before it begins. When it resolves, live messages
received after that sequence for the active tab are merged into the returned
page or counted for older pages. This prevents an in-flight REST response from
erasing cards that appeared via WebSocket.

## Connection Handling

- Status values: idle, connecting, connected, reconnecting, and error.
- Unexpected close schedules an automatic reconnect with a small bounded
  backoff for the currently active tab.
- Deliberate disconnect on tab change or page unmount cancels reconnection.
- Invalid socket JSON or a payload missing required event fields is ignored
  without corrupting the gallery.
- Missing or invalid configured URL surfaces an unavailable/error state while
  REST browsing continues to work.

## Testing

- Pure helper tests cover base URL endpoint construction, camera filtering,
  de-duplication, 20-item trimming, page total updates, and buffered event
  merge order for plate and face items.
- Source-structure tests cover Zustand setup, page runtime WebSocket config,
  hook per-tab socket integration, validation for both event types, and
  connection/pending UI.
- Run the existing complete Node test set and ESLint after implementation.
- Run `next build` when the environment permits Turbopack's build subprocess
  requirements.

## Out Of Scope

- Persisting live buffers across browser reloads.
- Backend authentication or WebSocket protocol changes.
- Replacing REST pagination with an entirely streaming event archive.

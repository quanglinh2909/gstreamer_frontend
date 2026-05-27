# Face Events WebSocket Design

**Date:** 2026-05-27
**Status:** Approved for implementation

## Goal

Extend the `/events` face tab with live recognition updates received from the
WebSocket endpoint configured by `WEBSOCKET_ORIGIN`. Use Zustand to own the
socket lifecycle and incoming message buffer while preserving the existing REST
history, camera filter, numbered pagination, and image preview behavior.

## Confirmed Socket Message

The WebSocket emits one face event per message with the same fields as a REST
face event item:

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

## Configuration

`WEBSOCKET_ORIGIN` remains a server-side environment value. The Events page
will expose only this non-secret URL through `getServerSideProps` and pass it
to the client hook that controls the socket.

The local value must be a complete valid WebSocket URL, for example:

```dotenv
WEBSOCKET_ORIGIN=ws://192.168.103.97:8010/ws/face-events
```

This avoids a public build-time environment variable and supports changing the
runtime backend URL when the Next.js server is deployed.

## Architecture

- `src/pages/events.tsx` receives `websocketOrigin` from
  `getServerSideProps` and passes it into `useEventManager`.
- `src/stores/use-face-event-socket-store.ts` is a Zustand store responsible
  for connection status, reconnect scheduling, message validation,
  de-duplication by event `id`, and a bounded recent-event buffer.
- `src/hooks/use-event-manager.ts` remains the page interaction owner. It
  opens the store connection only while the `face` tab is active, merges
  matching live events into page 1, tracks pending events on later pages, and
  retains REST fetching for initial/history data.
- `src/lib/event-view-model.js` gains pure helpers for merging live face
  events into an existing page and adjusting page totals without duplicating
  cards.
- `src/components/events/event-dashboard.tsx` displays connection state and
  offers a compact action to return to recent events when live messages arrive
  while an older page is visible.

## Data Flow

1. Opening `/events` loads paginated data through the existing REST endpoint.
2. Selecting the face tab calls `connect(websocketOrigin)` in the Zustand
   store. Leaving the face tab or unmounting the page calls `disconnect()`.
3. A valid incoming face event is de-duplicated and appended to the store
   buffer with a monotonically increasing sequence number.
4. If the active face page is page 1 and the event matches the selected camera
   filter, the hook prepends it to the gallery, trims the page to 20 items,
   and updates totals/pages.
5. If a matching event arrives while a later face page is visible, the current
   cards remain stable; totals are adjusted and a `new events` action guides
   the user back to page 1.
6. Events from a different camera than the active filter do not modify the
   displayed page or pending count.

## REST And Socket Coordination

REST remains authoritative for history and pagination. A REST request records
the latest socket sequence before it begins. When it resolves, live messages
received after that sequence are merged into the returned face page or counted
for older pages. This prevents an in-flight REST response from erasing cards
that appeared via WebSocket.

## Connection Handling

- Status values: idle, connecting, connected, reconnecting, and error.
- Unexpected close schedules an automatic reconnect with a small bounded
  backoff while the face tab remains active.
- Deliberate disconnect on tab change or page unmount cancels reconnection.
- Invalid socket JSON or a payload missing required event fields is ignored
  without corrupting the gallery.
- Missing or invalid configured URL surfaces an unavailable/error state while
  REST browsing continues to work.

## Testing

- Pure helper tests cover camera filtering, de-duplication, 20-item trimming,
  page total updates, and buffered event merge order.
- Source-structure tests cover Zustand setup, page runtime WebSocket config,
  hook socket integration, face-tab-only lifecycle, and connection/pending UI.
- Run the existing complete Node test set and ESLint after implementation.
- Run `next build` when the environment permits Turbopack's build subprocess
  requirements.

## Out Of Scope

- Plate event WebSocket updates.
- Persisting live buffers across browser reloads.
- Backend authentication or WebSocket protocol changes.
- Replacing REST pagination with an entirely streaming event archive.

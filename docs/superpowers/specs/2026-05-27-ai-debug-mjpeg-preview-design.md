# AI Debug MJPEG Preview Design

**Date:** 2026-05-27
**Status:** Approved for implementation

## Goal

Add a `Xem debug` action to the AI configuration page so an operator can view
the running debug feed for the currently selected recognition job in a modal.

## Backend Contract

`cameraApi.getConfigAI(cameraId)` now returns `job_id` on each recognition
configuration item. The item `type` selects which job applies to the active
AI tab:

- `face_recognition` maps to `face`.
- `plate_recognition` maps to `licensePlate`.
- Non-recognition tabs do not provide a debug preview.

`job_id` may be represented as text or a number and is normalized to text in
the view model. A missing or blank job id disables the debug action.

The upstream MJPEG endpoint is:

```text
/ai-debug/cameras/{camera_id}/jobs/{job_id}/mjpeg
```

## UI And State

- The settings panel renders a secondary `Xem debug` button alongside the
  existing save action for recognition tabs.
- The button is enabled only when the active recognition config has a
  `job_id` from the loaded `config-ai` response.
- The manager derives a safe same-origin stream URL from the selected
  `cameraId` and active `job_id`, and owns modal open/close state.
- The dashboard renders an `AiDebugModal` with a dark video-style surface,
  close button, overlay dismissal, and Escape dismissal.
- The modal intentionally uses a native image element for the MJPEG stream:
  MJPEG is a continuously delivered image response and must not pass through
  image optimization or buffering.
- Closing the modal unmounts the image and therefore closes the browser stream
  request.

## Proxy Streaming

The browser uses this same-origin path:

```text
/api/backend/ai-debug/cameras/{camera_id}/jobs/{job_id}/mjpeg
```

A dedicated Pages API route handles that path rather than modifying the
existing catch-all backend proxy. It:

- allows `GET` only;
- forwards minimal accepted headers and targets `BACKEND_ORIGIN`;
- sets `responseLimit: false` because a debug stream is unbounded;
- copies the upstream content type;
- writes upstream `ReadableStream` chunks to the browser response as they
  arrive;
- aborts the upstream request when the browser closes the modal/connection.

This keeps regular JSON and image requests on their current buffered proxy
path while giving MJPEG the streaming semantics it requires.

## Testing

- Pure view-model tests cover job lookup by active recognition type and safe
  debug stream URL construction.
- Structure tests cover `job_id` typing, button/modal wiring, and the
  dedicated streaming API route.
- Full Node tests, TypeScript, lint, and production build verify integration.


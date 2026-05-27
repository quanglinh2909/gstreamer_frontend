# Restricted Area AI Config Design

**Date:** 2026-05-27
**Status:** Approved for implementation

## Goal

Make the existing `Vùng cấm` tab on `/ai-config` load, edit, save, and debug
an actual backend restricted-area job with the same interaction pattern as
face and license-plate configuration.

## Backend Contract

Saving the restricted-area feature calls:

```http
POST /restricted-area
Content-Type: application/json
```

with this payload:

```json
{
  "cameraId": "camera-id",
  "primaryConf": 0.7,
  "maxFps": 5,
  "enabled": true,
  "polygons": "[[[0, 0], [100, 0], [100, 100]]]",
  "tracker": "bytetrack",
  "overlap_threshold": 0.3
}
```

Unlike face and plate configuration, restricted-area does not send a
`secondaryConf` value.

`cameraApi.getConfigAI(cameraId)` returns the saved item with
`type: "restricted_area"`. The response may include `job_id`, using the
existing debug MJPEG popup for this feature when present.

## UI And State

- Keep the existing `Vùng cấm` feature tab and polygon drawing color/style.
- Enable saving for this tab rather than introducing a separate page.
- Give it the same single confidence slider, overlap-threshold slider, tracker
  radio selection, FPS slider, enabled toggle, save action, and debug action
  already available in the AI settings area.
- Use restricted-area defaults of `overlapThreshold = 30`,
  `tracker = "bytetrack"`, and `maxFps = 5`.
- Keep `Hàng rào ảo` unchanged and not persisted by this API.

## Data Flow

1. Loading `config-ai` maps `restricted_area` into the `restrictedZone`
   feature and reconstructs its `restrictedZone` polygons once snapshot
   dimensions are available.
2. Editing controls stays in the existing `AiCameraConfig` state.
3. Saving filters only restricted-zone polygons, serializes them to real image
   coordinates, converts UI percentages to API decimals, and posts through a
   new `restrictedAreaApi`.
4. If a restricted-area `job_id` is supplied, selecting that tab enables the
   existing `Xem debug` popup with its job stream URL.

## Testing

- View-model tests cover default values, backend hydration, debug-job lookup,
  and restricted payload serialization without `secondaryConf`.
- API/type tests cover `POST /restricted-area` and its request contract.
- Page structure tests cover controls and hook save integration.
- Full tests, TypeScript, lint, and production build verify integration.


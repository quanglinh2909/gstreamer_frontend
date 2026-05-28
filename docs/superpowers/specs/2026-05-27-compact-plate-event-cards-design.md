# Compact Plate Event Cards

**Date:** 2026-05-27
**Status:** Approved for implementation

## Goal

Reduce the visual size of plate recognition event cards without changing the
portrait-oriented face event gallery.

## Interface Decision

The **Bien so** tab uses compact landscape cards because its cropped evidence
is short and wide. Its grid shows more cards per row on large displays, its
image area is shorter, and its metadata spacing is reduced.

The **Khuon mat** tab keeps the current portrait card ratio, grid density, and
metadata spacing because the face images need vertical viewing area.

## Implementation

- `src/components/events/event-dashboard.tsx` chooses a denser grid and a
  shorter matching skeleton only when `activeTab === "plate"`.
- `src/components/events/event-card.tsx` applies compact image height,
  padding, spacing, and typography only when `tab === "plate"`.
- Existing preview modal, filters, API calls, websocket behavior, and
  pagination are unchanged.

## Testing

Update the existing Events source-structure test to require compact plate
image/grid classes alongside the retained portrait face classes. Run the
focused Events test, the complete Node test suite, TypeScript, ESLint, and a
production build.

# Plate White List Management Design

**Date:** 2026-05-27
**Status:** Approved for implementation

## Goal

Add a `/plate-white-list` management page for browsing and maintaining vehicle
plate entries allowed by the recognition system. The page provides list,
search, create, update, and delete actions through the backend endpoints
supplied by the user.

## API Contract

The feature uses JSON requests through the existing `/api/backend/` frontend
proxy:

- `GET /plate-white-list?page=1&size=20&plate_number=...`
- `GET /plate-white-list/{id}`
- `POST /plate-white-list`
- `PUT /plate-white-list/{id}`
- `DELETE /plate-white-list/{id}`

Create and update payload:

```json
{
  "plate_number": "51A-12345",
  "name": "Nguyen Van A"
}
```

List response:

```json
{
  "items": [
    {
      "id": 1,
      "plate_number": "51A-12345",
      "name": "Nguyen Van A"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

## UI Design

The entry has no image, so the page uses a compact management table rather
than gallery cards.

Page content:

1. Header with the title `Danh sach bien so trang`, total entry count,
   `Them bien so` and refresh actions.
2. Search bar filtered by `plate_number`.
3. Responsive table with columns `Bien so`, `Ten`, `ID`, and `Thao tac`.
4. Numbered pagination with 20 entries per page.
5. Create/edit dialog with two fields: plate number and name.
6. Delete confirmation dialog naming the plate that will be deleted.

The Vietnamese UI strings in implementation may use diacritics, matching the
existing app screens.

## Behavior

- Search submits a trimmed plate value and resets to page 1.
- Empty search restores the full list.
- Plate numbers are trimmed and converted to uppercase before create/update.
- Both form fields are required.
- Create and update refresh the list after success.
- Deleting the last row on a later page returns to the previous available
  page; otherwise it refreshes the current page.
- Loading, empty, and inline error states match the current Identity
  management style.
- A detail endpoint is represented in the API wrapper for completeness, but a
  separate detail modal is intentionally omitted because every returned field
  is already visible in one table row.

## File Boundaries

- `src/interface/plate-white-list.ts`: item and paged response types.
- `src/backend-api/plate-white-list-api.ts`: typed CRUD requests.
- `src/lib/plate-white-list-view-model.js`: form normalization, validation,
  and compact pagination helper.
- `src/hooks/use-plate-white-list-manager.ts`: fetch, search, pagination, form
  and delete state.
- `src/components/plate-white-list/`: dashboard, table, form dialog, delete
  dialog, pagination, and small utility.
- `src/pages/plate-white-list.tsx`: route composed in `MainLayout`.
- `src/components/leftmenu/leftmenu.tsx`: sidebar navigation entry.

## Testing

- Pure view-model tests cover uppercase normalization, required fields, and
  compact numbered pagination.
- Source-structure tests cover typed CRUD API endpoints, page composition,
  manager responsibilities, table/dialog rendering, and sidebar route.
- Run the entire Node test suite, TypeScript check, ESLint, and production
  build after implementation.

## Out Of Scope

- Image association with a plate.
- Bulk import/export.
- WebSocket updates for whitelist changes.
- Additional approval/status fields absent from the provided API.

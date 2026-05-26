# Identity Management Gallery

**Date:** 2026-05-26
**Status:** Approved for implementation

## Goal

Add an `/identities` page for managing recognized people with list, search,
detail, create, update, and delete capabilities using the identity endpoints.

## Requirements

- List identities using `GET /identities?page=1&size=20&name=<query>`.
- Show 20 identities per page with numbered pagination.
- Search identities by name.
- Create an identity with `POST /identities` using multipart form fields
  `name` and required `image`.
- Update an identity with `PUT /identities/{id}` using multipart form fields;
  `name` is required while `image` is sent only when a replacement image is
  selected.
- Delete an identity with `DELETE /identities/{id}` after user confirmation.
- Fetch an identity detail through `GET /identities/{id}` when opening its
  detail view.

An identity item/detail has:

```ts
interface Identity {
    id: number;
    name: string;
    image_full: string;
    image_crop: string;
}
```

The list response is expected to use the same paged envelope as the current
event APIs:

```ts
interface IdentityPage {
    items: Identity[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
```

## Network Design

The current `.env` sets `BACKEND_ORIGIN=http://192.168.103.97:8010`, and the
existing Pages API proxy at `/api/backend/[...path]` forwards raw request
bodies with `bodyParser: false`. Identity requests therefore use
`/api/backend/identities` via the existing Axios client; it supports multipart
upload without exposing the upstream origin in browser code.

Create/update builds a `FormData` body in the browser. For update, omit the
`image` field if the user has not selected a replacement file.

Identity image paths such as `/uploads/identities/1/crop.jpg` are presented
through `/api/backend/uploads/identities/1/crop.jpg`, matching event image
handling.

## Interface

Use the visual language established by `/events`:

- New route `src/pages/identities.tsx` within `MainLayout`.
- Add an **Identities** link to the sidebar.
- Header with page title, identity count, refresh action, and primary
  **Thêm identity** action.
- Search panel with name text input and submit/clear behavior.
- Responsive card gallery showing `image_crop`, name, and id.
- Numbered pagination at the bottom with 20 records per page.

Opening a card fetches detail and displays a full-image modal with identity
name/id and **Sửa** and **Xóa** actions.

The create/update form is a modal:

- `name` text input is required in both modes.
- Image file input is required for create and optional for update.
- Display a local preview when a file is selected; in edit mode show the
  current crop/full image until replacement is selected.
- Submit button reflects loading and displays API errors inline.

Delete is protected by a separate confirmation dialog showing the selected
identity name. Successful create/update/delete closes affected dialogs and
refreshes the current list query.

## Architecture

Follow the repository page/manager/component structure:

- `src/interface/identity.ts`: identity types and page contract.
- `src/backend-api/identity-api.ts`: typed list/detail/create/update/delete
  requests using `backendClient`.
- `src/lib/identity-view-model.js`: pure helper functions for page URL/query,
  image proxy URLs, form validation, and filename/label display.
- `src/hooks/use-identity-manager.ts`: query state, list/detail loading,
  pagination, modal state, multipart form actions, deletion, and refresh.
- `src/components/identities/`: dashboard, card, form modal, detail modal,
  delete confirmation, and pagination; a small local `cn` utility may match
  existing features.
- `src/pages/identities.tsx`: thin page composition.
- `src/components/leftmenu/leftmenu.tsx`: sidebar route entry.

The pagination control can reuse the pure `getVisibleEventPages` algorithm or
move it to a neutral helper only if reuse warrants touching Events. To keep
the current Events work stable, Identity components should import the existing
pure page-window function without changing its behavior.

## Data Flow

1. Opening `/identities` loads page 1 at size 20 with no `name` query.
2. Submitting a search resets to page 1 and loads the trimmed name query.
3. Selecting a page loads that page while preserving the submitted name.
4. Clicking a card requests detail by id, then opens the detail modal.
5. Creating submits required `name` and `image` in `FormData`; success
   refreshes the current query.
6. Editing submits `name`, plus `image` only when chosen; success refreshes
   list and updates/closes the detail flow.
7. Confirming deletion removes by id; success refreshes the list. If deletion
   makes a non-first page empty, load the preceding page.

## Loading And Errors

- List loading: render skeleton gallery.
- Empty list: render an explicit no-results message.
- List request error: render an inline retry action.
- Detail request error: retain the list and show detail-load feedback.
- Mutation/delete error: show message inside the active dialog without losing
  entered data.
- Failed or absent images: render a neutral placeholder.
- Dialogs close via close controls and `Escape`; destructive confirmation does
  not occur on overlay click.

## Testing

Use `node:test` coverage consistent with this repository:

- View-model tests cover image proxy URL behavior, form validation and any
  neutral list/query helpers.
- API/source tests assert typed CRUD routes, multipart `FormData` usage, edit
  image optionality, page size 20, search, numbered pagination, detail modal,
  delete confirmation, page composition and sidebar navigation.
- Final verification runs `node --test tests/*.test.mjs`, `npm run lint`, and
  `npm run build`.

## Scope

In scope: identity CRUD, image upload/preview, name search, pagination and
detail preview.

Out of scope: bulk operations, camera/event linkage, recognition enrollment
progress, server-side image cropping, permissions and live polling.

# Identity Management Gallery Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are explicitly authorized and available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an `/identities` gallery for searching, previewing, creating, editing, and deleting face identity profiles with multipart image uploads.

**Architecture:** Follow the existing Pages Router feature split: a thin route mounts `MainLayout`, a manager hook owns API/query/dialog state, focused components render gallery and CRUD dialogs, and pure helpers validate forms and format URLs/pagination. Calls run through the existing `/api/backend/` proxy, whose raw-body forwarding already supports multipart uploads to the configured identity backend.

**Tech Stack:** Next.js 16 Pages Router, React 19, TypeScript, Tailwind CSS v4, Axios, browser `FormData`, `node:test`.

**Safety note:** Shared API/component folders and the recent Events feature are still untracked user-visible work in this checkout. Execute changes carefully in place and do not create an implementation commit that would silently capture unrelated files.

**Design spec:** `docs/superpowers/specs/2026-05-26-identity-management-gallery-design.md`

---

## File Structure

- Create `src/interface/identity.ts`: typed identity entity and page response.
- Create `src/backend-api/identity-api.ts`: list/detail/create/update/delete requests.
- Create `src/lib/identity-view-model.js`: image proxy URL, form validation, form-data payload, and numbered-page utilities.
- Create `src/hooks/use-identity-manager.ts`: list/detail/mutation/delete/dialog state.
- Create `src/components/identities/identity-utils.ts`: local class name helper.
- Create `src/components/identities/identity-card.tsx`: image gallery card.
- Create `src/components/identities/identity-pagination.tsx`: numbered paging controls.
- Create `src/components/identities/identity-detail-modal.tsx`: full-image preview and edit/delete entry actions.
- Create `src/components/identities/identity-form-modal.tsx`: create/edit multipart form with local image preview.
- Create `src/components/identities/delete-identity-modal.tsx`: destructive confirmation.
- Create `src/components/identities/identity-dashboard.tsx`: screen composition and states.
- Create `src/pages/identities.tsx`: route composition.
- Modify `src/components/leftmenu/leftmenu.tsx`: add `/identities` navigation.
- Create `tests/identity-view-model.test.mjs`: pure behavior tests.
- Create `tests/identities-page-structure.test.mjs`: API/hook/UI source contract tests.

## Chunk 1: Identity Domain And API

### Task 1: Pure Form, Image, And Pagination Helpers

**Files:**
- Create: `tests/identity-view-model.test.mjs`
- Create: `src/lib/identity-view-model.js`

- [x] **Step 1: Write failing helper tests**

Test these desired behaviors:

```js
import {
    buildIdentityFormData,
    getIdentityFormError,
    getIdentityImageUrl,
    getVisibleIdentityPages,
} from "../src/lib/identity-view-model.js";

test("requires a name and a create image but permits image-less edits", () => {
    assert.equal(getIdentityFormError({ name: "", image: null }, "create"), "Vui lòng nhập tên.");
    assert.equal(getIdentityFormError({ name: "Hau", image: null }, "create"), "Vui lòng chọn ảnh.");
    assert.equal(getIdentityFormError({ name: " Hau ", image: null }, "edit"), "");
});

test("routes identity images through the backend proxy", () => {
    assert.equal(getIdentityImageUrl("/uploads/identities/1/crop.jpg"), "/api/backend/uploads/identities/1/crop.jpg");
});

test("builds multipart updates without an unchanged image", () => {
    const payload = buildIdentityFormData({ name: " Hau ", image: null });
    assert.equal(payload.get("name"), "Hau");
    assert.equal(payload.has("image"), false);
});

test("builds nearby numbered pagination", () => {
    assert.deepEqual(getVisibleIdentityPages(5, 10), [1, "ellipsis-left", 4, 5, 6, "ellipsis-right", 10]);
});
```

- [x] **Step 2: Run the helper test and confirm RED**

Run: `node --test tests/identity-view-model.test.mjs`

Expected: FAIL because `src/lib/identity-view-model.js` does not exist.

- [x] **Step 3: Implement the smallest helper module**

Implement validation with trimmed name, create-only image requirement,
`FormData` construction that conditionally appends an `image`, image proxy URL
normalization, and a compact page-number window.

- [x] **Step 4: Run the helper test and confirm GREEN**

Run: `node --test tests/identity-view-model.test.mjs`

Expected: PASS.

### Task 2: CRUD Endpoint Contracts

**Files:**
- Create: `tests/identities-page-structure.test.mjs`
- Create: `src/interface/identity.ts`
- Create: `src/backend-api/identity-api.ts`

- [x] **Step 1: Write failing API source-contract tests**

Assert that identity types include `id`, `name`, `image_full`, `image_crop`
and the paged `items` envelope. Assert that `identityApi` supplies:

```ts
list(params: { page: number; size: number; name?: string })
detail(id: number)
create(data: FormData)
update(id: number, data: FormData)
delete(id: number)
```

and targets `"identities"` / `` `identities/${id}` `` with GET/POST/PUT/DELETE.

- [x] **Step 2: Run the structure test and confirm RED**

Run: `node --test tests/identities-page-structure.test.mjs`

Expected: FAIL because the type and API module do not exist.

- [x] **Step 3: Implement the typed API layer**

Create `Identity` and `IdentityPage`, then implement the five API calls via
`backendClient`. Leave browser multipart headers to Axios so it supplies the
correct boundary for `FormData`.

- [x] **Step 4: Run relevant tests and confirm GREEN**

Run: `node --test tests/identities-page-structure.test.mjs tests/identity-view-model.test.mjs`

Expected: PASS.

## Chunk 2: Manager And Gallery UI

### Task 3: Identity Manager Hook

**Files:**
- Create: `src/hooks/use-identity-manager.ts`
- Modify: `tests/identities-page-structure.test.mjs`

- [x] **Step 1: Add failing manager assertions**

Assert the hook imports `identityApi`, uses `IDENTITY_PAGE_SIZE = 20`, tracks
submitted name/current page, calls list/detail/create/update/delete, uses
`buildIdentityFormData`, and exposes dialog open/close/submit handlers.

- [x] **Step 2: Run the structure test and confirm RED**

Run: `node --test tests/identities-page-structure.test.mjs`

Expected: FAIL because the manager hook does not exist.

- [x] **Step 3: Implement manager behavior**

Use guarded client-side effects for list requests. Keep input search separate
from submitted query, resetting page to 1 on search. Open detail by requesting
the individual endpoint. Create/edit validates and posts `FormData`; deletion
refreshes list and backs up one page when deleting the only item on a later
page. Preserve modal form contents when a mutation fails.

- [x] **Step 4: Run the structure tests and confirm GREEN**

Run: `node --test tests/identities-page-structure.test.mjs tests/identity-view-model.test.mjs`

Expected: PASS.

### Task 4: Dashboard, Dialogs, Page, And Sidebar

**Files:**
- Create: `src/components/identities/identity-utils.ts`
- Create: `src/components/identities/identity-card.tsx`
- Create: `src/components/identities/identity-pagination.tsx`
- Create: `src/components/identities/identity-detail-modal.tsx`
- Create: `src/components/identities/identity-form-modal.tsx`
- Create: `src/components/identities/delete-identity-modal.tsx`
- Create: `src/components/identities/identity-dashboard.tsx`
- Create: `src/pages/identities.tsx`
- Modify: `src/components/leftmenu/leftmenu.tsx`
- Modify: `tests/identities-page-structure.test.mjs`

- [x] **Step 1: Add failing UI source-contract tests**

Assert that `/identities` mounts `MainLayout`, `useIdentityManager`, and
`IdentityDashboard`; the dashboard renders name search, add action, cards,
pagination, detail/form/delete modals and list states; the form includes
`type="file"` and mode-specific required image behavior; detail modal includes
full image and edit/delete actions; sidebar contains `href: "/identities"`.

- [x] **Step 2: Run the structure test and confirm RED**

Run: `node --test tests/identities-page-structure.test.mjs`

Expected: FAIL because these UI files and sidebar entry do not exist.

- [x] **Step 3: Implement visual components**

Match Events: slate page, rounded white cards, crop image fallback, full-image
detail dialog, accessible controls, skeleton/empty/error states and compact
numbered pagination. Build create/edit dialog with text and file controls,
object URL preview cleanup, inline mutation errors, and busy buttons. Build
delete dialog with explicit confirmation action.

- [x] **Step 4: Add the page and navigation entry**

Compose `IdentityDashboard` in `MainLayout` at `/identities` and add a
sidebar link with a suitable identity icon.

- [x] **Step 5: Run feature tests and confirm GREEN**

Run: `node --test tests/identity-view-model.test.mjs tests/identities-page-structure.test.mjs`

Expected: PASS.

## Chunk 3: Verification

### Task 5: Whole-Project Validation

**Files:**
- Verify all new and affected files.

- [ ] **Step 1: Run all node tests**

Run: `node --test tests/*.test.mjs`

Expected: PASS with zero failures.

- [ ] **Step 2: Run ESLint**

Run: `npm run lint`

Expected: no errors; note pre-existing warnings outside identity work if still present.

- [ ] **Step 3: Build the application**

Run: `npm run build`

Expected: build succeeds and includes `/identities`. If Turbopack is sandbox-blocked from binding an internal port while processing CSS, rerun with the required sandbox permission.

- [ ] **Step 4: Review working tree scope**

Run: `git status --short --untracked-files=all` and `git diff --check`.

Expected: identity additions are visible without reverting or accidentally committing existing Events/AI/camera work.

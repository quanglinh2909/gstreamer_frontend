# AI Debug MJPEG Preview Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a modal MJPEG debug preview for the active face or license-plate AI job returned from `config-ai`.

**Architecture:** Pure view-model helpers resolve `job_id` and construct a same-origin stream URL. The existing AI manager supplies modal state to a settings button and modal component, while a dedicated Next Pages API route proxies the long-running MJPEG response without buffering it.

**Tech Stack:** Next.js Pages Router/API Routes, React 19, TypeScript, Node streams via Fetch `ReadableStream`, Node test runner, ESLint.

**Design spec:** `docs/superpowers/specs/2026-05-27-ai-debug-mjpeg-preview-design.md`

---

## Chunk 1: Debug Job Contract And URL

### Task 1: View Model And Types

**Files:**
- Modify: `tests/ai-config-view-model.test.mjs`
- Modify: `tests/vehicle-ai-api.test.mjs`
- Modify: `src/interface/ai-config.ts`
- Modify: `src/lib/ai-config-view-model.js`

- [x] Add failing checks for the `job_id` response field, job lookup by active feature, and encoded same-origin MJPEG URL.
- [x] Run `node tests/ai-config-view-model.test.mjs` and `node tests/vehicle-ai-api.test.mjs` and verify RED.
- [x] Implement the backend field and pure debug helpers.
- [x] Run the same tests and verify GREEN.

## Chunk 2: Modal And Stream Proxy

### Task 2: UI And Manager Wiring

**Files:**
- Modify: `tests/ai-config-page-structure.test.mjs`
- Modify: `src/hooks/use-ai-config-manager.ts`
- Modify: `src/components/ai-config/ai-settings-panel.tsx`
- Modify: `src/components/ai-config/ai-config-dashboard.tsx`
- Create: `src/components/ai-config/ai-debug-modal.tsx`

- [x] Add failing assertions for debug helper consumption, modal state, button, and modal rendering.
- [x] Run `node tests/ai-config-page-structure.test.mjs` and verify RED.
- [x] Wire active job state, secondary action, and MJPEG modal.
- [x] Run the same test and verify GREEN.

### Task 3: Streaming Route

**Files:**
- Modify: `tests/ai-config-page-structure.test.mjs`
- Create: `src/pages/api/backend/ai-debug/cameras/[cameraId]/jobs/[jobId]/mjpeg.ts`

- [x] Add failing assertions for a dedicated debug route with disabled response limit and streamed chunk writes.
- [x] Run `node tests/ai-config-page-structure.test.mjs` and verify RED.
- [x] Implement the GET-only streaming backend proxy.
- [x] Run the same test and verify GREEN.

## Chunk 3: Verification

- [x] Run `node --test tests/*.test.mjs`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run lint`, reporting remaining warnings separately.
- [x] Run `npm run build` outside sandbox if Turbopack requires process/port permissions.

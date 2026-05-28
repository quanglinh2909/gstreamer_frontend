# Compact Plate Event Cards Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make plate recognition event cards smaller while keeping face event cards unchanged.

**Architecture:** Keep the existing `EventDashboard`/`EventCard` boundary. The dashboard owns per-tab grid density and skeleton sizing; each card owns per-tab media and metadata sizing.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node test runner, Next.js Pages Router.

**Design spec:** `docs/superpowers/specs/2026-05-27-compact-plate-event-cards-design.md`

---

## Chunk 1: Compact Plate Presentation

### Task 1: Regression Test And Conditional Styling

**Files:**
- Modify: `tests/events-page-structure.test.mjs`
- Modify: `src/components/events/event-card.tsx`
- Modify: `src/components/events/event-dashboard.tsx`

- [x] Write failing assertions for compact plate height, padding, and denser large-screen grid.
- [x] Run `node tests/events-page-structure.test.mjs` and verify RED.
- [x] Implement conditional compact plate styles while preserving face portrait styles.
- [x] Run `node tests/events-page-structure.test.mjs` and verify GREEN.

### Task 2: Verification

- [x] Run `node --test tests/*.test.mjs`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run lint`, reporting pre-existing warnings separately.
- [x] Run `npm run build` outside sandbox if Turbopack requires bind-port permissions.

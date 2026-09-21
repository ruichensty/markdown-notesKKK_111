# Note History Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task when executing in a separate session.

**Goal:** Fix storage, deletion, feedback, and search-pending edge cases found during the third-stage review.

**Architecture:** Apply both count and byte budgets to version retention while always preserving the newest snapshot. Route version deletion and automatic-save failures through `useNotes` so cache invalidation, retry, and cross-tab notifications share one owner. Make the search UI explicitly represent its debounce window.

**Tech Stack:** React 19, TypeScript, IndexedDB, BroadcastChannel, Vitest.

---

### Task 1: Add a byte-aware retention policy

**Files:**

- Modify: `src/utils/noteVersion.ts`
- Modify: `src/utils/indexedDBStorage.ts`
- Modify: `src/utils/__tests__/noteVersion.test.ts`

**Steps:**

1. Estimate UTF-8 title and content size for each version.
2. Retain at most 50 versions and approximately 10 MB per note.
3. Always preserve the newest version even when it exceeds the byte budget.
4. Test count, byte-budget, and oversized-latest behavior.

### Task 2: Centralize version deletion and failure recovery

**Files:**

- Modify: `src/hooks/useNotes.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/NoteHistoryDialog.tsx`
- Modify: `src/utils/crossTabSync.ts`

**Steps:**

1. Expose version deletion from `useNotes` and invalidate its snapshot-time cache.
2. Confirm permanent version deletion in the history dialog.
3. Broadcast version changes and reload an open history dialog in other tabs.
4. Surface automatic snapshot failures through a retryable toast without blocking note saves.

### Task 3: Represent search debounce explicitly

**Files:**

- Modify: `src/components/NoteList.tsx`
- Modify: `src/components/NoteSearchResults.tsx`
- Modify: `src/index.css`

**Steps:**

1. Detect when the debounced query trails the input query.
2. Show a searching state rather than a false empty result.
3. Disable stale batch-selection IDs during the pending window.
4. Normalize leading `#` consistently for search and highlighting.

### Task 4: Verify

**Steps:**

1. Run `pnpm type-check`, `pnpm lint`, and `git diff --check`.
2. Run tests and build when esbuild child-process execution is permitted.

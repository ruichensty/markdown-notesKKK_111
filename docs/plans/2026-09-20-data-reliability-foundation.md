# Data Reliability Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task when executing in a separate session.

**Goal:** Prevent editor draft loss, standardize non-note persistence failures, and improve IndexedDB durability and quota hygiene.

**Architecture:** Keep editor drafts local but track dirty/flush state explicitly. Reuse a serialized debounced persistence hook for settings and folders, surface template errors through App, and add a conservative storage-maintenance utility plus persistent-storage controls in the status bar.

**Tech Stack:** React 19, TypeScript, IndexedDB, StorageManager API, Vitest.

---

### Task 1: Make editor drafts explicit

**Files:**

- Modify: `src/components/Editor.tsx`
- Test: `src/components/__tests__/Editor.test.tsx`

**Steps:**

1. Track title/content refs and a dirty flag.
2. Route user, toolbar, paste, drop, and AI changes through draft-aware setters.
3. Flush the old note before switching IDs.
4. Accept same-note external content only when the draft is clean.
5. Flush on unmount and keep the existing typing debounce.

### Task 2: Add reusable persistence control

**Files:**

- Create: `src/hooks/useDebouncedPersistence.ts`
- Modify: `src/hooks/index.ts`
- Modify: `src/hooks/useSettings.ts`
- Modify: `src/hooks/useFolders.ts`
- Modify: `src/hooks/useTemplates.ts`
- Modify: `src/App.tsx`

**Steps:**

1. Serialize saves and debounce value changes.
2. Expose saved/saving/error status, retry, clear-error, and flush.
3. Replace settings and folder save effects with the shared hook.
4. Expose template operation failures instead of swallowing them.
5. Display each failure once through the existing toast system.

### Task 3: Protect browser storage

**Files:**

- Modify: `src/hooks/useStorageEstimate.ts`
- Modify: `src/components/StatusBar.tsx`
- Create: `src/utils/storageMaintenance.ts`
- Create: `src/utils/__tests__/storageMaintenance.test.ts`
- Modify: `src/App.tsx`

**Steps:**

1. Detect persistent-storage support and current grant state.
2. Request persistence only from a user gesture in the status bar.
3. Highlight usage above 80% and critical usage above 90%.
4. Identify old file records not referenced by notes or the AI avatar setting.
5. Delete conservative orphan candidates once after application data loads.

### Task 4: Verify

**Files:**

- Test: new editor and storage-maintenance tests

**Steps:**

1. Run `pnpm type-check` and `pnpm lint`.
2. Run `pnpm test` and `pnpm build` when esbuild child-process execution is permitted.
3. Run `git diff --check` and inspect the complete diff.

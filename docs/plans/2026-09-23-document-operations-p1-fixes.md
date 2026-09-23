# Document Operations P1 Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task when executing in a separate session.

**Goal:** Fix the highest-risk document-operation issues involving stale drafts, non-atomic deletion, autosave semantics, PDF output, and attachment validation.

**Architecture:** Route template insertion through the editor's latest snapshot. Move permanent deletion into one IndexedDB transaction spanning notes, files, and versions. Make autosave an explicit useNotes policy and provide a direct latest-editor snapshot save path for manual/page lifecycle saves. Generate printable HTML in a dedicated window so PDF export is independent of the mounted view.

**Tech Stack:** React 19, TypeScript, IndexedDB, Web APIs, Vitest.

---

### Task 1: Insert templates into the latest draft

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/components/Editor.tsx`

**Steps:**

1. Read the latest EditorHandle snapshot when the editor is mounted.
2. Apply template variables using the local draft title.
3. Append through EditorHandle and update note state without losing unsaved input.
4. Fall back to currentNote only when no editor is mounted.

### Task 2: Make permanent deletion transactional

**Files:**

- Modify: `src/utils/indexedDBStorage.ts`
- Modify: `src/hooks/useNotes.ts`
- Modify: `src/App.tsx`

**Steps:**

1. Delete notes, attachment files, and version cursors in one transaction.
2. Update React and previous-persisted snapshots only after transaction success.
3. Surface failures through the existing storage error path.
4. Apply the same transaction to empty-trash operations.

### Task 3: Honor autosave and lifecycle flushing

**Files:**

- Modify: `src/hooks/useNotes.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Editor.tsx`

**Steps:**

1. Pass the autosave setting into useNotes.
2. Skip the debounce persistence effect when autosave is disabled.
3. Add a direct save path for the latest editor snapshot.
4. Use it for manual save, hidden-page, and pagehide events when autosave is enabled.

### Task 4: Export PDF independently of view mode

**Files:**

- Modify: `src/utils/export.ts`
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/utils/__tests__/export.test.ts`

**Steps:**

1. Build sanitized standalone HTML for the current note.
2. Open a print window synchronously from the user gesture.
3. Write the document and invoke print after resources load.
4. Reuse attachment inlining and avoid dependence on `.print-area`.

### Task 5: Validate document attachments

**Files:**

- Create: `src/utils/documentImage.ts`
- Create: `src/utils/__tests__/documentImage.test.ts`
- Modify: `src/components/Editor.tsx`
- Modify: `src/App.tsx`

**Steps:**

1. Restrict MIME types and enforce a 10 MB limit.
2. Validate PNG, JPEG, WebP, and GIF signatures.
3. Validate decoded dimensions up to 4096 × 4096.
4. Catch IndexedDB and decoding failures and report them through App.
5. Avoid adding attachment metadata when the marker was not inserted.

### Task 6: Verify

1. Run `pnpm type-check`, `pnpm lint`, and `git diff --check`.
2. Run tests and build when esbuild child-process execution is permitted.

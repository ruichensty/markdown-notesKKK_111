# Note History and Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task when executing in a separate session.

**Goal:** Add bounded local note history with safe restore and upgrade search with scopes, date filters, excerpts, highlighting, tags, and wiki-link metadata.

**Architecture:** Store full note snapshots in a dedicated IndexedDB store with five-minute throttling and 50-version retention. Keep search metadata derived from Markdown source through pure utilities and render specialized search-result cards without modifying the Note schema.

**Tech Stack:** React 19, TypeScript, IndexedDB, Vitest, CSS.

---

### Task 1: Add the note-version store

**Files:**

- Modify: `src/types/note.ts`
- Modify: `src/utils/indexedDBStorage.ts`
- Modify: `src/utils/backup.ts`
- Modify: `src/utils/__tests__/backup.test.ts`

**Steps:**

1. Define the NoteVersion type and bump IndexedDB to version 4.
2. Add note ID and creation-time indexes.
3. Add list, save, delete-per-note, prune, and get-all operations.
4. Include versions in backup v2 and accept v1 backups without versions.
5. Restore versions in the same replacement transaction.

### Task 2: Capture bounded snapshots

**Files:**

- Create: `src/utils/noteVersion.ts`
- Create: `src/utils/__tests__/noteVersion.test.ts`
- Modify: `src/hooks/useNotes.ts`

**Steps:**

1. Detect meaningful title or content changes.
2. Snapshot the previously stored note at most once per five minutes.
3. Retain the newest 50 versions per note.
4. Remove history when a note is permanently purged.

### Task 3: Build history restore UI

**Files:**

- Create: `src/components/NoteHistoryDialog.tsx`
- Modify: `src/components/index.ts`
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/Editor.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Steps:**

1. Add a toolbar history action for the current note.
2. Load and display versions with timestamps, sizes, and excerpts.
3. Compare the selected version with the current title/content.
4. Capture the current draft before restore.
5. Apply the selected snapshot through the editor and note state.

### Task 4: Add derived metadata and ranked search

**Files:**

- Create: `src/utils/noteSearch.ts`
- Create: `src/utils/__tests__/noteSearch.test.ts`
- Create: `src/components/NoteSearchResults.tsx`
- Modify: `src/components/NoteList.tsx`
- Modify: `src/index.css`

**Steps:**

1. Parse hashtags and wiki links from Markdown.
2. Search title, content, or tags with weighted ranking.
3. Add all/title/content/tag scopes and all/7-day/30-day date filters.
4. Render matched-field labels, highlighted titles, excerpts, and tag chips.
5. Preserve selection mode, context menus, and note deletion actions.

### Task 5: Verify

**Files:**

- Test: version, backup, and search utilities

**Steps:**

1. Run `pnpm type-check` and `pnpm lint`.
2. Run `pnpm test` and `pnpm build` when esbuild execution is permitted.
3. Run `git diff --check` and inspect database-upgrade and restore paths.

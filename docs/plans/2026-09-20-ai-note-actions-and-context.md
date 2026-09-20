# AI Note Actions and Context Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task when executing in a separate session.

**Goal:** Let users send a selection, Markdown section, or full note to AI and safely apply AI responses back to notes with preview and undo while reducing streaming persistence writes.

**Architecture:** The editor exposes the latest local snapshot through an imperative handle. Pure utilities derive context and build edit previews; `App` coordinates validation, application, and undo, while `AiChatPanel` owns only presentation state. Chat deltas update React state frequently but persist through throttled checkpoints and final saves.

**Tech Stack:** React 19, TypeScript, IndexedDB, Vitest, Testing Library.

---

### Task 1: Add pure context and note-edit operations

**Files:**

- Create: `src/types/aiNote.ts`
- Create: `src/utils/aiNoteActions.ts`
- Create: `src/utils/__tests__/aiNoteActions.test.ts`
- Modify: `src/types/index.ts`

**Steps:**

1. Define editor snapshot, context mode, context payload, apply mode, preview, and result types.
2. Extract a non-empty selection exactly.
3. Find the nearest Markdown heading and stop at the next heading of equal or higher level.
4. Build full-note context and truncate transmitted content to 8000 characters with explicit metadata.
5. Build append, replace-selection, and new-note previews without mutating source strings.
6. Test heading boundaries, empty selections, truncation, separators, and replacement ranges.

### Task 2: Expose the latest editor state

**Files:**

- Modify: `src/components/Editor.tsx`

**Steps:**

1. Extend `EditorHandle` with `getSnapshot` and `applyContent`.
2. Read from the local content ref and current textarea selection.
3. Apply content locally and position the caret without waiting for note-state hydration.
4. Keep existing debounced note persistence behavior.

### Task 3: Coordinate previews, application, and undo

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/components/AiAssistantWidget.tsx`

**Steps:**

1. Build context from the mounted editor or current note fallback.
2. Build apply previews from the latest snapshot.
3. Re-read and compare source content before confirming an edit.
4. Apply to the editor or note store and retain one reversible text edit.
5. Create AI-generated notes through the existing note creation path.

### Task 4: Upgrade the chat panel workflow

**Files:**

- Modify: `src/components/AiChatPanel.tsx`
- Modify: `src/index.css`
- Modify: `src/utils/aiClient.ts`
- Modify: `src/components/__tests__/AiChatPanel.test.tsx`

**Steps:**

1. Replace the context toggle with none, selection, section, and full-note modes.
2. Show source label, character count, truncation state, and an expandable content preview.
3. Add copy, append, replace selection, and create-note actions to assistant messages.
4. Require confirmation through a before/after preview for note mutations.
5. Show application errors and a one-step undo action.
6. Include context-kind metadata in the AI system prompt.

### Task 5: Throttle chat persistence

**Files:**

- Modify: `src/hooks/useAiChat.ts`

**Steps:**

1. Maintain a synchronous chats ref alongside React state.
2. Throttle in-progress chat saves to at most one transaction per second.
3. Save immediately after completion, cancellation, or an error-state cleanup.
4. Clear pending timers when deleting chats or unmounting.

### Task 6: Verify

**Files:**

- Test: `src/utils/__tests__/aiNoteActions.test.ts`
- Test: `src/components/__tests__/AiChatPanel.test.tsx`

**Steps:**

1. Run `pnpm type-check` and `pnpm lint`.
2. Run `pnpm test` and `pnpm build` when esbuild child-process execution is permitted.
3. Run `git diff --check` and inspect all modified files.

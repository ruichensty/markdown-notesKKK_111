# ADR-0002: Route AI note edits through editor snapshots

## Status

Accepted

## Context

The editor keeps an immediate local text value and publishes changes to note state through a debounce. AI context must use the latest unsaved text and selection, while AI-generated edits must not overwrite content that changed after a preview was created. The chat panel should not become a second owner of note state.

## Decision

Expose a small imperative editor contract that returns the latest note text and selection and can apply a complete text value. Define pure utilities that derive selection, Markdown section, and full-note context ranges and that build append, selection-replacement, or new-note previews.

The application remains the coordinator: it obtains editor snapshots, creates previews, verifies that the source content is unchanged at confirmation time, applies the result through the mounted editor or `useNotes`, and retains one reversible edit. The chat panel only requests context and edit intents through callbacks.

AI chat rendering and persistence are separated. Streaming deltas update in-memory React state every 50 ms, while IndexedDB receives throttled checkpoints at most once per second and an immediate final save.

## Consequences

### Positive

- AI uses the latest editor text instead of a potentially stale debounced note.
- Preview confirmation cannot silently overwrite intervening edits.
- Context extraction and edit generation are pure and testable.
- Streaming remains responsive while reducing IndexedDB write pressure.

### Negative

- The editor exposes a slightly larger imperative API.
- Only one AI edit is retained for undo.
- Preview generation stores full before/after strings temporarily in memory.

### Neutral

- New-note creation uses the existing `createNote` path and does not participate in single-step text undo.

## Alternatives Considered

**Let the chat panel mutate notes directly**

- Rejected because it would duplicate state ownership and bypass the editor's latest local value.

**Always read `currentNote.content`**

- Rejected because the editor publishes content with a debounce and the value can be stale.

**Persist every streamed delta**

- Rejected because it creates unnecessary IndexedDB transactions during long responses.

## References

- `src/components/Editor.tsx`
- `src/utils/aiNoteActions.ts`
- `src/hooks/useAiChat.ts`

# ADR-0005: Use bounded note snapshots and derived search metadata

## Status

Accepted

## Context

Users need protection from accidental edits and a faster way to find information as the notebook grows. Full snapshots on every keystroke would consume excessive IndexedDB space, while adding persisted tags and links would require migrating every existing note and keeping duplicate metadata synchronized.

## Decision

Add a dedicated `note_versions` IndexedDB store. Before overwriting a stored note, capture the previous title and content when no automatic snapshot has been created for that note in the last five minutes. Retain at most 50 snapshots per note. Manual restore first captures the current draft as a recovery snapshot, then applies the selected version.

Include versions in backup format v2 while continuing to accept v1 backups with an empty history.

Keep search metadata derived from Markdown source. Parse `#tags` and `[[wiki links]]` without changing the Note schema. Build in-memory search results with weighted title, tag, and content matches, date filters, matched fields, and excerpts. This index remains derived from the current notes array and requires no migration.

## Consequences

### Positive

- Users can recover historical content without unbounded storage growth.
- Restore operations are reversible through a pre-restore snapshot.
- Existing notes immediately gain tag and wiki-link metadata.
- Search relevance and feedback improve without a new dependency.

### Negative

- Full snapshots duplicate note content up to the retention limit.
- Search remains O(total note text) when the notes array changes.
- Tags and wiki links are syntactic metadata rather than editable database entities.

### Neutral

- A Web Worker or persistent full-text index can replace the search implementation later without changing UI result types.

## Alternatives Considered

**Store a version on every autosave**

- Rejected due to rapid database growth during active typing.

**Store text patches instead of snapshots**

- Deferred because patch chains complicate corruption recovery and restore logic.

**Persist tags and backlinks on each note**

- Rejected for this phase to avoid schema duplication and migrations.

## References

- `src/utils/indexedDBStorage.ts`
- `src/utils/noteSearch.ts`

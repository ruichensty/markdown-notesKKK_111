# ADR-0003: Centralize draft and persistence lifecycles

## Status

Accepted

## Context

The editor owns immediate local text while notes are persisted through a debounce. Settings and folders use separate save effects, and template failures are silent. This creates inconsistent retry behavior and risks stale editor drafts during note switches or external same-note updates. Browser storage may also remain evictable, and detached file records can consume quota indefinitely.

## Decision

Keep the editor's local draft for typing performance, but explicitly track whether it is dirty. Flush the previous note before switching or unmounting, accept same-note external updates only when the local draft is clean, and route every editor mutation through draft-aware setters.

Introduce a reusable debounced persistence hook for settings and folders. The hook serializes saves, exposes status/error/retry/flush, and performs a best-effort final flush. Template operations expose their persistence failures through the same application-level toast path.

Extend storage estimation with the browser persistent-storage state and a user-triggered persistence request. Run conservative orphan cleanup only for file records older than one hour and unreferenced by note attachment metadata or the custom AI avatar setting.

## Consequences

### Positive

- Note switching no longer leaves an unflushed editor draft.
- External updates can refresh a clean editor without overwriting active typing.
- Settings and folder saves have consistent throttling, retry, and visible failures.
- Users can request durable browser storage and reclaim leaked attachment records.

### Negative

- Draft state requires explicit setters throughout the editor.
- Final async flushes remain best-effort because browsers do not guarantee IndexedDB completion during unload.
- Conservative orphan cleanup may leave recent orphan records until the next session.

### Neutral

- IndexedDB stores and backup formats remain unchanged.

## Alternatives Considered

**Make the editor fully controlled**

- Rejected for now because every keystroke would update the application-wide notes array and preview consumers.

**Use independent persistence effects in every hook**

- Rejected because retry, serialization, and error semantics would continue to diverge.

**Delete every unreferenced file immediately**

- Rejected because an upload and its note metadata update are separate asynchronous steps.

## References

- `src/components/Editor.tsx`
- `src/hooks/useDebouncedPersistence.ts`
- `src/utils/storageMaintenance.ts`

# ADR-0004: Encrypt backups and broadcast data-domain changes

## Status

Accepted

## Context

Full backups contain notes, attachments, AI conversations, settings, and API keys. Plain JSON remains useful for portability, but users need an optional confidential format and safer restore workflow. At the same time, only notes currently synchronize across same-origin browser tabs, so settings, folders, templates, theme, and AI conversations can diverge or overwrite one another.

## Decision

Keep the existing plaintext backup format for compatibility and add a versioned encrypted envelope. Derive an AES-256-GCM key from a user password using PBKDF2-SHA-256 with a random 128-bit salt and 250,000 iterations; use a random 96-bit IV for each export. Store only algorithm metadata, salt, IV, and ciphertext. Passwords never enter settings or IndexedDB.

Inspect and validate a backup before enabling restore. Immediately before replacement, export the current database as a recovery download, using the same password when the incoming backup is encrypted. Keep restore replacement transactional.

Add a source-tagged BroadcastChannel for non-note data domains. Messages contain only the changed domain, never payload data or secrets. Receivers reload authoritative values from IndexedDB and suppress the next local persistence cycle, preventing echo loops. AI conversation reloads are deferred while a response is streaming.

## Consequences

### Positive

- Exported backups can protect notes and API keys at rest.
- GCM authenticates ciphertext and fails closed for wrong passwords or tampering.
- Restore shows contents before destructive replacement and creates a rollback file.
- Same-origin tabs converge without broadcasting sensitive payloads.

### Negative

- Forgotten backup passwords cannot be recovered.
- PBKDF2 adds intentional CPU cost during encrypted import/export.
- Data-domain synchronization is last-writer-wins rather than conflict-free merging.

### Neutral

- Existing plaintext backups remain readable.
- Notes continue using their existing note-specific BroadcastChannel.

## Alternatives Considered

**Store the encryption password locally**

- Rejected because it would defeat protection of exported backup files.

**Broadcast complete settings or chat payloads**

- Rejected to minimize sensitive data exposure and message size.

**Use localStorage events for synchronization**

- Rejected because BroadcastChannel already matches the existing browser requirements and avoids persisting transient messages.

## References

- `src/utils/backup.ts`
- `src/utils/crossTabSync.ts`

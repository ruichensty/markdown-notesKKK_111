# Storage foundation implementation plan

**Goal:** Complete the browser reliability baseline, validate backups before writes, and establish a replaceable storage boundary for the desktop migration.

**Architecture:** Keep IndexedDB as the active adapter. Define a typed storage contract for notes, folders, attachments, history, settings, templates, chats and whole-library replacement. Route application callers through a facade. Migration/cache operations remain browser-adapter concerns for this stage.

**Tech Stack:** React, TypeScript, IndexedDB, Vitest.

## Tasks

1. Preserve existing uncommitted reliability changes and regression tests.
2. Add backup record, ID, reference, folder-cycle, timestamp, Base64 and resource-limit validation. Normalize v1 history without mutating input. Validate decrypted data before replacement.
3. Add the storage contract and IndexedDB adapter, and redirect business/UI access to the facade. Preserve compare-and-write and atomic replacement semantics in the contract.
4. Test invalid backups never reach storage and that the facade delegates to a replaceable implementation.
5. Run type-check, lint, tests and production build without starting the app.

## Boundaries

This stage does not install Tauri or touch actual user libraries. The browser bootstrap still owns localStorage migration and initial cache loading. The next stage adds the desktop shell; the file backend must provide equivalent atomic writes, conflicts, purge and recovery semantics before it can become the active adapter.

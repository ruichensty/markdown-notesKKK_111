# Secure Backup and Cross-Tab Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task when executing in a separate session.

**Goal:** Add optional encrypted backups, restore inspection and rollback downloads, and synchronize non-note data domains across browser tabs without echo loops.

**Architecture:** Wrap validated backup JSON in an authenticated AES-GCM envelope derived from a user password. Use a payload-free BroadcastChannel notification layer; domain hooks reload IndexedDB data and suppress one persistence cycle after remote updates.

**Tech Stack:** React 19, TypeScript, Web Crypto, IndexedDB, BroadcastChannel, Vitest.

---

### Task 1: Add encrypted backup primitives

**Files:**

- Modify: `src/utils/backup.ts`
- Modify: `src/utils/__tests__/backup.test.ts`

**Steps:**

1. Refactor backup collection and serialization into reusable functions.
2. Define and validate the encrypted envelope metadata.
3. Derive an AES-GCM key with PBKDF2-SHA-256, random salt, and 250,000 iterations.
4. Add encrypted export, format detection, inspection, and password-aware restore.
5. Return generic decryption errors without exposing cryptographic details.
6. Test plaintext compatibility, encryption round trips, wrong passwords, and tampering.

### Task 2: Upgrade backup settings UI

**Files:**

- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/index.css`

**Steps:**

1. Add an optional password field with minimum-length guidance and visibility toggle.
2. Export encrypted backups when a password is present.
3. Inspect selected plaintext backups immediately.
4. Request a password before inspecting encrypted backups.
5. Show note, folder, attachment, template, AI-chat counts, export time, and file size.
6. Download a current-data rollback backup before transactional replacement.

### Task 3: Add safe cross-tab notifications

**Files:**

- Create: `src/utils/crossTabSync.ts`
- Create: `src/utils/__tests__/crossTabSync.test.ts`
- Modify: `src/hooks/useDebouncedPersistence.ts`

**Steps:**

1. Define settings, folders, templates, theme, and AI-chat data domains.
2. Tag messages with a per-tab source ID and broadcast no payload data.
3. Subscribe and unsubscribe through a lazy shared channel.
4. Add `skipNextPersist` to the persistence hook to prevent echo loops.

### Task 4: Integrate each data domain

**Files:**

- Modify: `src/hooks/useSettings.ts`
- Modify: `src/hooks/useFolders.ts`
- Modify: `src/hooks/useTemplates.ts`
- Modify: `src/context/ThemeContext.tsx`
- Modify: `src/hooks/useAiChat.ts`

**Steps:**

1. Publish only after successful IndexedDB writes.
2. Reload authoritative data when another tab publishes a change.
3. Suppress persistence after remote settings and folder hydration.
4. Keep template built-ins while refreshing custom templates.
5. Ignore AI-chat reloads during active streaming and refresh after completion.

### Task 5: Verify

**Files:**

- Test: backup and cross-tab utilities

**Steps:**

1. Run `pnpm type-check` and `pnpm lint`.
2. Run `pnpm test` and `pnpm build` when esbuild execution is permitted.
3. Run `git diff --check` and complete a security review of password handling and message payloads.

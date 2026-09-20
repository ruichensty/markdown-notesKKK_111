# AI UI Theme System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task when executing in a separate session.

**Goal:** Add three switchable AI assistant UI styles plus safe creation, import, export, and removal of custom `.aiui.json` themes.

**Architecture:** Define a versioned theme package schema and validate it before persistence. Resolve built-in or imported tokens into scoped CSS variables passed through `AiAssistantWidget` to the avatar, tip, and `AiChatPanel`; keep avatar images and AI behavior independent from UI themes.

**Tech Stack:** React 19, TypeScript, IndexedDB-backed settings, CSS custom properties, Vitest, Testing Library.

---

### Task 1: Define and validate the theme package

**Files:**

- Create: `src/types/aiUiTheme.ts`
- Create: `src/utils/aiUiTheme.ts`
- Create: `src/utils/__tests__/aiUiTheme.test.ts`
- Modify: `src/types/index.ts`

**Steps:**

1. Define built-in style IDs, package metadata, token fields, and version constants.
2. Validate the format, version, metadata lengths, hexadecimal colors, and numeric token ranges.
3. Reject unknown executable or layout-bearing content by copying only known properties.
4. Generate scoped CSS custom properties and a downloadable starter theme.
5. Test valid packages, unsafe values, range failures, and property filtering.

### Task 2: Persist and apply the selected style

**Files:**

- Modify: `src/hooks/useSettings.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AiAssistantWidget.tsx`
- Modify: `src/components/AiChatPanel.tsx`

**Steps:**

1. Add `aiUiStyle` and `aiCustomUiTheme` settings with backward-compatible defaults.
2. Pass theme settings from `App` into the assistant.
3. Apply a style class and resolved CSS variables to the avatar, tip, and panel.
4. Keep all existing interaction, speech, chat, and avatar state logic unchanged.

### Task 3: Build theme management in settings

**Files:**

- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/index.css`

**Steps:**

1. Add visual cards for digital companion, desktop pet, and minimal tool styles.
2. Add a hidden `.aiui.json` input and validate imported files before saving.
3. Add starter-theme export so users can edit a documented safe file.
4. Show imported theme metadata, success/error feedback, activation, and removal controls.
5. Add previews and responsive styling without changing the existing avatar selector.

### Task 4: Create three distinct visual systems

**Files:**

- Modify: `src/index.css`

**Steps:**

1. Refine the companion style with a precise luminous frame and status halo.
2. Create a soft, tactile pet style with warm surfaces and playful motion.
3. Create a restrained minimal style with flat surfaces, compact spacing, and low motion.
4. Map custom tokens to shared avatar, tip, panel, message, and control rules.
5. Preserve reduced-motion, dark-theme, touch-target, and mobile behavior.

### Task 5: Verify

**Files:**

- Test: `src/utils/__tests__/aiUiTheme.test.ts`
- Test: existing AI panel tests

**Steps:**

1. Run `pnpm type-check` and expect zero errors.
2. Run `pnpm lint` and expect zero errors and warnings.
3. Run `pnpm test` and expect all tests to pass when esbuild execution is permitted.
4. Run `pnpm build` and expect a successful Vite build when esbuild execution is permitted.
5. Run `git diff --check` and inspect the final file set.

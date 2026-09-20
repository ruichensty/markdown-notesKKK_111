# AI Assistant Interaction Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task when executing in a separate session.

**Goal:** Improve the floating AI assistant's privacy clarity, streaming controls, scrolling, mobile behavior, accessibility, deletion safety, and drag feedback without changing its visual identity or stored data format.

**Architecture:** Keep `AiAssistantWidget` responsible for the floating avatar, drag state, panel visibility, and focus restoration. Keep `AiChatPanel` responsible for conversation interaction, explicit note-context consent, responsive viewport placement, message scrolling, confirmation UI, and accessible status announcements. Extend the existing CSS classes instead of introducing a component library.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, project-level CSS, Vitest, Testing Library.

---

### Task 1: Make floating-avatar interaction robust

**Files:**

- Modify: `src/components/AiAssistantWidget.tsx`
- Modify: `src/index.css`

**Steps:**

1. Track the avatar DOM node and active drag state.
2. Add pointer-cancel cleanup and always restore `document.body.style.userSelect`.
3. Apply the existing dragging class while the pointer is moving.
4. Restore focus to the avatar when the chat panel closes.
5. Verify click, keyboard activation, drag completion, and drag cancellation.

### Task 2: Make context sharing explicit and destructive actions safe

**Files:**

- Modify: `src/components/AiChatPanel.tsx`
- Modify: `src/index.css`

**Steps:**

1. Disable note-dependent quick prompts until “引用当前笔记” is explicitly enabled.
2. Explain the disabled state through visible and accessible text.
3. Replace immediate conversation deletion with an inline confirmation state.
4. Clear stale confirmation state when the selected conversation changes.
5. Verify ordinary prompts still work without note context.

### Task 3: Improve streaming and scrolling

**Files:**

- Modify: `src/components/AiChatPanel.tsx`
- Modify: `src/index.css`

**Steps:**

1. Show “停止生成” for the entire streaming lifecycle, including before the first token.
2. Follow new output only while the reader is already near the bottom.
3. Show a “回到最新” control after the reader scrolls away from the bottom.
4. Resume following after sending, selecting the latest control, or changing chats.
5. Add polite live status announcements for generation and speech state.

### Task 4: Improve mobile layout and focus behavior

**Files:**

- Modify: `src/components/AiChatPanel.tsx`
- Modify: `src/index.css`

**Steps:**

1. Position the panel using `window.visualViewport` when available.
2. Recalculate on visual-viewport resize and scroll so mobile keyboards do not cover the composer.
3. Focus the message input when the panel opens and return focus to the avatar on close.
4. Increase interactive targets and keep speech actions visible on touch devices.
5. Add compact narrow-screen rules for the header, toolbar, prompts, and safe-area inset.

### Task 5: Verify the result

**Files:**

- Test: existing test suite and static checks

**Steps:**

1. Run `pnpm type-check`; expect zero TypeScript errors.
2. Run `pnpm lint`; expect zero ESLint errors and warnings.
3. Run `pnpm test`; expect all existing tests to pass.
4. Run `pnpm build`; expect a successful Vite production build.
5. Inspect the final diff for unrelated changes and confirm the worktree state.

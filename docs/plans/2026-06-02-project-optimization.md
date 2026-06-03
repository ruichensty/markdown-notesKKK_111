# Markdown Notes 项目优化计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 系统性修复安全漏洞、代码质量、构建体积、性能和可维护性问题，使 lint 零 error、依赖无已知高危漏洞、构建产物精简。

**Architecture:** 保持现有 React + TypeScript + Vite + Tailwind + IndexedDB 技术栈不变，按"安全 → 质量 → 体积 → 性能 → 可靠性"分层推进，每个阶段独立可交付。

**Tech Stack:** React 19, TypeScript ~5.9, Vite 4.x, Tailwind CSS 3, IndexedDB, react-markdown, mermaid, react-syntax-highlighter

---

## 前置条件

在开始之前，确认当前项目状态：

```bash
# 记录基线
pnpm lint          # 预期：5 errors, 4 warnings
pnpm type-check    # 预期：通过
pnpm build         # 预期：通过，有大 chunk 警告
pnpm audit --audit-level moderate  # 预期：22 vulnerabilities
```

---

## Phase 1: 安全修复（最高优先级）

### Task 1.1: 升级 Vite 和 Rollup，修复已知安全漏洞

**Files:**

- Modify: `package.json:50-56`
- Modify: `pnpm-lock.yaml`

**Step 1: 移除 Rollup override 并升级 Vite**

将 `package.json` 中的：

```json
"vite": "4.5.3"
```

改为：

```json
"vite": "^4.5.14"
```

移除 `pnpm.overrides` 中的 rollup 固定：

```json
"pnpm": {
  "overrides": {}
}
```

**Step 2: 安装依赖**

```bash
pnpm install
```

**Step 3: 验证构建正常**

```bash
pnpm build
```

预期：构建成功。如果 rollup 版本变化导致兼容问题，在 `pnpm.overrides` 中把 rollup 固定到 `>=3.29.5`（而非 `3.29.4`）。

**Step 4: 验证漏洞减少**

```bash
pnpm audit --audit-level high
```

预期：Vite/Rollup 相关的高危漏洞消失。

**Step 5: 提交**

```bash
git add package.json pnpm-lock.yaml
git commit -m "fix: upgrade vite to 4.5.14 and unpin rollup to fix security vulnerabilities"
```

---

### Task 1.2: 升级 Mermaid 修复 XSS/CSS 注入漏洞

**Files:**

- Modify: `package.json:22`
- Modify: `pnpm-lock.yaml`

**Step 1: 升级 mermaid**

将 `package.json` 中的：

```json
"mermaid": "^10.9.5"
```

改为：

```json
"mermaid": "^10.9.6"
```

**Step 2: 安装并验证**

```bash
pnpm install
pnpm build
```

预期：构建成功，mermaid 图表功能正常。

**Step 3: 验证漏洞**

```bash
pnpm audit --audit-level moderate 2>&1 | grep mermaid
```

预期：mermaid 相关漏洞消失。

**Step 4: 提交**

```bash
git add package.json pnpm-lock.yaml
git commit -m "fix: upgrade mermaid to 10.9.6 to fix XSS and CSS injection vulnerabilities"
```

---

### Task 1.3: 为 HTML 导出添加净化处理

**Files:**

- Modify: `src/utils/export.ts:34-73`

**Step 1: 安装 DOMPurify**

```bash
pnpm add dompurify && pnpm add -D @types/dompurify
```

**Step 2: 修改 `src/utils/export.ts`**

在文件顶部添加导入：

```typescript
import DOMPurify from "dompurify";
```

将 `exportAsHTML` 函数中的：

```typescript
const htmlBody = marked.parse(note.content);
```

改为：

```typescript
const htmlBody = DOMPurify.sanitize(marked.parse(note.content) as string);
```

**Step 3: 验证构建和功能**

```bash
pnpm build
```

手动测试：创建包含 `<script>alert('xss')</script>` 的笔记，导出为 HTML，确认脚本标签被移除。

**Step 4: 提交**

```bash
git add src/utils/export.ts package.json pnpm-lock.yaml
git commit -m "fix: sanitize HTML output in export to prevent XSS"
```

---

### Task 1.4: 为 Preview 组件的 rehype-raw 添加安全净化

**Files:**

- Modify: `src/components/Preview.tsx:4-6,128-129`

**Step 1: 安装 rehype-sanitize**

```bash
pnpm add rehype-sanitize
```

**Step 2: 修改 `src/components/Preview.tsx`**

添加导入：

```typescript
import rehypeSanitize from "rehype-sanitize";
```

将 rehypePlugins 从：

```typescript
const rehypePlugins = useMemo(() => [rehypeRaw, rehypeKatex], []);
```

改为：

```typescript
const rehypePlugins = useMemo(() => [rehypeRaw, rehypeSanitize, rehypeKatex], []);
```

**Step 3: 验证**

```bash
pnpm build
```

手动测试：在笔记中写入 `<img src=x onerror=alert(1)>`，确认预览中不执行脚本。同时确认 KaTeX 公式渲染正常（`$E=mc^2$`）。

注意：如果 `rehype-sanitize` 的默认 schema 过于严格导致 raw HTML 功能受限，需要自定义 schema 允许常见标签（如 `<span style="...">`，这是编辑器字号/颜色功能依赖的）。可参考以下自定义 schema：

```typescript
import { defaultSchema } from "rehype-sanitize";

const customSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "span", "div", "br", "hr"],
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), "style"],
    div: [...(defaultSchema.attributes?.div || []), "style", "className", "class"],
    code: [...(defaultSchema.attributes?.code || []), "className", "class"],
  },
};
```

然后在 rehypePlugins 中使用：

```typescript
const rehypePlugins = useMemo(() => [rehypeRaw, [rehypeSanitize, customSchema], rehypeKatex], []);
```

**Step 4: 提交**

```bash
git add src/components/Preview.tsx package.json pnpm-lock.yaml
git commit -m "fix: add rehype-sanitize to prevent XSS in markdown preview"
```

---

### Task 1.5: 关闭生产环境 sourcemap 输出

**Files:**

- Modify: `vite.config.ts:23`

**Step 1: 修改配置**

将：

```typescript
sourcemap: "hidden",
```

改为：

```typescript
sourcemap: false,
```

**Step 2: 验证**

```bash
pnpm build
```

预期：`dist/assets/` 中不再生成 `.map` 文件。

**Step 3: 提交**

```bash
git add vite.config.ts
git commit -m "fix: disable production sourcemaps to reduce bundle size and prevent source exposure"
```

---

## Phase 2: 修复 Lint 错误

### Task 2.1: 修复 Editor.tsx 中 wrapSelection 先使用后声明的问题

**Files:**

- Modify: `src/components/Editor.tsx:130-225`

**Step 1: 将 `wrapSelection` 的声明移到 `handleKeyDown` 之前**

把 `src/components/Editor.tsx:214-221` 的 `wrapSelection` 定义（含 `useCallback`）移动到 `handleKeyDown`（第 130 行）之前。同时在 `handleKeyDown` 的依赖数组中添加 `wrapSelection`。

移动后的代码顺序：

```typescript
// 第 ~130 行开始
const wrapSelection = useCallback(
  (before: string, after: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    insertAtCursor(textarea, content, setContent, before, after, placeholder);
  },
  [content]
);

const handleKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ... 原有逻辑不变，现在可以正常引用 wrapSelection
  },
  [content, autoPair, wrapSelection] // 添加 wrapSelection 到依赖
);
```

同时删除原来第 214-221 行的旧 `wrapSelection` 声明。

**Step 2: 验证 lint**

```bash
pnpm lint
```

预期：`Editor.tsx` 中的 "Cannot access variable before it is declared" 和 "missing dependency" 错误消失。

**Step 3: 提交**

```bash
git add src/components/Editor.tsx
git commit -m "fix: move wrapSelection declaration before handleKeyDown to fix hoisting error"
```

---

### Task 2.2: 修复 useNotes.ts 中 setCurrentNoteId 先使用后声明的问题

**Files:**

- Modify: `src/hooks/useNotes.ts:6-28`

**Step 1: 将 `currentNoteId` 状态声明移到 useEffect 之前**

将第 27 行：

```typescript
const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
```

移到第 10 行（`const [notes, setNotes] = useState<Note[]>([])` 之后、第一个 `useEffect` 之前）。

移动后的代码顺序：

```typescript
export function useNotes(selectedFolderId: string | null = null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null); // 移到此处
  const prevNotesRef = useRef<Note[]>([]);

  useEffect(() => {
    loadNotes()
      .then(data => {
        setNotes(data);
        prevNotesRef.current = data;
        if (data.length > 0) {
          setCurrentNoteId(data[0].id); // 现在可以正常引用
        }
        setLoaded(true);
      })
      .catch(error => {
        console.error("Failed to load notes:", error);
        setLoaded(true);
      });
  }, []);

  // ... 其余代码不变
```

删除原来的第 27 行。

**Step 2: 验证 lint**

```bash
pnpm lint
```

**Step 3: 提交**

```bash
git add src/hooks/useNotes.ts
git commit -m "fix: move currentNoteId state declaration before useEffect to fix hoisting error"
```

---

### Task 2.3: 修复 useKeyboardShortcuts.ts 中渲染阶段写 ref 的问题

**Files:**

- Modify: `src/hooks/useKeyboardShortcuts.ts:13-16`

**Step 1: 使用 useEffect 更新 ref**

将：

```typescript
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;
```

改为：

```typescript
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });
```

需要在文件顶部 import 中确认已有 `useEffect`。当前第 1 行为：

```typescript
import { useEffect, useCallback, useRef } from "react";
```

已有 `useEffect`，无需修改。

**Step 2: 验证 lint**

```bash
pnpm lint
```

**Step 3: 提交**

```bash
git add src/hooks/useKeyboardShortcuts.ts
git commit -m "fix: update shortcuts ref inside useEffect instead of during render"
```

---

### Task 2.4: 修复 NoteList.tsx 中未使用的 useRef 导入

**Files:**

- Modify: `src/components/NoteList.tsx:1`

**Step 1: 移除未使用的 `useRef`**

将第 1 行：

```typescript
import { useRef, useState, useMemo, useCallback, memo, useEffect } from "react";
```

改为：

```typescript
import { useState, useMemo, useCallback, memo, useEffect } from "react";
```

**Step 2: 验证 lint**

```bash
pnpm lint
```

**Step 3: 提交**

```bash
git add src/components/NoteList.tsx
git commit -m "fix: remove unused useRef import from NoteList"
```

---

### Task 2.5: 修复 useOutline.ts 中的无效正则转义

**Files:**

- Modify: `src/hooks/useOutline.ts:17`

**Step 1: 找到第 17 行附近的正则表达式，将 `\[` 改为 `[`**

打开 `src/hooks/useOutline.ts`，找到包含 `\[` 的正则（约第 17 行 `matches` 变量附近），将无效的转义 `\[` 修正。

如果正则意图是匹配字面量 `[`，则保持 `\[` 但使用 `String.raw` 或额外转义；如果 `\[` 是在正则字面量 `/.../` 中则无需改动（在正则字面量中 `\[` 是合法的）。具体看上下文：

- 如果是 `new RegExp("\\[...")` 中的 `\\[` → 合法，可能只是 lint 误报，添加 `// eslint-disable-next-line no-useless-escape` 抑制
- 如果是 `new RegExp("\[...")` 中的 `\[` → 改为 `\\[`

**Step 2: 验证 lint**

```bash
pnpm lint
```

**Step 3: 提交**

```bash
git add src/hooks/useOutline.ts
git commit -m "fix: fix unnecessary escape character in useOutline regex"
```

---

### Task 2.6: 处理 set-state-in-effect 警告

**Files:**

- Modify: `src/components/HomeView.tsx:18-22`
- Modify: `src/components/SearchReplace.tsx:49-51`
- Modify: `src/components/SettingsPanel.tsx:12-17`

这些是 warning 而非 error，但修复它们能提升渲染性能。有两种策略：

**策略 A（推荐）：将派生状态改为 `useMemo`**

例如 `SearchReplace.tsx:49-51`：

```typescript
// 删除这个 useEffect
useEffect(() => {
  setCurrentIndex(matchCount > 0 ? 0 : -1);
}, [query, caseSensitive, matchCount]);
```

改为在渲染时直接计算：

```typescript
const [currentIndex, setCurrentIndex] = useState(-1);
const safeIndex = matchCount > 0 ? (currentIndex < matchCount ? currentIndex : 0) : -1;
```

**策略 B：用 `flushSync` 或将 setState 移到事件回调中**

`HomeView.tsx` 中 `setMounted(true)` 是首次挂载标记，可改用 `useSyncExternalStore` 或直接用 CSS 动画替代。

`SettingsPanel.tsx` 中的 `setRendered(true)` + `requestAnimationFrame` 是动画入场模式，可保留但加 eslint-disable 注释说明原因。

**Step 1: 逐一修复后验证**

```bash
pnpm lint
```

预期：`pnpm lint` 零 error、零 warning。

**Step 2: 提交**

```bash
git add src/components/HomeView.tsx src/components/SearchReplace.tsx src/components/SettingsPanel.tsx
git commit -m "fix: resolve set-state-in-effect warnings in HomeView, SearchReplace, SettingsPanel"
```

---

## Phase 3: 构建体积优化

### Task 3.1: Mermaid 按需动态加载

**Files:**

- Modify: `src/components/MermaidDiagram.tsx:1`
- Modify: `src/components/Preview.tsx:11`

**Step 1: 将 MermaidDiagram 改为懒加载**

`Preview.tsx` 中已经是：

```typescript
import { MermaidDiagram } from "./MermaidDiagram";
```

改为：

```typescript
import { lazy } from "react";
const MermaidDiagram = lazy(() =>
  import("./MermaidDiagram").then(m => ({ default: m.MermaidDiagram }))
);
```

在 `MermaidDiagram` 的使用处包裹 `<Suspense>`：

```typescript
<Suspense fallback={<div className="my-4 text-center text-xs text-muted-foreground">Loading diagram...</div>}>
  <MermaidDiagram code={code} />
</Suspense>
```

**Step 2: 将 mermaid 从 manualChunks 中移除**

在 `vite.config.ts` 的 `manualChunks` 中删除：

```typescript
"mermaid-vendor": ["mermaid"],
```

Vite 的动态 import 会自动将 mermaid 拆分为独立 chunk，无需手动配置。

**Step 3: 验证**

```bash
pnpm build
```

预期：mermaid 相关的 JS 文件只在访问含 mermaid 代码块的笔记时才加载。首屏加载的 JS 体积减少约 300KB+（gzip ~87KB）。

**Step 4: 提交**

```bash
git add src/components/Preview.tsx src/components/MermaidDiagram.tsx vite.config.ts
git commit -m "perf: lazy-load mermaid to reduce initial bundle size"
```

---

### Task 3.2: 优化 Markdown 解析库体积

**Files:**

- Modify: `vite.config.ts:28-36`

**Step 1: 细化 manualChunks 拆分**

将：

```typescript
"markdown-vendor": [
  "react-markdown",
  "remark-gfm",
  "remark-math",
  "rehype-raw",
  "rehype-katex",
],
```

拆为更细粒度的 chunk：

```typescript
"markdown-core": ["react-markdown", "remark-gfm"],
"math-vendor": ["remark-math", "rehype-katex", "katex"],
```

保留 `rehype-raw` 和 `rehype-sanitize`（Task 1.4 新增）在 markdown-core 中。

**Step 2: 验证**

```bash
pnpm build
```

检查输出 chunk 大小，确认没有单个 chunk 超过 500KB 的警告。

**Step 3: 提交**

```bash
git add vite.config.ts
git commit -m "perf: split markdown vendor chunks for better caching"
```

---

## Phase 4: 代码可维护性

### Task 4.1: 开启 TypeScript strict 模式（渐进式）

**Files:**

- Modify: `tsconfig.json:31-33`

**Step 1: 开启 strict 并修复类型错误**

将 `tsconfig.json` 中：

```json
"strict": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
```

改为：

```json
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
```

**Step 2: 运行类型检查，修复所有报错**

```bash
pnpm type-check
```

常见的需要修复的类型问题：

- `event` 参数类型缺失或使用 `any`
- `localStorage` 操作的 JSON.parse 返回 `any`
- 部分 ref 的类型不够精确

逐一修复直到 `pnpm type-check` 通过。

**Step 3: 提交**

```bash
git add -A
git commit -m "refactor: enable TypeScript strict mode and fix all type errors"
```

---

### Task 4.2: 更新 README 与实际技术栈一致

**Files:**

- Modify: `README.md:60,64`

**Step 1: 更新技术栈描述**

将：

```
- **前端框架**: React 18 + TypeScript + Vite
```

改为：

```
- **前端框架**: React 19 + TypeScript + Vite
```

将：

```
- **数据存储**: LocalStorage
```

改为：

```
- **数据存储**: IndexedDB（自动迁移 LocalStorage 旧数据）
```

将：

```
npm install
npm run dev
```

改为：

```
pnpm install
pnpm dev
```

同理更新其他 `npm run` 为 `pnpm`。

**Step 2: 提交**

```bash
git add README.md
git commit -m "docs: update README to match actual tech stack (React 19, IndexedDB, pnpm)"
```

---

### Task 4.3: 拆分 NoteList 组件

**Files:**

- Create: `src/components/FolderTree.tsx`
- Create: `src/components/SearchResults.tsx`
- Create: `src/components/SortableNoteList.tsx`
- Create: `src/components/SidebarTabs.tsx`
- Modify: `src/components/NoteList.tsx`
- Modify: `src/components/index.ts`

**Step 1: 提取 FolderNode 为独立组件**

将 `NoteList.tsx` 中第 63-322 行的 `FolderNode` 函数组件及其辅助函数 `hasActiveDescendant` 抽到 `src/components/FolderTree.tsx`。

导出接口：

```typescript
export interface FolderTreeProps {
  folders: (Folder & { children?: Folder[] })[];
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNoteDelete: (id: string) => void;
  onNewNote: (folderIds?: string[]) => void;
  onCreateFolder: (parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
}
```

**Step 2: 提取搜索结果列表**

将第 367-381 行的 `searchResults` 逻辑和第 534-547 行的搜索结果渲染抽到 `SearchResults.tsx`。

**Step 3: 提取拖拽排序列表**

将第 27-48 行的 `SortableNoteItem` 和第 551-570 行的 `DndContext` 抽到 `SortableNoteList.tsx`。

**Step 4: 提取侧边栏 Tab 栏**

将第 493-528 行的 tab 切换逻辑抽到 `SidebarTabs.tsx`。

**Step 5: 精简 NoteList 主组件**

重构后的 `NoteList.tsx` 作为组合容器，约 100-150 行：

```typescript
export default memo(function NoteList(props: NoteListProps) {
  // 搜索状态
  // Tab 状态
  const { folderTree, folders, createFolder, deleteFolder, updateFolder } = useFolders();
  const headings = useOutline(props.currentNoteContent || "");

  return (
    <div className="sidebar-root ...">
      <SearchInput ... />
      <SidebarActions ... />
      <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="sidebar-content">
        {activeTab === "outline" ? (
          <OutlineView ... />
        ) : searchQuery ? (
          <SearchResults ... />
        ) : (
          <>
            <SortableNoteList ... />
            <FolderTree ... />
          </>
        )}
      </div>
    </div>
  );
});
```

**Step 6: 更新 index.ts 导出**

在 `src/components/index.ts` 中添加新组件的导出。

**Step 7: 验证**

```bash
pnpm lint && pnpm type-check && pnpm build
```

预期：功能不变，lint/type/build 全部通过。

**Step 8: 提交**

```bash
git add src/components/FolderTree.tsx src/components/SearchResults.tsx src/components/SortableNoteList.tsx src/components/SidebarTabs.tsx src/components/NoteList.tsx src/components/index.ts
git commit -m "refactor: split NoteList into FolderTree, SearchResults, SortableNoteList, SidebarTabs"
```

---

### Task 4.4: 统一排序逻辑，修复拖拽 order 不一致

**Files:**

- Modify: `src/components/NoteList.tsx` (或拆分后的 `SortableNoteList.tsx`)
- Modify: `src/hooks/useNotes.ts:133-143`

**Step 1: 在 useNotes 中添加统一的排序函数**

```typescript
function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    const ta = (a.title || "Untitled").toLowerCase();
    const tb = (b.title || "Untitled").toLowerCase();
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}
```

**Step 2: 在 filteredNotes 和根笔记列表中使用 `sortNotes`**

替换 NoteList 中重复的排序逻辑（第 93-98 行、第 356-365 行），统一调用 `sortNotes`。

**Step 3: 确保拖拽 reorder 后新笔记也有 order**

在 `createNote` 中，设置 `order: 0`，并将现有笔记的 order 各加 1：

```typescript
setNotes(prev => {
  const shifted = prev.map(n => ({ ...n, order: (n.order ?? prev.length) + 1 }));
  return [newNote, ...shifted];
});
```

**Step 4: 验证**

手动测试：创建笔记、拖拽排序、刷新页面，确认顺序保持。

**Step 5: 提交**

```bash
git add src/hooks/useNotes.ts src/components/NoteList.tsx
git commit -m "fix: unify note sorting logic to preserve drag-and-drop order"
```

---

### Task 4.5: 改进 IndexedDB 保存队列，避免竞态

**Files:**

- Create: `src/utils/saveQueue.ts`
- Modify: `src/hooks/useNotes.ts:47-81`

**Step 1: 创建串行保存队列工具**

```typescript
// src/utils/saveQueue.ts
type SaveOp = () => Promise<void>;

class SaveQueue {
  private queue: SaveOp[] = [];
  private running = false;

  enqueue(op: SaveOp) {
    this.queue.push(op);
    this.flush();
  }

  private async flush() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const op = this.queue.shift()!;
      try {
        await op();
      } catch (e) {
        console.error("SaveQueue error:", e);
      }
    }
    this.running = false;
  }
}

export const saveQueue = new SaveQueue();
```

**Step 2: 在 useNotes 的同步 effect 中使用队列**

将第 69-78 行的 `Promise.all(ops)` 改为逐个入队：

```typescript
for (const note of added) saveQueue.enqueue(() => saveSingleNote(note));
for (const note of updated) saveQueue.enqueue(() => saveSingleNote(note));
for (const note of deleted) saveQueue.enqueue(() => deleteSingleNote(note.id));
```

**Step 3: 验证**

快速连续编辑笔记，确认 IndexedDB 中最终数据一致。

**Step 4: 提交**

```bash
git add src/utils/saveQueue.ts src/hooks/useNotes.ts
git commit -m "fix: use serial save queue to prevent IndexedDB write race conditions"
```

---

## Phase 5: 性能优化

### Task 5.1: 为预览渲染添加防抖

**Files:**

- Modify: `src/components/Preview.tsx:116-119`

**Step 1: 对 memoizedContent 添加防抖**

在 Preview 组件中，对传入的 `note.content` 做防抖处理：

```typescript
const [displayContent, setDisplayContent] = useState(note.content);

useEffect(() => {
  const timer = setTimeout(() => setDisplayContent(note.content), 150);
  return () => clearTimeout(timer);
}, [note.content]);
```

将 `ReactMarkdown` 的 children 从 `memoizedContent` 改为 `displayContent`。

**Step 2: 验证**

输入大量文本，确认编辑器不卡顿，预览有短暂延迟但最终一致。

**Step 3: 提交**

```bash
git add src/components/Preview.tsx
git commit -m "perf: debounce preview rendering to reduce re-renders during typing"
```

---

### Task 5.2: 为笔记搜索添加防抖

**Files:**

- Modify: `src/components/NoteList.tsx` (或拆分后的相关组件)

**Step 1: 对 searchQuery 添加防抖**

在 NoteList 组件中：

```typescript
const [searchQuery, setSearchQuery] = useState("");
const debouncedSearch = useDebounce(searchQuery, 200);
```

将 `searchResults` 的 useMemo 依赖从 `searchQuery` 改为 `debouncedSearch`，并在此 useMemo 内部使用 `debouncedSearch` 做匹配。

**Step 2: 验证**

在搜索框快速输入，确认不会每次击键都重新过滤。

**Step 3: 提交**

```bash
git add src/components/NoteList.tsx
git commit -m "perf: debounce note search to reduce filter operations"
```

---

### Task 5.3: 优化文件夹树构建算法

**Files:**

- Modify: `src/hooks/useFolders.ts:77-88`

**Step 1: 改用 Map 预构建索引**

将：

```typescript
const folderTree = useMemo(() => {
  const buildTree = (parentId: string | null = null): Folder[] => {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => ({
        ...folder,
        children: buildTree(folder.id),
      }));
  };
  return buildTree();
}, [folders]);
```

改为：

```typescript
const folderTree = useMemo(() => {
  const byParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = f.parentId ?? null;
    const list = byParent.get(key) || [];
    list.push(f);
    byParent.set(key, list);
  }
  const buildTree = (parentId: string | null): Folder[] => {
    const children = byParent.get(parentId) || [];
    return children.map(f => ({ ...f, children: buildTree(f.id) }));
  };
  return buildTree(null);
}, [folders]);
```

**Step 2: 提交**

```bash
git add src/hooks/useFolders.ts
git commit -m "perf: optimize folder tree building from O(n²) to O(n) using Map index"
```

---

### Task 5.4: 统一 Editor 中的光标恢复逻辑

**Files:**

- Modify: `src/components/Editor.tsx`

**Step 1: 提取公共 helper 函数**

在 Editor 组件内部或模块级别添加：

```typescript
function restoreCursor(textarea: HTMLTextAreaElement, start: number, end?: number) {
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = start;
    textarea.selectionEnd = end ?? start;
  });
}
```

**Step 2: 替换所有 setTimeout 光标恢复**

将 Editor 中所有 `setTimeout(() => { textarea.focus(); textarea.selectionStart = ... }, 0)` 替换为 `restoreCursor(textarea, start, end)` 调用。涉及约 7 处。

**Step 3: 验证**

```bash
pnpm lint && pnpm type-check && pnpm build
```

手动测试：编辑器中各种操作（Tab、自动配对、加粗等）确认光标位置正确。

**Step 4: 提交**

```bash
git add src/components/Editor.tsx
git commit -m "refactor: unify cursor restore logic using requestAnimationFrame helper"
```

---

## Phase 6: 可靠性与用户体验

### Task 6.1: 添加测试基础设施

**Files:**

- Modify: `package.json` (添加 vitest 和 @testing-library/react)
- Create: `vitest.config.ts`
- Create: `src/utils/__tests__/export.test.ts`
- Create: `src/utils/__tests__/saveQueue.test.ts`
- Create: `src/hooks/__tests__/useNotes.test.ts`

**Step 1: 安装测试依赖**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: 创建 vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@context": path.resolve(__dirname, "./src/context"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

**Step 3: 创建测试 setup 文件**

创建 `src/test/setup.ts`：

```typescript
import "@testing-library/jest-dom";
```

**Step 4: 编写核心测试**

`src/utils/__tests__/export.test.ts`：

- 测试 `generateId()` 返回非空字符串
- 测试 `formatDate()` 的各种时间差情况
- 测试 `exportAsMarkdown()` 生成正确的 Blob
- 测试 `escapeHtml()` 正确转义特殊字符

`src/utils/__tests__/saveQueue.test.ts`：

- 测试队列串行执行
- 测试队列中某个操作失败不影响后续操作

**Step 5: 在 package.json 中添加 test 脚本**

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 6: 验证**

```bash
pnpm test
```

预期：所有测试通过。

**Step 7: 提交**

```bash
git add -A
git commit -m "test: add vitest infrastructure and core unit tests for utils and save queue"
```

---

### Task 6.2: 为设置保存失败添加用户提示

**Files:**

- Modify: `src/hooks/useSettings.ts:31-37,39-45`

**Step 1: 让 updateSettings 的错误冒泡**

将：

```typescript
useEffect(() => {
  idbGetSetting<Settings>(SETTINGS_KEY)
    .then(stored => {
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored });
    })
    .catch(() => {});
}, []);

const updateSettings = useCallback((updates: Partial<Settings>) => {
  setSettings(prev => {
    const next = { ...prev, ...updates };
    idbSetSetting(SETTINGS_KEY, next).catch(() => {});
    return next;
  });
}, []);
```

改为接受一个 onError 回调：

```typescript
export function useSettings(onError?: (error: Error) => void) {
  // ...

  useEffect(() => {
    idbGetSetting<Settings>(SETTINGS_KEY)
      .then(stored => {
        if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored });
      })
      .catch(error => onError?.(error as Error));
  }, [onError]);

  const updateSettings = useCallback(
    (updates: Partial<Settings>) => {
      setSettings(prev => {
        const next = { ...prev, ...updates };
        idbSetSetting(SETTINGS_KEY, next).catch(error => onError?.(error as Error));
        return next;
      });
    },
    [onError]
  );

  // ...
}
```

**Step 2: 在 App.tsx 中传入错误处理**

在 `AppContent` 中：

```typescript
const { handleStorageError } = useErrorHandler();
const { settings, updateSettings } = useSettings(handleStorageError);
```

**Step 3: 提交**

```bash
git add src/hooks/useSettings.ts src/App.tsx
git commit -m "fix: surface settings save errors to user via toast notification"
```

---

### Task 6.3: 为导出文件名添加清洗

**Files:**

- Modify: `src/utils/export.ts`

**Step 1: 添加 sanitizeFilename 工具函数**

```typescript
function sanitizeFilename(name: string): string {
  return (
    (name || "untitled")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200) || "untitled"
  );
}
```

**Step 2: 在三个导出函数中使用**

将 `exportAsMarkdown`、`exportAsHTML`、`exportAsText` 中的：

```typescript
`${note.title || "untitled"}.md`;
```

改为：

```typescript
`${sanitizeFilename(note.title)}.md`;
```

同理修改 `.html` 和 `.txt`。

**Step 3: 提交**

```bash
git add src/utils/export.ts
git commit -m "fix: sanitize export filenames to prevent invalid characters"
```

---

### Task 6.4: 为删除操作添加确认提示

**Files:**

- Modify: `src/components/NoteList.tsx` (或拆分后的相关组件)
- Modify: `src/App.tsx:211-213,228-230`

**Step 1: 在删除笔记时添加确认**

将 `App.tsx` 中的：

```typescript
onNoteDelete={id => {
  deleteNote(id);
}}
```

改为：

```typescript
onNoteDelete={id => {
  if (window.confirm("确认删除此笔记？此操作不可撤销。")) {
    deleteNote(id);
    showToast("笔记已删除", "success");
  }
}}
```

**Step 2: 在删除文件夹时添加确认**

在 NoteList 的 `handleDeleteFolder` 中添加类似的确认对话框。

**Step 3: 提交**

```bash
git add src/App.tsx src/components/NoteList.tsx
git commit -m "feat: add confirmation dialog before deleting notes and folders"
```

---

### Task 6.5: 清理项目根目录多余文件

**Files:**

- Delete: `N03Lb.png`（如已不需要）
- Delete: `test.html`
- Delete: `dev.log`
- Delete: `dev-output.log`
- Delete: `vite.config.backup.ts`
- Delete: `tsconfig.tsbuildinfo`
- Delete: `OPTIMIZE_PLAN.md`
- Delete: `PERFORMANCE_PLAN.md`
- Delete: `ROUTE_A_PLAN.md`
- Delete: `TAURI_PLAN.md`
- Delete: `FILE_UPLOAD_PLAN.md`
- Modify: `.gitignore`

**Step 1: 更新 .gitignore 添加忽略规则**

在 `.gitignore` 末尾追加：

```
# Build artifacts
tsconfig.tsbuildinfo

# Dev logs
dev.log
dev-output.log

# Plan documents (keep docs/plans/ only)
*_PLAN.md
!docs/plans/

# Backup configs
*.backup.ts
*.backup.tsx
```

**Step 2: 删除根目录多余文件**

```bash
rm N03Lb.png test.html dev.log dev-output.log vite.config.backup.ts tsconfig.tsbuildinfo
rm OPTIMIZE_PLAN.md PERFORMANCE_PLAN.md ROUTE_A_PLAN.md TAURI_PLAN.md FILE_UPLOAD_PLAN.md
```

**Step 3: 验证构建正常**

```bash
pnpm build
```

**Step 4: 提交**

```bash
git add -A
git commit -m "chore: clean up root directory and update .gitignore"
```

---

## 执行摘要

| Phase   | 内容                                                            | 预估耗时 | 优先级 |
| ------- | --------------------------------------------------------------- | -------- | ------ |
| Phase 1 | 安全修复（依赖升级、XSS 净化、关闭 sourcemap）                  | 1-2h     | P0     |
| Phase 2 | 修复 Lint 错误（5 error + 4 warning → 0）                       | 1-2h     | P0     |
| Phase 3 | 构建体积优化（Mermaid 懒加载、chunk 拆分）                      | 0.5-1h   | P1     |
| Phase 4 | 代码可维护性（strict 模式、README、拆组件、排序统一、保存队列） | 2-3h     | P1     |
| Phase 5 | 性能优化（预览防抖、搜索防抖、文件夹树、光标恢复）              | 1-2h     | P2     |
| Phase 6 | 可靠性（测试基础设施、错误提示、文件名清洗、删除确认、清理）    | 2-3h     | P2     |

**总预估：8-13 小时**

建议每完成一个 Phase 后运行完整验证：

```bash
pnpm lint && pnpm type-check && pnpm build && pnpm test
```

每个 Phase 结束后确保 CI 绿灯再进入下一阶段。

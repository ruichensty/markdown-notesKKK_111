# Markdown Notes 优化实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 分 6 个阶段系统性完善项目，覆盖性能、安全、功能、工程质量四个维度。

**Architecture:** 所有改动在现有 React + TypeScript + IndexedDB 架构内进行，不引入新框架。每个 Task 独立可测试，可按任意顺序执行。

**Tech Stack:** React 19, TypeScript 5.9, Vite 4.5, Tailwind CSS 3.4, IndexedDB

---

## 阶段总览

| 阶段 | 主题         | Tasks | 预估工作量 |
| ---- | ------------ | ----- | ---------- |
| A    | 性能优化     | A1-A4 | 1h         |
| B    | 安全与健壮性 | B1-B3 | 30min      |
| C    | 功能完善     | C1-C3 | 2h         |
| D    | 工程质量     | D1-D3 | 30min      |
| E    | 包体积优化   | E1-E2 | 1h         |
| F    | 文档与清理   | F1-F2 | 20min      |

---

## 阶段 A：性能优化

### Task A1: 搜索防抖

**问题:** `NoteList.tsx` 中 `searchQuery` 每次按键都触发 `useMemo` 全量过滤 `notes`，笔记数量多时造成卡顿。

**Files:**

- Modify: `src/components/NoteList.tsx:70-93`

**Step 1: 引入 useDebounce**

在 `NoteList.tsx` 中，对 `searchQuery` 添加 debounce：

```tsx
const [searchQuery, setSearchQuery] = useState("");
const debouncedSearchQuery = useDebounce(searchQuery, 200);
```

**Step 2: 用 debouncedSearchQuery 替代 searchQuery 进行过滤**

将 `useMemo` 中 `searchResults` 的依赖从 `searchQuery` 改为 `debouncedSearchQuery`：

```tsx
const searchResults = useMemo(() => {
  const normalizedQuery = debouncedSearchQuery.toLowerCase();
  if (!normalizedQuery) return [];
  return sortNotesByTitle(
    notes.filter(
      note =>
        note.title.toLowerCase().includes(normalizedQuery) ||
        note.content.toLowerCase().includes(normalizedQuery)
    )
  );
}, [notes, debouncedSearchQuery]);
```

注意：`searchQuery` 仍用于 input 的 `value` 绑定（即时显示用户输入），只有过滤逻辑使用 debounce 后的值。同时判断 `searchQuery` 是否有值来决定显示搜索结果还是笔记列表：

```tsx
// sidebar-content 中
{activeTab === "outline" ? (
  <OutlineView ... />
) : searchQuery ? (  // 用原始 searchQuery 控制 UI 切换
  <SearchResults ... />
) : (
  <>
    <SortableNoteList ... />
    <FolderTree ... />
    {notes.length === 0 && <EmptyNotes />}
  </>
)}
```

**Step 3: 验证**

Run: `pnpm type-check`
Expected: PASS

**Step 4: Commit**

```
feat(search): add debounce to note search filtering
```

---

### Task A2: 预览防抖

**问题:** `Preview.tsx` 每次 `note.content` 变化都完整重渲染 markdown，输入时造成不必要的性能开销。

**Files:**

- Modify: `src/components/Preview.tsx:130-133`

**Step 1: 添加 debounce 到 memoizedContent**

```tsx
import { useMemo, useCallback, memo, lazy, Suspense } from "react";
import { useDebounce } from "@hooks";

// ...

function Preview({ note, showLineNumbers = false }: PreviewProps) {
  const { theme } = useTheme();
  const debouncedContent = useDebounce(note.content || "", 300);

  // ...

  const memoizedContent = useMemo(
    () => debouncedContent || "Start typing to see preview...",
    [debouncedContent]
  );
```

**Step 2: 更新 memo 比较函数**

```tsx
export default memo(Preview, (prevProps, nextProps) => {
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.showLineNumbers === nextProps.showLineNumbers
  );
});
```

memo 比较保持不变（依赖原始 content 判断是否需要重新渲染组件），组件内部用 debounce 后的值做实际解析。

**Step 3: 验证**

Run: `pnpm type-check`

**Step 4: Commit**

```
perf(preview): debounce markdown rendering to reduce input lag
```

---

### Task A3: 文件夹树构建优化

**问题:** `useFolders.ts` 中 `folderTree` 用递归 `.filter()` 构建树，时间复杂度 O(n²)。

**Files:**

- Modify: `src/hooks/useFolders.ts:77-88`

**Step 1: 用 Map 索引替代递归 filter**

```tsx
const folderTree = useMemo(() => {
  const byParent = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const key = folder.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(folder);
    byParent.set(key, list);
  }

  const buildTree = (parentId: string | null = null): Folder[] => {
    const children = byParent.get(parentId) ?? [];
    return children.map(folder => ({
      ...folder,
      children: buildTree(folder.id),
    }));
  };

  return buildTree();
}, [folders]);
```

**Step 2: 验证**

Run: `pnpm type-check`

**Step 3: Commit**

```
perf(folders): optimize tree building from O(n²) to O(n) with Map index
```

---

### Task A4: IndexedDB 写入队列

**问题:** `useNotes.ts` 中 IndexedDB 写入使用 `Promise.all`，快速连续编辑时可能产生竞态条件（后发的写入先完成，被更早的写入覆盖）。

**Files:**

- Modify: `src/hooks/useNotes.ts:46-80`

**Step 1: 添加串行写入队列**

在 `useNotes.ts` 中添加写入队列逻辑，确保 IndexedDB 写入串行执行：

```tsx
const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

useEffect(() => {
  if (!loaded) return;

  const prevMap = new Map<string, Note>();
  for (const n of prevNotesRef.current) prevMap.set(n.id, n);

  const added: Note[] = [];
  const updated: Note[] = [];

  for (const note of notes) {
    const prev = prevMap.get(note.id);
    if (!prev) {
      added.push(note);
    } else if (prev.updatedAt !== note.updatedAt) {
      updated.push(note);
    }
  }

  const currentMap = new Map<string, unknown>();
  for (const n of notes) currentMap.set(n.id, n);
  const deleted = prevNotesRef.current.filter(n => !currentMap.has(n.id));

  if (added.length > 0 || updated.length > 0 || deleted.length > 0) {
    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        for (const note of added) await saveSingleNote(note);
        for (const note of updated) await saveSingleNote(note);
        for (const note of deleted) await deleteSingleNote(note.id);
      })
      .catch(error => {
        console.error("Failed to save notes:", error);
      });
  }

  prevNotesRef.current = notes;
}, [notes, loaded]);
```

关键变化：`Promise.all` → 串行 `for...of await`，每次写入排队到前一次之后。

**Step 2: 验证**

Run: `pnpm type-check`

**Step 3: Commit**

```
fix(storage): serialize IndexedDB writes to prevent race conditions
```

---

## 阶段 B：安全与健壮性

### Task B1: 导出文件名安全化

**问题:** `export.ts` 中 `downloadBlob(blob, \`${note.title || "untitled"}.md\`)`直接用`note.title`作为文件名，可能包含`/\:\*?"<>|` 等非法字符，导致下载失败或文件名异常。

**Files:**

- Modify: `src/utils/export.ts`

**Step 1: 添加 sanitizeFilename 函数**

```tsx
function sanitizeFilename(name: string): string {
  return (
    (name || "untitled")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || "untitled"
  );
}
```

**Step 2: 替换所有导出函数中的文件名**

```tsx
export function exportAsMarkdown(note: Note): void {
  const filename = sanitizeFilename(note.title);
  const content = `# ${note.title}\n\n${note.content}`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${filename}.md`);
}

export function exportAsHTML(note: Note): void {
  const filename = sanitizeFilename(note.title);
  // ... rest unchanged, use filename for downloadBlob
  downloadBlob(blob, `${filename}.html`);
}

export function exportAsText(note: Note): void {
  const filename = sanitizeFilename(note.title);
  // ... rest unchanged, use filename for downloadBlob
  downloadBlob(blob, `${filename}.txt`);
}
```

**Step 3: 验证**

Run: `pnpm type-check`

**Step 4: Commit**

```
fix(export): sanitize filenames to prevent invalid characters
```

---

### Task B2: 笔记删除全局确认

**问题:** `App.tsx:187` 直接调用 `deleteNote(id)` 无二次确认。`NoteItem` 有行内确认，但 FolderTree 中删除文件夹关联笔记等路径可能绕过确认。

**Files:**

- Modify: `src/App.tsx`
- Create: `src/components/ConfirmDialog.tsx`

**Step 1: 创建通用确认对话框组件**

创建 `src/components/ConfirmDialog.tsx`：

```tsx
import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  message,
  confirmLabel = "删除",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-popover border border-border rounded-xl shadow-2xl p-5 max-w-xs w-full mx-4 animate-scale-in">
        <p className="text-sm text-foreground mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 在 components/index.ts 导出**

```tsx
export { ConfirmDialog } from "./ConfirmDialog";
```

**Step 3: 在 App.tsx 中添加删除确认状态**

```tsx
import { ConfirmDialog } from "@components";

// in AppContent:
const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

const handleNoteDeleteConfirm = () => {
  if (deleteTarget) {
    deleteNote(deleteTarget);
    setDeleteTarget(null);
  }
};
```

**Step 4: 替换 NoteList 的 onNoteDelete**

```tsx
<NoteList
  // ...
  onNoteDelete={id => setDeleteTarget(id)}
  // ...
/>
```

**Step 5: 渲染确认对话框**

在 `AppContent` return 的 `<>...</>` 末尾添加：

```tsx
{
  deleteTarget && (
    <ConfirmDialog
      message="确定要删除这条笔记吗？此操作不可恢复。"
      onConfirm={handleNoteDeleteConfirm}
      onCancel={() => setDeleteTarget(null)}
    />
  );
}
```

**Step 6: 验证**

Run: `pnpm type-check`

**Step 7: Commit**

```
feat(ui): add global delete confirmation dialog for notes
```

---

### Task B3: IndexedDB 错误恢复

**问题:** IndexedDB 写入失败时只在 console 打印错误，用户无感知。可能导致数据丢失。

**Files:**

- Modify: `src/hooks/useNotes.ts`

**Step 1: 添加错误状态和 toast 通知**

```tsx
const [saveError, setSaveError] = useState(false);
```

在 saveQueueRef 的 `.catch` 中设置错误状态并通过 toast 通知：

```tsx
.catch(error => {
  console.error("Failed to save notes:", error);
  setSaveError(true);
});
```

**Step 2: 添加保存错误状态提示**

在 useNotes 的 return 中暴露 `saveError` 和 `clearSaveError`：

```tsx
return {
  // ...existing
  saveError,
  clearSaveError: useCallback(() => setSaveError(false), []),
};
```

> 注意：完整的 toast 集成需要 App 层传入 showToast 或使用 context，这个 Task 标记为可选项。最小实现是暴露 `saveError` 状态让 App 层处理。

**Step 3: 验证**

Run: `pnpm type-check`

**Step 4: Commit**

```
feat(storage): expose save error state for user notification
```

---

## 阶段 C：功能完善

### Task C1: 图片粘贴上传

**问题:** `Attachment` 类型和 IndexedDB `files` store 已定义但未使用。用户无法在笔记中插入图片。

**Files:**

- Modify: `src/types/note.ts` — 给 Attachment 添加 data 字段
- Modify: `src/utils/indexedDBStorage.ts` — 添加 file CRUD
- Modify: `src/components/Editor.tsx` — 添加粘贴事件处理
- Modify: `src/components/Preview.tsx` — 渲染附件图片
- Modify: `src/hooks/useNotes.ts` — 添加附件管理方法

**Step 1: 更新 Attachment 类型**

```tsx
export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: number;
  data?: ArrayBuffer;
}
```

**Step 2: 添加 IndexedDB 文件操作**

在 `indexedDBStorage.ts` 添加：

```tsx
export async function idbSaveFile(
  id: string,
  noteId: string,
  data: ArrayBuffer,
  fileName: string,
  fileType: string
): Promise<void> {
  await tx(STORE_FILES, "readwrite", s =>
    s.put({ id, noteId, data, fileName, fileType, size: data.byteLength, createdAt: Date.now() })
  );
}

export async function idbGetFile(
  id: string
): Promise<{ data: ArrayBuffer; fileName: string; fileType: string } | undefined> {
  return tx(STORE_FILES, "readonly", s => s.get(id));
}

export async function idbDeleteFile(id: string): Promise<void> {
  await tx<undefined>(STORE_FILES, "readwrite", s => s.delete(id));
}

export async function idbGetFilesByNoteId(
  noteId: string
): Promise<{ id: string; fileName: string; fileType: string; size: number }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FILES, "readonly");
    const store = transaction.objectStore(STORE_FILES);
    const index = store.index("noteId");
    const req = index.getAll(noteId);
    req.onsuccess = () => {
      resolve(
        (req.result as { id: string; fileName: string; fileType: string; size: number }[]).map(
          ({ id, fileName, fileType, size }) => ({ id, fileName, fileType, size })
        )
      );
    };
    req.onerror = () => reject(req.error);
  });
}
```

**Step 3: 在 Editor 中处理粘贴图片**

在 `Editor.tsx` 中添加 `onPaste` 处理：

```tsx
const handlePaste = useCallback(
  (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;

    e.preventDefault();
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const attachmentId = generateId();
        idbSaveFile(attachmentId, note.id, arrayBuffer, file.name, file.type).then(() => {
          const marker = `![${file.name}](attachment://${attachmentId})`;
          const textarea = textareaRef.current;
          if (!textarea) return;
          const start = textarea.selectionStart;
          const newText = content.substring(0, start) + marker + content.substring(start);
          setContent(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + marker.length;
          }, 0);
          onUpdate(note.id, {
            attachments: [
              ...(note.attachments || []),
              {
                id: attachmentId,
                fileName: file.name,
                fileType: file.type,
                fileSize: arrayBuffer.byteLength,
                uploadedAt: Date.now(),
              },
            ],
          });
        });
      };
      reader.readAsArrayBuffer(file);
    }
  },
  [content, note.id, note.attachments, onUpdate]
);
```

在 textarea 上添加 `onPaste={handlePaste}`。

**Step 4: 在 Preview 中渲染附件图片**

修改 `Preview.tsx` 的图片渲染逻辑，当 src 以 `attachment://` 开头时从 IndexedDB 读取：

在 ReactMarkdown 的 `components` 中添加 `img` 处理：

```tsx
img: ({ src, alt, ...props }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src || !src.startsWith("attachment://")) return;
    const fileId = src.replace("attachment://", "");
    let revoked = false;
    idbGetFile(fileId).then(file => {
      if (revoked || !file) return;
      const blob = new Blob([file.data], { type: file.fileType });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    });
    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  if (src?.startsWith("attachment://")) {
    return blobUrl ? (
      <img src={blobUrl} alt={alt || ""} {...props} />
    ) : (
      <span className="text-muted-foreground text-xs">Loading image...</span>
    );
  }

  return <img src={src} alt={alt || ""} {...props} />;
},
```

> 注意：需要在 Preview.tsx 顶部添加 `import { useState, useEffect } from "react"` 和 `import { idbGetFile } from "@utils/indexedDBStorage"`。由于 `img` 组件使用了 hooks，需要单独提取为一个组件而不是内联函数。建议创建 `AttachmentImage` 子组件。

**Step 5: 验证**

Run: `pnpm type-check`

**Step 6: Commit**

```
feat(editor): support paste image upload with IndexedDB storage
```

---

### Task C2: 笔记批量操作

**问题:** 无法同时选中多条笔记进行批量删除或移动。

**Files:**

- Modify: `src/components/NoteList.tsx`
- Modify: `src/components/NoteItem.tsx`
- Modify: `src/App.tsx`

**说明:** 这是一个较大的功能改动，建议单独作为一个迭代。核心改动：

1. NoteList 添加 `selectionMode` 状态和 `selectedIds: Set<string>`
2. NoteItem 在 selectionMode 下显示 checkbox
3. 底部显示批量操作栏（删除、移动到文件夹）
4. App 层提供批量删除和批量移动的 handler

此 Task 为可选，不影响其他 Task。

---

### Task C3: 笔记标签系统

**问题:** 当前只有文件夹分类，缺少标签维度。

**说明:** 需要修改 Note 类型添加 `tags?: string[]`，添加标签管理 UI 和标签筛选。此 Task 为可选，属于功能扩展。

---

## 阶段 D：工程质量

### Task D1: 清理残留文件

**Files:**

- Delete: `N03Lb.png`
- Delete: `test.html`
- Delete: `vite.config.backup.ts`

**Step 1: 删除无关文件**

```bash
rm N03Lb.png test.html vite.config.backup.ts
```

**Step 2: Commit**

```
chore: remove stale files from repo root
```

---

### Task D2: 移除未使用的 useLocalStorage hook

**问题:** `useLocalStorage.ts` 在 settings 迁移到 IndexedDB 后不再被任何活跃功能使用。

**Files:**

- Delete: `src/hooks/useLocalStorage.ts`
- Modify: `src/hooks/index.ts` — 移除导出

**Step 1: 检查是否仍有引用**

Run: `rg "useLocalStorage" src/`

如果只在 `index.ts` 中导出而无其他文件 import，则安全删除。

**Step 2: 删除文件并更新导出**

```bash
rm src/hooks/useLocalStorage.ts
```

从 `src/hooks/index.ts` 中移除 `export { useLocalStorage } from "./useLocalStorage"`。

**Step 3: 验证**

Run: `pnpm type-check`

**Step 4: Commit**

```
chore: remove unused useLocalStorage hook
```

---

### Task D3: 更新过时文档

**Files:**

- Modify: `TECH_STACK.md`
- Modify: `START.md`

**Step 1: 更新 TECH_STACK.md**

修正以下内容：

- `date-fns` → 已移除，使用自定义 `formatDate`
- `localStorage` → `IndexedDB`
- React 18 → React 19
- 添加 `@dnd-kit`、`rehype-sanitize`、`DOMPurify` 等新依赖

**Step 2: 更新 START.md**

将 "Auto-save to LocalStorage" 改为 "Auto-save to IndexedDB"，更新版本号。

**Step 3: Commit**

```
docs: update TECH_STACK.md and START.md to reflect current state
```

---

## 阶段 E：包体积优化

### Task E1: 统一 Markdown 解析器

**问题:** 预览用 `react-markdown`，导出用 `marked`，两套解析器增加 ~30-50KB 包体积。

**Files:**

- Modify: `src/utils/export.ts` — 移除 `marked` 依赖
- Modify: `package.json` — 移除 `marked`

**Step 1: 用 DOMPurify + 自定义简易 markdown 转 HTML 替代 marked**

> 注意：这个改动有风险。`marked` 支持完整的 GFM（表格、任务列表、脚注等），如果移除需要确保导出的 HTML 质量不下降。

**替代方案（推荐）：** 保留 `marked` 用于导出，但在 Vite 的 `manualChunks` 中将 `marked` 合并到 `markdown-core` chunk 中，避免额外请求：

```ts
manualChunks: {
  "react-vendor": ["react", "react-dom"],
  "markdown-core": ["react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "marked"],
  "math-vendor": ["remark-math", "rehype-katex", "katex"],
  "highlight-vendor": ["react-syntax-highlighter"],
},
```

**Step 2: 验证构建**

Run: `pnpm build`

检查输出 chunk 大小是否合理。

**Step 3: Commit**

```
perf(build): merge marked into markdown-core chunk
```

---

### Task E2: Mermaid chunk 拆分优化

**问题:** 构建输出显示 `mindmap-definition` (542KB) 和 `flowchart-elk-definition` (1.4MB) 过大。

**Files:**

- Modify: `vite.config.ts`

**Step 1: 在 manualChunks 中拆分 mermaid 子模块**

```ts
manualChunks(id) {
  if (id.includes("node_modules/mermaid/dist/")) {
    if (id.includes("mindmap") || id.includes("elk")) {
      return "mermaid-heavy";
    }
    return "mermaid-core";
  }
  // ...existing manualChunks
},
```

> 注意：需要将 `manualChunks` 从对象形式改为函数形式，两种形式不能混用。完整的函数形式需要覆盖所有现有的 chunk 分配。

**Step 2: 验证构建**

Run: `pnpm build`

**Step 3: Commit**

```
perf(build): split mermaid chunks to improve initial load
```

---

## 阶段 F：文档与清理

### Task F1: 添加 AGENTS.md

**Files:**

- Create: `AGENTS.md`

**内容:**

```markdown
# AGENTS.md

## 项目概述

Markdown Notes — 基于 React 19 + TypeScript + IndexedDB 的 Markdown 笔记应用。

## 常用命令

- `pnpm dev` — 启动开发服务器 (port 3000)
- `pnpm build` — 生产构建
- `pnpm type-check` — TypeScript 类型检查
- `pnpm lint` — ESLint 检查
- `pnpm lint:fix` — ESLint 自动修复
- `pnpm format` — Prettier 格式化

## 架构

- `src/components/` — UI 组件
- `src/hooks/` — 自定义 Hooks
- `src/utils/` — 工具函数（IndexedDB 操作、导出）
- `src/context/` — React Context（Theme、Toast）
- `src/types/` — TypeScript 类型定义
- 存储层：IndexedDB（4 个 store: notes, folders, settings, files）

## 代码规范

- 组件使用函数式组件 + memo 优化
- 路径别名：`@components`, `@hooks`, `@types`, `@utils`, `@context`
- CSS：Tailwind CSS + 自定义 CSS 变量（HSL 色彩系统）
- 不添加注释除非明确要求
```

**Step 1: 创建文件**

**Step 2: Commit**

```
docs: add AGENTS.md with project conventions
```

---

### Task F2: 清理过时计划文档

**Files:**

- Delete: `PERFORMANCE_PLAN.md`（已完成 85%，剩余项已纳入本计划）
- Delete: `ROUTE_A_PLAN.md`（已完成 90%）
- Delete: `OPTIMIZE_PLAN.md`（已完成 90%）
- Keep: `FILE_UPLOAD_PLAN.md`（C1 图片上传实现后可删除）
- Keep: `TAURI_PLAN.md`（尚未开始）

**Step 1: 移动已完成的计划到 docs/archive/ 或直接删除**

```bash
mkdir -p docs/archive
mv PERFORMANCE_PLAN.md ROUTE_A_PLAN.md OPTIMIZE_PLAN.md docs/archive/
```

**Step 2: Commit**

```
chore: archive completed plan documents
```

---

## 依赖关系图

```
A1 (搜索防抖)     ← 独立
A2 (预览防抖)     ← 独立
A3 (文件夹树优化)  ← 独立
A4 (写入队列)     ← 独立

B1 (文件名安全)   ← 独立
B2 (删除确认)     ← 独立
B3 (错误恢复)     ← 独立

C1 (图片上传)     ← 需要先理解 Attachment 类型
C2 (批量操作)     ← 可选，独立
C3 (标签系统)     ← 可选，独立

D1 (清理文件)     ← 独立
D2 (移除 hook)    ← 独立
D3 (更新文档)     ← 独立

E1 (统一解析器)    ← 独立
E2 (Mermaid 拆分) ← 独立

F1 (AGENTS.md)    ← 独立
F2 (清理文档)      ← 独立
```

所有 Task 相互独立，可按任意顺序执行。推荐执行顺序：**A → B → D → E → C → F**

---

## 验证清单

每个 Task 完成后运行：

```bash
pnpm type-check   # TypeScript 无错误
pnpm lint         # ESLint 无错误
pnpm build        # 构建成功
```

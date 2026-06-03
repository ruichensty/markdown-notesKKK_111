# 其他优化计划

> 生成时间：2026-05-29
> 项目：markdown-notes
> 状态：待执行
> 前置：性能优化计划已全部完成

---

## A. 代码架构优化

### A1. AppContent 组件拆分

- **文件**: `src/App.tsx`
- **现状**: `AppContent` 函数体 239 行，承担了快捷键注册、视图切换、欢迎笔记创建、笔记 CRUD 委托等过多职责
- **方案**:
  - 抽取 `useWelcomeNote(notes, loaded, createNote)` hook — 负责首次创建欢迎笔记
  - 抽取 `useViewManager()` hook — 管理 `viewMode`、`sidebarOpen`、`showSettings`、`showExportMenu` 状态
  - `AppContent` 简化为纯组合层，只做 props 传递和组件组合

### A2. Editor 组件拆分

- **文件**: `src/components/Editor.tsx`
- **现状**: 391 行，格式化工具栏（30+ 个按钮）、搜索替换逻辑、自动配对、字号/颜色处理全部耦合
- **方案**:
  - 抽取 `EditorToolbar.tsx` — 格式化按钮栏独立组件，接收 `onFormat` 回调
  - 抽取 `useAutoPair(content, setContent)` hook — 自动配对逻辑
  - 抽取 `useFormatActions(content, setContent, textareaRef)` hook — 所有格式化操作（粗体/斜体/代码等）
  - Editor 主体只负责标题、文本区域、debounce 保存

### A3. 设置存储统一到 IndexedDB

- **文件**: `src/hooks/useSettings.ts`, `src/hooks/useLocalStorage.ts`
- **现状**: `useSettings` 通过 `useLocalStorage` 使用 localStorage，而主题通过 IndexedDB，两套存储混用
- **方案**:
  - 新增 `idbGetSetting`/`idbSetSetting` 的 `useIdbSettings` hook（底层已有 API）
  - `useSettings` 改为从 IndexedDB 读写，与主题和笔记存储统一
  - `useLocalStorage` hook 保留给其他可能的 localStorage 场景

### A4. useFolders 删除文件夹时处理子项

- **文件**: `src/hooks/useFolders.ts:46-48`
- **现状**: `deleteFolder` 只是简单 filter，不处理子文件夹和关联笔记
- **方案**:
  - 递归查找所有子文件夹 ID
  - 选项 A（推荐）：将子文件夹和笔记的 `folderIds` 中移除该 ID，重新分配到父级
  - 选项 B：弹出确认弹窗，级联删除子文件夹和其下所有笔记

### A5. 导出菜单点击外部关闭

- **文件**: `src/App.tsx:67-69`
- **现状**: 导出菜单只有按钮点击切换，点击菜单外部不会关闭
- **方案**:
  - 新增 `useClickOutside` hook
  - 将导出菜单 dropdown 的 ref 传入，点击外部时调用 `setShowExportMenu(false)`

---

## B. 用户体验优化

### B1. 搜索支持全文匹配

- **文件**: `src/components/NoteList.tsx:255`
- **现状**: 搜索只匹配 `note.title`，不匹配笔记内容
- **方案**:
  - 搜索过滤条件增加 `note.content.toLowerCase().includes(searchQuery.toLowerCase())`
  - 对大量笔记场景，搜索内容改为 lazy 匹配（先匹配标题，无结果时再搜索内容）
  - 可选：搜索结果中高亮匹配关键词

### B2. 快捷键 F8/F9 toast 文案修正

- **文件**: `src/App.tsx:131-138`
- **现状**:
  ```ts
  updateSettings({ focusMode: !settings.focusMode });
  showToast(settings.focusMode ? "焦点模式已关闭" : "焦点模式已开启", "success");
  ```
  `updateSettings` 是异步状态更新，`settings.focusMode` 此时还是旧值，文案与实际状态相反
- **方案**:
  ```ts
  const next = !settings.focusMode;
  updateSettings({ focusMode: next });
  showToast(next ? "焦点模式已开启" : "焦点模式已关闭", "success");
  ```

### B3. 笔记拖拽排序

- **文件**: `src/components/NoteList.tsx`, `src/hooks/useNotes.ts`
- **现状**: 笔记列表只有字母序和创建时间排序，无法手动排序
- **方案**:
  - `Note` 类型新增 `order: number` 字段
  - 列表排序改为 `order` 优先
  - 引入轻量拖拽库（如 `@dnd-kit/sortable`）或自行实现 drag-and-drop
  - 拖拽结束后批量更新 `order` 值

---

## C. 类型安全修复

### C1. Editor forwardRef 未使用

- **文件**: `src/components/Editor.tsx`, `src/App.tsx`
- **现状**: Editor 使用了 `forwardRef<EditorHandle>`，但 App 中没有传 ref，`onJumpToLine` 在 NoteList 中也未被连接
- **方案**:
  - 方案 A：在 App 中创建 ref，传递给 Editor，同时将 ref 暴露的 `scrollToLine` 方法传给 NoteList 的 `onJumpToLine`
  - 方案 B：如果暂不需要跳行功能，移除 `forwardRef` 简化组件

### C2. useLocalStorage 函数类型判断

- **文件**: `src/hooks/useLocalStorage.ts:30`
- **现状**: `newValue instanceof Function` 跨 iframe 场景不可靠
- **方案**:
  ```ts
  const valueToStore =
    typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue;
  ```

---

## D. 安全性修复

### D1. exportAsHTML XSS 修复

- **文件**: `src/utils/export.ts:34`
- **现状**: `title>${note.title}</title>` 和 `<h1>${note.title}</h1>` 直接拼接，如果标题包含 `<script>` 等标签会导致 XSS
- **方案**:
  - 新增 `escapeHtml` 工具函数：
    ```ts
    function escapeHtml(str: string): string {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    ```
  - HTML 模板中所有用户输入内容通过 `escapeHtml()` 转义

---

## 执行顺序建议

```
Step 1: D1 + B2          → 安全性和 Bug 修复（最高优先级）
Step 2: A5 + B1          → 小改动，立竿见影的体验提升
Step 3: C1 + C2          → 类型安全清理
Step 4: A3               → 设置存储统一
Step 5: A4               → 文件夹删除逻辑补全
Step 6: A1 + A2          → 大组件拆分（工作量最大）
Step 7: B3               → 拖拽排序（需要引入新依赖）
```

## 验证方式

每一步完成后：

1. `pnpm type-check` 确保类型无误
2. `pnpm lint` 确保代码规范
3. `pnpm build` 确保构建通过
4. 手动测试相关功能点

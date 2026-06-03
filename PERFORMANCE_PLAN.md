# 性能优化计划

> 生成时间：2026-05-29
> 项目：markdown-notes
> 状态：待执行

---

## P0 - 直接影响用户体验的性能问题

### 1. IndexedDB 增量更新替代全量写入

- **文件**: `src/utils/indexedDBStorage.ts:72-84`
- **现状**: 每次保存都 `clear()` + 逐条 `put()`，O(n) 全量写入
- **方案**:
  - 新增 `idbSaveNote(note)` 单条 `put`
  - 新增 `idbDeleteNote(id)` 单条 `delete`
  - `idbSaveAllNotes` 仅保留给初始化/迁移使用
- **同步修改**: `src/utils/storage.ts`、`src/hooks/useNotes.ts` 中 `saveNotes` 调用逻辑

### 2. useNotes 自动保存加防抖

- **文件**: `src/hooks/useNotes.ts:40-45`
- **现状**: 每次 `setNotes` 都立即写 IndexedDB，打字时可能每 500ms 触发一次
- **方案**:
  - 在 `useNotes` 内部引入 debounce 机制（或复用已有的 `useDebounce` hook）
  - 防抖间隔 1000ms，在组件卸载时立即 flush
  - 确保切换笔记时立即保存当前笔记（不等待防抖）

### 3. currentNote 查找改用 Map

- **文件**: `src/hooks/useNotes.ts:35-38`
- **现状**: `notes.find()` 每次渲染都 O(n) 遍历
- **方案**:
  - 新增 `notesMap = useMemo(() => new Map(notes.map(n => [n.id, n])), [notes])`
  - `currentNote` 改为 `notesMap.get(currentNoteId)`，O(1) 查找
  - 同步优化 `getFormattedDate` 等其他 find 调用

### 4. Preview 按需引入语法高亮语言

- **文件**: `src/components/Preview.tsx:7`
- **现状**: `import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'` 全量引入，bundle 约 800KB+
- **方案**:
  - 改为 `import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light'`
  - 只注册常用语言：`jsx, typescript, python, css, json, bash, markdown, sql`
  - 预估减少 500KB+ 的 bundle 体积

---

## P1 - 中等影响，减少不必要的渲染和计算

### 5. Editor/Preview 切换笔记不销毁重建

- **文件**: `src/App.tsx:206,217`
- **现状**: `key={currentNote.id}` 导致切换笔记时完全销毁重建组件，丢失 undo 历史、滚动位置
- **方案**:
  - 移除 `key={currentNote.id}`
  - Editor 内部用 `useEffect` 监听 `note.id` 变化时同步 title/content 状态
  - Preview 已有 memo 比较逻辑，天然支持 prop 切换

### 6. MermaidDiagram 渲染 ID 改用 useRef

- **文件**: `src/components/MermaidDiagram.tsx:14,22`
- **现状**: 全局 `mermaidCounter` 在 StrictMode/并发渲染下可能重复
- **方案**:
  - 使用 `useRef` 维护计数器，或使用 `React.useId()` 生成稳定 ID
  - 加上渲染结果的缓存（同一份 code 不重复调用 `mermaid.render`）

### 7. NoteList memo 比较逻辑修正

- **文件**: `src/components/NoteList.tsx:399-408`
- **现状**: 只比较 `notes.length`，如果笔记内容变了但数量没变，列表不会更新
- **方案**:
  - 直接比较 `notes` 引用（因为 `useNotes` 每次 `setNotes` 都会返回新引用）
  - 或者改为比较 `notes` 的 hash/version 字段

### 8. SearchReplace 正则匹配结果缓存

- **文件**: `src/components/SearchReplace.tsx:26-45`
- **现状**: 每次 `query`/`content`/`caseSensitive` 变化都重新全文正则扫描
- **方案**:
  - 对 `matches.current` 的计算加入 `useMemo`
  - 对于大文档（>100KB），考虑 Web Worker 异步搜索

---

## P2 - 构建层面优化

### 9. 统一 Markdown 解析器

- **文件**: `src/components/Preview.tsx` 用 `react-markdown`，`src/utils/export.ts` 用 `marked`
- **现状**: 两套解析器同时存在，增加 bundle 体积
- **方案**:
  - export 功能也改用 `react-markdown` 的 remark 链路，或统一用 `marked`（更轻量）
  - 移除不用的那个依赖，减少约 30-50KB

### 10. Vite 构建配置优化

- **文件**: `vite.config.ts`
- **方案**:
  - `sourcemap` 改为 `'hidden'`（生产不暴露源码，仍能映射错误）
  - 添加 `build.rollupOptions.output.manualChunks` 配置，将 `mermaid`、`react-syntax-highlighter`、`katex` 拆分为独立 chunk
  - 添加 `build.target: 'es2020'` 利用更现代的语法减小体积

### 11. 移除平台硬编码依赖

- **文件**: `package.json:31,42`
- **现状**: `@esbuild/win32-x64` 和 `lightningcss-win32-x64-msvc` 硬编码
- **方案**:
  - 从 devDependencies 移除，让 pnpm 自动解析可选依赖
  - 或移到 `.npmrc` 的 `optionalDependencies` 中

---

## 执行顺序

```
Step 1: P0-1 + P0-3  →  Storage 层优化（增量保存 + Map 查找）
Step 2: P0-2 + P1-5  →  Editor/Preview 生命周期优化（防抖 + 移除 key 销毁）
Step 3: P0-4          →  语法高亮按需引入（bundle 体积优化）
Step 4: P1-6 ~ P1-8  →  细粒度渲染优化（Mermaid ID + memo 修正 + 搜索缓存）
Step 5: P2-9 ~ P2-11 →  构建配置优化（统一解析器 + chunk 拆分 + 依赖清理）
```

## 验证方式

每一步完成后：

1. `pnpm build` 检查产物大小变化
2. 手动测试编辑和切换笔记的流畅度
3. `pnpm lint` + `pnpm type-check` 确保无报错

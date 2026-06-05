# 路线 A 实施计划：Typora 级体验优化

> 保持分栏架构，在体验细节上逼近 Typora

---

## 总览

| 阶段 | 内容 | 改动文件数 | 前置依赖 |
|------|------|-----------|----------|
| **Phase 0** | 紧急 Bug 修复 | 8 | 无 |
| **Phase 1** | 死代码清理 + 依赖整理 | 15 | 无 |
| **Phase 2** | Typora 级交互增强 | 12 | Phase 0 |
| **Phase 3** | 编辑器增强 | 6 | Phase 0, 2 |
| **Phase 4** | 扩展语法支持 | 5 | Phase 0 |
| **Phase 5** | 导出增强 + 构建优化 | 4 | Phase 0, 4 |

---

## Phase 0：紧急 Bug 修复（基础保障）

### 0.1 修复键盘快捷键逻辑

**文件**: `src/hooks/useKeyboardShortcuts.ts`, `src/App.tsx`

**问题**: `ctrlKey: true, metaKey: true` 要求同时按下 Ctrl+Meta，导致快捷键不可用。

**方案**:

1. 修改 `useKeyboardShortcuts.ts` 的匹配逻辑，当 shortcut 定义了 `ctrlKey` 或 `metaKey` 时，event 只需满足 `ctrlKey || metaKey` 即可命中（不必两个同时为 true）
2. `App.tsx` 中快捷键定义只设 `ctrlKey: true`（不再设 metaKey），macOS 上浏览器自动将 Cmd 映射为 metaKey

```ts
// 修改前（useKeyboardShortcuts.ts:17-18）
const matchesCtrl = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
const matchesMeta = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;

// 修改后
const hasModifier = shortcut.ctrlKey || shortcut.metaKey;
const matchesCtrl = !hasModifier || event.ctrlKey || event.metaKey;
```

### 0.2 补充 Tailwind 颜色定义

**文件**: `tailwind.config.js`

**问题**: CSS 变量 `--card`, `--popover` 已在 `index.css` 中定义，但 `tailwind.config.js` 的 `theme.extend.colors` 中缺少对应条目，导致 `bg-card`, `bg-popover`, `text-popover-foreground` 等类被 Tailwind 忽略。

**方案**: 在 `theme.extend.colors` 中添加：

```js
card: {
  DEFAULT: 'hsl(var(--card))',
  foreground: 'hsl(var(--card-foreground))',
},
popover: {
  DEFAULT: 'hsl(var(--popover))',
  foreground: 'hsl(var(--popover-foreground))',
},
```

### 0.3 修复不存在的 CSS 类

**文件**: `src/App.tsx:227`

**问题**: `text-primary-hover-foreground` 没有对应的 CSS 变量或 Tailwind 颜色。

**方案**: 改为 `text-primary-foreground`。

### 0.4 修复 HTML 导出

**文件**: `src/utils/export.ts`

**问题**: 手写正则转 HTML 不可靠——第 80-81 行对 `^- (.*)$` 重复替换（第二次永远不匹配），正则之间互相干扰（`**bold**` 在 `*italic*` 之前处理会破坏嵌套），代码块处理顺序错误。

**方案**: 引入 `marked` 库，用 `marked.parse(note.content)` 正确生成 HTML，替换全部正则逻辑。

### 0.5 统一主题存储

**文件**: `src/hooks/useSettings.ts`, `src/context/ThemeContext.tsx`

**问题**: `useSettings` 将 theme 存到 localStorage（key: `settings`），`ThemeContext` 将 theme 存到 IndexedDB（key: `theme`），两套系统不同步。

**方案**:
1. 从 `Settings` 接口和 `useSettings` 中移除 `theme` 字段
2. Settings 面板中的主题切换改为调用 `ThemeContext.toggleTheme()`
3. 主题统一由 ThemeContext + IndexedDB 管理

### 0.6 修复 Preview 的 lazy 加载冲突

**文件**: `src/components/index.ts`

**问题**: 构建警告 `Preview.tsx is dynamically imported by App.tsx but also statically imported by components/index.ts`，导致 lazy 加载无效，代码分割不生效。

**方案**: 从 `index.ts` barrel 文件中移除 `Preview` 的静态导出，只保留 `App.tsx` 中的 `lazy(() => import('./components/Preview'))`。

---

## Phase 1：死代码清理 + 依赖整理

### 1.1 删除未使用的组件文件（4个）

| 文件 | 行数 | 未使用原因 |
|------|------|-----------|
| `src/components/FolderTree.tsx` | 231 | NoteList 内联了自己的 FolderNode |
| `src/components/CreateModal.tsx` | 198 | 从未在应用中导入 |
| `src/components/SearchBar.tsx` | 61 | 搜索功能内联在 NoteList |
| `src/components/CodeHighlight.tsx` | 44 | Preview 直接用 SyntaxHighlighter |

同步更新 `src/components/index.ts`，移除对应导出。

### 1.2 删除未使用的 Hooks（2个）

| 文件 | 未使用原因 |
|------|-----------|
| `src/hooks/useAutoSave.ts` | 自动保存在 Editor 的 debounce 中实现 |
| `src/hooks/useClickOutside.ts` | NoteItem 自己实现了点击外部检测 |

同步更新 `src/hooks/index.ts`。

### 1.3 清理未使用的工具函数导出

- `src/utils/export.ts`: 移除 `truncateText`, `searchNotes`
- `src/utils/indexedDBStorage.ts`: 移除 `idbSaveNote`, `idbDeleteNote`, `idbSaveFile`, `idbGetFile`, `idbGetFilesByNoteId`, `idbDeleteFile`, `idbDeleteFilesByNoteId`
- `src/utils/storage.ts`: 移除 `getStorageData`, `setStorageData`, `clearStorage`

### 1.4 清理其他未使用导出

- `src/components/ErrorBoundary.tsx`: 移除 `ErrorFallback` 函数
- `src/hooks/useNotes.ts`: 返回值中移除 `search`
- `src/hooks/useErrorHandler.ts`: 移除 `handleNetworkError`, `handleValidationError`

### 1.5 删除调试/备份文件

- `src/main.backup.tsx`
- `src/main.test.tsx`
- `src/phase2-integration-test.ts`
- `src/utils/test-utils.js`
- `src/hooks/useLocalStorage.test.ts`
- `src/hooks/useDebounce.test.ts`
- `src/hooks/hooks-integration-test.ts`
- `src/utils/utils.test.ts`

### 1.6 依赖整理

**package.json**:

移除:
- `date-fns`（从未使用）

移到 devDependencies:
- `@esbuild/win32-x64`
- `lightningcss-win32-x64-msvc`

新增:
- `marked`（Phase 0.4 HTML 导出）

### 1.7 移除生产代码中的 console.log

- `src/App.tsx`: 移除第 8, 11, 24, 30, 50 行的调试日志
- `src/components/ErrorBoundary.tsx`: 保留 error 级日志，移除 emoji 前缀

### 1.8 替换废弃的 substr()

- `src/utils/export.ts:127`: `.substr(2, 9)` → `.slice(2, 11)`
- `src/context/ToastContext.tsx:43`: `.substr(2, 9)` → `.slice(2, 11)`

---

## Phase 2：Typora 级交互增强（核心体验）

### 2.1 大纲导航（侧边栏双 Tab）

**设计**: 侧边栏搜索框下方添加「笔记 / 大纲」两个 Tab，切换显示内容。

**笔记 Tab**: 保持现有的笔记列表 + 文件夹树不变。

**大纲 Tab**: 自动解析当前笔记的所有标题（`#` ~ `######`），显示为树形缩进列表，点击跳转到编辑器对应位置。

**新增文件**:

1. `src/hooks/useOutline.ts` — 标题提取 Hook
   - 输入: markdown 文本
   - 输出: `{ level: number, text: string, line: number }[]`
   - 实现: 正则 `/^#{1,6}\s+(.+)$/gm` 提取标题，记录行号

2. `src/components/OutlineView.tsx` — 大纲 UI 组件
   - 接收 headings 数组，渲染为缩进列表
   - 当前可视区域的标题高亮
   - 点击项 → 调用 `onJumpToLine(line)` 回调

**修改文件**:

- `src/components/NoteList.tsx`: 搜索框下方添加 Tab 切换，大纲 Tab 展示 OutlineView
- `src/components/Editor.tsx`: 通过 `forwardRef` + `useImperativeHandle` 暴露 `scrollToLine(lineNumber)` 方法

**交互细节**:
- 大纲项缩进反映标题层级（h1 不缩进，h2 缩进一级...）
- 当前光标所在标题项高亮标记
- 无标题时显示空状态提示

### 2.2 字数统计 + 阅读时间

**修改文件**: `src/components/StatusBar.tsx`

**新增信息**:
- 字数: 中文字符数 + 英文词数（`\b[a-zA-Z]+\b` 匹配英文词，非 ASCII 字符逐个计数）
- 字符数: `content.length`
- 段落数: 空行分隔的文本块数
- 阅读时间: 约 300 字/分钟（中文），约 200 词/分钟（英文），取混合估算

**格式**: `1,234 字 · 5,678 字符 · 约 3 分钟阅读`

### 2.3 查找替换（编辑器顶部浮层）

**新增文件**: `src/components/SearchReplace.tsx`

**UI 设计**: 编辑器顶部浮层，类似 VS Code Ctrl+F

```
┌──────────────────────────────────────────────────────┐
│ 🔍 搜索词      ↑ ↓  3/12   Aa   替换词   替换 全部  │ × │
└──────────────────────────────────────────────────────┘
```

**功能**:
- `Ctrl+F` 打开搜索栏（编辑器获得焦点时）
- `Ctrl+H` 打开搜索+替换栏
- `Esc` 关闭
- 上/下箭头跳转匹配项
- 大小写敏感切换（Aa 按钮）
- 替换单个 / 替换全部

**技术方案**:
- textarea 不支持文本高亮，采用跳转方案：选中匹配文本 + scrollIntoView
- 从 `selectionStart` 向前/向后搜索匹配文本
- 当前匹配项高亮选中，显示 "N/M" 计数

**修改文件**:
- `src/components/Editor.tsx`: 集成 SearchReplace 组件，添加 Ctrl+F / Ctrl+H 快捷键处理

### 2.4 自动配对

**修改文件**: `src/components/Editor.tsx`

在 `handleKeyDown` 中增加配对逻辑：

| 触发输入 | 自动补全 | 光标位置 |
|---------|---------|---------|
| `(` | `()` | 中间 |
| `[` | `[]` | 中间 |
| `{` | `{}` | 中间 |
| `` ` `` | `` `` `` | 中间 |
| `"` | `""` | 中间 |
| `'` | `''` | 中间 |

可选增强：选中文本后按 `(` 或 `[`，用括号包裹选中文本。

### 2.5 焦点模式（Focus Mode）

**修改文件**: `src/components/Editor.tsx`, `src/index.css`

**实现**:
1. 在 textarea 上层覆盖一个半透明遮罩 div
2. 追踪 `selectionStart` 判断当前光标所在段落
3. 计算当前段落的像素坐标范围
4. 遮罩使用 CSS gradient：当前段落区域透明，其余区域半透明

**CSS 方案**:
```css
.focus-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: background 0.3s ease;
}
```

**触发**: 工具栏按钮（快捷键 F8），设置面板开关。

### 2.6 打字机模式（Typewriter Mode）

**修改文件**: `src/components/Editor.tsx`

**实现**:
1. 激活后，监听输入和光标移动事件
2. 根据 `selectionStart` 计算当前行号
3. 计算 `textarea.scrollTop = currentLine * lineHeight - clientHeight / 2`
4. 将光标所在行滚动到 textarea 垂直中心

**触发**: 工具栏按钮（快捷键 F9），设置面板开关。

### 2.7 快捷键体系完善

**修改文件**: `src/App.tsx`, `src/components/Editor.tsx`

**完整快捷键列表**:

| 快捷键 | 功能 | 位置 | 状态 |
|--------|------|------|------|
| `Ctrl+S` | 保存笔记 | App | 修复 |
| `Ctrl+N` | 新建笔记 | App | 修复 |
| `Ctrl+F` | 查找 | Editor | 新增 |
| `Ctrl+H` | 查找替换 | Editor | 新增 |
| `Ctrl+B` | 加粗 | Editor | 已有 |
| `Ctrl+I` | 斜体 | Editor | 已有 |
| `Ctrl+\` | 行内代码 | Editor | 新增 |
| `Ctrl+Shift+K` | 代码块 | Editor | 新增 |
| `F8` | 焦点模式 | Editor | 新增 |
| `F9` | 打字机模式 | Editor | 新增 |
| `Ctrl+E` | 切换编辑/预览 | App | 新增 |

---

## Phase 3：编辑器增强

### 3.1 代码块行号显示接入

**修改文件**: `src/components/Preview.tsx`

当前 Settings 面板有 `showLineNumbers` 开关但未接入 Preview。需要将 settings 传入 Preview 或通过 Context 读取，在 SyntaxHighlighter 上添加 `showLineNumbers` prop。

### 3.2 设置面板完善

**修改文件**: `src/components/SettingsPanel.tsx`

在现有设置项基础上新增：
- 焦点模式开关
- 打字机模式开关
- 自动配对开关

移除 theme 相关设置（Phase 0.5 已统一到 ThemeContext）。

### 3.3 Toolbar 修复与增强

**修改文件**: `src/components/Toolbar.tsx`

修复:
- `onNewFolder` 从 `() => {}` 改为接入实际的文件夹创建逻辑
- GitHub 链接指向实际仓库地址或移除

新增:
- 焦点模式切换按钮
- 打字机模式切换按钮

---

## Phase 4：扩展语法支持

### 4.1 数学公式（KaTeX）

**新增依赖**: `remark-math`, `rehype-katex`, `katex`

**修改文件**: `src/components/Preview.tsx`, `src/index.css`

```ts
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[rehypeRaw, rehypeKatex]}
>
```

引入 `katex/dist/katex.min.css` 样式。

**支持语法**:
- 行内: `$E = mc^2$`
- 块级: `$$\sum_{i=1}^n x_i$$`

### 4.2 Mermaid 图表

**新增依赖**: `mermaid`

**新增文件**: `src/components/MermaidDiagram.tsx`

**修改文件**: `src/components/Preview.tsx`

在 code 组件中检测 `language-mermaid`，用 Mermaid API 渲染为 SVG：

```ts
if (language === 'mermaid') {
  return <MermaidDiagram code={code} />;
}
```

**支持语法**: flowchart, sequence diagram, class diagram, state diagram, gantt, pie chart 等。

### 4.3 脚注支持

remark-gfm 已部分支持脚注语法。确保 Preview 中脚注正常渲染，在 `index.css` 中添加脚注相关样式。

### 4.4 PDF 导出

**修改文件**: `src/utils/export.ts`

**方案 A（简单）**: 使用浏览器原生 `window.print()` + 打印专用样式表

```css
@media print {
  .sidebar-root, .toolbar, .status-bar, .editor { display: none !important; }
  .preview { width: 100% !important; padding: 2rem; }
}
```

**方案 B（增强）**: 引入 `html2pdf.js`，将 Preview 区域渲染为 PDF 后下载。

---

## Phase 5：构建优化 + 收尾

### 5.1 代码分割

**修改文件**: `vite.config.ts`

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-markdown': ['react-markdown', 'remark-gfm', 'rehype-raw'],
        'vendor-highlight': ['react-syntax-highlighter'],
        'vendor-math': ['katex', 'remark-math', 'rehype-katex'],
        'vendor-mermaid': ['mermaid'],
      },
    },
  },
},
```

目标：首屏不加载 mermaid 和 katex，按需 lazy load，减小首屏包体积。

### 5.2 关闭生产 sourcemap

**修改文件**: `vite.config.ts`

`sourcemap: true` → `sourcemap: false`

### 5.3 开启 TypeScript strict 模式（可选）

**修改文件**: `tsconfig.json`

`"strict": false` → `"strict": true`，然后修复所有类型错误。

---

## 文件变更总览

### 新增文件（4个）

| 文件 | 说明 | Phase |
|------|------|-------|
| `src/components/OutlineView.tsx` | 大纲导航组件 | 2.1 |
| `src/components/SearchReplace.tsx` | 查找替换浮层组件 | 2.3 |
| `src/components/MermaidDiagram.tsx` | Mermaid 图表渲染组件 | 4.2 |
| `src/hooks/useOutline.ts` | 标题提取 Hook | 2.1 |

### 修改文件（~16个）

| 文件 | 改动内容 | Phase |
|------|---------|-------|
| `src/App.tsx` | 修复快捷键，移除 console.log，接入新功能 | 0.1, 1.7, 2.7 |
| `src/hooks/useKeyboardShortcuts.ts` | 修复匹配逻辑 | 0.1 |
| `tailwind.config.js` | 补充 card/popover 颜色 | 0.2 |
| `src/utils/export.ts` | 修复 HTML 导出，新增 PDF 导出，替换 substr | 0.4, 1.3, 1.8, 4.4 |
| `src/hooks/useSettings.ts` | 移除 theme 字段 | 0.5 |
| `src/context/ThemeContext.tsx` | 统一主题管理 | 0.5 |
| `src/components/index.ts` | 移除死导出，移除 Preview 静态导出 | 0.6, 1.1 |
| `src/components/Editor.tsx` | 自动配对，焦点/打字机模式，查找替换集成 | 2.3-2.7 |
| `src/components/Preview.tsx` | KaTeX, Mermaid, 行号 | 3.1, 4.1, 4.2 |
| `src/components/Toolbar.tsx` | 修复空函数，新增按钮 | 3.3 |
| `src/components/NoteList.tsx` | 添加大纲 Tab | 2.1 |
| `src/components/StatusBar.tsx` | 字数统计 + 阅读时间 | 2.2 |
| `src/components/SettingsPanel.tsx` | 新增设置项 | 3.2 |
| `src/context/ToastContext.tsx` | substr → slice | 1.8 |
| `src/index.css` | 焦点模式样式，KaTeX 样式，大纲样式 | 2.1, 2.5, 4.1 |
| `vite.config.ts` | 代码分割，sourcemap | 5.1, 5.2 |
| `package.json` | 依赖整理 | 1.6, 4.1, 4.2 |

### 删除文件（~12个）

| 文件 | 行数 | 原因 | Phase |
|------|------|------|-------|
| `src/components/FolderTree.tsx` | 231 | 未使用 | 1.1 |
| `src/components/CreateModal.tsx` | 198 | 未使用 | 1.1 |
| `src/components/SearchBar.tsx` | 61 | 未使用 | 1.1 |
| `src/components/CodeHighlight.tsx` | 44 | 未使用 | 1.1 |
| `src/hooks/useAutoSave.ts` | — | 未使用 | 1.2 |
| `src/hooks/useClickOutside.ts` | — | 未使用 | 1.2 |
| `src/main.backup.tsx` | — | 调试文件 | 1.5 |
| `src/main.test.tsx` | — | 调试文件 | 1.5 |
| `src/phase2-integration-test.ts` | — | 调试文件 | 1.5 |
| `src/utils/test-utils.js` | — | 调试文件 | 1.5 |
| `src/hooks/useLocalStorage.test.ts` | — | 过期测试 | 1.5 |
| `src/hooks/useDebounce.test.ts` | — | 过期测试 | 1.5 |
| `src/hooks/hooks-integration-test.ts` | — | 过期测试 | 1.5 |
| `src/utils/utils.test.ts` | — | 过期测试 | 1.5 |

---

## 新增依赖

```json
{
  "dependencies": {
    "marked": "^14.0.0",
    "remark-math": "^6.0.0",
    "rehype-katex": "^7.0.0",
    "katex": "^0.16.0",
    "mermaid": "^11.0.0"
  }
}
```

移除: `date-fns`

移到 devDependencies: `@esbuild/win32-x64`, `lightningcss-win32-x64-msvc`

---

## 实施依赖关系

```
Phase 0 (Bug修复)
  ├── 0.1 修复快捷键        ← 先修，后续所有快捷键功能依赖它
  ├── 0.2 Tailwind 颜色
  ├── 0.3 CSS 类名修复
  ├── 0.4 HTML 导出
  ├── 0.5 主题存储统一
  └── 0.6 lazy 加载修复
       ↓
Phase 1 (清理)              ← 可与 Phase 0 并行
  ├── 1.1-1.5 删除死代码
  ├── 1.6 依赖整理
  ├── 1.7 console.log
  └── 1.8 substr 替换
       ↓
Phase 2 (交互增强)          ← 核心体验提升
  ├── 2.1 大纲导航          ← 高价值，中等难度
  ├── 2.2 字数统计          ← 高价值，低难度
  ├── 2.3 查找替换          ← 高价值，高难度
  ├── 2.4 自动配对          ← 中价值，低难度
  ├── 2.5 焦点模式          ← 中价值，低难度
  ├── 2.6 打字机模式        ← 中价值，低难度
  └── 2.7 快捷键完善        ← 依赖 2.3-2.6
       ↓
Phase 3 (编辑器增强)
  ├── 3.1 行号显示
  ├── 3.2 设置面板完善
  └── 3.3 Toolbar 修复
       ↓
Phase 4 (扩展语法)
  ├── 4.1 KaTeX 数学公式
  ├── 4.2 Mermaid 图表
  ├── 4.3 脚注
  └── 4.4 PDF 导出
       ↓
Phase 5 (构建优化)
  ├── 5.1 代码分割
  ├── 5.2 sourcemap 关闭
  └── 5.3 strict 模式（可选）
```

---

## 验收标准

### Phase 0
- [ ] Ctrl+S / Ctrl+N / Ctrl+F 快捷键在 Windows 和 macOS 上均可触发
- [ ] `bg-card`, `bg-popover` 等类正确应用颜色
- [ ] HTML 导出的文件在浏览器中正确渲染
- [ ] 主题切换后刷新页面仍保持
- [ ] Preview 组件独立打包为 chunk

### Phase 1
- [ ] 无未使用的组件/hook/工具函数
- [ ] 无 console.log 在生产代码中
- [ ] 构建无 warning
- [ ] TypeScript 类型检查通过

### Phase 2
- [ ] 大纲导航正确显示标题层级，点击可跳转
- [ ] StatusBar 显示字数和阅读时间
- [ ] Ctrl+F 查找功能可用，支持替换
- [ ] 自动配对括号/引号工作正常
- [ ] 焦点模式激活后当前段落突出
- [ ] 打字机模式激活后光标居中

### Phase 3
- [ ] 代码块行号可通过设置面板控制
- [ ] 设置面板所有开关即时生效
- [ ] 工具栏所有按钮有实际功能

### Phase 4
- [ ] `$E=mc^2$` 正确渲染为数学公式
- [ ] Mermaid 代码块渲染为流程图
- [ ] PDF 导出生成可用的 PDF 文件

### Phase 5
- [ ] 首屏加载体积 < 500KB（gzip）
- [ ] 无 sourcemap 泄露

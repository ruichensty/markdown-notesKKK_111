# 修改记录

## 2026-05-29 — 性能优化

### 1. IndexedDB 增量更新替代全量写入

- **文件**: `src/utils/indexedDBStorage.ts`
  - 新增 `idbSaveNote(note)` — 单条 `put`，O(1) 写入
  - 新增 `idbDeleteNote(id)` — 单条 `delete`
  - 原有 `idbSaveAllNotes` 保留，仅用于初始化和数据迁移
- **文件**: `src/utils/storage.ts`
  - 新增 `saveSingleNote(note)` 和 `deleteSingleNote(id)` 导出
- **文件**: `src/hooks/useNotes.ts`
  - 保存逻辑从全量 `saveNotes(notes)` 改为 diff 增量保存
  - 通过 `prevNotesRef` 对比前后 `notes` 数组，只对新增/修改/删除的笔记执行 IndexedDB 操作
  - 新增笔记对比 `updatedAt` 时间戳，避免不必要的写入

### 2. currentNote 查找改用 Map

- **文件**: `src/hooks/useNotes.ts`
  - 新增 `notesMap = useMemo(() => new Map(...))` 缓存
  - `currentNote` 从 `notes.find()` (O(n)) 改为 `notesMap.get()` (O(1))
  - `getFormattedDate` 同步改用 `notesMap.get()` 查找

### 3. Editor/Preview 切换笔记不再销毁重建

- **文件**: `src/components/Editor.tsx`
  - 新增 `noteIdRef` 追踪当前笔记 ID
  - 新增 `useEffect` 监听 `note.id` 变化时同步 `title`/`content` 状态
  - 切换笔记时保留组件实例，保留 undo 历史和滚动位置
- **文件**: `src/App.tsx`
  - 移除 `Editor` 和 `Preview` 上的 `key={currentNote.id}` 属性

### 4. Preview 语法高亮按需引入

- **文件**: `src/components/Preview.tsx`
  - 从 `react-syntax-highlighter` 全量 Prism 引入改为 `prism-light` 轻量核心
  - 只注册 16 种常用语言：jsx/tsx/typescript/javascript/python/css/json/bash/markdown/sql/java/cpp/go/rust/yaml/xml/docker
  - 预估减少 500KB+ bundle 体积
  - 未注册的语言会以纯文本 fallback 显示，不影响使用

### 5. MermaidDiagram 渲染优化

- **文件**: `src/components/MermaidDiagram.tsx`
  - 全局 `mermaidCounter` 改为 `useRef` + `useId()` 生成稳定唯一 ID，解决 StrictMode 下冲突
  - 新增 `lastCodeRef` 缓存，同一份 code 不重复调用 `mermaid.render`
  - `securityLevel` 从 `'loose'` 改为 `'strict'`，防止 XSS
  - 渲染结果通过 `useState` + `dangerouslySetInnerHTML` 管理，避免直接操作 `innerHTML`

### 6. NoteList memo 比较逻辑修正

- **文件**: `src/components/NoteList.tsx`
  - `notes` 比较从 `length` 比较改为引用比较 `prevProps.notes === nextProps.notes`
  - 修复笔记内容变化但数量不变时列表不更新的问题

### 7. SearchReplace 正则匹配结果缓存

- **文件**: `src/components/SearchReplace.tsx`
  - 匹配结果从 `useRef` + `useEffect` 副作用计算改为 `useMemo` 缓存
  - 抽取 `findMatches` 纯函数，输入 `(content, query, caseSensitive)` 输出匹配位置数组
  - 消除 `matches.current` 的命令式更新，减少不必要的重渲染

### 8. Vite 构建配置优化

- **文件**: `vite.config.ts`
  - `sourcemap` 从 `true` 改为 `'hidden'`，生产环境不暴露源码结构，仍可映射错误
  - 新增 `build.target: 'es2020'`，利用更现代语法减小产物体积
  - 新增 `manualChunks` 配置，将 react/react-dom、markdown 插件、语法高亮、mermaid 拆分为独立 chunk，改善缓存和加载策略

### 9. 移除平台硬编码依赖

- **文件**: `package.json`
  - 从 devDependencies 移除 `@esbuild/win32-x64` 和 `lightningcss-win32-x64-msvc`
  - 这些平台相关依赖由 pnpm 自动解析，无需硬编码

### 10. HTML 导出 XSS 修复

- **文件**: `src/utils/export.ts`
  - 新增 `escapeHtml` 工具函数，转义 `&`、`<`、`>`、`"` 四种危险字符
  - `exportAsHTML` 中 `<title>` 和 `<h1>` 标签内的 `note.title` 改为通过 `escapeHtml()` 转义
  - 防止标题含 `<script>` 等标签导致 XSS

### 11. 快捷键 F8/F9 toast 文案修正

- **文件**: `src/App.tsx`
  - 修复焦点模式和打字机模式切换时 toast 文案与实际状态相反的问题
  - 原因：`updateSettings` 是异步状态更新，`settings` 此时还是旧值
  - 改为先计算 `next` 值，用 `next` 值判断 toast 文案

### 12. 导出菜单点击外部关闭

- **新文件**: `src/hooks/useClickOutside.ts`
  - 通用 `useClickOutside` hook，监听 `mousedown` 和 `touchstart` 事件
  - 返回 `ref` 绑定到目标元素，点击外部时触发回调
- **文件**: `src/hooks/index.ts`
  - 导出 `useClickOutside`
- **文件**: `src/components/Toolbar.tsx`
  - 导出菜单容器绑定 `useClickOutside` ref
  - 点击菜单外部区域时自动关闭下拉菜单

### 13. 搜索支持全文匹配

- **文件**: `src/components/NoteList.tsx`
  - 搜索过滤条件从只匹配 `note.title` 扩展为同时匹配 `note.content`
  - 标题匹配优先排序（标题匹配的排在前面）

### 14. Editor forwardRef 连接跳行功能

- **文件**: `src/App.tsx`
  - 新增 `editorRef` 引用 Editor 组件的 `EditorHandle`
  - 新增 `handleJumpToLine` 方法，调用 `editorRef.current.scrollToLine(line)`
  - 将 `onJumpToLine={handleJumpToLine}` 传递给编辑模式下的 NoteList
  - 将 `ref={editorRef}` 传递给 Editor
  - 大纲视图点击标题现在可以跳转到编辑器对应行

### 15. useLocalStorage 函数类型判断修复

- **文件**: `src/hooks/useLocalStorage.ts`
  - `newValue instanceof Function` 改为 `typeof newValue === 'function'`
  - 修复跨 iframe 场景下 `instanceof` 不可靠的问题

### 16. 设置存储统一到 IndexedDB

- **文件**: `src/hooks/useSettings.ts`
  - 从 `useLocalStorage` 改为直接使用 IndexedDB 的 `idbGetSetting`/`idbSetSetting`
  - 启动时从 IndexedDB 加载设置，合并默认值
  - 更新时同步写入 IndexedDB
  - 与主题存储方式统一，全部使用 IndexedDB

### 17. 文件夹删除处理子文件夹和关联笔记

- **文件**: `src/hooks/useFolders.ts`
  - `deleteFolder` 改为递归收集目标文件夹及所有子文件夹 ID
  - 一次性过滤删除所有层级
- **文件**: `src/components/NoteList.tsx`
  - 新增 `onRemoveFolderFromNotes` 可选 prop
  - 新增 `handleDeleteFolder` 方法，删除文件夹后同时通知清理关联笔记
  - `FolderNode` 的删除按钮改为调用 `handleDeleteFolder`
  - 额外导出 `folders` 以供递归查找子文件夹
- **文件**: `src/App.tsx`
  - 新增 `handleRemoveFolderFromNotes` 方法
  - 遍历所有笔记，从 `folderIds` 中移除已删除文件夹的 ID
  - 将回调传递给 NoteList

### 18. AppContent 拆分 — useWelcomeNote

- **新文件**: `src/hooks/useWelcomeNote.ts`
  - 从 `AppContent` 中抽取欢迎笔记创建逻辑为独立 hook
  - 接收 `loaded`、`notes`、`createNote`、`onError`、`onSuccess` 参数
- **文件**: `src/hooks/index.ts`
  - 导出 `useWelcomeNote`
- **文件**: `src/App.tsx`
  - 移除 `useEffect` 欢迎笔记逻辑，改用 `useWelcomeNote` hook
  - 移除不再需要的 `useEffect` import

### 19. Editor 拆分 — EditorToolbar

- **新文件**: `src/components/EditorToolbar.tsx`
  - 从 `Editor.tsx` 中抽取格式化工具栏为独立 `memo` 组件
  - 接收所有格式化操作回调（heading/bold/italic/strike/list/quote/code/link/search/fontSize/color/lineBreak）
  - 使用 `memo` 包裹避免不必要的重渲染
- **文件**: `src/components/Editor.tsx`
  - 移除内联工具栏 JSX（约 240 行），替换为 `<EditorToolbar>` 组件调用
  - Editor 主体从 613 行缩减为约 370 行
- **文件**: `src/components/index.ts`
  - 导出 `EditorToolbar`

### 20. 笔记拖拽排序

- **依赖**: 新增 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`
- **文件**: `src/types/note.ts`
  - `Note` 接口新增可选 `order` 字段
- **文件**: `src/hooks/useNotes.ts`
  - 新增 `reorderNotes(activeId, overId)` 方法
  - 拖拽完成后重新排列笔记数组并更新 `order` 值
- **文件**: `src/components/NoteList.tsx`
  - 新增 `SortableNoteItem` 组件，使用 `useSortable` 包裹 `NoteItem`
  - 根层级笔记列表使用 `DndContext` + `SortableContext` 包裹
  - 使用 `PointerSensor`（5px 激活距离），避免误触
  - 新增 `onReorderNotes` 可选 prop
- **文件**: `src/App.tsx`
  - 从 `useNotes` 解构 `reorderNotes`，传递给 NoteList

### 21. @esbuild/win32-x64 恢复

- **文件**: `package.json`
  - `@esbuild/win32-x64` 恢复到 devDependencies（Vite 4.5.3 依赖 esbuild 0.18.x 必须有此包）
  - `lightningcss-win32-x64-msvc` 保持移除（不影响构建）

## 2026-04-17

### 1. 编辑器格式化工具栏

- **文件**: `src/components/Editor.tsx`
- 在编辑区标题和内容之间新增格式化工具栏，支持以下功能：
  - **标题**：H1 / H2 / H3 快捷插入
  - **粗体**（`Ctrl+B`）、**斜体**（`Ctrl+I`）、**删除线**
  - **无序列表**、**有序列表**、**引用块**
  - **行内代码**、**代码块**、**链接**
  - **字号选择**：12px ~ 32px 下拉选择，通过 `<span style="font-size:Xpx">` HTML 标签实现
  - **文字颜色**：颜色选择器，通过 `<span style="color:XXX">` HTML 标签实现
  - **换行**：插入 Markdown 换行符 `  \n`
- 新增 `insertAtCursor` 工具函数，支持选区包裹和光标定位
- 支持 `Ctrl+B`、`Ctrl+I` 键盘快捷键触发粗体/斜体
- **文件**: `src/index.css`
- 新增 `.format-btn` 样式类，统一格式化按钮外观和交互反馈
- 新增 `.prose span[style]` 规则，确保预览区 HTML span 标签正确渲染

### 2. 底部状态栏修复（笔记数量 + 存储大小实时更新）

- **文件**: `src/components/StatusBar.tsx`
- **问题**：StatusBar 内部自行调用 `useNotes()` 创建了独立的 state 实例，与 `App.tsx` 中的笔记数据互不相通，导致新增/删除/编辑笔记后左下角笔记数量和右下角存储大小均无变化
- **修复**：改为通过 props 接收 `allNotes`，数据由 `App.tsx` 统一传入，确保与主应用状态同步
- **存储计算**：不再使用 `navigator.storage.estimate()`（浏览器整体估算，不准确），改为通过 `Blob` 直接计算每条笔记 title + content 的实际字节大小，使用 `useMemo` 在 `allNotes` 变化时实时更新
- **文件**: `src/App.tsx`
- 从 `useNotes()` 中解构 `allNotes`，传递给 `StatusBar` 组件

### 3. 侧边栏重构：合并笔记与文件夹为统一树形视图

- **文件**: `src/components/NoteList.tsx`
- 去掉「笔记」和「文件夹」tab 页切换，合并为统一的侧边栏视图
- 顶部操作栏改为两个并排按钮：「新建笔记」和「新建文件夹」
- 文件夹以树形结构展示，点击展开/折叠，默认折叠状态
- 文件夹展开后内部显示该文件夹下的笔记项
- 无文件夹归属的笔记直接显示在根层级
- 文件夹支持右键操作：新建子文件夹、重命名、删除（hover 显示操作按钮）
- 搜索模式下隐藏树形结构，直接展示搜索结果
- 将 `FolderNode` 组件内联到 `NoteList.tsx` 中，统一管理
- **文件**: `src/components/NoteItem.tsx`
- 笔记项改为紧凑样式：文件图标 + 文件名，单行展示
- 高度从约 60px 缩减到 26px，去除预览文本和时间戳显示
- 删除按钮改为 hover 显示的 × 图标，确认弹窗精简

### 4. 侧边栏 UI 设计优化

- **文件**: `src/components/NoteList.tsx`, `src/components/NoteItem.tsx`, `src/index.css`
- 引入 `sidebar-*` 语义化 CSS 类名体系，统一管理侧边栏样式
- **笔记项**：带折角效果的精致文件图标，选中时左侧出现蓝色指示条动画，hover 柔和背景过渡
- **文件夹**：圆角 chevron 展开动画，文件夹图标简化，笔记数量淡灰色小字显示，子级竖线连接
- **搜索栏**：输入框聚焦发光边框效果，placeholder 更柔和
- **操作按钮**：主按钮带投影和 hover 上浮效果，次按钮带边框
- **空状态**：更大的图标 + 双行提示
- **动画**：侧边栏从左滑入淡入，所有交互 150ms 过渡
- **修复**：侧边栏样式从 `@apply` 改为原生 CSS（`hsl(var(--xxx) / opacity)`），解决 Tailwind 不支持 CSS 变量颜色在 `@apply` 中使用的编译错误
- 暗色模式单独适配 `.dark` 选择器

### 5. 侧边栏交互优化

- **文件**: `src/components/NoteList.tsx`, `src/App.tsx`, `src/index.css`
- **文件夹内新建笔记**：文件夹 hover 操作按钮新增"新建笔记"（文档+号图标），点击后在该文件夹下创建笔记
- **空文件夹提示**：展开后无内容时显示"+ 新建笔记"入口，点击即创建
- **图标区分**：新建笔记用文档+号图标，新建子文件夹用文件夹+号图标
- **`handleNewNote` 支持文件夹参数**：`App.tsx` 中 `handleNewNote(folderIds?)` 可选传入文件夹 ID，笔记自动归属
- **展开图标改为 +/- 号**：折叠显示 `+`，展开显示 `-`，去掉原来的箭头旋转动画
- **层级缩进优化**：竖线间距从 16px 缩小到 13px，文件夹下笔记比父级多缩进 16px，视觉上明确从属关系不再平级

### 6. 侧边栏展开/收起动画 + 选中笔记自动定位

- **文件**: `src/components/NoteList.tsx`, `src/App.tsx`, `src/index.css`
- **收起动画丝滑化**：侧边栏从条件渲染（`{sidebarOpen && <NoteList>}`）改为始终渲染 + CSS `width/opacity` 过渡动画（`cubic-bezier(0.4, 0, 0.2, 1)`，250ms），收起时宽度平滑缩至 0
- **选中笔记自动展开定位**：文件夹的 `expanded` 状态改为计算值（`hasActiveNote || manuallyToggled`），当文件夹内包含选中笔记时自动展开，收起侧边栏再展开后逐级展开到选中笔记并 `scrollIntoView` 滚动定位

### 7. 修复主视图点击"开始书写"崩溃问题

- **文件**: `src/components/NoteList.tsx`
- **问题**：笔记的 `folderIds` 字段可能不是数组类型（旧数据或未初始化时为非数组值），直接调用 `?.includes()` 报错 `n.folderIds?.includes is not a function`
- **修复**：所有涉及 `folderIds` 判断的地方（`rootNotes` 过滤、`folderNotes` 过滤、`hasActiveDescendant` 递归）统一改为先 `Array.isArray(n.folderIds)` 判断再调用 `includes`

### 8. 预览区 HTML 标签渲染 + 字号/颜色交互优化

- **文件**: `src/components/Preview.tsx`
- **问题**：编辑器插入的 `<span style="...">` HTML 标签在预览区直接显示为纯文本，不被渲染
- **修复**：安装 `rehype-raw` 插件，添加到 `ReactMarkdown` 的 `rehypePlugins`，使预览区支持渲染 HTML 标签
- **文件**: `src/components/Editor.tsx`
- **字号/颜色交互优化**：无选中内容时，在光标处插入开闭标签 `<span style="..."></span>`，光标自动定位到标签内部，方便直接输入内容；有选中内容时则包裹选中文本

## 2026-04-13

### 1. Toast 弹窗退出动画优化

- **文件**: `src/context/ToastContext.tsx`, `src/index.css`
- Toast 消失时新增 `leaving` 状态，先播放 0.4s 的 `slideOut` 退出动画（向右滑出+淡出），动画结束后再从 DOM 移除
- 新增 `animate-slide-out` CSS 动画关键帧

### 2. 文件列表时间显示优化

- **文件**: `src/utils/export.ts`
- 时间格式从 `HH:mm` 改为 `HH:mm:ss`，显示秒数
- "X天前"及更早日期从 `YYYY-MM-DD` 改为 `YYYY-MM-DD HH:mm:ss`，同时显示日期和时分秒

### 3. 存储迁移：localStorage → IndexedDB

- **新建文件**: `src/utils/indexedDBStorage.ts`
  - IndexedDB 封装层，包含 `notes`、`folders`、`settings`、`files` 四个 object store
  - 提供完整的 CRUD 异步 API
  - 首次启动自动从 localStorage 迁移旧数据到 IndexedDB
  - 预留 `files` store，为后续文件上传附件存储做准备
- **修改文件**: `src/types/note.ts`
  - 新增 `Attachment` 类型（id、fileName、fileType、fileSize、uploadedAt）
  - `Note` 增加 `attachments` 可选字段
- **修改文件**: `src/utils/storage.ts`
  - 所有函数改为 `async`，底层使用 IndexedDB
- **修改文件**: `src/hooks/useNotes.ts`
  - 适配异步存储，新增 `loaded` 状态标记
- **修改文件**: `src/hooks/useFolders.ts`
  - 适配异步存储，新增 `loaded` 状态标记
- **修改文件**: `src/context/ThemeContext.tsx`
  - 主题加载改为异步
- **修改文件**: `src/main.tsx`
  - 应用启动时先执行 `migrateFromLocalStorage()`，迁移完成后再挂载 React

### 4. 底部状态栏存储容量展示

- **文件**: `src/components/StatusBar.tsx`
- 底部右侧显示已用/总配额（如 `2.3 MB / 500.0 MB`）
- 带颜色进度条指示用量（绿→黄→红）
- 使用 `navigator.storage.estimate()` API 获取用量，每 30 秒自动刷新

### 5. 修复刷新页面重复创建欢迎笔记

- **文件**: `src/App.tsx`
- 欢迎笔记创建逻辑增加 `loaded` 守卫，等待 IndexedDB 数据加载完毕后再判断是否需要创建
- 修复了异步加载前 `notes` 为空导致重复创建的问题

### 6. 规划文档

- **新建文件**: `TAURI_PLAN.md` — Tauri 桌面端改造计划
- **新建文件**: `FILE_UPLOAD_PLAN.md` — 文件上传功能实施计划

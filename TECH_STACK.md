# Markdown Notes 技术框架文档

## 技术栈

| 类别          | 技术                               | 版本  |
| ------------- | ---------------------------------- | ----- |
| UI 框架       | React                              | 19.x  |
| 开发语言      | TypeScript                         | 5.9.x |
| 构建工具      | Vite                               | 4.5.x |
| CSS 方案      | Tailwind CSS                       | 3.4.x |
| Markdown 渲染 | react-markdown                     | 10.x  |
| Markdown 扩展 | remark-gfm (GFM 语法)              | 4.x   |
| 代码高亮      | react-syntax-highlighter (Prism)   | 16.x  |
| 数学公式      | KaTeX (remark-math + rehype-katex) | -     |
| 流程图        | Mermaid                            | 10.x  |
| HTML 安全     | DOMPurify + rehype-sanitize        | -     |
| 拖拽排序      | @dnd-kit/core + @dnd-kit/sortable  | -     |
| 导出          | marked (HTML) + DOMPurify          | -     |

## 工程工具链

| 类别       | 技术                                                          |
| ---------- | ------------------------------------------------------------- |
| 代码检查   | ESLint 9 + typescript-eslint + react-hooks/react-refresh 插件 |
| 代码格式化 | Prettier                                                      |
| CSS 后处理 | PostCSS + Autoprefixer                                        |
| 包管理     | pnpm / npm                                                    |

## 项目架构

```
src/
├── components/        # UI 组件层
│   ├── HomeView       # 主视图（语录首页）
│   ├── Toolbar        # 顶部工具栏
│   ├── Editor         # Markdown 编辑器
│   ├── EditorToolbar  # 编辑器格式化工具栏
│   ├── Preview        # Markdown 实时预览（lazy 加载）
│   ├── MermaidDiagram # Mermaid 图表渲染（lazy 加载）
│   ├── NoteList       # 侧边栏笔记列表
│   ├── NoteItem       # 笔记条目（含删除确认浮层）
│   ├── SortableNoteList # 可拖拽排序的笔记列表
│   ├── FolderTree     # 文件夹树
│   ├── SidebarTabs    # 侧边栏标签切换
│   ├── SearchReplace  # 查找替换
│   ├── SearchResults  # 搜索结果
│   ├── OutlineView    # 大纲视图
│   ├── SettingsPanel  # 设置抽屉面板
│   ├── ConfirmDialog  # 通用确认对话框
│   ├── StatusBar      # 底部状态栏
│   ├── ErrorBoundary  # 错误边界
│   └── index.ts       # 统一导出
├── hooks/             # 自定义 Hooks
│   ├── useNotes       # 笔记 CRUD + IndexedDB 增量同步
│   ├── useFolders     # 文件夹管理 + 树构建
│   ├── useSettings    # 设置读写（IndexedDB）
│   ├── useDebounce    # 防抖
│   ├── useKeyboardShortcuts # 快捷键
│   ├── useErrorHandler# 错误处理
│   ├── useClickOutside# 点击外部检测
│   ├── useOutline     # Markdown 标题大纲解析
│   ├── useStorageEstimate # 存储空间估算
│   ├── useWelcomeNote # 首次启动欢迎笔记
│   └── index.ts       # 统一导出
├── context/           # React Context（2 个）
│   ├── ThemeContext   # 主题切换（light/dark）
│   └── ToastContext   # Toast 通知
├── utils/             # 工具函数
│   ├── indexedDBStorage # IndexedDB CRUD 层
│   ├── storage        # 增量存储读写
│   └── export         # 导出（MD/HTML/TXT/PDF）+ 日期格式化 + ID 生成
├── types/             # TypeScript 类型定义
├── App.tsx            # 主应用组件
├── main.tsx           # 入口
└── index.css          # 全局样式 + Tailwind + 自定义动画
```

## 核心设计模式

- **数据持久化**：IndexedDB（4 个 Object Store: notes, folders, settings, files），增量 diff 写入
- **状态管理**：无 Redux/Zustand，各 Hook 独立管理 state + Context 共享主题/通知
- **路径别名**：`@components`、`@hooks`、`@types`、`@utils`、`@context`
- **样式方案**：Tailwind CSS + CSS 变量（HSL 色值）实现主题切换
- **懒加载**：Preview 组件使用 `React.lazy` 动态导入
- **视图模式**：4 种视图（home / editor / split / preview）

## 数据流

```
IndexedDB
    ↓ loadNotes / idbGetAllNotes / idbGetAllFolders / idbGetSetting
useNotes / useSettings / useFolders (hooks)
    ↓ props
App.tsx (状态中枢)
    ↓ props
Toolbar / NoteList / Editor / Preview / HomeView / SettingsPanel
    ↓ user interaction
onUpdate / onDelete / onCreate (callbacks)
    ↓
hooks → IndexedDB (增量 diff: saveSingleNote / deleteSingleNote)
```

## 依赖清单

### 生产依赖

| 包名                     | 用途                                                      |
| ------------------------ | --------------------------------------------------------- |
| react                    | UI 渲染                                                   |
| react-dom                | DOM 挂载                                                  |
| react-markdown           | Markdown 文本渲染为 React 组件                            |
| remark-gfm               | GitHub Flavored Markdown 支持（表格、删除线、任务列表等） |
| remark-math              | 数学公式解析                                              |
| rehype-katex             | KaTeX 数学公式渲染                                        |
| rehype-raw               | HTML 标签渲染                                             |
| rehype-sanitize          | XSS 防护                                                  |
| react-syntax-highlighter | 代码块语法高亮（Prism 引擎）                              |
| marked                   | Markdown 转 HTML（用于导出）                              |
| dompurify                | HTML 净化（防 XSS）                                       |
| mermaid                  | 流程图/时序图等图表渲染                                   |
| katex                    | LaTeX 数学公式排版                                        |
| @dnd-kit/core            | 拖拽排序核心库                                            |
| @dnd-kit/sortable        | 拖拽排序扩展                                              |
| @dnd-kit/utilities       | 拖拽工具函数                                              |

### 开发依赖

| 包名                            | 用途                              |
| ------------------------------- | --------------------------------- |
| vite                            | 开发服务器 + 生产构建             |
| @vitejs/plugin-react            | React Fast Refresh 支持           |
| typescript                      | 类型检查                          |
| tailwindcss                     | 原子化 CSS 框架                   |
| postcss                         | CSS 处理管道                      |
| autoprefixer                    | CSS 浏览器前缀自动补全            |
| eslint                          | 代码静态检查                      |
| @eslint/js                      | ESLint JS 规则                    |
| typescript-eslint               | ESLint TypeScript 规则            |
| eslint-plugin-react-hooks       | React Hooks 规则检查              |
| eslint-plugin-react-refresh     | React Refresh 最佳实践            |
| prettier                        | 代码格式化                        |
| @types/react                    | React 类型定义                    |
| @types/react-dom                | ReactDOM 类型定义                 |
| @types/react-syntax-highlighter | react-syntax-highlighter 类型定义 |
| @types/node                     | Node.js 类型定义                  |
| globals                         | ESLint 全局变量定义               |

## 快捷键

| 快捷键       | 功能                |
| ------------ | ------------------- |
| Ctrl/Cmd + S | 保存笔记            |
| Ctrl/Cmd + N | 新建笔记            |
| Ctrl/Cmd + F | 搜索笔记            |
| Tab          | 编辑器中缩进        |
| Esc          | 关闭弹窗 / 设置面板 |

## 可用脚本

| 命令                | 说明                           |
| ------------------- | ------------------------------ |
| `pnpm dev`          | 启动开发服务器（端口 3000）    |
| `pnpm build`        | TypeScript 类型检查 + 生产构建 |
| `pnpm preview`      | 预览构建结果                   |
| `pnpm lint`         | ESLint 代码检查                |
| `pnpm lint:fix`     | 自动修复 ESLint 问题           |
| `pnpm format`       | Prettier 格式化代码            |
| `pnpm format:check` | 检查代码格式                   |
| `pnpm type-check`   | TypeScript 类型检查            |

## 代码规模

| 目录                                   | 行数            |
| -------------------------------------- | --------------- |
| components/                            | 约 1,625 行     |
| hooks/                                 | 约 400 行       |
| 根目录（App.tsx、main.tsx、index.css） | 约 636 行       |
| utils/                                 | 约 247 行       |
| context/                               | 约 159 行       |
| types/                                 | 约 35 行        |
| **合计（不含测试）**                   | **约 3,258 行** |

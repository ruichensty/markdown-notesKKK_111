# Tauri 桌面端改造计划

## 目标

- **桌面端（Tauri）**：支持打开本地文件夹作为工作区，侧边栏直接映射本地目录树，点击 `.md` 文件即可编辑并保存回原文件（类似 VS Code 打开文件夹）
- **网页端**：保持现有 IndexedDB 在线管理模式不变

## 前置要求

1. **安装 Rust** — https://rustup.rs
   - 确认: `rustc --version` 和 `cargo --version`
2. **系统依赖 (Windows)**
   - Visual Studio Build Tools (C++ 桌面开发工作负载)
   - WebView2 (Windows 10/11 已内置)

---

## 架构设计

### 核心思路：存储后端抽象层

根据运行环境（Web / Tauri）切换数据读写方式，前端组件无感知。

```
src/
├── utils/
│   ├── storage.ts              # 现有 → 改为统一入口，分发到不同后端
│   ├── storage-web.ts          # 新建 → IndexedDB 后端（现有逻辑提取）
│   ├── storage-tauri.ts        # 新建 → 本地文件系统后端
│   ├── indexedDBStorage.ts     # 现有 → 仅 Web 模式使用
│   └── platform.ts             # 新建 → 环境检测 + 模式管理
├── hooks/
│   ├── useNotes.ts             # 现有 → 适配双后端
│   ├── useFolders.ts           # 现有 → 适配双后端
│   └── useWorkspace.ts         # 新建 → 工作区状态管理（仅 Tauri）
├── components/
│   ├── NoteList.tsx            # 现有 → 支持本地目录树模式
│   ├── WorkspacePicker.tsx     # 新建 → 桌面端工作区选择器
│   └── ...
```

### 笔记存储格式（Tauri 模式）

采用标准 `.md` 文件 + 可选 YAML frontmatter，兼容其他 Markdown 编辑器：

```markdown
---
title: 笔记标题
createdAt: 2026-04-17T10:00:00Z
updatedAt: 2026-04-17T12:30:00Z
---

笔记内容...
```

- 文件名即笔记名（`我的笔记.md`）
- 目录结构即文件夹树
- 无 frontmatter 时：文件名作为标题，文件修改时间作为 updatedAt

### 统一 Note 类型

```ts
interface Note {
  id: string;              // Web: 生成ID / Tauri: 文件相对路径
  title: string;           // Web: 手动输入 / Tauri: 文件名或 frontmatter.title
  content: string;
  createdAt: number;
  updatedAt: number;
  folderIds?: string[];    // Web: 手动关联 / Tauri: 根据目录自动生成
  attachments?: Attachment[];
  filePath?: string;       // 仅 Tauri 模式，文件的绝对路径
}
```

---

## 分阶段实施

### 阶段 1：平台检测 + 存储后端抽象

#### 新建 `src/utils/platform.ts`

```ts
export type PlatformMode = 'web' | 'tauri';

export function getPlatform(): PlatformMode {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    ? 'tauri'
    : 'web';
}
```

#### 改造 `src/utils/storage.ts`

改为抽象层入口，根据平台分发：

- `loadNotes()` → Web: `storage-web.ts` / Tauri: `storage-tauri.ts`
- `saveNotes()` → 同上
- `loadFolders()` → 同上
- 所有 hook 通过 storage.ts 统一调用，不直接引用底层实现

#### 新建 `src/utils/storage-web.ts`

从现有 `storage.ts` + `indexedDBStorage.ts` 提取，接口不变。

#### 新建 `src/utils/storage-tauri.ts`

基于 `@tauri-apps/plugin-fs` 实现相同接口：

| 方法 | 实现逻辑 |
|------|---------|
| `loadNotes()` | 扫描工作区下所有 `.md` 文件，解析 frontmatter，生成 Note[] |
| `saveNote(note)` | 将 note.content 写回对应 `.md` 文件 |
| `createNote(data)` | 在当前目录创建新 `.md` 文件 |
| `deleteNote(id)` | 删除对应 `.md` 文件（可选移入回收站） |
| `loadFolders()` | 根据目录结构自动生成 Folder[] 树 |
| `createFolder(data)` | `mkdir` 创建目录 |
| `deleteFolder(id)` | `rmdir` 删除目录 |

### 阶段 2：Tauri 项目初始化

```bash
# 安装 Tauri CLI 和核心依赖
pnpm add -D @tauri-apps/cli@^2
pnpm tauri init

# 安装所需插件
pnpm add @tauri-apps/plugin-fs      # 文件系统读写
pnpm add @tauri-apps/plugin-dialog  # 文件夹选择对话框
pnpm add @tauri-apps/plugin-shell   # 外部操作（可选）
pnpm add @tauri-apps/plugin-store   # 持久化配置（工作区路径等）
```

#### Tauri 配置要点 (`tauri.conf.json`)

- App name: `markdown-notes`
- Window title: `Markdown Notes`
- Dev server URL: `http://localhost:3000`
- Build output: `../dist`
- 权限配置：`fs:read`, `fs:write`, `dialog:open`, `shell:open`

#### 项目结构

```
markdown-notes/
├── src/                  # 现有前端代码
├── src-tauri/            # Tauri 后端（新增）
│   ├── src/
│   │   └── main.rs       # 最小 Rust 入口
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/     # 权限声明
│   │   └── default.json
│   └── icons/
├── package.json
└── vite.config.ts
```

> 前端代码基本不需要改动，Rust 端仅作最小入口，核心逻辑全在前端 JS 层通过 Tauri 插件 API 实现。

### 阶段 3：工作区管理

#### 新建 `src/components/WorkspacePicker.tsx`

桌面端启动时的工作区选择界面，选项：

1. **打开文件夹** — 调用 Tauri `dialog.open({ directory: true })` 选择目录
2. **最近打开** — 从 `plugin-store` 读取最近使用的工作区列表，快速打开
3. **在线模式** — 回退到 IndexedDB 模式，与网页端一致

#### 新建 `src/hooks/useWorkspace.ts`

管理工作区状态：

```ts
interface WorkspaceState {
  mode: 'local' | 'online';           // 本地工作区 or 在线模式
  rootPath: string | null;             // 工作区根目录绝对路径
  recentWorkspaces: string[];          // 最近打开列表
  openWorkspace: (path: string) => void;
  closeWorkspace: () => void;
  addRecent: (path: string) => void;
}
```

#### 工作区路径持久化

使用 `@tauri-apps/plugin-store` 存储到 `~/.markdown-notes/config.json`：

```json
{
  "recentWorkspaces": ["/Users/xxx/Documents/notes", "/Users/xxx/Desktop/markdown"],
  "lastWorkspace": "/Users/xxx/Documents/notes"
}
```

### 阶段 4：侧边栏适配

#### `NoteList.tsx` 双模式支持

| 场景 | Web 模式 | Tauri 工作区模式 |
|------|---------|-----------------|
| 数据来源 | `useNotes()` / `useFolders()` | `storage-tauri.ts` 扫描本地目录 |
| 文件夹显示 | 从 IndexedDB 读取 | 直接映射本地目录结构 |
| 笔记显示 | 从 IndexedDB 读取 | 扫描目录下的 `.md` 文件 |
| 新建笔记 | `createNote()` → IndexedDB | 创建 `.md` 文件 |
| 新建文件夹 | `createFolder()` → IndexedDB | `mkdir` 创建目录 |
| 删除笔记 | 从 IndexedDB 移除 | 删除 `.md` 文件 |
| 排序 | 按文件名 + 创建时间 | 按文件名 + 文件修改时间 |

#### 目录 → Folder 映射规则

```
工作区根目录/
├── 日常笔记/            → Folder(id: "日常笔记", name: "日常笔记")
│   ├── 2026-04.md      → Note(title: "2026-04", filePath: "日常笔记/2026-04.md")
│   └── 待办事项.md      → Note(title: "待办事项", filePath: "日常笔记/待办事项.md")
├── 技术文档/            → Folder(id: "技术文档", name: "技术文档")
│   ├── React/          → Folder(id: "React", parentId: "技术文档")
│   │   └── hooks.md
│   └── TypeScript.md
└── README.md           → 根级 Note(title: "README")
```

### 阶段 5：文件监听与同步

#### 使用 Tauri fs watch 监听工作区变化

- 外部新增/删除/修改 `.md` 文件时，自动刷新侧边栏
- 编辑器保存时写回文件（防抖 500ms）
- 文件被外部修改时的冲突处理策略：
  1. 如果当前笔记未修改 → 自动重新加载
  2. 如果当前笔记已修改 → 弹出提示让用户选择（保留自己的 / 采用外部版本 / 合并）

#### 实现方式

- Tauri Rust 端注册 `fs.watch` 监听，通过事件将变更推送到前端
- 前端监听事件，按需刷新 `notes` 和 `folders` 状态

### 阶段 6：桌面端特有功能

#### 原生菜单栏

```
文件(F)          编辑(E)         视图(V)
├─ 打开工作区     ├─ 撤销         ├─ 侧边栏
├─ 新建笔记       ├─ 重做         ├─ 编辑器
├─ 新建文件夹     ├─ 剪切         ├─ 预览
├─ 保存          ├─ 复制         ├─ 分屏视图
├─ 导出为         ├─ 粘贴         └─ 切换主题
│  ├─ Markdown   ├─ 全选
│  ├─ HTML       └─ 查找
│  └─ 纯文本
├─ 最近打开
└─ 退出
```

#### 其他桌面端特性

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 系统托盘 | 关闭窗口时最小化到托盘，托盘图标右键菜单 | P1 |
| 拖拽打开 | 拖拽 `.md` 文件到窗口直接打开编辑 | P1 |
| 文件关联 | 双击系统中的 `.md` 文件直接用此应用打开 | P2 |
| 自动更新 | Tauri 内置 updater 插件 | P3 |
| 全局快捷键 | 快速呼出应用窗口 | P3 |

### 阶段 7：构建发布

```bash
pnpm tauri build
```

| 平台 | 输出格式 | 说明 |
|------|---------|------|
| Windows | `.msi` / `.exe` (NSIS) | WebView2 已内置 |
| macOS | `.dmg` | 需 Apple Developer 签名 |
| Linux | `.AppImage` / `.deb` | — |

#### CI/CD（可选）

- GitHub Actions 自动构建三平台安装包
- 推送 tag 时自动发布 Release

---

## 实施顺序总览

```
阶段 1: 平台检测 + 存储后端抽象     ← 基础，不涉及 Tauri
阶段 2: Tauri 项目初始化            ← 初始化脚手架
阶段 3: 工作区管理                  ← 核心交互流程
阶段 4: 侧边栏适配                  ← UI 适配
阶段 5: 文件监听与同步              ← 增强体验
阶段 6: 桌面端特有功能              ← 锦上添花
阶段 7: 构建发布                    ← 打包分发
```

## 注意事项

- 现有前端代码改动量小，核心变化在 `storage.ts` 抽象层和 `NoteList.tsx` 适配
- Web 模式和 Tauri 模式共享 90% 的组件代码
- `localStorage` / IndexedDB 在 Tauri 模式下仍然可用（在线模式回退）
- 使用 Tauri 2.x，插件系统已完善，不需要手写 Rust 代码
- 首次 `cargo build` 较慢（5-10 分钟），后续增量编译快
- 笔记存储为标准 `.md` 文件，用户可用 Typora / VS Code 等工具直接打开编辑

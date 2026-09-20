# Markdown Notes App

一个功能完整的 Markdown 笔记应用，支持实时预览、语法高亮、自动保存、主题切换和导出功能。

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 📦 可用脚本

| 命令                | 描述                 |
| ------------------- | -------------------- |
| `pnpm dev`          | 启动开发服务器       |
| `pnpm build`        | 构建生产版本         |
| `pnpm preview`      | 预览生产版本         |
| `pnpm lint`         | 运行 ESLint 检查     |
| `pnpm lint:fix`     | 自动修复 ESLint 问题 |
| `pnpm format`       | 格式化代码           |
| `pnpm format:check` | 检查代码格式         |
| `pnpm type-check`   | TypeScript 类型检查  |
| `pnpm test`         | 运行单元测试         |
| `pnpm test:watch`   | 监听模式运行测试     |

## 🎯 核心功能

- ✅ 创建/编辑/删除笔记
- ✅ 文件夹树形管理与拖拽排序
- ✅ 实时 Markdown 预览
- ✅ 代码块语法高亮（支持多种语言）
- ✅ 数学公式（KaTeX）与 Mermaid 图表
- ✅ 自动保存（防抖机制 + IndexedDB）
- ✅ 主题切换（亮色/暗色）
- ✅ 全文搜索笔记
- ✅ 导出 Markdown / HTML / TXT / PDF 文件
- ✅ 回收站（删除笔记可恢复）
- ✅ 模板系统与命令面板
- ✅ 大纲视图与查找替换
- ✅ AI 助手（选区/章节上下文、回复应用到笔记、语音播报、自定义 UI 主题）
- ✅ 数据备份与跨浏览器迁移
- ✅ 健康提醒、护眼模式、专注/打字机模式
- ✅ 使用时长统计
- ✅ 手机扫码打开当前应用地址
- ✅ 响应式设计

## 📱 手机访问

Toolbar 中的“手机打开”按钮会生成当前页面地址二维码，手机扫码即可打开应用页面。同源部署环境下，可继续使用浏览器的 PWA 安装能力添加到主屏幕。

开发环境如需让手机访问电脑上的服务，请确保手机和电脑在同一局域网，并使用可被局域网访问的地址启动：

```bash
pnpm dev -- --host 0.0.0.0
```

如果二维码地址是 `localhost` 或 `127.0.0.1`，手机通常无法直接访问，请改用电脑的局域网 IP 或部署后的 HTTPS 地址。打开笔记时，二维码会带上当前笔记定位信息；只有手机端已有这篇笔记时才会自动打开。笔记数据存储在各自浏览器的 IndexedDB 中，不会自动同步，也不会分享当前笔记内容。

## 🛠️ 技术栈

- **前端框架**: React 19 + TypeScript + Vite
- **Markdown 解析**: react-markdown + remark-gfm + rehype-raw/sanitize/katex
- **代码高亮**: react-syntax-highlighter (Prism)
- **图表**: Mermaid；**数学**: KaTeX
- **样式方案**: Tailwind CSS
- **数据存储**: IndexedDB（自动迁移 LocalStorage 旧数据）
- **拖拽排序**: @dnd-kit
- **状态管理**: React Hooks
- **测试**: Vitest + Testing Library
- **代码格式化**: Prettier
- **代码检查**: ESLint

## 📁 项目结构

```
markdown-notes/
├── public/              # 静态资源
├── src/
│   ├── components/      # React 组件
│   ├── hooks/          # 自定义 Hooks
│   ├── types/          # TypeScript 类型定义
│   ├── utils/          # 工具函数（IndexedDB、导出）
│   ├── context/        # React Context（Theme、Toast、ContextMenu）
│   ├── constants/      # 常量（主题色、字体、AI 提示词）
│   ├── test/           # 测试 setup
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 应用入口
│   └── index.css       # 全局样式
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
├── tailwind.config.js  # Tailwind CSS 配置
├── vite.config.ts      # Vite 配置
└── vitest.config.ts    # Vitest 测试配置
```

## 🎨 主题

应用支持亮色和暗色两种主题，主题设置会自动保存到 IndexedDB。

## 📝 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用 PascalCase 命名
- 工具函数使用 camelCase 命名

### Git 提交规范

```
feat: 添加新功能
fix: 修复 bug
style: 代码格式调整
refactor: 代码重构
perf: 性能优化
test: 测试相关
docs: 文档更新
```

## 🚀 部署

### 构建

```bash
pnpm build
```

构建产物将生成在 `dist` 目录。

### 部署

可以将 `dist` 目录部署到任何静态托管服务：

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

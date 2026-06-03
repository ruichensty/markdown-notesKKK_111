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

## 🎯 核心功能

- ✅ 创建/编辑/删除笔记
- ✅ 实时 Markdown 预览
- ✅ 代码块语法高亮（支持多种语言）
- ✅ 自动保存（防抖机制）
- ✅ 主题切换（亮色/暗色）
- ✅ 搜索笔记
- ✅ 导出 Markdown 文件
- ✅ 导出 PDF 文件
- ✅ 响应式设计

## 🛠️ 技术栈

- **前端框架**: React 19 + TypeScript + Vite
- **Markdown 解析**: react-markdown + remark-gfm + rehype-sanitize
- **代码高亮**: react-syntax-highlighter (Prism)
- **样式方案**: Tailwind CSS
- **数据存储**: IndexedDB（兼容 LocalStorage 旧数据迁移）
- **状态管理**: React Hooks
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
│   ├── utils/          # 工具函数
│   ├── context/        # React Context
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 应用入口
│   └── index.css       # 全局样式
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
├── tailwind.config.js  # Tailwind CSS 配置
└── vite.config.ts      # Vite 配置
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

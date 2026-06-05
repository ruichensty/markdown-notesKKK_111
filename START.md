# Markdown Notes - 启动指南

## 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## 快速开始

### 1. 进入项目目录

```bash
cd markdown-notes
```

### 2. 安装依赖（首次运行时）

```bash
pnpm install
```

### 3. 启动开发服务器

```bash
pnpm dev
```

启动成功后会显示：

```
VITE v4.5.3  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 4. 在浏览器中打开

在浏览器中访问：**http://localhost:3000/**

## 启动命令

```bash
# 进入项目目录
cd markdown-notes

# 安装依赖（首次或依赖变更时）
pnpm install

# 启动开发服务器
pnpm dev

# 或使用 npm
npm install
npm run dev
```

启动成功后浏览器访问 **http://localhost:3000/**

## 可用命令

| 命令                                     | 说明                            |
| ---------------------------------------- | ------------------------------- |
| `pnpm dev` / `npm run dev`               | 启动开发服务器（默认端口 3000） |
| `pnpm build` / `npm run build`           | 构建生产版本到 `dist/` 目录     |
| `pnpm preview` / `npm run preview`       | 预览构建结果                    |
| `pnpm lint` / `npm run lint`             | 运行 ESLint 代码检查            |
| `pnpm lint:fix` / `npm run lint:fix`     | 自动修复 ESLint 问题            |
| `pnpm format` / `npm run format`         | 使用 Prettier 格式化代码        |
| `pnpm format:check`                      | 检查代码格式是否符合要求        |
| `pnpm type-check` / `npm run type-check` | TypeScript 类型检查             |

## 功能特性

- ✅ 实时 Markdown 预览
- ✅ 代码语法高亮（16 种语言）
- ✅ KaTeX 数学公式渲染
- ✅ Mermaid 图表渲染
- ✅ 自动保存到 IndexedDB
- ✅ 深色/浅色主题切换
- ✅ 四种视图模式（首页/编辑器/预览/分屏）
- ✅ 文件夹分类 + 拖拽排序
- ✅ 查找替换（Ctrl+F / Ctrl+H）
- ✅ 焦点模式 / 打字机模式
- ✅ 导出为 Markdown、HTML、Text、PDF
- ✅ 键盘快捷键支持
- ✅ 笔记搜索（防抖）
- ✅ 大纲视图
- ✅ 移动端响应式适配

## 键盘快捷键

| 快捷键         | 功能                    |
| -------------- | ----------------------- |
| `Ctrl/Cmd + S` | 保存笔记                |
| `Ctrl/Cmd + N` | 新建笔记                |
| `Ctrl/Cmd + F` | 搜索笔记 / 编辑器内查找 |
| `Ctrl/Cmd + H` | 查找替换                |
| `Ctrl/Cmd + E` | 切换视图模式            |
| `Ctrl/Cmd + B` | 粗体                    |
| `Ctrl/Cmd + I` | 斜体                    |
| `Tab`          | 编辑器中缩进            |
| `F8`           | 焦点模式                |
| `F9`           | 打字机模式              |

## 注意事项

1. 数据存储在浏览器的 IndexedDB 中
2. 清除浏览器数据会丢失所有笔记
3. 建议定期使用导出功能备份笔记

## 故障排查

### 依赖安装失败

```bash
# 清除缓存后重新安装
pnpm store prune
pnpm install
```

### 端口被占用

修改 `vite.config.ts` 中的端口号：

```typescript
server: {
  port: 3001, // 修改为其他端口
  open: true,
}
```

### 页面空白

**最常见的 dev 模式白屏原因：Vite 依赖预构建缓存损坏。**

```bash
# Windows — 清除缓存并重启
rmdir /s /q node_modules\.vite
npm run dev

# macOS / Linux — 清除缓存并重启
rm -rf node_modules/.vite
npm run dev
```

排查步骤：

1. 先验证 build 产物是否正常：

   ```bash
   npm run build && npx vite preview --port 3002
   ```

   浏览器打开 `http://localhost:3002/`，如果正常则说明是 Vite 缓存问题

2. 打开浏览器开发者工具（F12），检查 Console 是否有红色错误信息

3. 如果清除缓存无效，尝试完整重装依赖：
   ```bash
   rmdir /s /q node_modules
   npm install
   npm run dev
   ```

## 开发建议

- 修改代码后，Vite 会自动热更新
- 保持代码格式化一致性，使用 `pnpm format`
- 提交代码前运行 `pnpm type-check` 和 `pnpm lint`

## 项目结构

```
markdown-notes/
├── src/
│   ├── components/      # React 组件
│   ├── context/        # React Context
│   ├── hooks/          # 自定义 Hooks
│   ├── types/          # TypeScript 类型
│   ├── utils/          # 工具函数
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 入口文件
│   └── index.css       # 全局样式
├── public/             # 静态资源
├── index.html          # HTML 模板
├── vite.config.ts     # Vite 配置
├── tailwind.config.js # Tailwind CSS 配置
└── package.json       # 项目依赖和脚本
```

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 4
- **样式**: Tailwind CSS
- **Markdown**: react-markdown + remark-gfm + remark-math + rehype-katex
- **代码高亮**: react-syntax-highlighter
- **图表**: Mermaid
- **存储**: IndexedDB

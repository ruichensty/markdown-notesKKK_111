# GitHub 发布与 GitHub Pages 部署指南

本文档说明如何将当前 Markdown Notes 项目发布到 GitHub，并可选部署到 GitHub Pages。

当前项目是 React + TypeScript + Vite 前端项目。发布到 GitHub 后，可以作为源码仓库使用；如果开启 GitHub Pages，则可以自动构建 `dist/` 并部署为可访问的网站。

## 1. 发布目标

有两种常见目标：

1. 只把源码托管到 GitHub。
2. 把源码托管到 GitHub，并用 GitHub Pages 自动部署网页。

推荐流程：

```text
先发布源码 → 再按需配置 GitHub Pages
```

## 2. 发布源码到 GitHub

### 2.1 创建 GitHub 仓库

打开：

```text
https://github.com/new
```

填写：

```text
Repository name: markdown-notes
Description: Markdown notes app built with React + TypeScript + Vite
Visibility: Public 或 Private
```

建议：

- 只给自己使用：选择 `Private`。
- 想展示项目：选择 `Public`。

注意：如果本地项目已有 README 和 `.gitignore`，创建仓库时不要勾选：

```text
Add a README file
Add .gitignore
Choose a license
```

否则第一次 push 时可能出现历史冲突。

## 3. 本地初始化 Git

在项目根目录执行：

```bash
git init
```

检查状态：

```bash
git status
```

## 4. 发布前检查 .gitignore

发布前应确认 `.gitignore` 至少包含以下内容：

```gitignore
node_modules
dist
dist-ssr
*.local
.env
.env.local
.env.*.local
.DS_Store
tsconfig.tsbuildinfo
dev.log
dev-output.log
```

建议不要提交：

- `node_modules/`
- `dist/`
- `.env`、密钥、token
- 日志文件
- 本地临时文件
- 备份文件

可以提交：

- `README.md`
- `docs/aliyun-deployment.md`
- `docs/github-publishing.md`
- 项目源码
- 配置文件
- `pnpm-lock.yaml`

是否提交 `docs/plans/*.md` 取决于你是否希望保留优化计划文档。

## 5. 发布前验证

推送到 GitHub 前建议运行：

```bash
pnpm lint
pnpm type-check
pnpm build
```

当前项目构建时可能仍会出现 Mermaid 大 chunk 警告，例如：

```text
Some chunks are larger than 500 kBs after minification
```

这是构建警告，不是构建失败。只要 `pnpm build` 退出码为 0，就可以正常发布。

## 6. 首次提交代码

添加文件：

```bash
git add .
```

提交：

```bash
git commit -m "feat: initial markdown notes app"
```

## 7. 绑定远程仓库并推送

假设 GitHub 仓库地址是：

```text
https://github.com/yourname/markdown-notes.git
```

执行：

```bash
git remote add origin https://github.com/yourname/markdown-notes.git
git branch -M main
git push -u origin main
```

推送完成后，GitHub 仓库页面就能看到项目源码。

## 8. 后续更新代码

以后修改代码后：

```bash
pnpm lint
pnpm type-check
pnpm build
git status
git add .
git commit -m "feat: describe your change"
git push
```

建议提交信息使用 Conventional Commits：

```text
feat: 新功能
fix: 修复问题
docs: 文档变更
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 工程维护
```

## 9. 使用 GitHub Pages 部署网站

如果希望项目可以通过网页访问，可以使用 GitHub Pages。

GitHub Pages 部署流程：

```text
push 到 main
  ↓
GitHub Actions 自动安装依赖
  ↓
运行 lint / type-check / build
  ↓
上传 dist
  ↓
部署到 GitHub Pages
```

## 10. 配置 Vite base

GitHub Pages 的访问路径通常和仓库名有关。

如果仓库名是：

```text
markdown-notes
```

默认访问地址通常是：

```text
https://yourname.github.io/markdown-notes/
```

这种情况下，需要在 `vite.config.ts` 中配置：

```ts
export default defineConfig({
  base: "/markdown-notes/",
  plugins: [react()],
  // ...
});
```

如果使用自定义域名，例如：

```text
https://notes.example.com/
```

则建议使用：

```ts
export default defineConfig({
  base: "/",
  plugins: [react()],
  // ...
});
```

注意：

- 使用 GitHub Pages 项目路径时，`base` 必须是 `/<仓库名>/`。
- 使用独立域名时，`base` 通常是 `/`。

## 11. 添加 GitHub Actions 工作流

创建文件：

```text
.github/workflows/deploy.yml
```

写入：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.17.0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Build
        run: pnpm build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 12. 开启 GitHub Pages

进入 GitHub 仓库页面：

```text
Settings → Pages
```

Source 选择：

```text
GitHub Actions
```

之后每次 push 到 `main`，GitHub 会自动执行部署流程。

部署成功后，页面会显示访问地址，例如：

```text
https://yourname.github.io/markdown-notes/
```

## 13. 使用自定义域名（可选）

如果要使用自定义域名，例如：

```text
notes.example.com
```

需要做三件事：

1. 在 GitHub Pages 设置里填写自定义域名。
2. 在 DNS 服务商处添加 CNAME 解析。
3. 确认 `vite.config.ts` 的 `base` 为 `/`。

DNS 示例：

```text
记录类型：CNAME
主机记录：notes
记录值：yourname.github.io
```

GitHub Pages 通常会自动申请 HTTPS 证书。证书生效可能需要等待几分钟到几十分钟。

## 14. GitHub Pages 常见问题

### 14.1 页面空白

常见原因是 Vite `base` 配置不正确。

如果访问地址是：

```text
https://yourname.github.io/markdown-notes/
```

则 `vite.config.ts` 应该配置：

```ts
base: "/markdown-notes/";
```

### 14.2 CSS 或 JS 加载 404

也是 `base` 配置问题。

检查浏览器控制台 Network 面板，确认资源路径是否以 `/markdown-notes/` 开头。

### 14.3 Actions 构建失败

常见原因：

- `pnpm-lock.yaml` 和 `package.json` 不一致。
- 本地没有先运行 `pnpm install` 更新锁文件。
- `pnpm lint` 或 `pnpm type-check` 失败。
- Node 版本和本地不一致。

处理：

```bash
pnpm install
pnpm lint
pnpm type-check
pnpm build
git add package.json pnpm-lock.yaml
git commit -m "fix: update lockfile"
git push
```

### 14.4 刷新页面 404

当前项目如果没有使用前端路由，通常不会遇到这个问题。

如果后续加入 React Router 的 history 路由，GitHub Pages 对 SPA fallback 支持有限，可能需要额外配置 `404.html` 回退到 `index.html`。

## 15. 推荐发布策略

如果只发布源码：

```bash
git init
git add .
git commit -m "feat: initial markdown notes app"
git remote add origin https://github.com/yourname/markdown-notes.git
git branch -M main
git push -u origin main
```

如果同时部署 GitHub Pages：

1. 配置 `vite.config.ts` 的 `base`。
2. 添加 `.github/workflows/deploy.yml`。
3. GitHub 仓库 `Settings → Pages → Source` 选择 `GitHub Actions`。
4. push 到 `main`，等待 Actions 自动部署。

## 16. 安全注意事项

发布到 GitHub 前检查：

- 不要提交 `.env`。
- 不要提交 API Key、Token、密码、服务器 IP 私密信息。
- 不要提交 `node_modules/`。
- 不建议提交 `dist/`，除非明确采用手动静态文件发布方式。
- Public 仓库里的文档不要包含真实服务器账号、密钥、备案信息截图等敏感内容。

可以用以下命令检查当前待提交内容：

```bash
git status
git diff --cached
```

## 17. 与阿里云部署的关系

GitHub 可以作为阿里云 ECS 的源码仓库。

典型流程：

```text
本地开发
  ↓
push 到 GitHub
  ↓
服务器 git pull
  ↓
pnpm build
  ↓
Nginx 托管 dist
```

服务器更新命令参考：

```bash
cd /opt/apps/markdown-notes
git pull
pnpm install
pnpm build
rm -rf /var/www/markdown-notes/*
cp -r dist/* /var/www/markdown-notes/
chown -R www-data:www-data /var/www/markdown-notes
systemctl reload nginx
```

如果想省去服务器，也可以只用 GitHub Pages 部署静态站点。

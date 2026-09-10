# Markdown Notes 服务器部署指南

本文档说明如何将 Markdown Notes 部署到 Linux 服务器。

当前项目是基于 React 19、TypeScript 和 Vite 的纯前端应用。执行生产构建后会生成 `dist/` 目录，服务器只需要使用 Nginx 托管其中的静态文件，不需要让 Node.js 常驻运行。

## 1. 部署架构

```text
用户浏览器
  ↓
域名 / 服务器公网 IP
  ↓
Nginx
  ↓
/var/www/markdown-notes
  ↓
index.html + assets
```

推荐环境：

```text
Ubuntu 22.04/24.04 LTS + Nginx + HTTPS
```

## 2. 部署前须知

### 2.1 数据保存在浏览器中

项目使用 IndexedDB 保存笔记、文件夹、设置和附件。因此：

- 笔记不会自动上传到服务器。
- 不同浏览器、设备和域名之间的数据互不相通。
- 清除浏览器站点数据可能导致笔记丢失。
- 更换网站域名后，原域名下的数据不会自动迁移。
- 建议定期使用应用内的导出或备份功能。

如果需要账号登录、云端同步或多人协作，需要另外开发后端 API、数据库和用户认证系统。

### 2.2 AI 和语音 API

当前 AI 与云端语音功能由浏览器直接请求第三方服务：

- 用户填写的 API Key 保存在浏览器 IndexedDB 中。
- 第三方服务必须允许浏览器跨域请求，否则可能遇到 CORS 错误。
- 不要把公共 API Key 直接写入前端源码。
- 如果多人共用同一个 API Key，应增加服务端代理、身份认证、限流和用量控制。

## 3. 本地检查和构建

在项目根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
```

构建成功后会生成：

```text
dist/
├── index.html
├── assets/
└── ...
```

可以在本地预览生产构建：

```bash
pnpm preview
```

`pnpm preview` 只适合检查构建结果，不建议作为正式生产服务器。

## 4. 准备服务器

以下命令以 Ubuntu 为例，并在服务器上执行。

### 4.1 安装 Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

检查运行状态：

```bash
sudo systemctl status nginx
```

### 4.2 开放端口

云服务器安全组和服务器防火墙需要允许：

| 端口  | 用途  | 建议                |
| ----- | ----- | ------------------- |
| `22`  | SSH   | 仅允许自己的公网 IP |
| `80`  | HTTP  | 允许公网访问        |
| `443` | HTTPS | 允许公网访问        |

如果启用了 UFW，可以执行：

```bash
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable
```

### 4.3 创建部署目录

```bash
sudo mkdir -p /var/www/markdown-notes
sudo chown -R "$USER":"$USER" /var/www/markdown-notes
```

## 5. 上传构建产物

### 5.1 使用 SCP

在本地项目根目录执行：

```bash
scp -r dist/* deploy@服务器IP:/var/www/markdown-notes/
```

将 `deploy` 替换为实际的 SSH 用户名，将 `服务器IP` 替换为服务器公网 IP。

上传后应确保入口文件位于：

```text
/var/www/markdown-notes/index.html
```

不要形成下面这样的多余目录层级：

```text
/var/www/markdown-notes/dist/index.html
```

### 5.2 使用 rsync

如果本地环境支持 `rsync`，推荐执行：

```bash
rsync -avz --delete dist/ deploy@服务器IP:/var/www/markdown-notes/
```

`--delete` 会删除服务器中已经不属于当前构建的旧资源，适合后续持续更新。使用前应确认目标目录填写正确。

## 6. 配置 Nginx

在服务器创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/markdown-notes
```

写入以下配置，并将 `notes.example.com` 替换为实际域名：

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name notes.example.com;

    root /var/www/markdown-notes;
    index index.html;
    charset utf-8;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        application/xml
        image/svg+xml;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/markdown-notes /etc/nginx/sites-enabled/markdown-notes
sudo nginx -t
sudo systemctl reload nginx
```

如果默认站点与当前配置冲突，可以移除默认站点链接：

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

如果暂时没有域名，只使用公网 IP，可以把配置中的 `server_name` 改为：

```nginx
server_name _;
```

然后通过以下地址访问：

```text
http://服务器公网IP
```

## 7. 配置域名

在域名服务商的 DNS 控制台添加 A 记录：

```text
记录类型：A
主机记录：notes
记录值：服务器公网 IP
```

例如域名为 `example.com`，配置完成后访问地址为：

```text
http://notes.example.com
```

如果服务器位于中国大陆并使用域名提供网站服务，通常需要先完成 ICP 备案。

## 8. 配置 HTTPS

安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

申请证书：

```bash
sudo certbot --nginx -d notes.example.com
```

检查自动续期：

```bash
sudo certbot renew --dry-run
```

完成后通过以下地址访问：

```text
https://notes.example.com
```

HTTPS 对剪贴板、语音和其他需要安全上下文的浏览器功能非常重要。

## 9. 后续更新

每次代码更新后，在本地重新执行：

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
```

然后同步新的构建结果：

```bash
rsync -avz --delete dist/ deploy@服务器IP:/var/www/markdown-notes/
```

静态文件更新后通常不需要重启 Nginx。

如果修改了 Nginx 配置，则需要执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 10. 在服务器上直接构建

也可以把源码放到服务器，然后在服务器中构建：

```bash
sudo mkdir -p /opt/apps
sudo chown -R "$USER":"$USER" /opt/apps
git clone 你的仓库地址 /opt/apps/markdown-notes
cd /opt/apps/markdown-notes
corepack enable
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
sudo rsync -a --delete dist/ /var/www/markdown-notes/
```

后续更新：

```bash
cd /opt/apps/markdown-notes
git pull
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
sudo rsync -a --delete dist/ /var/www/markdown-notes/
```

纯前端项目更推荐在本地或 CI 中构建，只将 `dist/` 发布到服务器。这样可以减少服务器上的依赖和维护成本。

## 11. 部署到子路径

当前 `vite.config.ts` 没有配置 `base`，默认适合部署到域名根路径：

```text
https://notes.example.com/
```

如果需要部署到：

```text
https://example.com/notes/
```

需要在 `vite.config.ts` 中添加：

```ts
export default defineConfig({
  base: "/notes/",
  // 其他配置
});
```

同时需要调整 Nginx 的 `/notes/` 路径配置。否则构建产物可能从 `/assets/` 加载资源，从而出现资源 404。

## 12. 使用静态托管平台

由于项目是纯静态前端，也可以部署到以下平台：

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

通用构建配置：

```text
Install command: pnpm install --frozen-lockfile
Build command: pnpm build
Output directory: dist
```

使用静态托管平台通常不需要自行安装 Nginx、申请证书或维护服务器，并且可以在 Git 推送后自动发布。

## 13. 常见问题

### 13.1 页面显示 403 Forbidden

检查目录和文件权限：

```bash
sudo chmod -R 755 /var/www/markdown-notes
sudo nginx -t
sudo systemctl reload nginx
```

### 13.2 页面可以打开，但静态资源返回 404

确认以下文件存在：

```text
/var/www/markdown-notes/index.html
/var/www/markdown-notes/assets/
```

同时确认没有把整个 `dist` 目录上传成 `/var/www/markdown-notes/dist/`。

### 13.3 刷新页面后出现 404

确认 Nginx 的 `location /` 中包含：

```nginx
try_files $uri $uri/ /index.html;
```

虽然当前项目没有使用前端路由库，但保留该配置可以兼容后续增加客户端路由。

### 13.4 AI 功能请求失败

可能原因：

- API Key 无效或没有余额。
- 第三方 API 不允许浏览器跨域访问。
- 网站使用 HTTPS，但自定义 API 地址仍然使用 HTTP。
- 服务器或用户网络无法访问对应的第三方服务。

如果第三方服务不支持浏览器直连，需要增加后端 API 代理。

### 13.5 更换域名后看不到原来的笔记

这是浏览器同源隔离导致的正常现象。IndexedDB 数据与域名绑定，更换域名相当于进入了一个新的站点存储空间。更换前应先导出数据，然后在新域名下恢复。

## 14. 部署检查清单

- [ ] `pnpm type-check` 执行成功
- [ ] `pnpm lint` 执行成功
- [ ] `pnpm build` 执行成功
- [ ] 服务器已开放 `80` 和 `443` 端口
- [ ] `dist/` 内容已上传到 `/var/www/markdown-notes/`
- [ ] `/var/www/markdown-notes/index.html` 存在
- [ ] `sudo nginx -t` 检查通过
- [ ] 域名 A 记录已指向服务器公网 IP
- [ ] HTTPS 证书已成功签发
- [ ] 桌面端和移动端均能正常访问
- [ ] 新建、编辑、刷新后读取笔记正常
- [ ] 已验证数据导出和恢复功能

## 15. 方案建议

- 个人使用或项目演示：直接使用 Nginx 静态部署即可。
- 希望免运维：优先选择 Cloudflare Pages、Vercel 或 Netlify。
- 需要国内大陆服务器和域名：提前处理 ICP 备案。
- 需要多设备同步或多人使用：增加后端、数据库、认证与同步机制。
- 需要多人共用 AI 功能：通过后端代理保管 API Key，不要将公共 Key 暴露在前端。

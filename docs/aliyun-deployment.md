# 阿里云服务器购买与部署指南

本文档说明如何将当前 Markdown Notes 项目部署到阿里云 ECS 服务器。

当前项目是 React + TypeScript + Vite 前端项目，生产构建后会生成 `dist/` 目录。部署时只需要用 Nginx 托管静态文件，不需要 Node.js 常驻运行。

## 1. 部署架构

```text
用户浏览器
  ↓
域名 / 服务器公网 IP
  ↓
阿里云 ECS
  ↓
Nginx
  ↓
/var/www/markdown-notes
  ↓
index.html + assets
```

推荐方案：

```text
阿里云 ECS + Ubuntu 22.04 + Nginx + HTTPS
```

## 2. 购买阿里云 ECS 服务器

### 2.1 进入控制台

打开阿里云官网并登录：

```text
https://www.aliyun.com/
```

进入：

```text
控制台 → 云服务器 ECS → 实例 → 创建实例
```

如果是首次使用，阿里云可能要求完成实名认证。

### 2.2 推荐购买配置

个人项目或演示项目推荐：

| 配置项   | 推荐值                                                |
| -------- | ----------------------------------------------------- |
| 付费方式 | 按量付费或包年包月                                    |
| 地域     | 华东 1 杭州、华北 2 北京、华南 1 深圳等离用户近的区域 |
| 实例规格 | 1 核 1G 起步，推荐 2 核 2G                            |
| 操作系统 | Ubuntu 22.04 LTS                                      |
| 系统盘   | 40GB ESSD 云盘                                        |
| 公网带宽 | 1Mbps 起步，推荐 3Mbps                                |
| 网络     | 默认专有网络 VPC 即可                                 |
| 登录方式 | 推荐密钥对，也可以使用密码                            |
| 实例名称 | `markdown-notes-server`                               |

如果只是自己使用：

```text
1 核 1G / 1 核 2G 基本够用
```

如果希望长期稳定运行：

```text
2 核 2G + 3Mbps 带宽
```

## 3. 配置安全组

ECS 创建完成后，进入实例绑定的安全组，开放以下入方向端口：

| 端口 | 用途       | 授权对象                                |
| ---- | ---------- | --------------------------------------- |
| 22   | SSH 登录   | 推荐你的公网 IP，或临时使用 `0.0.0.0/0` |
| 80   | HTTP 访问  | `0.0.0.0/0`                             |
| 443  | HTTPS 访问 | `0.0.0.0/0`                             |

建议：

- `22` 端口尽量限制为自己的公网 IP。
- `80` 和 `443` 必须公开，否则网站无法被访问。

安全组规则示例：

```text
入方向
协议：TCP
端口范围：22/22
授权对象：你的公网 IP/32

入方向
协议：TCP
端口范围：80/80
授权对象：0.0.0.0/0

入方向
协议：TCP
端口范围：443/443
授权对象：0.0.0.0/0
```

## 4. 域名准备（可选但推荐）

如果只是测试，可以直接用服务器公网 IP 访问：

```text
http://你的服务器公网IP
```

如果要正式使用，建议购买域名并绑定 HTTPS。

### 4.1 购买域名

进入：

```text
阿里云控制台 → 域名与网站 → 域名注册
```

例如购买：

```text
example.com
```

### 4.2 ICP 备案说明

如果 ECS 地域在中国大陆，并且要绑定域名访问，通常需要 ICP 备案。

如果不想备案，可以选择：

- 阿里云香港地域
- 新加坡地域
- 其他非中国大陆地域

但非大陆地域访问速度可能略慢。

### 4.3 添加 DNS 解析

进入：

```text
云解析 DNS → 域名解析 → 添加记录
```

根域名解析：

```text
记录类型：A
主机记录：@
记录值：你的 ECS 公网 IP
TTL：默认
```

`www` 子域名解析：

```text
记录类型：A
主机记录：www
记录值：你的 ECS 公网 IP
TTL：默认
```

## 5. 连接服务器

本地终端执行：

```bash
ssh root@你的服务器公网IP
```

如果使用密钥：

```bash
ssh -i 你的密钥.pem root@你的服务器公网IP
```

首次连接如果提示：

```text
Are you sure you want to continue connecting?
```

输入：

```bash
yes
```

## 6. 初始化服务器环境

以下命令都在服务器上执行。

### 6.1 更新系统

```bash
apt update
apt upgrade -y
```

### 6.2 安装基础工具和 Nginx

```bash
apt install -y curl wget git unzip nginx
```

### 6.3 启动 Nginx

```bash
systemctl enable nginx
systemctl start nginx
systemctl status nginx
```

如果看到：

```text
active (running)
```

说明 Nginx 已正常运行。

此时浏览器访问：

```text
http://你的服务器公网IP
```

应该能看到 Nginx 默认欢迎页。

## 7. 安装 Node.js 和 pnpm

如果准备在服务器上直接拉取源码并编译，需要安装 Node.js 和 pnpm。

如果你只想本地编译后上传 `dist/`，服务器可以不安装 Node.js。

### 7.1 安装 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

检查版本：

```bash
node -v
npm -v
```

### 7.2 安装 pnpm

```bash
npm install -g pnpm
```

检查版本：

```bash
pnpm -v
```

## 8. 获取项目代码

可以选择服务器拉取代码，或本地编译后上传。

### 8.1 方式 A：服务器直接拉 Git 仓库（推荐）

如果项目已经推送到 GitHub、Gitee 或阿里云 Codeup：

```bash
mkdir -p /opt/apps
cd /opt/apps
git clone 你的仓库地址 markdown-notes
cd markdown-notes
```

示例：

```bash
git clone https://github.com/yourname/markdown-notes.git markdown-notes
cd markdown-notes
```

安装依赖：

```bash
pnpm install
```

编译项目：

```bash
pnpm build
```

编译成功后会生成：

```text
dist/
```

### 8.2 方式 B：本地编译后上传 dist

在本地项目目录执行：

```bash
pnpm install
pnpm build
```

然后上传 `dist/` 到服务器：

```bash
scp -r dist root@你的服务器公网IP:/var/www/markdown-notes
```

这种方式下，服务器不需要安装 Node.js，只需要 Nginx。

## 9. 部署 dist 到 Nginx 目录

推荐网站目录：

```text
/var/www/markdown-notes
```

如果是在服务器上编译，执行：

```bash
mkdir -p /var/www/markdown-notes
rm -rf /var/www/markdown-notes/*
cp -r /opt/apps/markdown-notes/dist/* /var/www/markdown-notes/
```

设置目录权限：

```bash
chown -R www-data:www-data /var/www/markdown-notes
chmod -R 755 /var/www/markdown-notes
```

## 10. 配置 Nginx

创建 Nginx 站点配置：

```bash
nano /etc/nginx/sites-available/markdown-notes
```

### 10.1 使用服务器 IP 访问

如果暂时没有域名，写入：

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/markdown-notes;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        try_files $uri =404;
    }
}
```

### 10.2 使用域名访问

如果域名是：

```text
notes.example.com
```

则写入：

```nginx
server {
    listen 80;
    server_name notes.example.com;

    root /var/www/markdown-notes;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        try_files $uri =404;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/markdown-notes /etc/nginx/sites-enabled/markdown-notes
```

删除默认站点配置（可选）：

```bash
rm -f /etc/nginx/sites-enabled/default
```

检查 Nginx 配置：

```bash
nginx -t
```

如果输出类似：

```text
syntax is ok
test is successful
```

重载 Nginx：

```bash
systemctl reload nginx
```

此时可以访问：

```text
http://你的服务器公网IP
```

或：

```text
http://你的域名
```

## 11. 配置 HTTPS

推荐使用 Let's Encrypt 免费证书。

### 11.1 安装 Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 11.2 申请证书

假设域名是：

```text
notes.example.com
```

执行：

```bash
certbot --nginx -d notes.example.com
```

如果同时绑定根域名和 `www`：

```bash
certbot --nginx -d example.com -d www.example.com
```

过程中会要求输入邮箱并同意协议。

如果询问是否自动跳转 HTTPS，选择 redirect。

完成后访问：

```text
https://notes.example.com
```

### 11.3 检查自动续签

Let's Encrypt 证书有效期为 90 天，Certbot 通常会自动安装续签任务。

检查定时任务：

```bash
systemctl list-timers | grep certbot
```

手动测试续签：

```bash
certbot renew --dry-run
```

## 12. 后续更新部署

如果使用 Git 部署，每次更新代码后执行：

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

可以创建部署脚本：

```bash
nano /opt/apps/deploy-markdown-notes.sh
```

写入：

```bash
#!/usr/bin/env bash
set -e

cd /opt/apps/markdown-notes
git pull
pnpm install
pnpm build
rm -rf /var/www/markdown-notes/*
cp -r dist/* /var/www/markdown-notes/
chown -R www-data:www-data /var/www/markdown-notes
systemctl reload nginx
```

增加执行权限：

```bash
chmod +x /opt/apps/deploy-markdown-notes.sh
```

以后更新时执行：

```bash
/opt/apps/deploy-markdown-notes.sh
```

## 13. 推荐服务器目录结构

```text
/opt/apps/markdown-notes           # 源码目录
/var/www/markdown-notes            # Nginx 静态站点目录
/etc/nginx/sites-available/...     # Nginx 配置目录
/etc/nginx/sites-enabled/...       # Nginx 启用配置目录
```

## 14. 防火墙检查

阿里云安全组开放端口后，如果服务器内部防火墙也启用了，需要放行端口。

检查 UFW 状态：

```bash
ufw status
```

如果是 inactive，可以不用处理。

如果是 active，执行：

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw reload
```

## 15. 常见问题

### 15.1 访问 IP 显示 Nginx 默认页

原因：默认站点配置仍然启用。

处理：

```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 15.2 访问出现 403 Forbidden

通常是目录权限问题。

处理：

```bash
chown -R www-data:www-data /var/www/markdown-notes
chmod -R 755 /var/www/markdown-notes
```

### 15.3 刷新页面出现 404

React/Vite 单页应用需要将路由回退到 `index.html`。

确认 Nginx 配置里有：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 15.4 域名访问不了

检查域名是否解析到 ECS 公网 IP：

```bash
ping 你的域名
```

同时确认安全组开放了：

```text
80
443
```

### 15.5 HTTPS 申请失败

常见原因：

- 域名没有解析到服务器公网 IP。
- 80 端口没有开放。
- Nginx 配置错误。
- 服务器在中国大陆地域，但域名未备案。

## 16. 当前项目常用命令

本地开发：

```bash
pnpm dev --host 127.0.0.1
```

生产编译：

```bash
pnpm build
```

代码检查：

```bash
pnpm lint
```

类型检查：

```bash
pnpm type-check
```

生产预览：

```bash
pnpm preview
```

## 17. 最小部署命令汇总

服务器源码目录编译：

```bash
cd /opt/apps/markdown-notes
pnpm install
pnpm build
```

部署到 Nginx：

```bash
rm -rf /var/www/markdown-notes/*
cp -r dist/* /var/www/markdown-notes/
chown -R www-data:www-data /var/www/markdown-notes
systemctl reload nginx
```

Nginx 核心配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/markdown-notes;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 18. 替代部署方案

如果只是部署静态前端，也可以不购买 ECS，选择静态托管平台：

- 阿里云 OSS + CDN
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

当前项目是纯前端静态应用，最简单的部署逻辑是：

```text
pnpm build → 上传 dist → 静态托管
```

如果未来还要加后端 API、数据库、文件服务，则 ECS + Nginx 更通用。

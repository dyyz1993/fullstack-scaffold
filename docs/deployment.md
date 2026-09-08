# Production Deployment Guide

Scaffold a fullstack app and deploy it to Node.js (VPS/VM), Docker, or Cloudflare Workers.

---

## 1. Node.js Deployment (Recommended for VPS/VM)

适合拥有 VPS 或独立服务器的场景，支持 WebSocket、SSE、SQLite/MySQL 全部功能。

### Prerequisites

- Node.js 20+
- npm 9+
- (Optional) PM2 for process management
- (Optional) Nginx for reverse proxy + HTTPS

### Step-by-Step

```bash
# 1. Scaffold project
npx create-fullstack-scaffold@latest my-app --preset todo-app
cd my-app

# 2. Install dependencies
npm install

# 3. Apply patches (Hono type extensions)
npx patch-package

# 4. Build for production
npm run build

# 5. Start directly
npm start
# -> NODE_ENV=production node dist/server/node.js
```

### PM2 Process Manager

安装 PM2 并使用 ecosystem 配置文件管理进程：

```bash
npm install -g pm2
```

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'my-app',
      script: 'dist/server/node.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      // Auto-restart on crash
      max_restarts: 10,
      restart_delay: 3000,
      // Log configuration
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Health check
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
}
```

```bash
# Start
pm2 start ecosystem.config.js

# Useful commands
pm2 status          # View all processes
pm2 logs my-app     # View logs
pm2 restart my-app  # Restart
pm2 stop my-app     # Stop
pm2 delete my-app   # Remove

# Auto-start on server boot
pm2 startup
pm2 save
```

### Environment Variables (.env.production)

应用会自动加载 `.env.production` 文件（生产环境）。将以下文件放在项目根目录：

```bash
# .env.production

# Server
NODE_ENV=production
PORT=3010

# Database
DB_DRIVER=sqlite
SQLITE_PATH=./data/production.db

# For MySQL instead of SQLite:
# DB_DRIVER=mysql
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=app_user
# MYSQL_PASSWORD=your_secure_password
# MYSQL_DATABASE=app_production

# API Documentation (set to 'false' to disable Swagger UI)
ENABLE_DOCS=false
```

### Nginx Reverse Proxy

以下配置支持 HTTPS、WebSocket 升级和 SSE 长连接：

```nginx
upstream app_backend {
    server 127.0.0.1:3010;
    keepalive 64;
}

server {
    listen 80;
    server_name todo.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name todo.example.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/todo.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/todo.example.com/privkey.pem;

    # SSL hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Static assets - cache aggressively
    location /assets/ {
        proxy_pass http://app_backend;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SSE streams - disable buffering
    location ~ /stream$ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        chunked_transfer_encoding off;
    }

    # WebSocket upgrade
    location ~ /ws$ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
    }

    # API and all other requests
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';
    }
}
```

```bash
# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 2. Docker Deployment

适合容器化部署，支持 Docker Compose 编排。

### Dockerfile (Multi-Stage Build)

项目已包含 `Dockerfile`，可直接使用。以下为参考内容：

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV VITE_API_URL=/api
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p data && chown -R appuser:nodejs data

USER appuser
EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: my-app
    restart: unless-stopped
    ports:
      - '3010:3010'
    environment:
      - NODE_ENV=production
      - PORT=3010
      - DB_DRIVER=sqlite
      - SQLITE_PATH=./data/production.db
      # - DB_DRIVER=mysql
      # - MYSQL_HOST=mysql
      # - MYSQL_PORT=3306
      # - MYSQL_USER=app_user
      # - MYSQL_PASSWORD=${MYSQL_PASSWORD}
      # - MYSQL_DATABASE=app_production
    volumes:
      - app-data:/app/data
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('http').get('http://localhost:3010/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
        ]
      interval: 30s
      timeout: 3s
      start_period: 40s
      retries: 3

  # Optional: MySQL database
  # mysql:
  #   image: mysql:8.0
  #   container_name: my-app-mysql
  #   restart: unless-stopped
  #   environment:
  #     MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
  #     MYSQL_DATABASE: app_production
  #     MYSQL_USER: app_user
  #     MYSQL_PASSWORD: ${MYSQL_PASSWORD}
  #   volumes:
  #     - mysql-data:/var/lib/mysql
  #   ports:
  #     - '3306:3306'

volumes:
  app-data:
    driver: local
  # mysql-data:
  #   driver: local
```

### Docker Commands

```bash
# Build image
docker build -t my-app .

# Run standalone
docker run -d \
  --name my-app \
  -p 3010:3010 \
  -v my-app-data:/app/data \
  --restart unless-stopped \
  my-app

# Or use Docker Compose
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down

# Rebuild after code changes
docker compose up -d --build
```

---

## 3. Cloudflare Workers Deployment

适合边缘计算场景，使用 D1 数据库和 Durable Objects 实现实时通信。

### Prerequisites

- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)
- Authenticated Wrangler (`wrangler login`)

### wrangler.toml

项目 `template/wrangler.toml` 已包含完整配置。以下为模板：

```toml
name = "my-app"
main = "dist/cloudflare/cloudflare.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"
ENABLE_DOCS = "false"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "YOUR_DATABASE_ID"  # Run: wrangler d1 create my-app-db

# Durable Objects for WebSocket/SSE
[[durable_objects.bindings]]
name = "REALTIME_DO"
class_name = "RealtimeDurableObject"

# Migrations (run once per deployment)
[[migrations]]
tag = "v1"
new_sqlite_classes = ["RealtimeDurableObject"]

# Static assets (built frontend)
[assets]
directory = "./dist/client"
binding = "ASSETS"
not_found_handling = "single-page-navigation"

# Local dev settings
[dev]
port = 8787
local_protocol = "http"
```

### D1 Database Setup

```bash
# Create D1 database
wrangler d1 create my-app-db

# Copy the database_id from output to wrangler.toml

# Run migrations (if you have SQL migration files)
wrangler d1 execute my-app-db --file=./migrations/0001_init.sql

# Or execute SQL directly
wrangler d1 execute my-app-db --command "SELECT 1"
```

### Deploy Commands

```bash
# Build for Cloudflare
npm run build:cloudflare

# Deploy to Cloudflare Workers
npm run deploy:cf

# Or step by step
npm run build:cloudflare && npx wrangler deploy

# View deployment info
wrangler deployments list

# View real-time logs
wrangler tail
```

### Durable Object Migrations

Durable Objects 使用 SQLite 存储，需要在 `wrangler.toml` 中声明迁移：

```toml
# First deployment - create new class
[[migrations]]
tag = "v1"
new_sqlite_classes = ["RealtimeDurableObject"]

# Subsequent deployments - rename if needed
# [[migrations]]
# tag = "v2"
# renamed_classes = [{ from = "OldClassName", to = "RealtimeDurableObject" }]
```

每次修改 Durable Object 类名时，必须添加新的迁移 tag。tag 值递增且不可重复。

### Cloudflare Limitations

| Feature      | Node.js      | Cloudflare Workers         |
| ------------ | ------------ | -------------------------- |
| WebSocket    | Full support | Via Durable Objects only   |
| SSE          | Full support | Via Durable Objects only   |
| SQLite       | Local file   | D1 (remote)                |
| File Upload  | Local disk   | R2 or external storage     |
| Request Size | Unlimited    | 100MB (paid), 100KB (free) |
| CPU Time     | Unlimited    | 30s (paid), 10ms (free)    |

---

## 4. Port and Domain Planning

多个 preset 实例部署在同一台服务器时，建议使用不同端口和子域名：

| Preset                 | Recommended Port | Subdomain           | Description    |
| ---------------------- | ---------------- | ------------------- | -------------- |
| `todo-app`             | 3011             | todo.example.com    | 简单待办应用   |
| `minimal`              | 3013             | minimal.example.com | 最小化模板     |
| `ecommerce`            | 3014             | shop.example.com    | 电商商店       |
| `xbrowser-marketplace` | 3015             | plugin.example.com  | 插件市场       |
| `fullstack-admin`      | 3016             | admin.example.com   | 全功能管理平台 |
| `forum`                | 3018             | forum.example.com   | 社区论坛       |
| `saas`                 | 3020             | saas.example.com    | 多租户 SaaS    |

端口通过环境变量 `PORT` 或 `.env.production` 中的 `PORT=3011` 配置。

---

## 5. Health Check

### Endpoint

应用内置 `/health` 健康检查端点（定义在 `app.ts` 中）：

```bash
curl http://localhost:3010/health
```

返回示例：

```json
{
  "status": "ok",
  "db": "connected"
}
```

当数据库不可用时，`db` 字段返回 `"not configured"`。

### Monitoring Setup

**PM2 Metrics：**

```bash
pm2 monit          # Real-time CPU/Memory
pm2 info my-app    # Process details
```

**Uptime Monitoring (外部)：**

使用外部服务（如 UptimeRobot、Better Stack）监控 `/health` 端点：

- Check interval: 60 seconds
- Timeout: 5 seconds
- Expected status: 200
- Keyword (optional): `"status":"ok"`

**Docker Health Check：**

Dockerfile 已内置 HEALTHCHECK，可通过以下命令查看状态：

```bash
docker inspect --format='{{.State.Health.Status}}' my-app
```

**Cloudflare Workers：**

在 Cloudflare Dashboard 中设置 Health Check：

```bash
# Or via Wrangler
wrangler deployments list
wrangler tail  # Real-time logs
```

---

## 6. SSL/TLS Configuration

### Let's Encrypt (Production)

使用 certbot 自动获取和续期 SSL 证书：

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (Nginx)
sudo certbot --nginx -d todo.example.com

# Auto-renewal (certbot installs a cron job automatically)
sudo certbot renew --dry-run
```

Certbot 会自动修改 Nginx 配置，添加 SSL 证书路径并设置 HTTP 到 HTTPS 重定向。

### Self-Signed Certificates (Development)

仅用于本地开发测试，浏览器会显示安全警告：

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./certs/key.pem \
  -out ./certs/cert.pem \
  -subj "/CN=localhost"

# Use with Nginx (dev config)
# ssl_certificate     ./certs/cert.pem;
# ssl_certificate_key ./certs/key.pem;
```

### Cloudflare SSL

Cloudflare Workers 自带 SSL，无需额外配置。如使用自定义域名：

1. 在 Cloudflare Dashboard 添加域名
2. DNS 记录指向 Workers（自动代理）
3. SSL/TLS 设置选择 "Full (strict)"

---

## Quick Reference

| Task               | Command                                                         |
| ------------------ | --------------------------------------------------------------- |
| Scaffold project   | `npx create-fullstack-scaffold@latest my-app --preset todo-app` |
| Install + build    | `npm install && npm run build`                                  |
| Start (production) | `npm start`                                                     |
| Start with PM2     | `pm2 start ecosystem.config.js`                                 |
| Docker build + run | `docker compose up -d --build`                                  |
| Cloudflare deploy  | `npm run deploy:cf`                                             |
| Health check       | `curl http://localhost:3010/health`                             |
| View PM2 logs      | `pm2 logs my-app`                                               |
| View Docker logs   | `docker compose logs -f app`                                    |

# 预渲染方案实施计划

## 目标
在现有 SPA 模板中实现预渲染，让内容页面能被搜索引擎收录。

## 推荐工具

| 工具 | 用途 | 版本 |
|------|------|------|
| react-helmet-async | 页面 meta/OG 标签管理 | ^3.0.0 |
| vite-plugin-prerender | 构建时预渲染 HTML | ^1.0.8 |
| @prerenderer/rollup-plugin | 备选预渲染工具（更活跃） | ^0.3.12 |

> 注：vite-plugin-prerender 已停更近 4 年，如果遇到兼容问题，切换到 @prerenderer/rollup-plugin

## 阶段一：基础设施（2-3小时）

### 1.1 安装依赖
```bash
npm install react-helmet-async
npm install -D vite-plugin-prerender
```

### 1.2 修改文件清单
| 文件 | 改动 |
|------|------|
| `src/client/main.tsx` | 包裹 HelmetProvider |
| `index.html` | 添加默认 SEO meta 标签 |
| `vite.config.ts` | 添加 vite-plugin-prerender 配置 |
| `src/client/pages/*.tsx` | 各页面添加 Helmet meta |

### 1.3 vite.config.ts 预渲染配置
```typescript
vitePrerender({
  staticDir: path.join(__dirname, 'dist/client'),
  routes: ['/', '/todos', '/notifications', '/websocket'],
  rendererOptions: {
    renderAfterDocumentEvent: 'prerender-ready',
    renderAfterTime: 3000,
  },
})
```

### 1.4 验证
- `npm run build` 成功
- `dist/client/todos/index.html` 等预渲染文件生成
- 预渲染 HTML 包含正确的 meta 标签

---

## 阶段二：Content 公开 API（3-4小时）

### 2.1 新增文件
| 文件 | 说明 |
|------|------|
| `src/server/module-content/routes/public-content-routes.ts` | 公开内容 API 路由 |

### 2.2 修改文件
| 文件 | 改动 |
|------|------|
| `src/server/module-content/services/content-service.ts` | 新增 getPublishedContents / getPublishedContentById |
| `src/server/route-registry.ts` | 注册公开路由到 clientApiRoutes |
| `src/server/module-content/module.ts` | 添加 client routes 声明 |

### 2.3 API 端点设计
```
GET /api/public/contents          → 列表（仅 published 状态）
GET /api/public/contents/:id      → 详情（仅 published 状态）
```

### 2.4 验证
- 启动服务后 curl 公开 API 返回 published 内容
- 无需 token 即可访问
- 不返回 draft/archived 状态的内容

---

## 阶段三：客户端内容展示页面（4-5小时）

### 3.1 新增文件
| 文件 | 说明 |
|------|------|
| `src/client/pages/ContentListPage.tsx` | 内容列表页（含 SEO Helmet） |
| `src/client/pages/ContentDetailPage.tsx` | 内容详情页（SEO 重点） |

### 3.2 修改文件
| 文件 | 改动 |
|------|------|
| `src/client/App.tsx` | 添加 /content 和 /content/:id 路由 |
| `src/client/components/Navigation.tsx` | 添加 Content 导航项 |

### 3.3 SEO Meta 设计（ContentDetailPage）
```tsx
<Helmet>
  <title>{content.title} - Biomimic App</title>
  <meta name="description" content={content.excerpt || content.body.slice(0, 160)} />
  <meta property="og:title" content={content.title} />
  <meta property="og:description" content={content.excerpt} />
  <meta property="og:type" content="article" />
  <meta property="article:published_time" content={content.publishedAt} />
  <meta property="article:author" content={content.author} />
  {content.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}
</Helmet>
```

### 3.4 验证
- 访问 /content 显示已发布内容列表
- 访问 /content/:id 显示内容详情
- 页面 meta 标签正确

---

## 阶段四：动态路由预渲染（2-3小时）

### 4.1 动态路由配置
```typescript
vitePrerender({
  routes: async () => {
    // 构建时请求 API 获取已发布内容列表
    const res = await fetch('http://localhost:3010/api/public/contents?limit=100')
    const { data } = await res.json()
    const contentRoutes = data.map(c => `/content/${c.id}`)
    return ['/', '/todos', '/notifications', '/websocket', '/content', ...contentRoutes]
  },
})
```

### 4.2 构建流程变化
预渲染动态路由需要先启动 API 服务：
```bash
# 新的构建流程
npm run build:client   # 先构建 client
npm run build:server   # 构建 server
node dist/server/node.js &  # 启动 API 服务
sleep 3                         # 等待服务就绪
npx vite-prerender              # 运行预渲染（使用已构建的 client）
kill %1                         # 关闭 API 服务
```

### 4.3 验证
- 构建完成后 `dist/client/content/` 目录下有预渲染的 HTML
- 每个 HTML 文件包含完整的 meta 标签和内容文本

---

## 远期方案：Astro 集成

当预渲染方案无法满足需求时（如内容更新频繁、需要 ISR、内容量大），可考虑迁移到 Astro。

### 推荐架构
```
Astro Content Site (SSG/SSR)  ←→  Hono API Server
  ├── 静态内容页面（SEO）           ├── /api/public/* (公开)
  ├── React Islands (交互)         ├── /api/admin/* (管理)
  └── Content Collections          └── WebSocket/SSE
```

### Astro 集成工作量
- 阶段 1：Content 模块增强（1-2 天）
- 阶段 2：Astro 项目初始化（1-2 天）
- 阶段 3：Islands 交互（1 天）
- 阶段 4：构建部署集成（1-2 天）
- **总计：4-7 天**

### 关键注意事项
1. Astro 与 Hono 独立部署（推荐 Cloudflare Pages + Workers）
2. 公开 API 需要处理 CORS
3. Hono RPC 类型安全在 Astro 端无法直接使用
4. 优先使用 SSG 模式减少 CF Workers 包大小

---

## 风险记录

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| vite-plugin-prerender 停更 | 高 | 备选 @prerenderer/rollup-plugin |
| Puppeteer CI 依赖 | 中 | 配置 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD |
| 动态路由预渲染需启动服务 | 中 | 自定义构建脚本 |
| CF Workers 静态资源兼容 | 低 | 测试 wrangler deploy |

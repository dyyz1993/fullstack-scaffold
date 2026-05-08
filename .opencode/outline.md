# 项目大纲

## 会话信息
- **会话ID**: session-2026-05-08
- **创建时间**: 2026-05-08
- **最后更新**: 2026-05-08

## 用户需求记录

### 2026-05-08
- 调研模板是否支持做网站、SEO、SSR
- 确认内容型网站/博客是确实存在的场景
- 先做预渲染方案（低成本），后续再考虑 Astro 集成
- 当前阶段：先做规划，不急着实施

## 技术栈调研结论

### 当前架构
- **渲染模式**: 纯客户端 SPA（createRoot + BrowserRouter）
- **前端**: React 18 + react-router-dom v7 + Vite 6
- **后端**: Hono + Drizzle ORM (SQLite)
- **部署**: Node.js + Cloudflare Workers 双目标
- **SEO 能力**: 几乎为零，无 meta 管理、无 SSR、无预渲染

### Content 模块现状
- 有完整的数据库模型（title, body, excerpt, category, tags, status, author 等）
- 有管理后台 CRUD API（全部需要认证）
- **没有公开 API 端点**（所有路由在 admin 下）
- **没有客户端展示页面**
- **没有 SEO 字段**（slug, metaDescription, ogImage 缺失）

## 任务分解

### 预渲染方案（近期）
1. 阶段一：基础设施（react-helmet-async + vite-plugin-prerender）
2. 阶段二：Content 公开 API（无需认证的读取端点）
3. 阶段三：客户端内容展示页面
4. 阶段四：动态路由预渲染

### Astro 集成方案（远期）
- Astro 作为内容层 + Hono 保持 API 层
- Astro Islands 模式复用 React 交互组件
- 详见 plan.md

## 关键决策

### 2026-05-08
- **决策**: 先做预渲染而非直接上 Astro
  - 理由：低成本验证 SEO 需求，对现有架构影响最小
  - 预渲染工作量：1.5-2 天
  - Astro 集成工作量：4-7 天

## 进度跟踪
- [ ] 预渲染方案规划（完成调研）
- [ ] 预渲染方案实施
- [ ] Astro 集成方案评估

## 技术栈
- React 18.3.1 + react-router-dom 7.13.1
- Hono 4.12.16
- Vite 6.2.3
- Drizzle ORM + SQLite
- Cloudflare Workers + D1

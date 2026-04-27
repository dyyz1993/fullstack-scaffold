# create-biomimic-app

组合式全栈项目生成器 — 通过交互式选择，按需生成 React + Hono + TypeScript 全栈应用。

## 快速开始

```bash
# 本地开发
npm install
npx tsx src/index.ts my-app

# 发布后
npx create-biomimic-app my-app
```

**要求**: Node.js 18+

## 交互式选择流程

运行后会进入 5 步交互式配置：

```
Step 1/5: 选择前端通道
  □ 1. Web     — React SPA 前端
  □ 2. Ops     — 运营管理后台 (Ant Design)
  □ 3. CLI     — 命令行工具
  □ 4. Mobile  — 移动端 (API 模式，无模板代码)
  □ 5. MiniApp — 小程序 (API 模式，无模板代码)

Step 2/5: 是否需要后端服务? [Y/n]

Step 3/5: 选择后端模块
  📦 基础功能
    □ todos          待办事项
    □ notifications  通知推送 (SSE)
  🤖 AI
    □ agent          AI Agent
  🔒 安全
    □ permission     权限管理
    □ captcha        验证码
  🛠️ 运营后台
    ■ ops            运营后台 (必选)
    ■ permission     权限管理 (必选)
    □ order          订单管理
    □ ticket         工单系统
    □ dispute        争议处理
    □ content        内容管理
  🏢 多租户
    □ tenant         多租户

Step 4/5: 部署方式
  1. Node.js
  2. Cloudflare Workers

Step 5/5: 数据库
  1. SQLite  — 零配置
  2. MySQL   — 生产级

预览 → 确认 → 创建
```

## 15 种常见场景

| 场景            | 前端通道           | 后端 | 模块                                   | 部署 | 数据库 |
| --------------- | ------------------ | ---- | -------------------------------------- | ---- | ------ |
| 个人博客        | Web                | 有   | content, file                          | Node | SQLite |
| SaaS 全栈产品   | Web+Mobile+MiniApp | 有   | 全部                                   | Node | MySQL  |
| 内部 CLI 工具   | CLI                | 有   | file, todos                            | Node | SQLite |
| 纯 API 服务     | Mobile+MiniApp     | 有   | todos, chat, notifications             | Node | MySQL  |
| 运营管理平台    | Ops                | 有   | permission, ops, content, order        | Node | MySQL  |
| 静态展示站      | Web                | 无   | —                                      | —    | —      |
| Serverless API  | Mobile+MiniApp     | 有   | todos, notifications                   | CF   | D1     |
| 客服系统        | Web+Ops            | 有   | chat, ticket, permission, ops          | Node | MySQL  |
| AI Agent 平台   | Web+CLI            | 有   | agent, todos, file                     | Node | SQLite |
| 多租户平台      | Web+Ops            | 有   | tenant, permission, ops, todos         | Node | MySQL  |
| 电商后端        | Mobile+MiniApp+Web | 有   | order, dispute, file, captcha          | Node | MySQL  |
| 内容管理+CLI    | Web+CLI            | 有   | content, file, notifications           | Node | SQLite |
| 工单系统        | Web+Ops            | 有   | ticket, permission, ops, notifications | Node | MySQL  |
| Cloudflare 全栈 | Web+Ops            | 有   | todos, file, permission, ops           | CF   | D1     |
| 功能网站+CLI    | Web+CLI            | 有   | todos, chat                            | Node | SQLite |

## 约束规则

| 规则                                | 说明                        |
| ----------------------------------- | --------------------------- |
| Ops → 必须选 permission             | 运营后台依赖权限系统        |
| CLI / Mobile / MiniApp → 必须有后端 | 这些通道依赖 API            |
| 无后端 → 只能选 Web                 | 其他通道全部依赖后端        |
| Cloudflare → 锁定 D1                | CF Workers 只支持 D1 数据库 |
| Agent × Cloudflare                  | Agent 模块不兼容 CF Workers |

## 创建后

```bash
cd my-app
npm install
npm run db:push   # 初始化数据库（SQLite 自动创建）
npm run dev       # http://localhost:3010
npm test          # 运行测试
```

## 可用的后端模块

| 模块          | 说明                 | 路由                                                | 数据库表                                                  |
| ------------- | -------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| todos         | Todo CRUD + 文件附件 | `/api/todos`                                        | todos, todo-attachments                                   |
| chat          | WebSocket 实时聊天   | `/api/chat`                                         | 无（内存）                                                |
| notifications | SSE 推送通知         | `/api/notifications`                                | notifications                                             |
| file          | 文件上传下载         | `/files`                                            | 无（本地存储）                                            |
| agent         | AI Agent + 工作空间  | `/api/agents`, `/api/workspaces`                    | agents, workspaces                                        |
| permission    | RBAC 权限 + 审计     | `/api/permissions`, `/api/roles`, `/api/audit-logs` | 7 张表                                                    |
| ops           | 运营面板 + 用户管理  | `/api/ops`, `/api/users`                            | 无                                                        |
| order         | 订单管理             | `/api/orders`                                       | 无（内存）                                                |
| ticket        | 工单系统             | `/api/tickets`                                      | 无（内存）                                                |
| dispute       | 争议处理             | `/api/disputes`                                     | 无（内存）                                                |
| content       | 内容管理             | `/api/content`                                      | 无（内存）                                                |
| tenant        | 多租户 SaaS          | `/api/tenants`                                      | tenants, tenant-roles, tenant-members, tenant-invitations |
| captcha       | 验证码限流           | `/api/captcha`                                      | 无（内存）                                                |

## 技术栈

| 层       | 技术                                     |
| -------- | ---------------------------------------- |
| 前端     | React 18 + Vite + Zustand + Tailwind CSS |
| 运营后台 | React 18 + Ant Design                    |
| 后端     | Hono (支持 Node.js / Cloudflare Workers) |
| 数据库   | Drizzle ORM (SQLite / MySQL / D1)        |
| 实时通信 | WebSocket + SSE                          |
| 类型安全 | Hono RPC (端到端类型安全)                |
| 测试     | Vitest + Playwright E2E                  |
| 代码质量 | ESLint + Prettier + Husky                |

## 项目结构（生成后）

```
my-app/
├── src/
│   ├── client/          # Web SPA（选了 Web 时存在）
│   ├── ops/             # 运营后台（选了 Ops 时存在）
│   ├── tenant/          # 租户前端（选了 Tenant 时存在）
│   ├── cli/             # CLI 工具（选了 CLI 时存在）
│   ├── server/          # Hono 后端
│   │   ├── module-xxx/  # 按选择生成的功能模块
│   │   ├── core/        # 框架核心（运行时、实时通信）
│   │   ├── middleware/   # 中间件
│   │   ├── db/          # 数据库（Drizzle）
│   │   └── entries/     # 部署入口
│   ├── shared/          # 共享类型和 Schema
│   └── platform/        # 平台层（权限/认证）
├── index.html           # Web 入口
├── ops.html             # Ops 入口
├── vite.config.ts
├── tsconfig.json
├── wrangler.toml        # CF Workers 配置（CF 部署时）
└── docker-compose.yml   # Docker 配置（Node 部署时）
```

## License

MIT

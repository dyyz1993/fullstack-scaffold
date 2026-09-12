# Fullstack Admin — 全模块管理后台

> 全部 13 个模块的最全形态：管理后台 + 多租户 + 插件市场 + 电商 + 内容，一 applic全有。

- **在线演示**：https://fullstack.lpm1.top
- **模块数**：15
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/fullstack-admin.md

## 界面速览

![fullstack-login](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/fullstack-login.png)

![fullstack-dashboard](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/fullstack-dashboard.png)

![fullstack-users](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/fullstack-users.png)

## 适用 / 不适用

- **适用**：快速搭全能型后台原型；学习 Hono RPC/Zod 端到端类型安全与多入口管理台架构；AI Agent 自动开发场景。
- **不适用**：生产直接使用（演示站协议与默认凭据需先处理）；只要单一功能的轻量场景。

## 模块清单

| 模块            | 职责                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `todos`         | Todo CRUD with file attachments and CSV export                                                           |
| `chat`          | Real-time chat with WebSocket RPC and event broadcasting                                                 |
| `notifications` | Notification management with SSE real-time streaming                                                     |
| `file`          | File upload, storage, and signed URL generation                                                          |
| `captcha`       | CAPTCHA generation and verification for anti-bot protection                                              |
| `permission`    | Role-based access control, permission management, and audit logging                                      |
| `admin`         | Admin panel with auth, user management, system stats, media serving, CSV export, and admin notifications |
| `auth`          | Developer authentication with registration, login, and API key management                                |
| `plugin`        | Plugin marketplace with CRUD, publishing, reviews, categories, and admin management                      |
| `tenant`        | Multi-tenant infrastructure with tenant isolation and management                                         |
| `order`         | Order management with process/cancel/complete workflow                                                   |
| `ticket`        | Support ticket management with reply/close workflow                                                      |
| `dispute`       | Dispute management with investigate/resolve/reject workflow                                              |
| `content`       | Content management with publish/archive workflow and permission guards                                   |
| `merchant`      | Merchant management module with product management                                                       |

## API 面

**todos**（9 条）：

- `OPENAPI /todos`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos/{id}/attachments`
- `OPENAPI /todos/{id}/attachments`
- `OPENAPI /todos/{id}/with-attachments`
- `OPENAPI /todos/{todoId}/attachments/{attachmentId}`

**chat**（2 条）：

- `OPENAPI /chat/ws/status`
- `OPENAPI /chat/ws`

**notifications**（8 条）：

- `OPENAPI /notifications/stream`
- `OPENAPI /notifications`
- `OPENAPI /notifications/unread-count`
- `OPENAPI /notifications/{id}`
- `OPENAPI /notifications`
- `OPENAPI /notifications/read-all`
- `OPENAPI /notifications/{id}/read`
- `OPENAPI /notifications/{id}`

**file**（6 条）：

- `OPENAPI /public/{namespace}/{filename}`
- `OPENAPI /private/{namespace}/{filename}`
- `OPENAPI /generate-url`
- `OPENAPI /public/{namespace}/{filename}`
- `OPENAPI /private/{namespace}/{filename}`
- `OPENAPI /upload`

**captcha**（2 条）：

- `OPENAPI /captcha`
- `OPENAPI /verify-captcha`

**permission**（18 条）：

- `OPENAPI /audit-logs`
- `OPENAPI /audit-logs/:id`
- `OPENAPI /permissions/roles`
- `OPENAPI /permissions`
- `OPENAPI /permissions/me`
- `OPENAPI /permissions/menu-config`
- `OPENAPI /permissions/page-permissions`
- `OPENAPI /permissions/categories`
- `OPENAPI /permissions/role-labels`
- `OPENAPI /permissions/permission-labels`
- `OPENAPI /permissions/my-menu`
- `OPENAPI /permissions/init`
- `OPENAPI /roles`
- `OPENAPI /roles/:id`
- `OPENAPI /roles`
- `OPENAPI /roles/:id`
- `OPENAPI /roles/:id`
- `OPENAPI /roles/:id/permissions`

**admin**（30 条）：

- `OPENAPI /admin/notifications`
- `OPENAPI /admin/notifications/unread-count`
- `OPENAPI /admin/notifications/:id/read`
- `OPENAPI /admin/notifications/read-all`
- `OPENAPI /admin/notifications/test`
- `OPENAPI /admin/notifications/stream`
- `OPENAPI /admin/me`
- `OPENAPI /admin/login`
- `OPENAPI /admin/register`
- `OPENAPI /auth/login`
- `OPENAPI /auth/register`
- `OPENAPI /auth/me`
- `OPENAPI /admin/dashboard/stats`
- `OPENAPI /admin/todos/export`
- `OPENAPI /admin/todos/export/token`
- `OPENAPI /admin/todos/export/download/:token`
- `OPENAPI /admin/todos/export/stream`
- `OPENAPI /admin/avatar/:id`
- `OPENAPI /admin/icon/:name`
- `OPENAPI /admin/stats`
- `OPENAPI /admin/health`
- `OPENAPI /admin/activity`
- `OPENAPI /admin/todos/all`
- `OPENAPI /admin/settings`
- `OPENAPI /admin/settings`
- `OPENAPI /admin/users`
- `OPENAPI /admin/users/:id`
- `OPENAPI /admin/users/:id`
- `OPENAPI /admin/users/:id`
- `OPENAPI /admin/users`

**auth**（5 条）：

- `GET authUser`
- `OPENAPI /auth/register`
- `OPENAPI /auth/login`
- `OPENAPI /auth/verify`
- `OPENAPI /profile`

**plugin**（28 条）：

- `OPENAPI /stats/dashboard`
- `OPENAPI /plugins/pending`
- `OPENAPI /plugins`
- `OPENAPI /plugins/{slug}/approve`
- `OPENAPI /plugins/{slug}/reject`
- `OPENAPI /plugins/{slug}/feature`
- `OPENAPI /plugins/{slug}`
- `OPENAPI /plugins/bulk-approve`
- `OPENAPI /plugins/bulk-reject`
- `OPENAPI /categories`
- `OPENAPI /categories`
- `OPENAPI /categories/{id}`
- `OPENAPI /categories/{id}`
- `OPENAPI /plugins`
- `OPENAPI /plugins/search`
- `OPENAPI /plugins/{slug}`
- `OPENAPI /plugins/{slug}/versions`
- `OPENAPI /plugins`
- `OPENAPI /plugins/{slug}`
- `OPENAPI /plugins/{slug}`
- `OPENAPI /plugins/{slug}/reviews`
- `OPENAPI /plugins/{slug}/reviews`
- `OPENAPI /plugins/{slug}/reviews/{reviewId}`
- `OPENAPI /plugins/{slug}/install`
- `OPENAPI /categories`
- `OPENAPI /categories/{slug}/plugins`
- `OPENAPI /stats`
- `OPENAPI /plugins/mine`

**tenant**（21 条）：

- `GET authUser`
- `GET tenant`
- `OPENAPI /tenants`
- `OPENAPI /tenants/{id}`
- `OPENAPI /tenants/slug/{slug}`
- `OPENAPI /tenants`
- `OPENAPI /tenants/{id}`
- `OPENAPI /tenants/{id}`
- `OPENAPI /tenants/mine`
- `OPENAPI /tenants/{tenantId}/roles`
- `OPENAPI /tenants/{tenantId}/roles`
- `OPENAPI /tenants/{tenantId}/roles/{roleId}`
- `OPENAPI /tenants/{tenantId}/roles/{roleId}`
- `OPENAPI /tenants/{tenantId}/members`
- `OPENAPI /tenants/{tenantId}/members/invite`
- `OPENAPI /tenants/{tenantId}/members/{memberId}`
- `OPENAPI /tenants/{tenantId}/members/{memberId}`
- `OPENAPI /tenants/{tenantId}/invitations/{invitationId}`
- `OPENAPI /tenants/invitations/{token}`
- `OPENAPI /tenants/invitations/{token}/accept`
- `OPENAPI /tenant/current`

**order**（11 条）：

- `OPENAPI /cart`
- `OPENAPI /cart/items`
- `OPENAPI /cart/items/{id}`
- `OPENAPI /orders`
- `OPENAPI /orders/{id}`
- `OPENAPI /orders`
- `OPENAPI /orders/{id}`
- `OPENAPI /orders/{id}`
- `OPENAPI /orders/{id}/process`
- `OPENAPI /orders/{id}/cancel`
- `OPENAPI /orders-mock`

**ticket**（7 条）：

- `OPENAPI /tickets`
- `OPENAPI /tickets/{id}`
- `OPENAPI /tickets`
- `OPENAPI /tickets/{id}`
- `OPENAPI /tickets/{id}`
- `OPENAPI /tickets/{id}/reply`
- `OPENAPI /tickets/{id}/close`

**dispute**（6 条）：

- `OPENAPI /disputes`
- `OPENAPI /disputes/{id}`
- `OPENAPI /disputes`
- `OPENAPI /disputes/{id}`
- `OPENAPI /disputes/{id}`
- `OPENAPI /disputes/{id}/resolve`

**content**（12 条）：

- `OPENAPI /contents`
- `OPENAPI /contents/{id}`
- `OPENAPI /contents`
- `OPENAPI /contents/{id}`
- `OPENAPI /contents/{id}`
- `OPENAPI /contents/{id}/publish`
- `OPENAPI /contents/{id}/archive`
- `OPENAPI /public/contents`
- `OPENAPI /public/contents/{id}`
- `OPENAPI /topics`
- `OPENAPI /topics/popular`
- `OPENAPI /profile`

**merchant**（6 条）：

- `GET authUser`
- `OPENAPI /merchant/me`
- `OPENAPI /merchant/login`
- `OPENAPI /merchant/stats`
- `OPENAPI /merchant/products`
- `OPENAPI /merchant/products`

## 验证清单（部署后逐条执行）

- `curl https://fullstack.lpm1.top/health` → 200 `{"status":"ok"}`
- GET /api/plugins/search?q=a → 200 插件市场数据
- POST /api/auth/login (username=superadmin, password=123456) → 200（admin mock 登录）
- 登录凭据（如适用）：`superadmin / 123456`（admin mock）；saas 控制台 `superadmin / admin123`

> 本文档由 `scripts/generate-preset-docs.ts` 生成——结构化部分来自模块清单，改动模块后请重新生成。

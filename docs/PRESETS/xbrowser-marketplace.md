# XBrowser Marketplace — 插件市场

> 插件上架/审核/安装/评价全生命周期 + 商家端 + 订单工单纠纷，最复杂的业务形态。

- **在线演示**：https://market.lpm1.top
- **模块数**：11
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/xbrowser-marketplace.md

## 适用 / 不适用

- **适用**：浏览器插件/应用市场类平台；需要审核流的 UGC 平台。
- **不适用**：轻量工具站（模块多，按需取舍）。

## 模块清单

| 模块            | 职责                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `notifications` | Notification management with SSE real-time streaming                                                     |
| `file`          | File upload, storage, and signed URL generation                                                          |
| `captcha`       | CAPTCHA generation and verification for anti-bot protection                                              |
| `auth`          | Developer authentication with registration, login, and API key management                                |
| `permission`    | Role-based access control, permission management, and audit logging                                      |
| `admin`         | Admin panel with auth, user management, system stats, media serving, CSV export, and admin notifications |
| `plugin`        | Plugin marketplace with CRUD, publishing, reviews, categories, and admin management                      |
| `order`         | Order management with process/cancel/complete workflow                                                   |
| `ticket`        | Support ticket management with reply/close workflow                                                      |
| `dispute`       | Dispute management with investigate/resolve/reject workflow                                              |
| `content`       | Content management with publish/archive workflow and permission guards                                   |

## API 面

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

**auth**（5 条）：

- `GET authUser`
- `OPENAPI /auth/register`
- `OPENAPI /auth/login`
- `OPENAPI /auth/verify`
- `OPENAPI /profile`

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

## 验证清单（部署后逐条执行）

- `curl https://market.lpm1.top/health` → 200 `{"status":"ok"}`
- GET /api/plugins/search?q=a → 200 搜索
- GET /api/plugins/pending → 200/401 审核队列
- 登录凭据（如适用）：`superadmin / 123456`（admin mock）；saas 控制台 `superadmin / admin123`

> 本文档由 `scripts/generate-preset-docs.ts` 生成——结构化部分来自模块清单，改动模块后请重新生成。

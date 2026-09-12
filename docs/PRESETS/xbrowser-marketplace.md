# XBrowser Marketplace — 插件市场

> 插件上架/审核/安装/评价全生命周期 + 商家端 + 订单工单纠纷。

- **在线演示**：https://market.lpm1.top
- **模块数**：11
- **身份数**：4
- **文档**: [GitHub](https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/xbrowser-marketplace.md)

## 界面速览

![market-home](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/market-home.png)

![market-detail](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/market-detail.png)

## 适用 / 不适用

- **适用**：浏览器插件/应用市场类平台；需要审核流的 UGC 平台。
- **不适用**：轻量工具站。

## 用户角色与权限（4 种身份）

### 平台管理员 (super_admin)

插件审核/上架/下架、商家管理、订单纠纷处理
**凭据**: `superadmin / 123456`

**能做**:

- ✓ 插件审核（approve/reject）
- ✓ 插件上架/下架
- ✓ 商家管理
- ✓ 订单/工单/纠纷
- ✓ 系统设置

**不能做**:

- ✗ —（全权限）

### 开发者 (developer)

注册后可提交插件、管理自己的插件版本
**凭据**: `注册后登录`

**能做**:

- ✓ 注册开发者账号
- ✓ 提交插件
- ✓ 管理自己的插件版本
- ✓ 查看审核状态

**不能做**:

- ✗ 审核他人插件
- ✗ 管理后台
- ✗ 订单管理

### 用户/浏览器用户

浏览/搜索/安装/评价插件
**凭据**: `无需登录（浏览）/ 注册后（评论）`

**能做**:

- ✓ 浏览插件市场
- ✓ 搜索插件
- ✓ 查看插件详情
- ✓ 安装插件
- ✓ 写评论

**不能做**:

- ✗ 提交插件（需开发者身份）
- ✗ 审核插件
- ✗ 管理后台

### 游客（未登录）

仅浏览插件市场
**凭据**: `无需登录`

**能做**:

- ✓ 浏览插件列表
- ✓ 搜索
- ✓ 查看插件详情

**不能做**:

- ✗ 安装/评论（需登录）
- ✗ 提交插件
- ✗ 管理后台

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

**notifications**（6 条）：

- `OPENAPI /notifications/stream`
- `OPENAPI /notifications`
- `OPENAPI /notifications/unread-count`
- `OPENAPI /notifications/{id}`
- `OPENAPI /notifications/read-all`
- `OPENAPI /notifications/{id}/read`

**file**（4 条）：

- `OPENAPI /public/{namespace}/{filename}`
- `OPENAPI /private/{namespace}/{filename}`
- `OPENAPI /generate-url`
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

**permission**（15 条）：

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
- `OPENAPI /roles/:id/permissions`

**admin**（26 条）：

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
- `OPENAPI /admin/users`
- `OPENAPI /admin/users/:id`

**plugin**（19 条）：

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
- `OPENAPI /categories/{id}`
- `OPENAPI /plugins/search`
- `OPENAPI /plugins/{slug}/versions`
- `OPENAPI /plugins/{slug}/reviews`
- `OPENAPI /plugins/{slug}/reviews/{reviewId}`
- `OPENAPI /plugins/{slug}/install`
- `OPENAPI /categories/{slug}/plugins`
- `OPENAPI /stats`
- `OPENAPI /plugins/mine`

**order**（8 条）：

- `OPENAPI /cart`
- `OPENAPI /cart/items`
- `OPENAPI /cart/items/{id}`
- `OPENAPI /orders`
- `OPENAPI /orders/{id}`
- `OPENAPI /orders/{id}/process`
- `OPENAPI /orders/{id}/cancel`
- `OPENAPI /orders-mock`

**ticket**（4 条）：

- `OPENAPI /tickets`
- `OPENAPI /tickets/{id}`
- `OPENAPI /tickets/{id}/reply`
- `OPENAPI /tickets/{id}/close`

**dispute**（3 条）：

- `OPENAPI /disputes`
- `OPENAPI /disputes/{id}`
- `OPENAPI /disputes/{id}/resolve`

**content**（9 条）：

- `OPENAPI /contents`
- `OPENAPI /contents/{id}`
- `OPENAPI /contents/{id}/publish`
- `OPENAPI /contents/{id}/archive`
- `OPENAPI /public/contents`
- `OPENAPI /public/contents/{id}`
- `OPENAPI /topics`
- `OPENAPI /topics/popular`
- `OPENAPI /profile`

## 验证清单

- `curl https://market.lpm1.top/health` → 200
- GET /api/plugins/search?q=a → 200

> 由 `scripts/generate-preset-docs.ts` 生成。

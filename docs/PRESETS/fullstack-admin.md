# Fullstack Admin — 全模块管理后台

> 全部 15 个模块的最全形态：管理后台 + 多租户 + 插件市场 + 电商 + 内容，一套全有。

- **在线演示**：https://fullstack.lpm1.top
- **模块数**：15
- **身份数**：7
- **文档**: [GitHub](https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/fullstack-admin.md)

## 界面速览

![fullstack-login](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/fullstack-login.png)

![fullstack-dashboard](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/fullstack-dashboard.png)

![fullstack-users](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/fullstack-users.png)

## 适用 / 不适用

- **适用**：快速搭全能型后台原型；学习 Hono RPC/Zod 端到端类型安全与多入口管理台架构。
- **不适用**：生产直接使用（演示站协议与默认凭据需先处理）。

## 用户角色与权限（7 种身份）

### 超级管理员 (super_admin)

拥有全部 45 项权限，可管理所有模块、用户、角色、系统设置
**凭据**: `superadmin / 123456（或快速登录按钮）`

**能做**:

- ✓ 仪表盘统计（总待办/待处理/已完成）
- ✓ 用户管理（查看/创建/编辑/删除）
- ✓ 内容管理（新建/编辑/发布/删除）
- ✓ 订单/工单/纠纷管理
- ✓ 角色与权限管理
- ✓ 系统设置读写
- ✓ 插件管理与审核
- ✓ 审计日志查看
- ✓ 租户管理（/tenant 独立入口）

**不能做**:

- ✗ —（拥有全部权限）

### 客服人员 (customer_service)

可查看内容、处理工单，不能管理系统或用户
**凭据**: `customerservice / 123456（快速登录按钮）`

**能做**:

- ✓ 查看内容列表（只读）
- ✓ 查看工单管理页
- ✓ 通知中心
- ✓ 自己的 todos

**不能做**:

- ✗ 仪表盘统计（API 403 → 卡片显示 0）
- ✗ 用户管理（API 403 → 空表）
- ✗ 系统设置（API 403 → 空表单）
- ✗ 内容新建/编辑（按钮不渲染）
- ✗ 角色管理（API 403）

### 普通用户 (user)

基础权限：查看内容、管理自己的 todos
**凭据**: `user1 / 123456（快速登录按钮）`

**能做**:

- ✓ 查看内容列表
- ✓ 自己的 todos CRUD
- ✓ 通知中心
- ✓ 媒体/验证码测试页

**不能做**:

- ✗ 仪表盘统计
- ✗ 用户管理
- ✗ 系统设置
- ✗ 内容新建/编辑
- ✗ 角色管理
- ✗ 订单/工单/纠纷

### 游客（未登录）

无需登录即可浏览公开页面
**凭据**: `无需登录`

**能做**:

- ✓ 浏览 /todos 页（SSR 渲染数据）
- ✓ 浏览 /notifications（SSE Demo）
- ✓ 浏览 /websocket（WS Demo）

**不能做**:

- ✗ 写操作需认证（API 返回 401）
- ✗ 访问 /admin 管理后台

### 开发者 (developer)

通过 auth 模块注册，可管理 API key
**凭据**: `通过 /api/auth/register 注册`

**能做**:

- ✓ 注册开发者账号
- ✓ 获取 API key
- ✓ API 调用

**不能做**:

- ✗ 管理后台（需 admin 角色）
- ✗ 管理租户

### 商家 (merchant)

商家端独立登录，管理自己的商品和订单
**凭据**: `merchant 模块种子账号（Demo@2024!）`

**能做**:

- ✓ 商家端登录
- ✓ 管理自己的商品
- ✓ 查看自己的订单/统计

**不能做**:

- ✗ 管理后台
- ✗ 管理其他商家

### 租户管理员 (tenant_admin)

通过 /tenant 独立入口管理本租户
**凭据**: `superadmin / admin123（/tenant/login）`

**能做**:

- ✓ 租户控制台管理成员/角色
- ✓ 租户设置
- ✓ 租户内 todos

**不能做**:

- ✗ 平台级管理（需 super_admin）

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

**todos**（5 条）：

- `OPENAPI /todos`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos/{id}/attachments`
- `OPENAPI /todos/{id}/with-attachments`
- `OPENAPI /todos/{todoId}/attachments/{attachmentId}`

**chat**（2 条）：

- `OPENAPI /chat/ws/status`
- `OPENAPI /chat/ws`

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

**auth**（4 条）：

- `OPENAPI /auth/register`
- `OPENAPI /auth/login`
- `OPENAPI /auth/verify`
- `OPENAPI /profile`

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

**tenant**（13 条）：

- `OPENAPI /tenants`
- `OPENAPI /tenants/{id}`
- `OPENAPI /tenants/slug/{slug}`
- `OPENAPI /tenants/mine`
- `OPENAPI /tenants/{tenantId}/roles`
- `OPENAPI /tenants/{tenantId}/roles/{roleId}`
- `OPENAPI /tenants/{tenantId}/members`
- `OPENAPI /tenants/{tenantId}/members/invite`
- `OPENAPI /tenants/{tenantId}/members/{memberId}`
- `OPENAPI /tenants/{tenantId}/invitations/{invitationId}`
- `OPENAPI /tenants/invitations/{token}`
- `OPENAPI /tenants/invitations/{token}/accept`
- `OPENAPI /tenant/current`

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

**merchant**（4 条）：

- `OPENAPI /merchant/me`
- `OPENAPI /merchant/login`
- `OPENAPI /merchant/stats`
- `OPENAPI /merchant/products`

## 验证清单

- `curl https://fullstack.lpm1.top/health` → 200
- GET /api/plugins/search?q=a → 200
- POST /api/auth/login → 200

> 由 `scripts/generate-preset-docs.ts` 生成。

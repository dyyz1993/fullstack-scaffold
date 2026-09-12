# SaaS Multi-Tenant — 多租户 SaaS

> 多租户 SaaS 全链路：租户开通事务、成员邀请、租户内角色、套餐配额、子域隔离。

- **在线演示**：https://saas.lpm1.top
- **模块数**：8
- **身份数**：5
- **文档**: [GitHub](https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/saas.md)

## 界面速览

![saas-home](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/saas-home.png)

![saas-tenant-login](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/saas-tenant-login.png)

![saas-tenant-dashboard](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/saas-tenant-dashboard.png)

## 适用 / 不适用

- **适用**：B2B 工具站/多组织内容平台/内部多部门系统。
- **不适用**：C 端个人用户；需要真订阅计费（Stripe 未集成）。

## 用户角色与权限（5 种身份）

### 平台超管 (super_admin)

管理所有租户、开通/暂停、设置套餐配额
**凭据**: `superadmin / admin123`

**能做**:

- ✓ 租户 CRUD
- ✓ 设置套餐（plan/max_users）
- ✓ 查看所有租户的成员和角色
- ✓ CLI 管理

**不能做**:

- ✗ —（平台级最高权限）

### 租户管理员 (tenant_admin)

管理本租户的成员、角色、设置
**凭据**: `superadmin / admin123（/tenant/login）`

**能做**:

- ✓ 查看仪表盘统计
- ✓ 成员列表/邀请/改角色/移除
- ✓ 租户设置（改名等）
- ✓ 查看订阅/配额
- ✓ 本租户的 todos CRUD

**不能做**:

- ✗ 创建/删除租户（需平台超管）
- ✗ 修改套餐 plan（需平台超管）

### 租户成员 (tenant_member)

受邀请加入租户的普通成员
**凭据**: `受邀注册后登录`

**能做**:

- ✓ 查看仪表盘（按用户隔离）
- ✓ 自己的 todos CRUD
- ✓ 查看内容

**不能做**:

- ✗ 邀请成员（API 403）
- ✗ 移除成员（API 403）
- ✗ 修改租户设置
- ✗ 管理租户角色

### 访客（未登录）

未认证用户
**凭据**: `无需登录`

**能做**:

- ✓ 查看邀请落地页（脱敏详情）
- ✓ 注册新账号

**不能做**:

- ✗ 访问租户控制台（拦回登录页）
- ✗ 伪造邀请 token（显示 Invitation not found）

### 开发者 (developer)

通过 auth 模块注册，可管理 API key
**凭据**: `通过 /api/auth/register 注册`

**能做**:

- ✓ 注册开发者账号
- ✓ 获取 API key

**不能做**:

- ✗ 管理租户
- ✗ 管理后台

## 模块清单

| 模块            | 职责                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| `todos`         | Todo CRUD with file attachments and CSV export                            |
| `notifications` | Notification management with SSE real-time streaming                      |
| `file`          | File upload, storage, and signed URL generation                           |
| `captcha`       | CAPTCHA generation and verification for anti-bot protection               |
| `permission`    | Role-based access control, permission management, and audit logging       |
| `auth`          | Developer authentication with registration, login, and API key management |
| `tenant`        | Multi-tenant infrastructure with tenant isolation and management          |
| `content`       | Content management with publish/archive workflow and permission guards    |

## API 面

**todos**（5 条）：

- `OPENAPI /todos`
- `OPENAPI /todos/{id}`
- `OPENAPI /todos/{id}/attachments`
- `OPENAPI /todos/{id}/with-attachments`
- `OPENAPI /todos/{todoId}/attachments/{attachmentId}`

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

**auth**（4 条）：

- `OPENAPI /auth/register`
- `OPENAPI /auth/login`
- `OPENAPI /auth/verify`
- `OPENAPI /profile`

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

- `curl https://saas.lpm1.top/health` → 200
- POST /api/auth/login → 200 JWT
- GET /api/tenants/mine → 200

> 由 `scripts/generate-preset-docs.ts` 生成。

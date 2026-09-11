# SaaS Multi-Tenant — 多租户 SaaS

> 多租户 SaaS 全链路：租户开通事务、成员邀请（7 天 token）、租户内角色、套餐配额、子域隔离、租户控制台。

- **在线演示**：https://saas.lpm1.top
- **模块数**：8
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/saas.md

## 适用 / 不适用

- **适用**：B2B 工具站/多组织内容平台/内部多部门系统。
- **不适用**：C 端个人用户（用 user_id 即可）；需要真订阅计费（Stripe 未集成）；需要 SSO/SCIM。

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

**auth**（5 条）：

- `GET authUser`
- `OPENAPI /auth/register`
- `OPENAPI /auth/login`
- `OPENAPI /auth/verify`
- `OPENAPI /profile`

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

- `curl https://saas.lpm1.top/health` → 200 `{"status":"ok"}`
- POST /api/auth/login (account=superadmin, password=admin123) → 200 JWT
- GET /api/tenants/mine (Bearer) → 200 含 demo/saas 租户
- GET /tenant/login → 200 租户控制台登录页
- 登录凭据（如适用）：`superadmin / 123456`（admin mock）；saas 控制台 `superadmin / admin123`

> 本文档由 `scripts/generate-preset-docs.ts` 生成——结构化部分来自模块清单，改动模块后请重新生成。

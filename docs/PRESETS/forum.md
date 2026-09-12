# Forum — 社区论坛形态

> 内容 + 权限 + 管理后台 + 通知的社区组合，内容发布/审核/公开浏览全链。

- **在线演示**：https://forum.lpm1.top
- **模块数**：5
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/forum.md

## 界面速览

![forum-home](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/forum-home.png)

## 适用 / 不适用

- **适用**：社区/论坛/博客平台原型；内容审核流场景。
- **不适用**：需要用户动态/实时聊天（未含 chat 模块）。

## 模块清单

| 模块            | 职责                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `content`       | Content management with publish/archive workflow and permission guards                                   |
| `auth`          | Developer authentication with registration, login, and API key management                                |
| `permission`    | Role-based access control, permission management, and audit logging                                      |
| `admin`         | Admin panel with auth, user management, system stats, media serving, CSV export, and admin notifications |
| `notifications` | Notification management with SSE real-time streaming                                                     |

## API 面

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

**notifications**（8 条）：

- `OPENAPI /notifications/stream`
- `OPENAPI /notifications`
- `OPENAPI /notifications/unread-count`
- `OPENAPI /notifications/{id}`
- `OPENAPI /notifications`
- `OPENAPI /notifications/read-all`
- `OPENAPI /notifications/{id}/read`
- `OPENAPI /notifications/{id}`

## 验证清单（部署后逐条执行）

- `curl https://forum.lpm1.top/health` → 200 `{"status":"ok"}`
- GET /api/public/contents → 200 已发布内容列表
- GET /api/topics → 200 话题
- 登录凭据（如适用）：`superadmin / 123456`（admin mock）；saas 控制台 `superadmin / admin123`

> 本文档由 `scripts/generate-preset-docs.ts` 生成——结构化部分来自模块清单，改动模块后请重新生成。

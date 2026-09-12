# Forum — 社区论坛形态

> 内容 + 权限 + 管理后台 + 通知的社区组合。

- **在线演示**：https://forum.lpm1.top
- **模块数**：5
- **身份数**：3
- **文档**: [GitHub](https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/forum.md)

## 界面速览

![forum-home](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/forum-home.png)

## 适用 / 不适用

- **适用**：社区/论坛/博客平台原型；内容审核流场景。
- **不适用**：需要用户动态/实时聊天。

## 用户角色与权限（3 种身份）

### 管理员 (super_admin)

内容发布/审核/删除、用户管理、系统设置
**凭据**: `superadmin / 123456`

**能做**:

- ✓ 内容新建/编辑/发布/删除
- ✓ 用户管理
- ✓ 系统设置
- ✓ 审计日志

**不能做**:

- ✗ —（全权限）

### 注册用户

注册后可发帖/评论
**凭据**: `member@community.dev（预填）`

**能做**:

- ✓ 注册/登录
- ✓ 浏览全部内容
- ✓ 查看内容详情

**不能做**:

- ✗ 管理后台
- ✗ 删除他人内容

### 游客（未登录）

浏览公开内容
**凭据**: `无需登录`

**能做**:

- ✓ 浏览内容列表
- ✓ 分类筛选/搜索
- ✓ 查看内容详情

**不能做**:

- ✗ 发帖/评论
- ✗ 管理后台

## 模块清单

| 模块            | 职责                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `content`       | Content management with publish/archive workflow and permission guards                                   |
| `auth`          | Developer authentication with registration, login, and API key management                                |
| `permission`    | Role-based access control, permission management, and audit logging                                      |
| `admin`         | Admin panel with auth, user management, system stats, media serving, CSV export, and admin notifications |
| `notifications` | Notification management with SSE real-time streaming                                                     |

## API 面

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

**notifications**（6 条）：

- `OPENAPI /notifications/stream`
- `OPENAPI /notifications`
- `OPENAPI /notifications/unread-count`
- `OPENAPI /notifications/{id}`
- `OPENAPI /notifications/read-all`
- `OPENAPI /notifications/{id}/read`

## 验证清单

- `curl https://forum.lpm1.top/health` → 200
- GET /api/public/contents → 200
- GET /api/topics → 200

> 由 `scripts/generate-preset-docs.ts` 生成。

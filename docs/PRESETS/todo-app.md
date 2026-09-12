# Todo App — 经典全栈起步形态

> todos + chat + notifications + auth 的经典四模块组合。

- **在线演示**：https://todo.lpm1.top
- **模块数**：4
- **身份数**：2
- **文档**: [GitHub](https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/todo-app.md)

## 界面速览

![todo-home](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/todo-home.png)

## 适用 / 不适用

- **适用**：学习脚手架主干（RPC/测试/部署）；以此为底座开发自己的业务模块。
- **不适用**：需要管理后台/多租户/内容管理的场景。

## 用户角色与权限（2 种身份）

### 注册用户

注册后可管理自己的 todos、使用聊天和通知
**凭据**: `demo@biomimic.app（登录页预填演示凭据）`

**能做**:

- ✓ 注册新账号
- ✓ 登录后 todos CRUD
- ✓ WebSocket 聊天
- ✓ SSE 通知

**不能做**:

- ✗ 管理后台（此形态无 /admin）
- ✗ 多租户功能

### 游客（未登录）

自动以 Demo User 身份登录（dev token），可直接操作
**凭据**: `无需登录（自动登录为 Demo User）`

**能做**:

- ✓ 浏览 todos 列表
- ✓ 新增/修改/删除 todos（dev token 自动登录）
- ✓ SSE/WebSocket 页面

**不能做**:

- ✗ —（dev 模式下自动登录）

## 模块清单

| 模块            | 职责                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| `todos`         | Todo CRUD with file attachments and CSV export                            |
| `chat`          | Real-time chat with WebSocket RPC and event broadcasting                  |
| `notifications` | Notification management with SSE real-time streaming                      |
| `auth`          | Developer authentication with registration, login, and API key management |

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

**auth**（4 条）：

- `OPENAPI /auth/register`
- `OPENAPI /auth/login`
- `OPENAPI /auth/verify`
- `OPENAPI /profile`

## 验证清单

- `curl https://todo.lpm1.top/health` → 200
- GET /api/todos → 200 种子数据

> 由 `scripts/generate-preset-docs.ts` 生成。

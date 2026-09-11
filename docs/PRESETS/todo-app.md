# Todo App — 经典全栈起步形态

> todos + chat + notifications + auth 的经典四模块组合，最贴近“标准全栈应用”的心智模型。

- **在线演示**：https://todo.lpm1.top
- **模块数**：4
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/todo-app.md

## 适用 / 不适用

- **适用**：学习脚手架主干（RPC/测试/部署）；以此为底座开发自己的业务模块。
- **不适用**：需要管理后台/多租户/内容管理的场景（改用 fullstack-admin 或 saas）。

## 模块清单

| 模块            | 职责                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| `todos`         | Todo CRUD with file attachments and CSV export                            |
| `chat`          | Real-time chat with WebSocket RPC and event broadcasting                  |
| `notifications` | Notification management with SSE real-time streaming                      |
| `auth`          | Developer authentication with registration, login, and API key management |

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

**auth**（5 条）：

- `GET authUser`
- `OPENAPI /auth/register`
- `OPENAPI /auth/login`
- `OPENAPI /auth/verify`
- `OPENAPI /profile`

## 验证清单（部署后逐条执行）

- `curl https://todo.lpm1.top/health` → 200 `{"status":"ok"}`
- GET /api/todos → 200 {todos,total,page,limit}，种子 10 条
- 登录凭据（如适用）：`superadmin / 123456`（admin mock）；saas 控制台 `superadmin / admin123`

> 本文档由 `scripts/generate-preset-docs.ts` 生成——结构化部分来自模块清单，改动模块后请重新生成。

# cli-only

> CLI + Server only, no web client. For AI agent automation — no browser UI needed

- **在线演示**：无（纯 CLI 形态，本地生成使用）
- **模块数**：4
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/cli-only.md

## 适用 / 不适用

- **适用**：—
- **不适用**：—

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

- 本地 `npm run cli -- --help` → 命令列表正常

- 登录凭据（如适用）：`superadmin / 123456`（admin mock）；saas 控制台 `superadmin / admin123`

> 本文档由 `scripts/generate-preset-docs.ts` 生成——结构化部分来自模块清单，改动模块后请重新生成。

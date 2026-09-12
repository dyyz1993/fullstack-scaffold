# CLI Only — 纯命令行形态

> 无前端 UI，纯 CLI + API 服务。

- **在线演示**：无（纯 CLI 形态）
- **模块数**：4
- **身份数**：1
- **文档**: [GitHub](https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/cli-only.md)

## 适用 / 不适用

- **适用**：后端 API 原型；CLI 工具开发。
- **不适用**：需要 Web 界面的场景。

## 用户角色与权限（1 种身份）

### CLI 用户

通过命令行与 API 交互
**凭据**: `通过 CLI 登录`

**能做**:

- ✓ CLI 命令（todos/notifications/auth 等）
- ✓ API 调用

**不能做**:

- ✗ Web UI（此形态无前端）

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

- CLI 可用

> 由 `scripts/generate-preset-docs.ts` 生成。

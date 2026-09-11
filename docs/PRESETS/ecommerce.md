# Ecommerce — 电商交易形态

> 订单/购物车/工单/纠纷仲裁/内容的电商组合，含审批流工单与争议仲裁状态机。

- **在线演示**：https://shop.lpm1.top
- **模块数**：9
- **官方文档**：https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/ecommerce.md

## 适用 / 不适用

- **适用**：交易类应用原型；需要工单与仲裁流程的业务。
- **不适用**：真实支付（订单为演示数据，未接支付网关）。

## 模块清单

| 模块            | 职责                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| `todos`         | Todo CRUD with file attachments and CSV export                         |
| `chat`          | Real-time chat with WebSocket RPC and event broadcasting               |
| `notifications` | Notification management with SSE real-time streaming                   |
| `file`          | File upload, storage, and signed URL generation                        |
| `permission`    | Role-based access control, permission management, and audit logging    |
| `order`         | Order management with process/cancel/complete workflow                 |
| `ticket`        | Support ticket management with reply/close workflow                    |
| `dispute`       | Dispute management with investigate/resolve/reject workflow            |
| `content`       | Content management with publish/archive workflow and permission guards |

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

**file**（6 条）：

- `OPENAPI /public/{namespace}/{filename}`
- `OPENAPI /private/{namespace}/{filename}`
- `OPENAPI /generate-url`
- `OPENAPI /public/{namespace}/{filename}`
- `OPENAPI /private/{namespace}/{filename}`
- `OPENAPI /upload`

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

**order**（11 条）：

- `OPENAPI /cart`
- `OPENAPI /cart/items`
- `OPENAPI /cart/items/{id}`
- `OPENAPI /orders`
- `OPENAPI /orders/{id}`
- `OPENAPI /orders`
- `OPENAPI /orders/{id}`
- `OPENAPI /orders/{id}`
- `OPENAPI /orders/{id}/process`
- `OPENAPI /orders/{id}/cancel`
- `OPENAPI /orders-mock`

**ticket**（7 条）：

- `OPENAPI /tickets`
- `OPENAPI /tickets/{id}`
- `OPENAPI /tickets`
- `OPENAPI /tickets/{id}`
- `OPENAPI /tickets/{id}`
- `OPENAPI /tickets/{id}/reply`
- `OPENAPI /tickets/{id}/close`

**dispute**（6 条）：

- `OPENAPI /disputes`
- `OPENAPI /disputes/{id}`
- `OPENAPI /disputes`
- `OPENAPI /disputes/{id}`
- `OPENAPI /disputes/{id}`
- `OPENAPI /disputes/{id}/resolve`

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

- `curl https://shop.lpm1.top/health` → 200 `{"status":"ok"}`
- GET /api/orders-mock → 200 订单演示数据
- GET /api/todos → 200
- 登录凭据（如适用）：`superadmin / 123456`（admin mock）；saas 控制台 `superadmin / admin123`

> 本文档由 `scripts/generate-preset-docs.ts` 生成——结构化部分来自模块清单，改动模块后请重新生成。

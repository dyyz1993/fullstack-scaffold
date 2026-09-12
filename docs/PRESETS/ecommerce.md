# Ecommerce — 电商交易形态

> 订单/购物车/工单/纠纷仲裁/内容的电商组合。

- **在线演示**：https://shop.lpm1.top
- **模块数**：9
- **身份数**：1
- **文档**: [GitHub](https://github.com/dyyz1993/fullstack-scaffold/blob/master/docs/PRESETS/ecommerce.md)

## 界面速览

![shop-home](https://raw.githubusercontent.com/dyyz1993/fullstack-scaffold/master/docs/PRESETS/screenshots/shop-home.png)

## 适用 / 不适用

- **适用**：交易类应用原型；需要工单与仲裁流程的业务。
- **不适用**：真实支付（订单为演示数据）。

## 用户角色与权限（1 种身份）

### 游客/消费者

此形态无 auth 模块，线上唯一身份就是游客（浏览+操作演示数据）
**凭据**: `无需登录（此形态无认证模块，仅有游客身份）`

**能做**:

- ✓ 浏览内容中心
- ✓ 分类筛选/搜索
- ✓ 查看内容详情
- ✓ 购物车页面（mock）
- ✓ 查看订单（mock）
- ✓ todos CRUD

**不能做**:

- ✗ 真实下单/支付
- ✗ 管理后台（此形态无 /admin）
- ✗ 登录/注册（无 auth 模块）

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

## 验证清单

- `curl https://shop.lpm1.top/health` → 200
- GET /api/orders-mock → 200
- GET /api/todos → 200

> 由 `scripts/generate-preset-docs.ts` 生成。

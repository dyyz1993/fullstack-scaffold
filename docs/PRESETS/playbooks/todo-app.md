# Todo App — Test Playbook

> 站点：https://todo.lpm1.top
> 身份数：2
> 每个身份列出：操作步骤 → 验证 → 截图 → 选择器

---

## 注册用户

**凭据**: `demo@biomimic.app（登录页预填）`

**案例数**: 5

### 注册新账号

**步骤**:

1. 打开 /register
2. 填写 Username/Email/Password（min 6）
3. 点击注册

**验证**: 跳转到 /login，无报错

**截图**: ![注册新账号](../screenshots/matrix/todo/todo-09-register.png)

**选择器**:
| 元素 | 选择器 |
|---|---|
| 注册页URL | `/register` |

### Todos CRUD 全流程

**步骤**:

1. 登录后打开 /todos
2. 在输入框填写标题
3. 点击 Add Todo
4. 用状态下拉改为 completed
5. 点击删除按钮

**验证**: 新增→变绿→删除，Total 计数正确变化

**截图**: ![Todos CRUD 全流程](../screenshots/journeys/todo-j2-add.png)

**选择器**:
| 元素 | 选择器 |
|---|---|
| 标题输入框 | `[data-testid='todo-title-input']` |
| 添加按钮 | `[data-testid='add-todo-button']` |
| 状态下拉 | `[data-testid='todo-status']` |
| 删除按钮 | `[data-testid='delete-todo']` |

### WebSocket 聊天

**步骤**:

1. 打开 /websocket
2. 点击 Connect
3. 在输入框填写消息
4. 点击 Send

**验证**: Status 变 Open，ECHO REQUEST/RESPONSE 往返

**截图**: ![WebSocket 聊天](../screenshots/matrix/todo/09-websocket.png)

### 空标题提交无效（逆向）

**步骤**:

1. 打开 /todos
2. 不输入标题直接点击 Add Todo

**验证**: 提交被拦截，Total 计数不变

### WebSocket 未连接发消息（逆向）

**步骤**:

1. 打开 /websocket
2. 不点 Connect 直接在输入框发送

**验证**: 提示未连接或消息不发出，无假成功

---

## 游客（自动登录）

**凭据**: `无需登录（自动登录为 Demo User）`

**案例数**: 2

### 免登录操作 todos

**步骤**:

1. 直接打开 /todos

**验证**: 自动登录为 Demo User，可直接增删改

**截图**: ![免登录操作 todos](../screenshots/matrix/todo/01-home.png)

### 登出态访问受保护接口（逆向）

**步骤**:

1. 清空 localStorage 后无 token 请求 /api/todos 写接口

**验证**: 返回 401，REST 层要求认证（页面自动登录为 demo 特性，接口层不放松）

---

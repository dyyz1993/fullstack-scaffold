# UI 验收测试计划

> **For Claude:** 使用 agent-browser 执行 UI 自动化验收测试。

**Goal:** 通过 agent-browser 对模板项目进行端到端 UI 验收，验证所有核心业务流程。

**Architecture:** 启动 dev server → agent-browser 逐 case 执行 → 每步截图+断言 → 汇总报告

**Tech Stack:** agent-browser 0.11.0 + Chromium + Vite dev server (port 3010)

---

## 前置准备

### 1. 启动 Dev Server

```bash
cd /Users/xuyingzhou/Project/create-biomimic-app/template
export AGENT_BROWSER_EXECUTABLE_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium
npm run dev -- --port 3010 &
```

- Client (web): http://localhost:3010
- Ops (admin): http://localhost:3010/ops.html
- Health: http://localhost:3010/health

### 2. 测试账号

| 角色             | Token                    | 用途             |
| ---------------- | ------------------------ | ---------------- |
| SUPER_ADMIN      | `admin-token`            | 全权限操作       |
| CUSTOMER_SERVICE | `customer-service-token` | 有限权限         |
| USER             | `user-token`             | 低权限，验证 403 |

---

## Case 列表（按优先级排序）

### Case B1: Auth→RBAC→审计 全链路 ⭐⭐⭐⭐⭐

**目标:** 验证登录→权限→审计日志完整流程

**步骤:**

1. 打开 ops 后台 http://localhost:3010/ops.html
2. 截图验证：看到登录页面（有用户名/密码输入框）
3. 输入 admin / 123456，点击登录
4. 截图验证：跳转到 Dashboard 页面（看到统计卡片）
5. 导航到"角色管理"页面
6. 截图验证：看到角色列表（super_admin/customer_service/user）
7. 导航到"系统日志"页面
8. 截图验证：看到审计日志列表（有 action/resourceType 列）
9. 退出登录
10. 验证回到登录页

**系统覆盖:** Auth middleware, JWT, RBAC, Audit log, Ops UI

---

### Case B2: 订单→工单→纠纷 跨模块生命周期 ⭐⭐⭐⭐⭐

**目标:** 验证 Ops 后台三大业务模块的 CRUD + 状态流转

**步骤:**

1. 登录 ops 后台（admin-token）
2. 导航到"订单管理"
3. 截图验证：看到订单列表页（有创建按钮）
4. 点击"创建订单"，填写表单，提交
5. 截图验证：新订单出现在列表，状态为"待处理"
6. 点击"处理"按钮，确认
7. 截图验证：订单状态变为"处理中"
8. 导航到"工单管理"
9. 创建工单（关联上面的订单）
10. 截图验证：工单出现
11. 点击"回复"，输入回复内容，提交
12. 截图验证：回复内容显示
13. 点击"关闭"工单
14. 导航到"纠纷管理"
15. 创建纠纷
16. 截图验证：纠纷出现
17. 点击"解决"，输入解决方案，提交
18. 截图验证：纠纷状态变为"已解决"
19. 导航到"系统日志"
20. 验证：日志中有 order/ticket/dispute 相关记录

**系统覆盖:** Order CRUD + 状态机, Ticket CRUD + 回复, Dispute CRUD + 解决, Audit log

---

### Case B3: 多租户隔离全链路 ⭐⭐⭐⭐⭐

**目标:** 验证租户创建→邀请→跨租户隔离

**步骤:**

1. 打开 Client http://localhost:3010
2. 导航到 /tenants
3. 截图验证：看到租户列表页
4. 点击"创建租户"，填写名称和 slug，提交
5. 截图验证：新租户出现在列表
6. 点击租户，进入详情
7. 导航到"成员"子页
8. 截图验证：看到自己是 owner
9. 点击"邀请成员"，输入邮箱，选择角色，提交
10. 导航到"角色"子页
11. 截图验证：看到租户角色列表
12. 导航到"设置"子页
13. 截图验证：看到租户设置表单

**系统覆盖:** Tenant CRUD, 成员管理, 角色管理, 邀请系统, 租户隔离

---

### Case B5: 文件上传+公开/私有访问 ⭐⭐⭐⭐

**目标:** 验证文件上传→公开访问→签名URL流程

**步骤:**

1. 打开 Client http://localhost:3010/todos
2. 创建一个 todo
3. 找到上传按钮/区域
4. 上传一个测试文件
5. 截图验证：看到附件信息（文件名、大小）
6. 通过 API 验证公开文件可访问: GET /files/public/...
7. 通过 API 验证签名 URL 生成: POST /api/generate-url
8. 验证签名 URL 可访问文件内容

**系统覆盖:** 文件上传, 公开文件服务, 签名 URL, 附件管理

---

### Case R1: WebSocket 多客户端广播 ⭐⭐⭐⭐

**目标:** 验证 WebSocket 连接→echo→broadcast

**步骤:**

1. 打开 Tab A → http://localhost:3010/websocket
2. 截图验证：看到 WebSocket 页面（连接状态=断开）
3. 点击"连接"
4. 截图验证：状态变为"已连接"
5. 输入消息，点击"发送 Echo"
6. 截图验证：收到 echo 回复
7. 点击"发送 Ping"
8. 截图验证：收到 pong 回复
9. 点击"发送 Broadcast"
10. 截图验证：收到 broadcast 消息
11. 点击"断开"
12. 截图验证：状态变为"已断开"

**系统覆盖:** WebSocket 协议 (echo/ping/broadcast), 连接管理, 状态管理

---

### Case O1: Dashboard + 系统监控 + 设置 ⭐⭐⭐⭐⭐

**目标:** 验证 Ops 后台仪表盘数据展示和系统管理功能

**步骤:**

1. 登录 ops 后台
2. 截图验证：Dashboard 显示统计卡片（用户数、订单数等）
3. 导航到"系统监控"
4. 截图验证：显示运行时间、内存、DB 状态
5. 导航到"系统设置"
6. 截图验证：显示设置表单
7. 修改设置值，保存
8. 截图验证：保存成功提示
9. 刷新页面，验证设置值持久化
10. 导航到"权限管理"
11. 截图验证：显示权限树/列表
12. 导航到"角色管理"
13. 截图验证：显示角色列表
14. 查看角色详情的权限分配
15. 截图验证：看到权限 checkbox

**系统覆盖:** Dashboard 统计, Monitor 监控, Settings CRUD, Permission 管理, Role 管理

---

### Case X1: 终极跨模块联动 - Client+Ops 联合验证 ⭐⭐⭐⭐⭐

**目标:** 验证 Client 创建 Todo → Ops 管理员看到数据 → 审计日志记录

**步骤:**

1. Client 端:
   - 打开 http://localhost:3010/todos
   - 创建 todo "E2E 验收测试"
   - 截图验证：todo 出现在列表
   - 修改状态为 "completed"
   - 截图验证：状态已更新
2. Ops 端:
   - 打开 http://localhost:3010/ops.html
   - 登录 admin
   - 导航到 Dashboard
   - 截图验证：统计数字包含新创建的 todo
3. 通知联动:
   - Client 端打开 /notifications
   - 截图验证：通知页面正常加载
4. WebSocket 联动:
   - Client 端打开 /websocket
   - 连接，发送 echo
   - 截图验证：收到回复

**系统覆盖:** Client CRUD, Ops Dashboard 数据同步, SSE 通知, WebSocket

---

## 执行策略

1. **先启动 dev server**（后台进程）
2. **每个 Case 独立子任务**，使用 `agent-browser --session case-xxx` 隔离
3. **每步截图**保存到 `docs/screenshots/case-xxx/`
4. **记录 Pass/Fail** 及具体原因
5. **最后汇总验收报告**到 `docs/plans/acceptance-report.md`

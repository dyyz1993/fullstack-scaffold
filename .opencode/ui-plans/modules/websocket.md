# 模块：WebSocket

## 信息

- **URL**: http://localhost:5175/websocket
- **优先级**: P1
- **状态**: 待测试

## 测试用例

- [ ] 用例1：页面加载时 WebSocket 状态显示 Closed
- [ ] 用例2：点击 Connect 连接 WebSocket，状态变为 Open
- [ ] 用例3：发送 Echo RPC 消息，验证收到回复
- [ ] 用例4：发送 Ping RPC，验证收到 Pong 回复
- [ ] 用例5：点击 Disconnect 断开 WebSocket，状态变为 Closed

## 执行记录

| 用例            | 状态    | 耗时 | Bug     | 备注             |
| --------------- | ------- | ---- | ------- | ---------------- |
| TC1: 初始WS状态 | PASS    | 3s   | -       | Closed           |
| TC2: 连接WS     | BLOCKED | 5s   | ENV-001 | Vite dev不支持WS |
| TC3: Echo RPC   | SKIP    | -    | ENV-001 | 依赖TC2          |
| TC4: Ping RPC   | SKIP    | -    | ENV-001 | 依赖TC2          |
| TC5: 断开WS     | SKIP    | -    | ENV-001 | 依赖TC2          |

## 发现的问题

**ENV-001**: Vite dev server 不支持 WebSocket upgrade

- 不是代码Bug，是环境限制
- 生产模式（npm run preview）可正常工作

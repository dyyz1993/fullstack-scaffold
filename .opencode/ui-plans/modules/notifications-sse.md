# 模块：SSE 通知

## 信息

- **URL**: http://localhost:5175/notifications
- **优先级**: P1
- **状态**: 待测试

## 测试用例

- [ ] 用例1：页面加载时 SSE 状态显示 Disconnected
- [ ] 用例2：点击 Connect 连接 SSE，状态变为 Connected
- [ ] 用例3：创建通知（选择类型+填写标题+消息），验证通知出现在列表中
- [ ] 用例4：创建通知后未读计数增加
- [ ] 用例5：点击 Mark All Read 清除未读计数
- [ ] 用例6：点击 Disconnect 断开 SSE，状态变为 Disconnected

## 执行记录

| 用例             | 状态 | 耗时 | Bug | 备注         |
| ---------------- | ---- | ---- | --- | ------------ |
| TC1: 初始SSE状态 | PASS | 2s   | -   | Disconnected |
| TC2: 连接SSE     | PASS | 3s   | -   | Connected    |
| TC3: 创建通知    | PASS | 5s   | -   | 通知出现     |
| TC4: 未读计数    | PASS | 1s   | -   | count=2      |
| TC5: 标记已读    | PASS | 2s   | -   | count=0      |
| TC6: 断开SSE     | PASS | 2s   | -   | Disconnected |

## 发现的问题

无Bug

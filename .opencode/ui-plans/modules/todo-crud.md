# 模块：Todo CRUD

## 信息

- **URL**: http://localhost:5175/todos
- **优先级**: P0
- **状态**: 待测试

## 测试用例

- [ ] 用例1：显示 Todo 列表页面，包含标题输入框和 Add Todo 按钮
- [ ] 用例2：创建新 Todo（仅标题），验证出现在列表中
- [ ] 用例3：创建新 Todo（标题+描述），验证标题和描述都显示
- [ ] 用例4：空标题时 Add Todo 按钮应禁用
- [ ] 用例5：状态筛选 - 点击 Pending 筛选，仅显示 Pending 状态的 Todo
- [ ] 用例6：状态筛选 - 点击 Completed 筛选，仅显示 Completed 状态的 Todo
- [ ] 用例7：状态筛选 - 点击 All 显示所有 Todo
- [ ] 用例8：更改 Todo 状态（Pending → In Progress），验证状态更新
- [ ] 用例9：删除 Todo，验证从列表中消失
- [ ] 用例10：Todo 计数器显示正确的总数

## 执行记录

| 用例                     | 状态 | 耗时 | Bug | 备注                 |
| ------------------------ | ---- | ---- | --- | -------------------- |
| TC1: 页面加载            | PASS | 5s   | -   | 所有元素可见         |
| TC2: 创建Todo(标题)      | PASS | 8s   | -   | 输入框自动清空       |
| TC3: 创建Todo(标题+描述) | PASS | 8s   | -   | 描述正确显示         |
| TC4: 空标题禁用按钮      | PASS | 5s   | -   | disabled状态正确切换 |
| TC5: Pending筛选         | PASS | 8s   | -   | 仅显示Pending        |
| TC6: Completed筛选       | PASS | 3s   | -   | 无已完成项           |
| TC7: All筛选             | PASS | 3s   | -   | 所有项可见           |
| TC8: 更改状态            | PASS | 5s   | -   | pending→in_progress  |
| TC9: 删除Todo            | PASS | 5s   | -   | 计数3→2              |
| TC10: 计数器             | PASS | 3s   | -   | Total:2正确          |

## 发现的问题

无Bug

# ChatPage 工具调用展示调研计划

## 背景
用户询问 ChatPage 是否展示了工具调用。经初步调研，代码链路完整。

## 待确认事项
1. 后端是否正确发送 `pi-tool-start` / `pi-tool-end` SSE 事件
2. `hasToolCalls` 计算逻辑是否正确
3. 实际运行时工具调用是否真正显示

## 调研步骤
1. 检查后端 SSE 事件发送逻辑
2. 检查 `hasToolCalls` 的实现
3. 如需要，运行应用进行实际验证

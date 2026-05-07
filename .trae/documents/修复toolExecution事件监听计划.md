# 修复 PI SDK 工具调用事件监听计划

## 问题
PI SDK 有两个层级的工具事件：
1. `AssistantMessageEvent.toolcall_start/end` - LLM 流式输出工具调用参数（可能不触发）
2. `AgentEvent.tool_execution_start/end` - 工具实际执行开始/结束（始终触发）

当前代码只监听了 `toolcall_start/end`（在 `message_update` 内部），没有监听 `tool_execution_start/end`。

## 修复步骤

### 1. 修改 llm-service.ts - 添加 tool_execution_start/end 事件监听
在 `session.subscribe` 的事件处理中添加：
- `tool_execution_start` → 调用 `callbacks.onToolStart`
- `tool_execution_end` → 调用 `callbacks.onToolEnd`

### 2. 确认修复后的数据流
1. `tool_execution_start` 事件触发 `onToolStart` → 发送 `pi-tool-start` SSE
2. `tool_execution_end` 事件触发 `onToolEnd` → 发送 `pi-tool-end` SSE
3. 前端收到事件并更新 UI

## 待修复文件
- `/Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-agent/services/llm-service.ts`

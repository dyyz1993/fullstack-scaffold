# 重构历史消息 Tools 解析方案

## 问题分析

通过调研 pi 库的文档，发现了**根本问题**：

### pi 的 JSONL 格式
pi 保存的 JSONL 文件格式如下：

1. **AssistantMessage 包含 ToolCall**：
```json
{
  "type": "message",
  "id": "b2c3d4e5",
  "parentId": "a1b2c3d4",
  "timestamp": "2024-12-03T14:00:02.000Z",
  "message": {
    "role": "assistant",
    "content": [
      {"type": "text", "text": "Hi!"},
      {"type": "toolCall", "id": "call_123", "name": "bash", "arguments": {"command": "ls"}}
    ],
    "provider": "anthropic",
    "model": "claude-sonnet-4-5",
    "stopReason": "toolUse"
  }
}
```

2. **ToolResultMessage 是独立的消息**：
```json
{
  "type": "message",
  "id": "c3d4e5f6",
  "parentId": "b2c3d4e5",
  "timestamp": "2024-12-03T14:00:03.000Z",
  "message": {
    "role": "toolResult",
    "toolCallId": "call_123",
    "toolName": "bash",
    "content": [{"type": "text", "text": "output"}],
    "isError": false
  }
}
```

### 核心问题
**ToolResult 是独立的消息行，不是嵌套在 ToolCall 里的！**

当前代码的问题：
1. 只解析了 `toolCall` 块，但没有 `result`
2. `toolResult` 消息被忽略了
3. 需要通过 `toolCallId` 关联 `toolCall` 和 `toolResult`

## [x] 任务 1：重构 getMessages 函数
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 第一遍扫描：收集所有 assistant 消息的 toolCalls
  - 第二遍扫描：处理 toolResult 消息，通过 toolCallId 关联到对应的 toolCall
  - 返回合并后的消息列表
- **Success Criteria**:
  - ToolCalls 能正确解析
  - ToolResults 能通过 toolCallId 正确关联
  - 结果填充到对应 toolCall 的 result 字段
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证 toolCalls 数组包含 id, name, arguments
  - `programmatic` TR-1.2: 验证 toolResult 通过 toolCallId 正确关联
  - `programmatic` TR-1.3: 验证 result 字段正确填充
  - `human-judgement` TR-1.4: 前端 UI 能正确显示工具卡片和结果

## [x] 任务 2：更新 ChatMessage 类型定义
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 确保 ChatMessage.toolCalls 的类型定义正确
  - 包含 id, name, args, result, error 字段
- **Success Criteria**:
  - 类型定义与 pi 的格式一致
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript 编译通过

## [x] 任务 3：更新前端组件显示
- **Priority**: P1
- **Depends On**: Task 1
- **Description**:
  - 确保 RoundCard 组件能正确显示 toolCalls 和 results
  - 当前组件已经支持，只需验证数据格式正确
- **Success Criteria**:
  - 工具卡片正确显示
  - 结果正确渲染
- **Test Requirements**:
  - `human-judgement` TR-3.1: UI 显示正确

## 实现细节

### 新的解析逻辑伪代码

```typescript
const messages: ChatMessage[] = []
const toolCallMap = new Map<string, { messageId: string; toolCall: ToolCall }>()

// 第一遍：处理所有消息
for (const line of lines) {
  const entry = JSON.parse(line)
  
  if (entry.type === 'message') {
    const msg = entry.message
    
    if (msg.role === 'user') {
      messages.push({
        id: entry.id,
        role: 'user',
        content: extractTextContent(msg.content),
        createdAt: entry.timestamp
      })
    } else if (msg.role === 'assistant') {
      const toolCalls = extractToolCalls(msg.content)
      
      // 记录 toolCallId 到 messageId 的映射
      toolCalls.forEach(tc => {
        toolCallMap.set(tc.id, { messageId: entry.id, toolCall: tc })
      })
      
      messages.push({
        id: entry.id,
        role: 'agent',
        content: extractTextContent(msg.content),
        thinking: extractThinking(msg.content),
        toolCalls: toolCalls,
        createdAt: entry.timestamp
      })
    } else if (msg.role === 'toolResult') {
      // 处理 toolResult，关联到对应的 toolCall
      const mapping = toolCallMap.get(msg.toolCallId)
      if (mapping) {
        // 将 result 填充到对应的 toolCall
        mapping.toolCall.result = extractTextContent(msg.content)
        if (msg.isError) {
          mapping.toolCall.error = 'Tool execution failed'
        }
      }
    }
  }
}
```

## Notes
- 关键是要理解 pi 的消息模型：ToolCall 和 ToolResult 是分开的消息
- 需要通过 toolCallId 进行关联
- 这与实时流式传输不同（实时时 toolResult 会通过事件发送）

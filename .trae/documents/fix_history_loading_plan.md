# 历史消息加载和工具渲染问题 - 深度分析与重构计划

## 问题根因分析

### 问题 1：只展示最后一轮（分页问题）

**根本原因**：`parseSessionJsonl` 返回的消息包含 `toolResult`，但 `getMessages` 只处理 `user` 和 `assistant`！

```
session.jsonl 内容：
- user message (1)
- assistant message with toolCall (2)
- toolResult message (3)  <-- 这个也被返回了！
- assistant message (4)
- user message (5)

parseSessionJsonl 返回：5 条消息（包含 toolResult）
getMessages 处理后：3 条消息（过滤掉了 toolResult）

分页逻辑：
- offset=0, limit=20
- slice(0, 20) 返回 5 条原始消息
- 过滤后只剩 3 条
- 前端判断 hasMore = 3 === 20 ? false
- 结果：hasMore = false，无法加载更多！
```

### 问题 2：工具渲染问题

**根本原因**：`toolResult` 消息被添加到 `messages` 数组，但 `getMessages` 忽略了它！

```typescript
// session-parser.ts
messages.push(msg)  // toolResult 也被 push 了！

// agent-service.ts
if (msg.role === 'user') { ... }
else if (msg.role === 'assistant') { ... }
// toolResult 被忽略了！
```

虽然 `toolCall.result` 被正确设置了，但是：
1. `toolResult` 消息本身被添加到数组，干扰了分页计数
2. 分页逻辑基于原始消息数量，而不是过滤后的数量

### 问题 3：架构混乱

**当前架构的问题**：
```
session.jsonl
    │
    └──► parseSessionJsonl() ──► PiMessage[] (包含 toolResult)
              │
              └──► getMessages() ──► 过滤 toolResult ──► ChatMessage[]
                                              │
                                              └──► 分页 slice()
```

**问题**：
1. `parseSessionJsonl` 返回了不需要的 `toolResult` 消息
2. 分页在过滤之后做，导致数量不一致
3. 多层转换，逻辑混乱

## [x] 任务 1：重构 parseSessionJsonl，不返回 toolResult
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - `parseSessionJsonl` 只返回 `user` 和 `assistant` 消息
  - `toolResult` 只用于关联 `toolCall`，不添加到返回数组
  - 确保分页计数正确
- **Success Criteria**:
  - 返回的消息数量与实际显示的消息数量一致
  - 分页逻辑正确
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证返回的消息只有 user 和 assistant
  - `programmatic` TR-1.2: 验证 toolCall.result 正确设置

## [x] 任务 2：简化 getMessages，移除不必要的过滤
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 由于 `parseSessionJsonl` 已经不返回 `toolResult`，`getMessages` 不需要过滤
  - 直接转换格式即可
- **Success Criteria**:
  - 代码简洁，逻辑清晰
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript 编译通过

## [x] 任务 3：验证分页逻辑
- **Priority**: P0
- **Depends On**: Task 1, Task 2
- **Description**:
  - 确保 `hasMoreMessages` 判断正确
  - 确保滚动加载更多正常工作
- **Success Criteria**:
  - 分页加载正常
  - 可以加载所有历史消息
- **Test Requirements**:
  - `human-judgement` TR-3.1: 验证可以滚动加载更多
  - `human-judgement` TR-3.2: 验证所有历史消息都能加载

## [x] 任务 4：验证工具渲染
- **Priority**: P0
- **Depends On**: Task 1, Task 2
- **Description**:
  - 确保 `toolCalls` 正确传递到前端
  - 确保工具卡片正确渲染
- **Success Criteria**:
  - 历史消息中的工具调用正确显示
  - 工具结果正确显示
- **Test Requirements**:
  - `human-judgement` TR-4.1: 验证工具卡片正确显示

## 实现细节

### 修改 parseSessionJsonl

```typescript
export function parseSessionJsonl(userId: string): PiMessage[] {
  // ... 读取文件 ...

  const messages: PiMessage[] = []
  const toolCallMap = new Map<string, PiToolCall>()

  for (const line of lines) {
    const entry = JSON.parse(line) as PiSessionLine
    
    if (entry.type === 'message' && entry.message) {
      const msg = entry.message
      
      if (msg.role === 'user' || msg.role === 'assistant') {
        // 只添加 user 和 assistant，不添加 toolResult
        messages.push(msg)
      }
      
      if (msg.role === 'assistant') {
        // 收集 toolCalls
        for (const block of msg.content) {
          if (block.type === 'toolCall') {
            toolCallMap.set(block.id, block)
          }
        }
      } else if (msg.role === 'toolResult') {
        // 关联 toolResult 到对应的 toolCall
        const toolCall = toolCallMap.get(msg.toolCallId)
        if (toolCall) {
          (toolCall as any).result = msg.content
          if (msg.isError) {
            (toolCall as any).error = 'Tool execution failed'
          }
        }
      }
    }
  }

  return messages  // 只包含 user 和 assistant
}
```

### 简化 getMessages

```typescript
export async function getMessages(
  agentId: string,
  userId: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[]> {
  const piMessages = parseSessionJsonl(userId)
  
  // 先分页，再转换
  let pagedMessages = piMessages
  if (limit !== undefined || offset !== undefined) {
    const start = offset || 0
    const end = limit !== undefined ? start + limit : undefined
    pagedMessages = piMessages.slice(start, end)
  }
  
  // 转换格式
  return pagedMessages.map(msg => {
    if (msg.role === 'user') {
      return {
        id: `msg-${msg.timestamp}`,
        agentId,
        role: 'user',
        content: extractTextContent(msg.content),
        createdAt: new Date(msg.timestamp).toISOString(),
      }
    } else {
      // assistant
      return {
        id: `msg-${msg.timestamp}`,
        agentId,
        role: 'agent',
        content: extractTextContent(msg.content),
        thinking: extractThinking(msg.content),
        toolCalls: extractToolCalls(msg.content),
        createdAt: new Date(msg.timestamp).toISOString(),
      }
    }
  })
}
```

## Notes
- 关键是 `parseSessionJsonl` 不返回 `toolResult` 消息
- 分页应该在转换之前做
- 保持代码简洁，减少不必要的转换层

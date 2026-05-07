# 历史消息数据丢失问题 - 根因分析

## 问题概述

用户反馈：获取历史消息时看不到工具调用等数据，与实时展示的消息不一致。

---

## 问题根因：数据来源不一致

### 实时消息流（SSE）

```
pi-coding-agent
    ↓
chat-session-manager.ts
    ↓ onToolStart → SSE: pi-tool-start
    ↓ onToolEnd → SSE: pi-tool-end
    ↓ onThinkingDelta → SSE: pi-thinking-delta
    ↓ onTextDelta → SSE: pi-text-delta
    ↓
前端 agentStore
    ↓ updateMessageContent / addToolCall / updateMessageThinking
    ↓
展示 (RoundCard)
```

**实时消息的特点**：
- 工具调用通过 SSE 事件 `pi-tool-start` / `pi-tool-end` 实时发送
- Thinking 通过 SSE 事件 `pi-thinking-delta` 实时发送
- 这些事件通过 `agentStore` 的 actions 存储到 messages 数组

### 历史消息流（getMessages）

```
JSONL 文件 (.pi/sessions/{userId}/*.jsonl)
    ↓
agent-service.ts getMessages()
    ↓ 只解析 msg.content 中 type='text' 的块
    ↓ 忽略 type='toolCall' 和 type='thinking' 的块
    ↓
前端展示
```

**问题**：`getMessages` 从 JSONL 读取时，只提取了文本内容，**丢失了工具调用和 thinking**！

---

## JSONL 实际数据结构

从 JSONL 文件可以看到，assistant 消息的 `content` 数组包含多种类型的块：

```json
{
  "type": "message",
  "message": {
    "role": "assistant",
    "content": [
      { "type": "text", "text": "让我查看..." },
      { "type": "thinking", "thinking": "用户问的是..." },
      { "type": "toolCall", "id": "call_xxx", "name": "bash", "arguments": {...} },
      { "type": "toolResult", "toolUseId": "call_xxx", "result": "..." }
    ]
  }
}
```

### 当前 getMessages 解析逻辑（错误）

```typescript
// agent-service.ts 第 155-162 行
if (Array.isArray(msg.content)) {
  for (const block of msg.content) {
    if (block.type === 'text') {  // ❌ 只提取 text
      content += block.text
    }
    // ❌ 忽略了 thinking 和 toolCall
  }
}
```

### 当前代码尝试解析 toolCalls（第 168-175 行）

```typescript
if (msg.toolCalls && Array.isArray(msg.toolCalls)) {  // ❌ msg.toolCalls 是 undefined！
  toolCalls = msg.toolCalls.map(...)
}
```

**问题**：JSONL 中工具调用信息在 `content` 数组中，而不是 `msg.toolCalls` 字段！

---

## 数据源双重标准

### 实时消息
- **数据源**：pi-coding-agent SSE 事件
- **工具调用**：通过 `onToolStart` / `onToolEnd` 回调获取
- **存储**：前端 agentStore（内存）

### 历史消息
- **数据源**：JSONL 文件 + 数据库 chat_messages 表
- **工具调用**：从 JSONL 读取但解析错误
- **存储**：前端 agentStore.messages

### 数据库 vs JSONL

当前代码存在**两个数据源**的混淆：

| 数据源 | 存储内容 | 读取方式 |
|--------|----------|----------|
| JSONL | 完整会话日志（含 toolCall 块） | getMessages() - 解析不完整 |
| chat_messages 表 | 只存最终消息（content + thinking） | 无读取逻辑 |

**关键发现**：`createMessage` 只在消息结束时存储最终 content，**不存储工具调用详情**！

---

## 修复方案

### 方案 A：从 JSONL 正确解析（推荐）

修改 `agent-service.ts` 的 `getMessages` 函数：

```typescript
// 1. 提取 thinking
if (Array.isArray(msg.content)) {
  for (const block of msg.content) {
    if (block.type === 'text') {
      content += block.text
    } else if (block.type === 'thinking') {
      thinking = block.thinking
    } else if (block.type === 'toolCall') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        args: block.arguments,
        result: null,  // toolResult 在下一条消息
      })
    } else if (block.type === 'toolResult') {
      // 匹配到对应的 toolCall 并更新 result
    }
  }
}
```

### 方案 B：统一数据源到数据库

修改 `createMessage` 调用时机，实时存储所有中间状态。

### 方案 C：SSE 历史回放

前端连接 SSE 后，先请求历史消息（完整结构），再接收实时更新。

---

## 实施建议

**推荐方案 A + C**：
1. 修复 JSONL 解析逻辑，正确提取 thinking 和 toolCalls
2. 前端获取历史消息后，作为初始状态处理
3. 实时 SSE 事件覆盖/更新对应消息

---

## 验证方法

1. 调用 `/api/agents/{id}/messages` 获取历史消息
2. 检查返回的 JSON 中是否包含 `thinking` 和 `toolCalls` 字段
3. 与实时 SSE 事件中的数据结构对比

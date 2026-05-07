# 工具调用不显示问题深度调研报告

## 问题描述

用户反馈历史消息中的工具调用不显示。需要调研是前端还是后端过滤掉了数据。

## 调研发现

### 1. 后端数据流分析

#### session-parser.ts 中的问题

**根本原因找到了！**

**问题在于 `parseAssistantSubRounds` 函数无法获取 toolCall 的 result！**

数据流分析：

1. **`parseSessionJsonl` 函数** (第 18-88 行)：
   - 创建了 `toolCallMap` 来存储 toolCall 和对应的 result
   - 第 60-66 行：解析 assistant 消息时，把 toolCall 存入 map
   - 第 67-76 行：解析 toolResult 消息时，更新 map 中对应 toolCall 的 result
   - **但是！这个 map 只在函数内部使用，从未传递给 `parseAssistantSubRounds`！**

2. **`parseAssistantSubRounds` 函数** (第 90-135 行)：
   - 接收 `PiAssistantMessage` 参数
   - 第 112-123 行处理 toolCall block
   - **问题：它只能访问原始的 assistant message，其中 toolCall block 没有 result！**
   - result 信息存储在单独的 toolResult 消息中，而不是在 assistant message 里

3. **`agent-service.ts` 的 `getMessages` 函数** (第 109-149 行)：
   - 第 135 行调用 `parseAssistantSubRounds(msg, msg.timestamp)`
   - **没有传递 toolCallMap！**

### 2. 数据结构分析

从 jsonl 文件中可以看到，数据结构是：

```json
// assistant 消息
{"type":"message","message":{"role":"assistant","content":[
  {"type":"thinking","thinking":"..."},
  {"type":"toolCall","id":"call_xxx","name":"bash","arguments":{...}}
]}}

// toolResult 消息（单独的消息！）
{"type":"message","message":{"role":"toolResult","toolCallId":"call_xxx","content":[...]}}
```

**关键发现：toolResult 是单独的消息，不是 assistant 消息的一部分！**

### 3. 前端渲染分析

前端代码是正确的：
- `RoundCard.tsx` 第 128 行正确检查 `subRound.toolCalls && subRound.toolCalls.length > 0`
- 问题是后端返回的 `toolCalls` 数组中，每个 toolCall 没有 `result` 字段

## 根本原因

**`toolCallMap` 在 `parseSessionJsonl` 中构建，但没有传递给 `parseAssistantSubRounds`！**

导致 `parseAssistantSubRounds` 无法获取 toolCall 的 result 信息。

## 修复方案

### 方案：修改 session-parser.ts

1. 让 `parseSessionJsonl` 返回 `toolCallMap`
2. 让 `parseAssistantSubRounds` 接收 `toolCallMap` 参数
3. 在 `agent-service.ts` 中正确传递 `toolCallMap`

### 具体修改

1. **session-parser.ts**：
   - 修改 `parseSessionJsonl` 返回 `{ messages, toolCallMap }`
   - 修改 `parseAssistantSubRounds` 接收 `toolCallMap` 参数

2. **agent-service.ts**：
   - 从 `parseSessionJsonl` 获取 `toolCallMap`
   - 传递给 `parseAssistantSubRounds`


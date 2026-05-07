# 消息轮次问题分析报告

## 问题确认

**用户反馈的问题确实存在！** 当前代码存在严重的消息轮次合并问题。

## 问题详细分析

### 1. 后端解析问题 (`agent-service.ts` 第 134-161 行)

```typescript
// 问题代码
for (const block of msg.content) {
  if (block.type === 'text') {
    content += block.text  // ❌ 累加所有文本，无法区分多轮
  } else if (block.type === 'thinking') {
    thinking = block.thinking  // ❌ 只保留最后一个 thinking，丢失之前的
  } else if (block.type === 'toolCall') {
    toolCalls.push(...)  // ❌ 累加所有 toolCalls，无法区分属于哪一轮
  }
}
```

**问题：**
- 一个 `PiAssistantMessage` 可能包含多轮思考（AI 调用工具后继续思考）
- 但代码把所有内容合并成一个 `ChatMessage`
- `thinking` 字段只保留最后一个，丢失了之前的思考过程
- `content` 累加所有文本，无法区分是哪一轮产生的
- `toolCalls` 累加所有工具调用，无法区分属于哪一轮

### 2. 前端渲染问题 (`ChatArea.tsx` 第 37-51 行)

```typescript
// 问题代码
for (const msg of messages) {
  if (msg.role === 'user') {
    currentRound = { userMessage: msg, agentMessage: null }
    result.push(currentRound)
  } else if (msg.role === 'agent' && currentRound) {
    currentRound.agentMessage = msg  // ❌ 只保留最后一个 agent 消息
  }
}
```

**问题：**
- 假设一轮对话只有一个 user + 一个 agent
- 如果有多个连续的 agent 消息，只有最后一个会被显示
- 丢失了中间的 agent 响应

### 3. 数据结构问题

**当前 `ChatMessage` 类型定义：**
```typescript
interface ChatMessage {
  id: string
  agentId: string
  role: 'user' | 'agent'
  content: string
  thinking?: string      // 只能存一个 thinking
  toolCalls?: ToolCall[] // 无法区分轮次
  ...
}
```

**问题：**
- 无法表达多轮思考
- 无法区分工具调用属于哪一轮

## 正确的轮次概念

### 一个完整的"轮次"应该包含：

1. **用户输入** (user message)
2. **AI 响应** (可能包含多个"子轮次")：
   - 子轮次 1：思考 → 工具调用
   - 子轮次 2：工具结果 → 思考 → 工具调用
   - 子轮次 N：思考 → 最终内容

### 实际场景示例

```
用户: 帮我查询北京今天的天气

AI 响应（一个大循环）:
  子轮次 1:
    - thinking: "我需要调用天气 API..."
    - toolCall: get_weather(city="北京")
  
  子轮次 2:
    - thinking: "获取到天气数据，现在需要格式化..."
    - content: "北京今天天气晴朗，温度 25°C..."
```

**当前代码的问题：**
- 两个 `thinking` 被合并成一个（只保留最后一个）
- 无法区分工具调用和最终内容属于哪个子轮次

## 修复方案

### 方案概述

需要重新设计数据结构，支持"子轮次"概念：

```typescript
// 新的类型定义
interface AgentSubRound {
  id: string
  thinking?: string
  toolCalls?: ToolCall[]
  content?: string
  createdAt: string
}

interface ChatMessage {
  id: string
  agentId: string
  role: 'user' | 'agent'
  // user message
  content?: string
  // agent message (支持多子轮次)
  subRounds?: AgentSubRound[]
  createdAt: string
  isStreaming?: boolean
  error?: ChatError
}
```

### 需要修改的文件

1. **`types.ts`** - 更新类型定义
2. **`session-parser.ts`** - 解析时识别子轮次边界
3. **`agent-service.ts`** - 返回正确的子轮次数据
4. **`RoundCard.tsx`** - 渲染多个子轮次
5. **`ChatMessageCard.tsx`** - 可能需要调整或废弃
6. **`agentStore.ts`** - 更新状态管理逻辑
7. **SSE 相关代码** - 更新实时推送逻辑

## 下一步

等待用户确认后，我将按照上述方案进行实现。

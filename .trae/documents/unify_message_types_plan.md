# 历史消息类型系统调研报告

## 调研结论

### 问题根因
**存在两套不同的类型系统和解析逻辑，导致数据结构不一致！**

### 类型系统分析

#### 1. SessionMessage（llm-service.ts:17-21）
```typescript
export interface SessionMessage {
  role: 'user' | 'agent'
  content: string
  timestamp: number
}
```
- **用途**：给 LLM 用的简化格式
- **解析方式**：`parsed.role === 'user' || parsed.role === 'assistant'`
- **问题**：忽略 `toolResult`，将 content 强制转为 string

#### 2. ChatMessage（schemas.ts:5-29）
```typescript
export const ChatMessageSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  createdAt: z.string().datetime(),
  isStreaming: z.boolean().nullish(),
  thinking: z.string().nullish(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    args: z.record(z.string(), z.unknown()),
    result: z.unknown().nullish(),
    error: z.string().nullish(),
  })).nullish(),
  error: ...
})
```
- **用途**：给前端用的完整格式
- **解析方式**：支持 toolCalls 和 toolResult 关联
- **问题**：与 SessionMessage 格式不一致

### 数据流分析

```
session.jsonl
    │
    ├──► loadSessionHistory() ──► SessionMessage[] ──► LLM
    │    (llm-service.ts)
    │    解析方式：parsed.role === 'user' || 'assistant'
    │    忽略：toolResult
    │
    └──► getMessages() ──► ChatMessage[] ──► 前端
         (agent-service.ts)
         解析方式：支持 toolResult 关联
```

### 核心问题

1. **两套解析逻辑不一致**：
   - `loadSessionHistory` 忽略 `toolResult`
   - `getMessages` 支持 `toolResult`

2. **类型定义不统一**：
   - `SessionMessage` 是简化版
   - `ChatMessage` 是完整版

3. **数据来源相同但处理不同**：
   - 都读取 `session.jsonl`
   - 但解析逻辑完全不同

## [ ] 任务 1：统一类型定义
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 创建统一的 `PiMessage` 类型，基于 pi 的官方格式
  - 包含 user, assistant, toolResult 三种角色
  - 删除或废弃 SessionMessage 类型
- **Success Criteria**:
  - 只有一套类型定义
  - 类型与 pi 官方格式一致
- **Test Requirements**:
  - `programmatic` TR-1.1: TypeScript 编译通过

## [ ] 任务 2：统一解析逻辑
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 创建统一的 `parseSessionJsonl` 函数
  - 支持 user, assistant, toolResult 三种角色
  - 支持 toolCalls 和 toolResult 关联
- **Success Criteria**:
  - 只有一套解析逻辑
  - 所有地方使用相同的解析函数
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证解析结果一致

## [ ] 任务 3：重构 loadSessionHistory
- **Priority**: P0
- **Depends On**: Task 2
- **Description**:
  - 使用统一的解析函数
  - 返回完整的消息格式（包含 toolCalls）
  - LLM 调用时只取需要的字段
- **Success Criteria**:
  - loadSessionHistory 返回完整格式
  - LLM 调用时正确提取需要的字段
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证 LLM 调用正常
  - `human-judgement` TR-3.2: 验证对话历史正确

## [ ] 任务 4：重构 getMessages
- **Priority**: P0
- **Depends On**: Task 2
- **Description**:
  - 使用统一的解析函数
  - 转换为前端需要的 ChatMessage 格式
- **Success Criteria**:
  - getMessages 使用统一解析
  - 前端显示正确
- **Test Requirements**:
  - `human-judgement` TR-4.1: 前端 UI 显示正确

## 实现建议

### 统一的 PiMessage 类型

```typescript
// src/shared/modules/agent/pi-types.ts

export interface PiTextContent {
  type: 'text'
  text: string
}

export interface PiThinkingContent {
  type: 'thinking'
  thinking: string
}

export interface PiToolCall {
  type: 'toolCall'
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface PiImageContent {
  type: 'image'
  data: string
  mimeType: string
}

export interface PiUserMessage {
  role: 'user'
  content: string | (PiTextContent | PiImageContent)[]
  timestamp: number
}

export interface PiAssistantMessage {
  role: 'assistant'
  content: (PiTextContent | PiThinkingContent | PiToolCall)[]
  provider: string
  model: string
  usage: { input: number; output: number; ... }
  stopReason: 'stop' | 'length' | 'toolUse' | 'error' | 'aborted'
  timestamp: number
}

export interface PiToolResultMessage {
  role: 'toolResult'
  toolCallId: string
  toolName: string
  content: (PiTextContent | PiImageContent)[]
  isError: boolean
  timestamp: number
}

export type PiMessage = PiUserMessage | PiAssistantMessage | PiToolResultMessage
```

### 统一的解析函数

```typescript
// src/server/module-agent/services/session-parser.ts

export function parseSessionJsonl(userId: string): PiMessage[] {
  // 读取 session.jsonl
  // 解析每一行
  // 关联 toolCall 和 toolResult
  // 返回完整的 PiMessage[]
}
```

## Notes
- 关键是统一类型和解析逻辑
- 所有数据都来源于 session.jsonl
- 需要保持与 pi 官方格式一致

# 消息管理实现指南

## 目录

1. [消息数据结构](#消息数据结构)
2. [服务端实现](#服务端实现)
3. [客户端实现](#客户端实现)
4. [消息生命周期](#消息生命周期)

---

## 消息数据结构

### Schema 定义

```typescript
// src/shared/modules/agent/schemas.ts
import { z } from '@hono/zod-openapi'

// 消息角色
export const ChatMessageRoleSchema = z.enum(['user', 'agent', 'system'])

// 消息元数据
export const ChatMessageMetadataSchema = z.object({
  model: z.string().optional(),
  tokens: z
    .object({
      input: z.number().optional(),
      output: z.number().optional(),
    })
    .optional(),
  latency: z.number().optional(),
})

// 工具调用
export const ToolCallSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'error']),
  args: z.record(z.unknown()).optional(),
  result: z.unknown().nullish(),
  error: z.string().optional(),
})

// 消息 Schema
export const ChatMessageSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  role: ChatMessageRoleSchema,
  content: z.string(),
  metadata: ChatMessageMetadataSchema.optional(),
  thinking: z.string().nullish(),
  toolCalls: z.array(ToolCallSchema).nullish(),
  createdAt: z.string(),
})

// 类型导出
export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>
export type ChatMessageMetadata = z.infer<typeof ChatMessageMetadataSchema>
export type ToolCall = z.infer<typeof ToolCallSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
```

### 客户端消息类型

```typescript
// src/client/types.ts
import type { ChatMessage as SharedChatMessage, ToolCall } from '@shared/modules/agent'

export interface ChatMessage {
  id: string
  agentId: string
  content: string
  type: 'user' | 'agent' | 'system'
  timestamp: string
  metadata?: {
    model?: string
    tokens?: {
      input?: number
      output?: number
    }
    latency?: number
  }
  thinking?: string
  toolCalls?: ToolCall[]
  isStreaming?: boolean // 客户端特有：流式状态
}
```

---

## 服务端实现

### 1. 消息存储

```typescript
// src/server/module-agent/services/agent-service.ts

// 内存存储（开发环境）
interface MockChatMessage {
  id: string
  agentId: string
  userId: string
  role: 'user' | 'agent' | 'system'
  content: string
  thinking?: string
  toolCalls?: ToolCall[]
  createdAt: string
}

const mockMessages: MockChatMessage[] = []
let messageIdCounter = 0

// 发送消息
export async function sendMessageWithPI(
  agentId: string,
  userId: string,
  content: string
): Promise<{ userMessage: ChatMessage; agentMessageId: string }> {
  // 1. 创建用户消息
  const userMessage: MockChatMessage = {
    id: `msg-${Date.now()}-${messageIdCounter++}`,
    agentId,
    userId,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  }
  mockMessages.push(userMessage)

  // 2. 创建 Agent 消息占位
  const agentMessageId = `msg-${Date.now()}-${messageIdCounter++}`

  // 3. 获取 PI Session 并发送
  const session = await getOrCreateSession(userId, agentId)

  // 4. 通过 SSE 流式返回
  await session.sendMessage(content, {
    onTextDelta: (delta, isFinal) => {
      realtime.emitSSE(userId, 'pi-text-delta', {
        messageId: agentMessageId,
        delta,
        isFinal,
      })
    },
    onToolStart: toolCall => {
      realtime.emitSSE(userId, 'pi-tool-start', {
        messageId: agentMessageId,
        ...toolCall,
      })
    },
    onToolEnd: toolCall => {
      realtime.emitSSE(userId, 'pi-tool-end', {
        messageId: agentMessageId,
        ...toolCall,
      })
    },
    onComplete: fullContent => {
      // 保存完整消息到内存
      const agentMessage: MockChatMessage = {
        id: agentMessageId,
        agentId,
        userId,
        role: 'agent',
        content: fullContent,
        createdAt: new Date().toISOString(),
      }
      mockMessages.push(agentMessage)

      realtime.emitSSE(userId, 'pi-agent-end', {
        messageId: agentMessageId,
      })
    },
  })

  return { userMessage, agentMessageId }
}
```

### 2. 获取消息历史

```typescript
// src/server/module-agent/services/agent-service.ts

export async function getMessages(
  agentId: string,
  userId: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[]> {
  // 优先从 PI 会话加载
  const piMessages = await loadMessagesFromPiSession(userId)
  if (piMessages.length > 0) {
    const start = offset || 0
    const end = limit ? start + limit : undefined
    return piMessages.slice(start, end)
  }

  // fallback 到内存
  const messages = mockMessages.filter(m => m.agentId === agentId)
  const start = offset || 0
  const end = limit ? start + limit : undefined
  return messages.slice(start, end)
}
```

### 3. 路由定义

```typescript
// src/server/module-agent/routes/agent-routes.ts
import { createRoute } from '@hono/zod-openapi'
import { success, error } from '@server/utils/route-helpers'

// 发送消息路由
const sendMessageRoute = createRoute({
  method: 'post',
  path: '/agents/{id}/chat',
  tags: ['agent'],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            agentId: z.string(),
            content: z.string().min(1),
            userId: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: successResponse(
      z.object({
        userMessage: ChatMessageSchema,
        agentMessageId: z.string(),
      }),
      'Message sent'
    ),
    400: errorResponse('Invalid request'),
  },
})

// 获取消息路由
const getMessagesRoute = createRoute({
  method: 'get',
  path: '/agents/{id}/messages',
  tags: ['agent'],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({
      userId: z.string(),
      limit: z.string().optional(),
      offset: z.string().optional(),
    }),
  },
  responses: {
    200: successResponse(GetMessagesResponseSchema, 'Get messages'),
    404: errorResponse('Agent not found'),
  },
})

// 路由实现
export const apiRoutes = new OpenAPIHono()
  .openapi(sendMessageRoute, async c => {
    const { id } = c.req.valid('param')
    const { agentId, content, userId } = c.req.valid('json')

    const result = await agentService.sendMessageWithPI(agentId, userId, content)

    return c.json(success(result), 200)
  })
  .openapi(getMessagesRoute, async c => {
    const { id } = c.req.valid('param')
    const { userId, limit, offset } = c.req.valid('query')

    const messages = await agentService.getMessages(
      id,
      userId,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined
    )

    return c.json(success({ messages, total: messages.length }), 200)
  })
```

---

## 客户端实现

### 1. Agent Store

```typescript
// src/client/stores/agentStore.ts
import { create } from 'zustand'
import { apiClient } from '@client/services/apiClient'
import type { ChatMessage as SharedChatMessage, UpdateAgentInput } from '@shared/modules/agent'
import type { ChatMessage } from '../types'
import { useAuthStore } from './authStore'

interface AgentState {
  agent: Agent | null
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  sseStatus: 'connecting' | 'open' | 'closed'

  fetchAgent: () => Promise<void>
  updateAgent: (input: UpdateAgentInput) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  fetchMessages: (limit?: number, offset?: number) => Promise<void>
  setError: (error: string | null) => void
  setSseStatus: (status: 'connecting' | 'open' | 'closed') => void
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void
  updateMessageContent: (messageId: string, content: string) => void
  setMessageStreaming: (messageId: string, isStreaming: boolean) => void
  addAgentMessage: (messageId: string) => void
  clearMessages: () => void
}

// 消息转换函数
function transformMessage(msg: SharedChatMessage): ChatMessage {
  const typeMap: Record<string, ChatMessage['type']> = {
    user: 'user',
    agent: 'agent',
    system: 'system',
  }
  return {
    id: msg.id,
    agentId: msg.agentId,
    content: msg.content,
    type: typeMap[msg.role] || 'agent',
    timestamp: msg.createdAt,
    metadata: msg.metadata,
    thinking: msg.thinking ?? undefined,
    toolCalls: msg.toolCalls ?? undefined,
  }
}

// 获取当前用户 ID
function getCurrentUserId(): string {
  const user = useAuthStore.getState().user
  if (!user) {
    throw new Error('User not authenticated')
  }
  return user.id
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agent: null,
  messages: [],
  loading: false,
  error: null,
  sseStatus: 'closed',

  // 获取 Agent
  fetchAgent: async () => {
    set({ loading: true, error: null })
    try {
      const userId = getCurrentUserId()
      const response = await apiClient.api.agents.$get({
        query: { userId },
      })
      const result = await response.json()
      if (result.success) {
        set({ agent: result.data, loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  // 发送消息
  sendMessage: async (content: string) => {
    const agent = get().agent
    if (!agent) return

    const userId = getCurrentUserId()
    const agentId = agent.id

    // 添加用户消息到本地
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      agentId,
      content,
      type: 'user',
      timestamp: new Date().toISOString(),
    }

    set(state => ({
      messages: [...state.messages, userMessage],
    }))

    try {
      await apiClient.api.agents[':id'].chat.$post({
        param: { id: agentId },
        json: { agentId, content, userId },
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  },

  // 获取消息历史
  fetchMessages: async (limit?: number, offset?: number) => {
    const agent = get().agent
    if (!agent) return

    set({ loading: true, error: null })
    try {
      const agentId = agent.id
      const userId = getCurrentUserId()
      const response = await apiClient.api.agents[':id'].messages.$get({
        param: { id: agentId },
        query: {
          userId,
          limit: limit?.toString(),
          offset: offset?.toString(),
        },
      })
      const result = await response.json()
      if (result.success) {
        set({ messages: result.data.messages.map(transformMessage), loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  // 更新消息内容（流式更新）
  updateMessageContent: (messageId: string, content: string) => {
    set(state => ({
      messages: state.messages.map(msg => (msg.id === messageId ? { ...msg, content } : msg)),
    }))
  },

  // 设置流式状态
  setMessageStreaming: (messageId: string, isStreaming: boolean) => {
    set(state => ({
      messages: state.messages.map(msg => (msg.id === messageId ? { ...msg, isStreaming } : msg)),
    }))
  },

  // 添加 Agent 消息占位
  addAgentMessage: (messageId: string) => {
    const agent = get().agent
    if (!agent) return

    const agentMessage: ChatMessage = {
      id: messageId,
      agentId: agent.id,
      content: '',
      type: 'agent',
      timestamp: new Date().toISOString(),
      isStreaming: true,
      thinking: '',
      toolCalls: [],
    }

    set(state => ({
      messages: [...state.messages, agentMessage],
    }))
  },

  // 清空消息
  clearMessages: () => {
    set({ messages: [] })
  },

  // 其他方法...
  setError: error => set({ error }),
  setSseStatus: status => set({ sseStatus: status }),
  updateMessage: (messageId, updates) => {
    set(state => ({
      messages: state.messages.map(msg => (msg.id === messageId ? { ...msg, ...updates } : msg)),
    }))
  },
  updateAgent: async input => {
    /* ... */
  },
}))
```

---

## 消息生命周期

### 完整流程

```
1. 用户输入
   ↓
2. 客户端创建用户消息
   ↓
3. 添加到本地 messages 数组
   ↓
4. POST /api/agents/:id/chat
   ↓
5. 服务端保存用户消息
   ↓
6. 服务端创建 Agent 消息占位
   ↓
7. 调用 PI Session 发送消息
   ↓
8. SSE 流式返回事件
   ├── pi-agent-start: 创建 Agent 消息
   ├── pi-text-delta: 增量更新内容
   ├── pi-thinking-delta: 更新思考过程
   ├── pi-tool-start: 添加工具调用
   ├── pi-tool-end: 更新工具结果
   └── pi-agent-end: 标记完成
   ↓
9. 服务端保存完整 Agent 消息
   ↓
10. 客户端标记 isStreaming = false
```

### 状态转换

```typescript
// 消息状态
interface MessageState {
  // 用户消息
  user: {
    status: 'sent' | 'delivered' | 'error'
  }

  // Agent 消息
  agent: {
    status: 'pending' | 'streaming' | 'completed' | 'error'
    isStreaming: boolean
  }
}
```

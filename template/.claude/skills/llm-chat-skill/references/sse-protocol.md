# SSE 协议实现指南

## 目录

1. [协议概述](#协议概述)
2. [事件类型定义](#事件类型定义)
3. [服务端实现](#服务端实现)
4. [客户端实现](#客户端实现)
5. [连接管理](#连接管理)

---

## 协议概述

### SSE vs WebSocket

| 特性     | SSE                   | WebSocket      |
| -------- | --------------------- | -------------- |
| 通信方向 | 单向（服务器→客户端） | 双向           |
| 协议     | HTTP                  | WS             |
| 断线重连 | 浏览器自动            | 需手动实现     |
| 适用场景 | 流式输出、通知        | 实时交互、游戏 |

**本项目选择 SSE**：LLM 响应是单向流式输出，SSE 更简单可靠。

### 数据流

```
客户端                           服务端
  │                               │
  │  1. GET /api/chat/stream      │
  │  Accept: text/event-stream    │
  │──────────────────────────────>│
  │                               │
  │  2. 返回 SSE 流               │
  │  Content-Type: text/event-stream
  │<──────────────────────────────│
  │                               │
  │  3. 事件: pi-agent-start      │
  │<──────────────────────────────│
  │                               │
  │  4. 事件: pi-text-delta (x N) │
  │<──────────────────────────────│
  │                               │
  │  5. 事件: pi-agent-end        │
  │<──────────────────────────────│
  │                               │
```

---

## 事件类型定义

### Schema 定义

```typescript
// src/shared/modules/chat/index.ts
import { z } from 'zod'

// SSE 事件基础结构
export const SSEEventSchema = z.object({
  event: z.string(),
  data: z.unknown(),
})

// 文本增量事件
export const PiTextDeltaEventSchema = z.object({
  messageId: z.string(),
  delta: z.string(),
  isFinal: z.boolean().default(false),
})

// 思考增量事件
export const PiThinkingDeltaEventSchema = z.object({
  messageId: z.string(),
  delta: z.string(),
})

// 工具调用开始事件
export const PiToolStartEventSchema = z.object({
  messageId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
})

// 工具调用结束事件
export const PiToolEndEventSchema = z.object({
  messageId: z.string(),
  toolCallId: z.string(),
  result: z.unknown().nullable(),
  error: z.string().optional(),
})

// Agent 开始事件
export const PiAgentStartEventSchema = z.object({
  messageId: z.string(),
  agentId: z.string(),
})

// Agent 结束事件
export const PiAgentEndEventSchema = z.object({
  messageId: z.string(),
})

// 完整协议定义
export const ChatSSEProtocolSchema = z.object({
  events: z.object({
    'pi-text-delta': PiTextDeltaEventSchema,
    'pi-thinking-delta': PiThinkingDeltaEventSchema,
    'pi-tool-start': PiToolStartEventSchema,
    'pi-tool-end': PiToolEndEventSchema,
    'pi-agent-start': PiAgentStartEventSchema,
    'pi-agent-end': PiAgentEndEventSchema,
  }),
})

export type PiTextDeltaEvent = z.infer<typeof PiTextDeltaEventSchema>
export type PiThinkingDeltaEvent = z.infer<typeof PiThinkingDeltaEventSchema>
export type PiToolStartEvent = z.infer<typeof PiToolStartEventSchema>
export type PiToolEndEvent = z.infer<typeof PiToolEndEventSchema>
export type PiAgentStartEvent = z.infer<typeof PiAgentStartEventSchema>
export type PiAgentEndEvent = z.infer<typeof PiAgentEndEventSchema>
```

### 事件类型汇总

| 事件                | 用途           | 数据结构                                     |
| ------------------- | -------------- | -------------------------------------------- |
| `pi-agent-start`    | Agent 开始处理 | `{ messageId, agentId }`                     |
| `pi-text-delta`     | 文本增量       | `{ messageId, delta, isFinal }`              |
| `pi-thinking-delta` | 思考过程增量   | `{ messageId, delta }`                       |
| `pi-tool-start`     | 工具调用开始   | `{ messageId, toolCallId, toolName, args }`  |
| `pi-tool-end`       | 工具调用结束   | `{ messageId, toolCallId, result?, error? }` |
| `pi-agent-end`      | Agent 处理完成 | `{ messageId }`                              |

---

## 服务端实现

### 1. SSE 路由

```typescript
// src/server/module-agent/routes/agent-routes.ts
import { createRoute } from '@hono/zod-openapi'

const chatStreamRoute = createRoute({
  method: 'get',
  path: '/chat/stream',
  tags: ['chat'],
  responses: {
    200: {
      content: {
        'text/event-stream': {
          schema: z.any(),
        },
      },
      description: 'SSE stream',
    },
  },
})

export const apiRoutes = new OpenAPIHono().openapi(chatStreamRoute, async c => {
  // 获取当前用户
  const user = c.get('user')
  if (!user) {
    return c.text('Unauthorized', 401)
  }

  // 创建 SSE 流
  const stream = new ReadableStream({
    start(controller) {
      // 注册到 realtime 系统
      const unsubscribe = realtime.subscribe(user.id, (event, data) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(new TextEncoder().encode(message))
      })

      // 发送初始连接成功事件
      controller.enqueue(new TextEncoder().encode('event: connected\ndata: {}\n\n'))

      // 清理函数
      return () => unsubscribe()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
```

### 2. Realtime 系统

```typescript
// src/server/core/realtime.ts
type EventCallback = (event: string, data: unknown) => void

class RealtimeManager {
  private subscribers: Map<string, Set<EventCallback>> = new Map()

  // 订阅用户事件
  subscribe(userId: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set())
    }
    this.subscribers.get(userId)!.add(callback)

    // 返回取消订阅函数
    return () => {
      this.subscribers.get(userId)?.delete(callback)
      if (this.subscribers.get(userId)?.size === 0) {
        this.subscribers.delete(userId)
      }
    }
  }

  // 发送 SSE 事件
  emitSSE(userId: string, event: string, data: unknown): void {
    const callbacks = this.subscribers.get(userId)
    if (callbacks) {
      callbacks.forEach(cb => cb(event, data))
    }
  }

  // 广播给所有用户
  broadcast(event: string, data: unknown): void {
    this.subscribers.forEach(callbacks => {
      callbacks.forEach(cb => cb(event, data))
    })
  }
}

export const realtime = new RealtimeManager()
```

### 3. PI Session 集成

```typescript
// src/server/module-agent/services/agent-service.ts
import { realtime } from '@server/core/realtime'

export async function sendMessageWithPI(
  agentId: string,
  userId: string,
  content: string
): Promise<{ userMessage: ChatMessage; agentMessageId: string }> {
  const agentMessageId = `msg-${Date.now()}-${messageIdCounter++}`

  // 发送 Agent 开始事件
  realtime.emitSSE(userId, 'pi-agent-start', {
    messageId: agentMessageId,
    agentId,
  })

  // 获取 PI Session
  const session = await getOrCreateSession(userId, agentId)

  // 发送消息并处理流式响应
  await session.sendMessage(content, {
    onTextDelta: (delta, isFinal) => {
      realtime.emitSSE(userId, 'pi-text-delta', {
        messageId: agentMessageId,
        delta,
        isFinal,
      })
    },
    onThinkingDelta: delta => {
      realtime.emitSSE(userId, 'pi-thinking-delta', {
        messageId: agentMessageId,
        delta,
      })
    },
    onToolStart: ({ id, name, args }) => {
      realtime.emitSSE(userId, 'pi-tool-start', {
        messageId: agentMessageId,
        toolCallId: id,
        toolName: name,
        args,
      })
    },
    onToolEnd: ({ id, result, error }) => {
      realtime.emitSSE(userId, 'pi-tool-end', {
        messageId: agentMessageId,
        toolCallId: id,
        result,
        error,
      })
    },
    onComplete: () => {
      realtime.emitSSE(userId, 'pi-agent-end', {
        messageId: agentMessageId,
      })
    },
  })

  return { userMessage, agentMessageId }
}
```

---

## 客户端实现

### 1. SSE Client

```typescript
// src/shared/core/sse-client.ts
export class SSEClientImpl {
  private eventSource: EventSource | null = null
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(
    private url: string,
    private headers: Record<string, string> = {}
  ) {}

  connect(): void {
    // 构建带 headers 的 URL（EventSource 不支持自定义 headers）
    const url = new URL(this.url)
    Object.entries(this.headers).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    this.eventSource = new EventSource(url.toString())

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0
      console.log('SSE connected')
    }

    this.eventSource.onerror = error => {
      console.error('SSE error:', error)
      this.handleReconnect()
    }

    // 监听所有事件
    this.eventSource.onmessage = event => {
      this.handleMessage('message', event)
    }

    // 监听特定事件
    this.eventSource.addEventListener('pi-text-delta', event => {
      this.handleMessage('pi-text-delta', event)
    })
    // ... 其他事件
  }

  private handleMessage(eventType: string, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      const listeners = this.listeners.get(eventType)
      if (listeners) {
        listeners.forEach(cb => cb(data))
      }
    } catch (error) {
      console.error('Failed to parse SSE message:', error)
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

      setTimeout(() => {
        this.connect()
      }, delay)
    }
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // 返回取消订阅函数
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.listeners.clear()
  }
}
```

### 2. React Hook

```typescript
// src/client/hooks/useChatSSEConnection.ts
import { useEffect, useRef } from 'react'
import { useSSE } from '@shared/core/sse-client'
import { useAgentStore } from '@client/stores/agentStore'
import type { ChatSSEProtocol } from '@shared/modules/chat'

export function useChatSSEConnection() {
  const chatSSE = useSSE<ChatSSEProtocol>(() => Promise.resolve(apiClient.api.chat.stream.$sse()))

  const updateMessageContent = useAgentStore(state => state.updateMessageContent)
  const addAgentMessage = useAgentStore(state => state.addAgentMessage)
  const setMessageStreaming = useAgentStore(state => state.setMessageStreaming)
  const setSseStatus = useAgentStore(state => state.setSseStatus)

  const clientRef = useRef<ReturnType<typeof chatSSE.getClient> | null>(null)

  useEffect(() => {
    const client = chatSSE.getClient()
    clientRef.current = client

    // 连接状态
    client.on('connected', () => {
      setSseStatus('open')
    })

    // Agent 开始
    client.on('pi-agent-start', ({ messageId, agentId }) => {
      addAgentMessage(messageId)
      setMessageStreaming(messageId, true)
    })

    // 文本增量
    client.on('pi-text-delta', ({ messageId, delta, isFinal }) => {
      updateMessageContent(messageId, prev => prev + delta)
      if (isFinal) {
        setMessageStreaming(messageId, false)
      }
    })

    // 思考增量
    client.on('pi-thinking-delta', ({ messageId, delta }) => {
      // 更新思考内容
    })

    // 工具调用开始
    client.on('pi-tool-start', ({ messageId, toolCallId, toolName, args }) => {
      // 添加工具调用卡片
    })

    // 工具调用结束
    client.on('pi-tool-end', ({ messageId, toolCallId, result, error }) => {
      // 更新工具调用结果
    })

    // Agent 结束
    client.on('pi-agent-end', ({ messageId }) => {
      setMessageStreaming(messageId, false)
    })

    // 错误处理
    client.on('error', error => {
      console.error('SSE error:', error)
      setSseStatus('closed')
    })

    // 清理
    return () => {
      client.disconnect()
      setSseStatus('closed')
    }
  }, [chatSSE, updateMessageContent, addAgentMessage, setMessageStreaming, setSseStatus])

  return {
    status: useAgentStore(state => state.sseStatus),
    reconnect: () => chatSSE.reconnect(),
  }
}
```

---

## 连接管理

### 1. 自动重连

```typescript
// 在 SSEClientImpl 中实现
private handleReconnect(): void {
  if (this.reconnectAttempts < this.maxReconnectAttempts) {
    this.reconnectAttempts++
    // 指数退避
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, delay)
  } else {
    console.error('Max reconnect attempts reached')
    this.emit('max-reconnect-attempts', {})
  }
}
```

### 2. 心跳检测

```typescript
// 服务端发送心跳
setInterval(() => {
  realtime.broadcast('heartbeat', { timestamp: Date.now() })
}, 30000)

// 客户端检测心跳
let lastHeartbeat = Date.now()
const heartbeatTimeout = 60000

client.on('heartbeat', () => {
  lastHeartbeat = Date.now()
})

setInterval(() => {
  if (Date.now() - lastHeartbeat > heartbeatTimeout) {
    console.warn('Heartbeat timeout, reconnecting...')
    client.disconnect()
    client.connect()
  }
}, heartbeatTimeout)
```

### 3. 状态同步

```typescript
// 断线重连后同步状态
client.on('connected', async () => {
  // 获取最新的消息状态
  const messages = useAgentStore.getState().messages
  const streamingMessage = messages.find(m => m.isStreaming)

  if (streamingMessage) {
    // 请求重新发送未完成的消息
    await apiClient.api.agents[':id'].resync.$post({
      param: { id: streamingMessage.agentId },
      json: { messageId: streamingMessage.id },
    })
  }
})
```

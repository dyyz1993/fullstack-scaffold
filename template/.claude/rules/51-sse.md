---
paths: src/shared/core/sse-client.ts, src/client/hooks/useSSE.ts, src/server/core/realtime-core.ts
---

# SSE 开发规范

## 🎯 核心价值

项目提供类型安全的 SSE (Server-Sent Events) 支持，通过协议定义实现端到端类型安全。

## 📁 相关文件

| 文件                               | 职责                     |
| ---------------------------------- | ------------------------ |
| `src/shared/core/sse-client.ts`    | SSE 客户端实现（框架层） |
| `src/client/hooks/useSSE.ts`       | React Hook 封装          |
| `src/server/core/realtime-core.ts` | 服务端 SSE 处理          |

## 🚫 禁止直接使用 new EventSource()

### 禁止事项

```typescript
// ❌ 禁止 - 直接使用 new EventSource()
const sse = new EventSource('/api/notifications/sse')

// ❌ 禁止 - 直接使用浏览器 EventSource API
const sse = new EventSource(url)
sse.onmessage = (event) => { ... }
sse.onerror = (error) => { ... }
```

**ESLint 规则**: `no-direct-ws-sse`

**路径**: `src/**/*.ts`, `src/**/*.tsx`

### 正确使用方式

```typescript
// ✅ 正确 - 使用 apiClient
import { apiClient } from '@client/services/apiClient'
import type { SSEClient, AppSSEProtocol } from '@shared/schemas'

const sseClient: SSEClient<AppSSEProtocol> = await apiClient.api.notifications.sse.$sse()
```

## 🔌 协议定义

### 定义 SSE 协议

```typescript
// src/shared/modules/notifications/schemas.ts
import { z } from 'zod'
import { NotificationSchema } from './schemas'

export const AppSSEProtocolSchema = z.object({
  events: z.object({
    notification: NotificationSchema,
    ping: z.object({ timestamp: z.number() }),
    connected: z.object({ timestamp: z.number() }),
  }),
})

export type AppSSEProtocol = z.infer<typeof AppSSEProtocolSchema>
```

## 🎣 React Hook 使用

### useSSE Hook

```typescript
// src/client/hooks/useSSE.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SSEClient, SSEProtocol } from '@shared/schemas'

type SSEStatus = 'connecting' | 'open' | 'closed'

interface UseSSEReturn<T extends SSEProtocol> {
  status: SSEStatus
  connect: () => Promise<void>
  disconnect: () => void
  client: SSEClient<T> | null
}

export function useSSE<T extends SSEProtocol>(route: () => Promise<SSEClient<T>>): UseSSEReturn<T> {
  const [status, setStatus] = useState<SSEStatus>('closed')
  const clientRef = useRef<SSEClient<T> | null>(null)

  const connect = useCallback(async () => {
    if (clientRef.current) return

    setStatus('connecting')

    try {
      const client = await route()
      clientRef.current = client

      client.onStatusChange(newStatus => {
        setStatus(newStatus)
      })

      setStatus(client.status)
    } catch (error) {
      console.error('Failed to connect SSE:', error)
      setStatus('closed')
    }
  }, [route])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.abort()
      clientRef.current = null
      setStatus('closed')
    }
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return { status, connect, disconnect, client: clientRef.current }
}
```

### 组件中使用

```typescript
import { useSSE } from '@client/hooks/useSSE'
import { apiClient } from '@client/services/apiClient'
import type { AppSSEProtocol } from '@shared/schemas'

export const NotificationComponent: React.FC = () => {
  const { status, connect, disconnect, client } = useSSE<AppSSEProtocol>(
    () => apiClient.api.notifications.sse.$sse()
  )

  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    connect()

    if (client) {
      client.on('notification', (payload) => {
        setNotifications((prev) => [...prev, payload])
      })
    }

    return () => {
      disconnect()
    }
  }, [connect, disconnect, client])

  return (
    <div>
      <p>Status: {status}</p>
      <ul>
        {notifications.map((n, i) => (
          <li key={i}>{n.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

## 🛡️ 保护核心接口

### 禁止修改框架层接口

```typescript
// ❌ 禁止 - 修改 SSEClient 接口
interface SSEClient {
  customMethod: () => void  // ❌ 禁止添加方法
}

// ✅ 正确 - 通过协议定义扩展
export const CustomSSEProtocolSchema = z.object({
  events: z.object({
    customEvent: z.object({ ... }),
  }),
})
```

**ESLint 规则**: `protect-ws-sse-interface`

**路径**: `src/**/*.ts`, `src/**/*.tsx`

## 🧪 测试 SSE

### Mock SSE 客户端

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import type { SSEClient } from '@shared/schemas'

describe('SSE Tests', () => {
  it('should connect to SSE', async () => {
    const mockSSE = vi.fn()
    const client = createTestClient(undefined, {
      sse: mockSSE as (url: string | URL) => SSEClient,
    })

    const sseClient = await client.api.notifications.sse.$sse()
    expect(mockSSE).toHaveBeenCalled()
  })
})
```

## 🚫 Anti-Patterns

```typescript
// ❌ 不要直接使用 new EventSource()
const sse = new EventSource('/api/notifications/sse')

// ✅ 应该使用 apiClient
const sseClient = await apiClient.api.notifications.sse.$sse()

// ❌ 不要修改 SSEClient 接口
interface SSEClient {
  customMethod: () => void
}

// ✅ 应该通过协议定义扩展
export const CustomSSEProtocolSchema = z.object({
  events: z.object({
    customEvent: z.object({ ... }),
  }),
})

// ❌ 不要在组件中直接管理 EventSource 实例
const sseRef = useRef<EventSource | null>(null)
sseRef.current = new EventSource(url)

// ✅ 应该使用 useSSE Hook
const { status, connect, client } = useSSE(() => apiClient.api.notifications.sse.$sse())
```

## 📚 相关文档

- [Client Service 规范](./31-client-services.md) - API 客户端使用规范
- [WebSocket 规范](./50-websocket.md) - WebSocket 开发规范
- [Shared Types 规范](./40-shared-types.md) - 协议定义规范

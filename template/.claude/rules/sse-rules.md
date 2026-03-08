---
paths: src/server/module-notifications/**/*.ts, src/client/services/sseClient.ts
---

# SSE (Server-Sent Events) 开发规范

## 🎯 核心原则

SSE 实现必须支持**类型安全的单向通信**，通过 `$sse()` 方法实现端到端类型推导。

## 📁 文件结构

```
src/client/services/
  sseClient.ts          # SSEClientImpl 实现 + createSSEClient
  apiClient.ts          # Hono 客户端配置

src/server/module-notifications/
├── routes/
│   └── notification-routes.ts    # SSE 路由
├── services/
│   └── notification-service.ts   # SSE 业务逻辑
└── __tests__/
    └── sse-rpc.test.ts           # SSE 测试
```

## 🔌 客户端使用规范

### 使用 `$sse()` 方法

```typescript
import { apiClient } from '@client/services/apiClient'

// ✅ 正确 - 使用 $sse() 方法
const conn = await apiClient.api.notifications.stream.$sse()

// 类型安全的事件监听
conn.on('notification', notification => {
  // notification 类型自动推导为 AppNotification
  console.log(notification.id, notification.title)
})

conn.on('ping', ping => {
  // ping 类型自动推导为 { timestamp: number }
  console.log(ping.timestamp)
})

// ❌ 错误 - 直接使用 EventSource
const sse = new EventSource('/api/notifications/stream')
// ESLint 会报错：Direct new EventSource() is not allowed
```

### 连接状态管理

```typescript
const conn = await apiClient.api.notifications.stream.$sse()

// 监听连接状态
conn.onStatusChange(status => {
  console.log('SSE status:', status)
  // status: 'connecting' | 'open' | 'closed'
})

// 错误处理
conn.onError(error => {
  console.error('SSE error:', error)
})

// 关闭连接
conn.abort()
```

## 🔄 协议定义规范

### SSEProtocol 格式

```typescript
// src/shared/schemas/notifications.ts

import { z } from 'zod'

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['info', 'warning', 'success', 'error']),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
})

// ✅ 正确 - 使用 SSEProtocol 格式
export const AppSSEProtocolSchema = z.object({
  events: z.object({
    notification: NotificationSchema,
    ping: z.object({ timestamp: z.number() }),
    connected: z.object({ timestamp: z.number() }),
  }),
})

export type AppSSEProtocol = z.infer<typeof AppSSEProtocolSchema>
```

### 路由定义

```typescript
import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { AppSSEProtocolSchema } from '@shared/schemas'

const streamRoute = createRoute({
  method: 'get',
  path: '/notifications/stream',
  tags: ['notifications'],
  responses: {
    200: {
      content: {
        'text/event-stream': {
          schema: AppSSEProtocolSchema, // 使用 SSEProtocol 格式
        },
      },
      description: 'SSE stream for notifications',
    },
  },
})

export const notificationRoutes = new OpenAPIHono().openapi(streamRoute, async c => {
  // SSE 处理逻辑
})
```

## 🧪 测试规范

### SSE 测试不需要启动服务器

```typescript
import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('SSE Routes', () => {
  it('should use $sse() method for type-safe SSE connection', async () => {
    const client = createTestClient()

    // ✅ 直接使用 $sse() 方法，不需要启动服务器
    const conn = await client.api.notifications.stream.$sse()

    expect(['connecting', 'open', 'closed']).toContain(conn.status)

    // 类型安全的事件监听
    const receivedNotifications: AppSSEProtocol['events']['notification'][] = []

    const unsubscribe = conn.on('notification', notification => {
      receivedNotifications.push(notification)
    })

    conn.on('ping', ping => {
      expect(ping.timestamp).toBeDefined()
    })

    await new Promise(resolve => setTimeout(resolve, 1000))

    unsubscribe()
    conn.abort()
  })
})
```

### 为什么 SSE 测试不需要启动服务器？

| 特性           | HTTP                 | SSE                                        |
| -------------- | -------------------- | ------------------------------------------ |
| 连接方式       | 请求-响应（一次性）  | 持久单向流                                 |
| 测试方式       | `app.fetch(request)` | `$sse()` 内部使用 `EventSource`            |
| 是否需要 URL   | ❌ 不需要            | ✅ 需要 URL，但可以通过 `app.fetch()` 模拟 |
| 是否需要服务器 | ❌ 不需要            | ❌ 不需要                                  |

SSE 可以通过 `app.fetch()` 返回的 Response 流来模拟，不需要真实的网络连接。

## 🔒 ESLint 规则

### 禁止直接使用原生 EventSource

```typescript
// ❌ 错误 - ESLint 会报错
const sse = new EventSource('/api/notifications/stream')

// ✅ 正确 - 使用 $sse() 方法
const conn = await apiClient.api.notifications.stream.$sse()
```

### 保护核心接口

```typescript
// ❌ 错误 - 不能添加新的公共方法
class SSEClientImpl {
  newMethod() { ... }  // ESLint 会报错
}

// ✅ 正确 - 可以添加私有方法
class SSEClientImpl {
  #privateMethod() { ... }  // 允许
  private privateMethod() { ... }  // 允许
}
```

## 📝 命名规范

| 类型     | 约定                     | 示例                                |
| -------- | ------------------------ | ----------------------------------- |
| 路由文件 | kebab-case-routes.ts     | `notification-routes.ts`            |
| 服务文件 | kebab-case-service.ts    | `notification-service.ts`           |
| 协议类型 | PascalCase + SSEProtocol | `AppSSEProtocol`                    |
| 事件类型 | camelCase                | `notification`, `ping`, `connected` |

## 🚫 Anti-Patterns

```typescript
// ❌ 不要直接使用 EventSource
const sse = new EventSource('/api/notifications/stream')

// ✅ 应该使用 $sse() 方法
const conn = await apiClient.api.notifications.stream.$sse()

// ❌ 不要在组件中直接管理 SSE 连接
useEffect(() => {
  const sse = new EventSource(...)
}, [])

// ✅ 应该在 Store 中管理
const conn = await apiClient.api.notifications.stream.$sse()
```

## 🔄 类型推断链

```
路由定义:
content: { 'text/event-stream': { schema: AppSSEProtocolSchema } }
    ↓
@hono/zod-openapi 推断:
TypedResponse<AppSSEProtocol, 200, 'sse'>
    ↓
Hono ToSchemaOutput:
{ output: AppSSEProtocol, outputFormat: 'sse', status: 200 }
    ↓
客户端类型:
$sse(): Promise<SSEClient<AppSSEProtocol>>
    ↓
开发者使用:
conn.on('notification', (notification) => { ... })  // 类型安全！
```

## 🎯 总结

SSE 开发的关键点：

1. ✅ 使用 `$sse()` 方法获取类型安全的客户端
2. ✅ 定义 `SSEProtocol` schema 供类型推导
3. ✅ 测试时不需要启动服务器
4. ✅ 使用 `on()` 监听事件
5. ✅ 使用 `onStatusChange()` 监听连接状态
6. ✅ 使用 `onError()` 处理错误
7. ✅ 遵循 ESLint 规则

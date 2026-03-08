---
paths: src/server/module-websocket/**/*.ts, src/server/services/realtime/**/*.ts
---

# WebSocket 开发规范

## 🎯 核心原则

WebSocket 实现必须支持**类型安全的双向通信**，通过 `$ws()` 方法实现端到端类型推导。

## 📁 文件结构

```
src/client/services/
  wsClient.ts           # WSClientImpl 实现 + createWSClient
  apiClient.ts          # Hono 客户端配置

src/server/
├── module-websocket/
│   ├── routes/
│   │   └── websocket-routes.ts    # WebSocket 路由
│   ├── services/
│   │   └── websocket-service.ts   # WebSocket 业务逻辑
│   └── __tests__/
│       └── websocket-rpc.test.ts
├── services/realtime/
│   ├── core.ts                    # 实时通信核心
│   ├── node-ws.ts                 # Node.js WebSocket 实现
│   └── types.ts                   # 类型定义
└── test-utils/
    ├── test-client.ts             # 测试客户端
    └── test-server.ts             # 测试服务器（WebSocket 需要）
```

## 🔌 客户端使用规范

### 使用 `$ws()` 方法

```typescript
import { apiClient } from '@client/services/apiClient'

// ✅ 正确 - 使用 $ws() 方法
const ws = apiClient.api.chat.ws.$ws()

// 类型安全的 RPC 调用
const result = await ws.call('echo', { message: 'hello' })
// result.message 自动推导为 string

// 类型安全的事件监听
ws.on('notification', payload => {
  // payload 类型自动推导
  console.log(payload.message)
})

// ❌ 错误 - 直接使用 WebSocket
const ws = new WebSocket('ws://localhost:3000/api/chat/ws')
// ESLint 会报错：Direct new WebSocket() is not allowed
```

### 连接状态管理

```typescript
const ws = apiClient.api.chat.ws.$ws()

// 监听连接状态
ws.onStatusChange(status => {
  console.log('WebSocket status:', status)
  // status: 'connecting' | 'open' | 'closed' | 'reconnecting'
})

// 关闭连接
ws.close()
```

## 🔄 协议定义规范

### 共享协议类型

```typescript
// src/shared/schemas/ws-protocol.ts

import { z } from 'zod'

export const AppWSProtocolSchema = z.object({
  rpc: z.object({
    ping: z.object({
      in: z.void(),
      out: z.object({ pong: z.number() }),
    }),
    echo: z.object({
      in: z.object({ message: z.string() }),
      out: z.object({ message: z.string(), timestamp: z.number() }),
    }),
  }),
  events: z.object({
    connected: z.object({ timestamp: z.number() }),
    notification: z.object({ id: z.string(), message: z.string() }),
  }),
})

export type AppWSProtocol = z.infer<typeof AppWSProtocolSchema>
```

### 路由定义

```typescript
import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { AppWSProtocolSchema } from '@shared/schemas'

const wsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['websocket'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AppWSProtocolSchema,
        },
      },
      description: 'WebSocket endpoint',
    },
  },
})

export const websocketRoutes = new OpenAPIHono().openapi(wsRoute, async c => {
  return c.json({ protocol: 'AppWSProtocol' as const })
})
```

## 🧪 测试规范

### WebSocket 测试需要启动服务器

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { createTestServer } from '../../test-utils/test-server'
import app from '../../entries/node'

describe('WebSocket Routes', () => {
  let testServer: Awaited<ReturnType<typeof createTestServer>>
  let client: ReturnType<typeof createTestClient>

  beforeAll(async () => {
    // ⚠️ WebSocket 测试必须启动服务器
    testServer = await createTestServer(app, ['/api/chat/ws'])
    client = createTestClient(`http://localhost:${testServer.port}`)
  }, 15000)

  afterAll(async () => {
    await testServer.close()
  })

  it('should handle RPC calls with type safety', async () => {
    // ✅ 使用 $ws() 方法
    const ws = client.api.chat.ws.$ws()

    // 等待连接
    await new Promise<void>(resolve => {
      ws.onStatusChange(status => {
        if (status === 'open') resolve()
      })
    })

    // 类型安全的 RPC 调用
    const result = await ws.call('echo', { message: 'hello' })
    expect(result.message).toBe('hello')
    expect(result.timestamp).toBeDefined()

    ws.close()
  })
})
```

### 为什么 WebSocket 测试需要启动服务器？

| 特性           | HTTP                 | WebSocket            |
| -------------- | -------------------- | -------------------- |
| 连接方式       | 请求-响应（一次性）  | 持久双向连接         |
| 测试方式       | `app.fetch(request)` | `new WebSocket(url)` |
| 是否需要 URL   | ❌ 不需要            | ✅ 需要真实 URL      |
| 是否需要服务器 | ❌ 不需要            | ✅ 必须启动          |

WebSocket 需要真实的网络 socket 进行双向通信，不能通过 `app.fetch()` 模拟。

## 🔒 ESLint 规则

### 禁止直接使用原生 WebSocket

```typescript
// ❌ 错误 - ESLint 会报错
const ws = new WebSocket('ws://localhost:3000/api/chat/ws')

// ✅ 正确 - 使用 $ws() 方法
const ws = apiClient.api.chat.ws.$ws()
```

### 保护核心接口

```typescript
// ❌ 错误 - 不能添加新的公共方法
class WSClientImpl {
  newMethod() { ... }  // ESLint 会报错
}

// ✅ 正确 - 可以添加私有方法
class WSClientImpl {
  #privateMethod() { ... }  // 允许
  private privateMethod() { ... }  // 允许
}
```

## 📝 命名规范

| 类型     | 约定                  | 示例                        |
| -------- | --------------------- | --------------------------- |
| 路由文件 | kebab-case-routes.ts  | `websocket-routes.ts`       |
| 服务文件 | kebab-case-service.ts | `websocket-service.ts`      |
| 协议类型 | PascalCase + Protocol | `AppWSProtocol`             |
| RPC 方法 | camelCase             | `ping`, `echo`              |
| 事件类型 | camelCase             | `connected`, `notification` |

## 🚫 Anti-Patterns

```typescript
// ❌ 不要直接使用 WebSocket
const ws = new WebSocket('ws://localhost:3000/api/ws')

// ✅ 应该使用 $ws() 方法
const ws = apiClient.api.chat.ws.$ws()

// ❌ 不要在组件中直接管理 WebSocket 连接
useEffect(() => {
  const ws = new WebSocket(...)
}, [])

// ✅ 应该在 Store 中管理
const ws = apiClient.api.chat.ws.$ws()
```

## 🎯 总结

WebSocket 开发的关键点：

1. ✅ 使用 `$ws()` 方法获取类型安全的客户端
2. ✅ 定义 `WSProtocol` schema 供类型推导
3. ✅ 测试时需要启动真实服务器
4. ✅ 使用 `call()` 进行 RPC 调用
5. ✅ 使用 `on()` 监听事件
6. ✅ 遵循 ESLint 规则

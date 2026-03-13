---
paths: src/client/services/**/*.ts
---

# Client Service 开发规范

## 🎯 核心职责

`src/client/services/` 目录包含 API 客户端和实时通信客户端的配置。

## 📁 文件结构

```
src/client/services/
└── apiClient.ts    # API 客户端配置
```

## 🔧 API 客户端配置

### 创建类型安全的客户端

```typescript
// src/client/services/apiClient.ts
import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'

const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

export const apiClient = hc<AppType>(baseUrl, {
  webSocket: url => new WSClientImpl(url),
  sse: url => new SSEClientImpl(url),
})
```

**关键点**:

- 使用 `hc<AppType>()` 创建类型安全的客户端
- 导入 `AppType` 从 `@server/index`
- 配置 WebSocket 和 SSE 客户端实现

**ESLint 规则**: `no-ambiguous-file-paths`

**路径**: `src/client/services/apiClient.ts`

## 🚫 禁止直接使用 fetch

### 禁止事项

```typescript
// ❌ 禁止 - 直接使用 fetch
const response = await fetch('/api/items')
const data = await response.json()

// ❌ 禁止 - 直接使用 new WebSocket()
const ws = new WebSocket('ws://localhost:3000/api/chat/ws')

// ❌ 禁止 - 直接使用 new EventSource()
const sse = new EventSource('/api/notifications/sse')
```

**ESLint 规则**: `no-direct-ws-sse`, `no-restricted-globals`

### 正确使用方式

```typescript
// ✅ 正确 - 使用 apiClient
import { apiClient } from '@client/services/apiClient'

// REST API 调用
const response = await apiClient.api.items.$get()
const result = await response.json()

if (result.success) {
  console.log(result.data)
}

// WebSocket 连接
const wsClient = apiClient.api.chat.ws.$ws()

// SSE 连接
const sseClient = await apiClient.api.notifications.sse.$sse()
```

## 🔌 WebSocket 客户端使用

### 获取 WebSocket 客户端

```typescript
import { apiClient } from '@client/services/apiClient'
import type { WSClient, ChatProtocol } from '@shared/schemas'

const wsClient: WSClient<ChatProtocol> = apiClient.api.chat.ws.$ws()

// 连接状态监听
wsClient.onStatusChange(status => {
  console.log('WebSocket status:', status)
})

// RPC 调用
const result = await wsClient.call('echo', { message: 'Hello' })

// 事件监听
wsClient.on('notification', payload => {
  console.log('Notification:', payload)
})

// 发送事件
wsClient.emit('broadcast', { message: 'Hello', timestamp: Date.now() })
```

**ESLint 规则**: `protect-ws-sse-interface`

**路径**: `src/client/**/*.ts`, `src/client/**/*.tsx`

## 📡 SSE 客户端使用

### 获取 SSE 客户端

```typescript
import { apiClient } from '@client/services/apiClient'
import type { SSEClient, AppSSEProtocol } from '@shared/schemas'

const sseClient: SSEClient<AppSSEProtocol> = await apiClient.api.notifications.sse.$sse()

// 连接状态监听
sseClient.onStatusChange(status => {
  console.log('SSE status:', status)
})

// 事件监听
sseClient.on('notification', payload => {
  console.log('Notification:', payload)
})

// 关闭连接
sseClient.abort()
```

**ESLint 规则**: `protect-ws-sse-interface`

**路径**: `src/client/**/*.ts`, `src/client/**/*.tsx`

## 🖼️ 媒体类型方法

### 图片获取 ($image)

用于获取 `image/*` 类型的资源，返回 `Promise<Blob>`。

```typescript
import { apiClient } from '@client/services/apiClient'

// 获取图片
const blob = await apiClient.api.admin.avatar[':id'].$image({
  param: { id: 'user-123' },
})

// 创建图片 URL
const imageUrl = URL.createObjectURL(blob)
document.querySelector('img').src = imageUrl

// 记得释放 URL
URL.revokeObjectURL(imageUrl)
```

**支持的 Content-Type**:

- `image/png`
- `image/jpeg`
- `image/gif`
- `image/webp`
- 其他 `image/*` 类型

### SVG 获取 ($svg)

用于获取 `image/svg+xml` 类型的资源，返回 `Promise<string>`。

```typescript
import { apiClient } from '@client/services/apiClient'

// 获取 SVG 图标
const svgString = await apiClient.api.admin.icon[':name'].$svg({
  param: { name: 'home' },
})

// 直接插入 DOM
document.querySelector('#icon-container').innerHTML = svgString
```

**支持的 Content-Type**:

- `image/svg+xml`

### 文件下载 ($download)

用于下载文件（Excel, PDF, ZIP 等），返回 `Promise<Blob>`。

```typescript
import { apiClient } from '@client/services/apiClient'

// 下载文件
const blob = await apiClient.api.admin.todos.export.$download()

// 触发浏览器下载
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'todos.csv'
a.click()
URL.revokeObjectURL(url)
```

**支持的 Content-Type**:

- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Excel)
- `application/vnd.ms-excel` (Excel 97-2003)
- `application/pdf`
- `application/zip`
- `text/csv`
- 其他 `application/*` 类型

### 服务端定义示例

```typescript
// src/server/module-admin/routes/admin-routes.ts
import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'

// 图片路由
const getAvatarRoute = createRoute({
  method: 'get',
  path: '/admin/avatar/:id',
  responses: {
    200: {
      content: {
        'image/png': { schema: z.any().openapi({ type: 'string', format: 'binary' }) },
        'image/jpeg': { schema: z.any().openapi({ type: 'string', format: 'binary' }) },
      },
      description: 'User avatar image',
    },
  },
})

// SVG 路由
const getIconRoute = createRoute({
  method: 'get',
  path: '/admin/icon/:name',
  responses: {
    200: {
      content: {
        'image/svg+xml': { schema: z.string() },
      },
      description: 'SVG icon',
    },
  },
})

// 文件下载路由
const exportTodosRoute = createRoute({
  method: 'get',
  path: '/admin/todos/export',
  responses: {
    200: {
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: z.any().openapi({ type: 'string', format: 'binary' }),
        },
        'text/csv': { schema: z.string() },
      },
      description: 'Export todos as Excel or CSV',
    },
  },
})
```

**注意**: 对于二进制类型，使用 `z.any().openapi({ type: 'string', format: 'binary' })` 而不是 `z.instanceof(Blob)`。

## 🌊 流式响应处理

对于大数据量的导出场景，可以使用流式响应来减少内存占用。

### 服务端实现

```typescript
import { createRoute } from '@hono/zod-openapi'

const exportStreamRoute = createRoute({
  method: 'get',
  path: '/admin/todos/export/stream',
  responses: {
    200: {
      content: {
        'text/csv': { schema: z.string() },
      },
      description: 'Stream export todos as CSV',
    },
  },
})
  // Handler
  .openapi(exportStreamRoute, async _c => {
    const todos = await adminService.getAllTodos()

    const stream = new ReadableStream({
      async start(controller) {
        // 发送 CSV 头
        controller.enqueue('id,title,completed,created_at\n')

        // 逐行发送数据
        for (const todo of todos) {
          const line = `${todo.id},"${todo.title}",${todo.completed},${todo.createdAt}\n`
          controller.enqueue(line)

          // 模拟慢速导出（可选）
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todos.csv"',
      },
    })
  })
```

### 客户端处理

```typescript
import { apiClient } from '@client/services/apiClient'

// 获取流式响应
const response = await apiClient.api.admin.todos.export.stream.$get()

// 使用 ReadableStream 读取数据
const reader = response.body?.getReader()
if (!reader) {
  throw new Error('No response body')
}

const decoder = new TextDecoder()
let csvContent = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  // 处理每个数据块
  csvContent += decoder.decode(value)
  console.log('Received chunk:', value.length, 'bytes')
}

// 创建下载
const blob = new Blob([csvContent], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'todos.csv'
a.click()
URL.revokeObjectURL(url)
```

### 实时进度显示

```typescript
const reader = response.body?.getReader()
const contentLength = parseInt(response.headers.get('Content-Length') || '0')
let receivedLength = 0

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  receivedLength += value.length
  const progress = contentLength > 0 ? Math.round((receivedLength / contentLength) * 100) : 0

  console.log(`Progress: ${progress}%`)
}
```

### 使用场景

| 场景           | 推荐方式      |
| -------------- | ------------- |
| 小文件 (< 1MB) | `$download()` |
| 大文件 (> 1MB) | 流式响应      |
| 实时进度显示   | 流式响应      |
| 大数据量导出   | 流式响应      |

**注意**: 流式响应使用 `$get()` 方法，返回 `ClientResponse`，其 `body` 属性是 `ReadableStream | null`。

## 🛡️ 框架保护

`apiClient.ts` 是框架层文件，带有 `@framework-baseline` 注释：

```typescript
/**
 * @framework-baseline ab16e97716a7556e
 *
 * 此文件属于框架层代码。如需修改，请添加以下说明：
 * @framework-modify
 * @reason [必填] 修改原因
 * @impact [必填] 影响范围
 */
```

**ESLint 规则**: `framework-protect`

## 📤 导出规范

```typescript
// ✅ 正确 - 导出 apiClient
export const apiClient = hc<AppType>(baseUrl, { ... })

// ❌ 错误 - 导出多个客户端实例
export const apiClient1 = hc<AppType>(url1)
export const apiClient2 = hc<AppType>(url2)
```

## 🚫 Anti-Patterns

```typescript
// ❌ 不要直接使用 fetch
const response = await fetch('/api/items')

// ✅ 应该使用 apiClient
const response = await apiClient.api.items.$get()

// ❌ 不要直接使用 new WebSocket()
const ws = new WebSocket('ws://localhost:3000/api/chat/ws')

// ✅ 应该使用 apiClient
const wsClient = apiClient.api.chat.ws.$ws()

// ❌ 不要直接使用 new EventSource()
const sse = new EventSource('/api/notifications/sse')

// ✅ 应该使用 apiClient
const sseClient = await apiClient.api.notifications.sse.$sse()

// ❌ 不要在组件中创建客户端实例
const client = hc<AppType>(baseUrl)

// ✅ 应该使用统一的 apiClient
import { apiClient } from '@client/services/apiClient'
```

## 📚 相关文档

- [API 类型推导规范](./10-api-type-inference.md) - Hono RPC 类型推导
- [WebSocket 规范](./50-websocket.md) - WebSocket 开发规范
- [SSE 规范](./51-sse.md) - SSE 开发规范
- [Client 组件规范](./30-client-components.md) - 组件开发规范

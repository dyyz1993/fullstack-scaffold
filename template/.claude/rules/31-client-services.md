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

- [API 类型推导规范](./api-type-inference-rules.md) - Hono RPC 类型推导
- [WebSocket 规范](./websocket-rules.md) - WebSocket 开发规范
- [SSE 规范](./sse-rules.md) - SSE 开发规范
- [Client 组件规范](./client-component-rules.md) - 组件开发规范

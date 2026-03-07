# 统一运行时抽象层

## 设计目标

让业务代码**完全不需要关心底层是 Node.js 还是 Cloudflare Workers**，实现真正的平台无关开发。

## 核心概念

### Runtime Adapter

统一的运行时适配器接口，提供：

- **WebSocket 管理**：注册路径、处理连接、广播消息
- **RPC 注册**：注册远程调用方法
- **事件处理**：注册事件监听器
- **平台检测**：自动检测当前运行环境

## 使用示例

### 1. 业务模块初始化

```typescript
// src/server/module-chat/services/chat-service.ts
import { runtime } from '@server/core/runtime'

export function initChatHandlers(): void {
  // ✅ 注册 WebSocket 路径（自动适配 Node/Cloudflare）
  runtime.handleWS('/api/chat/ws')

  // ✅ 注册 RPC 方法
  runtime.registerRPC('echo', (params: unknown) => {
    const { message } = params as { message: string }
    return { message, timestamp: Date.now() }
  })

  runtime.registerRPC('ping', () => {
    return { pong: true, timestamp: Date.now() }
  })

  // ✅ 注册事件处理
  runtime.registerEvent('broadcast', (payload: unknown, clientId: string) => {
    runtime.broadcast('broadcast', payload, [clientId])
  })
}
```

### 2. Node.js 入口

```typescript
// src/server/entries/node.ts
import { setRuntimeAdapter, getNodeRuntimeAdapter } from '@server/core/runtime'
import { initChatHandlers } from '../module-chat/services/chat-service'

// 初始化运行时适配器
const runtimeAdapter = getNodeRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)

// 初始化业务模块
initChatHandlers()

// WebSocket 升级处理（自动匹配注册的路径）
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '', `http://localhost`)

  if (runtimeAdapter.hasWSPath(url.pathname)) {
    const wssInstance = new WebSocketServer({ noServer: true })
    wssInstance.handleUpgrade(req, socket, head, ws => {
      runtimeAdapter.handleConnection(ws)
    })
  }
})
```

### 3. Cloudflare Workers 入口

```typescript
// src/server/entries/cloudflare.ts
import { setRuntimeAdapter, getCloudflareRuntimeAdapter } from '@server/core/runtime'
import { initChatHandlers } from '../module-chat/services/chat-service'

// 初始化运行时适配器
const runtimeAdapter = getCloudflareRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)

// 初始化业务模块
initChatHandlers()

// WebSocket 请求处理
export default {
  async fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
    const url = new URL(request.url)

    // 自动处理 WebSocket 升级
    if (runtimeAdapter.hasWSPath(url.pathname) && request.headers.get('Upgrade') === 'websocket') {
      return runtimeAdapter.handleWebSocketRequest(request)
    }

    // 其他请求...
  },
}
```

## API 参考

### `runtime.handleWS(path: string)`

注册 WebSocket 路径。

```typescript
runtime.handleWS('/api/chat/ws')
runtime.handleWS('/api/game/ws')
```

### `runtime.registerRPC(method: string, handler)`

注册 RPC 方法。

```typescript
runtime.registerRPC('echo', (params: unknown, clientId: string) => {
  return { result: 'ok' }
})
```

### `runtime.registerEvent(type: string, handler)`

注册事件处理器。

```typescript
runtime.registerEvent('broadcast', (payload: unknown, clientId: string) => {
  runtime.broadcast('broadcast', payload, [clientId])
})
```

### `runtime.broadcast(event: string, data: unknown, exclude?: string[])`

广播消息给所有客户端。

```typescript
runtime.broadcast('notification', { title: 'New message', body: 'Hello!' })
runtime.broadcast('chat', { message: 'Hi' }, [senderId]) // 排除发送者
```

### `runtime.platform`

获取当前平台信息。

```typescript
if (runtime.platform.isCloudflare) {
  // Cloudflare 特定逻辑
}

if (runtime.platform.isNode) {
  // Node.js 特定逻辑
}
```

## 优势

### ✅ 统一的开发体验

- 业务代码完全平台无关
- 一次编写，到处运行
- 无需关心底层实现细节

### ✅ 自动路径管理

- 业务模块自己注册路径
- 入口文件无需硬编码
- 支持动态添加新路径

### ✅ 类型安全

- 完整的 TypeScript 支持
- 编译时类型检查
- IDE 自动补全

### ✅ 易于扩展

- 添加新模块只需调用 `runtime.handleWS()`
- 无需修改核心代码
- 支持多实例隔离

## 迁移指南

### 从旧 API 迁移

**旧代码：**

```typescript
import { getNodeWSServer } from '@server/core'

const wss = getNodeWSServer()
wss.registerRPCHandler('echo', handler)
```

**新代码：**

```typescript
import { runtime } from '@server/core/runtime'

runtime.registerRPC('echo', handler)
```

### 入口文件迁移

**旧代码：**

```typescript
const wss = getNodeWSServer()
initChatHandlers()

server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/api/chat/ws')) {
    // 硬编码
    // ...
  }
})
```

**新代码：**

```typescript
const runtimeAdapter = getNodeRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)
initChatHandlers()

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '', `http://localhost`)
  if (runtimeAdapter.hasWSPath(url.pathname)) {
    // 自动匹配
    // ...
  }
})
```

## 最佳实践

1. **在模块初始化时注册路径**

   ```typescript
   export function initMyModule() {
     runtime.handleWS('/api/my-module/ws')
     runtime.registerRPC('myMethod', handler)
   }
   ```

2. **避免在业务代码中使用平台判断**

   ```typescript
   // ❌ 不推荐
   if (runtime.platform.isCloudflare) {
     // ...
   }

   // ✅ 推荐：使用统一 API
   runtime.broadcast('event', data)
   ```

3. **模块化组织**
   ```typescript
   // 每个模块有自己的初始化函数
   initChatHandlers()
   initGameHandlers()
   initNotificationHandlers()
   ```

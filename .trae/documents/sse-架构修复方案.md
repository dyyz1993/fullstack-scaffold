# SSE 架构修复方案（更新版）

## 关键发现

**WebSocket 正常工作可能是在 Node 环境下测试的！**

在 **Cloudflare Workers** 环境下，broadcast 消息的流向有问题：

### Cloudflare 环境下的 Broadcast 流程

```
createNotificationAndBroadcast()
    │
    ▼
realtime.broadcast('notification', notification)  ← @server/core/index.ts
    │
    ▼
getRealtimeService() → 创建 DO Stub
    │
    ▼
stub.fetch('https://internal/broadcast', { POST, body: {...} })  ← 发到 Durable Object
    │
    ▼
NotificationDO.handleBroadcast()
    │
    ▼
this.core.broadcast()  ← 调用 DO 自己的 RealtimeCore
    │
    ▼
DO.core.sseClients  ← 但 SSE 客户端在 Worker.core.sseClients 中！
```

### Node 环境下的 Broadcast 流程（正常）

```
createNotificationAndBroadcast()
    │
    ▼
realtime.broadcast('notification', notification)
    │
    ▼
getRealtimeService() → 返回 NodeRuntimeAdapter
    │
    ▼
getRuntimeAdapter().broadcast()  ← 直接调用同一个 runtime adapter
    │
    ▼
WorkerRuntimeAdapter.core.broadcast()
    │
    ▼
Worker.core.sseClients  ← SSE 客户端在这里！✓
```

## 问题根源

Cloudflare 环境下，**NotificationDO** 和 **Worker** 各自有独立的 `RealtimeCore` 实例：

```typescript
// Worker: runtime-cloudflare.ts
constructor() {
  this.core = createRealtimeCore()  // 实例 A
}

// DO: NotificationDO.ts
constructor(_state: DurableObjectState) {
  this.core = createRealtimeCore()  // 实例 B
}
```

Broadcast 消息发到 DO 的 core (B)，但 SSE 客户端连接到 Worker 的 core (A)。

## 解决方案

### 方案：NotificationDO 复用 Worker 的 RuntimeAdapter

**核心思路**：让 NotificationDO 使用 Worker 的 `CloudflareRuntimeAdapter`，而不是创建自己的 `RealtimeCore`。

### 架构变更图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Worker                         │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         CloudflareRuntimeAdapter (Singleton)              │  │
│  │                   RealtimeCore (Single)                    │  │
│  │         ┌──────────────────────────────┐                  │  │
│  │         │   sseClients: Map<string>   │ ← 所有 SSE 连接  │  │
│  │         │   wsClients: Map<string>    │ ← 所有 WS 连接  │  │
│  │         └──────────────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │ getCloudflareRuntimeAdapter()      │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Durable Object                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              NotificationDO                                │  │
│  │  broadcast() → adapter.broadcast()                        │  │
│  │  (不复用 core，复用 adapter 的 broadcast 方法)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 实施步骤

### 步骤 1：修改 CloudflareRuntimeAdapter - 添加 broadcast 方法

文件：`src/server/core/runtime-cloudflare.ts`

```typescript
export class CloudflareRuntimeAdapter {
  // ... 现有代码 ...

  broadcast(event: string, data: unknown, exclude: string[] = []): void {
    this.core.broadcast(data, exclude, event)
  }

  // 或者直接暴露 core 的 broadcast
  get realtimeCore(): RealtimeCore {
    return this.core
  }
}
```

### 步骤 2：修改 NotificationDO.ts - 使用 Worker 的 adapter

文件：`src/server/core/durable-objects/NotificationDO.ts`

```typescript
import { getCloudflareRuntimeAdapter } from '../runtime-cloudflare'

export class NotificationDurableObject {
  async fetch(request: Request): Promise<Response> {
    const adapter = getCloudflareRuntimeAdapter()  // 获取 Worker 的 adapter
    const url = new URL(request.url)

    // SSE 路径：让 adapter 处理
    if (adapter.hasSSEPath(url.pathname) && request.headers.get('Accept')?.includes('text/event-stream')) {
      return adapter.handleSSERequest()
    }

    // WebSocket 路径：让 adapter 处理
    if (adapter.hasWSPath(url.pathname) && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return adapter.handleWebSocketRequest(request)
    }

    // broadcast：使用 adapter 的 broadcast 方法（广播到同一个 core）
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const body = (await request.json()) as { event?: string; data: unknown; exclude?: string[] }
      adapter.broadcast(body.event || 'notification', body.data, body.exclude || [])
      return Response.json({
        success: true,
        wsRecipients: adapter.core.wsClients.size,
        sseRecipients: adapter.core.sseClients.size,
      })
    }

    // stats：使用 adapter 的 core
    if (url.pathname === '/stats') {
      return Response.json({
        wsClients: adapter.core.wsClients.size,
        sseClients: adapter.core.sseClients.size,
      })
    }

    return new Response('Not Found', { status: 404 })
  }
}
```

### 步骤 3：修改 runtime.ts - 确保 Cloudflare 环境返回 CloudflareRuntimeAdapter

文件：`src/server/core/runtime.ts`

```typescript
let _adapter: CloudflareRuntimeAdapter | null = null

export function getCloudflareRuntimeAdapter(): CloudflareRuntimeAdapter {
  if (!_adapter) {
    _adapter = new CloudflareRuntimeAdapter()
  }
  return _adapter
}

// 确保 Worker 入口设置正确的 adapter
export function setRuntimeAdapter(adapter: CloudflareRuntimeAdapter): void {
  _adapter = adapter
}
```

### 步骤 4：修改 cloudflare.ts - 初始化时设置 adapter

文件：`src/server/entries/cloudflare.ts`

```typescript
// 在 fetch handler 开头
export default {
  fetch: async (request: Request, env: CloudflareBindings, ctx: ExecutionContext) => {
    // 设置 DB
    ;(globalThis as unknown as { DB: D1Database }).DB = env.DB

    // 设置 adapter（如果还没有）
    if (typeof (globalThis as unknown as { __cfAdapter?: unknown }).__cfAdapter === 'undefined') {
      setRuntimeAdapter(getCloudflareRuntimeAdapter())
    }

    // ... 其余代码
  },
}
```

### 步骤 5：测试验证

1. **SSE 连接测试**：Console 应显示 `Connected:` 消息
2. **Broadcast 测试**：创建通知后，页面应收到 `notification` 事件
3. **多端同步测试**：多个浏览器窗口应同时收到消息

## 代码变更清单

| 文件                      | 变更类型 | 变更内容                  |
| ----------------------- | ---- | --------------------- |
| `runtime-cloudflare.ts` | 修改   | 添加 `broadcast()` 方法   |
| `NotificationDO.ts`     | 重构   | 删除自己的 core，使用 adapter |
| `runtime.ts`            | 确认   | 全局单例管理                |
| `cloudflare.ts`         | 确认   | 设置全局 adapter          |

## 不需要修改的部分

* ✅ `notification-routes.ts` - SSE 路由不变

* ✅ `admin-routes.ts` - SSE 路由不变

* ✅ `realtime-core.ts` - 核心逻辑不变

* ✅ `notification-service.ts` - 业务层不变

* ✅ `realtime-scanner.ts` - 自动注册逻辑不变


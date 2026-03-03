---
paths: src/server/module-notifications/**/*.ts, src/client/stores/notificationStore.ts
---

# SSE (Server-Sent Events) 开发规范

## 🎯 核心原则

SSE 实现必须支持**类型安全的单向推送**，通过 Hono RPC 的 stream 功能实现端到端类型推导。

## 📁 文件结构

```
src/server/
├── module-notifications/
│   ├── routes/
│   │   └── notification-routes.ts    # 包含 SSE 路由
│   ├── services/
│   │   └── notification-service.ts   # 通知业务逻辑
│   └── __tests__/
└── services/realtime/
    ├── core.ts                       # 实时通信核心
    └── index.ts                      # 导出

src/client/
├── stores/
│   └── notificationStore.ts          # SSE 消费 store
└── services/
    └── apiClient.ts                  # 包含 consumeStream
```

## 🌊 SSE 路由规范

### 服务端定义

```typescript
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { streamSSE } from 'hono/streaming';
import { NotificationSchema } from '@shared/schemas';

const streamRoute = createRoute({
  method: 'get',
  path: '/notifications/stream',
  tags: ['notifications'],
  responses: {
    200: {
      content: {
        'text/event-stream': {
          schema: NotificationSchema,
        },
      },
      description: 'SSE stream for real-time notifications',
    },
  },
});

export const notificationRoutes = new OpenAPIHono()
  .openapi(streamRoute, async (c) => {
    return streamSSE(c, async (stream) => {
      // 发送连接成功消息
      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({ timestamp: Date.now() }),
      });

      // 定期发送心跳
      const heartbeat = setInterval(async () => {
        await stream.writeSSE({
          event: 'ping',
          data: JSON.stringify({ time: Date.now() }),
        });
      }, 30000);

      // 监听新通知
      const unsubscribe = subscribeToNotifications(async (notification) => {
        await stream.writeSSE({
          event: 'notification',
          data: JSON.stringify(notification),
        });
      });

      // 等待客户端断开连接
      await new Promise((resolve) => {
        stream.onAbort(resolve);
      });

      // 清理资源
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
```

### 关键点

1. **使用 `streamSSE`**：Hono 提供的 SSE 辅助函数
2. **定义事件类型**：每个消息都有 `event` 和 `data`
3. **心跳机制**：定期发送 ping 保持连接
4. **资源清理**：在 `onAbort` 时清理订阅和定时器

## 📨 消息格式规范

### 标准消息格式

```typescript
interface SSEMessage<T> {
  event: string;    // 事件类型
  data: string;     // JSON 字符串
  id?: string;      // 可选的消息 ID
  retry?: number;   // 可选的重试时间
}
```

### 事件类型约定

```typescript
// 连接事件
{ event: 'connected', data: '{"timestamp":1234567890}' }

// 心跳事件
{ event: 'ping', data: '{"time":1234567890}' }

// 业务事件
{ event: 'notification', data: '{"id":"abc","title":"New message",...}' }
```

## 🔄 客户端消费规范

### 类型安全的流消费

```typescript
import { apiClient, consumeStream } from '@client/services/apiClient';
import type { AppNotification } from '@shared/schemas';

// ✅ 自动类型推导
const responsePromise = apiClient.api.notifications.stream.$get({
  signal: abortController.signal,
});

// consumeStream 会自动解析 JSON 并推导类型
for await (const data of consumeStream(responsePromise)) {
  // data 类型自动推导为 AppNotification
  if (data && typeof data === 'object' && 'type' in data) {
    console.log('New notification:', data);
  }
}
```

### consumeStream 实现

```typescript
// src/client/services/apiClient.ts

export async function* consumeStream<T>(
  responsePromise: Promise<Response>
): AsyncGenerator<T> {
  const response = await responsePromise;
  
  if (!response.ok) {
    throw new Error(`SSE request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // 解析 SSE 格式
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            yield JSON.parse(data) as T;
          } catch (error) {
            console.error('Failed to parse SSE data:', error);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

## 🏪 Zustand Store 集成

### 连接管理

```typescript
import { create } from 'zustand';
import { apiClient, consumeStream } from '@client/services/apiClient';
import type { AppNotification } from '@shared/schemas';

interface NotificationState {
  notifications: AppNotification[];
  sseConnected: boolean;
  connectSSE: () => Promise<void>;
  disconnectSSE: () => void;
}

let sseAbortController: AbortController | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  sseConnected: false,

  connectSSE: async () => {
    if (sseAbortController) return;

    sseAbortController = new AbortController();
    set({ sseConnected: true });

    try {
      const responsePromise = apiClient.api.notifications.stream.$get({
        signal: sseAbortController.signal,
      });

      for await (const data of consumeStream<AppNotification>(responsePromise)) {
        // 过滤非通知事件
        if (data && typeof data === 'object' && 'id' in data) {
          set((state) => {
            // 防止重复
            if (state.notifications.some(n => n.id === data.id)) {
              return state;
            }
            return {
              notifications: [data, ...state.notifications],
            };
          });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('SSE error:', error);
      set({ sseConnected: false });
      
      // 自动重连
      setTimeout(() => {
        sseAbortController = null;
        get().connectSSE();
      }, 5000);
    } finally {
      sseAbortController = null;
      set({ sseConnected: false });
    }
  },

  disconnectSSE: () => {
    if (sseAbortController) {
      sseAbortController.abort();
      sseAbortController = null;
      set({ sseConnected: false });
    }
  },
}));
```

## 🔒 安全规范

### 认证检查

```typescript
import { getCookie } from 'hono/cookie';

export const notificationRoutes = new OpenAPIHono()
  .openapi(streamRoute, async (c) => {
    // 验证用户身份
    const token = getCookie(c, 'auth_token');
    
    if (!token || !validateToken(token)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = getUserIdFromToken(token);

    return streamSSE(c, async (stream) => {
      // 只推送该用户的通知
      const unsubscribe = subscribeToUserNotifications(userId, async (notification) => {
        await stream.writeSSE({
          event: 'notification',
          data: JSON.stringify(notification),
        });
      });

      stream.onAbort(unsubscribe);
    });
  });
```

### 速率限制

```typescript
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimiter.get(userId) || [];
  
  // 保留最近 1 分钟的时间戳
  const recent = timestamps.filter(t => now - t < 60000);
  
  if (recent.length >= 10) {
    return false; // 每分钟最多 10 条消息
  }
  
  recent.push(now);
  rateLimiter.set(userId, recent);
  return true;
}
```

## 📊 连接管理

### 服务端连接池

```typescript
const connections = new Map<string, Set<StreamWriter>>();

function addConnection(userId: string, stream: StreamWriter) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(stream);
}

function removeConnection(userId: string, stream: StreamWriter) {
  connections.get(userId)?.delete(stream);
  if (connections.get(userId)?.size === 0) {
    connections.delete(userId);
  }
}

function broadcastToUser(userId: string, message: unknown) {
  const streams = connections.get(userId);
  if (streams) {
    streams.forEach(stream => {
      stream.writeSSE({
        event: 'notification',
        data: JSON.stringify(message),
      });
    });
  }
}
```

### 客户端重连策略

```typescript
class SSEClient {
  private retryCount = 0;
  private maxRetries = 5;
  private baseDelay = 1000;

  async connect() {
    try {
      await this.doConnect();
      this.retryCount = 0; // 成功后重置
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, this.retryCount);
        console.log(`Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        this.retryCount++;
        await this.connect();
      }
    }
  }
}
```

## 🧪 测试规范

### 服务端测试

```typescript
import { describe, it, expect } from 'vitest';
import app from '../../index';

describe('SSE Routes', () => {
  it('should stream notifications', async () => {
    const response = await app.request('/api/notifications/stream');
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=UTF-8');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    // 读取第一条消息
    const { value } = await reader!.read();
    const message = decoder.decode(value);
    
    expect(message).toContain('event: connected');
    expect(message).toContain('data:');

    reader?.releaseLock();
  });
});
```

### 客户端测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import { useNotificationStore } from '../notificationStore';

describe('NotificationStore SSE', () => {
  it('should handle SSE messages', async () => {
    const store = useNotificationStore.getState();
    
    await store.connectSSE();
    
    // 等待消息
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(store.sseConnected).toBe(true);
    
    store.disconnectSSE();
    expect(store.sseConnected).toBe(false);
  });
});
```

## 📝 命名规范

| 类型 | 约定 | 示例 |
|------|------|------|
| SSE 路由 | /resource/stream | `/notifications/stream` |
| 事件名称 | 小写字母 | `connected`, `notification` |
| Store 方法 | connect/disconnect + SSE | `connectSSE`, `disconnectSSE` |
| 状态字段 | sse + Connected | `sseConnected` |

## 🚫 Anti-Patterns

```typescript
// ❌ 不要在组件中直接管理 SSE 连接
useEffect(() => {
  const eventSource = new EventSource('/api/notifications/stream');
  eventSource.onmessage = (e) => { ... };
}, []);

// ✅ 应该在 Store 中管理
const { connectSSE, disconnectSSE } = useNotificationStore();

useEffect(() => {
  connectSSE();
  return () => disconnectSSE();
}, []);

// ❌ 不要忘记清理资源
const stream = await streamSSE(c, async (stream) => {
  // 没有清理订阅
  subscribeToNotifications(handler);
});

// ✅ 应该在 onAbort 时清理
const unsubscribe = subscribeToNotifications(handler);
stream.onAbort(unsubscribe);

// ❌ 不要硬编码类型
const data = JSON.parse(event.data) as any;

// ✅ 应该使用类型推导
for await (const data of consumeStream<AppNotification>(responsePromise)) {
  // data 类型自动推导
}
```

## 🔄 与 WebSocket 的对比

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| 通信方向 | 单向（服务器→客户端） | 双向 |
| 协议 | HTTP | WS/WSS |
| 重连 | 浏览器自动重连 | 需要手动实现 |
| 适用场景 | 通知、新闻推送 | 聊天、游戏 |
| 类型安全 | Hono RPC + streamSSE | 协议定义 + InferWSProtocol |

## 🎯 最佳实践

1. ✅ 使用 Hono RPC 的 `streamSSE` 实现类型安全
2. ✅ 在 Store 中集中管理连接状态
3. ✅ 实现自动重连机制
4. ✅ 发送心跳保持连接
5. ✅ 在 `onAbort` 时清理资源
6. ✅ 使用 `AbortController` 控制连接
7. ✅ 防止重复消息
8. ✅ 实现速率限制

## 📚 相关文档

- [WebSocket 规范](./websocket-rules.md)
- [Client Service 规范](./client-service-rules.md)
- [Zustand 规范](./zustand-rules.md)

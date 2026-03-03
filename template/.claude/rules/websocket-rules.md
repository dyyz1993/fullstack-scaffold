---
paths: src/server/module-websocket/**/*.ts, src/server/services/realtime/**/*.ts
---

# WebSocket 开发规范

## 🎯 核心原则

WebSocket 实现必须支持**类型安全的双向通信**，通过协议定义实现端到端类型推导。

## 📁 文件结构

```
src/server/
├── module-websocket/
│   ├── routes/
│   │   └── websocket-routes.ts    # WebSocket 路由
│   ├── services/
│   │   └── websocket-service.ts   # WebSocket 业务逻辑
│   └── __tests__/
│       └── websocket-route.test.ts
├── services/realtime/
│   ├── core.ts                    # 实时通信核心
│   ├── node-ws.ts                 # Node.js WebSocket 实现
│   └── types.ts                   # 类型定义
└── utils/
    └── ws-helper.ts               # WebSocket 工具函数
```

## 🔌 WebSocket 路由规范

### OpenAPIHono 模式

```typescript
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import * as wsService from '../services/websocket-service';

const statusRoute = createRoute({
  method: 'get',
  path: '/status',
  tags: ['websocket'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              connectedClients: z.number(),
            }),
          }),
        },
      },
      description: 'Get WebSocket status',
    },
  },
});

const wsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['websocket'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({}).passthrough(),
        },
      },
      description: 'WebSocket endpoint - returns protocol info for type inference',
    },
  },
});

export const websocketRoutes = new OpenAPIHono()
  .openapi(statusRoute, async (c) => {
    const count = wsService.getConnectedClientsCount();
    return c.json({ success: true, data: { connectedClients: count } });
  })
  .openapi(wsRoute, async (c) => {
    return c.json({ protocol: 'AppWSProtocol' as const });
  });
```

### 导出协议类型

**关键**：导出协议类型供客户端使用

```typescript
export type { AppWSProtocol } from '@shared/schemas/ws-protocol';
```

## 🔄 双环境支持

### Node.js 环境

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  const clientId = generateUUID();
  const client: wsService.WSClient = {
    id: clientId,
    send: (data) => ws.send(JSON.stringify(data)),
    close: () => ws.close(),
  };

  wsService.addClient(client);

  ws.on('message', (data) => {
    wsService.handleMessage(
      data.toString(),
      (msg) => ws.send(msg),
      () => ws.readyState,
      () => ws.close()
    );
  });

  ws.on('close', () => {
    wsService.removeClient(client);
  });

  // 发送连接成功消息
  ws.send(JSON.stringify({
    type: 'connected',
    payload: { timestamp: Date.now() },
  }));
});

export const handleWSUpgrade = (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
};
```

### Cloudflare Workers 环境

```typescript
import { createCloudflareWSHandler } from '../../utils/ws-helper';

export const cloudflareWSHandler = createCloudflareWSHandler(
  (data, send, close) => {
    wsService.handleMessage(data, send, () => 1, close);
  },
  undefined,
  () => {
    log.info({}, 'Client disconnected');
  }
);
```

## 📨 消息处理规范

### 消息类型

```typescript
// RPC 请求
interface WSRpcRequest {
  id: string;
  method: string;
  params: unknown;
}

// RPC 响应
interface WSRpcResponse {
  id: string;
  result?: unknown;
  error?: string;
}

// 事件消息
interface WSEventMessage {
  type: string;
  payload: unknown;
}

type WSProtocolMessage = WSRpcRequest | WSRpcResponse | WSEventMessage;
```

### 消息处理服务

```typescript
export function handleMessage(
  data: string,
  send: (msg: string) => void,
  getReadyState: () => number,
  close: () => void
) {
  try {
    const message = JSON.parse(data) as WSProtocolMessage;

    if ('method' in message) {
      // RPC 调用
      handleRpcCall(message, send);
    } else if ('type' in message) {
      // 事件消息
      handleEvent(message);
    }
  } catch (error) {
    send(JSON.stringify({
      id: 'error',
      error: 'Invalid message format',
    }));
  }
}

function handleRpcCall(request: WSRpcRequest, send: (msg: string) => void) {
  const { id, method, params } = request;

  try {
    let result: unknown;

    switch (method) {
      case 'ping':
        result = { pong: Date.now() };
        break;
      case 'echo':
        result = params;
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }

    send(JSON.stringify({ id, result }));
  } catch (error) {
    send(JSON.stringify({
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}
```

## 🏗 协议定义规范

### 共享协议类型

```typescript
// src/shared/schemas/ws-protocol.ts

export interface AppWSProtocol {
  rpc: {
    ping: {
      in: void;
      out: { pong: number };
    };
    echo: {
      in: { message: string };
      out: { message: string };
    };
  };
  events: {
    connected: { timestamp: number };
    notification: { id: string; message: string };
  };
}
```

### 类型推导

```typescript
// 从路由自动推导协议类型
export type InferWSProtocol<T> = T extends { $get: unknown } 
  ? ExtractWSProtocol<Awaited<InferResponseType<T['$get'], 200>>>
  : never;
```

## 🔒 安全规范

### 连接验证

```typescript
// 在建立连接前验证
app.get('/api/ws', async (c, next) => {
  const token = c.req.query('token');
  
  if (!token || !validateToken(token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return next();
});
```

### 消息验证

```typescript
import { z } from 'zod';

const MessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rpc'), id: z.string(), method: z.string(), params: z.unknown() }),
  z.object({ type: z.literal('event'), event: z.string(), payload: z.unknown() }),
]);

function validateMessage(data: unknown): WSProtocolMessage {
  return MessageSchema.parse(data);
}
```

## 📊 连接管理

### 客户端管理

```typescript
export interface WSClient {
  id: string;
  send: (data: unknown) => void;
  close: () => void;
}

const clients = new Map<string, WSClient>();

export function addClient(client: WSClient) {
  clients.set(client.id, client);
  log.info({ clientId: client.id }, 'Client connected');
}

export function removeClient(client: WSClient) {
  clients.delete(client.id);
  log.info({ clientId: client.id }, 'Client disconnected');
}

export function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  clients.forEach(client => client.send(data));
}

export function getConnectedClientsCount() {
  return clients.size;
}
```

## 🧪 测试规范

### WebSocket 测试

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import WebSocket from 'ws';
import app from '../../index';
import { handleWSUpgrade } from '../routes/websocket-routes';

describe('WebSocket Routes', () => {
  let server: ReturnType<typeof createServer>;
  let wsUrl: string;

  beforeAll(async () => {
    server = createServer();
    
    server.on('upgrade', handleWSUpgrade);
    server.on('request', app.fetch);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          wsUrl = `ws://localhost:${address.port}/api/ws`;
        }
        resolve();
      });
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should connect and receive connected event', async () => {
    return new Promise<void>((done) => {
      const ws = new WebSocket(wsUrl);
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message.type).toBe('connected');
        expect(message.payload.timestamp).toBeLessThanOrEqual(Date.now());
        ws.close();
        done();
      });
    });
  });

  it('should handle RPC calls', async () => {
    return new Promise<void>((done) => {
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 'test-1',
          method: 'ping',
          params: null,
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.id === 'test-1') {
          expect(message.result.pong).toBeLessThanOrEqual(Date.now());
          ws.close();
          done();
        }
      });
    });
  });
});
```

## 📝 命名规范

| 类型 | 约定 | 示例 |
|------|------|------|
| 路由文件 | kebab-case-routes.ts | `websocket-routes.ts` |
| 服务文件 | kebab-case-service.ts | `websocket-service.ts` |
| 协议类型 | PascalCase + Protocol | `AppWSProtocol` |
| RPC 方法 | camelCase | `ping`, `echo` |
| 事件类型 | camelCase | `connected`, `notification` |

## 🚫 Anti-Patterns

```typescript
// ❌ 不要在路由中直接处理 WebSocket 逻辑
app.get('/api/ws', (c) => {
  // 错误：应该委托给 service
  const ws = upgradeWebSocket(c);
  ws.on('message', (data) => { ... });
});

// ✅ 应该委托给 service
const websocketRoutes = new OpenAPIHono()
  .openapi(wsRoute, async (c) => {
    return c.json({ protocol: 'AppWSProtocol' as const });
  });

// ❌ 不要硬编码协议类型
const client = new WSClient<AppWSProtocol>();

// ✅ 从路由推导类型
const client = createWS(apiClient.api.ws);
```

## 🔄 与客户端集成

客户端使用 `createWS` 自动推导类型：

```typescript
// 客户端代码
import { createWS } from '@client/services/wsClient';
import { apiClient } from '@client/services/apiClient';

const ws = createWS(apiClient.api.ws);

// 类型安全的 RPC 调用
const result = await ws.call('ping', undefined);
// result.pong 自动推导为 number

// 类型安全的事件监听
ws.on('notification', (payload) => {
  // payload.id 和 payload.message 自动推导
  console.log(payload.message);
});
```

## 🎯 总结

WebSocket 开发的关键点：

1. ✅ 使用 OpenAPIHono 定义路由
2. ✅ 导出协议类型供客户端使用
3. ✅ 支持双环境（Node.js + Cloudflare）
4. ✅ 使用 service 层处理业务逻辑
5. ✅ 实现类型安全的 RPC 和事件系统
6. ✅ 从路由自动推导协议类型

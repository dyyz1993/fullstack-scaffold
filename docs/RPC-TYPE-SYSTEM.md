# 端到端类型安全的 RPC 系统

> 从后端 Schema 定义到前端类型推导 —— 完全类型安全的 HTTP/WebSocket/SSE 通信方案

## 核心优势

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           类型安全通信架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐ │
│   │   Zod Schema    │ ──────> │   TypeScript    │ ──────> │   Frontend   │ │
│   │  (后端定义)      │         │   类型推导       │         │   类型安全    │ │
│   └─────────────────┘         └─────────────────┘         └──────────────┘ │
│                                                                             │
│   ✅ 单一数据源：所有类型定义来自后端 Schema                                   │
│   ✅ 自动推导：前端无需手动定义接口类型                                        │
│   ✅ 编译时检查：类型错误在编译阶段暴露                                        │
│   ✅ 智能提示：IDE 自动补全 API 路径、参数、返回值                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 一、HTTP RPC - RESTful API 类型安全

### 1.1 后端 Schema 定义

```typescript
// server/module-todos/routes/todos-routes.ts
import { createRoute, z } from "@hono/zod-openapi";

const TodoSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
});

const CreateTodoSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional(),
});

const listRoute = createRoute({
  method: "get",
  path: "/todos",
  responses: {
    200: successResponse(z.array(TodoSchema), "List all todos"),
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/todos",
  request: {
    body: {
      content: { "application/json": { schema: CreateTodoSchema } },
    },
  },
  responses: {
    201: successResponse(TodoSchema, "Create a new todo"),
  },
});
```

### 1.2 前端类型推导

```typescript
// client/services/apiClient.ts
import { hc } from "hono/client";
import type { AppType } from "@server/index";

export const apiClient = hc<AppType>(baseUrl);

// ═══════════════════════════════════════════════════════════════
// 🎯 完全类型安全的 API 调用
// ═══════════════════════════════════════════════════════════════

// GET 请求 - 返回类型自动推导
const response = await apiClient.api.todos.$get();
const result = await response.json();
// result.data 的类型: { id: number; title: string; completed: boolean; createdAt: string }[]

// POST 请求 - 请求体类型检查
const createResponse = await apiClient.api.todos.$post({
  json: { title: "New Todo" }, // ✅ 类型正确
  // json: { title: 123 }      // ❌ 编译时报错：类型不匹配
});
```

---

## 二、WebSocket RPC - 双向实时通信

### 2.1 协议类型定义

```typescript
// shared/modules/chat/index.ts
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// WebSocket 协议 Schema
// ═══════════════════════════════════════════════════════════════

export const ChatProtocolSchema = z.object({
  // RPC 方法：双向请求/响应
  rpc: z.object({
    echo: z.object({
      in: z.object({ message: z.string() }),
      out: z.object({ message: z.string(), timestamp: z.number() }),
    }),
    ping: z.object({
      in: z.object({}),
      out: z.object({ pong: z.boolean(), timestamp: z.number() }),
    }),
  }),

  // Events：单向事件推送
  events: z.object({
    notification: z.object({
      title: z.string(),
      body: z.string(),
      timestamp: z.number(),
    }),
    broadcast: z.object({
      message: z.string(),
      timestamp: z.number(),
    }),
    connected: z.object({ timestamp: z.number() }),
  }),
});

export type ChatProtocol = z.infer<typeof ChatProtocolSchema>;
```

### 2.2 WebSocket 客户端接口

```typescript
// shared/core/ws-client.ts
type WSStatus = "connecting" | "open" | "closed" | "reconnecting";

interface WSProtocol {
  rpc: Record<string, { in: unknown; out: unknown }>;
  events: Record<string, unknown>;
}

interface WSClient<T extends WSProtocol = WSProtocol> {
  readonly status: WSStatus;

  // ═══════════════════════════════════════════════════════════════
  // 🎯 RPC 调用 - 类型安全的请求/响应
  // ═══════════════════════════════════════════════════════════════
  call<K extends keyof T["rpc"]>(
    method: K,
    params: T["rpc"][K] extends { in: infer I } ? I : never,
    timeout?: number,
  ): Promise<T["rpc"][K] extends { out: infer O } ? O : never>;

  // ═══════════════════════════════════════════════════════════════
  // 🎯 事件发送 - 类型安全的事件发射
  // ═══════════════════════════════════════════════════════════════
  emit<K extends keyof T["events"]>(type: K, payload: T["events"][K]): void;

  // ═══════════════════════════════════════════════════════════════
  // 🎯 事件订阅 - 类型安全的事件监听
  // ═══════════════════════════════════════════════════════════════
  on<K extends keyof T["events"]>(
    type: K,
    handler: (payload: T["events"][K]) => void,
  ): () => void;

  onStatusChange(handler: (status: WSStatus) => void): () => void;
  close(): void;
}
```

### 2.3 前端使用示例

```typescript
// client/stores/chatWSStore.ts
import { apiClient } from "@client/services/apiClient";
import type { WSClient, ChatProtocol } from "@shared/schemas";

let wsClient: WSClient<ChatProtocol> | null = null;

// 连接 WebSocket - 类型自动推导
wsClient = apiClient.api.chat.ws.$ws();

// ═══════════════════════════════════════════════════════════════
// 🎯 RPC 调用示例
// ═══════════════════════════════════════════════════════════════

// echo 调用 - 参数类型检查，返回值类型推导
const result = await wsClient.call("echo", { message: "hello" });
// result 类型: { message: string; timestamp: number }
console.log(result.message); // ✅ 类型安全
console.log(result.timestamp); // ✅ 类型安全

// ping 调用
const pong = await wsClient.call("ping", {});
// pong 类型: { pong: boolean; timestamp: number }

// ═══════════════════════════════════════════════════════════════
// 🎯 事件订阅示例
// ═══════════════════════════════════════════════════════════════

wsClient.on("notification", (payload) => {
  // payload 类型自动推导: { title: string; body: string; timestamp: number }
  console.log(payload.title); // ✅ 类型安全
});

wsClient.on("broadcast", (payload) => {
  // payload 类型: { message: string; timestamp: number }
  console.log(payload.message); // ✅ 类型安全
});

// ═══════════════════════════════════════════════════════════════
// 🎯 事件发送示例
// ═══════════════════════════════════════════════════════════════

wsClient.emit("broadcast", {
  message: "Hello everyone!",
  timestamp: Date.now(),
}); // ✅ 类型正确

// wsClient.emit('broadcast', { message: 123 })  // ❌ 编译时报错
```

---

## 三、SSE (Server-Sent Events) - 服务器推送

### 3.1 协议类型定义

```typescript
// shared/modules/notifications/schemas.ts
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// SSE 协议 Schema
// ═══════════════════════════════════════════════════════════════

export const AppSSEProtocolSchema = z.object({
  events: z.object({
    notification: z.object({
      id: z.string(),
      type: z.enum(["info", "warning", "error", "success"]),
      title: z.string(),
      body: z.string(),
      read: z.boolean(),
      createdAt: z.string(),
    }),
    "unread-count": z.object({
      count: z.number(),
    }),
    ping: z.object({
      timestamp: z.number(),
    }),
    connected: z.object({
      timestamp: z.number(),
    }),
  }),
});

export type AppSSEProtocol = z.infer<typeof AppSSEProtocolSchema>;
```

### 3.2 SSE 客户端接口

```typescript
// shared/core/sse-client.ts
interface SSEProtocol {
  events: Record<string, unknown>;
}

interface SSEClient<P extends SSEProtocol = SSEProtocol> {
  readonly status: "connecting" | "open" | "closed";

  // ═══════════════════════════════════════════════════════════════
  // 🎯 事件订阅 - 类型安全的事件监听
  // ═══════════════════════════════════════════════════════════════
  on<K extends keyof P["events"]>(
    type: K,
    handler: (payload: P["events"][K]) => void,
  ): () => void;

  onStatusChange(
    handler: (status: "connecting" | "open" | "closed") => void,
  ): () => void;
  onError(handler: (error: Error) => void): () => void;
  abort(): void;
}
```

### 3.3 前端使用示例

```typescript
// client/stores/notificationStore.ts
import { apiClient } from "@client/services/apiClient";
import type { SSEClient, AppSSEProtocol } from "@shared/schemas";

let sseClient: SSEClient<AppSSEProtocol> | null = null;

// 连接 SSE - 类型自动推导
sseClient = apiClient.api.notifications.stream.$sse();

// ═══════════════════════════════════════════════════════════════
// 🎯 事件订阅示例
// ═══════════════════════════════════════════════════════════════

sseClient.on("notification", (notification) => {
  // notification 类型自动推导:
  // { id: string; type: 'info' | 'warning' | 'error' | 'success';
  //   title: string; body: string; read: boolean; createdAt: string }
  console.log(notification.title); // ✅ 类型安全
});

sseClient.on("unread-count", (data) => {
  // data 类型: { count: number }
  console.log(data.count); // ✅ 类型安全
});

sseClient.on("ping", (data) => {
  // data 类型: { timestamp: number }
  console.log(data.timestamp); // ✅ 类型安全
});
```

---

## 四、类型推导工具类型

```typescript
// shared/core/protocol-types.ts

// RPC 方法名提取
export type RpcMethod<T extends { rpc: unknown }> = keyof T["rpc"];

// 事件名提取
export type EventName<T extends { events: unknown }> = keyof T["events"];

// RPC 输入参数类型提取
export type RpcInput<
  T extends { rpc: unknown },
  M extends RpcMethod<T>,
> = T["rpc"][M] extends { in: infer I } ? I : never;

// RPC 输出类型提取
export type RpcOutput<
  T extends { rpc: unknown },
  M extends RpcMethod<T>,
> = T["rpc"][M] extends { out: infer O } ? O : never;

// 事件负载类型提取
export type EventPayload<
  T extends { events: unknown },
  E extends EventName<T>,
> = T["events"][E];
```

---

## 五、类型推导流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        类型推导完整流程                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         后端 Schema 定义                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │  HTTP Routes    │  │  WS Protocol    │  │  SSE Protocol       │  │   │
│  │  │  (Zod Schema)   │  │  (Zod Schema)   │  │  (Zod Schema)       │  │   │
│  │  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │   │
│  │           │                    │                      │             │   │
│  │           ▼                    ▼                      ▼             │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐│   │
│  │  │                    AppType (Hono 路由类型)                       ││   │
│  │  │    - 所有 HTTP 路由类型                                          ││   │
│  │  │    - WebSocket 协议类型 ($ws() 返回类型)                          ││   │
│  │  │    - SSE 协议类型 ($sse() 返回类型)                               ││   │
│  │  └─────────────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      │ 类型导出                               │
│                                      ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         前端类型导入                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐│   │
│  │  │  import type { AppType } from '@server/index'                   ││   │
│  │  │  const apiClient = hc<AppType>(baseUrl)                         ││   │
│  │  └─────────────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      │ 自动推导                               │
│                                      ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         前端使用                                      │   │
│  │                                                                      │   │
│  │  HTTP:  apiClient.api.todos.$get()     → 返回类型自动推导            │   │
│  │  WS:    apiClient.api.chat.ws.$ws()    → WSClient<ChatProtocol>     │   │
│  │  SSE:   apiClient.api.stream.$sse()    → SSEClient<AppSSEProtocol>  │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 六、对比传统方案

| 特性          | 传统方案                   | 本方案                      |
| ------------- | -------------------------- | --------------------------- |
| 类型定义      | 前后端分别定义，容易不一致 | 后端单一数据源，自动同步    |
| API 路径      | 字符串硬编码，易出错       | 类型推导，自动补全          |
| 请求参数      | 运行时校验，调试困难       | 编译时检查，即时反馈        |
| 返回值类型    | 手动定义或 `any`           | 自动推导，精确类型          |
| WebSocket RPC | 无类型支持                 | 完整类型安全的 call/emit/on |
| SSE 事件      | 无类型支持                 | 完整类型安全的事件订阅      |
| 代码维护      | 双重维护，同步成本高       | 单一维护，自动同步          |

---

## 七、技术栈

- **后端框架**: Hono + Zod OpenAPI
- **类型系统**: TypeScript + Zod Schema
- **实时通信**: WebSocket (双向) + SSE (单向推送)
- **客户端**: Hono Client (`hc`) + 自定义 WS/SSE 客户端实现

---

## 八、相关文件

| 类别               | 文件路径                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| WebSocket 协议定义 | [shared/modules/chat/index.ts](../template/src/shared/modules/chat/index.ts)                             |
| SSE 协议定义       | [shared/modules/notifications/schemas.ts](../template/src/shared/modules/notifications/schemas.ts)       |
| WS 客户端实现      | [shared/core/ws-client.ts](../template/src/shared/core/ws-client.ts)                                     |
| SSE 客户端实现     | [shared/core/sse-client.ts](../template/src/shared/core/sse-client.ts)                                   |
| 类型工具           | [shared/core/protocol-types.ts](../template/src/shared/core/protocol-types.ts)                           |
| API 客户端         | [client/services/apiClient.ts](../template/src/client/services/apiClient.ts)                             |
| HTTP 路由示例      | [server/module-todos/routes/todos-routes.ts](../template/src/server/module-todos/routes/todos-routes.ts) |
| WebSocket 使用示例 | [client/stores/chatWSStore.ts](../template/src/client/stores/chatWSStore.ts)                             |
| SSE 使用示例       | [client/stores/notificationStore.ts](../template/src/client/stores/notificationStore.ts)                 |

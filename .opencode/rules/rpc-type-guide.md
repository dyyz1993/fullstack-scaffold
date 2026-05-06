# Hono RPC / SSE / WebSocket Type Inference Guide

This guide explains how end-to-end type safety works in the template application,
covering HTTP RPC, Server-Sent Events (SSE), and WebSocket protocols.

---

## Quick Reference

| Protocol  | Server Definition                 | Client Method             | Content-Type              |
| --------- | --------------------------------- | ------------------------- | ------------------------- |
| HTTP RPC  | `createRoute()` + `.openapi()`    | `$get()`, `$post()`, etc. | `application/json`        |
| SSE       | `createRoute()` + protocol schema | `$sse()`                  | `text/event-stream`       |
| WebSocket | `createRoute()` + protocol schema | `$ws()`                   | `websocket`               |
| Image     | `createRoute()` + binary schema   | `$image()`                | `image/png`, `image/jpeg` |
| SVG       | `createRoute()` + string schema   | `$svg()`                  | `image/svg+xml`           |
| File      | `createRoute()` + binary schema   | `$download()`             | `application/vnd.*`       |

---

## 1. HTTP RPC Type Chain

### Step 1: Define Zod Schema (shared layer)

```typescript
// template/src/shared/modules/todos/schemas.ts
import { z } from "@hono/zod-openapi";

export const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  completed: z.boolean(),
});

export type Todo = z.infer<typeof TodoSchema>;
```

Schemas live in `shared/modules/{module}/schemas.ts` so both server and client can import them.

### Step 2: Define Route with `createRoute()`

```typescript
// template/src/server/module-todos/routes/todos-routes.ts
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { TodoSchema } from "@shared/schemas";
import { successResponse, errorResponse } from "@server/utils/route-helpers";

const listTodosRoute = createRoute({
  method: "get",
  path: "/todos",
  responses: {
    200: successResponse(z.array(TodoSchema), "List todos"),
    400: errorResponse("Bad request"),
  },
});

const createTodoRoute = createRoute({
  method: "post",
  path: "/todos",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ title: z.string().min(1) }),
        },
      },
    },
  },
  responses: {
    201: successResponse(TodoSchema, "Created"),
    400: errorResponse("Validation failed"),
  },
});
```

**Key**: Every response MUST have a Zod schema. Without it, the client gets `unknown`.

### Step 3: Register Route with Chain Syntax

```typescript
// template/src/server/module-todos/routes/todos-routes.ts (continued)
export const apiRoutes = new OpenAPIHono()
  .openapi(listTodosRoute, async (c) => {
    const todos = await listTodos();
    return c.json({ success: true as const, data: todos });
  })
  .openapi(createTodoRoute, async (c) => {
    const body = c.req.valid("json"); // typed!
    const todo = await createTodo(body);
    return c.json({ success: true as const, data: todo }, 201);
  });
```

**Why chain syntax?** Non-chain syntax (`app.openapi(...)` without reassignment) breaks Hono's
type inference. The ESLint rule `require-hono-chain-syntax` enforces this.

### Step 4: Aggregate Routes in Registry

```typescript
// template/src/server/route-registry.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiRoutes } from "./module-todos/routes/todos-routes";
import { chatRoutes } from "./module-chat/routes/chat-routes";
import { notificationRoutes } from "./module-notifications/routes/notification-routes";

export const clientApiRoutes = new OpenAPIHono()
  .use("*", apiRateLimit)
  .route("/api", apiRoutes)
  .route("/api", chatRoutes)
  .route("/api", notificationRoutes);

export type ClientApiRoutes = typeof clientApiRoutes;
```

All route modules are composed here using `.route()` (not `.use()` for routes).

### Step 5: Export Types from App

```typescript
// template/src/server/app.ts
export type ClientApiType = typeof clientApiRoutes;
export type AdminApiType = typeof adminApiRoutes;
export type AppType = ReturnType<typeof createApp>;
```

These types flow to the client via `hc<ClientApiType>()`.

### Step 6: Create Typed Client

```typescript
// template/src/client/services/apiClient.ts
import { hc } from "hono/client";
import type { ClientApiType } from "@server/index";

export const apiClient = hc<ClientApiType>(baseUrl);
```

Now `apiClient.api.todos.$get()` is fully typed:

```typescript
// Autocompletion for paths: apiClient.api.todos
// Autocompletion for methods: $get, $post
// Response type is inferred from Zod schemas
const response = await apiClient.api.todos.$get();
const result = await response.json();
// result.success === true → result.data is Todo[]
```

### Step 7: Use `c.req.valid()` for Typed Request Data

```typescript
.openapi(createTodoRoute, async c => {
  const body = c.req.valid('json')   // typed as { title: string }
  const query = c.req.valid('query') // typed from route query schema
  const { id } = c.req.valid('param') // typed as { id: string }
  // ...
})
```

| Route Schema      | `c.req.valid()` argument |
| ----------------- | ------------------------ |
| `request.body`    | `'json'` or `'body'`     |
| `request.query`   | `'query'`                |
| `request.params`  | `'param'`                |
| `request.headers` | `'header'`               |
| `request.cookies` | `'cookie'`               |

### HTTP RPC Common Pitfalls

| Symptom                                     | Cause                                           |
| ------------------------------------------- | ----------------------------------------------- |
| `Property '$get' does not exist`            | Route not registered with `.openapi()`          |
| Response type is `unknown`                  | Missing or `z.any()` response schema            |
| `c.req.valid()` returns `undefined`         | Missing `request` schema in `createRoute()`     |
| Types lost after adding middleware to route | `.use()` returns `Hono`, not `OpenAPIHono`      |
| `success` is `boolean` instead of `true`    | Used `z.boolean()` instead of `z.literal(true)` |

---

## 2. SSE (Server-Sent Events) Type Chain

SSE provides one-way server-to-client streaming with typed events.

### Step 1: Define SSE Protocol Schema

```typescript
// template/src/shared/modules/notifications/schemas.ts
import { z } from "@hono/zod-openapi";
import { NotificationSchema } from "./schemas";

export const AppSSEProtocolSchema = z.object({
  events: z.object({
    notification: NotificationSchema,
    "unread-count": z.object({ count: z.number() }),
    ping: z.object({ timestamp: z.number() }),
    connected: z.object({ clientId: z.string() }),
  }),
});

export type AppSSEProtocol = z.infer<typeof AppSSEProtocolSchema>;
```

The protocol schema MUST use `events: z.object({ ... })` structure.

### Step 2: Define SSE Route

```typescript
// template/src/server/module-notifications/routes/notification-routes.ts
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { AppSSEProtocolSchema } from "@shared/schemas";

const streamRoute = createRoute({
  method: "get",
  path: "/notifications/stream",
  responses: {
    200: {
      content: {
        "text/event-stream": { schema: AppSSEProtocolSchema },
      },
      description: "SSE stream for notifications",
    },
  },
});
```

**Key requirements**:

- Content type MUST be `'text/event-stream'`
- Schema MUST be a protocol schema with `events` structure
- Route path SHOULD end with `/stream` (naming convention for auto-detection)

### Step 3: Handle SSE Route on Server

```typescript
export const notificationRoutes = new OpenAPIHono().openapi(
  streamRoute,
  async (c) => {
    const adapter = getRuntimeAdapter();
    if ("handleSSERequest" in adapter) {
      return adapter.handleSSERequest();
    }
    return new Response("SSE not supported", { status: 500 });
  },
);
```

The `autoRegisterRealtime()` scanner in `app.ts` automatically discovers SSE routes
by checking for `text/event-stream` content type in the OpenAPI document.

### Step 4: Broadcast Events from Server

```typescript
// template/src/server/module-notifications/services/notification-service.ts
import { realtime } from "@server/core";

export async function createNotificationAndBroadcast(
  input: CreateNotificationInput,
) {
  const notification = createNotification(input);

  // Broadcast to all connected SSE clients — type-safe!
  await realtime.broadcast("notification", notification);
  await realtime.broadcast("unread-count", { count: getUnreadCount() });

  return notification;
}
```

### Step 5: Use Typed SSE on Client

```typescript
// Connect to SSE stream
const conn = await apiClient.api.notifications.stream.$sse();

// Typed event handlers
conn.on("notification", (n) => {
  // n is typed as Notification!
  console.log(n.title, n.body);
});

conn.on("unread-count", (e) => {
  // e is typed as { count: number }!
  console.log("Unread:", e.count);
});

conn.on("ping", (p) => {
  // p is typed as { timestamp: number }!
});

// Cleanup
conn.abort();
```

### SSE Client Interface

```typescript
// template/src/shared/core/sse-client.ts
interface SSEClient<P extends SSEProtocol> {
  readonly status: "connecting" | "open" | "closed";
  on<K extends keyof P["events"]>(
    type: K,
    handler: (payload: P["events"][K]) => void,
  ): () => void; // returns unsubscribe function
  onStatusChange(handler: (status: string) => void): () => void;
  onError(handler: (error: Error) => void): () => void;
  abort(): void;
}
```

### SSE Common Pitfalls

| Symptom                               | Cause                                              |
| ------------------------------------- | -------------------------------------------------- |
| `Property '$sse' does not exist`      | Route content type is not `text/event-stream`      |
| Event types are `unknown`             | Protocol schema doesn't use `events: z.object({})` |
| SSE connection drops silently         | Check console for `autoRegisterRealtime` errors    |
| Types break after middleware in route | Don't use `.use()` in SSE route files              |

### SSE Rules

1. **Never use `new EventSource()`** — use `apiClient.api.xxx.stream.$sse()`
2. **Never use middleware in SSE route files** — middleware breaks type inference (`.use()` returns `Hono`, not `OpenAPIHono`)
3. **Use `realtime.broadcast()`** for broadcasting — don't manually manage SSE clients
4. **Auth goes in handler**, not in middleware for SSE routes

---

## 3. WebSocket Type Chain

WebSocket provides bidirectional typed RPC + event streaming.

### Step 1: Define WebSocket Protocol Schema

```typescript
// template/src/shared/modules/chat/index.ts
import { z } from "@hono/zod-openapi";

export const ChatProtocolSchema = z.object({
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
  events: z.object({
    broadcast: z.object({ message: z.string(), from: z.string() }),
    connected: z.object({ timestamp: z.number() }),
  }),
});

export type ChatProtocol = z.infer<typeof ChatProtocolSchema>;
```

Protocol structure:

- `rpc`: Request-response methods. Each has `{ in: InputSchema, out: OutputSchema }`
- `events`: Server-pushed events. Each maps to a payload schema.

### Step 2: Define WebSocket Route

```typescript
// template/src/server/module-chat/routes/chat-routes.ts
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { ChatProtocolSchema } from "@shared/schemas";

const wsRoute = createRoute({
  method: "get",
  path: "/chat/ws",
  responses: {
    200: {
      content: {
        websocket: { schema: ChatProtocolSchema },
      },
      description: "WebSocket connection",
    },
  },
});
```

**Key**: Content type MUST be `'websocket'`.

### Step 3: Register RPC Handlers on Server

```typescript
// The autoRegisterRealtime scanner discovers WebSocket routes
// and sets up RPC handlers based on the protocol schema.

// For custom RPC handlers:
// template/src/server/module-chat/services/chat-service.ts
import { getRuntimeAdapter } from "@server/core/runtime";

const adapter = getRuntimeAdapter();
adapter.registerRPCHandler("/chat/ws", "echo", async (params) => {
  return { message: params.message, timestamp: Date.now() };
});
```

### Step 4: Use Typed WebSocket on Client

```typescript
// Connect
const ws = apiClient.api.chat.ws.$ws();

// Typed RPC calls
const result = await ws.call("echo", { message: "hello" });
// result is typed as { message: string, timestamp: number }!

const pong = await ws.call("ping", {});
// pong is typed as { pong: boolean, timestamp: number }!

// Typed event listeners
ws.on("broadcast", (payload) => {
  // payload is typed as { message: string, from: string }!
});

ws.on("connected", (payload) => {
  // payload is typed as { timestamp: number }!
});

// Status monitoring
ws.onStatusChange((status) => {
  // status: 'connecting' | 'open' | 'closed' | 'reconnecting'
});

// Cleanup
ws.close();
```

### WebSocket Client Interface

```typescript
// template/src/shared/core/ws-client.ts
interface WSClient<T extends WSProtocol> {
  readonly status: WSStatus; // 'connecting' | 'open' | 'closed' | 'reconnecting'
  getSocket(): WebSocket | null;
  call<K extends keyof T["rpc"]>(
    method: K,
    params: T["rpc"][K] extends { in: infer I } ? I : never,
    timeout?: number,
  ): Promise<T["rpc"][K] extends { out: infer O } ? O : never>;
  emit<K extends keyof T["events"]>(type: K, payload: T["events"][K]): void;
  on<K extends keyof T["events"]>(
    type: K,
    handler: (payload: T["events"][K]) => void,
  ): () => void; // returns unsubscribe function
  onStatusChange(handler: (status: WSStatus) => void): () => void;
  close(): void;
}
```

### WebSocket with React Hook

```typescript
import { useWebSocket } from '@client/hooks/useWebSocket'
import { apiClient } from '@client/services/apiClient'

function ChatComponent() {
  const { status, connect, disconnect, call, on } = useWebSocket(apiClient.api.chat.ws)

  useEffect(() => {
    connect()
    const unsub = on('broadcast', (payload) => console.log(payload))
    return () => { unsub(); disconnect() }
  }, [])

  return <button onClick={() => call('echo', { message: 'hi' })}>Echo</button>
}
```

### WebSocket Common Pitfalls

| Symptom                         | Cause                                            |
| ------------------------------- | ------------------------------------------------ |
| `Property '$ws' does not exist` | Route content type is not `websocket`            |
| `call()` returns `unknown`      | Protocol schema missing `rpc` with `{ in, out }` |
| `on()` event type is `unknown`  | Protocol schema missing `events`                 |
| Types lost in `typeof` export   | Not using chain syntax in route registration     |

### WebSocket Rules

1. **Never use `new WebSocket()`** — use `apiClient.api.xxx.ws.$ws()`
2. **Protocol must follow** `rpc: { [name]: { in: ..., out: ... } }` pattern
3. **RPC handlers must return** the exact output schema shape
4. **Use `useWebSocket` hook** in React components, don't manage WS instances manually

---

## 4. Extended Media Types

The project patches `@hono/zod-openapi` and `hono` to support additional content types
beyond the default `json`/`text`/`sse`/`ws`.

### Patch Files

```
template/patches/
├── @hono+zod-openapi+1.2.2.patch   # ReturnJsonOrTextOrResponse type extension
└── hono+4.12.7.patch               # Client methods + runtime implementation
```

### Image Example

```typescript
// Server
const getAvatarRoute = createRoute({
  method: "get",
  path: "/avatar/:id",
  responses: {
    200: {
      content: {
        "image/png": {
          schema: z.any().openapi({ type: "string", format: "binary" }),
        },
      },
      description: "Avatar image",
    },
  },
});

// Client — auto-inferred as Promise<Blob>
const blob = await apiClient.api.avatar[":id"].$image({ param: { id: "123" } });
const url = URL.createObjectURL(blob);
```

### SVG Example

```typescript
// Server
const getIconRoute = createRoute({
  method: "get",
  path: "/icon/:name",
  responses: {
    200: {
      content: { "image/svg+xml": { schema: z.string() } },
      description: "SVG icon",
    },
  },
});

// Client — auto-inferred as Promise<string>
const svg = await apiClient.api.icon[":name"].$svg({ param: { name: "home" } });
```

### File Download Example

```typescript
// Server
const exportRoute = createRoute({
  method: "get",
  path: "/export",
  responses: {
    200: {
      content: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
          schema: z.any().openapi({ type: "string", format: "binary" }),
        },
      },
    },
  },
});

// Client — auto-inferred as Promise<Blob>
const blob = await apiClient.api.export.$download();
```

### Extended Content-Type Mapping

| Content-Type Pattern       | Client Method    | Return Type              |
| -------------------------- | ---------------- | ------------------------ |
| `application/json`         | `$get()/$post()` | `ClientResponse<T>`      |
| `text/plain`               | `$get()`         | `ClientResponse<string>` |
| `text/event-stream`        | `$sse()`         | `SSEClient<P>`           |
| `websocket`                | `$ws()`          | `WSClient<P>`            |
| `image/svg+xml`            | `$svg()`         | `Promise<string>`        |
| `image/*`                  | `$image()`       | `Promise<Blob>`          |
| `application/*` (non-json) | `$download()`    | `Promise<Blob>`          |
| `multipart/form-data`      | form upload      | `ClientResponse<T>`      |

---

## 5. Architecture: How Type Inference Flows

```
┌───────────────────────────────────────────────────────────────────┐
│                         SERVER                                    │
│                                                                    │
│  Zod Schema ──→ createRoute() ──→ .openapi() ──→ .route() chain  │
│       │              │                │               │            │
│  Input/Output   RouteDefinition  Handler Typed    Aggregation     │
│  validation      with response   in .openapi()    in registry     │
│  schemas         schemas                           (route-        │
│                                                     registry.ts)  │
│                                                          │         │
│  ┌────────────────────────────────────────────────────────┘        │
│  │                                                                  │
│  │  createApp() composes everything:                                │
│  │  const app = new OpenAPIHono()                                   │
│  │    .use('*', middleware...)                                       │
│  │    .route('/', clientApiRoutes)  ← client API routes             │
│  │    .route('/', adminApiRoutes)   ← admin API routes              │
│  │                                                                  │
│  │  Type exports:                                                   │
│  │    type AppType       = ReturnType<typeof createApp>             │
│  │    type ClientApiType = typeof clientApiRoutes                   │
│  │    type AdminApiType  = typeof adminApiRoutes                    │
│  └──────────────┬───────────────────────────────────────────────────┘
│                 │  export type                                       │
└─────────────────┼───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT                                     │
│                                                                      │
│   hc<ClientApiType>(baseUrl, {                                       │
│     fetch: authenticatedFetch,     ← custom fetch for auth          │
│     webSocket: (url) => new WSClientImpl(url),  ← typed WS         │
│     sse: (url) => new SSEClientImpl(url, headers),  ← typed SSE    │
│   })                                                                 │
│         │                                                            │
│         ▼                                                            │
│   apiClient.api.todos.$get()              ← fully typed HTTP RPC    │
│   apiClient.api.chat.ws.$ws()             ← typed WebSocket         │
│   apiClient.api.notifications.stream.$sse()  ← typed SSE            │
│   apiClient.api.icon[':name'].$svg()      ← typed SVG               │
│   apiClient.api.export.$download()        ← typed file download     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. Protocol Type Definitions

The framework layer provides base types for protocol definitions:

```typescript
// template/src/shared/core/protocol-types.ts
export type RpcMethod<T extends { rpc: unknown }> = keyof T["rpc"];
export type EventName<T extends { events: unknown }> = keyof T["events"];
export type RpcInput<
  T extends { rpc: unknown },
  M extends RpcMethod<T>,
> = T["rpc"][M] extends { in: infer I } ? I : never;
export type RpcOutput<
  T extends { rpc: unknown },
  M extends RpcMethod<T>,
> = T["rpc"][M] extends { out: infer O } ? O : never;
export type EventPayload<
  T extends { events: unknown },
  E extends EventName<T>,
> = T["events"][E];
```

### SSE Protocol Constraint

```typescript
// SSE protocols only need events (no rpc)
interface SSEProtocol {
  events: Record<string, unknown>;
}
```

### WebSocket Protocol Constraint

```typescript
// WS protocols need both rpc and events
interface WSProtocol {
  rpc: Record<string, { in: unknown; out: unknown }>;
  events: Record<string, unknown>;
}
```

---

## 7. Debugging Type Issues

### "Property '$get' does not exist on type..."

The route wasn't registered with `.openapi()`. Use:

```typescript
// ❌ Wrong
app.get("/api/todos", handler);

// ✅ Correct
app.openapi(listTodosRoute, handler);
```

### "Property '$sse' does not exist on type..."

The route response content type must be `'text/event-stream'` with a protocol schema:

```typescript
responses: {
  200: {
    content: {
      'text/event-stream': { schema: AppSSEProtocolSchema },
    },
  },
}
```

### "Property '$ws' does not exist on type..."

The route response content type must be `'websocket'` with a protocol schema:

```typescript
responses: {
  200: {
    content: {
      websocket: { schema: ChatProtocolSchema },
    },
  },
}
```

### "Type inference returns 'unknown'"

The Zod response schema is missing or incomplete. Every response must have a Zod schema:

```typescript
// ❌ Missing schema
responses: { 200: { description: 'OK' } }

// ✅ With schema
responses: {
  200: successResponse(z.array(TodoSchema), 'List todos'),
}
```

### "Argument of type X is not assignable to parameter of type Y"

Check the protocol schema matches the handler signature exactly. Common mismatch:

```typescript
// Schema says out has 'timestamp', but handler doesn't return it
const ProtocolSchema = z.object({
  rpc: z.object({
    echo: z.object({
      in: z.object({ message: z.string() }),
      out: z.object({ message: z.string(), timestamp: z.number() }), // requires timestamp
    }),
  }),
});

// Handler must return { message: string, timestamp: number }
```

### Types break after adding middleware to route file

`.use()` on an `OpenAPIHono` returns `Hono`, losing OpenAPI types. Apply middleware in `app.ts` only:

```typescript
// ❌ In route file — breaks types
const routes = new OpenAPIHono()
  .use("*", authMiddleware()) // returns Hono, not OpenAPIHono!
  .openapi(route, handler); // type error!

// ✅ In app.ts — middleware applied before routes
const app = new OpenAPIHono().use("*", authMiddleware()).route("/api", routes); // OK — middleware wraps routes
```

### `autoRegisterRealtime()` silently fails

Check the runtime adapter is properly initialized. SSE/WS routes require the runtime to be
set up before the scanner runs. Look for errors in server startup logs.

---

## 8. Key File Locations

| Purpose                   | File Path                                      |
| ------------------------- | ---------------------------------------------- |
| Server app + type exports | `template/src/server/app.ts`                   |
| Route registry            | `template/src/server/route-registry.ts`        |
| Protocol type helpers     | `template/src/shared/core/protocol-types.ts`   |
| WS client implementation  | `template/src/shared/core/ws-client.ts`        |
| SSE client implementation | `template/src/shared/core/sse-client.ts`       |
| Realtime auto-scanner     | `template/src/server/core/realtime-scanner.ts` |
| Client API client         | `template/src/client/services/apiClient.ts`    |
| Type patches              | `template/patches/@hono+zod-openapi+*.patch`   |
|                           | `template/patches/hono+*.patch`                |
| Example HTTP RPC module   | `template/src/server/module-todos/`            |
| Example SSE module        | `template/src/server/module-notifications/`    |
| Example WebSocket module  | `template/src/server/module-chat/`             |
| Route helper utilities    | `template/src/server/utils/route-helpers.ts`   |

---

## 9. Anti-Patterns Summary

```typescript
// ❌ Never use any
const result: any = await response.json()

// ✅ Use type guards
const result = await response.json()
if (result.success) { /* result.data is typed */ }

// ❌ Never duplicate types
interface ClientTodo { id: number; title: string }

// ✅ Use shared schemas
import type { Todo } from '@shared/schemas'

// ❌ Never hardcode URLs
fetch('/api/todos/' + id)

// ✅ Use typed client
apiClient.api.todos[':id'].$get({ param: { id } })

// ❌ Never use new WebSocket() directly
const ws = new WebSocket('ws://...')

// ✅ Use typed client
const ws = apiClient.api.chat.ws.$ws()

// ❌ Never use new EventSource() directly
const sse = new EventSource('/api/notifications/stream')

// ✅ Use typed client
const conn = await apiClient.api.notifications.stream.$sse()

// ❌ Never use z.boolean() for success field
{ success: z.boolean(), data: TodoSchema }

// ✅ Use z.literal(true) for type narrowing
{ success: z.literal(true), data: TodoSchema }

// ❌ Never apply middleware in route files
export const routes = new OpenAPIHono()
  .use('*', authMiddleware())  // breaks types!
  .openapi(route, handler)

// ✅ Apply middleware in app.ts
const app = new OpenAPIHono()
  .use('/api/*', authMiddleware())
  .route('/api', routes)
```

# WebSocket Route Pattern

## When to Use

When module needs bidirectional real-time communication (chat, collaboration, live editing).

## Server: Protocol Schema

**File**: `template/src/shared/modules/{name}/index.ts`

```typescript
import { z } from '@hono/zod-openapi'

export const {Name}ProtocolSchema = z.object({
  rpc: z.object({
    // Request-response methods
    echo: z.object({
      in: z.object({ message: z.string() }),
      out: z.object({ message: z.string(), timestamp: z.number() }),
    }),
  }),
  events: z.object({
    // Server-push events
    broadcast: z.object({ message: z.string(), from: z.string() }),
    connected: z.object({ timestamp: z.number() }),
  }),
})

export type {Name}Protocol = z.infer<typeof {Name}ProtocolSchema>
```

## Server: Route Definition

**File**: `template/src/server/module-{name}/routes/{name}-routes.ts`

```typescript
const wsRoute = createRoute({
  method: 'get',
  path: '/{names}/ws',
  responses: {
    200: {
      content: {
        websocket: { schema: {Name}ProtocolSchema },
      },
      description: 'WebSocket connection for {names}',
    },
  },
})
```

**CRITICAL**: Content type MUST be `'websocket'`.

## Server: Handler

```typescript
export const apiRoutes = new OpenAPIHono().openapi(wsRoute, async c => {
  // Cloudflare: forward to Durable Object
  const env = c.env as { REALTIME_DO?: DurableObjectNamespace } | undefined
  if (env?.REALTIME_DO) {
    const id = env.REALTIME_DO.idFromName('global')
    const stub = env.REALTIME_DO.get(id)
    return stub.fetch(new Request(c.req.url, { headers: c.req.raw.headers }))
  }

  // Node: runtime adapter handles WebSocket upgrade
  const adapter = getRuntimeAdapter()
  return adapter.handleWSRequest(c)
})
```

## Client: Usage

```typescript
import { apiClient } from '@client/services/apiClient'

const ws = apiClient.api.{names}.ws.$ws()

// Wait for connection
await new Promise<void>(resolve => {
  ws.onStatusChange(status => { if (status === 'open') resolve() })
})

// Typed RPC call
const result = await ws.call('echo', { message: 'hello' })
// result: { message: string, timestamp: number }

// Typed event listener
ws.on('broadcast', payload => {
  // payload: { message: string, from: string }
})

ws.close()
```

## Manifest Declaration

```typescript
{
  hasWebSocket: true,
  routes: {
    standalone: { mountPath: '/api/{names}', file: 'routes/{name}-routes.ts', exportName: 'apiRoutes' },
  },
}
```

## Rules

1. Never use `new WebSocket()` — use `apiClient.api.xxx.ws.$ws()`
2. Protocol MUST follow `{ rpc: { method: { in, out } }, events: { ... } }` pattern
3. RPC handlers MUST return exact output schema shape
4. Use `useWebSocket` hook in React components
5. WS tests require real server: `createTestServer(app, ['/api/{names}/ws'])`

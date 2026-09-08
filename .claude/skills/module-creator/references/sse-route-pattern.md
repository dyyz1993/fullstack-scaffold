# SSE Route Pattern

## When to Use

When module needs server-push events (notifications, live updates, dashboards).

## Server: Protocol Schema

**File**: `template/src/shared/modules/{name}/schemas.ts`

```typescript
import { z } from '@hono/zod-openapi'

// Event payload schemas
const {Name}EventSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.record(z.unknown()),
  timestamp: z.number(),
})

// SSE protocol schema
export const {Name}SSEProtocolSchema = z.object({
  events: z.object({
    '{name}-event': {Name}EventSchema,
    ping: z.object({ timestamp: z.number() }),
    connected: z.object({ clientId: z.string() }),
  }),
})

export type {Name}SSEProtocol = z.infer<typeof {Name}SSEProtocolSchema>
```

## Server: Route Definition

**File**: `template/src/server/module-{name}/routes/{name}-routes.ts`

```typescript
const streamRoute = createRoute({
  method: 'get',
  path: '/{names}/stream',  // MUST end with /stream
  responses: {
    200: {
      content: {
        'text/event-stream': { schema: {Name}SSEProtocolSchema },
      },
      description: 'SSE stream for {names}',
    },
  },
})
```

**CRITICAL**:

- Content type MUST be `'text/event-stream'`
- Path SHOULD end with `/stream` (convention for auto-detection)
- Do NOT use middleware in this file

## Server: Handler

```typescript
export const apiRoutes = new OpenAPIHono().openapi(streamRoute, async c => {
  // Cloudflare: forward to Durable Object
  const env = c.env as { REALTIME_DO?: DurableObjectNamespace } | undefined
  if (env?.REALTIME_DO) {
    const id = env.REALTIME_DO.idFromName('global')
    const stub = env.REALTIME_DO.get(id)
    return stub.fetch(new Request(c.req.url, { headers: c.req.raw.headers }))
  }

  // Node: use runtime adapter
  const adapter = getRuntimeAdapter()
  if ('handleSSERequest' in adapter) {
    return (adapter as any).handleSSERequest()
  }
  return c.json({ success: false, error: 'SSE not supported' }, 500)
})
```

## Server: Broadcasting

```typescript
import { realtime } from '@server/core'

// Broadcast to all SSE clients
await realtime.broadcast('{name}-event', eventPayload)
```

## Client: Usage

```typescript
import { apiClient } from '@client/services/apiClient'

const conn = await apiClient.api.{names}.stream.$sse()
conn.on('{name}-event', (payload) => {
  // payload is fully typed!
})
conn.on('ping', (p) => console.log(p.timestamp))
conn.abort() // cleanup
```

## Manifest Declaration

```typescript
{
  hasSSE: true,
  routes: {
    client: { mountPath: '/api', file: 'routes/{name}-routes.ts', exportName: 'apiRoutes' },
  },
}
```

## Rules

1. Never use `new EventSource()` — use `apiClient.api.xxx.stream.$sse()`
2. Never use middleware in SSE route files
3. Use `realtime.broadcast()` for broadcasting
4. Auth checks go in handler, not in middleware

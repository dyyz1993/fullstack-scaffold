import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { streamSSE } from 'hono/streaming'
import type { TypedResponse } from 'hono'
import { isCloudflare } from '../../utils/env'
import type { AppBindings } from '../../types/bindings'
import { SSEEventSchema } from '@shared/schemas'

const WSStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    connectedClients: z.number(),
  }),
})

const WSRouteResponseSchema = z.object({
  protocol: z.literal('AppWSProtocol'),
  message: z.string(),
})

const statusRoute = createRoute({
  method: 'get',
  path: '/ws/status',
  tags: ['realtime'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: WSStatusResponseSchema,
        },
      },
      description: 'Get WebSocket status',
    },
  },
})

const wsRoute = createRoute({
  method: 'get',
  path: '/ws',
  tags: ['realtime'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: WSRouteResponseSchema,
        },
      },
      description: 'WebSocket endpoint - returns protocol info for type inference',
    },
  },
})

const streamRoute = createRoute({
  method: 'get',
  path: '/notifications/stream',
  tags: ['realtime'],
  responses: {
    200: {
      content: {
        'text/event-stream': {
          schema: SSEEventSchema,
        },
      },
      description: 'SSE stream for notifications',
    },
  },
})

export function createRealtimeRoutes() {
  const app = new OpenAPIHono<{ Bindings: AppBindings }>()
    .openapi(statusRoute, async c => {
      return c.json({ success: true, data: { connectedClients: 0 } })
    })
    .openapi(wsRoute, async c => {
      if (isCloudflare && c.env.NOTIFICATION_DO) {
        const id = c.env.NOTIFICATION_DO.idFromName('global')
        const stub = c.env.NOTIFICATION_DO.get(id)
        return stub.fetch(c.req.raw) as unknown as Promise<
          TypedResponse<{ protocol: 'AppWSProtocol'; message: string }, 200, 'json'>
        >
      }
      return c.json({ protocol: 'AppWSProtocol' as const, message: 'WebSocket upgrade required' })
    })
    .openapi(streamRoute, async c => {
      if (isCloudflare && c.env.NOTIFICATION_DO) {
        const id = c.env.NOTIFICATION_DO.idFromName('global')
        const stub = c.env.NOTIFICATION_DO.get(id)
        return stub.fetch(c.req.raw) as unknown as Promise<
          TypedResponse<z.infer<typeof SSEEventSchema>, 200, 'sse'>
        >
      }
      return streamSSE(c, async stream => {
        await stream.writeSSE({
          event: 'connected',
          data: JSON.stringify({ timestamp: Date.now() }),
        })
        while (true) {
          await stream.sleep(30000)
          await stream.writeSSE({
            event: 'ping',
            data: JSON.stringify({ timestamp: Date.now() }),
          })
        }
      }) as unknown as TypedResponse<z.infer<typeof SSEEventSchema>, 200, 'sse'>
    })

  return app
}

export type RealtimeRoutesType = ReturnType<typeof createRealtimeRoutes>

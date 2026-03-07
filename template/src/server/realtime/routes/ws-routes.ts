import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { handleWSRequest } from '../handlers'
import type { AppBindings } from '../../types/bindings'
import type { TypedResponse } from 'hono'

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

export function createWSRoutes() {
  return new OpenAPIHono<{ Bindings: AppBindings }>()
    .openapi(statusRoute, async c => {
      return c.json({ success: true, data: { connectedClients: 0 } })
    })
    .openapi(wsRoute, async c => {
      return handleWSRequest(c) as unknown as Promise<
        TypedResponse<{ protocol: 'AppWSProtocol'; message: string }, 200, 'json'>
      >
    })
}

export type WSRoutesType = ReturnType<typeof createWSRoutes>

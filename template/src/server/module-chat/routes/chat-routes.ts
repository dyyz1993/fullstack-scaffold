import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { AppBindings } from '../../types/bindings'
import { getRuntimeAdapter } from '@server/core/runtime'
import { ApiSuccessSchema } from '@shared/schemas'
import { ChatProtocolSchema } from '@shared/modules/chat'
import '../services/chat-service'

const WSStatusResponseSchema = ApiSuccessSchema(
  z.object({
    connectedClients: z.number(),
  })
)

const statusRoute = createRoute({
  method: 'get',
  path: '/chat/ws/status',
  tags: ['chat'],
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
  path: '/chat/ws',
  tags: ['chat'],
  responses: {
    200: {
      content: {
        websocket: {
          schema: ChatProtocolSchema,
        },
      },
      description: 'WebSocket endpoint for chat',
    },
  },
})

export const chatRoutes = new OpenAPIHono<{ Bindings: AppBindings }>()
  .openapi(statusRoute, async c => {
    return c.json({ success: true, data: { connectedClients: 0 } })
  })
  .openapi(wsRoute, async _c => {
    const adapter = getRuntimeAdapter()
    if (
      'handleWebSocketRequest' in adapter &&
      typeof adapter.handleWebSocketRequest === 'function'
    ) {
      return (
        adapter as { handleWebSocketRequest: () => Response | Promise<Response> }
      ).handleWebSocketRequest()
    }
    return new Response('WebSocket not supported', { status: 500 })
  })

export type ChatRoutesType = typeof chatRoutes

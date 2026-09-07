import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { AppBindings } from '@server/types/bindings'
import { getRuntimeAdapter } from '@server/core/runtime'
import { ChatProtocolSchema, WebSocketStatusSchema } from '@shared/modules/chat'
import { successResponse, success } from '@server/utils/route-helpers'
import '../services/chat-service'

const statusRoute = createRoute({
  method: 'get',
  path: '/chat/ws/status',
  tags: ['chat'],
  responses: {
    200: successResponse(WebSocketStatusSchema, 'Get WebSocket status'),
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
    return c.json(success({ connectedClients: 3 }))
  })
  .openapi(wsRoute, async _c => {
    const adapter = getRuntimeAdapter()
    if (adapter.handleWebSocketRequest) {
      return adapter.handleWebSocketRequest(_c.req.raw)
    }
    return new Response('WebSocket not supported', { status: 500 })
  })

export type ChatRoutesType = typeof chatRoutes

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type ChatApiType = typeof chatRoutes

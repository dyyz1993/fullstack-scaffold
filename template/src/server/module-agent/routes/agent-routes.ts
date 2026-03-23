import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as agentService from '../services/agent-service'
import { sseManager } from '../services/sse-manager'
import { processChatMessage, abortChat } from '../services/chat-service'
import {
  AgentSchema,
  ChatMessageSchema,
  UpdateAgentSchema,
  SendMessageSchema,
  SuccessSchema,
  SendMessageResponseSchema,
  ChatSSEProtocolSchema,
  RoundsResponseSchema,
} from '@shared/modules/agent'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { getAuthUser } from '../../utils/auth'
import { NotFoundError } from '@server/utils/app-error'
import type { AuthUser } from '@server/middleware/auth'

const AgentResponseSchema = AgentSchema
const MessageListSchema = z.array(ChatMessageSchema)

const defaultUser: AuthUser = {
  id: '3',
  username: 'user1',
  email: 'user1@example.com',
  role: 'user' as AuthUser['role'],
  permissions: [],
}

const getAgentRoute = createRoute({
  method: 'get',
  path: '/agents',
  tags: ['agents'],
  responses: {
    200: successResponse(AgentResponseSchema, 'Get or create agent for current user'),
    401: errorResponse('Unauthorized'),
    500: errorResponse('Internal server error'),
  },
})

const updateAgentRoute = createRoute({
  method: 'put',
  path: '/agents/{id}',
  tags: ['agents'],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { 'application/json': { schema: UpdateAgentSchema } },
    },
  },
  responses: {
    200: successResponse(AgentResponseSchema, 'Update agent'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Agent not found'),
    500: errorResponse('Internal server error'),
  },
})

const getMessagesRoute = createRoute({
  method: 'get',
  path: '/agents/{id}/messages',
  tags: ['agents'],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({
      limit: z.coerce.number().int().positive().optional(),
      offset: z.coerce.number().int().nonnegative().optional(),
    }),
  },
  responses: {
    200: successResponse(MessageListSchema, 'Get messages'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Agent not found'),
    500: errorResponse('Internal server error'),
  },
})

const getRoundsRoute = createRoute({
  method: 'get',
  path: '/agents/{id}/rounds',
  tags: ['agents'],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({
      limit: z.coerce.number().int().positive().optional(),
      before: z.string().optional(),
      after: z.string().optional(),
    }),
  },
  responses: {
    200: successResponse(RoundsResponseSchema, 'Get message rounds'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Agent not found'),
    500: errorResponse('Internal server error'),
  },
})

const sendMessageRoute = createRoute({
  method: 'post',
  path: '/agents/{id}/chat',
  tags: ['agents'],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { 'application/json': { schema: SendMessageSchema } },
    },
  },
  responses: {
    200: successResponse(SendMessageResponseSchema, 'Send message'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Agent not found'),
    500: errorResponse('Internal server error'),
  },
})

const clearMessagesRoute = createRoute({
  method: 'delete',
  path: '/agents/{id}/messages',
  tags: ['agents'],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(SuccessSchema, 'Clear messages'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Agent not found'),
    500: errorResponse('Internal server error'),
  },
})

const stopChatRoute = createRoute({
  method: 'post',
  path: '/agents/{id}/chat/stop',
  tags: ['agents'],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(SuccessSchema, 'Stop chat'),
    401: errorResponse('Unauthorized'),
    500: errorResponse('Internal server error'),
  },
})

const chatStreamRoute = createRoute({
  method: 'get',
  path: '/agents/{id}/chat/stream',
  tags: ['agents'],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        'text/event-stream': { schema: ChatSSEProtocolSchema },
      },
      description: 'SSE stream for chat',
    },
    401: errorResponse('Unauthorized'),
    404: errorResponse('Agent not found'),
  },
})

export const agentRoutes = new OpenAPIHono()
  .openapi(getAgentRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const agent = await agentService.getOrCreateAgent(user.id)

    return c.json(success(agent))
  })
  .openapi(updateAgentRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const { id } = c.req.valid('param')
    const input = c.req.valid('json')

    const agent = await agentService.updateAgent(id, user.id, input)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    return c.json(success(agent))
  })
  .openapi(getMessagesRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const { id } = c.req.valid('param')
    const { limit, offset } = c.req.valid('query')

    const agent = await agentService.getAgent(id, user.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    const messages = await agentService.getMessages(id, user.id, limit, offset)

    return c.json(success(messages))
  })
  .openapi(getRoundsRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const { id } = c.req.valid('param')
    const { limit, before, after } = c.req.valid('query')

    const agent = await agentService.getAgent(id, user.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    const rounds = await agentService.getRounds(id, user.id, { limit, before, after })

    return c.json(success(rounds))
  })
  .openapi(sendMessageRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const { id } = c.req.valid('param')
    const { content } = c.req.valid('json')

    const agent = await agentService.getAgent(id, user.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    const result = await processChatMessage(id, user.id, content)

    return c.json(success(result))
  })
  .openapi(clearMessagesRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const { id } = c.req.valid('param')

    const agent = await agentService.getAgent(id, user.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    await agentService.clearMessages(id, user.id)

    return c.json(success({ success: true }))
  })
  .openapi(chatStreamRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const { id } = c.req.valid('param')

    const agent = await agentService.getAgent(id, user.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    let isClosed = false
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        const sendEvent = (event: string, data: unknown) => {
          if (isClosed) return
          try {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(message))
          } catch {
            isClosed = true
          }
        }

        sendEvent('connected', { timestamp: Date.now() })

        const unsubscribe = sseManager.subscribe(id, {
          send: sendEvent,
          close: () => {
            isClosed = true
          },
        })

        const keepAlive = setInterval(() => {
          sendEvent('heartbeat', { timestamp: Date.now() })
        }, 30000)

        return () => {
          isClosed = true
          clearInterval(keepAlive)
          unsubscribe()
        }
      },
      cancel() {
        isClosed = true
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  })
  .openapi(stopChatRoute, async c => {
    let user = getAuthUser(c)

    if (!user) {
      user = defaultUser
    }

    const { id } = c.req.valid('param')

    const agent = await agentService.getAgent(id, user.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    await abortChat(user.id)

    return c.json(success({ success: true }))
  })

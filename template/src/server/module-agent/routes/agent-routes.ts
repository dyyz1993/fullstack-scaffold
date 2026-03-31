import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as agentService from '../services/agent-service'
import * as workspaceService from '../services/workspace-service'
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

const MessageListSchema = z.array(ChatMessageSchema)

const getAgentRoute = createRoute({
  method: 'get',
  path: '/agents',
  tags: ['agents'],
  responses: {
    200: successResponse(AgentSchema, 'Get or create agent for current user'),
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
    200: successResponse(AgentSchema, 'Update agent'),
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
      before: z.string().optional(),
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
    const user = getAuthUser(c)

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)
    const agent = await agentService.getOrCreateAgent(workspace.id, user.id)

    return c.json(success(agent))
  })
  .openapi(updateAgentRoute, async c => {
    const user = getAuthUser(c)

    const { id } = c.req.valid('param')
    const input = c.req.valid('json')

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)
    const agent = await agentService.updateAgent(id, workspace.id, input)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    return c.json(success(agent))
  })
  .openapi(getMessagesRoute, async c => {
    const user = getAuthUser(c)

    const { id } = c.req.valid('param')
    const { limit, before } = c.req.valid('query')

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)
    const agent = await agentService.getAgent(id, workspace.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    const { rounds } = await agentService.getMessages(
      id,
      workspace.id,
      workspace.path,
      limit,
      before
    )

    return c.json(success(rounds))
  })
  .openapi(getRoundsRoute, async c => {
    const user = getAuthUser(c)

    const { id } = c.req.valid('param')
    const { limit, before } = c.req.valid('query')

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)
    const agent = await agentService.getAgent(id, workspace.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    const { rounds, hasMore, oldestTimestamp } = await agentService.getMessages(
      id,
      workspace.id,
      workspace.path,
      limit,
      before
    )

    return c.json(
      success({
        rounds,
        hasMore,
        oldestTimestamp,
        newestTimestamp: rounds[0]?.timestamp,
      })
    )
  })
  .openapi(sendMessageRoute, async c => {
    const user = getAuthUser(c)

    const { id } = c.req.valid('param')
    const { content } = c.req.valid('json')

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)
    const agent = await agentService.getAgent(id, workspace.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    const result = await processChatMessage(id, user.id, content)

    return c.json(success(result))
  })
  .openapi(clearMessagesRoute, async c => {
    const user = getAuthUser(c)

    const { id } = c.req.valid('param')

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)
    const agent = await agentService.getAgent(id, workspace.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    await agentService.clearMessages(id, workspace.path)

    return c.json(success({ success: true }))
  })
  .openapi(chatStreamRoute, async c => {
    const user = getAuthUser(c)

    const { id } = c.req.valid('param')

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)
    const agent = await agentService.getAgent(id, workspace.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    let isClosed = false
    let keepAlive: ReturnType<typeof setInterval> | undefined
    let unsubscribe: (() => void) | undefined

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

        unsubscribe = sseManager.subscribe(id, user.id, {
          send: sendEvent,
          close: () => {
            isClosed = true
          },
        })

        keepAlive = setInterval(() => {
          sendEvent('heartbeat', { timestamp: Date.now() })
        }, 30000)
      },
      cancel() {
        isClosed = true
        if (keepAlive) clearInterval(keepAlive)
        if (unsubscribe) unsubscribe()
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
    const user = getAuthUser(c)

    const { id } = c.req.valid('param')

    const workspace = await workspaceService.getOrCreateWorkspace(user.id)
    const agent = await agentService.getAgent(id, workspace.id)
    if (!agent) {
      throw new NotFoundError('Agent not found')
    }

    await abortChat(user.id)

    return c.json(success({ success: true }))
  })

import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as notificationService from '../services/notification-service'
import { NotificationSchema, CreateNotificationSchema, AppSSEProtocolSchema } from '@shared/schemas'
import { successResponse, errorResponse, listResponse } from '@server/utils/route-helpers'
import { getRuntimeAdapter } from '@server/core/runtime'

const streamRoute = createRoute({
  method: 'get',
  path: '/notifications/stream',
  tags: ['notifications'],
  responses: {
    200: {
      content: {
        'text/event-stream': { schema: AppSSEProtocolSchema },
      },
      description: 'SSE stream for notifications',
    },
  },
})

const listRoute = createRoute({
  method: 'get',
  path: '/notifications',
  tags: ['notifications'],
  request: {
    query: z.object({
      unreadOnly: z.string().optional(),
      limit: z.string().optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: listResponse(NotificationSchema, 'List notifications'),
    500: errorResponse('Internal server error'),
  },
})

const unreadCountRoute = createRoute({
  method: 'get',
  path: '/notifications/unread-count',
  tags: ['notifications'],
  responses: {
    200: successResponse(z.object({ count: z.number() }), 'Get unread count'),
    500: errorResponse('Internal server error'),
  },
})

const getRoute = createRoute({
  method: 'get',
  path: '/notifications/{id}',
  tags: ['notifications'],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(NotificationSchema, 'Get notification by ID'),
    404: errorResponse('Notification not found'),
  },
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/notifications',
  tags: ['notifications'],
  request: {
    body: {
      content: { 'application/json': { schema: CreateNotificationSchema } },
    },
  },
  responses: {
    201: successResponse(NotificationSchema, 'Create notification'),
    400: errorResponse('Invalid input'),
  },
})

const markAllReadRoute = createRoute({
  method: 'patch',
  path: '/notifications/read-all',
  tags: ['notifications'],
  responses: {
    200: successResponse(z.object({ count: z.number() }), 'Mark all as read'),
    500: errorResponse('Internal server error'),
  },
})

const markReadRoute = createRoute({
  method: 'patch',
  path: '/notifications/{id}/read',
  tags: ['notifications'],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(NotificationSchema, 'Mark as read'),
    404: errorResponse('Notification not found'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/notifications/{id}',
  tags: ['notifications'],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: successResponse(z.object({ id: z.string() }), 'Delete notification'),
    404: errorResponse('Notification not found'),
  },
})

export const notificationRoutes = new OpenAPIHono()
  .openapi(streamRoute, async _c => {
    const adapter = getRuntimeAdapter()
    if ('handleSSERequest' in adapter && typeof adapter.handleSSERequest === 'function') {
      return (
        adapter as { handleSSERequest: () => Response | Promise<Response> }
      ).handleSSERequest()
    }
    return new Response('SSE not supported', { status: 500 })
  })
  .openapi(listRoute, async c => {
    const query = c.req.valid('query')
    const result = notificationService.listNotifications({
      unreadOnly: query.unreadOnly === 'true',
      limit: query.limit ? parseInt(query.limit) : 20,
      cursor: query.cursor,
    })
    return c.json({ success: true, data: { items: result.data, nextCursor: result.nextCursor } })
  })
  .openapi(unreadCountRoute, async c => {
    const count = notificationService.getUnreadCount()
    return c.json({ success: true, data: { count } })
  })
  .openapi(getRoute, async c => {
    const { id } = c.req.valid('param')
    const notification = notificationService.getNotification(id)
    if (!notification) {
      return c.json({ success: false, error: 'Notification not found' }, 404)
    }
    return c.json({ success: true, data: notification })
  })
  .openapi(createRouteDef, async c => {
    const data = c.req.valid('json')
    const env = c.env as { NOTIFICATION_DO?: DurableObjectNamespace }
    const notification = notificationService.createNotificationAndBroadcast(data, env)

    return c.json({ success: true, data: notification }, 201)
  })
  .openapi(markAllReadRoute, async c => {
    const count = notificationService.markAllAsRead()
    return c.json({ success: true, data: { count } })
  })
  .openapi(markReadRoute, async c => {
    const { id } = c.req.valid('param')
    const notification = notificationService.markAsRead(id)
    if (!notification) {
      return c.json({ success: false, error: 'Notification not found' }, 404)
    }
    return c.json({ success: true, data: notification })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const deleted = notificationService.deleteNotification(id)
    if (!deleted) {
      return c.json({ success: false, error: 'Notification not found' }, 404)
    }
    return c.json({ success: true, data: { id } })
  })

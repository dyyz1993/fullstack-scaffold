import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware, type AuthUser } from '@server/middleware/auth'
import * as notificationService from '@server/module-notifications'
import { realtime } from '@server/core'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { logger } from '@server/utils/logger'
import { NotFoundError } from '@server/utils/app-error'
import { Role } from '@shared/modules/permission'
import {
  NotificationSchema,
  NotificationListSchema,
  UnreadCountSchema,
  MarkAllReadResultSchema,
  TestNotificationRequestSchema,
  AppSSEProtocolSchema,
} from '@shared/modules/notifications'
import { AdminSuccessSchema } from '@shared/modules/admin'

function createFallbackSSEResponse(): Response {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const sendPing = () => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {"timestamp":${Date.now()}}\n\n`))
      }
      sendPing()
      const interval = setInterval(sendPing, 30000)
      setTimeout(() => {
        clearInterval(interval)
        controller.close()
      }, 300000)
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

const getNotificationsRoute = createRoute({
  method: 'get',
  path: '/admin/notifications',
  tags: ['notifications'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    query: z.object({
      unreadOnly: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: successResponse(NotificationListSchema, 'Get notifications'),
    401: errorResponse('Unauthorized'),
  },
})

const getUnreadCountRoute = createRoute({
  method: 'get',
  path: '/admin/notifications/unread-count',
  tags: ['notifications'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(UnreadCountSchema, 'Get unread count'),
    401: errorResponse('Unauthorized'),
  },
})

const markNotificationReadRoute = createRoute({
  method: 'put',
  path: '/admin/notifications/:id/read',
  tags: ['notifications'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: successResponse(AdminSuccessSchema, 'Notification marked as read'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('Notification not found'),
  },
})

const markAllNotificationsReadRoute = createRoute({
  method: 'put',
  path: '/admin/notifications/read-all',
  tags: ['notifications'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(MarkAllReadResultSchema, 'All notifications marked as read'),
    401: errorResponse('Unauthorized'),
  },
})

const sendTestNotificationRoute = createRoute({
  method: 'post',
  path: '/admin/notifications/test',
  tags: ['notifications'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    body: {
      content: {
        'application/json': {
          schema: TestNotificationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(NotificationSchema, 'Test notification sent'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const notificationSSERoute = createRoute({
  method: 'get',
  path: '/admin/notifications/stream',
  tags: ['notifications'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: {
      content: {
        'text/event-stream': { schema: AppSSEProtocolSchema },
      },
      description: 'SSE stream for admin notifications',
    },
    401: errorResponse('Unauthorized'),
  },
})

export const adminNotificationRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(getNotificationsRoute, async c => {
    const { unreadOnly, limit } = c.req.valid('query')
    const result = notificationService.listNotifications({
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 20,
    })
    return c.json(success(result.data), 200)
  })
  .openapi(getUnreadCountRoute, async c => {
    const count = notificationService.getUnreadCount()
    return c.json(success({ count }), 200)
  })
  .openapi(markNotificationReadRoute, async c => {
    const { id } = c.req.valid('param')
    const notification = notificationService.markAsRead(id)
    if (!notification) {
      throw new NotFoundError('Notification', id)
    }
    try {
      const unreadCount = notificationService.getUnreadCount()
      await realtime.broadcast('unread-count', { count: unreadCount })
    } catch (err) {
      logger.module('notification').debug({ error: String(err) }, 'Broadcast failed')
    }
    return c.json(success({}), 200)
  })
  .openapi(markAllNotificationsReadRoute, async c => {
    const count = notificationService.markAllAsRead()
    try {
      await realtime.broadcast('unread-count', { count: 0 })
    } catch (err) {
      logger.module('notification').debug({ error: String(err) }, 'Broadcast failed')
    }
    return c.json(success({ count }), 200)
  })
  .openapi(sendTestNotificationRoute, async c => {
    const { type } = c.req.valid('json')
    const notification = await notificationService.createNotificationAndBroadcast({
      type: type ?? 'info',
      title:
        type === 'warning'
          ? '警告通知'
          : type === 'error'
          ? '错误通知'
          : type === 'success'
          ? '成功通知'
          : '系统通知',
      message:
        type === 'warning'
          ? '这是一条警告通知，请注意！'
          : type === 'error'
          ? '这是一条错误通知，请立即处理！'
          : type === 'success'
          ? '操作成功完成！'
          : '这是一条普通信息通知',
    })
    return c.json(success(notification), 200)
  })
  .openapi(notificationSSERoute, async c => {
    const env = c.env as { REALTIME_DO?: DurableObjectNamespace } | undefined
    if (env?.REALTIME_DO) {
      const id = env.REALTIME_DO.idFromName('global')
      const stub = env.REALTIME_DO.get(id)
      const doRequest = new Request(c.req.url, {
        method: c.req.method,
        headers: c.req.raw.headers,
      })
      return stub.fetch(doRequest)
    }

    try {
      const { getRuntimeAdapter } = await import('@server/core/runtime')
      const adapter = getRuntimeAdapter()
      if (adapter.handleSSERequest) {
        const response = await adapter.handleSSERequest()
        return response
      }
    } catch {
      return createFallbackSSEResponse()
    }

    return createFallbackSSEResponse()
  })

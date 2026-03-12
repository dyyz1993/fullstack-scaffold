import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware, type AuthUser } from '../../middleware/auth'
import { getAuthUser } from '../../utils/auth'
import * as adminService from '../services/admin-service'
import { successResponse, errorResponse } from '../../utils/route-helpers'
import {
  SystemStatsSchema,
  HealthCheckSchema,
  RecentActivitySchema,
  AuthUserSchema,
  ClearTodosResultSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  UserSchema,
  UserListSchema,
  UpdateUserRequestSchema,
  SuccessSchema,
} from '@shared/modules/admin'
import {
  NotificationSchema,
  NotificationListSchema,
  UnreadCountSchema,
  MarkAllReadResultSchema,
  TestNotificationRequestSchema,
  AppSSEProtocolSchema,
} from '@shared/modules/notifications'

const getStatsRoute = createRoute({
  method: 'get',
  path: '/admin/stats',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: 'admin' })],
  responses: {
    200: successResponse(SystemStatsSchema, 'Get system statistics'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getHealthRoute = createRoute({
  method: 'get',
  path: '/admin/health',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: 'admin' })],
  responses: {
    200: successResponse(HealthCheckSchema, 'Get system health'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getRecentActivityRoute = createRoute({
  method: 'get',
  path: '/admin/activity',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: 'admin' })],
  request: {
    query: z.object({
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: successResponse(RecentActivitySchema, 'Get recent activity'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const clearAllTodosRoute = createRoute({
  method: 'delete',
  path: '/admin/todos/all',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: 'admin' })],
  responses: {
    200: successResponse(ClearTodosResultSchema, 'All todos cleared'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getCurrentUserRoute = createRoute({
  method: 'get',
  path: '/admin/me',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(AuthUserSchema, 'Get current authenticated user'),
    401: errorResponse('Unauthorized'),
  },
})

const loginRoute = createRoute({
  method: 'post',
  path: '/admin/login',
  tags: ['admin'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(LoginResponseSchema, 'Login successful'),
    401: errorResponse('Invalid credentials'),
  },
})

const registerRoute = createRoute({
  method: 'post',
  path: '/admin/register',
  tags: ['admin'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: successResponse(UserSchema, 'User registered'),
    400: errorResponse('User already exists'),
  },
})

const getUsersRoute = createRoute({
  method: 'get',
  path: '/admin/users',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: 'admin' })],
  responses: {
    200: successResponse(UserListSchema, 'Get user list'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getUserRoute = createRoute({
  method: 'get',
  path: '/admin/users/:id',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: 'admin' })],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: successResponse(UserSchema, 'Get user'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('User not found'),
  },
})

const updateUserRoute = createRoute({
  method: 'put',
  path: '/admin/users/:id',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: 'admin' })],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(UserSchema, 'User updated'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('User not found'),
  },
})

const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/admin/users/:id',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: 'admin' })],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: successResponse(SuccessSchema, 'User deleted'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('User not found'),
  },
})

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
    200: successResponse(SuccessSchema, 'Notification marked as read'),
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
  middleware: [authMiddleware({ requiredRole: 'admin' })],
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

export const adminRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(getStatsRoute, async c => {
    const stats = await adminService.getSystemStats()
    return c.json({ success: true, data: stats })
  })
  .openapi(getHealthRoute, async c => {
    const health = await adminService.checkDatabaseHealth()
    return c.json({ success: true, data: health })
  })
  .openapi(getRecentActivityRoute, async c => {
    const { limit } = c.req.valid('query')
    const limitNum = limit ? parseInt(limit, 10) : 10
    const activity = await adminService.getRecentActivity(limitNum)
    return c.json({ success: true, data: activity })
  })
  .openapi(clearAllTodosRoute, async c => {
    const result = await adminService.clearAllTodos()
    return c.json({ success: true, data: result })
  })
  .openapi(getCurrentUserRoute, async c => {
    const user = getAuthUser(c)
    return c.json({ success: true, data: user })
  })
  .openapi(loginRoute, async c => {
    try {
      const data = c.req.valid('json')
      const result = await adminService.login(data)
      return c.json({ success: true, data: result })
    } catch (error) {
      return c.json({ success: false, error: (error as Error).message }, 401)
    }
  })
  .openapi(registerRoute, async c => {
    try {
      const data = c.req.valid('json')
      const user = await adminService.register(data)
      return c.json({ success: true, data: user }, 201)
    } catch (error) {
      return c.json({ success: false, error: (error as Error).message }, 400)
    }
  })
  .openapi(getUsersRoute, async c => {
    const users = await adminService.getUsers()
    return c.json({ success: true, data: users })
  })
  .openapi(getUserRoute, async c => {
    const { id } = c.req.valid('param')
    const user = await adminService.getUserById(id)
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }
    return c.json({ success: true, data: user })
  })
  .openapi(updateUserRoute, async c => {
    try {
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')
      const user = await adminService.updateUser(id, data)
      return c.json({ success: true, data: user })
    } catch (error) {
      return c.json({ success: false, error: (error as Error).message }, 404)
    }
  })
  .openapi(deleteUserRoute, async c => {
    try {
      const { id } = c.req.valid('param')
      await adminService.deleteUser(id)
      return c.json({ success: true })
    } catch (error) {
      return c.json({ success: false, error: (error as Error).message }, 404)
    }
  })
  .openapi(getNotificationsRoute, async c => {
    const { unreadOnly, limit } = c.req.valid('query')
    const notifications = adminService.getNotifications({
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 20,
    })
    return c.json({ success: true, data: notifications })
  })
  .openapi(getUnreadCountRoute, async c => {
    const count = adminService.getUnreadCount()
    return c.json({ success: true, data: { count } })
  })
  .openapi(markNotificationReadRoute, async c => {
    const { id } = c.req.valid('param')
    const success = adminService.markNotificationRead(id)
    if (!success) {
      return c.json({ success: false, error: 'Notification not found' }, 404)
    }
    return c.json({ success: true })
  })
  .openapi(markAllNotificationsReadRoute, async c => {
    const count = adminService.markAllNotificationsRead()
    return c.json({ success: true, data: { count } })
  })
  .openapi(sendTestNotificationRoute, async c => {
    const { type } = c.req.valid('json')
    const notification = await adminService.sendTestNotification(type)
    return c.json({ success: true, data: notification })
  })
  .openapi(notificationSSERoute, async _c => {
    const { getRuntimeAdapter } = await import('@server/core/runtime')
    const adapter = getRuntimeAdapter()
    if ('handleSSERequest' in adapter && typeof adapter.handleSSERequest === 'function') {
      return (
        adapter as { handleSSERequest: () => Response | Promise<Response> }
      ).handleSSERequest()
    }
    return new Response('SSE not supported', { status: 500 })
  })

export default adminRoutes

/*
 * @framework-modify
 * @reason 添加权限管理相关的API路由，支持角色权限体系
 * @impact 新增权限管理、角色查询、用户权限查询等API端点
 */
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
  CreateUserRequestSchema,
  SuccessSchema,
  DownloadTokenSchema,
} from '@shared/modules/admin'
import { Role } from '@shared/modules/admin'
import {
  NotificationSchema,
  NotificationListSchema,
  UnreadCountSchema,
  MarkAllReadResultSchema,
  TestNotificationRequestSchema,
  AppSSEProtocolSchema,
} from '@shared/modules/notifications'

const downloadTokens = new Map<string, { createdAt: number; expiresIn: number }>()

const generateDownloadToken = () => {
  const token =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  downloadTokens.set(token, { createdAt: Date.now(), expiresIn: 60000 })
  setTimeout(() => downloadTokens.delete(token), 60000)
  return token
}

const isValidDownloadToken = (token: string) => {
  const data = downloadTokens.get(token)
  if (!data) return false
  if (Date.now() - data.createdAt > data.expiresIn) {
    downloadTokens.delete(token)
    return false
  }
  return true
}

const consumeDownloadToken = (token: string) => {
  const valid = isValidDownloadToken(token)
  if (valid) {
    downloadTokens.delete(token)
  }
  return valid
}

const getStatsRoute = createRoute({
  method: 'get',
  path: '/admin/stats',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
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
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
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
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
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
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
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
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
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
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
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
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
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
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
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

const createUserRoute = createRoute({
  method: 'post',
  path: '/admin/users',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(UserSchema, 'User created'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    400: errorResponse('Invalid request'),
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

const getAvatarRoute = createRoute({
  method: 'get',
  path: '/admin/avatar/:id',
  tags: ['media'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'image/png': { schema: z.any().openapi({ type: 'string', format: 'binary' }) },
        'image/jpeg': { schema: z.any().openapi({ type: 'string', format: 'binary' }) },
      },
      description: 'User avatar image',
    },
    401: errorResponse('Unauthorized'),
    404: errorResponse('Avatar not found'),
  },
})

const getIconRoute = createRoute({
  method: 'get',
  path: '/admin/icon/:name',
  tags: ['media'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: z.object({
      name: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'image/svg+xml': { schema: z.string() },
      },
      description: 'SVG icon',
    },
    401: errorResponse('Unauthorized'),
    404: errorResponse('Icon not found'),
  },
})

const exportTodosRoute = createRoute({
  method: 'get',
  path: '/admin/todos/export',
  tags: ['export'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: {
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: z.any().openapi({ type: 'string', format: 'binary' }),
        },
        'text/csv': { schema: z.string() },
      },
      description: 'Export todos as Excel or CSV',
    },
    401: errorResponse('Unauthorized'),
  },
})

const generateDownloadTokenRoute = createRoute({
  method: 'post',
  path: '/admin/todos/export/token',
  tags: ['export'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(DownloadTokenSchema, 'Generate a temporary download token'),
    401: errorResponse('Unauthorized'),
  },
})

const downloadWithTokenRoute = createRoute({
  method: 'get',
  path: '/admin/todos/export/download/:token',
  tags: ['export'],
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'text/csv': { schema: z.string() },
      },
      description: 'Download CSV with temporary token',
    },
    403: errorResponse('Invalid or expired token'),
  },
})

const exportTodosStreamRoute = createRoute({
  method: 'get',
  path: '/admin/todos/export/stream',
  tags: ['export'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: {
      content: {
        'text/csv': { schema: z.string() },
      },
      description: 'Stream export todos as CSV (for large datasets)',
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
  .openapi(createUserRoute, async c => {
    try {
      const data = c.req.valid('json')
      const user = await adminService.createUser(data)
      return c.json({ success: true, data: user })
    } catch (error) {
      return c.json({ success: false, error: (error as Error).message }, 400)
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
  .openapi(getAvatarRoute, async c => {
    const { id } = c.req.valid('param')
    const avatar = await adminService.getAvatar(id)
    if (!avatar) {
      return c.json({ success: false, error: 'Avatar not found' }, 404)
    }
    return new Response(avatar.data, {
      headers: {
        'Content-Type': avatar.contentType,
      },
    })
  })
  .openapi(getIconRoute, async c => {
    const { name } = c.req.valid('param')
    const svg = await adminService.getIcon(name)
    if (!svg) {
      return c.json({ success: false, error: 'Icon not found' }, 404)
    }
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    })
  })
  .openapi(exportTodosRoute, async _c => {
    const todos = await adminService.getAllTodos()
    const encoder = new TextEncoder()

    const allTodos = [
      ...todos,
      ...Array.from({ length: 100 }, (_, i) => ({
        id: 1000 + i,
        title: `模拟数据 ${i + 1} - 这是一个比较长的标题用于增加数据量`,
        completed: i % 2 === 0,
        createdAt: new Date().toISOString(),
      })),
    ]

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('id,title,completed,created_at\n'))

        for (const todo of allTodos) {
          const line = `${todo.id},"${todo.title.replace(/"/g, '""')}",${todo.completed},${todo.createdAt}\n`
          controller.enqueue(encoder.encode(line))
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todos.csv"',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  })
  .openapi(generateDownloadTokenRoute, async c => {
    const token = generateDownloadToken()
    const downloadUrl = `/api/admin/todos/export/download/${token}`
    return c.json({
      success: true as const,
      data: {
        token,
        downloadUrl,
        expiresIn: 60000,
      },
    })
  })
  .openapi(downloadWithTokenRoute, async c => {
    const { token } = c.req.valid('param')

    if (!consumeDownloadToken(token)) {
      return c.json({ success: false as const, error: 'Invalid or expired token' }, 403)
    }

    const todos = await adminService.getAllTodos()
    const encoder = new TextEncoder()

    const allTodos = [
      ...todos,
      ...Array.from({ length: 100 }, (_, i) => ({
        id: 1000 + i,
        title: `模拟数据 ${i + 1} - 这是一个比较长的标题用于增加数据量`,
        completed: i % 2 === 0,
        createdAt: new Date().toISOString(),
      })),
    ]

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('id,title,completed,created_at\n'))

        for (const todo of allTodos) {
          const line = `${todo.id},"${todo.title.replace(/"/g, '""')}",${todo.completed},${todo.createdAt}\n`
          controller.enqueue(encoder.encode(line))
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todos.csv"',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  })
  .openapi(exportTodosStreamRoute, async _c => {
    const todos = await adminService.getAllTodos()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('id,title,completed,created_at\n'))

        const allTodos = [
          ...todos,
          ...Array.from({ length: 10 }, (_, i) => ({
            id: 1000 + i,
            title: `模拟数据 ${i + 1}`,
            completed: i % 2 === 0,
            createdAt: new Date().toISOString(),
          })),
        ]

        for (let i = 0; i < allTodos.length; i++) {
          const todo = allTodos[i]
          const line = `${todo.id},"${todo.title.replace(/"/g, '""')}",${todo.completed},${todo.createdAt}\n`
          controller.enqueue(encoder.encode(line))

          await new Promise(resolve => setTimeout(resolve, 300))
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todos-stream.csv"',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  })
export default adminRoutes

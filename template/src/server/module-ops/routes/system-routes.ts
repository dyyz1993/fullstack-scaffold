import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware, type AuthUser } from '../../middleware/auth'
import * as adminService from '../services/admin-service'
import { successResponse, errorResponse, success } from '../../utils/route-helpers'
import { Role } from '@platform/shared/permission'
import {
  SystemStatsSchema,
  HealthCheckSchema,
  RecentActivitySchema,
  ClearTodosResultSchema,
  SettingsSchema,
  UpdateSettingsSchema,
  MonitorDataSchema,
  TodoDailyCountsSchema,
} from '@shared/modules/ops'
import * as settingsService from '../services/settings-service'

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

const getSettingsRoute = createRoute({
  method: 'get',
  path: '/admin/settings',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  responses: {
    200: successResponse(SettingsSchema, 'Get site settings'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const updateSettingsRoute = createRoute({
  method: 'put',
  path: '/admin/settings',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateSettingsSchema,
        },
      },
    },
  },
  responses: {
    200: successResponse(SettingsSchema, 'Update site settings'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getMonitorRoute = createRoute({
  method: 'get',
  path: '/admin/monitor',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  responses: {
    200: successResponse(MonitorDataSchema, 'Get system monitor data'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getTodoDailyCountsRoute = createRoute({
  method: 'get',
  path: '/admin/stats/daily',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  responses: {
    200: successResponse(TodoDailyCountsSchema, 'Get daily todo counts for last 7 days'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

export const systemRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(getStatsRoute, async c => {
    const stats = await adminService.getSystemStats()
    return c.json(success(stats), 200)
  })
  .openapi(getHealthRoute, async c => {
    const health = await adminService.checkDatabaseHealth()
    return c.json(success(health), 200)
  })
  .openapi(getRecentActivityRoute, async c => {
    const { limit } = c.req.valid('query')
    const limitNum = limit ? parseInt(limit, 10) : 10
    const activity = await adminService.getRecentActivity(limitNum)
    return c.json(success(activity), 200)
  })
  .openapi(clearAllTodosRoute, async c => {
    const result = await adminService.clearAllTodos()
    return c.json(success(result), 200)
  })
  .openapi(getSettingsRoute, async c => {
    const settings = settingsService.getSettings()
    return c.json(success(settings), 200)
  })
  .openapi(updateSettingsRoute, async c => {
    const body = c.req.valid('json')
    const settings = settingsService.updateSettings(body)
    return c.json(success(settings), 200)
  })
  .openapi(getMonitorRoute, async c => {
    const mem = process.memoryUsage()
    let dbStatus: 'connected' | 'disconnected' = 'disconnected'
    try {
      await adminService.checkDatabaseHealth()
      dbStatus = 'connected'
    } catch {
      // keep disconnected
    }
    return c.json(
      success({
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        uptime: process.uptime(),
        memory: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          external: Math.round(mem.external / 1024 / 1024),
        },
        database: dbStatus,
        timestamp: new Date().toISOString(),
      }),
      200
    )
  })
  .openapi(getTodoDailyCountsRoute, async c => {
    const counts = await adminService.getTodoDailyCounts(7)
    return c.json(success(counts), 200)
  })

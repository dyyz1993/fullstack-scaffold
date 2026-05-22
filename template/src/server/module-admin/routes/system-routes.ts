import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware, type AuthUser } from '@server/middleware/auth'
import * as adminService from '../services/admin-service'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { Role } from '@shared/modules/permission'
import {
  SystemStatsSchema,
  HealthCheckSchema,
  RecentActivitySchema,
  ClearTodosResultSchema,
  SettingsSchema,
  UpdateSettingsSchema,
} from '@shared/modules/admin'

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
    200: successResponse(SettingsSchema, 'Get system settings'),
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
      content: { 'application/json': { schema: UpdateSettingsSchema } },
    },
  },
  responses: {
    200: successResponse(SettingsSchema, 'Settings updated'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

let settingsState: z.infer<typeof SettingsSchema> = {
  siteName: 'Biomimic Admin',
  siteDescription: 'A full-stack admin dashboard',
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  emailFrom: 'noreply@example.com',
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  emailNotifications: true,
  pushNotifications: false,
}

export const systemRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(getSettingsRoute, async c => {
    return c.json(success(settingsState), 200)
  })
  .openapi(updateSettingsRoute, async c => {
    const body = c.req.valid('json')
    settingsState = { ...settingsState, ...body }
    return c.json(success(settingsState), 200)
  })
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

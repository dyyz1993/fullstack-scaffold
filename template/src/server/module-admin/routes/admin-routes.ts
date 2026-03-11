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
} from '@shared/modules/admin'

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
  .doc('/docs', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Admin API',
    },
  })

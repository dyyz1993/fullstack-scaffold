import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse } from '@server/utils/route-helpers'
import { ProfileSchema } from '@shared/schemas'

const getProfileRoute = createRoute({
  method: 'get',
  path: '/profile',
  responses: {
    200: successResponse(ProfileSchema, 'Get user profile'),
  },
})

export const profileRoutes = new OpenAPIHono().openapi(getProfileRoute, async c => {
  return c.json({
    success: true as const,
    data: {
      id: 'user-1',
      username: 'Demo User',
      email: 'demo@example.com',
      bio: 'A demo user profile',
      joinDate: new Date().toISOString(),
      stats: {
        posts: 12,
        followers: 48,
        following: 25,
      },
    },
    timestamp: new Date().toISOString(),
  })
})

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type ProfileApiType = typeof profileRoutes

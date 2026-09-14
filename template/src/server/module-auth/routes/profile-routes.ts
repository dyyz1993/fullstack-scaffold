import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import { ProfileSchema } from '@shared/schemas'
import { authMiddleware } from '@server/middleware/auth'
import * as authService from '../services/auth-service'

const getProfileRoute = createRoute({
  method: 'get',
  path: '/profile',
  tags: ['auth'],
  security: [{ Bearer: [] }],
  // P2：此前免鉴权且恒 200 返回硬编码模拟身份（Demo User），任何人可拉取
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(ProfileSchema, 'Get the current authenticated user profile'),
    401: errorResponse('Unauthorized'),
  },
})

export const profileRoutes = new OpenAPIHono().openapi(getProfileRoute, async c => {
  // 返回当前登录用户真实身份；developers 表无记录（dev token）时回退 token claims
  const user = c.get('authUser')
  const developer = await authService.getDeveloperById(user.id)
  return c.json(
    success({
      id: user.id,
      username: developer?.username ?? user.username,
      email: developer?.email ?? user.email,
      bio: null,
      joinDate: developer?.createdAt ?? new Date().toISOString(),
      stats: {
        posts: 0,
        followers: 0,
        following: 0,
      },
    }),
    200
  )
})

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type ProfileApiType = typeof profileRoutes

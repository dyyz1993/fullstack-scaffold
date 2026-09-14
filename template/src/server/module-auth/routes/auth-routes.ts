import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import * as authService from '../services/auth-service'
import {
  DeveloperProfileSchema,
  RegisterSchema,
  LoginSchema,
  TokenResponseSchema,
} from '@shared/modules/auth'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import { success, created } from '@server/utils/route-helpers'
import { authMiddleware } from '@server/middleware/auth'
import type { AuthUser } from '@server/middleware/auth'

import jwt from 'jsonwebtoken'
import type { DeveloperProfile } from '@shared/modules/auth'

const secretKey = process.env.AUTH_SECRET_KEY || 'dev-secret-key-change-in-production'

function signToken(profile: DeveloperProfile): string {
  return jwt.sign(
    {
      userId: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role,
    },
    secretKey,
    { expiresIn: '7d' }
  )
}

const registerRoute = createRoute({
  method: 'post',
  path: '/auth/register',
  tags: ['auth'],
  request: {
    body: {
      content: { 'application/json': { schema: RegisterSchema } },
    },
  },
  responses: {
    201: successResponse(TokenResponseSchema, 'Register a new developer'),
    409: errorResponse('Email or username already exists'),
    400: errorResponse('Invalid input'),
  },
})

const loginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  tags: ['auth'],
  request: {
    body: {
      content: { 'application/json': { schema: LoginSchema } },
    },
  },
  responses: {
    200: successResponse(TokenResponseSchema, 'Login and get token'),
    401: errorResponse('Invalid credentials'),
    400: errorResponse('Invalid input'),
  },
})

const verifyRoute = createRoute({
  method: 'get',
  path: '/auth/verify',
  tags: ['auth'],
  security: [{ Bearer: [] }],
  // 此前缺 authMiddleware：c.get('authUser') 恒 undefined，路由必 500
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(DeveloperProfileSchema, 'Verify token and get profile'),
    401: errorResponse('Unauthorized'),
  },
})

const meRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['auth'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(DeveloperProfileSchema, 'Get the current authenticated user profile'),
    401: errorResponse('Unauthorized'),
  },
})

/**
 * 由 authUser 解析当前用户 profile：优先读 developers 表，
 * dev token（id 不落库）回退 token claims——避免恒 400/404
 */
async function resolveDeveloperProfile(user: AuthUser): Promise<DeveloperProfile> {
  const developer = await authService.getDeveloperById(user.id)
  if (developer) {
    return developer
  }
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: new Date().toISOString(),
  }
}

export const authRoutes = new OpenAPIHono()
  .openapi(registerRoute, async c => {
    const data = c.req.valid('json')
    const { profile } = await authService.registerDeveloper(data)
    const token = signToken(profile)
    return c.json(created({ token, profile }), 201)
  })
  .openapi(loginRoute, async c => {
    const data = c.req.valid('json')
    const { profile } = await authService.loginDeveloper(data)
    const token = signToken(profile)
    return c.json(success({ token, profile }), 200)
  })
  .openapi(verifyRoute, async c => {
    const user = c.get('authUser')
    const profile = await resolveDeveloperProfile(user)
    return c.json(success(profile), 200)
  })
  .openapi(meRoute, async c => {
    const user = c.get('authUser')
    const profile = await resolveDeveloperProfile(user)
    return c.json(success(profile), 200)
  })

/** 模块级窄类型（深度 = 1 个模块）— 供 rpc-surface 门面使用，禁止再向上合并 */
export type AuthApiType = typeof authRoutes

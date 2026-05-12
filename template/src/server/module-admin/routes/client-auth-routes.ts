import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware, type AuthUser } from '@server/middleware/auth'
import { strictRateLimitMiddleware } from '@server/middleware/rate-limit'
import { getAuthUser } from '@server/utils/auth'
import * as adminService from '../services/admin-service'
import { successResponse, errorResponse, success } from '@server/utils/route-helpers'
import {
  AuthUserSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  UserSchema,
} from '@shared/modules/admin'

const loginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  tags: ['auth'],
  middleware: [strictRateLimitMiddleware] as const,
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
  path: '/auth/register',
  tags: ['auth'],
  middleware: [strictRateLimitMiddleware] as const,
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

const meRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['auth'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(AuthUserSchema, 'Get current authenticated user'),
    401: errorResponse('Unauthorized'),
  },
})

export const clientAuthRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(loginRoute, async c => {
    try {
      const data = c.req.valid('json')
      const result = await adminService.login(data)
      return c.json(success(result), 200)
    } catch {
      return c.json({ success: false as const, error: 'Invalid credentials' }, 401)
    }
  })
  .openapi(registerRoute, async c => {
    try {
      const data = c.req.valid('json')
      const user = await adminService.register(data)
      return c.json(success(user), 201)
    } catch {
      return c.json({ success: false as const, error: 'User already exists' }, 400)
    }
  })
  .openapi(meRoute, async c => {
    const user = getAuthUser(c)
    return c.json(success(user), 200)
  })

import type { MiddlewareHandler } from 'hono'
import { createModuleLoggerSync } from '../utils/logger'

export type UserRole = 'user' | 'admin'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: UserRole
  avatar?: string
}

export interface AuthMiddlewareOptions {
  requiredRole?: UserRole
}

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser
  }
}

const DEV_USER: AuthUser = {
  id: 'dev-user-1',
  username: 'devuser',
  email: 'dev@example.com',
  role: 'admin',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

export function authMiddleware(_options: AuthMiddlewareOptions = {}): MiddlewareHandler {
  const log = createModuleLoggerSync('auth')

  return async (c, next) => {
    const token = extractToken(c.req.header('Authorization'))

    if (!token) {
      c.set('authUser', { ...DEV_USER, id: 'anonymous' })
      log.info({ path: c.req.path }, 'Anonymous access')
      await next()
      return
    }

    c.set('authUser', DEV_USER)
    log.info({ userId: DEV_USER.id, path: c.req.path }, 'Dev user authenticated')
    await next()
  }
}

export function requireSuperAdminMiddleware(): MiddlewareHandler {
  return authMiddleware()
}

export function requireCustomerServiceMiddleware(): MiddlewareHandler {
  return authMiddleware()
}

export function requirePermissionsMiddleware(): MiddlewareHandler {
  return authMiddleware()
}

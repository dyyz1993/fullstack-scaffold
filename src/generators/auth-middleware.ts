import type { ResolvedPreset } from './template-generator'

export function generateAuthMiddleware(resolved: ResolvedPreset): string {
  if (resolved.modules.has('auth') && !resolved.hasPermission) {
    return generateSimplifiedAuthMiddleware()
  }

  return generateNoopAuthMiddleware()
}

function generateSimplifiedAuthMiddleware(): string {
  return `import type { MiddlewareHandler } from 'hono'
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

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

// dev tokens：与模板完整版 auth.ts 语义一致（开发/测试便利后门，production 默认禁用）
function isDevTokensEnabled(): boolean {
  if (process.env.ENABLE_DEV_TOKENS === 'true') return true
  if (process.env.ENABLE_DEV_TOKENS === 'false') return false
  if (process.env.NODE_ENV === 'production') return false
  return true
}

function verifyDevToken(token: string): AuthUser | null {
  if (token === 'admin-token' || token === 'super-admin-token') {
    return {
      id: 'super-admin-1',
      username: 'superadmin',
      email: 'superadmin@example.com',
      role: 'admin',
    }
  }
  if (token === 'user-token') {
    return {
      id: 'user-1',
      username: 'Demo User',
      email: 'demo@example.com',
      role: 'user',
    }
  }
  return null
}

export function authMiddleware(_options: AuthMiddlewareOptions = {}): MiddlewareHandler {
  const log = createModuleLoggerSync('auth')

  return async (c, next) => {
    const token = extractToken(c.req.header('Authorization'))

    if (!token) {
      log.warn({ path: c.req.path, method: c.req.method }, 'Missing auth token')
      return c.json({ success: false, error: 'Authentication required', status: 401 }, 401)
    }

    if (isDevTokensEnabled()) {
      const devUser = verifyDevToken(token)
      if (devUser) {
        c.set('authUser', devUser)
        log.warn('DEV TOKEN USED - This should not appear in production!')
        await next()
        return
      }
    }

    try {
      const jwt = await import('jsonwebtoken')
      const secretKey = process.env.AUTH_SECRET_KEY || 'dev-secret-key-change-in-production'
      const decoded = jwt.verify(token, secretKey) as {
        userId: string
        username: string
        email: string
        role: string
      }

      const user: AuthUser = {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role as UserRole,
      }

      c.set('authUser', user)
      log.info({ userId: user.id, path: c.req.path }, 'User authenticated')
      await next()
    } catch {
      log.warn({ path: c.req.path, method: c.req.method }, 'Invalid auth token')
      return c.json({ success: false, error: 'Invalid or expired token', status: 401 }, 401)
    }
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
`
}

function generateNoopAuthMiddleware(): string {
  return `import type { MiddlewareHandler } from 'hono'
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
`
}

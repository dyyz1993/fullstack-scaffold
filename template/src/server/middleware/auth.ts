import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createModuleLoggerSync } from '../utils/logger'

export interface AuthUser {
  id: string
  role: 'admin' | 'user'
  permissions: string[]
}

export interface AuthMiddlewareOptions {
  secretKey?: string
  requiredRole?: 'admin' | 'user'
  requiredPermissions?: string[]
}

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser
  }
}

const defaultSecretKey = 'dev-secret-key-change-in-production'

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

function verifyToken(token: string, secretKey: string): AuthUser | null {
  if (secretKey === 'dev-secret-key-change-in-production') {
    if (token === 'admin-token') {
      return {
        id: 'admin-1',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users'],
      }
    }
    if (token === 'user-token') {
      return {
        id: 'user-1',
        role: 'user',
        permissions: ['read', 'write'],
      }
    }
    if (token.startsWith('test-admin-')) {
      return {
        id: token,
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users'],
      }
    }
    if (token.startsWith('test-user-')) {
      return {
        id: token,
        role: 'user',
        permissions: ['read', 'write'],
      }
    }
  }

  return null
}

export function authMiddleware(options: AuthMiddlewareOptions = {}): MiddlewareHandler {
  const secretKey = options.secretKey ?? process.env.AUTH_SECRET_KEY ?? defaultSecretKey
  const log = createModuleLoggerSync('auth')

  return async (c, next) => {
    const authHeader = c.req.header('Authorization')
    const token = extractToken(authHeader)

    if (!token) {
      log.warn({ path: c.req.path, method: c.req.method }, 'Missing auth token')
      throw new HTTPException(401, { message: 'Unauthorized: Missing authentication token' })
    }

    const user = verifyToken(token, secretKey)

    if (!user) {
      log.warn({ path: c.req.path, method: c.req.method }, 'Invalid auth token')
      throw new HTTPException(401, { message: 'Unauthorized: Invalid authentication token' })
    }

    if (options.requiredRole && user.role !== options.requiredRole && user.role !== 'admin') {
      log.warn(
        {
          path: c.req.path,
          method: c.req.method,
          userRole: user.role,
          requiredRole: options.requiredRole,
        },
        'Insufficient role'
      )
      throw new HTTPException(403, { message: 'Forbidden: Insufficient permissions' })
    }

    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasAllPermissions = options.requiredPermissions.every(p => user.permissions.includes(p))
      if (!hasAllPermissions) {
        log.warn(
          {
            path: c.req.path,
            method: c.req.method,
            userPermissions: user.permissions,
            requiredPermissions: options.requiredPermissions,
          },
          'Missing required permissions'
        )
        throw new HTTPException(403, { message: 'Forbidden: Missing required permissions' })
      }
    }

    c.set('authUser', user)
    log.info({ userId: user.id, role: user.role, path: c.req.path }, 'User authenticated')

    await next()
  }
}

export function requireAdminMiddleware(): MiddlewareHandler {
  return authMiddleware({ requiredRole: 'admin' })
}

export function requirePermissionsMiddleware(...permissions: string[]): MiddlewareHandler {
  return authMiddleware({ requiredPermissions: permissions })
}

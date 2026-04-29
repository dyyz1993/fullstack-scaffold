import type { MiddlewareHandler } from 'hono'
import { verify as verifyJWT } from 'hono/jwt'
import { createModuleLoggerSync } from '../utils/logger'
import { Role, getPermissionsByRole } from '@platform/shared/permission'
import type { Permission } from '@platform/shared/permission'
import { AuthenticationError, AuthorizationError } from '../utils/app-error'

export type UserRole = Role

export interface AuthUser {
  id: string
  username: string
  email: string
  role: UserRole
  avatar?: string
  permissions: Permission[]
}

export interface AuthMiddlewareOptions {
  secretKey?: string
  requiredRole?: UserRole
  requiredPermissions?: Permission[]
}

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser
  }
}

const defaultSecretKey = 'dev-secret-key-change-in-production'

const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production'
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  return token || null
}

/**
 * Dev token verifier — ONLY for development and testing.
 * Production should use proper JWT / session-based authentication.
 * These hardcoded tokens must NEVER be reachable in production.
 */
function verifyDevToken(token: string): AuthUser | null {
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  if (token === 'admin-token' || token === 'super-admin-token') {
    return {
      id: 'super-admin-1',
      username: 'superadmin',
      email: 'superadmin@example.com',
      role: Role.SUPER_ADMIN,
      permissions: getPermissionsByRole(Role.SUPER_ADMIN),
    }
  }
  if (token === 'customer-service-token') {
    return {
      id: 'customer-service-1',
      username: 'customerservice',
      email: 'cs@example.com',
      role: Role.CUSTOMER_SERVICE,
      permissions: getPermissionsByRole(Role.CUSTOMER_SERVICE),
    }
  }
  if (token === 'user-token') {
    return {
      id: 'user-1',
      username: 'user',
      email: 'user@example.com',
      role: Role.USER,
      permissions: getPermissionsByRole(Role.USER),
    }
  }
  if (token.startsWith('test-super-admin-')) {
    return {
      id: token,
      username: `superadmin-${token}`,
      email: `superadmin-${token}@example.com`,
      role: Role.SUPER_ADMIN,
      permissions: getPermissionsByRole(Role.SUPER_ADMIN),
    }
  }
  if (token.startsWith('test-customer-service-')) {
    return {
      id: token,
      username: `cs-${token}`,
      email: `cs-${token}@example.com`,
      role: Role.CUSTOMER_SERVICE,
      permissions: getPermissionsByRole(Role.CUSTOMER_SERVICE),
    }
  }
  if (token.startsWith('test-user-')) {
    return {
      id: token,
      username: `user-${token}`,
      email: `user-${token}@example.com`,
      role: Role.USER,
      permissions: getPermissionsByRole(Role.USER),
    }
  }
  return null
}

async function verifyToken(token: string, secretKey: string): Promise<AuthUser | null> {
  if (secretKey === defaultSecretKey) {
    if (isProduction()) {
      createModuleLoggerSync('auth').error(
        {},
        'Production environment using default secret key - reject all requests'
      )
      return null
    }
    const devUser = verifyDevToken(token)
    if (devUser) {
      const log = createModuleLoggerSync('auth')
      log.warn(
        { userId: devUser.id, role: devUser.role },
        'DEV TOKEN USED - This should not appear in production!'
      )
      return devUser
    }
  }

  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production'
  try {
    const payload = await verifyJWT(token, jwtSecret, 'HS256')
    const role = (payload as Record<string, unknown>).role as Role
    if (!Object.values(Role).includes(role)) {
      return null
    }
    return {
      id: (payload as Record<string, unknown>).userId as string,
      username: (payload as Record<string, unknown>).userId as string,
      email: `${(payload as Record<string, unknown>).userId as string}@jwt.local`,
      role,
      permissions: getPermissionsByRole(role),
    }
  } catch {
    return null
  }
}

export function authMiddleware(options: AuthMiddlewareOptions = {}): MiddlewareHandler {
  const secretKey = options.secretKey ?? process.env.AUTH_SECRET_KEY ?? defaultSecretKey
  const log = createModuleLoggerSync('auth')

  if (process.env.NODE_ENV === 'production' && secretKey === defaultSecretKey) {
    log.warn(
      {},
      '[SECURITY] auth: Default secret key detected in production. ' +
        'Replace with a proper AUTH_SECRET_KEY and implement real authentication.'
    )
  }

  return async (c, next) => {
    const authHeader = c.req.header('Authorization')
    const token = extractToken(authHeader)

    if (!token) {
      log.warn({ path: c.req.path, method: c.req.method }, 'Missing auth token')
      throw AuthenticationError.tokenMissing()
    }

    const user = await verifyToken(token, secretKey)

    if (!user) {
      log.warn({ path: c.req.path, method: c.req.method }, 'Invalid auth token')
      throw AuthenticationError.tokenInvalid()
    }

    log.info({ userId: user.id, role: user.role, path: c.req.path }, 'User authenticated')

    if (options.requiredRole) {
      const roleHierarchy = {
        [Role.SUPER_ADMIN]: 3,
        [Role.CUSTOMER_SERVICE]: 2,
        [Role.USER]: 1,
      }
      const userLevel = roleHierarchy[user.role]
      const requiredLevel = roleHierarchy[options.requiredRole]

      if (userLevel < requiredLevel) {
        log.warn(
          {
            path: c.req.path,
            method: c.req.method,
            userRole: user.role,
            requiredRole: options.requiredRole,
          },
          'Insufficient role'
        )
        throw AuthorizationError.insufficientRole(user.role, options.requiredRole)
      }
    }

    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const { permissionService } = await import('@platform/server/module-permission')

      const permissionResults = await permissionService.hasPermissionBatch(
        user.id,
        options.requiredPermissions
      )
      for (const requiredPermission of options.requiredPermissions) {
        if (!permissionResults[requiredPermission]) {
          log.warn(
            {
              path: c.req.path,
              method: c.req.method,
              userId: user.id,
              requiredPermission,
            },
            'Insufficient permission'
          )
          throw AuthorizationError.permissionDenied(requiredPermission)
        }
      }
    }

    c.set('authUser', user)
    await next()
  }
}

export function requireSuperAdminMiddleware(): MiddlewareHandler {
  return authMiddleware({ requiredRole: Role.SUPER_ADMIN })
}

export function requireCustomerServiceMiddleware(): MiddlewareHandler {
  return authMiddleware({ requiredRole: Role.CUSTOMER_SERVICE })
}

export function requirePermissionsMiddleware(...permissions: Permission[]): MiddlewareHandler {
  return authMiddleware({ requiredPermissions: permissions })
}

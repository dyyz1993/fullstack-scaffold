import type { MiddlewareHandler } from 'hono'
import { getAuthUser } from '../utils/auth'
import { createModuleLoggerSync } from '../utils/logger'

const log = createModuleLoggerSync('permission')

const PUBLIC_ROUTES = [
  '/api/admin/login',
  '/api/admin/register',
  '/api/permissions',
  '/api/permissions/roles',
  '/api/permissions/categories',
  '/api/permissions/role-labels',
  '/api/permissions/permission-labels',
  '/api/permissions/menu-config',
  '/api/permissions/page-permissions',
]

interface RoutePermission {
  method: string
  pattern: string[]
  permission: string
}

const ROUTE_PERMISSIONS: RoutePermission[] = [
  { method: 'GET', pattern: ['api', 'admin', 'users'], permission: 'user:view' },
  { method: 'POST', pattern: ['api', 'admin', 'users'], permission: 'user:create' },
  { method: 'PUT', pattern: ['api', 'admin', 'users'], permission: 'user:edit' },
  { method: 'DELETE', pattern: ['api', 'admin', 'users'], permission: 'user:delete' },
  { method: 'GET', pattern: ['api', 'content'], permission: 'content:view' },
  { method: 'POST', pattern: ['api', 'content'], permission: 'content:create' },
  { method: 'PUT', pattern: ['api', 'content'], permission: 'content:edit' },
  { method: 'DELETE', pattern: ['api', 'content'], permission: 'content:delete' },
  { method: 'GET', pattern: ['api', 'admin', 'settings'], permission: 'system:settings' },
  { method: 'PUT', pattern: ['api', 'admin', 'settings'], permission: 'system:settings' },
  { method: 'GET', pattern: ['api', 'admin', 'logs'], permission: 'system:logs' },
]

function matchRoute(
  method: string,
  segments: string[],
): RoutePermission | undefined {
  return ROUTE_PERMISSIONS.find(rp => {
    if (rp.method !== method) return false
    if (rp.pattern.length !== segments.length) return false
    return rp.pattern.every((seg, i) => seg === segments[i])
  })
}

export function permissionMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const path = new URL(c.req.url).pathname
    const method = c.req.method

    if (PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/'))) {
      await next()
      return
    }

    const segments = path.split('/').filter(Boolean)
    const routePerm = matchRoute(method, segments)

    if (!routePerm) {
      await next()
      return
    }

    const user = getAuthUser(c)
    if (!user) {
      await next()
      return
    }

    try {
      const { permissionService } = await import(
        '@server/module-permission/services/permission-service-impl'
      )
      const { roleService } = await import('@server/module-permission/services/role-service')

      const roles = await roleService.getUserRoles(user.id)
      const isSuperAdmin = roles.some(r => r.code === 'super_admin')
      if (isSuperAdmin) {
        await next()
        return
      }

      const hasPermission = await permissionService.hasPermission(user.id, routePerm.permission)
      if (!hasPermission) {
        log.info({ userId: user.id, permission: routePerm.permission }, 'Permission denied')
        return c.json({ success: false, error: 'Forbidden: insufficient permissions' }, 403)
      }
    } catch {
      log.info({ path, method }, 'Permission service unavailable, allowing access')
    }

    await next()
  }
}

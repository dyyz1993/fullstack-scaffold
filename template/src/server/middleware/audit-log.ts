import type { MiddlewareHandler } from 'hono'
import { getAuthUser } from '../utils/auth'
import { auditLogService } from '../module-permission/services/audit-log-service'
import { logger } from '../utils/logger'

const log = logger.api()

export function auditLogMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = Date.now()
    const path = c.req.path
    const method = c.req.method

    await next()

    const duration = Date.now() - startTime
    const status = c.res.status

    // 只记录API请求，排除公开API
    if (!path.startsWith('/api/') || path.startsWith('/api/permissions/')) {
      return
    }

    // 只记录写操作（POST, PUT, DELETE, PATCH）
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return
    }

    // 只记录成功的操作（2xx）
    if (status < 200 || status >= 300) {
      return
    }

    const user = getAuthUser(c)
    if (!user) {
      return
    }

    // 确定操作类型
    let action = 'unknown'
    if (method === 'POST') {
      action = 'create'
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'update'
    } else if (method === 'DELETE') {
      action = 'delete'
    }

    // 确定资源类型
    const pathParts = path.split('/').filter(Boolean)
    let resourceType = 'unknown'
    if (pathParts.length >= 3) {
      resourceType = pathParts[2] // /api/admin/users -> users
    }

    try {
      await auditLogService.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        action,
        resourceType,
        resourceId: pathParts.length >= 4 ? pathParts[3] : null,
        oldValue: null,
        newValue: null,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
        userAgent: c.req.header('user-agent') || null,
      })

      log.info(
        {
          userId: user.id,
          action,
          resourceType,
          path,
          method,
          status,
          duration,
        },
        'Audit log created'
      )
    } catch (error) {
      log.error({ error, path, method }, 'Failed to create audit log')
    }
  }
}

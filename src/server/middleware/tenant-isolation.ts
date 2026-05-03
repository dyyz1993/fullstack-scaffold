import type { Context, Next } from 'hono'
import { Role } from '@platform/shared/permission'
import type { AuthUser } from './auth'
import { getDb } from '../db'
import { tenantMembers } from '../db/schema'
import { eq, and } from 'drizzle-orm'

declare module 'hono' {
  interface ContextVariableMap {
    tenantId: string
    tenantBypass: boolean
  }
}

export async function tenantIsolationMiddleware(c: Context, next: Next) {
  const user = c.get('authUser') as (AuthUser & { tenantId?: string }) | undefined

  if (!user) {
    return c.json({ success: false, error: 'User context required for tenant isolation' }, 403)
  }

  let tenantId =
    'tenantId' in user ? (user as unknown as { tenantId?: string }).tenantId : undefined
  const isSuperAdmin = user.role === Role.SUPER_ADMIN

  if (!tenantId && !isSuperAdmin) {
    const requestedTenantId = c.req.param('tenantId')
    if (requestedTenantId) {
      try {
        const db = await getDb()
        const [member] = await db
          .select()
          .from(tenantMembers)
          .where(
            and(
              eq(tenantMembers.userId, user.id),
              eq(tenantMembers.tenantId, requestedTenantId),
              eq(tenantMembers.status, 'active')
            )
          )
        if (member) {
          tenantId = requestedTenantId
        }
      } catch {
        // DB unavailable — fall through to 403
      }
    }
  }

  if (!tenantId && !isSuperAdmin) {
    return c.json({ success: false, error: 'Tenant ID required' }, 403)
  }

  if (isSuperAdmin) {
    c.set('tenantBypass', true)
  }

  c.set('tenantId', tenantId || 'global')
  await next()
}

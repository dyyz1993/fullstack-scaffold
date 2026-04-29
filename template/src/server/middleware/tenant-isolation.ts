import type { Context, Next } from 'hono'
import { Role } from '@platform/shared/permission'
import type { AuthUser } from './auth'

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

  const tenantId =
    'tenantId' in user ? (user as unknown as { tenantId?: string }).tenantId : undefined
  const isSuperAdmin = user.role === Role.SUPER_ADMIN

  if (!tenantId && !isSuperAdmin) {
    return c.json({ success: false, error: 'Tenant ID required' }, 403)
  }

  if (isSuperAdmin) {
    c.set('tenantBypass', true)
  }

  c.set('tenantId', tenantId || 'global')
  await next()
}

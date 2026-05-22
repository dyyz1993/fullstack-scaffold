import type { MiddlewareHandler } from 'hono'
import { eq } from 'drizzle-orm'
import { NotFoundError } from '../utils/app-error'
import { getDb } from '../db'
import { tenants } from '../db/schema'
import { createModuleLoggerSync } from '../utils/logger'

export interface TenantInfo {
  id: number
  name: string
  slug: string
  status: string
  plan: string
  maxUsers: number
  settings: Record<string, unknown> | null
}

declare module 'hono' {
  interface ContextVariableMap {
    tenant: TenantInfo
  }
}

const log = createModuleLoggerSync('tenant-isolation')

function extractTenantSlug(hostname: string, header: string | null | undefined): string | null {
  if (header) {
    return header
  }

  const parts = hostname.split('.')
  if (parts.length > 2) {
    return parts[0]
  }

  return null
}

export function tenantIsolationMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const hostname = c.req.header('host') || ''
    const tenantSlug = extractTenantSlug(hostname, c.req.header('X-Tenant-Slug'))

    if (!tenantSlug) {
      log.warn({ hostname, path: c.req.path }, 'No tenant slug found')
      throw NotFoundError.tenant()
    }

    const db = await getDb()
    const tenantRows = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug))

    if (tenantRows.length === 0) {
      log.warn({ slug: tenantSlug, path: c.req.path }, 'Tenant not found')
      throw NotFoundError.tenant(tenantSlug)
    }

    const tenantRow = tenantRows[0]
    const tenant: TenantInfo = {
      id: tenantRow.id,
      name: tenantRow.name,
      slug: tenantRow.slug,
      status: tenantRow.status,
      plan: tenantRow.plan,
      maxUsers: tenantRow.maxUsers,
      settings: tenantRow.settings
        ? (JSON.parse(tenantRow.settings) as Record<string, unknown>)
        : null,
    }

    log.info({ tenantId: tenant.id, slug: tenant.slug, path: c.req.path }, 'Tenant context set')

    c.set('tenant', tenant)
    await next()
  }
}

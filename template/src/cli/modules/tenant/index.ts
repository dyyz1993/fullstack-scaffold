import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerTenantCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all tenants',
    parameters: z.object({
      page: z.coerce.number().default(1).describe('Page number'),
      'page-size': z.coerce.number().default(20).describe('Page size'),
      status: z.string().optional().describe('Filter by status'),
      plan: z.string().optional().describe('Filter by plan'),
    }),
    handler: async (params: unknown) => {
      const p = params as { page: number; 'page-size': number; status?: string; plan?: string }
      try {
        const client = getClient()
        const query: Record<string, string> = {
          page: String(p.page),
          pageSize: String(p['page-size']),
        }
        if (p.status) query.status = p.status
        if (p.plan) query.plan = p.plan
        const res = await client.api.tenants.$get({ query })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list tenants')
      }
    },
  })

  site.command('get', {
    description: 'Get tenant by ID',
    parameters: z.object({
      id: z.string().describe('Tenant ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.tenants[':id'].$get({ param: { id: p.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get tenant')
      }
    },
  })

  site.command('get-by-slug', {
    description: 'Get tenant by slug',
    parameters: z.object({
      slug: z.string().describe('Tenant slug'),
    }),
    handler: async (params: unknown) => {
      const p = params as { slug: string }
      try {
        const client = getClient()
        const res = await client.api.tenants.slug[':slug'].$get({ param: { slug: p.slug } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get tenant by slug')
      }
    },
  })

  site.command('create', {
    description: 'Create a new tenant',
    parameters: z.object({
      name: z.string().min(1).describe('Tenant name'),
      slug: z.string().min(1).describe('Tenant slug (lowercase, hyphens)'),
      plan: z.enum(['free', 'starter', 'pro', 'enterprise']).default('free').describe('Plan'),
      'max-users': z.coerce.number().int().min(1).max(1000).default(5).describe('Max users'),
    }),
    handler: async (params: unknown) => {
      const p = params as { name: string; slug: string; plan: string; 'max-users': number }
      try {
        const client = getClient()
        const res = await client.api.tenants.$post({
          json: {
            name: p.name,
            slug: p.slug,
            plan: p.plan as 'free' | 'starter' | 'pro' | 'enterprise',
            maxUsers: p['max-users'],
            settings: null,
          },
        })
        const data = await res.json()
        return ok(data, ['Tenant created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create tenant')
      }
    },
  })

  site.command('update', {
    description: 'Update a tenant',
    parameters: z.object({
      id: z.string().describe('Tenant ID'),
      name: z.string().optional().describe('New name'),
      plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional().describe('New plan'),
      status: z.enum(['active', 'suspended', 'trial']).optional().describe('New status'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; name?: string; plan?: string; status?: string }
      const { id, ...rest } = p
      const body: Record<string, string | null> = {}
      if (rest.name) body.name = rest.name
      if (rest.plan) body.plan = rest.plan
      if (rest.status) body.status = rest.status
      try {
        const client = getClient()
        const res = await client.api.tenants[':id'].$put({ param: { id }, json: body })
        const data = await res.json()
        return ok(data, ['Tenant updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update tenant')
      }
    },
  })

  site.command('delete', {
    description: 'Delete a tenant',
    parameters: z.object({
      id: z.string().describe('Tenant ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.tenants[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Tenant deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete tenant')
      }
    },
  })
}

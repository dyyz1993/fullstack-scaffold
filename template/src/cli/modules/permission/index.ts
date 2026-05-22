import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerPermissionCommands(site: SiteInstance) {
  site.command('roles', {
    description: 'List all roles',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.permissions.roles.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list roles')
      }
    },
  })

  site.command('get-role', {
    description: 'Get role details by ID',
    parameters: z.object({
      id: z.string().describe('Role ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.roles[':id'].$get({ param: { id: p.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get role')
      }
    },
  })

  site.command('create-role', {
    description: 'Create a new role',
    parameters: z.object({
      name: z.string().min(1).describe('Role name'),
      code: z.string().min(1).describe('Role code'),
      label: z.string().min(1).describe('Role display label'),
      description: z.string().optional().describe('Role description'),
    }),
    handler: async (params: unknown) => {
      const p = params as { name: string; code: string; label: string; description?: string }
      try {
        const client = getClient()
        const res = await client.api.roles.$post({ json: p })
        const data = await res.json()
        return ok(data, ['Role created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create role')
      }
    },
  })

  site.command('update-role', {
    description: 'Update a role',
    parameters: z.object({
      id: z.string().describe('Role ID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; name?: string; description?: string }
      const { id, ...body } = p
      try {
        const client = getClient()
        const res = await client.api.roles[':id'].$put({ param: { id }, json: body })
        const data = await res.json()
        return ok(data, ['Role updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update role')
      }
    },
  })

  site.command('delete-role', {
    description: 'Delete a role',
    parameters: z.object({
      id: z.string().describe('Role ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.roles[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Role deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete role')
      }
    },
  })

  site.command('permissions', {
    description: 'List all permissions',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.permissions.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list permissions')
      }
    },
  })

  site.command('categories', {
    description: 'List permission categories',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.permissions.categories.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list categories')
      }
    },
  })

  site.command('menu-config', {
    description: 'Get menu configuration',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.permissions['menu-config'].$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get menu config')
      }
    },
  })

  site.command('audit-logs', {
    description: 'List audit logs',
    parameters: z.object({
      limit: z.coerce.number().default(50).describe('Limit results'),
      offset: z.coerce.number().default(0).describe('Offset'),
      'user-id': z.string().optional().describe('Filter by user ID'),
      action: z.string().optional().describe('Filter by action'),
      'resource-type': z.string().optional().describe('Filter by resource type'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        limit: number
        offset: number
        'user-id'?: string
        action?: string
        'resource-type'?: string
      }
      try {
        const client = getClient()
        const query: Record<string, string> = {
          limit: String(p.limit),
          offset: String(p.offset),
        }
        if (p['user-id']) query.userId = p['user-id']
        if (p.action) query.action = p.action
        if (p['resource-type']) query.resourceType = p['resource-type']
        const res = await client.api['audit-logs'].$get({ query })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list audit logs')
      }
    },
  })

  site.command('update-role-permissions', {
    description: 'Update permissions for a role',
    parameters: z.object({
      id: z.string().describe('Role ID'),
      'permission-ids': z.string().describe('Comma-separated permission IDs'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; 'permission-ids': string }
      try {
        const client = getClient()
        const res = await client.api.roles[':id'].permissions.$put({
          param: { id: p.id },
          json: { permissionIds: p['permission-ids'].split(',') },
        })
        const data = await res.json()
        return ok(data, ['Role permissions updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update role permissions')
      }
    },
  })
}

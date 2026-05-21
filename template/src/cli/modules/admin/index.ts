import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerAdminCommands(site: SiteInstance) {
  site.command('dashboard', {
    description: 'Get dashboard statistics',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.admin.dashboard.stats.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get dashboard stats')
      }
    },
  })

  site.command('stats', {
    description: 'Get system statistics',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.admin.stats.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get system stats')
      }
    },
  })

  site.command('health', {
    description: 'Check system health',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.admin.health.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to check health')
      }
    },
  })

  site.command('list-users', {
    description: 'List all users',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.admin.users.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list users')
      }
    },
  })

  site.command('get-user', {
    description: 'Get a user by ID',
    parameters: z.object({
      id: z.string().describe('User ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.admin.users[':id'].$get({ param: { id: p.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get user')
      }
    },
  })

  site.command('create-user', {
    description: 'Create a new user',
    parameters: z.object({
      username: z.string().min(1).describe('Username'),
      email: z.string().email().describe('Email'),
      password: z.string().min(6).describe('Password'),
      role: z.enum(['super_admin', 'customer_service', 'user']).default('user').describe('Role'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        username: string
        email: string
        password: string
        role: 'super_admin' | 'customer_service' | 'user'
      }
      try {
        const client = getClient()
        const res = await client.api.admin.users.$post({
          json: {
            username: p.username,
            email: p.email,
            password: p.password,
            role: p.role,
          },
        })
        const data = await res.json()
        return ok(data, ['User created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create user')
      }
    },
  })

  site.command('update-user', {
    description: 'Update a user',
    parameters: z.object({
      id: z.string().describe('User ID'),
      username: z.string().optional().describe('New username'),
      email: z.string().email().optional().describe('New email'),
      role: z.enum(['super_admin', 'customer_service', 'user']).optional().describe('New role'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        id: string
        username?: string
        email?: string
        role?: 'super_admin' | 'customer_service' | 'user'
      }
      const { id, ...rest } = p
      const body: Record<string, string | undefined> = {}
      if (rest.username) body.username = rest.username
      if (rest.email) body.email = rest.email
      if (rest.role) body.role = rest.role
      try {
        const client = getClient()
        const res = await client.api.admin.users[':id'].$put({ param: { id }, json: body })
        const data = await res.json()
        return ok(data, ['User updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update user')
      }
    },
  })

  site.command('delete-user', {
    description: 'Delete a user',
    parameters: z.object({
      id: z.string().describe('User ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.admin.users[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['User deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete user')
      }
    },
  })

  site.command('activity', {
    description: 'Get recent activity',
    parameters: z.object({
      limit: z.coerce.number().default(10).describe('Limit results'),
    }),
    handler: async (params: unknown) => {
      const p = params as { limit: number }
      try {
        const client = getClient()
        const res = await client.api.admin.activity.$get({ query: { limit: String(p.limit) } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get activity')
      }
    },
  })

  site.command('clear-todos', {
    description: 'Clear all todos (dangerous)',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.admin.todos.all.$delete()
        const data = await res.json()
        return ok(data, ['All todos cleared'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to clear todos')
      }
    },
  })
}

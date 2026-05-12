import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerTodoCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all todos',
    parameters: z.object({
      limit: z.coerce.number().default(20).describe('Limit results'),
    }),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.todos.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list todos')
      }
    },
  })

  site.command('get', {
    description: 'Get a todo by ID',
    parameters: z.object({
      id: z.string().describe('Todo ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.todos[':id'].$get({ param: { id: p.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get todo')
      }
    },
  })

  site.command('create', {
    description: 'Create a new todo',
    parameters: z.object({
      title: z.string().min(1).describe('Todo title'),
      description: z.string().optional().describe('Todo description'),
    }),
    handler: async (params: unknown) => {
      const p = params as { title: string; description?: string }
      try {
        const client = getClient()
        const res = await client.api.todos.$post({ json: p })
        const data = await res.json()
        return ok(data, ['Todo created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create todo')
      }
    },
  })

  site.command('update', {
    description: 'Update a todo',
    parameters: z.object({
      id: z.string().describe('Todo ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['pending', 'in_progress', 'completed']).optional().describe('New status'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        id: string
        title?: string
        description?: string
        status?: 'pending' | 'in_progress' | 'completed'
      }
      try {
        const { id, ...body } = p
        const client = getClient()
        const res = await client.api.todos[':id'].$put({
          param: { id },
          json: body,
        })
        const data = await res.json()
        return ok(data, ['Todo updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update todo')
      }
    },
  })

  site.command('delete', {
    description: 'Delete a todo',
    parameters: z.object({
      id: z.string().describe('Todo ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.todos[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Todo deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete todo')
      }
    },
  })
}

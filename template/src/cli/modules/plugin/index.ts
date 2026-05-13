import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerPluginCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all plugins',
    parameters: z.object({
      limit: z.coerce.number().default(20).describe('Limit results'),
      page: z.coerce.number().default(1).describe('Page number'),
    }),
    handler: async (params: unknown) => {
      const p = params as { limit: number; page: number }
      try {
        const client = getClient()
        const res = await client.api.plugins.$get({
          query: { limit: String(p.limit), page: String(p.page) },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list plugins')
      }
    },
  })

  site.command('search', {
    description: 'Search plugins',
    parameters: z.object({
      query: z.string().min(1).describe('Search query'),
    }),
    handler: async (params: unknown) => {
      const p = params as { query: string }
      try {
        const client = getClient()
        const res = await client.api.plugins.search.$get({ query: { q: p.query } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to search plugins')
      }
    },
  })

  site.command('get', {
    description: 'Get plugin details',
    parameters: z.object({
      slug: z.string().describe('Plugin slug'),
    }),
    handler: async (params: unknown) => {
      const p = params as { slug: string }
      try {
        const client = getClient()
        const res = await client.api.plugins[':slug'].$get({ param: { slug: p.slug } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get plugin')
      }
    },
  })

  site.command('install', {
    description: 'Track plugin install',
    parameters: z.object({
      slug: z.string().describe('Plugin slug'),
    }),
    handler: async (params: unknown) => {
      const p = params as { slug: string }
      try {
        const client = getClient()
        const res = await client.api.plugins[':slug'].install.$post({ param: { slug: p.slug } })
        const data = await res.json()
        return ok(data, ['Install tracked'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to track install')
      }
    },
  })

  site.command('categories', {
    description: 'List plugin categories',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.categories.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list categories')
      }
    },
  })

  site.command('stats', {
    description: 'Show marketplace statistics',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.stats.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get stats')
      }
    },
  })
}

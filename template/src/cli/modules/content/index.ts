import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerContentCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all contents',
    parameters: z.object({
      limit: z.coerce.number().default(20).describe('Limit results'),
      offset: z.coerce.number().default(0).describe('Offset'),
    }),
    handler: async (params: unknown) => {
      const p = params as { limit: number; offset: number }
      try {
        const client = getClient()
        const res = await client.api.contents.$get({
          query: { limit: String(p.limit), offset: String(p.offset) },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list contents')
      }
    },
  })

  site.command('get', {
    description: 'Get content by ID',
    parameters: z.object({
      id: z.string().describe('Content ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.contents[':id'].$get({ param: { id: p.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get content')
      }
    },
  })

  site.command('create', {
    description: 'Create new content',
    parameters: z.object({
      title: z.string().min(1).describe('Content title'),
      content: z.string().min(1).describe('Content body'),
      category: z
        .enum(['article', 'announcement', 'tutorial', 'news', 'policy'])
        .default('article')
        .describe('Category'),
      tags: z.string().optional().describe('Comma-separated tags'),
    }),
    handler: async (params: unknown) => {
      const p = params as { title: string; content: string; category: string; tags?: string }
      try {
        const client = getClient()
        const tags = p.tags ? p.tags.split(',') : undefined
        const res = await client.api.contents.$post({
          json: {
            title: p.title,
            content: p.content,
            category: p.category as 'article' | 'announcement' | 'tutorial' | 'news' | 'policy',
            tags,
          },
        })
        const data = await res.json()
        return ok(data, ['Content created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create content')
      }
    },
  })

  site.command('update', {
    description: 'Update content',
    parameters: z.object({
      id: z.string().describe('Content ID'),
      title: z.string().optional().describe('New title'),
      content: z.string().optional().describe('New body'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; title?: string; content?: string }
      const { id, ...body } = p
      try {
        const client = getClient()
        const res = await client.api.contents[':id'].$put({ param: { id }, json: body })
        const data = await res.json()
        return ok(data, ['Content updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update content')
      }
    },
  })

  site.command('delete', {
    description: 'Delete content',
    parameters: z.object({
      id: z.string().describe('Content ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.contents[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Content deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete content')
      }
    },
  })

  site.command('publish', {
    description: 'Publish content',
    parameters: z.object({
      id: z.string().describe('Content ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.contents[':id'].publish.$put({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Content published'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to publish content')
      }
    },
  })

  site.command('archive', {
    description: 'Archive content',
    parameters: z.object({
      id: z.string().describe('Content ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.contents[':id'].archive.$put({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Content archived'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to archive content')
      }
    },
  })
}

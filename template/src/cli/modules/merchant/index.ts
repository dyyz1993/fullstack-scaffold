import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

const createProductParams = z.object({
  name: z.string().min(1).describe('Product name'),
  description: z.string().max(1000).describe('Product description'),
  price: z.coerce.number().positive().describe('Product price'),
  stock: z.coerce.number().int().min(0).default(0).describe('Stock quantity'),
  status: z
    .enum(['active', 'inactive', 'out_of_stock'])
    .default('active')
    .describe('Product status'),
  'image-url': z.string().url().nullable().default(null).describe('Image URL'),
})

export function registerMerchantCommands(site: SiteInstance) {
  site.command('login', {
    description: 'Login as merchant',
    parameters: z.object({
      username: z.string().min(1).describe('Merchant username'),
      password: z.string().min(6).describe('Merchant password'),
    }),
    handler: async (params: unknown) => {
      const p = params as { username: string; password: string }
      try {
        const client = getClient()
        const res = await client.api.merchant.login.$post({
          json: { username: p.username, password: p.password },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to login')
      }
    },
  })

  site.command('me', {
    description: 'Get current merchant profile',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.merchant.me.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get merchant profile')
      }
    },
  })

  site.command('stats', {
    description: 'Get merchant statistics',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.merchant.stats.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get merchant stats')
      }
    },
  })

  site.command('list-products', {
    description: 'List merchant products',
    parameters: z.object({
      page: z.coerce.number().int().positive().default(1).describe('Page number'),
      'page-size': z.coerce.number().int().positive().max(100).default(20).describe('Page size'),
      status: z
        .enum(['active', 'inactive', 'out_of_stock'])
        .optional()
        .describe('Filter by status'),
    }),
    handler: async (params: unknown) => {
      const p = params as { page: number; 'page-size': number; status?: string }
      try {
        const client = getClient()
        const query: Record<string, string> = {
          page: String(p.page),
          pageSize: String(p['page-size']),
        }
        if (p.status) query.status = p.status
        const res = await client.api.merchant.products.$get({ query })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list products')
      }
    },
  })

  site.command('create-product', {
    description: 'Create a new product',
    parameters: createProductParams,
    handler: async params => {
      // @ts-expect-error -- auto-command passes unknown, we parse from zod schema
      const p: z.infer<typeof createProductParams> = params
      try {
        const client = getClient()
        const res = await client.api.merchant.products.$post({
          json: {
            name: p.name,
            description: p.description,
            price: p.price,
            stock: p.stock,
            status: p.status,
            imageUrl: p['image-url'],
          },
        })
        const data = await res.json()
        return ok(data, ['Product created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create product')
      }
    },
  })
}

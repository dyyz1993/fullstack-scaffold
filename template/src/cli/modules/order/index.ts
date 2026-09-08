import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerOrderCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all orders',
    parameters: z.object({
      limit: z.coerce.number().default(20).describe('Limit results'),
      offset: z.coerce.number().default(0).describe('Offset'),
      status: z.string().optional().describe('Filter by status'),
      'customer-name': z.string().optional().describe('Filter by customer name'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        limit: number
        offset: number
        status?: string
        'customer-name'?: string
      }
      try {
        const client = getClient()
        const query: Record<string, string> = {
          limit: String(p.limit),
          offset: String(p.offset),
        }
        if (p.status) query.status = p.status
        if (p['customer-name']) query.customerName = p['customer-name']
        const res = await client.api.orders.$get({ query })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list orders')
      }
    },
  })

  site.command('get', {
    description: 'Get order by ID',
    parameters: z.object({
      id: z.string().describe('Order ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.orders[':id'].$get({ param: { id: p.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get order')
      }
    },
  })

  site.command('create', {
    description: 'Create a new order',
    parameters: z.object({
      'customer-name': z.string().min(1).describe('Customer name'),
      'customer-email': z.string().email().describe('Customer email'),
      'product-name': z.string().min(1).describe('Product name'),
      amount: z.coerce.number().positive().describe('Order amount'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        'customer-name': string
        'customer-email': string
        'product-name': string
        amount: number
      }
      try {
        const client = getClient()
        const res = await client.api.orders.$post({
          json: {
            customerName: p['customer-name'],
            customerEmail: p['customer-email'],
            productName: p['product-name'],
            amount: p.amount,
          },
        })
        const data = await res.json()
        return ok(data, ['Order created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create order')
      }
    },
  })

  site.command('update', {
    description: 'Update order status',
    parameters: z.object({
      id: z.string().describe('Order ID'),
      status: z
        .enum(['pending', 'processing', 'completed', 'cancelled', 'disputed'])
        .optional()
        .describe('New status'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; status?: string }
      const { id, ...rest } = p
      const body: Record<string, string | null> = {}
      if (rest.status) body.status = rest.status
      try {
        const client = getClient()
        const res = await client.api.orders[':id'].$put({ param: { id }, json: body })
        const data = await res.json()
        return ok(data, ['Order updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update order')
      }
    },
  })

  site.command('delete', {
    description: 'Delete an order',
    parameters: z.object({
      id: z.string().describe('Order ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.orders[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Order deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete order')
      }
    },
  })

  site.command('process', {
    description: 'Process an order',
    parameters: z.object({
      id: z.string().describe('Order ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.orders[':id'].process.$put({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Order processed'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to process order')
      }
    },
  })

  site.command('cancel', {
    description: 'Cancel an order',
    parameters: z.object({
      id: z.string().describe('Order ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.orders[':id'].cancel.$put({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Order cancelled'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to cancel order')
      }
    },
  })

  site.command('cart', {
    description: 'Get current cart',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.cart.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get cart')
      }
    },
  })
}

import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerDisputeCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all disputes',
    parameters: z.object({
      limit: z.coerce.number().default(20).describe('Limit results'),
      offset: z.coerce.number().default(0).describe('Offset'),
    }),
    handler: async (params: unknown) => {
      const p = params as { limit: number; offset: number }
      try {
        const client = getClient()
        const res = await client.api.disputes.$get({
          query: { limit: String(p.limit), offset: String(p.offset) },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list disputes')
      }
    },
  })

  site.command('get', {
    description: 'Get dispute by ID',
    parameters: z.object({
      id: z.string().describe('Dispute ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.disputes[':id'].$get({ param: { id: p.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get dispute')
      }
    },
  })

  site.command('create', {
    description: 'Create a new dispute',
    parameters: z.object({
      'order-id': z.string().describe('Order ID'),
      'order-no': z.string().describe('Order number'),
      'customer-name': z.string().describe('Customer name'),
      'customer-email': z.string().email().describe('Customer email'),
      type: z
        .enum(['refund', 'product_quality', 'service_quality', 'delivery', 'other'])
        .default('other')
        .describe('Type'),
      description: z.string().min(1).describe('Description'),
      amount: z.coerce.number().positive().describe('Amount'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        'order-id': string
        'order-no': string
        'customer-name': string
        'customer-email': string
        type: string
        description: string
        amount: number
      }
      try {
        const client = getClient()
        const res = await client.api.disputes.$post({
          json: {
            orderId: p['order-id'],
            orderNo: p['order-no'],
            customerName: p['customer-name'],
            customerEmail: p['customer-email'],
            type: p.type as 'refund' | 'product_quality' | 'service_quality' | 'delivery' | 'other',
            description: p.description,
            amount: p.amount,
          },
        })
        const data = await res.json()
        return ok(data, ['Dispute created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create dispute')
      }
    },
  })

  site.command('update', {
    description: 'Update a dispute status',
    parameters: z.object({
      id: z.string().describe('Dispute ID'),
      status: z
        .enum(['pending', 'resolved', 'investigating', 'rejected'])
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
        const res = await client.api.disputes[':id'].$put({ param: { id }, json: body })
        const data = await res.json()
        return ok(data, ['Dispute updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update dispute')
      }
    },
  })

  site.command('delete', {
    description: 'Delete a dispute',
    parameters: z.object({
      id: z.string().describe('Dispute ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.disputes[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Dispute deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete dispute')
      }
    },
  })

  site.command('resolve', {
    description: 'Resolve a dispute',
    parameters: z.object({
      id: z.string().describe('Dispute ID'),
      resolution: z.string().min(1).describe('Resolution notes'),
      'resolved-by': z.string().describe('Resolver name'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; resolution: string; 'resolved-by': string }
      try {
        const client = getClient()
        const res = await client.api.disputes[':id'].resolve.$put({
          param: { id: p.id },
          json: { resolution: p.resolution, resolvedBy: p['resolved-by'] },
        })
        const data = await res.json()
        return ok(data, ['Dispute resolved'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to resolve dispute')
      }
    },
  })
}

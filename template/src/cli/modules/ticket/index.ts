import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerTicketCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all tickets',
    parameters: z.object({
      limit: z.coerce.number().default(20).describe('Limit results'),
      offset: z.coerce.number().default(0).describe('Offset'),
    }),
    handler: async (params: unknown) => {
      const p = params as { limit: number; offset: number }
      try {
        const client = getClient()
        const res = await client.api.tickets.$get({
          query: { limit: String(p.limit), offset: String(p.offset) },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list tickets')
      }
    },
  })

  site.command('get', {
    description: 'Get ticket by ID',
    parameters: z.object({
      id: z.string().describe('Ticket ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.tickets[':id'].$get({ param: { id: p.id } })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get ticket')
      }
    },
  })

  site.command('create', {
    description: 'Create a new ticket',
    parameters: z.object({
      'customer-name': z.string().min(1).describe('Customer name'),
      'customer-email': z.string().email().describe('Customer email'),
      subject: z.string().min(1).describe('Ticket subject'),
      description: z.string().min(1).describe('Ticket description'),
      category: z
        .enum(['technical', 'billing', 'feature_request', 'bug_report', 'general'])
        .default('general')
        .describe('Category'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('Priority'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        'customer-name': string
        'customer-email': string
        subject: string
        description: string
        category: string
        priority: string
      }
      try {
        const client = getClient()
        const res = await client.api.tickets.$post({
          json: {
            customerName: p['customer-name'],
            customerEmail: p['customer-email'],
            subject: p.subject,
            description: p.description,
            category: p.category as
              | 'technical'
              | 'billing'
              | 'feature_request'
              | 'bug_report'
              | 'general',
            priority: p.priority as 'low' | 'medium' | 'high' | 'urgent',
          },
        })
        const data = await res.json()
        return ok(data, ['Ticket created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create ticket')
      }
    },
  })

  site.command('update', {
    description: 'Update ticket status',
    parameters: z.object({
      id: z.string().describe('Ticket ID'),
      status: z
        .enum(['open', 'closed', 'in_progress', 'waiting_customer', 'resolved'])
        .optional()
        .describe('New status'),
      'assigned-to': z.string().optional().describe('Assign to user'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; status?: string; 'assigned-to'?: string }
      const { id, ...rest } = p
      const body: Record<string, string> = {}
      if (rest.status) body.status = rest.status
      if (rest['assigned-to']) body.assignedTo = rest['assigned-to']
      try {
        const client = getClient()
        const res = await client.api.tickets[':id'].$put({ param: { id }, json: body })
        const data = await res.json()
        return ok(data, ['Ticket updated'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to update ticket')
      }
    },
  })

  site.command('delete', {
    description: 'Delete a ticket',
    parameters: z.object({
      id: z.string().describe('Ticket ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.tickets[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Ticket deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete ticket')
      }
    },
  })

  site.command('reply', {
    description: 'Reply to a ticket',
    parameters: z.object({
      id: z.string().describe('Ticket ID'),
      content: z.string().min(1).describe('Reply content'),
      author: z.string().min(1).describe('Author name'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; content: string; author: string }
      try {
        const client = getClient()
        const res = await client.api.tickets[':id'].reply.$post({
          param: { id: p.id },
          json: { content: p.content, author: p.author },
        })
        const data = await res.json()
        return ok(data, ['Reply sent'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to reply ticket')
      }
    },
  })

  site.command('close', {
    description: 'Close a ticket',
    parameters: z.object({
      id: z.string().describe('Ticket ID'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.tickets[':id'].close.$put({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Ticket closed'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to close ticket')
      }
    },
  })
}

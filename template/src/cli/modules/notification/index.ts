import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'
import { asXcliSchema } from '@cli/utils/xcli-bridge'

export function registerNotificationCommands(site: SiteInstance) {
  site.command('list', {
    description: 'List all notifications',
    parameters: asXcliSchema(
      z.object({
        'unread-only': z.boolean().default(false).describe('Show only unread'),
        limit: z.coerce.number().default(20).describe('Limit results'),
      })
    ),
    handler: async (params: unknown) => {
      const p = params as { 'unread-only': boolean; limit: number }
      try {
        const client = getClient()
        const res = await client.api.notifications.$get({
          query: { unreadOnly: String(p['unread-only']), limit: String(p.limit) },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to list notifications')
      }
    },
  })

  site.command('create', {
    description: 'Create a new notification',
    parameters: asXcliSchema(
      z.object({
        title: z.string().min(1).describe('Notification title'),
        message: z.string().min(1).describe('Notification message'),
        type: z.enum(['info', 'warning', 'success', 'error']).default('info').describe('Type'),
      })
    ),
    handler: async (params: unknown) => {
      const p = params as {
        title: string
        message: string
        type: 'info' | 'warning' | 'success' | 'error'
      }
      try {
        const client = getClient()
        const res = await client.api.notifications.$post({ json: p })
        const data = await res.json()
        return ok(data, ['Notification created'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to create notification')
      }
    },
  })

  site.command('unread-count', {
    description: 'Get unread notification count',
    parameters: asXcliSchema(z.object({})),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.notifications['unread-count'].$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get unread count')
      }
    },
  })

  site.command('mark-read', {
    description: 'Mark a notification as read',
    parameters: asXcliSchema(
      z.object({
        id: z.string().describe('Notification ID'),
      })
    ),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.notifications[':id'].read.$patch({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Marked as read'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to mark as read')
      }
    },
  })

  site.command('delete', {
    description: 'Delete a notification',
    parameters: asXcliSchema(
      z.object({
        id: z.string().describe('Notification ID'),
      })
    ),
    handler: async (params: unknown) => {
      const p = params as { id: string }
      try {
        const client = getClient()
        const res = await client.api.notifications[':id'].$delete({ param: { id: p.id } })
        const data = await res.json()
        return ok(data, ['Notification deleted'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to delete notification')
      }
    },
  })
}

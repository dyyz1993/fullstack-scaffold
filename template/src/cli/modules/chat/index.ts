import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerChatCommands(site: SiteInstance) {
  site.command('status', {
    description: 'Get WebSocket connection status',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.chat.ws.status.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get chat status')
      }
    },
  })
}

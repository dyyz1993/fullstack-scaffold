import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerFileCommands(site: SiteInstance) {
  site.command('generate-url', {
    description: 'Generate a file URL',
    parameters: z.object({
      namespace: z.string().describe('File namespace'),
      filename: z.string().describe('File name'),
      private: z.boolean().default(false).describe('Generate private URL'),
      'expiry-seconds': z.coerce.number().default(3600).describe('URL expiry in seconds'),
    }),
    handler: async (params: unknown) => {
      const p = params as {
        namespace: string
        filename: string
        private: boolean
        'expiry-seconds': number
      }
      try {
        const client = getClient()
        const res = await client.api['generate-url'].$post({
          json: {
            namespace: p.namespace,
            filename: p.filename,
            isPrivate: p.private,
            expirySeconds: p['expiry-seconds'],
          },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to generate URL')
      }
    },
  })

  site.command('info', {
    description: 'Check if a public file exists',
    parameters: z.object({
      namespace: z.string().describe('File namespace'),
      filename: z.string().describe('File name'),
    }),
    handler: async (params: unknown) => {
      const p = params as { namespace: string; filename: string }
      try {
        const client = getClient()
        const res = await client.api.public[':namespace'][':filename'].$get({
          param: { namespace: p.namespace, filename: p.filename },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get file info')
      }
    },
  })
}

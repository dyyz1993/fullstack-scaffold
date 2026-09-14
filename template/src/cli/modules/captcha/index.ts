import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerCaptchaCommands(site: SiteInstance) {
  // 命名空间注册：避免各模块扁平命令名（list/get/...）互相覆盖
  const mod = site.group('captcha')
  mod.command('get', {
    description: 'Get a new captcha',
    parameters: z.object({}),
    handler: async () => {
      try {
        const client = getClient()
        const res = await client.api.captcha.$get()
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to get captcha')
      }
    },
  })

  mod.command('verify', {
    description: 'Verify a captcha code',
    parameters: z.object({
      id: z.string().describe('Captcha ID'),
      code: z.string().min(1).describe('Captcha code'),
    }),
    handler: async (params: unknown) => {
      const p = params as { id: string; code: string }
      try {
        const client = getClient()
        const res = await client.api['verify-captcha'].$post({ json: p })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to verify captcha')
      }
    },
  })
}

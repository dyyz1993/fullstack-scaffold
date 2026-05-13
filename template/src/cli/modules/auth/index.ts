import type { SiteInstance } from '@dyyz1993/xcli-core'
import { ok, fail } from '@dyyz1993/xcli-core'
import { z } from 'zod'
import { getClient } from '@cli/utils/api'

export function registerAuthCommands(site: SiteInstance) {
  site.command('register', {
    description: 'Register a new developer account',
    parameters: z.object({
      username: z.string().min(2).max(50).describe('Username'),
      email: z.string().email().describe('Email'),
      password: z.string().min(6).describe('Password'),
    }),
    handler: async (params: unknown) => {
      const p = params as { username: string; email: string; password: string }
      try {
        const client = getClient()
        const res = await client.api.auth.register.$post({ json: p })
        const data = await res.json()
        return ok(data, ['Registration successful'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to register')
      }
    },
  })

  site.command('login', {
    description: 'Login to get API key',
    parameters: z.object({
      account: z.string().describe('Email or username'),
      password: z.string().min(6).describe('Password'),
    }),
    handler: async (params: unknown) => {
      const p = params as { account: string; password: string }
      try {
        const client = getClient()
        const res = await client.api.auth.login.$post({ json: p })
        const data = await res.json()
        return ok(data, ['Login successful'])
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to login')
      }
    },
  })

  site.command('verify', {
    description: 'Verify API key',
    parameters: z.object({
      token: z.string().describe('API key to verify'),
    }),
    handler: async (params: unknown) => {
      const p = params as { token: string }
      try {
        const client = getClient()
        const res = await client.api.auth.verify.$get({
          headers: { Authorization: `Bearer ${p.token}` },
        })
        const data = await res.json()
        return ok(data)
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'Failed to verify')
      }
    },
  })
}

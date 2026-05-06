import { describe, it, expect } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'

setRuntimeAdapter(getNodeRuntimeAdapter())

describe('Debug notification', () => {
  it('should return empty array', async () => {
    const client = createTestClient(undefined, {
      headers: { Authorization: 'Bearer admin-token' },
    })

    try {
      const res = await client.api.notifications.$get({ query: {} })
      console.log('Status:', res.status)
      const data = await res.json()
      console.log('Data:', JSON.stringify(data).slice(0, 300))
      expect(res.status).toBe(200)
    } catch (e: unknown) {
      console.log('Error:', (e as Error).message)
      console.log('Stack:', (e as Error).stack?.split('\n').slice(0, 15).join('\n'))
      throw e
    }
  })
})

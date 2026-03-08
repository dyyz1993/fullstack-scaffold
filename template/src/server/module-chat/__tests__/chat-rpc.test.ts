import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import app from '../../entries/node'
import { initChatHandlers } from '../services/chat-service'
import { createTestClient } from '../../test-utils/test-client'
import { createTestServer } from '../../test-utils/test-server'
import type { WSStatus } from '@shared/schemas'

initChatHandlers()

describe('Chat Routes with Type-Safe Test Client', () => {
  let testServer: Awaited<ReturnType<typeof createTestServer>>
  let client: ReturnType<typeof createTestClient>

  beforeAll(async () => {
    testServer = await createTestServer(app, ['/api/chat/ws'])
    client = createTestClient(`http://localhost:${testServer.port}`)
  }, 15000)

  afterAll(async () => {
    await testServer.close()
  }, 15000)

  describe('GET /api/chat/ws/status', () => {
    it('should return WebSocket status', async () => {
      const res = await client.api.chat.ws.status.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('connectedClients')
      expect(typeof data.data.connectedClients).toBe('number')
    })
  })

  describe('WebSocket RPC Methods', () => {
    it('should handle echo RPC call with type-safe client', async () => {
      const wsClient = client.api.chat.ws.$ws()

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Test timeout'))
          }, 5000)

          wsClient.onStatusChange((status: WSStatus) => {
            if (status === 'open') {
              clearTimeout(timeout)
              resolve()
            }
          })
        })

        const result = await wsClient.call('echo', { message: 'hello world' })

        expect(result.message).toBe('hello world')
        expect(result.timestamp).toBeDefined()
        expect(typeof result.timestamp).toBe('number')
      } finally {
        wsClient.close()
      }
    })

    it('should handle ping RPC call with type-safe client', async () => {
      const wsClient = client.api.chat.ws.$ws()

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Test timeout'))
          }, 5000)

          wsClient.onStatusChange((status: WSStatus) => {
            if (status === 'open') {
              clearTimeout(timeout)
              resolve()
            }
          })
        })

        const result = await wsClient.call('ping', {})
        expect(result.pong).toBe(true)
        expect(result.timestamp).toBeDefined()
        expect(typeof result.timestamp).toBe('number')
      } finally {
        wsClient.close()
      }
    })
  })
})

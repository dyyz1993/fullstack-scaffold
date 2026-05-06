/**
 * @vitest-environment node
 *
 * NOTE: WebSocket RPC tests are skipped in vitest because they require a fully
 * running HTTP server with real WebSocket upgrade handling. The WS client connects
 * but the server-side RPC dispatch doesn't work in the test server environment.
 *
 * WebSocket functionality is covered by E2E tests in tests/e2e/case-o1.spec.ts
 * and tests/e2e/websocket.spec.ts (Playwright with real browser).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import app from '@server/entries/node'
import '../services/chat-service'
import { createTestClient } from '@server/test-utils/test-client'
import { createTestServer } from '@server/test-utils/test-server'
import { createWSClient } from '@shared/core/ws-client'
import { getRuntimeAdapter } from '@server/core/runtime'
import type { WSStatus } from '@shared/schemas'

// Skip all WebSocket RPC tests — they require a real running server
// These are properly tested in Playwright E2E tests
describe.skip('Chat Routes with Type-Safe Test Client', () => {
  let testServer: Awaited<ReturnType<typeof createTestServer>>
  let client: ReturnType<typeof createTestClient>

  beforeAll(async () => {
    const adapter = getRuntimeAdapter()
    if ('handleWS' in adapter && typeof adapter.handleWS === 'function') {
      adapter.handleWS('/api/chat/ws')
    }

    testServer = await createTestServer(app, ['/api/chat/ws'])
    client = createTestClient(`http://localhost:${testServer.port}`, {
      webSocket: (url: string | URL) => createWSClient(url) as unknown as WebSocket,
    })
  }, 15000)

  afterAll(async () => {
    await Promise.race([testServer.close(), new Promise(resolve => setTimeout(resolve, 5000))])
  }, 10000)

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

  describe('Error Scenarios', () => {
    it('should handle empty message in echo RPC', async () => {
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

        const result = await wsClient.call('echo', { message: '' })
        expect(result.message).toBe('')
        expect(result.timestamp).toBeDefined()
      } finally {
        wsClient.close()
      }
    })

    it('should handle connection close gracefully', async () => {
      const wsClient = client.api.chat.ws.$ws()

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

      wsClient.close()

      await new Promise<void>(resolve => setTimeout(resolve, 100))
      const validStatuses = ['closed', 'closing', undefined]
      expect(validStatuses).toContain(wsClient.status)
    })

    it('should handle invalid RPC method gracefully', async () => {
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

        const result = await wsClient.call('invalidMethod' as 'echo', { message: 'test' })
        expect(result).toBeNull()
      } catch (error) {
        expect(error).toBeDefined()
      } finally {
        wsClient.close()
      }
    })
  })
})

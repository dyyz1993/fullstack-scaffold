import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import app from '../../entries/node'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'
import { initChatHandlers } from '../services/chat-service'
import { createTestClient } from '../../test-utils/test-client'
import { createTestWSClient } from '../../test-utils/test-ws'

initChatHandlers()

describe('Chat Routes with Type-Safe Test Client', () => {
  let server: ReturnType<typeof createServer>
  let port: number
  let wsUrl: string
  const runtimeAdapter = getNodeRuntimeAdapter()

  beforeAll(async () => {
    return new Promise<void>(resolve => {
      server = createServer()

      server.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith('/api/chat/ws')) {
          const wssInstance = new WebSocketServer({ noServer: true })

          wssInstance.handleUpgrade(req, socket, head, ws => {
            runtimeAdapter.handleConnection(ws)
          })
        } else {
          socket.destroy()
        }
      })

      server.on('request', app.fetch)

      server.listen(0, () => {
        const address = server.address()
        if (address && typeof address === 'object') {
          port = address.port
          wsUrl = `ws://localhost:${port}/api/chat/ws`
        }
        resolve()
      })
    })
  }, 15000)

  afterAll(() => {
    return new Promise<void>(resolve => {
      server.close(() => resolve())
    })
  }, 15000)

  describe('GET /api/chat/ws/status', () => {
    it('should return WebSocket status', async () => {
      const client = createTestClient()

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
      const wsClient = createTestWSClient(wsUrl)

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Test timeout'))
          }, 5000)

          wsClient.onStatusChange(status => {
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
      const wsClient = createTestWSClient(wsUrl)

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Test timeout'))
          }, 5000)

          wsClient.onStatusChange(status => {
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

    it('should handle events with type-safe client', async () => {
      const wsClient = createTestWSClient(wsUrl)

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Test timeout'))
          }, 5000)

          wsClient.onStatusChange(status => {
            if (status === 'open') {
              clearTimeout(timeout)
              resolve()
            }
          })
        })

        const eventPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Event timeout'))
          }, 5000)

          wsClient.on('broadcast', payload => {
            expect(payload.message).toBe('test broadcast')
            expect(payload.timestamp).toBeDefined()
            clearTimeout(timeout)
            resolve()
          })
        })

        wsClient.emit('broadcast', {
          message: 'test broadcast',
          timestamp: Date.now(),
        })

        await eventPromise
      } finally {
        wsClient.close()
      }
    })
  })
})

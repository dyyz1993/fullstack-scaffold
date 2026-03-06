import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import app from '../../entries/node'
import { getNodeWSServer } from '../../module-realtime/services/realtime/node-ws'
import { createTestClient } from '../../test-utils/test-client'

describe('Realtime Routes with Type-Safe Test Client', () => {
  let server: ReturnType<typeof createServer>
  let port: number
  let wsUrl: string
  const wss = getNodeWSServer()

  beforeAll(async () => {
    return new Promise<void>(resolve => {
      server = createServer()

      server.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith('/api/ws')) {
          const wssInstance = new WebSocketServer({ noServer: true })

          wssInstance.handleUpgrade(req, socket, head, ws => {
            wss.handleConnection(ws)
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
          wsUrl = `ws://localhost:${port}/api/ws`
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

  describe('GET /api/ws/status', () => {
    it('should return WebSocket status', async () => {
      const client = createTestClient()

      const res = await client.api.ws.status.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('connectedClients')
      expect(typeof data.data.connectedClients).toBe('number')
    })
  })

  describe('GET /api/ws', () => {
    it('should return WebSocket protocol info', async () => {
      const client = createTestClient()

      const res = await client.api.ws.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.protocol).toBe('AppWSProtocol')
      expect(data.message).toBeDefined()
    })
  })

  describe('WebSocket RPC Methods', () => {
    it('should handle echo RPC call', async () => {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error('Test timeout'))
        }, 5000)

        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              id: 'test-echo-1',
              method: 'echo',
              params: { message: 'hello world' },
            })
          )
        })

        ws.on('message', data => {
          try {
            const msg = JSON.parse(data.toString())
            if (msg.id === 'test-echo-1') {
              expect(msg.result.message).toBe('hello world')
              expect(msg.result.timestamp).toBeDefined()
              expect(typeof msg.result.timestamp).toBe('number')
              clearTimeout(timeout)
              ws.close()
              resolve()
            }
          } catch (error) {
            clearTimeout(timeout)
            ws.close()
            reject(error)
          }
        })

        ws.on('error', error => {
          clearTimeout(timeout)
          reject(error)
        })
      })
    })

    it('should handle ping RPC call', async () => {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error('Test timeout'))
        }, 5000)

        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              id: 'test-ping-1',
              method: 'ping',
              params: {},
            })
          )
        })

        ws.on('message', data => {
          try {
            const msg = JSON.parse(data.toString())
            if (msg.id === 'test-ping-1') {
              expect(msg.result.pong).toBe(true)
              expect(msg.result.timestamp).toBeDefined()
              expect(typeof msg.result.timestamp).toBe('number')
              clearTimeout(timeout)
              ws.close()
              resolve()
            }
          } catch (error) {
            clearTimeout(timeout)
            ws.close()
            reject(error)
          }
        })

        ws.on('error', error => {
          clearTimeout(timeout)
          reject(error)
        })
      })
    })

    it('should handle unknown method error', async () => {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error('Test timeout'))
        }, 5000)

        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              id: 'test-unknown-1',
              method: 'unknownMethod',
              params: {},
            })
          )
        })

        ws.on('message', data => {
          try {
            const msg = JSON.parse(data.toString())
            if (msg.id === 'test-unknown-1') {
              expect(msg.error).toBeDefined()
              expect(msg.error).toContain('Unknown method')
              clearTimeout(timeout)
              ws.close()
              resolve()
            }
          } catch (error) {
            clearTimeout(timeout)
            ws.close()
            reject(error)
          }
        })

        ws.on('error', error => {
          clearTimeout(timeout)
          reject(error)
        })
      })
    })
  })
})

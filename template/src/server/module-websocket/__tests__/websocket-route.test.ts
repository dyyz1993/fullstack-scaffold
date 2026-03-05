import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import app from '../../entries/node'
import { getNodeWSServer } from '../../module-realtime/services/realtime/node-ws'

describe('WebSocket Routes', () => {
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

  describe('Connection', () => {
    it('should connect and receive connected event', async () => {
      return new Promise<void>(done => {
        const ws = new WebSocket(wsUrl)

        ws.on('message', data => {
          const msg = JSON.parse(data.toString())

          expect(msg.type).toBe('connected')
          expect(msg.payload).toHaveProperty('timestamp')
          expect(typeof msg.payload.timestamp).toBe('number')

          ws.close()
          done()
        })

        ws.on('error', () => done())
      })
    })
  })
})

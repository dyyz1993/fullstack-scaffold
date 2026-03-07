import { createServer, type Server } from 'http'
import { WebSocketServer } from 'ws'
import type { Hono, Env } from 'hono'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'
import { WSClient } from '@client/services/wsClient'
import type { AppWSProtocol } from '@shared/schemas'

export interface TestServer {
  server: Server
  port: number
  wsUrl: string
  close: () => Promise<void>
}

export function createTestServer<E extends Env>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<E, any, any>,
  wsPaths: string[] = []
): Promise<TestServer> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    const runtimeAdapter = getNodeRuntimeAdapter()
    const wss = new WebSocketServer({ noServer: true })

    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '', `http://localhost`)

      if (runtimeAdapter.hasWSPath(url.pathname)) {
        wss.handleUpgrade(req, socket, head, ws => {
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
        const port = address.port
        const wsUrl =
          wsPaths.length > 0 ? `ws://localhost:${port}${wsPaths[0]}` : `ws://localhost:${port}`

        resolve({
          server,
          port,
          wsUrl,
          close: () => new Promise<void>(res => server.close(() => res())),
        })
      } else {
        reject(new Error('Failed to get server address'))
      }
    })
  })
}

export function createTestWSClient(url: string): WSClient<AppWSProtocol> {
  return new WSClient<AppWSProtocol>(() => new WebSocket(url))
}

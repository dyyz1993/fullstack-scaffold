import { createServer, type Server } from 'http'
import { WebSocketServer } from 'ws'
import type { Hono, Env, Schema } from 'hono'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'

export interface TestServer {
  server: Server
  port: number
  wsUrl: string
  close: () => Promise<void>
}

interface AddressInfo {
  address: string
  family: string
  port: number
}

export function createTestServer<E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
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

    server.on('request', (req, res) => {
      const chunks: Buffer[] = []
      req.on('data', chunk => chunks.push(chunk))
      req.on('end', () => {
        const body = Buffer.concat(chunks)
        const address = server.address() as AddressInfo | null
        const port = address?.port ?? 0
        const url = new URL(req.url || '/', `http://localhost:${port}`)
        const headers = new Headers()
        for (const [key, value] of Object.entries(req.headers)) {
          if (value) {
            headers.set(key, Array.isArray(value) ? value.join(', ') : value)
          }
        }
        const request = new Request(url, {
          method: req.method,
          headers,
          body: body.length > 0 ? body : undefined,
        })
        Promise.resolve(app.fetch(request))
          .then((response: Response) => {
            res.statusCode = response.status
            response.headers.forEach((value: string, key: string) => {
              res.setHeader(key, value)
            })
            response.arrayBuffer().then((buffer: ArrayBuffer) => {
              res.end(Buffer.from(buffer))
            })
          })
          .catch((err: Error) => {
            res.statusCode = 500
            res.end(err.message)
          })
      })
    })

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
          close: () =>
            new Promise<void>(res => {
              wss.close(() => {
                server.close(() => res())
              })
            }),
        })
      } else {
        reject(new Error('Failed to get server address'))
      }
    })
  })
}

import type { Plugin } from 'vite'
import type { IncomingMessage } from 'http'
import type { Duplex } from 'stream'
import http from 'http'

let entryReady = false

async function waitForEntry(port: number, maxRetries = 60): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, res => {
          if (res.statusCode === 200) {
            resolve()
          } else {
            reject(new Error(`Health check failed with status ${res.statusCode}`))
          }
        })
        req.on('error', reject)
        req.end()
      })
      entryReady = true
      return
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  console.error('[WebSocket Plugin] Failed to load entry file after retries')
}

export function websocketPlugin(): Plugin {
  return {
    name: 'websocket-upgrade',
    configureServer(server) {
      server.httpServer?.once('listening', async () => {
        const address = server.httpServer?.address()
        if (address && typeof address === 'object') {
          await waitForEntry(address.port)
        }
      })

      server.httpServer?.on(
        'upgrade',
        async (req: IncomingMessage, socket: Duplex, head: Buffer) => {
          if (!req.url) return

          if (!entryReady) {
            const address = server.httpServer?.address()
            if (address && typeof address === 'object') {
              await waitForEntry(address.port)
            }
          }

          try {
            await server.ssrLoadModule('/src/server/index.ts')
          } catch {
            return
          }

          const runtimeModule = await server.ssrLoadModule('/src/server/core/runtime.ts')
          const { getRuntimeAdapter } = runtimeModule

          let runtime: InstanceType<
            typeof import('./src/server/core/runtime-node').NodeRuntimeAdapter
          > | null = null
          try {
            runtime = getRuntimeAdapter() as InstanceType<
              typeof import('./src/server/core/runtime-node').NodeRuntimeAdapter
            >
          } catch {
            return
          }

          const urlObj = new URL(req.url, 'http://localhost')
          if (runtime && runtime.hasWSPath(urlObj.pathname)) {
            const { WebSocketServer } = await import('ws')
            const wssInstance = new WebSocketServer({ noServer: true })
            wssInstance.handleUpgrade(req, socket, head, ws => {
              runtime!.handleConnection(ws)
            })
          }
        }
      )
    },
  }
}

export function dbPlugin(): Plugin {
  return {
    name: 'db-bootstrap',
    configureServer(server) {
      server.httpServer?.once('listening', async () => {
        try {
          const dbModule = await server.ssrLoadModule('/src/server/db/index.ts')
          const loggerModule = await server.ssrLoadModule('/src/server/utils/logger.ts')

          const log = loggerModule.logger.bootstrap()
          log.info({}, 'Initializing database...')

          await dbModule.getDb()
          await dbModule.runMigrations()

          const dbInitModule = await server.ssrLoadModule('/src/server/db/init.ts')
          await dbInitModule.initializeDatabase()

          log.info({}, 'Database ready')
        } catch (err) {
          console.error('[DB Plugin] Database initialization failed:', err)
        }
      })
    },
  }
}

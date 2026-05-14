import path from 'path'
import { existsSync } from 'fs'
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import { websocketPlugin, dbPlugin } from './vite-plugins'
import prerender from '@prerenderer/rollup-plugin'
import puppeteerRenderer from '@prerenderer/renderer-puppeteer'

async function getPrerenderRoutes(): Promise<string[]> {
  const staticRoutes = ['/', '/todos', '/notifications', '/websocket', '/content']

  try {
    const { createClient } = await import('@libsql/client')
    const dbCandidates = [
      path.resolve(process.cwd(), 'data/production.db'),
      path.resolve(process.cwd(), 'data/app.db'),
      path.resolve(process.cwd(), 'data/development.db'),
    ]

    for (const dbPath of dbCandidates) {
      if (!existsSync(dbPath)) continue

      const client = createClient({ url: `file:${dbPath}` })
      try {
        const rs = await client.execute(
          "SELECT id FROM contents WHERE status = 'published' ORDER BY created_at DESC"
        )
        client.close()

        if (rs.rows.length > 0) {
          const contentRoutes = rs.rows.map(row => `/content/content-${row.id}`)
          return [...staticRoutes, ...contentRoutes]
        }
      } catch {
        client.close()
      }
    }
  } catch {
    // fallback
  }

  return staticRoutes
}

const routes = await getPrerenderRoutes()

export default defineConfig({
  server: {
    port: 0,
    host: '0.0.0.0',
    hmr: {
      overlay: false,
    },
    allowedHosts: true,
  },
  plugins: [
    devServer({
      entry: 'src/server/index.ts',
      exclude: [
        /^\/$/,
        /^\/(@[a-zA-Z0-9_-]+|node_modules|__inspect|assets|index\.html|admin\.html|src)/,
        /.*\.(ts|tsx|js|jsx|css|json|png|jpg|svg)$/,
      ],
    }),
    websocketPlugin(),
    dbPlugin(),
  ],
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
      output: {
        plugins: [
          prerender({
            routes,
            renderer: new puppeteerRenderer({
              renderAfterDocumentEvent: 'prerender-ready',
              renderAfterTime: 5000,
            }),
          }),
        ],
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@client': path.resolve(__dirname, 'src/client'),
      '@server': path.resolve(__dirname, 'src/server'),
      '@admin': path.resolve(__dirname, 'src/admin'),
      '@cli': path.resolve(__dirname, 'src/cli'),
    },
  },
})

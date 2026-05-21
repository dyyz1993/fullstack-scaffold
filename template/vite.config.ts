import path from 'path'
import { existsSync } from 'fs'
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import { websocketPlugin, dbPlugin } from './vite-plugins'
// Prerender is optional — only needed during production build with puppeteer + Chrome installed
let prerender: typeof import('@prerenderer/rollup-plugin').default | undefined
let puppeteerRenderer: typeof import('@prerenderer/renderer-puppeteer').default | undefined
try {
  const prerenderMod = await import('@prerenderer/rollup-plugin')
  prerender = prerenderMod.default
  const puppeteerMod = await import('@prerenderer/renderer-puppeteer')
  puppeteerRenderer = puppeteerMod.default
  // Verify Chrome is actually available at runtime
  const { executablePath } = await import('puppeteer')
  const chromePath = executablePath()
  if (!existsSync(chromePath)) {
    prerender = undefined
    puppeteerRenderer = undefined
  }
} catch {
  // puppeteer/Chrome not available — prerendering disabled
}

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
    allowedHosts: ['.shanbox.19930810.xyz', 'localhost'],
  },
  plugins: [
    devServer({
      entry: 'src/server/index.ts',
      exclude: [
        /^\/$/,
        /^\/(@[a-zA-Z0-9_-]+|node_modules|__inspect|assets|index\.html|admin\.html|tenant\.html|merchant\.html|src)/,
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
        tenant: path.resolve(__dirname, 'tenant.html'),
        merchant: path.resolve(__dirname, 'merchant.html'),
      },
      output: {
        plugins: [
          ...(prerender && puppeteerRenderer
            ? [
                prerender({
                  routes,
                  renderer: new puppeteerRenderer({
                    renderAfterDocumentEvent: 'prerender-ready',
                    renderAfterTime: 5000,
                  }),
                }),
              ]
            : []),
        ],
      },
      onwarn(warning, defaultHandler) {
        // Suppress antd "use client" directive warnings (React Server Components marker)
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        defaultHandler(warning)
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@client': path.resolve(__dirname, 'src/client'),
      '@server': path.resolve(__dirname, 'src/server'),
      '@admin': path.resolve(__dirname, 'src/admin'),
      '@tenant': path.resolve(__dirname, 'src/tenant'),
      '@merchant': path.resolve(__dirname, 'src/merchant'),
      '@cli': path.resolve(__dirname, 'src/cli'),
    },
  },
})

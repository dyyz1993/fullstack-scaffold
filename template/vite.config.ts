import path from 'path'
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import { websocketPlugin, dbPlugin } from './vite-plugins'
import prerender from '@prerenderer/rollup-plugin'
import puppeteerRenderer from '@prerenderer/renderer-puppeteer'

export default defineConfig({
  server: {
    port: 0,
    host: '0.0.0.0',
    hmr: {
      overlay: true,
    },
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
            routes: ['/', '/todos', '/notifications', '/websocket', '/content'],
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

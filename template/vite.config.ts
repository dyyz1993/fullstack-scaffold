import path from 'path'
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import { websocketPlugin, dbPlugin } from './vite-plugins'

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
        /^\/(@[a-zA-Z0-9_-]+|node_modules|__inspect|assets|index\.html|ops\.html|src)/,
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
        ops: path.resolve(__dirname, 'ops.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@platform/server': path.resolve(__dirname, 'src/platform/server'),
      '@platform/client': path.resolve(__dirname, 'src/platform/client'),
      '@platform/shared': path.resolve(__dirname, 'src/platform/shared'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@client': path.resolve(__dirname, 'src/client'),
      '@server': path.resolve(__dirname, 'src/server'),
      '@ops': path.resolve(__dirname, 'src/ops'),
    },
  },
})

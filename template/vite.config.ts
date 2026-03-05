import path from 'path'
import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
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
        /^\/(@[a-zA-Z0-9_-]+|src|node_modules|__inspect|index\.html)/,
        /.*\.(ts|tsx|js|jsx|css|json|png|jpg|svg)$/,
      ],
    }),
    websocketPlugin(),
    dbPlugin(),
  ],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@client': path.resolve(__dirname, 'src/client'),
      '@server': path.resolve(__dirname, 'src/server'),
    },
  },
})

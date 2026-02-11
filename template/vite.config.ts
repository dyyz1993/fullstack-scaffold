import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import devServer from '@hono/vite-dev-server';

export default defineConfig({
  server: {
    port: 3010,
    host: '0.0.0.0',
    hmr: {
      overlay: true,
    },
  },
  plugins: [
    react(),
    devServer({
      entry: 'src/server/index.ts',
      exclude: [
        /^\/$/, // 根路径，交给 Vite 处理 index.html
        /^\/(@[a-zA-Z0-9_-]+|src|node_modules|__inspect|index\.html)/, // Vite 内部路径
        /.*\.(ts|tsx|js|jsx|css|json)$/,
      ],
    }),
  ],
  build: {
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
});

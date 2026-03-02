import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import devServer from '@hono/vite-dev-server';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if ('id' in msg && 'method' in msg && 'params' in msg) {
        if (msg.method === 'echo') {
          ws.send(JSON.stringify({
            id: msg.id,
            result: { message: msg.params.message, timestamp: Date.now() },
          }));
        } else if (msg.method === 'ping') {
          ws.send(JSON.stringify({
            id: msg.id,
            result: { pong: true, timestamp: Date.now() },
          }));
        } else {
          ws.send(JSON.stringify({
            id: msg.id,
            error: `Unknown RPC method: ${msg.method}`,
          }));
        }
      } else if ('type' in msg) {
        if (msg.type === 'broadcast') {
          wss.clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'broadcast',
                payload: msg.payload,
                timestamp: Date.now(),
              }));
            }
          });
        }
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', payload: 'Invalid JSON', timestamp: Date.now() }));
    }
  });

  ws.on('close', () => console.log('[WS] Client disconnected'));
  ws.on('error', (e) => console.error('[WS] Error:', e));

  ws.send(JSON.stringify({
    type: 'connected',
    payload: { timestamp: Date.now() },
  }));
});

const handleWSUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  const url = new URL(req.url || '', 'http://localhost');

  if (!url.pathname.startsWith('/api/ws')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
};

export default defineConfig({
  server: {
    port: 0,
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
        /^\/$/,
        /^\/(@[a-zA-Z0-9_-]+|src|node_modules|__inspect)/,
        /.*\.(ts|tsx|js|jsx|css|json|png|jpg|svg)$/,
      ],
    }),
    {
      name: 'websocket-proxy',
      configureServer(server) {
        server.httpServer?.on('upgrade', (req, socket, head) => {
          if (req.url?.startsWith('/api/ws')) {
            handleWSUpgrade(req, socket, head);
          }
        });
      },
    },
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

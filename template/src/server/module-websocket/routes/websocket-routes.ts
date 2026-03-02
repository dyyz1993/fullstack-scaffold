/**
 * WebSocket API routes using Hono
 * Demonstrates WebSocket support with type inference
 */

import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import * as wsService from '../services/websocket-service';

const WSStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    connectedClients: z.number(),
  }),
});

const statusRoute = createRoute({
  method: 'get',
  path: '/ws/status',
  tags: ['websocket'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: WSStatusResponseSchema,
        },
      },
      description: 'Get WebSocket status',
    },
  },
});

export const websocketRoutes = new OpenAPIHono()
  .openapi(statusRoute, async (c) => {
    const count = wsService.getConnectedClientsCount();
    return c.json({ success: true, data: { connectedClients: count } });
  })
  .get('/ws', async (c) => {
    const upgrade = c.req.header('Upgrade');
    if (upgrade?.toLowerCase() !== 'websocket') {
      return c.json({ success: false, error: 'WebSocket upgrade required' }, 400);
    }
    return c.json({ success: false, error: 'Use WebSocket client to connect' }, 426);
  });

import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ noServer: true });
const clientSet = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  clientSet.add(ws);
  console.log('[WS] Client connected, total:', clientSet.size);

  ws.on('message', (data) => {
    wsService.handleMessage(
      data.toString(),
      (msg) => ws.send(msg),
      () => ws.readyState,
      () => ws.close()
    );
  });

  ws.on('close', () => {
    clientSet.delete(ws);
    console.log('[WS] Client disconnected, total:', clientSet.size);
  });

  ws.on('error', (e) => console.error('[WS] Error:', e));

  ws.send(JSON.stringify({
    type: 'notification',
    payload: { title: 'Connected', body: 'WebSocket connection established' },
    timestamp: Date.now(),
  }));
});

export const handleWSUpgrade = (req: IncomingMessage, socket: any, head: any) => {
  const url = new URL(req.url || '', 'http://localhost');
  
  if (!url.pathname.startsWith('/api/websocket/ws')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
};

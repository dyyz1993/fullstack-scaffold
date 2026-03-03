import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import * as wsService from '../services/websocket-service';
import { logger } from '../../lib/logger';

const log = logger.ws();

const WSStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    connectedClients: z.number(),
  }),
});

const statusRoute = createRoute({
  method: 'get',
  path: '/status',
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

const wsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['websocket'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({}).passthrough(),
        },
      },
      description: 'WebSocket endpoint - returns protocol info for type inference',
    },
  },
});

export const websocketRoutes = new OpenAPIHono()
  .openapi(statusRoute, async (c) => {
    const count = wsService.getConnectedClientsCount();
    return c.json({ success: true, data: { connectedClients: count } });
  })
  .openapi(wsRoute, async (c) => {
    return c.json({ protocol: 'AppWSProtocol' as const });
  });

import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { Duplex } from 'stream';

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  const client: wsService.WSClient = {
    send: (msg) => ws.send(msg),
    readyState: () => ws.readyState,
    close: () => ws.close(),
  };

  wsService.addClient(client);

  ws.on('message', (data) => {
    wsService.handleMessage(
      data.toString(),
      (msg) => ws.send(msg),
      () => ws.readyState,
      () => ws.close()
    );
  });

  ws.on('close', () => {
    wsService.removeClient(client);
  });

  ws.on('error', (e) => log.error({ err: e }, 'WebSocket error'));

  ws.send(JSON.stringify({
    type: 'connected',
    payload: { timestamp: Date.now() },
  }));
});

export const handleWSUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  const url = new URL(req.url || '', 'http://localhost');
  
  if (!url.pathname.startsWith('/api/ws')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
};

export type { AppWSProtocol } from '@shared/schemas/ws-protocol';

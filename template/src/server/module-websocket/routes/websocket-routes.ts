/**
 * WebSocket API routes using Hono
 * Demonstrates WebSocket support with type inference
 * 
 * Note: Hono doesn't have a Node.js WebSocket adapter.
 * We use the 'ws' library directly with manual upgrade handling.
 */

import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import * as wsService from '../services/websocket-service';
import { AppWSProtocolSchema } from '@shared/schemas/ws-protocol';

const WSStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    connectedClients: z.number(),
  }),
});

const WSErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
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
        websocket: {
          schema: AppWSProtocolSchema,
        },
      },
      description: 'WebSocket protocol definition (for type inference)',
    },
    400: {
      content: {
        'application/json': {
          schema: WSErrorResponseSchema,
        },
      },
      description: 'WebSocket upgrade required',
    },
    426: {
      content: {
        'application/json': {
          schema: WSErrorResponseSchema,
        },
      },
      description: 'Use WebSocket client to connect',
    },
  },
});

export const websocketRoutes = new OpenAPIHono()
  .openapi(statusRoute, async (c) => {
    const count = wsService.getConnectedClientsCount();
    return c.json({ success: true, data: { connectedClients: count } });
  })
  .openapi(wsRoute, async (c) => {
    const upgrade = c.req.header('Upgrade');
    if (upgrade?.toLowerCase() !== 'websocket') {
      return c.json({ success: false as const, error: 'WebSocket upgrade required' }, 400);
    }
    return c.json({ success: false as const, error: 'Use WebSocket client to connect' }, 426);
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
  console.log('[WS] Client connected, total:', wsService.getConnectedClientsCount());

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
    console.log('[WS] Client disconnected, total:', wsService.getConnectedClientsCount());
  });

  ws.on('error', (e) => console.error('[WS] Error:', e));

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

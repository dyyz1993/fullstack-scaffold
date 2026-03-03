/* eslint-disable no-console */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { apiRoutes } from './module-todos/routes/todos-routes';
import { notificationRoutes } from './module-notifications/routes/notification-routes';
import { getDb } from './db/driver-cloudflare';
import * as wsService from './module-websocket/services/websocket-service';

export interface AppBindings {
  DB: D1Database;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: AppBindings }>();

app
  .use('*', async (c, next) => {
    (globalThis as any).DB = c.env.DB;
    await next();
  })
  .get('/api/ws', upgradeWebSocket(() => ({
    onMessage(event: MessageEvent) {
      const ws = event.target as WebSocket;
      wsService.handleMessage(
        event.data as string,
        (msg) => ws.send(msg),
        () => 1,
        () => ws.close()
      );
    },
    onClose() {
      console.log('Client disconnected');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onOpen(_event: any, ws: any) {
      ws.send(JSON.stringify({
        type: 'connected',
        payload: { timestamp: Date.now() },
      }));
    },
  })))
  .use('*', cors({
    origin: ['*'],
    credentials: true,
  }))
  .route('/api', apiRoutes)
  .route('/api', notificationRoutes)
  .get('/health', async (c) => {
    try {
      await getDb();
      return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
    } catch (err) {
      return c.json({ status: 'error', timestamp: new Date().toISOString(), db: 'disconnected', error: String(err) }, 500);
    }
  })
  .get('/', (c) => c.json({ 
    name: 'Biomimic Todo App',
    version: '0.1.0',
    environment: 'cloudflare-workers'
  }))
  .onError((err, c) => {
    console.error('Server error:', err);
    return c.json({ success: false, error: err.message || 'Internal server error' }, 500);
  });

export default {
  fetch: async (request: Request, env: AppBindings, ctx: ExecutionContext) => {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
      return app.fetch(request, env, ctx);
    }
    
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }
    
    return app.fetch(request, env, ctx);
  },
};

export type AppType = typeof app;

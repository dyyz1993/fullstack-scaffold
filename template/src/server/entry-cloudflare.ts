import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiRoutes } from './module-todos/routes/todos-routes';
import { notificationRoutes } from './module-notifications/routes/notification-routes';
import { websocketRoutes } from './module-websocket/routes/websocket-routes';
import { cloudflareWSHandler } from './module-websocket/routes/websocket-routes';
import { getDb } from './db/driver-cloudflare';

export interface AppBindings {
  DB: D1Database;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: AppBindings }>()
  .use('*', cors({
    origin: ['*'],
    credentials: true,
  }))
  .use('*', async (c, next) => {
    (globalThis as any).DB = c.env.DB;
    await next();
  })
  .route('/api', apiRoutes)
  .route('/api', notificationRoutes)
  .route('/api/ws', websocketRoutes)
  .get('/api/ws', cloudflareWSHandler!)
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

export default app;
export type AppType = typeof app;

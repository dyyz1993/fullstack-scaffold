import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiRoutes } from './module-todos/routes/todos-routes';
import { notificationRoutes } from './module-notifications/routes/notification-routes';
import { getDb } from './db/driver-cloudflare';
import { NotificationDurableObject } from './durable-objects/NotificationDO';

export interface AppBindings {
  DB: D1Database;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  NOTIFICATION_DO: DurableObjectNamespace;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: AppBindings }>();

app
  .use('*', async (c, next) => {
    (globalThis as unknown as { DB: D1Database }).DB = c.env.DB;
    await next();
  })
  .get('/api/ws', async (c) => {
    const id = c.env.NOTIFICATION_DO.idFromName('global');
    const stub = c.env.NOTIFICATION_DO.get(id);
    return stub.fetch(c.req.raw);
  })
  .get('/api/notifications/stream', async (c) => {
    const id = c.env.NOTIFICATION_DO.idFromName('global');
    const stub = c.env.NOTIFICATION_DO.get(id);
    return stub.fetch(c.req.raw);
  })
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

export { NotificationDurableObject };
export type AppType = typeof app;

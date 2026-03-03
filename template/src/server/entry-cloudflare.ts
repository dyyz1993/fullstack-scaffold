import { createApp, type AppBindings } from './app';
import { cloudflareWSHandler } from './module-websocket/routes/websocket-routes';
import { getDb } from './db/driver-cloudflare';

interface CloudflareBindings extends AppBindings {
  DB: D1Database;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  ENVIRONMENT: string;
}

const app = createApp<CloudflareBindings>()
  .use('*', async (c, next) => {
    (globalThis as any).DB = c.env.DB;
    await next();
  })
  .get('/api/ws', cloudflareWSHandler!)
  .get('/api/ws/connect', cloudflareWSHandler!)
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

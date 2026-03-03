import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { isCloudflare } from '../utils/env';
import type { AppBindings } from '../types/bindings';

export function createRealtimeRoutes() {
  const app = new Hono<{ Bindings: AppBindings }>();

  app
    .get('/ws/status', async (c) => {
      return c.json({ success: true, data: { connectedClients: 0 } });
    })
    .get('/ws', async (c) => {
      if (isCloudflare && c.env.NOTIFICATION_DO) {
        const id = c.env.NOTIFICATION_DO.idFromName('global');
        const stub = c.env.NOTIFICATION_DO.get(id);
        return stub.fetch(c.req.raw);
      }
      return c.json({ protocol: 'AppWSProtocol' as const, message: 'WebSocket upgrade required' });
    })
    .get('/notifications/stream', async (c) => {
      if (isCloudflare && c.env.NOTIFICATION_DO) {
        const id = c.env.NOTIFICATION_DO.idFromName('global');
        const stub = c.env.NOTIFICATION_DO.get(id);
        return stub.fetch(c.req.raw);
      }
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          event: 'connected',
          data: JSON.stringify({ timestamp: Date.now() }),
        });
        while (true) {
          await stream.sleep(30000);
          await stream.writeSSE({
            event: 'ping',
            data: JSON.stringify({ timestamp: Date.now() }),
          });
        }
      });
    });

  return app;
}

export type RealtimeRoutesType = ReturnType<typeof createRealtimeRoutes>;

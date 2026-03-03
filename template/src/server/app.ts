import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { apiRoutes } from './module-todos/routes/todos-routes';
import { notificationRoutes } from './module-notifications/routes/notification-routes';
import { websocketRoutes } from './module-websocket/routes/websocket-routes';

export function createApp() {
  return new Hono()
    .use('*', cors({
      origin: ['*'],
      credentials: true,
    }))
    .route('/api', apiRoutes)
    .route('/api', notificationRoutes)
    .route('/api/ws', websocketRoutes)
    .get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
}

export { apiRoutes, notificationRoutes, websocketRoutes };

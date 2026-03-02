/**
 * Hono server entry point
 * Main application server with CORS and error handling
 *
 * IMPORTANT: Uses CHAIN SYNTAX for proper Hono RPC type inference
 */

import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Hono } from 'hono';
import { apiRoutes } from './module-todos/routes/todos-routes';
import { notificationRoutes } from './module-notifications/routes/notification-routes';
import { websocketRoutes } from './module-websocket/routes/websocket-routes';

const app = new Hono()
  .use('*', logger())
  .use('*', cors({
    origin: ['http://localhost:3010', 'http://localhost:5173'],
    credentials: true,
  }))
  .route('/api', apiRoutes)
  .route('/api', notificationRoutes)
  .route('/api', websocketRoutes)
  .get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  })
  .get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Todo & Notification API</title>
        </head>
        <body>
          <h1>API Server</h1>
          <p>Server is running on port 3010</p>
          <p><a href="/docs">API Documentation</a></p>
          <h2>Available Endpoints</h2>
          <ul>
            <li><code>GET /api/todos</code> - List todos</li>
            <li><code>POST /api/todos</code> - Create todo</li>
            <li><code>GET /api/notifications</code> - List notifications</li>
            <li><code>GET /api/notifications/stream</code> - SSE stream</li>
            <li><code>GET /api/websocket/ws</code> - WebSocket endpoint</li>
          </ul>
        </body>
      </html>
    `);
  });

app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal server error',
  }, 500);
});

app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
  }, 404);
});

export default app;

export type AppType = typeof app;

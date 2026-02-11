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

// Note: @hono/zod-openapi is installed but openAPI helper is not used in this simple setup
// If you need OpenAPI docs, you can add: import { openAPI } from '@hono/zod-openapi';

// Create Hono app with CHAIN SYNTAX for type inference
const app = new Hono()
  // Global middleware
  .use('*', logger())
  .use('*', cors({
    origin: ['http://localhost:3010', 'http://localhost:5173'],
    credentials: true,
  }))
  // API routes
  .route('/api', apiRoutes)
  // Health check
  .get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  })
  // Root endpoint
  .get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Todo API</title>
        </head>
        <body>
          <h1>Todo API Server</h1>
          <p>Server is running on port 3010</p>
          <p><a href="/docs">API Documentation</a></p>
        </body>
      </html>
    `);
  });

// Error handler (must be set separately, not in chain)
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal server error',
  }, 500);
});

// 404 handler (must be set separately, not in chain)
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
  }, 404);
});

export default app;

/**
 * Export for Hono RPC type inference
 * @see src/shared/rpc-server.ts
 */
export type AppType = typeof app;

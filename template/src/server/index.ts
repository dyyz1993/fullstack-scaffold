import './config';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Hono } from 'hono';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { getAppConfig } from './config';
import { apiRoutes } from './module-todos/routes/todos-routes';
import { notificationRoutes } from './module-notifications/routes/notification-routes';
import { websocketRoutes, handleWSUpgrade } from './module-websocket/routes/websocket-routes';
import { getDb, runMigrations } from './db';

const config = getAppConfig();
const distPath = resolve(process.cwd(), 'dist');
const hasDist = existsSync(distPath);
const indexHtml = hasDist 
  ? readFileSync(resolve(distPath, 'index.html'), 'utf-8')
  : null;

const app = new Hono()
  .use('*', logger())
  .use('*', cors({
    origin: ['*'],
    credentials: true,
  }))
  .route('/api', apiRoutes)
  .route('/api', notificationRoutes)
  .route('/api/ws', websocketRoutes)
  .get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

if (config.enableDocs) {
  app.get('/docs', (c) => c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = function() {
            SwaggerUIBundle({
              url: "/api/docs",
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
              ],
              layout: "BaseLayout"
            });
          }
        </script>
      </body>
    </html>
  `));
}

app
  .use('/*', async (c, next) => {
    if (hasDist) {
      return serveStatic({ root: distPath })(c, next);
    }
    await next();
  })
  .get('*', (c) => {
    if (indexHtml) {
      return c.html(indexHtml);
    }
    return c.redirect(config.enableDocs ? '/docs' : '/health');
  })
  .onError((err, c) => {
    console.error('Server error:', err);
    return c.json({ success: false, error: err.message || 'Internal server error' }, 500);
  })
  .notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

export default app;
export { handleWSUpgrade };
export type AppType = typeof app;

export async function createServer() {
  const server = serve({
    fetch: app.fetch,
    port: config.port,
  });

  server.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/api/ws')) {
      handleWSUpgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  return { server, port: config.port };
}

export async function startServer() {
  console.log('[Bootstrap] Initializing database...');
  try {
    await getDb();
    await runMigrations();
    console.log('[Bootstrap] Database ready');
  } catch (err) {
    console.error('[Bootstrap] Database initialization failed:', err);
    process.exit(1);
  }

  const { server, port } = await createServer();

  console.log(`[Server] Running on http://localhost:${port}`);
  if (config.enableDocs) {
    console.log(`[Server] API docs: http://localhost:${port}/docs`);
  }

  const shutdown = async () => {
    console.log('\n[Server] Shutting down...');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

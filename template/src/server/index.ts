import './config';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { getAppConfig } from './config';
import { logger } from './lib/logger';
import { createApp } from './app';
import { handleWSUpgrade } from './module-websocket/routes/websocket-routes';
import { getDb, runMigrations } from './db';

const config = getAppConfig();
const distPath = resolve(process.cwd(), 'dist');
const hasDist = existsSync(distPath);
const indexHtml = hasDist 
  ? readFileSync(resolve(distPath, 'index.html'), 'utf-8')
  : null;

const log = logger.api();

const app = createApp()
  .use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    log.info({ method: c.req.method, path: c.req.path, status: c.res.status, ms }, 'request');
  });

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
    log.error({ err, path: c.req.path }, 'server error');
    return c.json({ success: false, error: err.message || 'Internal server error' }, 500);
  })
  .notFound((c) => {
    log.warn({ path: c.req.path }, 'not found');
    return c.json({ success: false, error: 'Not found' }, 404);
  });

export default app;
export { handleWSUpgrade };
export type AppType = typeof app;

export async function createServer() {
  const server = serve({
    fetch: app.fetch,
    port: config.port,
  });

  server.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/api/ws') && handleWSUpgrade) {
      handleWSUpgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  return { server, port: config.port };
}

export async function startServer() {
  const bootstrapLog = logger.bootstrap();
  
  bootstrapLog.info({}, 'Initializing database...');
  try {
    await getDb();
    await runMigrations();
    bootstrapLog.info({}, 'Database ready');
  } catch (err) {
    bootstrapLog.error({ err }, 'Database initialization failed');
    process.exit(1);
  }

  const { server, port } = await createServer();

  bootstrapLog.info({ port }, 'Server running');
  if (config.enableDocs) {
    bootstrapLog.info({ url: `http://localhost:${port}/docs` }, 'API docs available');
  }

  const shutdown = async () => {
    bootstrapLog.info({}, 'Shutting down...');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

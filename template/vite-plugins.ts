import type { Plugin } from 'vite';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

export function websocketPlugin(): Plugin {
  return {
    name: 'websocket-upgrade',
    configureServer(server) {
      server.httpServer?.on('upgrade', async (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        if (req.url?.startsWith('/api/ws')) {
          const { handleWSUpgrade } = await import('./src/server/module-websocket/routes/websocket-routes');
          handleWSUpgrade(req, socket, head);
        }
      });
    },
  };
}

export function dbPlugin(): Plugin {
  return {
    name: 'db-bootstrap',
    configureServer(server) {
      server.httpServer?.once('listening', async () => {
        const { getDb, runMigrations } = await import('./src/server/db');
        try {
          console.log('[DB] Initializing...');
          await getDb();
          await runMigrations();
          console.log('[DB] Ready');
        } catch (err) {
          console.error('[DB] Initialization failed:', err);
        }
      });
    },
  };
}

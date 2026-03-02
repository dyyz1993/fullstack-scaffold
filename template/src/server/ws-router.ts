import { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { handleWSUpgrade as handleWebSocketUpgrade } from './module-websocket/routes/websocket-routes';

/**
 * Global WebSocket upgrade dispatcher
 * Routes WebSocket upgrade requests to appropriate module handlers
 */
export const handleUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  const url = req.url || '';

  if (url.startsWith('/api/ws')) {
    handleWebSocketUpgrade(req, socket, head);
    return;
  }

  socket.destroy();
};

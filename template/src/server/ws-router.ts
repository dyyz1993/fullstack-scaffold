import { IncomingMessage } from 'http';
import { handleWSUpgrade as handleWebSocketUpgrade } from './module-websocket/routes/websocket-routes';

/**
 * Global WebSocket upgrade dispatcher
 * Routes WebSocket upgrade requests to appropriate module handlers
 */
export const handleUpgrade = (req: IncomingMessage, socket: any, head: any) => {
  const url = req.url || '';

  // WebSocket module
  if (url.startsWith('/api/websocket/ws')) {
    handleWebSocketUpgrade(req, socket, head);
    return;
  }

  // Future modules can be added here
  // if (url.startsWith('/api/chat/ws')) {
  //   handleChatUpgrade(req, socket, head);
  //   return;
  // }

  // No handler matched, close the socket
  socket.destroy();
};

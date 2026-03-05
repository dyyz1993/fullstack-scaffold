import type { WSMessage, WSRpcRequest } from '@shared/schemas';
import { logger } from '../../utils/logger';
import { createRealtimeCore, type RealtimeCore, type WSClient as CoreWSClient } from '../../module-realtime/services/realtime/core';

const log = logger.ws();

const core: RealtimeCore = createRealtimeCore();

export type WSClient = CoreWSClient;

export function handleMessage(
  data: string,
  send: (message: string) => void,
  _readyState: () => number,
  _close: () => void
) {
  let message: WSMessage;
  try {
    message = JSON.parse(data);
  } catch {
    log.warn({ data: data.slice(0, 100) }, 'Invalid JSON received');
    send(JSON.stringify({ type: 'error', payload: 'Invalid JSON', timestamp: Date.now() }));
    return;
  }

  if ('id' in message && 'method' in message && 'params' in message) {
    handleRpcRequest(message as WSRpcRequest, send);
    return;
  }

  if ('type' in message) {
    handleEvent(message);
    return;
  }

  log.warn({ message }, 'Unknown message format');
  send(JSON.stringify({ type: 'error', payload: 'Unknown message format', timestamp: Date.now() }));
}

function handleRpcRequest(request: WSRpcRequest, send: (message: string) => void) {
  const { id, method, params } = request;
  log.debug({ id, method }, 'RPC request received');

  switch (method) {
    case 'echo': {
      const p = params as { message: string };
      send(JSON.stringify({
        id,
        result: { message: p.message, timestamp: Date.now() },
      }));
      break;
    }
    case 'ping': {
      send(JSON.stringify({
        id,
        result: { pong: true, timestamp: Date.now() },
      }));
      break;
    }
    default:
      log.warn({ id, method }, 'Unknown RPC method');
      send(JSON.stringify({
        id,
        error: `Unknown RPC method: ${method}`,
      }));
  }
}

function handleEvent(message: WSMessage) {
  log.debug({ type: message.type }, 'Event received');
  
  switch (message.type) {
    case 'broadcast':
      core.broadcast(message.payload, [], 'broadcast');
      break;
    default:
      log.warn({ type: message.type }, 'Unknown event type');
  }
}

export function addClient(client: WSClient) {
  core.wsClients.set(client.id, client);
  log.info({ count: core.wsClients.size }, 'Client connected');
}

export function removeClient(client: WSClient) {
  core.wsClients.delete(client.id);
  log.info({ count: core.wsClients.size }, 'Client disconnected');
}

export function getConnectedClientsCount(): number {
  return core.wsClients.size;
}

export { core };

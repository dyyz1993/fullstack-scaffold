import type { WSMessage, WSRpcRequest } from '@shared/schemas';
import { logger } from '../../lib/logger';

const log = logger.ws();

type SendFunction = (message: string) => void;
type ReadyStateFunction = () => number;
type CloseFunction = () => void;

export interface WSClient {
  send: SendFunction;
  readyState: ReadyStateFunction;
  close: CloseFunction;
}

const connectedClients = new Set<WSClient>();

export function handleMessage(
  data: string,
  send: SendFunction,
  readyState: ReadyStateFunction,
  close: CloseFunction
) {
  const client: WSClient = { send, readyState, close };

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
    handleEvent(message, client);
    return;
  }

  log.warn({ message }, 'Unknown message format');
  send(JSON.stringify({ type: 'error', payload: 'Unknown message format', timestamp: Date.now() }));
}

function handleRpcRequest(request: WSRpcRequest, send: SendFunction) {
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

function handleEvent(message: WSMessage, client: WSClient) {
  log.debug({ type: message.type }, 'Event received');
  
  switch (message.type) {
    case 'broadcast':
      handleBroadcast(client, message);
      break;
    case 'notification':
      handleNotification(client, message);
      break;
    default:
      log.warn({ type: message.type }, 'Unknown event type');
      client.send(JSON.stringify({ type: 'error', payload: `Unknown event type: ${message.type}`, timestamp: Date.now() }));
  }
}

function handleBroadcast(_client: WSClient, message: WSMessage) {
  log.debug({ clients: connectedClients.size }, 'Broadcasting message');
  
  const broadcastMessage = JSON.stringify({
    type: 'broadcast',
    payload: message.payload,
    timestamp: Date.now(),
  });

  for (const c of connectedClients) {
    try {
      if (c.readyState() === 1) {
        c.send(broadcastMessage);
      }
    } catch {
      connectedClients.delete(c);
    }
  }
}

function handleNotification(client: WSClient, message: WSMessage) {
  client.send(JSON.stringify({
    type: 'notification',
    payload: message.payload,
    timestamp: Date.now(),
  }));
}

export function addClient(client: WSClient) {
  connectedClients.add(client);
  log.info({ count: connectedClients.size }, 'Client connected');
}

export function removeClient(client: WSClient) {
  connectedClients.delete(client);
  log.info({ count: connectedClients.size }, 'Client disconnected');
}

export function getConnectedClientsCount(): number {
  return connectedClients.size;
}

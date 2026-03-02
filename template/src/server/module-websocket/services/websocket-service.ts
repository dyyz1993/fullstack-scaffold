/**
 * WebSocket service
 * Handles WebSocket message processing
 */

import type { WSMessage, WSRpcRequest } from '@shared/schemas';

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
    send(JSON.stringify({ type: 'error', payload: 'Invalid JSON', timestamp: Date.now() }));
    return;
  }

  // RPC 请求格式: { id, method, params }
  if ('id' in message && 'method' in message && 'params' in message) {
    handleRpcRequest(message as WSRpcRequest, send);
    return;
  }

  // 事件格式: { type, payload }
  if ('type' in message) {
    handleEvent(message, client);
    return;
  }

  send(JSON.stringify({ type: 'error', payload: 'Unknown message format', timestamp: Date.now() }));
}

function handleRpcRequest(request: WSRpcRequest, send: SendFunction) {
  const { id, method, params } = request;

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
      send(JSON.stringify({
        id,
        error: `Unknown RPC method: ${method}`,
      }));
  }
}

function handleEvent(message: WSMessage, client: WSClient) {
  switch (message.type) {
    case 'broadcast':
      handleBroadcast(client, message);
      break;
    case 'notification':
      handleNotification(client, message);
      break;
    default:
      client.send(JSON.stringify({ type: 'error', payload: `Unknown event type: ${message.type}`, timestamp: Date.now() }));
  }
}

function handleBroadcast(_client: WSClient, message: WSMessage) {
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
}

export function removeClient(client: WSClient) {
  connectedClients.delete(client);
}

export function getConnectedClientsCount(): number {
  return connectedClients.size;
}

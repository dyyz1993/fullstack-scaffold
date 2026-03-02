/**
 * WebSocket service
 * Handles WebSocket message processing
 */

import type { WSMessage } from '@shared/schemas';

type SendFunction = (message: string) => void;
type ReadyStateFunction = () => number;
type CloseFunction = () => void;

interface WSClient {
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

  switch (message.type) {
    case 'ping':
      handlePing(client, message);
      break;
    case 'echo':
      handleEcho(client, message);
      break;
    case 'broadcast':
      handleBroadcast(client, message);
      break;
    case 'notification':
      handleNotification(client, message);
      break;
    default:
      send(JSON.stringify({ type: 'error', payload: 'Unknown message type', timestamp: Date.now() }));
  }
}

function handlePing(client: WSClient, message: WSMessage) {
  client.send(JSON.stringify({
    type: 'pong',
    payload: message.payload,
    timestamp: Date.now(),
  }));
}

function handleEcho(client: WSClient, message: WSMessage) {
  client.send(JSON.stringify({
    type: 'echo',
    payload: message.payload,
    timestamp: Date.now(),
  }));
}

function handleBroadcast(client: WSClient, message: WSMessage) {
  connectedClients.add(client);

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

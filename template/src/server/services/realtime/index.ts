import type { WSServer, WSMessageHandler, WSConnectionHandler, WSDisconnectHandler } from './types';
import { isCloudflare } from '../../utils/env';

export type { WSServer, WSClient, WSMessageHandler, WSConnectionHandler, WSDisconnectHandler } from './types';

let _wss: WSServer | null = null;

export function initWSServer(env?: { NOTIFICATION_DO?: DurableObjectNamespace }): WSServer {
  if (_wss) return _wss;

  if (isCloudflare && env?.NOTIFICATION_DO) {
    const { CloudflareWSServer } = require('./cloudflare-do');
    _wss = new CloudflareWSServer(env as { NOTIFICATION_DO: DurableObjectNamespace });
  } else {
    const { getNodeWSServer } = require('./node-ws');
    _wss = getNodeWSServer();
  }

  return _wss!;
}

export function getWSServer(): WSServer {
  if (!_wss) {
    return initWSServer();
  }
  return _wss;
}

export const wss: WSServer = new Proxy({} as WSServer, {
  get(_target, prop) {
    const server = getWSServer();
    return Reflect.get(server, prop, server);
  },
});

export function onMessage(handler: WSMessageHandler): void {
  const server = getWSServer();
  if ('onMessage' in server && typeof (server as any).onMessage === 'function') {
    (server as any).onMessage(handler);
  }
}

export function onConnection(handler: WSConnectionHandler): void {
  const server = getWSServer();
  if ('onConnection' in server && typeof (server as any).onConnection === 'function') {
    (server as any).onConnection(handler);
  }
}

export function onDisconnect(handler: WSDisconnectHandler): void {
  const server = getWSServer();
  if ('onDisconnect' in server && typeof (server as any).onDisconnect === 'function') {
    (server as any).onDisconnect(handler);
  }
}

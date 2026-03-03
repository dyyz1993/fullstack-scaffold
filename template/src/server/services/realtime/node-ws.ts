import type { WebSocket } from 'ws';
import type { WSServer, WSClient, WSMessageHandler, WSConnectionHandler, WSDisconnectHandler } from './types';
import { generateUUID } from '../../utils/uuid';

class NodeWSClient implements WSClient {
  readonly id: string;
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.id = generateUUID();
    this.ws = ws;
  }

  get readyState(): number {
    return this.ws.readyState;
  }

  send(data: unknown): void {
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close(): void {
    this.ws.close();
  }
}

export class NodeWSServer implements WSServer {
  private _clients: Map<string, WSClient> = new Map();
  private messageHandler?: WSMessageHandler;
  private connectionHandler?: WSConnectionHandler;
  private disconnectHandler?: WSDisconnectHandler;

  get clients(): Map<string, WSClient> {
    return this._clients;
  }

  get size(): number {
    return this._clients.size;
  }

  broadcast(data: unknown, exclude: string[] = []): void {
    for (const [id, client] of this._clients) {
      if (!exclude.includes(id) && client.readyState === 1) {
        client.send(data);
      }
    }
  }

  send(clientId: string, data: unknown): boolean {
    const client = this._clients.get(clientId);
    if (client && client.readyState === 1) {
      client.send(data);
      return true;
    }
    return false;
  }

  close(clientId: string): void {
    const client = this._clients.get(clientId);
    if (client) {
      client.close();
    }
  }

  onMessage(handler: WSMessageHandler): void {
    this.messageHandler = handler;
  }

  onConnection(handler: WSConnectionHandler): void {
    this.connectionHandler = handler;
  }

  onDisconnect(handler: WSDisconnectHandler): void {
    this.disconnectHandler = handler;
  }

  handleConnection(ws: WebSocket): WSClient {
    const client = new NodeWSClient(ws);

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        this.messageHandler?.(parsed, client, this);
      } catch {
        this.messageHandler?.(data.toString(), client, this);
      }
    });

    ws.on('close', () => {
      this._clients.delete(client.id);
      this.disconnectHandler?.(client, this);
    });

    this._clients.set(client.id, client);
    this.connectionHandler?.(client, this);

    return client;
  }
}

let _instance: NodeWSServer | null = null;

export function getNodeWSServer(): NodeWSServer {
  if (!_instance) {
    _instance = new NodeWSServer();
  }
  return _instance;
}

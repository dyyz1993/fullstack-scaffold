import type { WSServer, WSClient } from './types';

interface CFClient {
  id: string;
  ws: WebSocket;
}

export class NotificationDurableObject {
  private clients: Map<string, CFClient> = new Map();

  constructor(_state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws' || url.pathname === '/api/ws') {
      return this.handleWebSocket();
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request);
    }

    if (url.pathname === '/send' && request.method === 'POST') {
      return this.handleSend(request);
    }

    if (url.pathname === '/size') {
      return Response.json({ size: this.clients.size });
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocket(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    server.accept();

    const clientId = crypto.randomUUID();

    this.clients.set(clientId, { id: clientId, ws: server });

    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handleMessage(clientId, data);
      } catch {
        // Ignore invalid messages
      }
    });

    server.addEventListener('close', () => {
      this.clients.delete(clientId);
    });

    server.send(JSON.stringify({
      type: 'connected',
      payload: { clientId, timestamp: Date.now() },
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleMessage(clientId: string, data: unknown): void {
    if (typeof data === 'object' && data !== null && 'type' in data) {
      const msg = data as { type: string; payload?: unknown };
      
      switch (msg.type) {
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;
        case 'broadcast':
          this.broadcast(msg.payload, [clientId]);
          break;
      }
    }
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const body = await request.json() as { data: unknown; exclude?: string[] };
    this.broadcast(body.data, body.exclude);
    return Response.json({ success: true, recipients: this.clients.size });
  }

  private async handleSend(request: Request): Promise<Response> {
    const body = await request.json() as { clientId: string; data: unknown };
    const success = this.sendToClient(body.clientId, body.data);
    return Response.json({ success });
  }

  broadcast(data: unknown, exclude: string[] = []): void {
    const message = JSON.stringify(data);
    for (const [id, client] of this.clients) {
      if (!exclude.includes(id)) {
        try {
          client.ws.send(message);
        } catch {
          this.clients.delete(id);
        }
      }
    }
  }

  sendToClient(clientId: string, data: unknown): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.ws.send(JSON.stringify(data));
        return true;
      } catch {
        this.clients.delete(clientId);
      }
    }
    return false;
  }

  get size(): number {
    return this.clients.size;
  }
}

export interface CloudflareWSEnv {
  NOTIFICATION_DO: DurableObjectNamespace;
}

export class CloudflareWSServer implements WSServer {
  private env: CloudflareWSEnv;

  constructor(env: CloudflareWSEnv) {
    this.env = env;
  }

  private getStub(): DurableObjectStub {
    const id = this.env.NOTIFICATION_DO.idFromName('global');
    return this.env.NOTIFICATION_DO.get(id);
  }

  get clients(): Map<string, WSClient> {
    return new Map();
  }

  get size(): number {
    return 0;
  }

  broadcast(data: unknown, exclude: string[] = []): void {
    const stub = this.getStub();
    stub.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({ data, exclude }),
    }));
  }

  send(clientId: string, data: unknown): boolean {
    const stub = this.getStub();
    stub.fetch(new Request('https://internal/send', {
      method: 'POST',
      body: JSON.stringify({ clientId, data }),
    }));
    return true;
  }

  close(_clientId: string): void {
    // Not implemented for Cloudflare
  }
}

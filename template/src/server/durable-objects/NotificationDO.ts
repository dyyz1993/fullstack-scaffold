import { createRealtimeCore, type RealtimeCore } from '../services/realtime/core';

export class NotificationDurableObject {
  private core: RealtimeCore;

  constructor(_state: DurableObjectState) {
    this.core = createRealtimeCore();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket 连接
    if (url.pathname === '/ws' || url.pathname === '/api/ws') {
      return this.handleWebSocket();
    }

    // SSE 连接
    if (url.pathname === '/sse' || url.pathname === '/api/notifications/stream' || url.pathname === '/notifications/stream') {
      return this.handleSSE();
    }

    // 广播消息
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request);
    }

    // 发送给特定客户端
    if (url.pathname === '/send' && request.method === 'POST') {
      return this.handleSend(request);
    }

    // 获取连接数
    if (url.pathname === '/size') {
      return Response.json({ 
        wsClients: this.core.wsClients.size, 
        sseClients: this.core.sseClients.size 
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocket(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    server.accept();
    const clientId = crypto.randomUUID();
    
    // 注册到共享核心
    this.core.wsClients.set(clientId, {
      id: clientId,
      send: (data) => server.send(JSON.stringify(data)),
      close: () => server.close(),
    });

    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        this.core.handleWSMessage(clientId, data);
      } catch {
        // Ignore invalid messages
      }
    });

    server.addEventListener('close', () => {
      this.core.wsClients.delete(clientId);
    });

    server.send(JSON.stringify({
      type: 'connected',
      payload: { timestamp: Date.now() },
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleSSE(): Promise<Response> {
    const clientId = crypto.randomUUID();
    
    const stream = new ReadableStream({
      start: (controller) => {
        // 注册到共享核心
        this.core.sseClients.set(clientId, {
          id: clientId,
          send: (msg: string) => {
            try {
              controller.enqueue(new TextEncoder().encode(msg));
            } catch {
              this.core.sseClients.delete(clientId);
            }
          },
        });

        // 发送连接事件
        const connectMsg = `event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
        controller.enqueue(new TextEncoder().encode(connectMsg));
      },
      cancel: () => {
        this.core.sseClients.delete(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const body = await request.json() as { event?: string; data: unknown; exclude?: string[] };
    const event = body.event || 'notification';
    this.core.broadcast(body.data, body.exclude || [], event);
    return Response.json({ 
      success: true, 
      wsRecipients: this.core.wsClients.size, 
      sseRecipients: this.core.sseClients.size 
    });
  }

  private async handleSend(request: Request): Promise<Response> {
    const body = await request.json() as { clientId: string; data: unknown };
    const client = this.core.wsClients.get(body.clientId) || this.core.sseClients.get(body.clientId);
    
    if (client) {
      try {
        client.send(body.data as string);
        return Response.json({ success: true });
      } catch {
        return Response.json({ success: false, error: 'Failed to send' });
      }
    }
    
    return Response.json({ success: false, error: 'Client not found' });
  }
}

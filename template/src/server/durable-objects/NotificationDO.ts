export class NotificationDurableObject {
  private wsClients: Map<string, WebSocket> = new Map();
  private sseClients: Map<string, { send: (msg: string) => void }> = new Map();

  constructor(_state: DurableObjectState) {}

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
        wsClients: this.wsClients.size, 
        sseClients: this.sseClients.size 
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  // WebSocket 处理
  private async handleWebSocket(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    server.accept();
    const clientId = crypto.randomUUID();
    this.wsClients.set(clientId, server);

    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handleMessage(clientId, data);
      } catch {
        // Ignore invalid messages
      }
    });

    server.addEventListener('close', () => {
      this.wsClients.delete(clientId);
    });

    server.send(JSON.stringify({
      type: 'connected',
      payload: { timestamp: Date.now() },
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  // SSE 处理
  private async handleSSE(): Promise<Response> {
    const clientId = crypto.randomUUID();
    
    const stream = new ReadableStream({
      start: (controller) => {
        // 注册 SSE 客户端
        this.sseClients.set(clientId, {
          send: (msg: string) => {
            try {
              controller.enqueue(new TextEncoder().encode(msg));
            } catch {
              this.sseClients.delete(clientId);
            }
          },
        });

        // 发送连接事件
        const connectMsg = `event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
        controller.enqueue(new TextEncoder().encode(connectMsg));
      },
      cancel: () => {
        this.sseClients.delete(clientId);
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

  // 处理客户端消息 - 支持 RPC 和事件两种模式
  private handleMessage(clientId: string, data: unknown): void {
    // RPC 模式: { id, method, params }
    if (typeof data === 'object' && data !== null && 'method' in data && 'id' in data) {
      const rpc = data as { id: string; method: string; params: unknown };
      this.handleRpc(clientId, rpc);
      return;
    }

    // 事件模式: { type, payload }
    if (typeof data === 'object' && data !== null && 'type' in data) {
      const msg = data as { type: string; payload?: unknown };
      this.handleEvent(clientId, msg);
    }
  }

  // 处理 RPC 请求
  private handleRpc(clientId: string, rpc: { id: string; method: string; params: unknown }): void {
    const client = this.wsClients.get(clientId);
    if (!client) return;

    switch (rpc.method) {
      case 'echo': {
        const params = rpc.params as { message: string };
        client.send(JSON.stringify({
          id: rpc.id,
          result: { message: params.message, timestamp: Date.now() },
        }));
        break;
      }
      case 'ping': {
        client.send(JSON.stringify({
          id: rpc.id,
          result: { pong: true, timestamp: Date.now() },
        }));
        break;
      }
      default:
        client.send(JSON.stringify({
          id: rpc.id,
          error: `Unknown method: ${rpc.method}`,
        }));
    }
  }

  // 处理事件消息
  private handleEvent(clientId: string, msg: { type: string; payload?: unknown }): void {
    switch (msg.type) {
      case 'broadcast':
        this.broadcast(msg.payload, [clientId]);
        break;
    }
  }

  // 广播处理
  private async handleBroadcast(request: Request): Promise<Response> {
    const body = await request.json() as { event?: string; data: unknown; exclude?: string[] };
    const event = body.event || 'notification';
    this.broadcast(body.data, body.exclude, event);
    return Response.json({ 
      success: true, 
      wsRecipients: this.wsClients.size, 
      sseRecipients: this.sseClients.size 
    });
  }

  // 发送给特定客户端
  private async handleSend(request: Request): Promise<Response> {
    const body = await request.json() as { clientId: string; data: unknown; type?: 'ws' | 'sse' };
    let success = false;
    
    if (body.type === 'sse' || !body.type) {
      success = this.sendToSSEClient(body.clientId, body.data);
    } else {
      success = this.sendToWSClient(body.clientId, body.data);
    }
    
    return Response.json({ success });
  }

  // 广播消息
  broadcast(data: unknown, exclude: string[] = [], event: string = 'notification'): void {
    const message = JSON.stringify(data);
    const sseMessage = `event: ${event}\ndata: ${message}\n\n`;

    // 广播给 WebSocket 客户端
    for (const [id, ws] of this.wsClients) {
      if (!exclude.includes(id)) {
        try {
          ws.send(JSON.stringify({ type: event, payload: data }));
        } catch {
          this.wsClients.delete(id);
        }
      }
    }

    // 广播给 SSE 客户端
    for (const [id, client] of this.sseClients) {
      if (!exclude.includes(id)) {
        try {
          client.send(sseMessage);
        } catch {
          this.sseClients.delete(id);
        }
      }
    }
  }

  // 发送给 WebSocket 客户端
  private sendToWSClient(clientId: string, data: unknown): boolean {
    const client = this.wsClients.get(clientId);
    if (client) {
      try {
        client.send(JSON.stringify(data));
        return true;
      } catch {
        this.wsClients.delete(clientId);
      }
    }
    return false;
  }

  // 发送给 SSE 客户端
  private sendToSSEClient(clientId: string, data: unknown): boolean {
    const client = this.sseClients.get(clientId);
    if (client) {
      try {
        const message = `event: notification\ndata: ${JSON.stringify(data)}\n\n`;
        client.send(message);
        return true;
      } catch {
        this.sseClients.delete(clientId);
      }
    }
    return false;
  }

  get size(): { ws: number; sse: number } {
    return { ws: this.wsClients.size, sse: this.sseClients.size };
  }
}

export interface WSClient {
  id: string;
  send: (data: unknown) => void;
  close: () => void;
}

export interface SSEClient {
  id: string;
  send: (data: string) => void;
}

export interface WSMessageHandlers {
  onEcho?: (message: string) => { message: string; timestamp: number };
  onPing?: () => { pong: boolean; timestamp: number };
  onBroadcast?: (payload: unknown, exclude: string[]) => void;
}

export function createWSMessageHandler(
  broadcastFn: (data: unknown, exclude: string[], event: string) => void
) {
  return {
    handleMessage(
      clientId: string,
      data: unknown,
      send: (response: unknown) => void
    ): void {
      // RPC 模式: { id, method, params }
      if (typeof data === 'object' && data !== null && 'method' in data && 'id' in data) {
        const rpc = data as { id: string; method: string; params: unknown };
        const response = this.handleRpc(rpc);
        send(response);
        return;
      }

      // 事件模式: { type, payload }
      if (typeof data === 'object' && data !== null && 'type' in data) {
        const msg = data as { type: string; payload?: unknown };
        this.handleEvent(clientId, msg);
      }
    },

    handleRpc(rpc: { id: string; method: string; params: unknown }): unknown {
      switch (rpc.method) {
        case 'echo': {
          const params = rpc.params as { message: string };
          return {
            id: rpc.id,
            result: { message: params.message, timestamp: Date.now() },
          };
        }
        case 'ping': {
          return {
            id: rpc.id,
            result: { pong: true, timestamp: Date.now() },
          };
        }
        default:
          return {
            id: rpc.id,
            error: `Unknown method: ${rpc.method}`,
          };
      }
    },

    handleEvent(clientId: string, msg: { type: string; payload?: unknown }): void {
      switch (msg.type) {
        case 'broadcast':
          broadcastFn(msg.payload, [clientId], 'broadcast');
          break;
      }
    },
  };
}

export type RealtimeBroadcastFn = (data: unknown, exclude: string[], event: string) => void;

export interface RealtimeCore {
  wsClients: Map<string, WSClient>;
  sseClients: Map<string, SSEClient>;
  broadcast: RealtimeBroadcastFn;
  handleWSMessage: (clientId: string, data: unknown) => void;
  handleSSEMessage: (clientId: string, data: string) => void;
}

export function createRealtimeCore(): RealtimeCore {
  const wsClients = new Map<string, WSClient>();
  const sseClients = new Map<string, SSEClient>();

  const broadcast: RealtimeBroadcastFn = (data: unknown, exclude: string[] = [], event: string = 'notification') => {
    const message = JSON.stringify(data);
    const sseMessage = `event: ${event}\ndata: ${message}\n\n`;

    // 广播给 WebSocket 客户端
    for (const [id, client] of wsClients) {
      if (!exclude.includes(id)) {
        try {
          client.send({ type: event, payload: data });
        } catch {
          wsClients.delete(id);
        }
      }
    }

    // 广播给 SSE 客户端
    for (const [id, client] of sseClients) {
      if (!exclude.includes(id)) {
        try {
          client.send(sseMessage);
        } catch {
          sseClients.delete(id);
        }
      }
    }
  };

  const handleWSMessage = (clientId: string, data: unknown): void => {
    const client = wsClients.get(clientId);
    if (!client) return;

    // RPC 模式
    if (typeof data === 'object' && data !== null && 'method' in data && 'id' in data) {
      const rpc = data as { id: string; method: string; params: unknown };
      
      let result: unknown;
      switch (rpc.method) {
        case 'echo': {
          const params = rpc.params as { message: string };
          result = { message: params.message, timestamp: Date.now() };
          break;
        }
        case 'ping': {
          result = { pong: true, timestamp: Date.now() };
          break;
        }
        default:
          client.send({ id: rpc.id, error: `Unknown method: ${rpc.method}` });
          return;
      }
      
      client.send({ id: rpc.id, result });
      return;
    }

    // 事件模式
    if (typeof data === 'object' && data !== null && 'type' in data) {
      const msg = data as { type: string; payload?: unknown };
      
      switch (msg.type) {
        case 'broadcast':
          broadcast(msg.payload, [clientId], 'broadcast');
          break;
      }
    }
  };

  const handleSSEMessage = (clientId: string, data: string): void => {
    // SSE 通常是单向的，但也可以支持
    try {
      const parsed = JSON.parse(data);
      handleWSMessage(clientId, parsed);
    } catch {
      // Ignore invalid messages
    }
  };

  return {
    wsClients,
    sseClients,
    broadcast,
    handleWSMessage,
    handleSSEMessage,
  };
}

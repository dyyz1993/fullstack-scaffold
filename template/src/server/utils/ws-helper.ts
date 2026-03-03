import type { Context } from 'hono';

declare global {
  var isCloudflare: boolean | undefined;
}

export const isCloudflare = typeof globalThis !== 'undefined' && 
  (globalThis.isCloudflare === true || 'WebSocketPair' in globalThis);

export function createCloudflareWSHandler(
  onMessage: (data: string, send: (msg: string) => void, close: () => void) => void,
  _onOpen?: () => void,
  onClose?: () => void
) {
  return async (c: Context) => {
    const WebSocketPair = (globalThis as any).WebSocketPair;
    
    if (!WebSocketPair) {
      return c.json({ error: 'WebSocket not supported' }, 500);
    }

    const pair = new WebSocketPair();
    const [client, server] = pair;

    server.accept();

    const send = (msg: string) => server.send(msg);
    const close = () => server.close();

    server.addEventListener('message', (event: MessageEvent) => {
      onMessage(event.data as string, send, close);
    });

    if (onClose) {
      server.addEventListener('close', onClose);
    }

    send(JSON.stringify({
      type: 'connected',
      payload: { timestamp: Date.now() },
    }));

    return new Response(null, { 
      status: 101, 
      webSocket: client 
    } as any);
  };
}

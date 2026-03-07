import type { AppNotification } from '@shared/schemas';
import { isCloudflare } from '../../../utils/env';

export interface BroadcastMessage {
  event: string;
  data: unknown;
}

export interface RealtimeService {
  broadcast(event: string, data: unknown): Promise<void>;
  broadcastNotification(notification: AppNotification): Promise<void>;
}

let _env: { NOTIFICATION_DO?: DurableObjectNamespace } | null = null;
let _realtimeService: RealtimeService | null = null;

export function setRealtimeEnv(env: { NOTIFICATION_DO?: DurableObjectNamespace }): void {
  _env = env;
  _realtimeService = null;
}

function createRealtimeService(): RealtimeService {
  if (isCloudflare && _env?.NOTIFICATION_DO) {
    return {
      async broadcast(event: string, data: unknown): Promise<void> {
        const id = _env!.NOTIFICATION_DO!.idFromName('global');
        const stub = _env!.NOTIFICATION_DO!.get(id);
        await stub.fetch(new Request('https://internal/broadcast', {
          method: 'POST',
          body: JSON.stringify({ event, data }),
        }));
      },
      async broadcastNotification(notification: AppNotification): Promise<void> {
        await this.broadcast('notification', notification);
      },
    };
  }

  return {
    async broadcast(event: string, data: unknown): Promise<void> {
      const { getNodeWSServer } = await import('./node-ws');
      const wss = getNodeWSServer();
      wss.broadcast(data, [], event);
    },
    async broadcastNotification(notification: AppNotification): Promise<void> {
      await this.broadcast('notification', notification);
    },
  };
}

function getRealtimeService(): RealtimeService {
  if (!_realtimeService) {
    _realtimeService = createRealtimeService();
  }
  return _realtimeService;
}

export const realtime: RealtimeService = new Proxy({} as RealtimeService, {
  get(_target, prop) {
    const service = getRealtimeService();
    return Reflect.get(service, prop, service);
  },
});

export { getRealtimeService };

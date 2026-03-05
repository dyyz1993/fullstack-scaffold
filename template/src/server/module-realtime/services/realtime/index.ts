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

let _realtimeService: RealtimeService | null = null;

export function initRealtimeService(env?: { NOTIFICATION_DO?: DurableObjectNamespace }): RealtimeService {
  if (_realtimeService) return _realtimeService;

  if (isCloudflare && env?.NOTIFICATION_DO) {
    _realtimeService = {
      async broadcast(event: string, data: unknown): Promise<void> {
        const id = env.NOTIFICATION_DO!.idFromName('global');
        const stub = env.NOTIFICATION_DO!.get(id);
        await stub.fetch(new Request('https://internal/broadcast', {
          method: 'POST',
          body: JSON.stringify({ event, data }),
        }));
      },
      async broadcastNotification(notification: AppNotification): Promise<void> {
        await this.broadcast('notification', notification);
      },
    };
  } else {
    _realtimeService = {
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

  return _realtimeService;
}

export function getRealtimeService(): RealtimeService {
  if (!_realtimeService) {
    return initRealtimeService();
  }
  return _realtimeService;
}

export const realtime: RealtimeService = new Proxy({} as RealtimeService, {
  get(_target, prop) {
    const service = getRealtimeService();
    return Reflect.get(service, prop, service);
  },
});

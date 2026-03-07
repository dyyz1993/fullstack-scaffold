import { isCloudflare } from '../utils/env'
import { getNodeWSServer } from './node-ws'

export interface BroadcastMessage {
  event: string
  data: unknown
}

export interface RealtimeService {
  broadcast(event: string, data: unknown): Promise<void>
}

let _env: { NOTIFICATION_DO?: DurableObjectNamespace } | null = null
let _realtimeService: RealtimeService | null = null

export function setRealtimeEnv(env: { NOTIFICATION_DO?: DurableObjectNamespace }): void {
  _env = env
  _realtimeService = null
}

function createRealtimeService(): RealtimeService {
  if (isCloudflare && _env?.NOTIFICATION_DO) {
    return {
      async broadcast(event: string, data: unknown): Promise<void> {
        const id = _env!.NOTIFICATION_DO!.idFromName('global')
        const stub = _env!.NOTIFICATION_DO!.get(id)
        await stub.fetch(
          new Request('https://internal/broadcast', {
            method: 'POST',
            body: JSON.stringify({ event, data }),
          })
        )
      },
    }
  }

  return {
    async broadcast(event: string, data: unknown): Promise<void> {
      const wss = getNodeWSServer()
      wss.broadcast(data, [], event)
    },
  }
}

export function getRealtimeService(): RealtimeService {
  if (!_realtimeService) {
    _realtimeService = createRealtimeService()
  }
  return _realtimeService
}

export const realtime: RealtimeService = new Proxy({} as RealtimeService, {
  get(_target, prop) {
    const service = getRealtimeService()
    return Reflect.get(service, prop, service)
  },
})

export { getNodeWSServer } from './node-ws'
export { handleSSERequest, handleWSRequest } from './handlers'
export { NotificationDurableObject } from './durable-objects/NotificationDO'
export type { WSClient, SSEClient, RealtimeCore } from './realtime-core'
export { createRealtimeCore, createWSMessageHandler } from './realtime-core'

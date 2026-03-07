import { WSClient } from '@client/services/wsClient'
import type { AppWSProtocol } from '@shared/schemas'

export function createTestWSClient(url: string): WSClient<AppWSProtocol> {
  return new WSClient<AppWSProtocol>(() => new WebSocket(url))
}

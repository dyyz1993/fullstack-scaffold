import type { WSClient, WSProtocol } from '@shared/schemas'
import { WSClientImpl } from '@client/services/wsClient'

export function createWSClient<P extends WSProtocol>(url: string | URL): WSClient<P> {
  return new WSClientImpl<P>(url) as unknown as WSClient<P>
}

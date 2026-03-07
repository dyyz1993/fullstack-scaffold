import { createRealtimeCore, type RealtimeCore } from '../realtime-core'
import { getCloudflareRuntimeAdapter } from '../runtime-cloudflare'

export class NotificationDurableObject {
  private core: RealtimeCore

  constructor(_state: DurableObjectState) {
    this.core = createRealtimeCore()
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const adapter = getCloudflareRuntimeAdapter()

    if (adapter.hasWSPath(url.pathname) && request.headers.get('Upgrade') === 'websocket') {
      return adapter.handleWebSocketRequest(request)
    }

    if (
      adapter.hasSSEPath(url.pathname) &&
      request.headers.get('Accept')?.includes('text/event-stream')
    ) {
      return adapter.handleSSERequest()
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request)
    }

    if (url.pathname === '/send' && request.method === 'POST') {
      return this.handleSend(request)
    }

    if (url.pathname === '/size') {
      return Response.json({
        wsClients: this.core.wsClients.size,
        sseClients: this.core.sseClients.size,
      })
    }

    return new Response('Not Found', { status: 404 })
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const body = (await request.json()) as { event?: string; data: unknown; exclude?: string[] }
    const event = body.event || 'notification'
    this.core.broadcast(body.data, body.exclude || [], event)
    return Response.json({
      success: true,
      wsRecipients: this.core.wsClients.size,
      sseRecipients: this.core.sseClients.size,
    })
  }

  private async handleSend(request: Request): Promise<Response> {
    const body = (await request.json()) as { clientId: string; data: unknown }
    const client = this.core.wsClients.get(body.clientId) || this.core.sseClients.get(body.clientId)

    if (client) {
      try {
        client.send(body.data as string)
        return Response.json({ success: true })
      } catch {
        return Response.json({ success: false, error: 'Failed to send' })
      }
    }

    return Response.json({ success: false, error: 'Client not found' })
  }
}

export { NotificationDurableObject as NotificationDurableObjectClass }

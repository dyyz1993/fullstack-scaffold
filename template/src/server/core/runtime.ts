export interface RuntimePlatform {
  name: 'node' | 'cloudflare'
  isCloudflare: boolean
  isNode: boolean
}

export interface WSConnection {
  id: string
  send(data: unknown): void
  close(): void
}

export interface SSEConnection {
  id: string
  send: (data: string) => void
}

export interface RuntimeAdapter {
  platform: RuntimePlatform

  handleWS(path: string): void
  getWSConnections(): Map<string, WSConnection>
  broadcast(event: string, data: unknown, exclude?: string[]): void

  handleSSE(path: string): void
  getSSEConnections(): Map<string, SSEConnection>

  registerRPC(method: string, handler: (params: unknown, clientId: string) => unknown): void
  registerEvent(type: string, handler: (payload: unknown, clientId: string) => void): void

  onUpgrade?(req: Request, socket: unknown, head: unknown): boolean
}

let _adapter: RuntimeAdapter | null = null

export function setRuntimeAdapter(adapter: RuntimeAdapter): void {
  _adapter = adapter
}

export function getRuntimeAdapter(): RuntimeAdapter {
  if (!_adapter) {
    throw new Error('Runtime adapter not initialized. Call setRuntimeAdapter() first.')
  }
  return _adapter
}

export const runtime = {
  get adapter(): RuntimeAdapter {
    return getRuntimeAdapter()
  },

  handleWS(path: string): void {
    this.adapter.handleWS(path)
  },

  handleSSE(path: string): void {
    this.adapter.handleSSE(path)
  },

  broadcast(event: string, data: unknown, exclude?: string[]): void {
    this.adapter.broadcast(event, data, exclude || [])
  },

  registerRPC(method: string, handler: (params: unknown, clientId: string) => unknown): void {
    this.adapter.registerRPC(method, handler)
  },

  registerEvent(type: string, handler: (payload: unknown, clientId: string) => void): void {
    this.adapter.registerEvent(type, handler)
  },

  get platform(): RuntimePlatform {
    return this.adapter.platform
  },
}

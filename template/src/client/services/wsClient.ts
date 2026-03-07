export type WSStatus = 'connecting' | 'open' | 'closed' | 'reconnecting'

type PendingRequest = {
  resolve: (val: unknown) => void
  reject: (err: unknown) => void
  timer: ReturnType<typeof setTimeout>
}

export interface WSProtocol {
  rpc: Record<string, { in: unknown; out: unknown }>
  events: Record<string, unknown>
}

interface WSMessageBase {
  id?: string
  method?: string
  type?: string
  payload?: unknown
  result?: unknown
  error?: string
}

export class WSClient<P extends WSProtocol> {
  private socket: WebSocket | null = null
  private handlers = new Map<string, ((payload: unknown) => void)[]>()
  private pendingRequests = new Map<string, PendingRequest>()
  private statusHandlers: ((status: WSStatus) => void)[] = []
  private messageBuffer: string[] = []
  private _status: WSStatus = 'closed'

  constructor(private createSocket: () => WebSocket) {
    this.connect()
  }

  public get status() {
    return this._status
  }

  public getSocket() {
    return this.socket
  }

  private connect() {
    this._status = 'connecting'
    try {
      this.socket = this.createSocket()
      this.socket.onopen = () => this.handleOpen()
      this.socket.onmessage = msg => this.handleMessage(msg)
      this.socket.onclose = () => this.handleClose()
      this.socket.onerror = () => this.updateStatus('closed')
    } catch {
      this.handleClose()
    }
  }

  private handleOpen() {
    this.updateStatus('open')
    while (this.messageBuffer.length > 0) {
      const msg = this.messageBuffer.shift()
      if (msg) this.socket?.send(msg)
    }
  }

  private handleClose() {
    this.updateStatus('closed')
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data: WSMessageBase = JSON.parse(event.data)

      if ('id' in data && !('method' in data)) {
        const pending = this.pendingRequests.get(data.id!)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingRequests.delete(data.id!)
          if (data.error) pending.reject(new Error(data.error))
          else pending.resolve(data.result)
        }
      } else if ('type' in data) {
        const callbacks = this.handlers.get(data.type!)
        callbacks?.forEach(cb => cb(data.payload))
      }
    } catch (e) {
      console.error('Failed to parse WS message', e)
    }
  }

  private updateStatus(status: WSStatus) {
    this._status = status
    this.statusHandlers.forEach(h => h(status))
  }

  async call<K extends keyof P['rpc']>(
    method: K,
    params: P['rpc'][K] extends { in: infer I } ? I : never,
    timeout = 10000
  ): Promise<P['rpc'][K] extends { out: infer O } ? O : never> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2)
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`RPC Timeout: ${String(method)}`))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (val: unknown) => void,
        reject,
        timer,
      })

      this.sendRaw({ id, method, params })
    })
  }

  emit<K extends keyof P['events']>(type: K, payload: P['events'][K]) {
    this.sendRaw({ type, payload })
  }

  on<K extends keyof P['events']>(type: K, handler: (payload: P['events'][K]) => void) {
    const list = this.handlers.get(type as string) || []
    list.push(handler as (payload: unknown) => void)
    this.handlers.set(type as string, list)
    return () => {
      const filtered = (this.handlers.get(type as string) || []).filter(h => h !== handler)
      this.handlers.set(type as string, filtered)
    }
  }

  onStatusChange(handler: (status: WSStatus) => void) {
    this.statusHandlers.push(handler)
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler)
    }
  }

  close() {
    if (this.socket) {
      this.socket.onclose = null
      this.socket.close()
    }
  }

  private sendRaw(data: unknown) {
    const msg = JSON.stringify(data)
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(msg)
    } else {
      this.messageBuffer.push(msg)
    }
  }
}

interface SSEProtocol {
  events: Record<string, unknown>
}

interface SSEClient<P extends SSEProtocol = SSEProtocol> {
  readonly status: 'connecting' | 'open' | 'closed'
  on<K extends keyof P['events']>(type: K, handler: (payload: P['events'][K]) => void): () => void
  onStatusChange(handler: (status: 'connecting' | 'open' | 'closed') => void): () => void
  onError(handler: (error: Error) => void): () => void
  abort(): void
}

export class SSEClientImpl<P extends SSEProtocol = SSEProtocol> implements SSEClient<P> {
  private eventSource: EventSource | null = null
  private handlers = new Map<string, ((payload: unknown) => void)[]>()
  private statusHandlers: ((status: 'connecting' | 'open' | 'closed') => void)[] = []
  private errorHandlers: ((error: Error) => void)[] = []
  private _status: 'connecting' | 'open' | 'closed' = 'connecting'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private url: string | URL

  constructor(url: string | URL) {
    this.url = url
    this.connect(url)
  }

  get status() {
    return this._status
  }

  private connect(url: string | URL) {
    this._status = 'connecting'

    try {
      this.eventSource = new EventSource(url.toString())

      this.eventSource.onopen = () => {
        this._status = 'open'
        this.reconnectAttempts = 0
        this.statusHandlers.forEach(h => h('open'))
      }

      this.eventSource.onerror = () => {
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this._status = 'closed'
          this.statusHandlers.forEach(h => h('closed'))
        } else {
          const error = new Error('SSE connection error')
          this.errorHandlers.forEach(h => h(error))
          this.attemptReconnect()
        }
      }

      this.eventSource.onmessage = event => {
        this.handleMessage('message', event.data)
      }
    } catch (error) {
      this._status = 'closed'
      this.errorHandlers.forEach(h => h(error as Error))
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect(this.url)
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      this._status = 'closed'
      this.statusHandlers.forEach(h => h('closed'))
    }
  }

  private handleMessage(eventType: string, data: string) {
    try {
      const parsed = JSON.parse(data)
      const handlers = this.handlers.get(eventType)
      handlers?.forEach(h => h(parsed))
    } catch {
      const handlers = this.handlers.get(eventType)
      handlers?.forEach(h => h(data))
    }
  }

  on<K extends keyof P['events']>(type: K, handler: (payload: P['events'][K]) => void): () => void {
    const eventName = type as string

    if (this.eventSource && eventName !== 'message') {
      this.eventSource.addEventListener(eventName, (event: MessageEvent) => {
        this.handleMessage(eventName, event.data)
      })
    }

    const list = this.handlers.get(eventName) || []
    list.push(handler as (payload: unknown) => void)
    this.handlers.set(eventName, list)

    return () => {
      const filtered = (this.handlers.get(eventName) || []).filter(h => h !== handler)
      this.handlers.set(eventName, filtered)
    }
  }

  onStatusChange(handler: (status: 'connecting' | 'open' | 'closed') => void): () => void {
    this.statusHandlers.push(handler)
    handler(this._status)
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler)
    }
  }

  onError(handler: (error: Error) => void): () => void {
    this.errorHandlers.push(handler)
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler)
    }
  }

  abort(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this._status = 'closed'
    this.statusHandlers.forEach(h => h('closed'))
  }
}

export function createSSEClient<P extends SSEProtocol>(url: string | URL): SSEClient<P> {
  return new SSEClientImpl<P>(url) as unknown as SSEClient<P>
}

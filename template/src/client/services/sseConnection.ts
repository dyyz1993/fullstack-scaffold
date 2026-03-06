import type { ClientResponse } from 'hono/client'
import type { SSEEvent, AppNotification } from '@shared/schemas'

export interface SSEConnectionOptions {
  onMessage?: (data: SSEEvent) => void
  onNotification?: (notification: AppNotification) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
  retryDelay?: number
  autoReconnect?: boolean
}

function isNotificationData(data: SSEEvent['data']): data is AppNotification {
  return 'id' in data && 'type' in data && 'title' in data
}

export class SSEConnection {
  private abortController: AbortController | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isManualDisconnect = false
  private isConnected = false

  constructor(
    private streamFactory: (signal: AbortSignal) => Promise<ClientResponse<SSEEvent>>,
    private options: SSEConnectionOptions = {}
  ) {}

  get connected() {
    return this.isConnected
  }

  connect = async () => {
    if (this.abortController) return

    this.isManualDisconnect = false
    this.abortController = new AbortController()

    try {
      const responsePromise = this.streamFactory(this.abortController.signal)
      const res = (await responsePromise) as unknown as Response

      if (!res.ok || !res.body) {
        throw new Error(`SSE connection failed: ${res.status} ${res.statusText}`)
      }

      this.isConnected = true
      this.options.onConnect?.()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!this.isManualDisconnect) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data) as SSEEvent
              if (!this.isManualDisconnect) {
                this.options.onMessage?.(parsed)
                if (parsed.event === 'notification' && isNotificationData(parsed.data)) {
                  this.options.onNotification?.(parsed.data)
                }
              }
            } catch {
              console.error('Failed to parse SSE line', data)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      this.options.onError?.(error instanceof Error ? error : new Error(String(error)))
      this.isConnected = false

      if (this.options.autoReconnect !== false && !this.isManualDisconnect) {
        this.reconnectTimeout = setTimeout(() => {
          this.abortController = null
          this.connect()
        }, this.options.retryDelay || 5000)
      }
    } finally {
      if (!this.isManualDisconnect) {
        this.abortController = null
        this.isConnected = false
        this.options.onDisconnect?.()
      }
    }
  }

  disconnect = () => {
    this.isManualDisconnect = true

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    this.isConnected = false
    this.options.onDisconnect?.()
  }
}

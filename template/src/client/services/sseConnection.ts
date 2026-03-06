import { consumeStream } from '@client/services/apiClient'
import type { ClientResponse } from 'hono/client'

export interface SSEConnectionOptions<T> {
  onMessage?: (data: T) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
  retryDelay?: number
  autoReconnect?: boolean
}

export class SSEConnection<T> {
  private abortController: AbortController | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isManualDisconnect = false
  private isConnected = false

  constructor(
    private streamFactory: (signal: AbortSignal) => Promise<ClientResponse<T>>,
    private options: SSEConnectionOptions<T> = {}
  ) {}

  get connected() {
    return this.isConnected
  }

  connect = async () => {
    if (this.abortController) return

    this.isManualDisconnect = false
    this.abortController = new AbortController()
    this.isConnected = true
    this.options.onConnect?.()

    try {
      const responsePromise = this.streamFactory(this.abortController.signal)

      for await (const data of consumeStream(responsePromise)) {
        if (this.isManualDisconnect) break
        this.options.onMessage?.(data)
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

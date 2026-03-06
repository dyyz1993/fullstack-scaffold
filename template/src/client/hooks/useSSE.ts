import { useCallback, useEffect, useRef, useState } from 'react'
import { SSEConnection } from '@client/services/sseConnection'
import type { ClientResponse } from 'hono/client'
import type { SSEConnectionOptions } from '@client/services/sseConnection'

export type { SSEConnectionOptions } from '@client/services/sseConnection'

export interface SSEReturn {
  isConnected: boolean
  connect: () => void
  disconnect: () => void
}

export function useSSE<T>(
  streamFactory: (signal: AbortSignal) => Promise<ClientResponse<T>>,
  options: SSEConnectionOptions<T> = {}
): SSEReturn {
  const [isConnected, setIsConnected] = useState(false)
  const connectionRef = useRef<SSEConnection<T> | null>(null)

  const connect = useCallback(() => {
    if (connectionRef.current?.connected) return

    connectionRef.current = new SSEConnection(streamFactory, {
      ...options,
      onConnect: () => {
        setIsConnected(true)
        options.onConnect?.()
      },
      onDisconnect: () => {
        setIsConnected(false)
        options.onDisconnect?.()
      },
    })

    connectionRef.current.connect()
  }, [streamFactory, options])

  const disconnect = useCallback(() => {
    connectionRef.current?.disconnect()
    connectionRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    connect,
    disconnect,
  }
}

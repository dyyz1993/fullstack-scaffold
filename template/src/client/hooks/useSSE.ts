import { useCallback, useEffect, useRef, useState } from 'react'
import { SSEConnection } from '@client/services/sseConnection'
import type { SSEEvent } from '@shared/schemas'

type SSEStatus = 'connecting' | 'open' | 'closed'

interface UseSSEReturn {
  status: SSEStatus
  connect: () => Promise<void>
  disconnect: () => void
  onMessage: (handler: (data: SSEEvent) => void) => void
  onNotification: (handler: (notification: SSEEvent['data']) => void) => void
  client: SSEConnection | null
}

export function useSSE(route: {
  $get: (options?: { signal?: AbortSignal }) => Promise<Response>
}): UseSSEReturn {
  const [status, setStatus] = useState<SSEStatus>('closed')
  const clientRef = useRef<SSEConnection | null>(null)

  const connect = useCallback(async () => {
    if (clientRef.current) return

    setStatus('connecting')

    const client = new SSEConnection(
      async (signal: AbortSignal) => {
        const res = await route.$get({ signal })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return res as any
      },
      {
        onConnect: () => setStatus('open'),
        onDisconnect: () => setStatus('closed'),
        onError: () => setStatus('closed'),
      }
    )

    clientRef.current = client
    await client.connect()
  }, [route])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
      setStatus('closed')
    }
  }, [])

  const onMessage = useCallback((handler: (data: SSEEvent) => void) => {
    if (!clientRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalOptions = (clientRef.current as any).options || {}
    Object.assign(originalOptions, { onMessage: handler })
  }, [])

  const onNotification = useCallback((handler: (notification: SSEEvent['data']) => void) => {
    if (!clientRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalOptions = (clientRef.current as any).options || {}
    Object.assign(originalOptions, { onNotification: handler })
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    connect,
    disconnect,
    onMessage,
    onNotification,
    client: clientRef.current,
  }
}

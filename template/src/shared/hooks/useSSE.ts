import { useCallback, useEffect, useRef, useState } from 'react'
import type { SSEClient, SSEProtocol } from '@shared/schemas'
import { connectSSEClient } from '@shared/core'

type SSEStatus = 'connecting' | 'open' | 'closed'

interface UseSSEReturn<T extends SSEProtocol> {
  status: SSEStatus
  connect: () => Promise<void>
  disconnect: () => void
  client: SSEClient<T> | null
}

export function useSSE<T extends SSEProtocol, D = unknown>(
  route: (deps?: D) => Promise<SSEClient<T>>,
  deps?: D
): UseSSEReturn<T> {
  const [status, setStatus] = useState<SSEStatus>('closed')
  const [client, setClient] = useState<SSEClient<T> | null>(null)
  const clientRef = useRef<SSEClient<T> | null>(null)
  const isConnectingRef = useRef(false)
  const depsRef = useRef<D | undefined>(deps)
  const routeRef = useRef(route)

  // 关键修复：同步更新，确保 connect 被调用时 ref 已经是最新的值
  depsRef.current = deps
  routeRef.current = route

  const connect = useCallback(async () => {
    if (clientRef.current || isConnectingRef.current) return

    isConnectingRef.current = true
    setStatus('connecting')

    try {
      const newClient = await routeRef.current(depsRef.current)

      newClient.onStatusChange((newStatus: 'connecting' | 'open' | 'closed') => {
        setStatus(newStatus)
      })

      clientRef.current = newClient
      setClient(newClient)
      connectSSEClient(newClient)
    } catch (error) {
      console.error('Failed to connect SSE:', error)
      setStatus('closed')
    } finally {
      isConnectingRef.current = false
    }
  }, [])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.abort()
      clientRef.current = null
      setClient(null)
      setStatus('closed')
    }
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
    client,
  }
}

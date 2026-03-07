import { useCallback, useEffect, useRef, useState } from 'react'
import type { WSStatus } from '@client/services/wsClient'
import type { AppWSProtocol } from '@shared/schemas'
import { apiClient } from '@client/services/apiClient'

interface UseWebSocketReturn {
  status: WSStatus
  connect: () => void
  disconnect: () => void
  call: <K extends keyof AppWSProtocol['rpc']>(
    method: K,
    params: AppWSProtocol['rpc'][K] extends { in: infer I } ? I : never
  ) => Promise<AppWSProtocol['rpc'][K] extends { out: infer O } ? O : never>
  emit: <K extends keyof AppWSProtocol['events']>(
    type: K,
    payload: AppWSProtocol['events'][K]
  ) => void
  on: <K extends keyof AppWSProtocol['events']>(
    type: K,
    handler: (payload: AppWSProtocol['events'][K]) => void
  ) => () => void
}

export function useWebSocket(): UseWebSocketReturn {
  const [status, setStatus] = useState<WSStatus>('closed')
  const clientRef = useRef<Awaited<ReturnType<typeof apiClient.api.chat.ws.$ws>> | null>(null)

  const connect = useCallback(async () => {
    if (clientRef.current) return

    const client = await apiClient.api.chat.ws.$ws()
    clientRef.current = client

    client.onStatusChange(setStatus)
  }, [])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.close()
      clientRef.current = null
      setStatus('closed')
    }
  }, [])

  const call = useCallback(async (method: keyof AppWSProtocol['rpc'], params: unknown) => {
    if (!clientRef.current) throw new Error('WebSocket not connected')
    return clientRef.current.call(method, params as never)
  }, []) as UseWebSocketReturn['call']

  const emit = useCallback((type: keyof AppWSProtocol['events'], payload: unknown) => {
    clientRef.current?.emit(type, payload as never)
  }, []) as UseWebSocketReturn['emit']

  const on = useCallback(
    (type: keyof AppWSProtocol['events'], handler: (payload: unknown) => void) => {
      if (!clientRef.current) return () => {}
      return clientRef.current.on(type, handler as never)
    },
    []
  ) as UseWebSocketReturn['on']

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return { status, connect, disconnect, call, emit, on }
}

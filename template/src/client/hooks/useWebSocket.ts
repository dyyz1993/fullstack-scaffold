import { useCallback, useEffect, useRef, useState } from 'react'
import { WSClient, type WSStatus } from '@client/services/wsClient'
import type { AppWSProtocol } from '@shared/schemas'
import { apiClient, extendWSRoute } from '@client/services/apiClient'

interface UseWebSocketReturn<P extends AppWSProtocol> {
  status: WSStatus
  connect: () => void
  disconnect: () => void
  call: <K extends keyof P['rpc']>(
    method: K,
    params: P['rpc'][K] extends { in: infer I } ? I : never
  ) => Promise<P['rpc'][K] extends { out: infer O } ? O : never>
  emit: <K extends keyof P['events']>(type: K, payload: P['events'][K]) => void
  on: <K extends keyof P['events']>(
    type: K,
    handler: (payload: P['events'][K]) => void
  ) => () => void
}

export function useWebSocket(): UseWebSocketReturn<AppWSProtocol> {
  const [status, setStatus] = useState<WSStatus>('closed')
  const clientRef = useRef<WSClient<AppWSProtocol> | null>(null)

  const connect = useCallback(() => {
    if (clientRef.current) return

    const client = extendWSRoute(apiClient.api.chat.ws).$ws()
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

  const call = useCallback(async (method: string, params: unknown) => {
    if (!clientRef.current) throw new Error('WebSocket not connected')
    return clientRef.current.call(method as never, params as never)
  }, []) as UseWebSocketReturn<AppWSProtocol>['call']

  const emit = useCallback((type: string, payload: unknown) => {
    clientRef.current?.emit(type as never, payload as never)
  }, []) as UseWebSocketReturn<AppWSProtocol>['emit']

  const on = useCallback((type: string, handler: (payload: unknown) => void) => {
    if (!clientRef.current) return () => {}
    return clientRef.current.on(type as never, handler as never)
  }, []) as UseWebSocketReturn<AppWSProtocol>['on']

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return { status, connect, disconnect, call, emit, on }
}

import { runtime } from '@server/core/runtime'

export function initChatHandlers(): void {
  runtime.registerRPC('echo', (params: unknown) => {
    const { message } = params as { message: string }
    return { message, timestamp: Date.now() }
  })

  runtime.registerRPC('ping', () => {
    return { pong: true, timestamp: Date.now() }
  })

  runtime.registerEvent('broadcast', (payload: unknown, clientId: string) => {
    runtime.broadcast('broadcast', payload, [clientId])
  })
}

export function getConnectedClientsCount(): number {
  return runtime.adapter.getWSConnections().size
}

export function broadcastChatMessage(message: {
  id: string
  content: string
  sender: string
  timestamp: number
}): void {
  runtime.broadcast('chat:message', {
    type: 'chat:message',
    data: message,
  })
}

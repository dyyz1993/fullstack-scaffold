import { getNodeWSServer } from '@server/core'

export function initChatHandlers(): void {
  const wss = getNodeWSServer()

  wss.registerRPCHandler('echo', (params: unknown) => {
    const { message } = params as { message: string }
    return { message, timestamp: Date.now() }
  })

  wss.registerRPCHandler('ping', () => {
    return { pong: true, timestamp: Date.now() }
  })

  wss.registerEventHandler('broadcast', (payload, clientId, broadcast) => {
    broadcast(payload, [clientId], 'broadcast')
  })
}

export function getChatWSServer() {
  return getNodeWSServer()
}

export function getConnectedClientsCount(): number {
  const wss = getNodeWSServer()
  return wss.getConnectedClientsCount()
}

export function broadcastChatMessage(message: { 
  id: string
  content: string
  sender: string
  timestamp: number
}): void {
  const wss = getNodeWSServer()
  wss.broadcast({
    type: 'chat:message',
    data: message
  })
}

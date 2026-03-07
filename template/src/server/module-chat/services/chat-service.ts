import { getNodeWSServer } from '@server/core'

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

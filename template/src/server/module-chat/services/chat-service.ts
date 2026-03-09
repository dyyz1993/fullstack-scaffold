import { createTypedRuntime } from '@server/core/typed-runtime'
import type { ChatProtocol } from '@shared/modules/chat'

const chatRuntime = createTypedRuntime<ChatProtocol>('/chat/ws')

chatRuntime.registerRPC('echo', params => {
  return { message: params.message, timestamp: Date.now() }
})

chatRuntime.registerRPC('ping', () => {
  return { pong: true, timestamp: Date.now() }
})

chatRuntime.registerEvent('broadcast', (payload, clientId) => {
  chatRuntime.broadcast('broadcast', payload, [clientId])
})

export { chatRuntime }

export function getConnectedClientsCount(): number {
  return chatRuntime.adapter.getWSConnections().size
}

export function broadcastChatMessage(message: {
  id: string
  content: string
  sender: string
  timestamp: number
}): void {
  chatRuntime.broadcast('broadcast', {
    message: message.content,
    timestamp: message.timestamp,
  })
}

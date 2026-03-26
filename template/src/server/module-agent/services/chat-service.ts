import { chatSessionManager } from './chat-session-manager'

export interface ChatResponse {
  userMessageId: string
  agentMessageId: string
  error?: {
    code: string
    message: string
    recoverable: boolean
  }
}

export async function processChatMessage(
  agentId: string,
  userId: string,
  content: string
): Promise<ChatResponse> {
  return chatSessionManager.processChatMessage(agentId, userId, content)
}

export async function abortChat(userId: string): Promise<void> {
  return chatSessionManager.abortChat(userId)
}

export function isChatRunning(userId: string): boolean {
  return chatSessionManager.isRunning(userId)
}

export async function reloadResources(userId: string): Promise<void> {
  return chatSessionManager.reloadResources(userId)
}

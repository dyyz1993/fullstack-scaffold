import { createLLMService, loadSessionHistory, type LLMPIService } from './llm-service'
import { createMockLLMService, isMockEnabled } from './mock-service'
import type { LLMService } from '../types'
import { sseManager } from './sse-manager'

interface RunningChat {
  agentId: string
  userId: string
  abort: () => Promise<void>
}

class ChatSessionManager {
  private runningChats = new Map<string, RunningChat>()

  private async getLLMService(userId: string): Promise<LLMService | null> {
    if (isMockEnabled()) {
      return createMockLLMService()
    }

    if (process.env.USE_PI_CONFIG === 'true') {
      return await createLLMService(userId)
    }

    return null
  }

  async processChatMessage(
    agentId: string,
    userId: string,
    content: string
  ): Promise<{
    userMessageId: string
    agentMessageId: string
    error?: { code: string; message: string; recoverable: boolean }
  }> {
    const userMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const agentMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`

    sseManager.send(agentId, 'pi-agent-start', {
      messageId: agentMessageId,
      agentId,
    })

    let llm: LLMService | LLMPIService | null = null

    try {
      llm = await this.getLLMService(userId)

      if (!llm) {
        throw new Error('No LLM service available')
      }

      const historyMessages = loadSessionHistory(userId, 10)
      const conversationMessages = [...historyMessages, { role: 'user' as const, content }]

      const runningChat: RunningChat = {
        agentId,
        userId,
        abort: async () => {
          if (llm && 'abort' in llm) {
            await (llm as LLMPIService).abort()
          }
        },
      }
      this.runningChats.set(userId, runningChat)

      await llm.chat(conversationMessages, {
        onThinkingDelta: delta => {
          sseManager.send(agentId, 'pi-thinking-delta', { messageId: agentMessageId, delta })
        },
        onTextDelta: (delta, isFinal) => {
          sseManager.send(agentId, 'pi-text-delta', { messageId: agentMessageId, delta, isFinal })
        },
        onToolStart: (toolCallId, toolName, args) => {
          sseManager.send(agentId, 'pi-tool-start', {
            messageId: agentMessageId,
            toolCallId,
            toolName,
            args,
          })
        },
        onToolEnd: (toolCallId, result, error) => {
          sseManager.send(agentId, 'pi-tool-end', {
            messageId: agentMessageId,
            toolCallId,
            result,
            error,
          })
        },
        onError: error => {
          sseManager.send(agentId, 'pi-error', {
            messageId: agentMessageId,
            code: error.code,
            message: error.message,
            recoverable: error.recoverable,
          })
        },
      })

      this.runningChats.delete(userId)

      sseManager.send(agentId, 'pi-agent-end', { messageId: agentMessageId })

      return {
        userMessageId,
        agentMessageId,
      }
    } catch (error) {
      this.runningChats.delete(userId)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorCode = errorMessage.includes('rate limit')
        ? 'rate_limit'
        : errorMessage.includes('token')
          ? 'token_exceeded'
          : 'api_error'

      sseManager.send(agentId, 'pi-error', {
        messageId: agentMessageId,
        code: errorCode,
        message: errorMessage,
        recoverable: errorCode !== 'token_exceeded',
      })

      sseManager.send(agentId, 'pi-agent-end', { messageId: agentMessageId })

      return {
        userMessageId,
        agentMessageId,
        error: {
          code: errorCode,
          message: errorMessage,
          recoverable: errorCode !== 'token_exceeded',
        },
      }
    }
  }

  async abortChat(userId: string): Promise<void> {
    const runningChat = this.runningChats.get(userId)
    if (runningChat) {
      await runningChat.abort()
      this.runningChats.delete(userId)
    }
  }

  isRunning(userId: string): boolean {
    return this.runningChats.has(userId)
  }
}

export const chatSessionManager = new ChatSessionManager()

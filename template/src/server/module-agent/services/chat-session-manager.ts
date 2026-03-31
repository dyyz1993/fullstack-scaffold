import { createLLMService, loadSessionHistory, type LLMPIService } from './llm-service'
import { createMockLLMService, isMockEnabled } from './mock-service'
import type { LLMService } from '../types'
import { sseManager } from './sse-manager'
import { getOrCreateWorkspace } from './workspace-service'

interface RunningChat {
  agentId: string
  userId: string
  abort: () => Promise<void>
}

interface CachedLLMService {
  service: LLMPIService
  workspacePath: string
  lastUsed: number
}

class ChatSessionManager {
  private runningChats = new Map<string, RunningChat>()
  private llmCache = new Map<string, CachedLLMService>()
  private readonly CACHE_TTL = 30 * 60 * 1000
  private readonly MAX_CACHE_SIZE = 10
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanupExpiredCache(), 30 * 60 * 1000)
  }

  private evictLRU(): void {
    if (this.llmCache.size < this.MAX_CACHE_SIZE) return

    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, cached] of this.llmCache.entries()) {
      if (cached.lastUsed < oldestTime) {
        oldestTime = cached.lastUsed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.llmCache.delete(oldestKey)
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.llmCache.entries()) {
      if (now - cached.lastUsed > this.CACHE_TTL) {
        this.llmCache.delete(key)
      }
    }
  }

  private async getLLMService(
    userId: string,
    workspacePath: string
  ): Promise<LLMService | LLMPIService | null> {
    if (isMockEnabled()) {
      return createMockLLMService()
    }

    if (process.env.USE_PI_CONFIG !== 'true') {
      return null
    }

    const cached = this.llmCache.get(userId)
    const now = Date.now()

    if (
      cached &&
      cached.workspacePath === workspacePath &&
      now - cached.lastUsed < this.CACHE_TTL
    ) {
      cached.lastUsed = now
      return cached.service
    }

    this.evictLRU()

    const service = await createLLMService(userId, workspacePath)
    if (service) {
      this.llmCache.set(userId, {
        service,
        workspacePath,
        lastUsed: now,
      })
    }

    return service
  }

  async reloadResources(userId: string): Promise<void> {
    const cached = this.llmCache.get(userId)
    if (cached && 'session' in cached.service) {
      const session = cached.service.session
      if (session.resourceLoader) {
        await session.resourceLoader.reload()
        console.warn('[ChatSessionManager] Reloaded resources for user:', userId)
      }
    }
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

    sseManager.send(agentId, userId, 'pi-agent-start', {
      messageId: agentMessageId,
      agentId,
    })

    let llm: LLMService | LLMPIService | null = null

    try {
      const workspace = await getOrCreateWorkspace(userId)
      llm = await this.getLLMService(userId, workspace.path)

      if (!llm) {
        throw new Error('No LLM service available')
      }

      const historyMessages = await loadSessionHistory(userId, 10, workspace.path)
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
          sseManager.send(agentId, userId, 'pi-thinking-delta', {
            messageId: agentMessageId,
            delta,
          })
        },
        onTextDelta: (delta, isFinal) => {
          sseManager.send(agentId, userId, 'pi-text-delta', {
            messageId: agentMessageId,
            delta,
            isFinal,
          })
        },
        onToolStart: (toolCallId, toolName, args) => {
          sseManager.send(agentId, userId, 'pi-tool-start', {
            messageId: agentMessageId,
            toolCallId,
            toolName,
            args,
          })
        },
        onToolEnd: (toolCallId, result, error) => {
          sseManager.send(agentId, userId, 'pi-tool-end', {
            messageId: agentMessageId,
            toolCallId,
            result,
            error,
          })
        },
        onError: error => {
          sseManager.send(agentId, userId, 'pi-error', {
            messageId: agentMessageId,
            code: error.code,
            message: error.message,
            recoverable: error.recoverable,
          })
        },
      })

      this.runningChats.delete(userId)

      sseManager.send(agentId, userId, 'pi-agent-end', { messageId: agentMessageId })

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

      sseManager.send(agentId, userId, 'pi-error', {
        messageId: agentMessageId,
        code: errorCode,
        message: errorMessage,
        recoverable: errorCode !== 'token_exceeded',
      })

      sseManager.send(agentId, userId, 'pi-agent-end', { messageId: agentMessageId })

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

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.llmCache.clear()
    this.runningChats.clear()
  }
}

export const chatSessionManager = new ChatSessionManager()

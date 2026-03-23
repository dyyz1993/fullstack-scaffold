import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { fileURLToPath } from 'url'
import {
  createAgentSession,
  ModelRegistry,
  AuthStorage,
  SessionManager,
  createBashTool,
  type AgentSession,
} from '@mariozechner/pi-coding-agent'
import type { AgentSessionEvent } from '@mariozechner/pi-coding-agent'
import type { AssistantMessageEvent } from '@mariozechner/pi-ai'
import type { LLMLCallbacks } from '../types'
import { createSandboxedBashOperations, initializeSandbox } from './sandbox-bash'
import { parseSessionJsonl, toLLMMessages } from './session-parser'

function getProjectRoot(): string {
  const currentFile = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFile)
  return path.join(currentDir, '..', '..', '..', '..')
}

interface ModelsConfig {
  providers: Record<
    string,
    {
      baseUrl: string
      api: string
      apiKey: string
      models: Array<{
        id: string
        name: string
        reasoning: boolean
        input: string[]
        contextWindow: number
        maxTokens: number
        cost: { input: number; output: number; cacheRead: number; cacheWrite: number }
      }>
    }
  >
  defaultProvider: string
  defaultModel: string
}

function loadPiModelsConfig(): ModelsConfig | null {
  try {
    const configPath = `${os.homedir()}/.pi/agent/settings.json`
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ModelsConfig
    }
  } catch (error) {
    console.warn('[LLM] Failed to load PI settings config:', error)
  }
  return null
}

export function loadSessionHistory(
  userId: string,
  limit?: number
): Array<{ role: string; content: string }> {
  const { messages } = parseSessionJsonl(userId)
  const llmMessages = toLLMMessages(messages)
  return limit ? llmMessages.slice(-limit) : llmMessages
}

export interface LLMPIService {
  chat: (
    messages: Array<{ role: string; content: string }>,
    callbacks: LLMLCallbacks
  ) => Promise<string>
  abort: () => Promise<void>
  session: AgentSession
}

export async function createPILLMService(userId: string): Promise<LLMPIService> {
  const piConfig = loadPiModelsConfig()
  if (!piConfig) {
    throw new Error('PI config not found')
  }

  const config = {
    provider: piConfig.defaultProvider,
    model: piConfig.defaultModel,
  }

  const authStorage = AuthStorage.create()
  const modelRegistry = new ModelRegistry(authStorage)

  const model = modelRegistry.find(config.provider, config.model)
  if (!model) {
    throw new Error(`Model not found: ${config.provider}/${config.model}`)
  }

  const projectRoot = getProjectRoot()
  const userWorkspace = path.join(projectRoot, '.pi', 'work', userId)
  const sessionDir = path.join(projectRoot, '.pi', 'sessions', userId)

  const sessionManager = SessionManager.create(userWorkspace, sessionDir)

  if (!fs.existsSync(userWorkspace)) {
    fs.mkdirSync(userWorkspace, { recursive: true })
    console.warn('[LLM] Created user workspace:', userWorkspace)
  }
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
    console.warn('[LLM] Created session dir:', sessionDir)
  }

  await initializeSandbox({ workspacePath: userWorkspace })
  const bashOperations = createSandboxedBashOperations({ workspacePath: userWorkspace })
  const bashTool = createBashTool(userWorkspace, { operations: bashOperations })

  const { session } = await createAgentSession({
    model,
    thinkingLevel: 'medium',
    authStorage,
    modelRegistry,
    sessionManager,
    tools: [bashTool],
  })

  return {
    async chat(messages, callbacks) {
      let hasError = false
      let errorMessage = ''

      const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
        if (event.type === 'message_update') {
          const assistantEvent = (
            event as unknown as { assistantMessageEvent: AssistantMessageEvent }
          ).assistantMessageEvent
          if (assistantEvent.type === 'thinking_delta') {
            callbacks.onThinkingDelta?.(assistantEvent.delta)
          } else if (assistantEvent.type === 'text_delta') {
            callbacks.onTextDelta?.(assistantEvent.delta, false)
          } else if (assistantEvent.type === 'toolcall_delta') {
            // Tool arguments streaming - can be used for progress display
          }
        } else if (event.type === 'tool_execution_start') {
          callbacks.onToolStart?.(event.toolCallId, event.toolName, event.args)
        } else if (event.type === 'tool_execution_end') {
          callbacks.onToolEnd?.(
            event.toolCallId,
            event.result,
            event.isError ? 'Tool execution error' : undefined
          )
        }
      })

      const lastMessage = messages[messages.length - 1]
      const prompt = lastMessage?.content || ''

      try {
        await session.prompt(prompt)
      } catch (err) {
        hasError = true
        errorMessage = err instanceof Error ? err.message : 'Unknown error'
      }

      unsubscribe()

      if (hasError) {
        callbacks.onError?.({
          code: 'api_error',
          message: errorMessage,
          recoverable: true,
        })
        throw new Error(`LLM error: ${errorMessage}`)
      }

      callbacks.onTextDelta?.('', true)
      return ''
    },

    async abort() {
      try {
        await session.abort()
      } catch (error) {
        console.warn('[LLM] Abort error:', error)
      }
    },

    session,
  }
}

export async function createLLMService(userId: string): Promise<LLMPIService | null> {
  if (process.env.MOCK_LLM === 'true') {
    return null
  }

  const piConfig = loadPiModelsConfig()
  if (!piConfig) {
    return null
  }

  if (process.env.USE_PI_CONFIG !== 'true') {
    return null
  }

  return createPILLMService(userId)
}

export { loadPiModelsConfig }

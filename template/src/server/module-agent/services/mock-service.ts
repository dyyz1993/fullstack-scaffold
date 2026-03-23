import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { LLMService, MockConfig } from '../types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MOCK_DIR = path.join(__dirname, '..', 'data', 'mock')

export function loadMockConfig(): MockConfig | null {
  const configPath = path.join(MOCK_DIR, 'scenarios.json')
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as MockConfig
    }
  } catch (error) {
    console.warn('[Mock] Failed to load mock config:', error)
  }
  return null
}

export function findMockScenario(userMessage: string): string | null {
  const config = loadMockConfig()
  if (!config) return null

  const lowerMessage = userMessage.toLowerCase()
  for (const scenario of config.scenarios) {
    for (const trigger of scenario.triggers) {
      if (lowerMessage.includes(trigger.toLowerCase())) {
        return path.join(MOCK_DIR, scenario.dataFile)
      }
    }
  }
  return null
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function createMockLLMService(): LLMService {
  return {
    async chat(messages, callbacks) {
      const lastMessage = messages[messages.length - 1]
      const userMessage = lastMessage?.content || ''

      const dataFile = findMockScenario(userMessage)
      if (!dataFile) {
        callbacks.onError?.({
          code: 'api_error',
          message: 'No mock scenario found for this message',
          recoverable: true,
        })
        return ''
      }

      if (!fs.existsSync(dataFile)) {
        callbacks.onError?.({
          code: 'api_error',
          message: `Mock data file not found: ${dataFile}`,
          recoverable: true,
        })
        return ''
      }

      const content = fs.readFileSync(dataFile, 'utf-8')
      const lines = content.split('\n').filter(line => line.trim())

      let fullContent = ''

      for (const line of lines) {
        try {
          const event = JSON.parse(line)
          await sleep(30 + Math.random() * 20)

          switch (event.type) {
            case 'pi-thinking-delta':
              callbacks.onThinkingDelta?.(event.delta)
              break
            case 'pi-text-delta':
              fullContent += event.delta
              callbacks.onTextDelta?.(event.delta, event.isFinal || false)
              break
            case 'pi-tool-start':
              callbacks.onToolStart?.(event.toolCallId, event.toolName, event.args)
              break
            case 'pi-tool-end':
              callbacks.onToolEnd?.(event.toolCallId, event.result, event.error)
              break
          }
        } catch {
          console.warn('[Mock] Failed to parse mock line:', line)
        }
      }

      return fullContent
    },
  }
}

export function isMockEnabled(): boolean {
  return process.env.MOCK_LLM === 'true'
}

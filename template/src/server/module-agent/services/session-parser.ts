import { access, readdir, stat, readFile } from 'fs/promises'
import * as path from 'path'
import type {
  PiMessage,
  PiAssistantMessage,
  PiToolResultMessage,
  PiToolCall,
  PiSessionLine,
  PiTextContent,
  PiThinkingContent,
} from '@shared/modules/agent/pi-types'
import type { AgentSubRound } from '@shared/modules/agent'
import { Paths } from './paths'

import type { ToolCallWithResult, ToolCallMap } from './types'

export interface ParseSessionResult {
  messages: PiMessage[]
  toolCallMap: ToolCallMap
}

function collectToolCalls(msg: PiAssistantMessage, toolCallMap: ToolCallMap) {
  for (const block of msg.content) {
    if (block.type === 'toolCall') {
      toolCallMap.set(block.id, block as ToolCallWithResult)
    }
  }
}

function applyToolResult(toolResult: PiToolResultMessage, toolCallMap: ToolCallMap) {
  const toolCall = toolCallMap.get(toolResult.toolCallId)
  if (!toolCall) return
  toolCall.result = toolResult.content
  if (toolResult.isError) {
    toolCall.error = 'Tool execution failed'
  }
}

function processEntry(entry: PiSessionLine, messages: PiMessage[], toolCallMap: ToolCallMap) {
  if (entry.type !== 'message' || !('message' in entry)) return
  const msg = entry.message

  if (msg.role === 'user' || msg.role === 'assistant') {
    const entryTimestamp = entry.timestamp ? new Date(entry.timestamp).getTime() : msg.timestamp
    messages.push({
      ...msg,
      timestamp: entryTimestamp,
    })
  }

  if (msg.role === 'assistant') {
    collectToolCalls(msg as PiAssistantMessage, toolCallMap)
  } else if (msg.role === 'toolResult') {
    applyToolResult(msg as PiToolResultMessage, toolCallMap)
  }
}

function parseSessionLines(content: string, messages: PiMessage[], toolCallMap: ToolCallMap) {
  const lines = content.trim().split('\n')

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line) as PiSessionLine
      if (entry.type !== 'message' || !entry.message) continue

      processEntry(entry, messages, toolCallMap)
    } catch (e) {
      console.warn('[SessionParser] Failed to parse line:', e)
    }
  }
}

export async function parseSessionJsonl(
  userId: string,
  _workspacePath?: string
): Promise<ParseSessionResult> {
  const sessionDir = Paths.sessions(userId)

  try {
    await access(sessionDir)
  } catch {
    console.warn('[SessionParser] Session dir not found:', sessionDir)
    return { messages: [], toolCallMap: new Map() }
  }

  try {
    const files = await readdir(sessionDir)
    const sessionFiles = (
      await Promise.all(
        files
          .filter(f => f.endsWith('.jsonl'))
          .map(async f => {
            const filePath = path.join(sessionDir, f)
            const fileStat = await stat(filePath)
            return {
              name: f,
              path: filePath,
              mtime: fileStat.mtime.getTime(),
            }
          })
      )
    ).sort((a, b) => b.mtime - a.mtime)

    if (sessionFiles.length === 0) {
      return { messages: [], toolCallMap: new Map() }
    }

    const messages: PiMessage[] = []
    const toolCallMap: ToolCallMap = new Map()

    for (const sessionFile of sessionFiles) {
      const content = await readFile(sessionFile.path, 'utf-8')
      parseSessionLines(content, messages, toolCallMap)
    }

    const seenTimestamps = new Set<number>()
    const deduplicated = messages.filter(m => {
      if (seenTimestamps.has(m.timestamp)) return false
      seenTimestamps.add(m.timestamp)
      return true
    })

    deduplicated.sort((a, b) => a.timestamp - b.timestamp)

    return { messages: deduplicated, toolCallMap }
  } catch (error) {
    console.warn('[SessionParser] Failed to load session:', error)
    return { messages: [], toolCallMap: new Map() }
  }
}

export function parseAssistantSubRounds(
  msg: PiAssistantMessage,
  timestamp: number,
  toolCallMap?: ToolCallMap
): AgentSubRound[] {
  const subRounds: AgentSubRound[] = []
  let currentSubRound: AgentSubRound = {
    id: `subround-${timestamp}-0`,
    createdAt: new Date(timestamp).toISOString(),
  }
  let subRoundIndex = 0

  for (const block of msg.content) {
    if (block.type === 'thinking') {
      const thinkingBlock = block as PiThinkingContent
      if (currentSubRound.toolCalls && currentSubRound.toolCalls.length > 0) {
        subRounds.push(currentSubRound)
        subRoundIndex++
        currentSubRound = {
          id: `subround-${timestamp}-${subRoundIndex}`,
          thinking: thinkingBlock.thinking,
          createdAt: new Date(timestamp).toISOString(),
        }
      } else {
        currentSubRound.thinking = (currentSubRound.thinking || '') + thinkingBlock.thinking
      }
    } else if (block.type === 'toolCall') {
      const toolCallBlock = block as PiToolCall
      if (!currentSubRound.toolCalls) {
        currentSubRound.toolCalls = []
      }

      const toolCallWithResult = toolCallMap?.get(toolCallBlock.id)

      currentSubRound.toolCalls.push({
        id: toolCallBlock.id,
        name: toolCallBlock.name,
        args: toolCallBlock.arguments,
        result: toolCallWithResult?.result,
        error: toolCallWithResult?.error,
      })
    } else if (block.type === 'text') {
      const textBlock = block as PiTextContent
      currentSubRound.content = (currentSubRound.content || '') + textBlock.text
    }
  }

  if (currentSubRound.thinking || currentSubRound.toolCalls?.length || currentSubRound.content) {
    subRounds.push(currentSubRound)
  }

  return subRounds
}

export function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .filter((block): block is PiTextContent => block.type === 'text')
      .map(block => block.text)
      .join('')
  }
  return ''
}

export function toLLMMessages(messages: PiMessage[]): Array<{ role: string; content: string }> {
  const result: Array<{ role: string; content: string }> = []

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({
        role: 'user',
        content: typeof msg.content === 'string' ? msg.content : extractTextContent(msg.content),
      })
    } else if (msg.role === 'assistant') {
      let textContent = ''
      for (const block of msg.content) {
        if (block.type === 'text') {
          textContent += block.text
        }
      }
      result.push({
        role: 'assistant',
        content: textContent,
      })
    }
  }

  return result
}

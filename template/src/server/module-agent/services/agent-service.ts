import { eq, and } from 'drizzle-orm'
import type { Agent, ChatMessage, CreateAgentInput, UpdateAgentInput } from '@shared/modules/agent'
import { getDb } from '../../db'
import { agents, type AgentTable } from '../../db/schema'
import { toISOString } from '../../utils/date'
import { generateId } from '../../utils/id'
import { parseSessionJsonl, extractTextContent, parseAssistantSubRounds } from './session-parser'

export async function getOrCreateAgent(userId: string, input?: CreateAgentInput): Promise<Agent> {
  const db = await getDb()

  const existingAgents = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1)

  if (existingAgents.length > 0) {
    const row = existingAgents[0] as AgentTable
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      model: row.model ?? undefined,
      systemPrompt: row.systemPrompt ?? undefined,
      createdAt: toISOString(row.createdAt),
      updatedAt: toISOString(row.updatedAt),
    }
  }

  const now = new Date()
  const agentId = generateId('agent')
  const newAgent = {
    id: agentId,
    name: input?.name ?? 'Default Agent',
    description: input?.description ?? null,
    model: input?.model ?? 'claude-3-5-sonnet-20241022',
    systemPrompt: input?.systemPrompt ?? null,
    userId,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(agents).values(newAgent)

  return {
    id: newAgent.id,
    name: newAgent.name,
    description: newAgent.description ?? undefined,
    model: newAgent.model ?? undefined,
    systemPrompt: newAgent.systemPrompt ?? undefined,
    createdAt: toISOString(newAgent.createdAt),
    updatedAt: toISOString(newAgent.updatedAt),
  }
}

export async function getAgent(agentId: string, userId: string): Promise<Agent | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))

  const row = rows[0] as AgentTable | undefined
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    model: row.model ?? undefined,
    systemPrompt: row.systemPrompt ?? undefined,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }
}

export async function updateAgent(
  agentId: string,
  userId: string,
  input: UpdateAgentInput
): Promise<Agent | null> {
  const db = await getDb()

  const existing = await getAgent(agentId, userId)
  if (!existing) return null

  const now = new Date()
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  }

  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.model !== undefined) updateData.model = input.model
  if (input.systemPrompt !== undefined) updateData.systemPrompt = input.systemPrompt

  await db.update(agents).set(updateData).where(eq(agents.id, agentId))

  return {
    ...existing,
    ...input,
    name: input.name ?? existing.name,
    updatedAt: toISOString(now),
  }
}

export async function getMessages(
  agentId: string,
  userId: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[]> {
  const { messages: piMessages, toolCallMap } = parseSessionJsonl(userId)

  piMessages.sort((a, b) => b.timestamp - a.timestamp)

  let pagedMessages = piMessages
  if (limit !== undefined || offset !== undefined) {
    const start = offset || 0
    const end = limit !== undefined ? start + limit : undefined
    pagedMessages = piMessages.slice(start, end)
  }

  return pagedMessages
    .map((msg, index) => {
      if (msg.role === 'user') {
        return {
          id: `msg-${msg.timestamp}-${index}`,
          agentId,
          role: 'user',
          content: extractTextContent(msg.content),
          createdAt: new Date(msg.timestamp).toISOString(),
        }
      } else if (msg.role === 'assistant') {
        const content = extractTextContent(msg.content)
        const subRounds = parseAssistantSubRounds(msg, msg.timestamp, toolCallMap)

        return {
          id: `msg-${msg.timestamp}-${index}`,
          agentId,
          role: 'agent',
          content,
          subRounds: subRounds.length > 0 ? subRounds : undefined,
          createdAt: new Date(msg.timestamp).toISOString(),
        }
      } else {
        return null
      }
    })
    .filter(Boolean) as ChatMessage[]
}

export async function clearMessages(_agentId: string, userId: string): Promise<void> {
  const fs = await import('fs')
  const path = await import('path')
  const { fileURLToPath } = await import('url')

  const currentFile = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFile)
  const projectRoot = path.join(currentDir, '..', '..', '..', '..')
  const sessionDir = path.join(projectRoot, '.pi', 'sessions', userId)

  if (fs.existsSync(sessionDir)) {
    const sessionFiles = fs.readdirSync(sessionDir).filter(f => f.endsWith('.jsonl'))
    for (const file of sessionFiles) {
      const filePath = path.join(sessionDir, file)
      try {
        fs.unlinkSync(filePath)
      } catch (e) {
        console.warn('[Agent] Failed to delete session file:', filePath, e)
      }
    }
  }
}

interface MessageRound {
  userMessage: ChatMessage
  agentMessages: ChatMessage[]
  timestamp: string
}

interface RoundsResponse {
  rounds: MessageRound[]
  hasMore: boolean
  oldestTimestamp?: string
  newestTimestamp?: string
}

export async function getRounds(
  agentId: string,
  userId: string,
  options: { limit?: number; before?: string; after?: string }
): Promise<RoundsResponse> {
  const { messages: piMessages, toolCallMap } = parseSessionJsonl(userId)

  const chatMessages = piMessages
    .map((msg, index) => {
      if (msg.role === 'user') {
        return {
          id: `msg-${msg.timestamp}-${index}`,
          agentId,
          role: 'user' as const,
          content: extractTextContent(msg.content),
          createdAt: new Date(msg.timestamp).toISOString(),
        }
      } else if (msg.role === 'assistant') {
        const content = extractTextContent(msg.content)
        const subRounds = parseAssistantSubRounds(msg, msg.timestamp, toolCallMap)

        return {
          id: `msg-${msg.timestamp}-${index}`,
          agentId,
          role: 'agent' as const,
          content,
          subRounds: subRounds.length > 0 ? subRounds : undefined,
          createdAt: new Date(msg.timestamp).toISOString(),
        }
      }
      return null
    })
    .filter(Boolean) as ChatMessage[]

  chatMessages.sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    if (timeDiff !== 0) return timeDiff
    return a.id.localeCompare(b.id)
  })

  let filteredMessages = chatMessages
  if (options.before) {
    const beforeTime = new Date(options.before).getTime()
    filteredMessages = filteredMessages.filter(
      msg => new Date(msg.createdAt).getTime() < beforeTime
    )
  }
  if (options.after) {
    const afterTime = new Date(options.after).getTime()
    filteredMessages = filteredMessages.filter(msg => new Date(msg.createdAt).getTime() > afterTime)
  }

  const rounds: MessageRound[] = []
  let currentRound: MessageRound | null = null

  for (const msg of filteredMessages) {
    if (msg.role === 'user') {
      currentRound = {
        userMessage: msg,
        agentMessages: [],
        timestamp: msg.createdAt,
      }
      rounds.push(currentRound)
    } else if (msg.role === 'agent' && currentRound) {
      currentRound.agentMessages.push(msg)
    }
  }

  const limit = options.limit || 10
  const totalRounds = rounds.length
  const reversedRounds = rounds.reverse()
  const limitedRounds = reversedRounds.slice(0, limit)
  const hasMore = totalRounds > limit

  return {
    rounds: limitedRounds,
    hasMore,
    oldestTimestamp: limitedRounds[limitedRounds.length - 1]?.timestamp,
    newestTimestamp: limitedRounds[0]?.timestamp,
  }
}

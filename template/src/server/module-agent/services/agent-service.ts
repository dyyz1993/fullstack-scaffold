import { eq, and } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import type {
  Agent,
  ChatMessage,
  CreateAgentInput,
  UpdateAgentInput,
  MessageRound,
} from '@shared/modules/agent'
import { getDb } from '../../db'
import { agents, type AgentTable } from '../../db/schema'
import { toISOString } from '../../utils/date'
import { generateId } from '../../utils/id'
import { parseSessionJsonl, extractTextContent, parseAssistantSubRounds } from './session-parser'
import { Paths } from './paths'

export async function getOrCreateAgent(
  workspaceId: string,
  _userId: string,
  input?: CreateAgentInput
): Promise<Agent> {
  const db = await getDb()

  const existingAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.workspaceId, workspaceId))
    .limit(1)

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
    workspaceId,
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

export async function getAgent(agentId: string, workspaceId: string): Promise<Agent | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))

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
  workspaceId: string,
  input: UpdateAgentInput
): Promise<Agent | null> {
  const db = await getDb()

  const existing = await getAgent(agentId, workspaceId)
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
  _workspaceId: string,
  workspacePath: string,
  limit: number = 10,
  before?: string
): Promise<{ rounds: MessageRound[]; hasMore: boolean; oldestTimestamp?: string }> {
  try {
    const userId = path.basename(workspacePath)
    const { messages: piMessages, toolCallMap } = parseSessionJsonl(userId)

    piMessages.sort((a, b) => b.timestamp - a.timestamp)

    const rounds: MessageRound[] = []
    let currentRound: {
      userMessage: ChatMessage
      agentMessages: ChatMessage[]
      timestamp: string
    } | null = null
    let roundIndex = 0

    for (const msg of piMessages) {
      if (msg.role === 'user') {
        if (currentRound) {
          rounds.push({
            userMessage: currentRound.userMessage,
            agentMessages: currentRound.agentMessages,
            timestamp: currentRound.timestamp,
          })
        }
        const userMsg: ChatMessage = {
          id: `msg-${msg.timestamp}-${roundIndex}`,
          agentId,
          role: 'user',
          content: extractTextContent(msg.content),
          createdAt: new Date(msg.timestamp).toISOString(),
        }
        roundIndex++
        currentRound = { userMessage: userMsg, agentMessages: [], timestamp: userMsg.createdAt }
      } else if (msg.role === 'assistant' && currentRound) {
        const content = extractTextContent(msg.content)
        const subRounds = parseAssistantSubRounds(msg, msg.timestamp, toolCallMap)
        const agentMsg: ChatMessage = {
          id: `msg-${msg.timestamp}-${roundIndex - 1}-${currentRound.agentMessages.length}`,
          agentId,
          role: 'agent',
          content,
          subRounds: subRounds.length > 0 ? subRounds : undefined,
          createdAt: new Date(msg.timestamp).toISOString(),
        }
        currentRound.agentMessages.push(agentMsg)
      }
    }

    if (currentRound) {
      rounds.push({
        userMessage: currentRound.userMessage,
        agentMessages: currentRound.agentMessages,
        timestamp: currentRound.timestamp,
      })
    }

    let filteredRounds = rounds
    if (before) {
      const beforeTimestamp = new Date(before).getTime()
      if (!isNaN(beforeTimestamp)) {
        filteredRounds = filteredRounds.filter(
          r => new Date(r.timestamp).getTime() < beforeTimestamp
        )
      }
    }

    const hasMore = filteredRounds.length > limit
    const resultRounds = filteredRounds.slice(0, limit)
    const oldestTimestamp = resultRounds[resultRounds.length - 1]?.timestamp

    return {
      rounds: resultRounds,
      hasMore,
      oldestTimestamp,
    }
  } catch (error) {
    console.error(`Failed to get messages for agent ${agentId}:`, error)
    return { rounds: [], hasMore: false }
  }
}

export async function clearMessages(_agentId: string, workspacePath: string): Promise<void> {
  const userId = path.basename(workspacePath)
  const sessionDir = Paths.sessions(userId)

  if (fs.existsSync(sessionDir)) {
    const sessionFiles = fs.readdirSync(sessionDir).filter((f: string) => f.endsWith('.jsonl'))
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

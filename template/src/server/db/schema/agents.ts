import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const messageRoles = ['user', 'agent', 'system'] as const
export type MessageRole = (typeof messageRoles)[number]

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  model: text('model'),
  systemPrompt: text('system_prompt'),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role', { enum: messageRoles }).notNull(),
  content: text('content').notNull(),
  thinking: text('thinking'),
  toolCalls: text('tool_calls', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export type AgentTable = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
export type ChatMessageTable = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert

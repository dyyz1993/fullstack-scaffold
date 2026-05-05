import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const ticketStatuses = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const
export type TicketStatus = (typeof ticketStatuses)[number]

export const ticketPriorities = ['low', 'medium', 'high', 'urgent'] as const
export type TicketPriority = (typeof ticketPriorities)[number]

export const ticketCategories = [
  'technical',
  'billing',
  'feature_request',
  'bug_report',
  'general',
] as const
export type TicketCategory = (typeof ticketCategories)[number]

export const ticketReplyAuthorRoles = ['customer', 'admin', 'system'] as const

export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketNo: text('ticket_no').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ticketStatuses }).notNull().default('open'),
  priority: text('priority', { enum: ticketPriorities }).notNull().default('medium'),
  category: text('category', { enum: ticketCategories }).notNull(),
  assignedTo: text('assigned_to'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const ticketReplies = sqliteTable('ticket_replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  author: text('author').notNull(),
  isCustomer: integer('is_customer', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export type TicketTable = typeof tickets.$inferSelect
export type NewTicket = typeof tickets.$inferInsert
export type TicketReplyTable = typeof ticketReplies.$inferSelect
export type NewTicketReply = typeof ticketReplies.$inferInsert

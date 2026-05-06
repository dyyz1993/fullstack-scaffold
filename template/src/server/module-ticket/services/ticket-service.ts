import { eq, desc, and } from 'drizzle-orm'
import type {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  ReplyTicketInput,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '@shared/modules/ticket'
import { getDb } from '@server/db'
import { tickets, ticketReplies, type TicketTable, type TicketReplyTable } from '@server/db/schema'
import { toISOString } from '@server/utils/date'
import { generateTicketNo, randomDate, randomElement } from '@server/utils/generate'
import { parseModuleId } from '@server/utils/id-helpers'

const AGENTS = ['客服小王', '客服小李', '客服小张']

async function loadTicketWithReplies(row: TicketTable): Promise<Ticket> {
  const db = await getDb()
  const replyRows = await db
    .select()
    .from(ticketReplies)
    .where(eq(ticketReplies.ticketId, row.id))
    .orderBy(desc(ticketReplies.createdAt))

  return {
    id: `ticket-${row.id}`,
    ticketNo: row.ticketNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    assignedTo: row.assignedTo ?? undefined,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
    replies: replyRows.map((r: TicketReplyTable) => ({
      id: `reply-${r.id}`,
      ticketId: `ticket-${r.ticketId}`,
      content: r.content,
      author: r.author,
      isCustomer: r.isCustomer,
      createdAt: toISOString(r.createdAt),
    })),
  }
}

function ticketWithoutReplies(row: TicketTable): Ticket {
  return {
    id: `ticket-${row.id}`,
    ticketNo: row.ticketNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    category: row.category,
    assignedTo: row.assignedTo ?? undefined,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
    replies: [],
  }
}

export async function seedTicketsIfEmpty(): Promise<void> {
  const db = await getDb()
  const existing = await db.select().from(tickets).all()
  if (existing.length === 0) {
    const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
    const STATUSES: TicketStatus[] = [
      'open',
      'in_progress',
      'waiting_customer',
      'resolved',
      'closed',
    ]
    const CATEGORIES: TicketCategory[] = [
      'technical',
      'billing',
      'feature_request',
      'bug_report',
      'general',
    ]
    const CUSTOMERS = [
      { name: '张三', email: 'zhangsan@example.com' },
      { name: '李四', email: 'lisi@example.com' },
      { name: '王五', email: 'wangwu@example.com' },
      { name: '赵六', email: 'zhaoliu@example.com' },
      { name: '钱七', email: 'qianqi@example.com' },
    ]
    const SUBJECTS = [
      '无法登录系统',
      '订单支付失败',
      '功能使用咨询',
      '数据导出问题',
      '账号权限申请',
      '系统性能问题',
      '界面显示异常',
      'API 调用错误',
    ]

    for (let i = 0; i < 20; i++) {
      const customer = randomElement(CUSTOMERS)
      const status = randomElement(STATUSES)
      const priority = randomElement(PRIORITIES)
      const category = randomElement(CATEGORIES)
      const subject = randomElement(SUBJECTS)
      const createdAt = new Date(randomDate(new Date('2024-01-01'), new Date()))
      const assignedTo = status !== 'open' ? randomElement(AGENTS) : null

      const ticketResult = await db
        .insert(tickets)
        .values({
          ticketNo: generateTicketNo(),
          customerName: customer.name,
          customerEmail: customer.email,
          subject,
          description: `关于${subject}的详细描述，用户遇到了一些问题需要解决。`,
          status,
          priority,
          category,
          assignedTo,
          createdAt,
          updatedAt: createdAt,
        })
        .returning()

      const ticketId = ticketResult[0].id

      if (status !== 'open') {
        const replyCount = Math.floor(Math.random() * 3) + 1
        for (let j = 0; j < replyCount; j++) {
          const isCustomerReply = j % 2 !== 0
          await db.insert(ticketReplies).values({
            ticketId,
            content: `这是第 ${j + 1} 条回复内容，解决了用户的问题。`,
            author: isCustomerReply ? customer.name : randomElement(AGENTS),
            isCustomer: isCustomerReply,
            createdAt: new Date(randomDate(createdAt, new Date())),
          })
        }
        const lastReplyTime = new Date(randomDate(createdAt, new Date()))
        await db.update(tickets).set({ updatedAt: lastReplyTime }).where(eq(tickets.id, ticketId))
      }
    }
  }
}

export async function getTickets(filters?: {
  status?: TicketStatus
  priority?: TicketPriority
  category?: TicketCategory
}): Promise<Ticket[]> {
  const db = await getDb()
  const conditions = []

  if (filters?.status) {
    conditions.push(eq(tickets.status, filters.status))
  }
  if (filters?.priority) {
    conditions.push(eq(tickets.priority, filters.priority))
  }
  if (filters?.category) {
    conditions.push(eq(tickets.category, filters.category))
  }

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(tickets)
          .where(and(...conditions))
      : await db.select().from(tickets)

  const sorted = rows.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  const result: Ticket[] = []
  for (const row of sorted) {
    result.push(await loadTicketWithReplies(row))
  }

  return result
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const db = await getDb()
  const numId = parseModuleId('ticket', id)
  if (numId === -1) return null

  const rows = await db.select().from(tickets).where(eq(tickets.id, numId))
  const row = rows[0]
  if (!row) return null

  return loadTicketWithReplies(row)
}

export async function createTicket(data: CreateTicketInput): Promise<Ticket> {
  const db = await getDb()
  const now = new Date()
  const result = await db
    .insert(tickets)
    .values({
      ticketNo: generateTicketNo(),
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      subject: data.subject,
      description: data.description,
      status: 'open',
      priority: data.priority,
      category: data.category,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return ticketWithoutReplies(result[0])
}

export async function updateTicket(id: string, data: UpdateTicketInput): Promise<Ticket | null> {
  const db = await getDb()
  const numId = parseModuleId('ticket', id)
  if (numId === -1) return null

  const updateData: Partial<TicketTable> = {
    updatedAt: new Date(),
  }
  if (data.status !== undefined && data.status !== null) {
    updateData.status = data.status
  }
  if (data.assignedTo !== undefined && data.assignedTo !== null) {
    updateData.assignedTo = data.assignedTo
  }

  const result = await db.update(tickets).set(updateData).where(eq(tickets.id, numId)).returning()

  if (result.length === 0) return null

  return loadTicketWithReplies(result[0])
}

export async function deleteTicket(id: string): Promise<{ message: string }> {
  const db = await getDb()
  const numId = parseModuleId('ticket', id)
  if (numId === -1) return { message: '工单不存在' }

  const result = await db.delete(tickets).where(eq(tickets.id, numId)).returning()
  if (result.length === 0) return { message: '工单不存在' }
  return { message: '工单已删除' }
}

export async function replyTicket(id: string, data: ReplyTicketInput): Promise<Ticket | null> {
  const db = await getDb()
  const numId = parseModuleId('ticket', id)
  if (numId === -1) return null

  const rows = await db.select().from(tickets).where(eq(tickets.id, numId))
  const ticket = rows[0]
  if (!ticket) return null

  const now = new Date()
  await db.insert(ticketReplies).values({
    ticketId: numId,
    content: data.content,
    author: data.author,
    isCustomer: false,
    createdAt: now,
  })

  const newStatus: TicketStatus = ticket.status === 'open' ? 'in_progress' : ticket.status
  await db.update(tickets).set({ status: newStatus, updatedAt: now }).where(eq(tickets.id, numId))

  return getTicketById(id)
}

export async function closeTicket(id: string): Promise<Ticket | null> {
  const db = await getDb()
  const numId = parseModuleId('ticket', id)
  if (numId === -1) return null

  const rows = await db.select().from(tickets).where(eq(tickets.id, numId))
  if (rows.length === 0) return null

  const result = await db
    .update(tickets)
    .set({ status: 'closed', updatedAt: new Date() })
    .where(eq(tickets.id, numId))
    .returning()

  if (result.length === 0) return null

  return loadTicketWithReplies(result[0])
}

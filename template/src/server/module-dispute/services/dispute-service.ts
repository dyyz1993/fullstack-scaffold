import { eq, desc, and } from 'drizzle-orm'
import type {
  Dispute,
  CreateDisputeInput,
  UpdateDisputeInput,
  ResolveDisputeInput,
  DisputeType,
  DisputeStatus,
} from '@shared/modules/dispute'
import { getDb } from '@server/db'
import { disputes, type DisputeTable } from '@server/db/schema'
import { toISOString } from '@server/utils/date'
import { generateDisputeNo, randomDate, randomElement } from '@server/utils/generate'
import { parseModuleId } from '@server/utils/id-helpers'

export async function seedDisputesIfEmpty(): Promise<void> {
  const db = await getDb()
  const existing = await db.select().from(disputes).all()
  if (existing.length === 0) {
    const DISPUTE_TYPES: DisputeType[] = [
      'refund',
      'product_quality',
      'service_quality',
      'delivery',
      'other',
    ]
    const DISPUTE_STATUSES: DisputeStatus[] = ['pending', 'investigating', 'resolved', 'rejected']
    const DESCRIPTIONS = [
      '商品与描述不符，要求退款',
      '商品质量问题，要求换货',
      '服务态度差，要求赔偿',
      '配送延迟，要求补偿',
      '订单金额错误，要求更正',
    ]
    const RESOLUTIONS = [
      '已同意退款，3-5个工作日内到账',
      '已安排换货，预计3天内送达',
      '已发放优惠券作为补偿',
      '已部分退款，问题已解决',
      '经核实，驳回争议申请',
    ]
    const NAMES = ['张三', '李四', '王五', '赵六', '钱七']
    const EMAILS = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'qianqi']

    for (let i = 0; i < 15; i++) {
      const type = randomElement(DISPUTE_TYPES)
      const status = randomElement(DISPUTE_STATUSES)
      const createdAt = new Date(randomDate(new Date('2024-01-01'), new Date()))
      const isResolved = status === 'resolved' || status === 'rejected'

      await db.insert(disputes).values({
        disputeNo: generateDisputeNo(),
        orderId: `order-${Math.floor(Math.random() * 25) + 1}`,
        orderNo: `ORD${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        customerName: NAMES[i % 5],
        customerEmail: `${EMAILS[i % 5]}@example.com`,
        type,
        status,
        description: randomElement(DESCRIPTIONS),
        resolution: isResolved ? randomElement(RESOLUTIONS) : null,
        amount: Math.floor(Math.random() * 5000) + 100,
        createdAt,
        updatedAt: isResolved ? new Date(randomDate(createdAt, new Date())) : createdAt,
        resolvedAt: isResolved ? new Date(randomDate(createdAt, new Date())) : null,
        resolvedBy: isResolved ? '客服小王' : null,
      })
    }
  }
}

function mapDisputeRow(row: DisputeTable): Dispute {
  return {
    id: `dispute-${row.id}`,
    disputeNo: row.disputeNo,
    orderId: row.orderId,
    orderNo: row.orderNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    type: row.type,
    status: row.status,
    description: row.description,
    resolution: row.resolution ?? undefined,
    amount: row.amount,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
    resolvedAt: row.resolvedAt ? toISOString(row.resolvedAt) : undefined,
    resolvedBy: row.resolvedBy ?? undefined,
  }
}

export async function getDisputes(filters?: {
  status?: DisputeStatus
  type?: DisputeType
}): Promise<Dispute[]> {
  const db = await getDb()
  const conditions = []

  if (filters?.status) {
    conditions.push(eq(disputes.status, filters.status))
  }
  if (filters?.type) {
    conditions.push(eq(disputes.type, filters.type))
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(disputes)
          .where(and(...conditions))
          .orderBy(desc(disputes.createdAt))
      : await db.select().from(disputes).orderBy(desc(disputes.createdAt))

  return rows.map(mapDisputeRow)
}

export async function getDisputeById(id: string): Promise<Dispute | null> {
  const db = await getDb()
  const numId = parseModuleId('dispute', id)
  if (numId === -1) return null

  const rows = await db.select().from(disputes).where(eq(disputes.id, numId))
  const row = rows[0]
  if (!row) return null
  return mapDisputeRow(row)
}

export async function createDispute(data: CreateDisputeInput): Promise<Dispute> {
  const db = await getDb()
  const now = new Date()
  const result = await db
    .insert(disputes)
    .values({
      disputeNo: generateDisputeNo(),
      orderId: data.orderId,
      orderNo: data.orderNo,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      type: data.type,
      status: 'pending',
      description: data.description,
      amount: data.amount,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return mapDisputeRow(result[0])
}

export async function updateDispute(id: string, data: UpdateDisputeInput): Promise<Dispute | null> {
  const db = await getDb()
  const numId = parseModuleId('dispute', id)
  if (numId === -1) return null

  const updateData: Partial<DisputeTable> = {
    updatedAt: new Date(),
  }
  if (data.status !== undefined && data.status !== null) {
    updateData.status = data.status
  }
  if (data.resolution !== undefined && data.resolution !== null) {
    updateData.resolution = data.resolution
  }

  const result = await db.update(disputes).set(updateData).where(eq(disputes.id, numId)).returning()

  if (result.length === 0) return null
  return mapDisputeRow(result[0])
}

export async function deleteDispute(id: string): Promise<{ success: boolean; message: string }> {
  const db = await getDb()
  const numId = parseModuleId('dispute', id)
  if (numId === -1) return { success: false, message: '争议不存在' }

  const result = await db.delete(disputes).where(eq(disputes.id, numId)).returning()
  if (result.length === 0) return { success: false, message: '争议不存在' }
  return { success: true, message: '争议已删除' }
}

export async function investigateDispute(id: string): Promise<Dispute | null> {
  const db = await getDb()
  const numId = parseModuleId('dispute', id)
  if (numId === -1) return null

  const rows = await db.select().from(disputes).where(eq(disputes.id, numId))
  const dispute = rows[0]
  if (!dispute || dispute.status !== 'pending') return null

  const result = await db
    .update(disputes)
    .set({ status: 'investigating', updatedAt: new Date() })
    .where(eq(disputes.id, numId))
    .returning()

  return mapDisputeRow(result[0])
}

export async function resolveDispute(
  id: string,
  data: ResolveDisputeInput
): Promise<Dispute | null> {
  const db = await getDb()
  const numId = parseModuleId('dispute', id)
  if (numId === -1) return null

  const rows = await db.select().from(disputes).where(eq(disputes.id, numId))
  const dispute = rows[0]
  if (!dispute || (dispute.status !== 'pending' && dispute.status !== 'investigating')) return null

  const now = new Date()
  const result = await db
    .update(disputes)
    .set({
      status: 'resolved',
      resolution: data.resolution,
      resolvedAt: now,
      resolvedBy: data.resolvedBy,
      updatedAt: now,
    })
    .where(eq(disputes.id, numId))
    .returning()

  return mapDisputeRow(result[0])
}

export async function rejectDispute(
  id: string,
  reason: string,
  rejectedBy: string
): Promise<Dispute | null> {
  const db = await getDb()
  const numId = parseModuleId('dispute', id)
  if (numId === -1) return null

  const rows = await db.select().from(disputes).where(eq(disputes.id, numId))
  const dispute = rows[0]
  if (!dispute || (dispute.status !== 'pending' && dispute.status !== 'investigating')) return null

  const now = new Date()
  const result = await db
    .update(disputes)
    .set({
      status: 'rejected',
      resolution: reason,
      resolvedAt: now,
      resolvedBy: rejectedBy,
      updatedAt: now,
    })
    .where(eq(disputes.id, numId))
    .returning()

  return mapDisputeRow(result[0])
}

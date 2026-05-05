import { eq, desc, and, like, or } from 'drizzle-orm'
import type { Order, CreateOrderInput, UpdateOrderInput, OrderStatus } from '@shared/modules/order'
import { getDb } from '../../db'
import { orders, type OrderTable } from '../../db/schema'
import { toISOString } from '../../utils/date'
import { generateOrderNo, randomDate, randomElement } from '@server/utils/generate'
import { parseModuleId } from '../../utils/id-helpers'

export async function seedOrdersIfEmpty(): Promise<void> {
  const db = await getDb()
  const existing = await db.select().from(orders).all()
  if (existing.length === 0) {
    const STATUSES: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled', 'disputed']
    const CUSTOMERS = [
      { name: '张三', email: 'zhangsan@example.com' },
      { name: '李四', email: 'lisi@example.com' },
      { name: '王五', email: 'wangwu@example.com' },
      { name: '赵六', email: 'zhaoliu@example.com' },
      { name: '钱七', email: 'qianqi@example.com' },
    ]
    const PRODUCTS = [
      '高级会员订阅',
      '专业版软件授权',
      '企业级解决方案',
      '数据分析服务',
      '技术支持套餐',
      '定制开发服务',
    ]

    for (let i = 0; i < 25; i++) {
      const customer = randomElement(CUSTOMERS)
      const product = randomElement(PRODUCTS)
      const status = randomElement(STATUSES)
      const createdAt = new Date(randomDate(new Date('2024-01-01'), new Date()))

      await db.insert(orders).values({
        orderNo: generateOrderNo(),
        customerName: customer.name,
        customerEmail: customer.email,
        productName: product,
        amount: Math.floor(Math.random() * 10000) + 100,
        status,
        createdAt,
        updatedAt: new Date(randomDate(createdAt, new Date())),
      })
    }
  }
}

export async function getOrders(filters?: {
  status?: OrderStatus
  customerName?: string
}): Promise<Order[]> {
  const db = await getDb()
  const conditions = []

  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status))
  }
  if (filters?.customerName) {
    conditions.push(
      or(
        like(orders.customerName, `%${filters.customerName}%`),
        like(orders.customerEmail, `%${filters.customerName}%`)
      )!
    )
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(orders)
          .where(and(...conditions))
          .orderBy(desc(orders.createdAt))
      : await db.select().from(orders).orderBy(desc(orders.createdAt))

  return rows.map((row: OrderTable) => ({
    id: `order-${row.id}`,
    orderNo: row.orderNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    productName: row.productName,
    amount: row.amount,
    status: row.status,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }))
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = await getDb()
  const numId = parseModuleId('order', id)
  if (numId === -1) return null

  const rows = await db.select().from(orders).where(eq(orders.id, numId))
  const row = rows[0]
  if (!row) return null

  return {
    id: `order-${row.id}`,
    orderNo: row.orderNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    productName: row.productName,
    amount: row.amount,
    status: row.status,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }
}

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  const db = await getDb()
  const now = new Date()
  const result = await db
    .insert(orders)
    .values({
      orderNo: generateOrderNo(),
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      productName: data.productName,
      amount: data.amount,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  const row = result[0]
  return {
    id: `order-${row.id}`,
    orderNo: row.orderNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    productName: row.productName,
    amount: row.amount,
    status: row.status,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }
}

export async function updateOrder(id: string, data: UpdateOrderInput): Promise<Order | null> {
  const db = await getDb()
  const numId = parseModuleId('order', id)
  if (numId === -1) return null

  const updateData: Partial<OrderTable> = {
    updatedAt: new Date(),
  }
  if (data.status !== undefined && data.status !== null) {
    updateData.status = data.status
  }

  const result = await db.update(orders).set(updateData).where(eq(orders.id, numId)).returning()

  if (result.length === 0) return null
  const row = result[0]
  return {
    id: `order-${row.id}`,
    orderNo: row.orderNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    productName: row.productName,
    amount: row.amount,
    status: row.status,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }
}

export async function deleteOrder(id: string): Promise<{ message: string }> {
  const db = await getDb()
  const numId = parseModuleId('order', id)
  if (numId === -1) return { message: '订单不存在' }

  const result = await db.delete(orders).where(eq(orders.id, numId)).returning()
  if (result.length === 0) return { message: '订单不存在' }
  return { message: '订单已删除' }
}

export async function processOrder(id: string): Promise<Order | null> {
  const db = await getDb()
  const numId = parseModuleId('order', id)
  if (numId === -1) return null

  const rows = await db.select().from(orders).where(eq(orders.id, numId))
  const order = rows[0]
  if (!order || order.status !== 'pending') return null

  const result = await db
    .update(orders)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(orders.id, numId))
    .returning()

  const row = result[0]
  return {
    id: `order-${row.id}`,
    orderNo: row.orderNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    productName: row.productName,
    amount: row.amount,
    status: row.status,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }
}

export async function cancelOrder(id: string): Promise<Order | null> {
  const db = await getDb()
  const numId = parseModuleId('order', id)
  if (numId === -1) return null

  const rows = await db.select().from(orders).where(eq(orders.id, numId))
  const order = rows[0]
  if (!order || (order.status !== 'pending' && order.status !== 'processing')) return null

  const result = await db
    .update(orders)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(orders.id, numId))
    .returning()

  const row = result[0]
  return {
    id: `order-${row.id}`,
    orderNo: row.orderNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    productName: row.productName,
    amount: row.amount,
    status: row.status,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }
}

export async function completeOrder(id: string): Promise<Order | null> {
  const db = await getDb()
  const numId = parseModuleId('order', id)
  if (numId === -1) return null

  const rows = await db.select().from(orders).where(eq(orders.id, numId))
  const order = rows[0]
  if (!order || order.status !== 'processing') return null

  const result = await db
    .update(orders)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(eq(orders.id, numId))
    .returning()

  const row = result[0]
  return {
    id: `order-${row.id}`,
    orderNo: row.orderNo,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    productName: row.productName,
    amount: row.amount,
    status: row.status,
    createdAt: toISOString(row.createdAt),
    updatedAt: toISOString(row.updatedAt),
  }
}

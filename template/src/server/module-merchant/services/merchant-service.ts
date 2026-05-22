import { eq, desc, and } from 'drizzle-orm'
import type {
  Merchant,
  MerchantLoginInput,
  MerchantStats,
  Product,
  CreateProductInput,
} from '@shared/schemas'
import { getDb } from '@server/db'
import { merchants, products } from '@server/db/schema'
import { createModuleLoggerSync } from '../../utils/logger'
import { AuthenticationError } from '../../utils/app-error'

const log = createModuleLoggerSync('merchant-service')

// ==================== Merchant Functions ====================

export async function getMerchantByUserId(userId: string): Promise<Merchant | null> {
  const db = await getDb()
  const rows = await db.select().from(merchants).where(eq(merchants.userId, userId))

  if (rows.length === 0) return null

  const row = rows[0]

  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    businessName: row.businessName,
    businessType: row.businessType as 'retail' | 'wholesale' | 'service' | 'restaurant',
    status: row.status as 'active' | 'inactive' | 'suspended',
    description: row.description,
    phone: row.phone,
    email: row.email,
    address: row.address,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getMerchantById(id: number): Promise<Merchant | null> {
  const db = await getDb()
  const rows = await db.select().from(merchants).where(eq(merchants.id, id))

  if (rows.length === 0) return null

  const row = rows[0]

  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    businessName: row.businessName,
    businessType: row.businessType as 'retail' | 'wholesale' | 'service' | 'restaurant',
    status: row.status as 'active' | 'inactive' | 'suspended',
    description: row.description,
    phone: row.phone,
    email: row.email,
    address: row.address,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function merchantLogin(
  input: MerchantLoginInput
): Promise<{ token: string; merchant: Merchant }> {
  const db = await getDb()

  // Find merchant by username
  const rows = await db.select().from(merchants).where(eq(merchants.userId, input.username))

  if (rows.length === 0) {
    throw new AuthenticationError('Invalid credentials')
  }

  const merchant = rows[0]

  // Check password (simplified for demo - use bcrypt in production)
  if (merchant.password !== input.password) {
    throw new AuthenticationError('Invalid credentials')
  }

  // Check merchant status
  if (merchant.status === 'suspended') {
    throw new AuthenticationError('Account is suspended')
  }

  if (merchant.status === 'inactive') {
    throw new AuthenticationError('Account is inactive')
  }

  // Generate token (simplified for demo - use JWT in production)
  const token = `merchant-token-${merchant.id}-${Date.now()}`

  log.info({ merchantId: merchant.id }, 'Merchant logged in')

  const merchantData: Merchant = {
    id: merchant.id,
    userId: merchant.userId,
    tenantId: merchant.tenantId,
    businessName: merchant.businessName,
    businessType: merchant.businessType as 'retail' | 'wholesale' | 'service' | 'restaurant',
    status: merchant.status as 'active' | 'inactive' | 'suspended',
    description: merchant.description,
    phone: merchant.phone,
    email: merchant.email,
    address: merchant.address,
    createdAt: merchant.createdAt,
    updatedAt: merchant.updatedAt,
  }

  return { token, merchant: merchantData }
}

export async function getMerchantStats(merchantId: number): Promise<MerchantStats> {
  const db = await getDb()

  // Get product counts
  const allProducts = await db.select().from(products).where(eq(products.merchantId, merchantId))
  const activeProducts = allProducts.filter(p => p.status === 'active').length

  // Get order stats (simplified - in production, query orders table)
  const totalOrders = 0 // TODO: Implement order stats
  const totalRevenue = 0 // TODO: Implement revenue stats
  const pendingOrders = 0 // TODO: Implement pending order count
  const thisMonthRevenue = 0 // TODO: Implement monthly revenue

  return {
    totalOrders,
    totalRevenue,
    totalProducts: allProducts.length,
    activeProducts,
    pendingOrders,
    thisMonthRevenue,
  }
}

// ==================== Product Functions ====================

export async function listProducts(
  merchantId: number,
  page = 1,
  pageSize = 20,
  status?: 'active' | 'inactive' | 'out_of_stock'
): Promise<{ items: Product[]; total: number; page: number; pageSize: number }> {
  const db = await getDb()
  const offset = (page - 1) * pageSize

  const whereConditions = [eq(products.merchantId, merchantId)]
  if (status) {
    whereConditions.push(eq(products.status, status))
  }

  const baseQuery = db
    .select()
    .from(products)
    .where(and(...whereConditions))

  const rows = await baseQuery.orderBy(desc(products.createdAt)).limit(pageSize).offset(offset)

  const countRows = await baseQuery
  const total = countRows.length

  const items: Product[] = rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: row.price,
    status: row.status as 'active' | 'inactive' | 'out_of_stock',
    stock: row.stock,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  return { items, total, page, pageSize }
}

export async function createProduct(
  merchantId: number,
  input: CreateProductInput
): Promise<Product> {
  const db = await getDb()

  const now = new Date()
  const productId = `product-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  const result = await db
    .insert(products)
    .values({
      id: productId,
      merchantId,
      name: input.name,
      description: input.description || null,
      price: input.price,
      status: input.status || 'active',
      stock: input.stock || 0,
      imageUrl: input.imageUrl || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  const row = result[0]

  log.info({ productId, merchantId }, 'Product created')

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: row.price,
    status: row.status as 'active' | 'inactive' | 'out_of_stock',
    stock: row.stock,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getProductById(productId: string): Promise<Product | null> {
  const db = await getDb()
  const rows = await db.select().from(products).where(eq(products.id, productId))

  if (rows.length === 0) return null

  const row = rows[0]

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: row.price,
    status: row.status as 'active' | 'inactive' | 'out_of_stock',
    stock: row.stock,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ==================== Seed Functions ====================

const seedMerchants = [
  {
    userId: 'merchant-1',
    tenantId: 1,
    businessName: 'Demo Store',
    businessType: 'retail' as const,
    status: 'active' as const,
    description: 'A demo retail store',
    phone: '13800138000',
    email: 'merchant@example.com',
    address: '123 Main St',
    password: 'password123',
  },
  {
    userId: 'merchant-2',
    tenantId: 1,
    businessName: 'Tech Shop',
    businessType: 'service' as const,
    status: 'active' as const,
    description: null,
    phone: null,
    email: null,
    address: null,
    password: 'password123',
  },
]

export async function seedMerchantsIfEmpty(): Promise<void> {
  const db = await getDb()

  const existing = await db.select().from(merchants).limit(1)
  if (existing.length > 0) {
    log.info({}, 'Merchants already seeded, skipping')
    return
  }

  const now = new Date().toISOString()
  for (const merchant of seedMerchants) {
    await db.insert(merchants).values({
      ...merchant,
      createdAt: now,
      updatedAt: now,
    })
  }

  log.info({ count: seedMerchants.length }, 'Merchants seeded')
}

import { eq, desc, like } from 'drizzle-orm'
import type { Tenant, CreateTenantInput, UpdateTenantInput } from '@shared/schemas'
import { getDb } from '@server/db'
import { tenants, type TenantTable, type NewTenant } from '@server/db/schema'
import { createModuleLoggerSync } from '../../utils/logger'
import { ValidationError } from '../../utils/app-error'

const log = createModuleLoggerSync('tenant-service')

export async function seedTenantsIfEmpty(): Promise<void> {
  const db = await getDb()
  const existing = await db.select().from(tenants)
  if (existing.length === 0) {
    log.info({}, 'Seeding tenants...')

    const now = new Date().toISOString()

    const sampleTenants: NewTenant[] = [
      {
        name: 'Demo Corp',
        slug: 'demo',
        status: 'active',
        plan: 'pro',
        maxUsers: 50,
        settings: JSON.stringify({ theme: 'dark', language: 'en' }),
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Test Inc',
        slug: 'test',
        status: 'trial',
        plan: 'free',
        maxUsers: 5,
        settings: null,
        createdAt: now,
        updatedAt: now,
      },
    ]

    await db.insert(tenants).values(sampleTenants)

    log.info({}, 'Tenants seeding complete!')
  }
}

export async function listTenants(
  page = 1,
  pageSize = 20,
  filters: { status?: string; plan?: string; search?: string } = {}
): Promise<{ items: Tenant[]; total: number; page: number; pageSize: number }> {
  const db = await getDb()
  const offset = (page - 1) * pageSize

  let baseQuery = db.select().from(tenants)

  if (filters.status) {
    baseQuery = baseQuery.where(
      eq(tenants.status, filters.status as 'active' | 'suspended' | 'trial')
    ) as typeof baseQuery
  }

  if (filters.plan) {
    baseQuery = baseQuery.where(
      eq(tenants.plan, filters.plan as 'free' | 'starter' | 'pro' | 'enterprise')
    ) as typeof baseQuery
  }

  if (filters.search) {
    baseQuery = baseQuery.where(like(tenants.name, `%${filters.search}%`)) as typeof baseQuery
  }

  const rows = await baseQuery.orderBy(desc(tenants.createdAt)).limit(pageSize).offset(offset)

  let countQuery = db.select().from(tenants)

  if (filters.status) {
    countQuery = countQuery.where(
      eq(tenants.status, filters.status as 'active' | 'suspended' | 'trial')
    ) as typeof countQuery
  }

  if (filters.plan) {
    countQuery = countQuery.where(
      eq(tenants.plan, filters.plan as 'free' | 'starter' | 'pro' | 'enterprise')
    ) as typeof countQuery
  }

  if (filters.search) {
    countQuery = countQuery.where(like(tenants.name, `%${filters.search}%`)) as typeof countQuery
  }

  const countRows = await countQuery
  const total = countRows.length

  const items: Tenant[] = rows.map((row: TenantTable) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))

  return { items, total, page, pageSize }
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const db = await getDb()
  const rows = await db.select().from(tenants).where(eq(tenants.slug, slug))

  if (rows.length === 0) return null

  const row = rows[0]

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getTenantById(id: number): Promise<Tenant | null> {
  const db = await getDb()
  const rows = await db.select().from(tenants).where(eq(tenants.id, id))

  if (rows.length === 0) return null

  const row = rows[0]

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const db = await getDb()

  const existing = await db.select().from(tenants).where(eq(tenants.slug, input.slug))

  if (existing.length > 0) {
    throw new ValidationError(`Tenant with slug '${input.slug}' already exists`)
  }

  const now = new Date().toISOString()
  const result = await db
    .insert(tenants)
    .values({
      name: input.name,
      slug: input.slug,
      status: 'trial',
      plan: input.plan,
      maxUsers: input.maxUsers,
      settings: input.settings ? JSON.stringify(input.settings) : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  const row = result[0]

  log.info({ tenantId: row.id, slug: row.slug }, 'Tenant created')

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function updateTenant(id: number, input: UpdateTenantInput): Promise<Tenant | null> {
  const db = await getDb()

  const existing = await db.select().from(tenants).where(eq(tenants.id, id))

  if (existing.length === 0) return null

  const updateData: Partial<TenantTable> = {
    updatedAt: new Date().toISOString(),
  }

  if (input.name !== undefined) {
    updateData.name = input.name ?? undefined
  }

  if (input.status !== undefined && input.status !== null) {
    updateData.status = input.status
  }

  if (input.plan !== undefined && input.plan !== null) {
    updateData.plan = input.plan
  }

  if (input.maxUsers !== undefined && input.maxUsers !== null) {
    updateData.maxUsers = input.maxUsers
  }

  if (input.settings !== undefined) {
    updateData.settings = input.settings ? JSON.stringify(input.settings) : null
  }

  const result = await db.update(tenants).set(updateData).where(eq(tenants.id, id)).returning()

  if (result.length === 0) return null

  const row = result[0]

  log.info({ tenantId: row.id, slug: row.slug }, 'Tenant updated')

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function deleteTenant(id: number): Promise<boolean> {
  const db = await getDb()

  const result = await db.delete(tenants).where(eq(tenants.id, id)).returning()

  if (result.length > 0) {
    log.info({ tenantId: id }, 'Tenant deleted')
    return true
  }

  return false
}

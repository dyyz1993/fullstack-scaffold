import { getDb } from '../index'
import { tenants, tenantRoles, tenantMembers } from '../schema'
import { TENANT_ROLE_TEMPLATES } from '@platform/shared/permission/tenant-role-templates'
import { eq } from 'drizzle-orm'

export async function seedTenantData() {
  const db = await getDb()

  const demoTenantId = 'tenant_demo'
  const demoOwnerId = 'user_demo_owner'

  const existingTenant = await db.select().from(tenants).where(eq(tenants.id, demoTenantId))
  if (existingTenant.length > 0) {
    return
  }

  await db.insert(tenants).values({
    id: demoTenantId,
    code: 'demo-company',
    name: '演示公司',
    slug: 'demo-company',
    description: '这是一个演示租户，用于展示多租户功能',
    plan: 'pro',
    status: 'active',
    maxMembers: 50,
    maxStorage: 10737418240,
    ownerId: demoOwnerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const roleInserts = TENANT_ROLE_TEMPLATES.map((template, index) => ({
    id: `tr_demo_${template.code}`,
    tenantId: demoTenantId,
    code: template.code,
    name: template.name,
    label: template.label,
    description: template.description,
    permissions: JSON.stringify(template.permissions),
    isSystem: true,
    isActive: true,
    sortOrder: index,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  await db.insert(tenantRoles).values(roleInserts)

  await db.insert(tenantMembers).values({
    id: 'tm_demo_admin',
    tenantId: demoTenantId,
    userId: demoOwnerId,
    roleId: 'tr_demo_tenant_admin',
    status: 'active',
    invitedBy: null,
    invitedAt: null,
    joinedAt: new Date(),
    lastActiveAt: new Date(),
  })
}

export async function clearTenantData() {
  const db = await getDb()

  await db.delete(tenantMembers)
  await db.delete(tenantRoles)
  await db.delete(tenants)
}

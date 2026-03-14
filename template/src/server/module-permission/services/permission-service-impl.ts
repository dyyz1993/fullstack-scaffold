import { eq, and } from 'drizzle-orm'
import type { Permission, NewPermission } from '../../db/schema/permissions'
import { getDb } from '../../db'
import { permissions, rolePermissions } from '../../db/schema'
import { roleService } from './role-service'

export class PermissionService {
  async getAll(): Promise<Permission[]> {
    const db = await getDb()
    const rows = await db.select().from(permissions).where(eq(permissions.isActive, true))
    return rows
  }

  async getById(id: string): Promise<Permission | undefined> {
    const db = await getDb()
    const rows = await db.select().from(permissions).where(eq(permissions.id, id))
    return rows[0]
  }

  async getByCode(code: string): Promise<Permission | undefined> {
    const db = await getDb()
    const rows = await db.select().from(permissions).where(eq(permissions.code, code))
    return rows[0]
  }

  async getByCategory(category: string): Promise<Permission[]> {
    const db = await getDb()
    const rows = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.category, category), eq(permissions.isActive, true)))
    return rows
  }

  async create(data: NewPermission): Promise<Permission> {
    const db = await getDb()
    const rows = await db.insert(permissions).values(data).returning()
    return rows[0]
  }

  async update(id: string, data: Partial<NewPermission>): Promise<Permission | undefined> {
    const db = await getDb()
    const rows = await db.update(permissions).set(data).where(eq(permissions.id, id)).returning()
    return rows[0]
  }

  async delete(id: string): Promise<boolean> {
    const db = await getDb()
    const rows = await db
      .update(permissions)
      .set({ isActive: false })
      .where(eq(permissions.id, id))
      .returning()
    return rows.length > 0
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const db = await getDb()
    const rows = await db
      .select()
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))
    return rows.map(row => row.permissions)
  }

  async getUserPermissions(_userId: string, roleCode?: string): Promise<Permission[]> {
    if (!roleCode) {
      return []
    }

    const role = await roleService.getByCode(roleCode)
    if (!role) {
      return []
    }

    return this.getRolePermissions(role.id)
  }

  async hasPermission(_userId: string, permissionCode: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(_userId)
    return userPermissions.some(p => p.code === permissionCode)
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const db = await getDb()
    const existing = await db
      .select()
      .from(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId))
      )

    if (existing.length === 0) {
      await db.insert(rolePermissions).values({
        roleId,
        permissionId,
        createdAt: new Date(),
      })
    }
  }

  async revokePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const db = await getDb()
    await db
      .delete(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId))
      )
  }
}

export const permissionService = new PermissionService()

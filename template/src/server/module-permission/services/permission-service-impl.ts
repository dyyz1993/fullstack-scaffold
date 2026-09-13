import { eq, and } from 'drizzle-orm'
import type { Permission, NewPermission } from '@server/db/schema/permissions'
import type { RoleInfo, PermissionInfo, MenuItem } from '@shared/modules/permission'
import { Permission as PermissionEnum, Role } from '@shared/modules/permission'
import { getDb } from '@server/db'
import { permissions, rolePermissions, roles } from '@server/db/schema'
import { roleService } from './role-service'
import { logger } from '@server/utils/logger'
import { MENU_CONFIG, PAGE_PERMISSIONS, type PagePermissionConfig } from './permission-service'
import { getPermissionsByRole } from '@shared/modules/permission'

const STATIC_PERMISSIONS_BY_ROLE: Record<string, PermissionEnum[]> = {
  [Role.SUPER_ADMIN]: getPermissionsByRole(Role.SUPER_ADMIN),
  [Role.CUSTOMER_SERVICE]: getPermissionsByRole(Role.CUSTOMER_SERVICE),
  [Role.USER]: getPermissionsByRole(Role.USER),
}

function getStaticPermissionsByRoleCode(roleCode: string): PermissionEnum[] {
  return STATIC_PERMISSIONS_BY_ROLE[roleCode] ?? []
}

const log = logger.api()

export class PermissionService {
  async getAll(): Promise<Permission[]> {
    const db = await getDb()
    const rows = await db.select().from(permissions).where(eq(permissions.isActive, true))
    return rows
  }

  async getAllRoles(): Promise<RoleInfo[]> {
    const db = await getDb()
    const roleRows = await db.select().from(roles).where(eq(roles.isActive, true))

    const result: RoleInfo[] = []
    for (const role of roleRows) {
      const rolePerms = await this.getRolePermissions(role.id)
      result.push({
        role: role.code as Role,
        label: role.label,
        permissions: rolePerms.map(p => p.code as PermissionEnum),
      })
    }

    return result
  }

  async getAllPermissions(): Promise<PermissionInfo[]> {
    const db = await getDb()
    const rows = await db.select().from(permissions).where(eq(permissions.isActive, true))

    return rows.map(p => ({
      permission: p.code as PermissionEnum,
      label: p.label,
      category: p.category,
    }))
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

  async getUserPermissions(_userId: string, roleCode?: string): Promise<Array<{ code: string }>> {
    if (!roleCode) {
      return []
    }

    // DB（roles/role_permissions/permissions 表）有种子数据时以 DB 为准；
    // 共享演示库可能未跑种子——此时回退静态角色权限，
    // 保证 /permissions/init 与登录响应（静态 ROLE_PERMISSIONS）同源一致
    try {
      const role = await roleService.getByCode(roleCode)

      // 超级管理员拥有所有权限
      if (role && roleCode === 'super_admin') {
        const db = await getDb()
        const allPermissions = await db
          .select()
          .from(permissions)
          .where(eq(permissions.isActive, true))
        if (allPermissions.length > 0) return allPermissions
      }

      if (role) {
        const rolePerms = await this.getRolePermissions(role.id)
        if (rolePerms.length > 0) return rolePerms
      }
    } catch (error) {
      log.warn(
        { roleCode, error },
        'DB permission lookup failed, falling back to static permissions'
      )
    }

    return getStaticPermissionsByRoleCode(roleCode).map(code => ({ code }))
  }

  async hasPermission(
    _userId: string,
    permissionCode: string,
    roleCode?: string
  ): Promise<boolean> {
    if (roleCode === 'super_admin') {
      return true
    }

    if (roleCode) {
      const role = await roleService.getByCode(roleCode)
      if (role) {
        const rolePerms = await this.getRolePermissions(role.id)
        return rolePerms.some(p => p.code === permissionCode)
      }
    }

    const userRoles = await roleService.getUserRoles(_userId)
    for (const role of userRoles) {
      if (role.code === 'super_admin') {
        return true
      }
      const rolePermissions = await this.getRolePermissions(role.id)
      if (rolePermissions.some(p => p.code === permissionCode)) {
        return true
      }
    }
    return false
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
      log.info({ roleId, permissionId }, 'Assigning permission to role')
      await db.insert(rolePermissions).values({
        roleId,
        permissionId,
        createdAt: new Date(),
      })
    } else {
      log.debug({ roleId, permissionId }, 'Permission already assigned to role')
    }
  }

  async revokePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const db = await getDb()
    log.info({ roleId, permissionId }, 'Revoking permission from role')
    await db
      .delete(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId))
      )
  }

  async getUserMenuConfig(userId: string, roleCode?: string): Promise<MenuItem[]> {
    const userPermissions = await this.getUserPermissions(userId, roleCode)
    const permissionCodes = new Set(userPermissions.map(p => p.code))

    const hasAnyPermission = (perms: PermissionEnum[]): boolean => {
      if (!perms || perms.length === 0) return true
      return perms.some(p => permissionCodes.has(p))
    }

    const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(item => hasAnyPermission(item.permissions))
        .map(item => {
          if (item.children && item.children.length > 0) {
            const visibleChildren = item.children.filter(child =>
              hasAnyPermission(child.permissions)
            )
            if (visibleChildren.length === 0) {
              return null
            }
            return { ...item, children: visibleChildren }
          }
          return item
        })
        .filter((item): item is MenuItem => item !== null)
    }

    return filterMenuItems(MENU_CONFIG)
  }

  async getUserPagePermissions(userId: string, roleCode?: string): Promise<PagePermissionConfig[]> {
    const userPermissions = await this.getUserPermissions(userId, roleCode)
    const permissionCodes = new Set(userPermissions.map(p => p.code))

    const hasAllPermissions = (perms: PermissionEnum[]): boolean => {
      if (!perms || perms.length === 0) return true
      return perms.every(p => permissionCodes.has(p))
    }

    return PAGE_PERMISSIONS.filter(page => hasAllPermissions(page.requiredPermissions)).map(
      page => ({
        ...page,
        actions: page.actions.filter(action => hasAllPermissions(action.permissions)),
      })
    )
  }
}

export const permissionService = new PermissionService()

import type { Permission, NewPermission } from '../../db/schema/permissions'
import type { RolePermission } from '../../db/schema/role-permissions'

interface PermissionData {
  id: string
  code: string
  name: string
  label: string
  category: string
  description?: string | null
  sortOrder: number
}

interface RolePermissionData {
  roleId: string
  permissionId: string
}

const initialPermissions: PermissionData[] = [
  {
    id: 'perm_user_view',
    code: 'user:view',
    name: '查看用户',
    label: '查看用户',
    category: 'user',
    sortOrder: 1,
  },
  {
    id: 'perm_user_create',
    code: 'user:create',
    name: '创建用户',
    label: '创建用户',
    category: 'user',
    sortOrder: 2,
  },
  {
    id: 'perm_user_edit',
    code: 'user:edit',
    name: '编辑用户',
    label: '编辑用户',
    category: 'user',
    sortOrder: 3,
  },
  {
    id: 'perm_user_delete',
    code: 'user:delete',
    name: '删除用户',
    label: '删除用户',
    category: 'user',
    sortOrder: 4,
  },
  {
    id: 'perm_content_view',
    code: 'content:view',
    name: '查看内容',
    label: '查看内容',
    category: 'content',
    sortOrder: 10,
  },
  {
    id: 'perm_content_create',
    code: 'content:create',
    name: '创建内容',
    label: '创建内容',
    category: 'content',
    sortOrder: 11,
  },
  {
    id: 'perm_content_edit',
    code: 'content:edit',
    name: '编辑内容',
    label: '编辑内容',
    category: 'content',
    sortOrder: 12,
  },
  {
    id: 'perm_content_delete',
    code: 'content:delete',
    name: '删除内容',
    label: '删除内容',
    category: 'content',
    sortOrder: 13,
  },
  {
    id: 'perm_system_settings',
    code: 'system:settings',
    name: '系统设置',
    label: '系统设置',
    category: 'system',
    sortOrder: 20,
  },
  {
    id: 'perm_system_logs',
    code: 'system:logs',
    name: '查看日志',
    label: '查看日志',
    category: 'system',
    sortOrder: 21,
  },
  {
    id: 'perm_system_monitor',
    code: 'system:monitor',
    name: '系统监控',
    label: '系统监控',
    category: 'system',
    sortOrder: 22,
  },
  {
    id: 'perm_data_export',
    code: 'data:export',
    name: '数据导出',
    label: '数据导出',
    category: 'data',
    sortOrder: 30,
  },
  {
    id: 'perm_data_import',
    code: 'data:import',
    name: '数据导入',
    label: '数据导入',
    category: 'data',
    sortOrder: 31,
  },
  {
    id: 'perm_order_view',
    code: 'order:view',
    name: '查看订单',
    label: '查看订单',
    category: 'order',
    sortOrder: 40,
  },
  {
    id: 'perm_order_process',
    code: 'order:process',
    name: '处理订单',
    label: '处理订单',
    category: 'order',
    sortOrder: 41,
  },
  {
    id: 'perm_ticket_view',
    code: 'ticket:view',
    name: '查看工单',
    label: '查看工单',
    category: 'ticket',
    sortOrder: 50,
  },
  {
    id: 'perm_ticket_reply',
    code: 'ticket:reply',
    name: '回复工单',
    label: '回复工单',
    category: 'ticket',
    sortOrder: 51,
  },
  {
    id: 'perm_ticket_close',
    code: 'ticket:close',
    name: '关闭工单',
    label: '关闭工单',
    category: 'ticket',
    sortOrder: 52,
  },
]

const initialRolePermissions: RolePermissionData[] = [
  { roleId: 'role_super_admin', permissionId: 'perm_user_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_user_create' },
  { roleId: 'role_super_admin', permissionId: 'perm_user_edit' },
  { roleId: 'role_super_admin', permissionId: 'perm_user_delete' },
  { roleId: 'role_super_admin', permissionId: 'perm_content_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_content_create' },
  { roleId: 'role_super_admin', permissionId: 'perm_content_edit' },
  { roleId: 'role_super_admin', permissionId: 'perm_content_delete' },
  { roleId: 'role_super_admin', permissionId: 'perm_system_settings' },
  { roleId: 'role_super_admin', permissionId: 'perm_system_logs' },
  { roleId: 'role_super_admin', permissionId: 'perm_system_monitor' },
  { roleId: 'role_super_admin', permissionId: 'perm_data_export' },
  { roleId: 'role_super_admin', permissionId: 'perm_data_import' },
  { roleId: 'role_super_admin', permissionId: 'perm_order_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_order_process' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_view' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_reply' },
  { roleId: 'role_super_admin', permissionId: 'perm_ticket_close' },
  { roleId: 'role_customer_service', permissionId: 'perm_user_view' },
  { roleId: 'role_customer_service', permissionId: 'perm_content_view' },
  { roleId: 'role_customer_service', permissionId: 'perm_order_view' },
  { roleId: 'role_customer_service', permissionId: 'perm_order_process' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_view' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_reply' },
  { roleId: 'role_customer_service', permissionId: 'perm_ticket_close' },
  { roleId: 'role_customer_service', permissionId: 'perm_data_export' },
  { roleId: 'role_customer_service', permissionId: 'perm_system_logs' },
  { roleId: 'role_user', permissionId: 'perm_content_view' },
  { roleId: 'role_user', permissionId: 'perm_order_view' },
]

let permissions: Permission[] = []
let rolePermissions: RolePermission[] = []

export class PermissionService {
  constructor() {
    this.initializeData()
  }

  private initializeData() {
    if (permissions.length === 0) {
      permissions = initialPermissions.map(p => ({
        ...p,
        description: p.description ?? null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      rolePermissions = initialRolePermissions.map(rp => ({
        ...rp,
        createdAt: new Date(),
      }))
    }
  }

  async getAll(): Promise<Permission[]> {
    return permissions.filter(p => p.isActive)
  }

  async getById(id: string): Promise<Permission | undefined> {
    return permissions.find(p => p.id === id && p.isActive)
  }

  async getByCode(code: string): Promise<Permission | undefined> {
    return permissions.find(p => p.code === code && p.isActive)
  }

  async getByCategory(category: string): Promise<Permission[]> {
    return permissions.filter(p => p.category === category && p.isActive)
  }

  async create(data: NewPermission): Promise<Permission> {
    const permission: Permission = {
      id: data.id,
      code: data.code,
      name: data.name,
      label: data.label,
      category: data.category,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    permissions.push(permission)
    return permission
  }

  async update(id: string, data: Partial<NewPermission>): Promise<Permission | undefined> {
    const index = permissions.findIndex(p => p.id === id)
    if (index === -1) return undefined

    permissions[index] = {
      ...permissions[index],
      ...data,
      description: data.description ?? permissions[index].description,
      updatedAt: new Date(),
    }
    return permissions[index]
  }

  async delete(id: string): Promise<boolean> {
    const index = permissions.findIndex(p => p.id === id)
    if (index === -1) return false

    permissions[index].isActive = false
    permissions[index].updatedAt = new Date()
    return true
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const permissionIds = rolePermissions
      .filter(rp => rp.roleId === roleId)
      .map(rp => rp.permissionId)

    return permissions.filter(p => permissionIds.includes(p.id) && p.isActive)
  }

  async getUserPermissions(_userId: string): Promise<Permission[]> {
    return permissions.filter(p => p.isActive)
  }

  async hasPermission(_userId: string, permissionCode: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(_userId)
    return userPermissions.some(p => p.code === permissionCode)
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const exists = rolePermissions.some(
      rp => rp.roleId === roleId && rp.permissionId === permissionId
    )
    if (!exists) {
      rolePermissions.push({
        roleId,
        permissionId,
        createdAt: new Date(),
      })
    }
  }

  async revokePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const index = rolePermissions.findIndex(
      rp => rp.roleId === roleId && rp.permissionId === permissionId
    )
    if (index !== -1) {
      rolePermissions.splice(index, 1)
    }
  }
}

export const permissionService = new PermissionService()

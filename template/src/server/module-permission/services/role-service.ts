import type { Role, NewRole } from '../../db/schema/roles'
import type { UserRole } from '../../db/schema/user-roles'

interface RoleData {
  id: string
  code: string
  name: string
  label: string
  isSystem: boolean
  sortOrder: number
}

const initialRoles: RoleData[] = [
  {
    id: 'role_super_admin',
    code: 'super_admin',
    name: '超级管理员',
    label: '超级管理员',
    isSystem: true,
    sortOrder: 1,
  },
  {
    id: 'role_customer_service',
    code: 'customer_service',
    name: '客服人员',
    label: '客服人员',
    isSystem: true,
    sortOrder: 2,
  },
  {
    id: 'role_user',
    code: 'user',
    name: '普通用户',
    label: '普通用户',
    isSystem: true,
    sortOrder: 3,
  },
]

let roles: Role[] = []
const userRoles: UserRole[] = []

export class RoleService {
  constructor() {
    this.initializeData()
  }

  private initializeData() {
    if (roles.length === 0) {
      roles = initialRoles.map(r => ({
        ...r,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    }
  }

  async getAll(): Promise<Role[]> {
    return roles.filter(r => r.isActive)
  }

  async getById(id: string): Promise<Role | undefined> {
    return roles.find(r => r.id === id && r.isActive)
  }

  async getByCode(code: string): Promise<Role | undefined> {
    return roles.find(r => r.code === code && r.isActive)
  }

  async create(data: NewRole): Promise<Role> {
    const role: Role = {
      id: data.id,
      code: data.code,
      name: data.name,
      label: data.label,
      description: data.description ?? null,
      isSystem: data.isSystem ?? false,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    roles.push(role)
    return role
  }

  async update(id: string, data: Partial<NewRole>): Promise<Role | undefined> {
    const index = roles.findIndex(r => r.id === id)
    if (index === -1) return undefined

    roles[index] = {
      ...roles[index],
      ...data,
      description: data.description ?? roles[index].description,
      updatedAt: new Date(),
    }
    return roles[index]
  }

  async delete(id: string): Promise<boolean> {
    const role = roles.find(r => r.id === id)
    if (!role || role.isSystem) return false

    const index = roles.findIndex(r => r.id === id)
    if (index === -1) return false

    roles[index].isActive = false
    roles[index].updatedAt = new Date()
    return true
  }

  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string): Promise<void> {
    const exists = userRoles.some(ur => ur.userId === userId && ur.roleId === roleId && ur.isActive)
    if (!exists) {
      userRoles.push({
        id: `ur_${Date.now()}`,
        userId,
        roleId,
        assignedBy: assignedBy ?? null,
        assignedAt: new Date(),
        expiresAt: null,
        isActive: true,
      })
    }
  }

  async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const index = userRoles.findIndex(
      ur => ur.userId === userId && ur.roleId === roleId && ur.isActive
    )
    if (index !== -1) {
      userRoles[index].isActive = false
    }
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const roleIds = userRoles.filter(ur => ur.userId === userId && ur.isActive).map(ur => ur.roleId)

    return roles.filter(r => roleIds.includes(r.id) && r.isActive)
  }
}

export const roleService = new RoleService()

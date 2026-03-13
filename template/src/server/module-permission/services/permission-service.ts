import {
  Role,
  Permission,
  ROLE_LABELS,
  PERMISSION_LABELS,
  PERMISSION_CATEGORIES,
  getPermissionsByRole,
} from '@shared/modules/permission'
import type { RoleInfo, PermissionInfo, UserPermissions } from '@shared/modules/permission'

export function getAllRoles(): RoleInfo[] {
  return Object.values(Role).map(role => ({
    role,
    label: ROLE_LABELS[role],
    permissions: getPermissionsByRole(role),
  }))
}

export function getAllPermissions(): PermissionInfo[] {
  return Object.values(Permission).map(permission => {
    let category = 'other'
    for (const [key, value] of Object.entries(PERMISSION_CATEGORIES)) {
      if (value.permissions.includes(permission)) {
        category = key
        break
      }
    }

    return {
      permission,
      label: PERMISSION_LABELS[permission],
      category,
    }
  })
}

export function getUserPermissions(userId: string, role: Role): UserPermissions {
  return {
    userId,
    role,
    permissions: getPermissionsByRole(role),
  }
}

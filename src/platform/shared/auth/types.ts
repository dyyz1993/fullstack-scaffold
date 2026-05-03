import type { Permission, Role } from '@platform/shared/permission'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: Role
  avatar?: string
  permissions: Permission[]
}

export interface AuthMiddlewareOptions {
  secretKey?: string
  requiredRole?: Role
  requiredPermissions?: Permission[]
}

export type UserRole = Role

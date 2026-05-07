export interface PermissionService {
  hasPermission(userId: string, permission: string): Promise<boolean>
}

export const permissionService: PermissionService = {
  async hasPermission(_userId: string, _permission: string): Promise<boolean> {
    return false
  },
}

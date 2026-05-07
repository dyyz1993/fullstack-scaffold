export interface Role {
  code: string
  name: string
}

export interface RoleService {
  getUserRoles(userId: string): Promise<Role[]>
}

export const roleService: RoleService = {
  async getUserRoles(_userId: string): Promise<Role[]> {
    return []
  },
}

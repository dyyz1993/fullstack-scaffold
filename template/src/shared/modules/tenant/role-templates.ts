import { TenantPermission } from './permissions'

export enum TenantRoleCode {
  ADMIN = 'tenant_admin',
  MEMBER = 'tenant_member',
  GUEST = 'tenant_guest',
}

export interface TenantRoleTemplate {
  code: TenantRoleCode
  name: string
  label: string
  description: string
  isSystem: boolean
  permissions: TenantPermission[]
}

/** 开租户时事务内播种的三个系统角色 */
export const TENANT_ROLE_TEMPLATES: TenantRoleTemplate[] = [
  {
    code: TenantRoleCode.ADMIN,
    name: 'tenant_admin',
    label: '租户管理员',
    description: '拥有租户内所有权限，可管理成员、角色和设置',
    isSystem: true,
    permissions: Object.values(TenantPermission),
  },
  {
    code: TenantRoleCode.MEMBER,
    name: 'tenant_member',
    label: '普通成员',
    description: '可访问租户数据，无法管理成员和设置',
    isSystem: true,
    permissions: [
      TenantPermission.MEMBER_VIEW,
      TenantPermission.ROLE_VIEW,
      TenantPermission.SETTINGS_VIEW,
      TenantPermission.DATA_VIEW,
      TenantPermission.DATA_CREATE,
      TenantPermission.DATA_EDIT,
      TenantPermission.DATA_DELETE,
      TenantPermission.DATA_EXPORT,
    ],
  },
  {
    code: TenantRoleCode.GUEST,
    name: 'tenant_guest',
    label: '访客',
    description: '只读权限，仅可查看数据',
    isSystem: true,
    permissions: [
      TenantPermission.MEMBER_VIEW,
      TenantPermission.ROLE_VIEW,
      TenantPermission.SETTINGS_VIEW,
      TenantPermission.DATA_VIEW,
    ],
  },
]

/** 套餐→自定义角色数上限（-1 不限），超限创建角色时真实拦截 */
export const PLAN_ROLE_LIMITS: Record<string, number> = {
  free: 3,
  starter: 5,
  pro: 10,
  enterprise: -1,
}

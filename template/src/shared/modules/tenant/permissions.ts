/**
 * 租户内权限点（与平台级 permission 模块区分：平台管全局，这里管租户内）。
 * 角色的 permissions 字段存本枚举值数组的 JSON。
 */
export enum TenantPermission {
  MEMBER_VIEW = 'tenant:member:view',
  MEMBER_INVITE = 'tenant:member:invite',
  MEMBER_REMOVE = 'tenant:member:remove',
  MEMBER_ROLE_ASSIGN = 'tenant:member:role:assign',

  ROLE_VIEW = 'tenant:role:view',
  ROLE_CREATE = 'tenant:role:create',
  ROLE_EDIT = 'tenant:role:edit',
  ROLE_DELETE = 'tenant:role:delete',

  SETTINGS_VIEW = 'tenant:settings:view',
  SETTINGS_EDIT = 'tenant:settings:edit',

  DATA_VIEW = 'tenant:data:view',
  DATA_CREATE = 'tenant:data:create',
  DATA_EDIT = 'tenant:data:edit',
  DATA_DELETE = 'tenant:data:delete',
  DATA_EXPORT = 'tenant:data:export',
  DATA_IMPORT = 'tenant:data:import',

  BILLING_VIEW = 'tenant:billing:view',
  BILLING_MANAGE = 'tenant:billing:manage',

  AUDIT_VIEW = 'tenant:audit:view',
}

export const TENANT_PERMISSION_VALUES = Object.values(TenantPermission)

export const TENANT_PERMISSION_LABELS: Record<TenantPermission, string> = {
  [TenantPermission.MEMBER_VIEW]: '查看成员',
  [TenantPermission.MEMBER_INVITE]: '邀请成员',
  [TenantPermission.MEMBER_REMOVE]: '移除成员',
  [TenantPermission.MEMBER_ROLE_ASSIGN]: '分配角色',
  [TenantPermission.ROLE_VIEW]: '查看角色',
  [TenantPermission.ROLE_CREATE]: '创建角色',
  [TenantPermission.ROLE_EDIT]: '编辑角色',
  [TenantPermission.ROLE_DELETE]: '删除角色',
  [TenantPermission.SETTINGS_VIEW]: '查看设置',
  [TenantPermission.SETTINGS_EDIT]: '编辑设置',
  [TenantPermission.DATA_VIEW]: '查看数据',
  [TenantPermission.DATA_CREATE]: '创建数据',
  [TenantPermission.DATA_EDIT]: '编辑数据',
  [TenantPermission.DATA_DELETE]: '删除数据',
  [TenantPermission.DATA_EXPORT]: '导出数据',
  [TenantPermission.DATA_IMPORT]: '导入数据',
  [TenantPermission.BILLING_VIEW]: '查看账单',
  [TenantPermission.BILLING_MANAGE]: '管理账单',
  [TenantPermission.AUDIT_VIEW]: '查看审计',
}

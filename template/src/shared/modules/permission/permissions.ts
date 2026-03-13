export enum Role {
  SUPER_ADMIN = 'super_admin',
  CUSTOMER_SERVICE = 'customer_service',
  USER = 'user',
}

export enum Permission {
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_EDIT = 'user:edit',
  USER_DELETE = 'user:delete',

  CONTENT_VIEW = 'content:view',
  CONTENT_CREATE = 'content:create',
  CONTENT_EDIT = 'content:edit',
  CONTENT_DELETE = 'content:delete',

  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_MONITOR = 'system:monitor',

  DATA_EXPORT = 'data:export',
  DATA_IMPORT = 'data:import',

  ORDER_VIEW = 'order:view',
  ORDER_PROCESS = 'order:process',

  TICKET_VIEW = 'ticket:view',
  TICKET_REPLY = 'ticket:reply',
  TICKET_CLOSE = 'ticket:close',
}

export interface RolePermissions {
  [Role.SUPER_ADMIN]: Permission[]
  [Role.CUSTOMER_SERVICE]: Permission[]
  [Role.USER]: Permission[]
}

export const ROLE_PERMISSIONS: RolePermissions = {
  [Role.SUPER_ADMIN]: Object.values(Permission),

  [Role.CUSTOMER_SERVICE]: [
    Permission.USER_VIEW,
    Permission.CONTENT_VIEW,
    Permission.ORDER_VIEW,
    Permission.ORDER_PROCESS,
    Permission.TICKET_VIEW,
    Permission.TICKET_REPLY,
    Permission.TICKET_CLOSE,
    Permission.DATA_EXPORT,
    Permission.SYSTEM_LOGS,
  ],

  [Role.USER]: [Permission.CONTENT_VIEW, Permission.ORDER_VIEW],
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '超级管理员',
  [Role.CUSTOMER_SERVICE]: '客服人员',
  [Role.USER]: '普通用户',
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.USER_VIEW]: '查看用户',
  [Permission.USER_CREATE]: '创建用户',
  [Permission.USER_EDIT]: '编辑用户',
  [Permission.USER_DELETE]: '删除用户',

  [Permission.CONTENT_VIEW]: '查看内容',
  [Permission.CONTENT_CREATE]: '创建内容',
  [Permission.CONTENT_EDIT]: '编辑内容',
  [Permission.CONTENT_DELETE]: '删除内容',

  [Permission.SYSTEM_SETTINGS]: '系统设置',
  [Permission.SYSTEM_LOGS]: '查看日志',
  [Permission.SYSTEM_MONITOR]: '系统监控',

  [Permission.DATA_EXPORT]: '数据导出',
  [Permission.DATA_IMPORT]: '数据导入',

  [Permission.ORDER_VIEW]: '查看订单',
  [Permission.ORDER_PROCESS]: '处理订单',

  [Permission.TICKET_VIEW]: '查看工单',
  [Permission.TICKET_REPLY]: '回复工单',
  [Permission.TICKET_CLOSE]: '关闭工单',
}

export const PERMISSION_CATEGORIES = {
  user: {
    label: '用户管理',
    permissions: [
      Permission.USER_VIEW,
      Permission.USER_CREATE,
      Permission.USER_EDIT,
      Permission.USER_DELETE,
    ],
  },
  content: {
    label: '内容管理',
    permissions: [
      Permission.CONTENT_VIEW,
      Permission.CONTENT_CREATE,
      Permission.CONTENT_EDIT,
      Permission.CONTENT_DELETE,
    ],
  },
  system: {
    label: '系统管理',
    permissions: [Permission.SYSTEM_SETTINGS, Permission.SYSTEM_LOGS, Permission.SYSTEM_MONITOR],
  },
  data: {
    label: '数据管理',
    permissions: [Permission.DATA_EXPORT, Permission.DATA_IMPORT],
  },
  order: {
    label: '订单管理',
    permissions: [Permission.ORDER_VIEW, Permission.ORDER_PROCESS],
  },
  ticket: {
    label: '工单管理',
    permissions: [Permission.TICKET_VIEW, Permission.TICKET_REPLY, Permission.TICKET_CLOSE],
  },
}

export function getPermissionsByRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission)
}

export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission))
}

import { Permission } from '@shared/modules/admin'

export interface PermissionConfig {
  key: string
  label: string
  permissions: Permission[]
  mode: 'any' | 'all'
}

export interface PagePermissionConfig {
  path: string
  label: string
  requiredPermissions?: Permission[]
  mode?: 'any' | 'all'
  actions?: PermissionConfig[]
}

export const PAGE_PERMISSIONS: PagePermissionConfig[] = [
  {
    path: '/admin/users',
    label: '用户管理',
    requiredPermissions: [Permission.USER_VIEW],
    actions: [
      {
        key: 'create',
        label: '创建用户',
        permissions: [Permission.USER_CREATE],
        mode: 'all',
      },
      {
        key: 'edit',
        label: '编辑用户',
        permissions: [Permission.USER_EDIT],
        mode: 'all',
      },
      {
        key: 'delete',
        label: '删除用户',
        permissions: [Permission.USER_DELETE],
        mode: 'all',
      },
    ],
  },
  {
    path: '/admin/content',
    label: '内容管理',
    requiredPermissions: [Permission.CONTENT_VIEW],
    actions: [
      {
        key: 'create',
        label: '创建内容',
        permissions: [Permission.CONTENT_CREATE],
        mode: 'all',
      },
      {
        key: 'edit',
        label: '编辑内容',
        permissions: [Permission.CONTENT_EDIT],
        mode: 'all',
      },
      {
        key: 'delete',
        label: '删除内容',
        permissions: [Permission.CONTENT_DELETE],
        mode: 'all',
      },
    ],
  },
  {
    path: '/admin/orders',
    label: '订单管理',
    requiredPermissions: [Permission.ORDER_VIEW],
    actions: [
      {
        key: 'process',
        label: '处理订单',
        permissions: [Permission.ORDER_PROCESS],
        mode: 'all',
      },
    ],
  },
  {
    path: '/admin/tickets',
    label: '工单管理',
    requiredPermissions: [Permission.TICKET_VIEW],
    actions: [
      {
        key: 'reply',
        label: '回复工单',
        permissions: [Permission.TICKET_REPLY],
        mode: 'all',
      },
      {
        key: 'close',
        label: '关闭工单',
        permissions: [Permission.TICKET_CLOSE],
        mode: 'all',
      },
    ],
  },
  {
    path: '/admin/settings',
    label: '系统设置',
    requiredPermissions: [Permission.SYSTEM_SETTINGS],
    actions: [],
  },
  {
    path: '/admin/logs',
    label: '系统日志',
    requiredPermissions: [Permission.SYSTEM_LOGS],
    actions: [],
  },
]

export function getPagePermission(path: string): PagePermissionConfig | undefined {
  return PAGE_PERMISSIONS.find(p => p.path === path)
}

export function getActionPermission(path: string, actionKey: string): PermissionConfig | undefined {
  const page = getPagePermission(path)
  if (!page || !page.actions) return undefined
  return page.actions.find(a => a.key === actionKey)
}

export function checkPageAccess(userPermissions: Permission[], path: string): boolean {
  const pageConfig = getPagePermission(path)
  if (!pageConfig || !pageConfig.requiredPermissions) return true

  const { requiredPermissions, mode = 'all' } = pageConfig

  if (mode === 'any') {
    return requiredPermissions.some(p => userPermissions.includes(p))
  }

  return requiredPermissions.every(p => userPermissions.includes(p))
}

export function checkActionAccess(
  userPermissions: Permission[],
  path: string,
  actionKey: string
): boolean {
  const actionConfig = getActionPermission(path, actionKey)
  if (!actionConfig) return true

  const { permissions, mode } = actionConfig

  if (mode === 'any') {
    return permissions.some(p => userPermissions.includes(p))
  }

  return permissions.every(p => userPermissions.includes(p))
}

import type { ResolvedPreset } from './template-generator'

const MODULE_EXPORTS: Record<string, { namedExports: string[]; hasTypeOnly?: boolean }> = {
  chat: {
    namedExports: ['ChatProtocolSchema', 'type ChatProtocol'],
  },
  todos: {
    namedExports: [
      'TodoSchema',
      'TodoStatusSchema',
      'CreateTodoSchema',
      'UpdateTodoSchema',
      'TodoIdSchema',
      'type Todo',
      'type TodoStatus',
      'type CreateTodoInput',
      'type UpdateTodoInput',
    ],
  },
  files: {
    namedExports: [
      'FileDownloadSchema',
      'PrivateFileQuerySchema',
      'PublicFileUrlSchema',
      'PrivateFileUrlSchema',
      'GenerateUrlRequestSchema',
      'FileUrlResponseSchema',
      'EmptySchema',
    ],
  },
  notifications: {
    namedExports: [
      'NotificationSchema',
      'NotificationTypeSchema',
      'CreateNotificationSchema',
      'NotificationListQuerySchema',
      'SSEEventSchema',
      'AppSSEProtocolSchema',
      'type AppNotification',
      'type NotificationType',
      'type CreateNotificationInput',
      'type NotificationListQuery',
      'type SSEEvent',
      'type AppSSEProtocol',
    ],
  },
  admin: {
    namedExports: [
      'SystemStatsSchema',
      'HealthCheckSchema',
      'RecentActivityItemSchema',
      'RecentActivitySchema',
      'AuthUserSchema',
      'ClearTodosResultSchema',
      'type SystemStats',
      'type HealthCheck',
      'type RecentActivityItem',
      'type AuthUserResponse',
      'type ClearTodosResult',
    ],
  },
  permission: {
    namedExports: [
      'RoleEnum',
      'RoleInfoSchema',
      'PermissionInfoSchema',
      'UserPermissionsSchema',
      'RoleListSchema',
      'PermissionListSchema',
      'Role',
      'Permission',
      'ROLE_PERMISSIONS',
      'ROLE_LABELS',
      'PERMISSION_LABELS',
      'PERMISSION_CATEGORIES',
      'getPermissionsByRole',
      'hasPermission',
      'hasAnyPermission',
      'hasAllPermissions',
      'type RoleType',
      'type RoleInfo',
      'type PermissionInfo',
      'type UserPermissions',
    ],
  },
  auth: {
    namedExports: [
      'DeveloperProfileSchema',
      'LoginSchema',
      'RegisterSchema',
      'TokenResponseSchema',
      'type DeveloperProfile',
      'type LoginInput',
      'type RegisterInput',
      'type TokenResponse',
    ],
  },
  plugin: {
    namedExports: [
      'PluginSchema',
      'PluginStatusSchema',
      'CreatePluginSchema',
      'UpdatePluginSchema',
      'PluginVersionStatusSchema',
      'VersionSchema',
      'CategorySchema',
      'ReviewSchema',
      'CreateReviewSchema',
      'MarketplaceStatsSchema',
      'PluginListResponseSchema',
      'AdminPluginSchema',
      'AdminDashboardStatsSchema',
      'PluginListQuerySchema',
      'PluginSlugSchema',
      'type Plugin',
      'type PluginStatus',
      'type CreatePluginInput',
      'type UpdatePluginInput',
      'type PluginVersionStatus',
      'type Version',
      'type Category',
      'type Review',
      'type CreateReviewInput',
      'type MarketplaceStats',
      'type PluginListResponse',
      'type AdminPlugin',
      'type AdminDashboardStats',
      'type PluginListQuery',
    ],
  },
  merchant: {
    namedExports: [
      'ProductSchema',
      'CreateProductSchema',
      'UpdateProductSchema',
      'ProductListSchema',
      'type Product',
      'type CreateProductInput',
      'type UpdateProductInput',
    ],
  },
  tenant: {
    namedExports: [
      'TenantSchema',
      'TenantStatusSchema',
      'TenantPlanSchema',
      'TenantSettingsSchema',
      'CreateTenantSchema',
      'UpdateTenantSchema',
      'TenantIdSchema',
      'TenantSlugSchema',
      'TenantListResponseSchema',
      'TenantQuerySchema',
      'TenantIdResponseSchema',
      'type Tenant',
      'type TenantStatus',
      'type TenantPlan',
      'type TenantSettings',
      'type CreateTenantInput',
      'type UpdateTenantInput',
      'type TenantId',
      'type TenantSlug',
      'type TenantListResponse',
      'type TenantQuery',
      'type TenantIdResponse',
    ],
  },
}

export function generateSharedModulesIndex(resolved: ResolvedPreset): string {
  const lines: string[] = []

  const moduleOrder = [
    'chat',
    'todos',
    'file',
    'notifications',
    'admin',
    'permission',
    'auth',
    'plugin',
    'merchant',
    'tenant',
  ]

  for (const moduleName of moduleOrder) {
    if (!resolved.modules.has(moduleName)) continue

    const manifest = resolved.modules.get(moduleName)!
    const exportKey = manifest.sharedSchemas?.path ?? moduleName
    const exports = MODULE_EXPORTS[exportKey]
    if (!exports) continue

    lines.push(`export {\n  ${exports.namedExports.join(',\n  ')},\n} from './${exportKey}'`)
  }

  return lines.join('\n') + '\n'
}

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
      'type PermissionRoleType',
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
  order: {
    namedExports: [
      'OrderStatusSchema',
      'OrderSchema',
      'CreateOrderSchema',
      'UpdateOrderSchema',
      'OrderListSchema',
      'OrderQuerySchema',
      'OrderDeleteResultSchema',
      'ProcessOrderSchema',
      'CancelOrderSchema',
      'RemoveCartItemResponseSchema',
      'ECommerceProductSchema',
      'ECommerceOrderStatusSchema',
      'ECommerceOrderSchema',
      'ECommerceOrderListSchema',
      'type OrderStatus',
      'type Order',
      'type CreateOrderInput',
      'type UpdateOrderInput',
      'type OrderDeleteResult',
      'type ProcessOrderInput',
      'type CancelOrderInput',
      'type OrderQueryInput',
      'type RemoveCartItemResponse',
      'type ECommerceProduct',
      'type ECommerceOrderStatus',
      'type ECommerceOrder',
    ],
  },
  ticket: {
    namedExports: [
      'TicketStatusSchema',
      'TicketPrioritySchema',
      'TicketCategorySchema',
      'TicketReplySchema',
      'TicketSchema',
      'CreateTicketSchema',
      'UpdateTicketSchema',
      'ReplyTicketSchema',
      'TicketListSchema',
      'TicketDeleteResultSchema',
      'type TicketStatus',
      'type TicketPriority',
      'type TicketCategory',
      'type TicketReply',
      'type Ticket',
      'type CreateTicketInput',
      'type UpdateTicketInput',
      'type ReplyTicketInput',
      'type TicketDeleteResult',
    ],
  },
  dispute: {
    namedExports: [
      'DisputeTypeSchema',
      'DisputeStatusSchema',
      'DisputeSchema',
      'CreateDisputeSchema',
      'UpdateDisputeSchema',
      'ResolveDisputeSchema',
      'DisputeListSchema',
      'DisputeDeleteResultSchema',
      'type DisputeType',
      'type DisputeStatus',
      'type Dispute',
      'type CreateDisputeInput',
      'type UpdateDisputeInput',
      'type ResolveDisputeInput',
      'type DisputeDeleteResult',
    ],
  },
  content: {
    namedExports: [
      'ContentCategorySchema',
      'ContentStatusSchema',
      'ContentSchema',
      'CreateContentSchema',
      'UpdateContentSchema',
      'ContentListSchema',
      'ContentDeleteResultSchema',
      'type ContentCategory',
      'type ContentStatus',
      'type Content',
      'type CreateContentInput',
      'type UpdateContentInput',
      'type ContentDeleteResult',
    ],
  },
  captcha: {
    namedExports: [
      'CaptchaResponseSchema',
      'VerifyCaptchaRequestSchema',
      'CaptchaVerifyResponseSchema',
      'type CaptchaResponse',
      'type VerifyCaptchaRequest',
      'type CaptchaVerifyResponse',
    ],
  },
  dashboard: {
    namedExports: [
      'DashboardStatSchema',
      'RevenueDataSchema',
      'ActivityStatusSchema',
      'ActivitySchema',
      'DashboardResponseSchema',
      'type DashboardStat',
      'type RevenueData',
      'type ActivityStatus',
      'type Activity',
      'type DashboardResponse',
    ],
  },
  cart: {
    namedExports: [
      'CartItemSchema',
      'CartSummarySchema',
      'CartResponseSchema',
      'AddCartItemSchema',
      'CartItemIdSchema',
      'type CartItem',
      'type CartSummary',
      'type CartResponse',
      'type AddCartItemInput',
    ],
  },
  community: {
    namedExports: [
      'TopicStatusSchema',
      'TopicTagSchema',
      'TopicAuthorSchema',
      'TopicSchema',
      'TopicsResponseSchema',
      'ProfileStatsSchema',
      'ActivityTypeSchema',
      'ProfileActivitySchema',
      'ProfileResponseSchema',
      'type TopicStatus',
      'type TopicTag',
      'type TopicAuthor',
      'type Topic',
      'type ProfileStats',
      'type ActivityType',
      'type ProfileActivity',
      'type ProfileResponse',
    ],
  },
  audit: {
    namedExports: ['ResourceTypeSchema', 'ActionTypeSchema', 'AuditLogSchema', 'type AuditLogType'],
  },
  role: {
    namedExports: [
      'RoleSchema',
      'CreateRoleSchema',
      'UpdateRoleSchema',
      'UpdateRolePermissionsSchema',
      'RoleSuccessSchema',
      'type RoleDataType',
      'type CreateRoleType',
      'type UpdateRoleType',
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
    'order',
    'ticket',
    'dispute',
    'content',
    'captcha',
  ]

  // Standalone shared modules: include when preset has pages or server modules that use them
  const STANDALONE_SHARED_MODULES: Record<string, { pages?: string[]; serverModules?: string[] }> =
    {
      cart: { pages: ['CartPage.tsx'] },
      community: { pages: ['TopicsPage.tsx', 'ProfilePage.tsx'], serverModules: ['content'] },
      dashboard: { pages: ['DashboardPage.tsx'] },
    }

  for (const moduleName of moduleOrder) {
    if (!resolved.modules.has(moduleName)) continue

    const manifest = resolved.modules.get(moduleName)!
    const exportKey = manifest.sharedSchemas?.path ?? moduleName
    const exports = MODULE_EXPORTS[exportKey]
    if (!exports) continue

    lines.push(`export {\n  ${exports.namedExports.join(',\n  ')},\n} from './${exportKey}'`)
  }

  // Export additional paths from manifests (e.g., 'role', 'audit' from permission module)
  const additionalExported = new Set<string>()
  for (const moduleName of moduleOrder) {
    if (!resolved.modules.has(moduleName)) continue

    const manifest = resolved.modules.get(moduleName)!
    if (manifest.sharedSchemas?.additionalPaths) {
      for (const extra of manifest.sharedSchemas.additionalPaths) {
        if (additionalExported.has(extra)) continue
        additionalExported.add(extra)

        const exports = MODULE_EXPORTS[extra]
        if (!exports) continue

        lines.push(`export {\n  ${exports.namedExports.join(',\n  ')},\n} from './${extra}'`)
      }
    }
  }

  // Standalone modules: include when preset has pages or server modules that use them
  for (const [moduleName, config] of Object.entries(STANDALONE_SHARED_MODULES)) {
    // Check if any module's clientPages includes a relevant page
    const hasRelevantPage =
      config.pages &&
      [...resolved.modules.values()].some(
        m => m.clientPages?.some(p => config.pages!.includes(p.name + '.tsx')) ?? false
      )
    // Check if any required server module is included
    const hasRelevantServerModule =
      config.serverModules?.some(sm => resolved.modules.has(sm)) ?? false
    if (!hasRelevantPage && !hasRelevantServerModule) continue

    const exports = MODULE_EXPORTS[moduleName]
    if (!exports) continue

    lines.push(`export {\n  ${exports.namedExports.join(',\n  ')},\n} from './${moduleName}'`)
  }

  return lines.join('\n') + '\n'
}

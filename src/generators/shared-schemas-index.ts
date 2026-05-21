import type { ResolvedPreset } from './template-generator'

const MODULE_EXPORTS: Record<string, { namedExports: string[] }> = {
  chat: {
    namedExports: [
      'ChatProtocolSchema',
      'WebSocketStatusSchema',
      'type ChatProtocol',
      'type WebSocketStatus',
    ],
  },
  file: {
    namedExports: [
      'FileDownloadSchema',
      'PrivateFileQuerySchema',
      'PublicFileUrlSchema',
      'PrivateFileUrlSchema',
      'GenerateUrlRequestSchema',
      'FileUrlResponseSchema',
      'EmptySchema',
      'UploadResultSchema',
      'UploadFileBodySchema',
    ],
  },
  todos: {
    namedExports: [
      'TodoSchema',
      'TodoStatusSchema',
      'CreateTodoSchema',
      'UpdateTodoSchema',
      'TodoIdSchema',
      'TodoIdResponseSchema',
      'TodoAttachmentSchema',
      'TodoAttachmentListSchema',
      'TodoWithAttachmentsSchema',
      'UploadFileSchema',
      'AttachmentIdResponseSchema',
      'type Todo',
      'type TodoStatus',
      'type CreateTodoInput',
      'type UpdateTodoInput',
      'type TodoIdResponse',
      'type TodoAttachment',
      'type TodoWithAttachments',
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
      'UnreadCountSchema',
      'NotificationIdSchema',
      'UnreadCountEventSchema',
      'type AppNotification',
      'type NotificationType',
      'type CreateNotificationInput',
      'type NotificationListQuery',
      'type SSEEvent',
      'type AppSSEProtocol',
      'type UnreadCount',
      'type NotificationId',
      'type UnreadCountEvent',
    ],
  },
  auth: {
    namedExports: [
      'DeveloperProfileSchema',
      'LoginSchema',
      'RegisterSchema',
      'TokenResponseSchema',
      'ProfileSchema',
      'type DeveloperProfile',
      'type LoginInput',
      'type RegisterInput',
      'type TokenResponse',
      'type Profile',
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
      'PluginSearchQuerySchema',
      'PluginDeleteResponseSchema',
      'ReviewIdParamsSchema',
      'ReviewDeleteResponseSchema',
      'CategorySlugParamsSchema',
      'CategoryPluginsQuerySchema',
      'PluginListAdminSchema',
      'AdminListQuerySchema',
      'AdminListAllQuerySchema',
      'RejectPluginBodySchema',
      'BulkApproveBodySchema',
      'BulkRejectBodySchema',
      'BulkResponseSchema',
      'CreateCategoryBodySchema',
      'UpdateCategoryBodySchema',
      'CategoryIdParamsSchema',
      'CategoryIdResponseSchema',
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
  admin: {
    namedExports: [
      'SystemStatsSchema',
      'HealthCheckSchema',
      'RecentActivityItemSchema',
      'RecentActivitySchema',
      'AuthUserSchema',
      'LoginRequestSchema',
      'LoginResponseSchema',
      'RegisterRequestSchema',
      'UserSchema',
      'UserListSchema',
      'UpdateUserRequestSchema',
      'CreateUserRequestSchema',
      'ClearTodosResultSchema',
      'AdminSuccessSchema',
      'DownloadTokenSchema',
      'type SystemStats',
      'type HealthCheck',
      'type RecentActivityItem',
      'type AuthUserResponse',
      'type CreateUserRequest',
      'type LoginRequest',
      'type LoginResponse',
      'type RegisterRequest',
      'type User',
      'type UpdateUserRequest',
      'type ClearTodosResult',
    ],
  },
  audit: {
    namedExports: ['ResourceTypeSchema', 'ActionTypeSchema', 'AuditLogSchema', 'type AuditLogType'],
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
  merchant: {
    namedExports: [
      'MerchantSchema',
      'MerchantLoginSchema',
      'MerchantLoginResponseSchema',
      'MerchantStatsSchema',
      'ProductSchema',
      'CreateProductSchema',
      'UpdateProductSchema',
      'ProductListSchema',
      'ProductListResponseSchema',
      'ProductQuerySchema',
      'type Merchant',
      'type MerchantLoginInput',
      'type MerchantLoginResponse',
      'type MerchantStats',
      'type Product',
      'type CreateProductInput',
      'type UpdateProductInput',
      'type ProductListResponse',
      'type ProductQuery',
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
  permission: {
    namedExports: [
      'RoleEnum',
      'PermissionEnum',
      'RoleInfoSchema',
      'PermissionInfoSchema',
      'UserPermissionsSchema',
      'MenuItemSchema',
      'PageActionSchema',
      'PagePermissionConfigSchema',
      'PermissionCategorySchema',
      'RoleListSchema',
      'PermissionListSchema',
      'MenuConfigSchema',
      'PagePermissionsSchema',
      'PermissionCategoriesSchema',
      'RoleLabelsSchema',
      'PermissionLabelsSchema',
      'PermissionInitSchema',
      'type PermissionRoleType',
      'type PermissionType',
      'type RoleInfo',
      'type PermissionInfo',
      'type UserPermissions',
      'type MenuItem',
      'type PageAction',
      'type PagePermissionConfig',
      'type PermissionCategory',
      'type PermissionInit',
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
    ],
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
}

const ADDITIONAL_PATHS_MAP: Record<string, string[]> = {
  permission: ['role', 'audit'],
}

// Standalone shared modules that have no server module manifest but are used by client pages
// or server routes. Include when:
// 1. The preset has client pages that import their schemas, OR
// 2. The preset has server modules whose routes import their schemas.
const STANDALONE_SHARED_MODULES: Record<string, { pages?: string[]; serverModules?: string[] }> = {
  cart: { pages: ['CartPage.tsx'] },
  community: { pages: ['TopicsPage.tsx', 'ProfilePage.tsx'], serverModules: ['content'] },
  dashboard: { pages: ['DashboardPage.tsx'] },
}

const moduleOrder = [
  'chat',
  'file',
  'todos',
  'notifications',
  'auth',
  'plugin',
  'admin',
  'audit',
  'captcha',
  'cart',
  'community',
  'content',
  'dashboard',
  'dispute',
  'merchant',
  'order',
  'permission',
  'role',
  'tenant',
  'ticket',
]

export function generateSharedSchemasIndex(resolved: ResolvedPreset): string {
  const header = `// Re-export interfaces from implementation files
export type { WSClient, WSProtocol, WSStatus } from '../core/ws-client'
export type { SSEClient, SSEProtocol } from '../core/sse-client'

// Re-export core
export {
  ApiSuccessSchema,
  ApiErrorSchema,
  ApiResponseSchema,
  type ApiSuccess,
  type ApiError,
  type ApiResponse,
  type RpcMethod,
  type EventName,
  type RpcInput,
  type RpcOutput,
  type EventPayload,
  createWSClient,
  createSSEClient,
} from '../core'

// Re-export modules
`

  const moduleLines: string[] = []
  const exportedNames = new Set<string>()
  const firstSeenModule = new Map<string, string>()
  const droppedExports: { name: string; moduleName: string; originalModule: string }[] = []

  for (const moduleName of moduleOrder) {
    const exports = MODULE_EXPORTS[moduleName]
    if (!exports) continue

    const shouldInclude = shouldIncludeModule(moduleName, resolved)
    if (!shouldInclude) continue

    const uniqueExports = exports.namedExports.filter(name => {
      if (exportedNames.has(name)) {
        const originalModule = firstSeenModule.get(name) ?? 'unknown'
        droppedExports.push({ name, moduleName, originalModule })
        return false
      }
      exportedNames.add(name)
      firstSeenModule.set(name, moduleName)
      return true
    })

    if (uniqueExports.length === 0) continue

    const importPath = getImportPath(moduleName, resolved)

    moduleLines.push(
      `export {\n  ${uniqueExports.join(',\n  ')},\n} from '../modules/${importPath}'`
    )
  }

  for (const { name, moduleName, originalModule } of droppedExports) {
    console.warn(
      `⚠️  Schema collision: "${name}" defined in both ${originalModule} and ${moduleName}. Using ${originalModule}'s version. Rename to avoid ambiguity.`
    )
  }

  return header + moduleLines.join('\n') + '\n'
}

function shouldIncludeModule(moduleName: string, resolved: ResolvedPreset): boolean {
  if (resolved.modules.has(moduleName)) return true

  // Standalone shared modules: include when a module in the preset
  // declares client pages that use their schemas OR server modules that import them
  const standalone = STANDALONE_SHARED_MODULES[moduleName]
  if (standalone) {
    // Check if any module's clientPages includes a relevant page
    const hasRelevantPage =
      standalone.pages &&
      [...resolved.modules.values()].some(
        m => m.clientPages?.some(p => standalone.pages!.includes(p.name + '.tsx')) ?? false
      )
    // Check if any required server module is included
    const hasRelevantServerModule =
      standalone.serverModules?.some(sm => resolved.modules.has(sm)) ?? false
    return !!(hasRelevantPage || hasRelevantServerModule)
  }

  for (const [parentModule, additionalPaths] of Object.entries(ADDITIONAL_PATHS_MAP)) {
    if (additionalPaths.includes(moduleName) && resolved.modules.has(parentModule)) {
      return true
    }
  }

  return false
}

function getImportPath(moduleName: string, resolved: ResolvedPreset): string {
  const manifest = resolved.modules.get(moduleName)
  if (manifest?.sharedSchemas?.path) {
    return manifest.sharedSchemas.path
  }
  return moduleName
}

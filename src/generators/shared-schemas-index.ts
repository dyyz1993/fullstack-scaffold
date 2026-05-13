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
}

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
  const moduleOrder = ['chat', 'file', 'todos', 'notifications', 'auth', 'plugin']

  for (const moduleName of moduleOrder) {
    if (!resolved.modules.has(moduleName)) continue

    const exports = MODULE_EXPORTS[moduleName]
    if (!exports) continue

    const manifest = resolved.modules.get(moduleName)!
    const importPath = manifest.sharedSchemas?.path ?? moduleName

    moduleLines.push(
      `export {\n  ${exports.namedExports.join(',\n  ')},\n} from '../modules/${importPath}'`
    )
  }

  return header + moduleLines.join('\n') + '\n'
}

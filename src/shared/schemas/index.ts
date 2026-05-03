// Re-export global types for convenience (these are declared in types/global.d.ts)
export type { WSClient, WSProtocol, SSEProtocol, SSEClient, WSStatus }

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

// @module-start:chat
// Re-export modules
export {
  ChatProtocolSchema,
  WebSocketStatusSchema,
  type ChatProtocol,
  type WebSocketStatus,
} from '../modules/chat'
// @module-end:chat
// @module-start:file
export {
  FileDownloadSchema,
  PrivateFileQuerySchema,
  PublicFileUrlSchema,
  PrivateFileUrlSchema,
  GenerateUrlRequestSchema,
  FileUrlResponseSchema,
  EmptySchema,
} from '../modules/files'
// @module-end:file
// @module-start:todos
export {
  TodoSchema,
  TodoStatusSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoIdSchema,
  TodoIdResponseSchema,
  TodoAttachmentSchema,
  TodoAttachmentListSchema,
  TodoWithAttachmentsSchema,
  UploadFileSchema,
  AttachmentIdResponseSchema,
  type Todo,
  type TodoStatus,
  type CreateTodoInput,
  type UpdateTodoInput,
  type TodoIdResponse,
  type TodoAttachment,
  type TodoWithAttachments,
} from '../modules/todos'
// @module-end:todos
// @module-start:notifications
export {
  NotificationSchema,
  NotificationTypeSchema,
  CreateNotificationSchema,
  NotificationListQuerySchema,
  SSEEventSchema,
  AppSSEProtocolSchema,
  UnreadCountSchema,
  NotificationIdSchema,
  UnreadCountEventSchema,
  type AppNotification,
  type NotificationType,
  type CreateNotificationInput,
  type NotificationListQuery,
  type SSEEvent,
  type AppSSEProtocol,
  type UnreadCount,
  type NotificationId,
  type UnreadCountEvent,
} from '../modules/notifications'
// @module-end:notifications

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

// Re-export modules
export { ChatProtocolSchema, type ChatProtocol } from '../modules/chat'
export {
  TodoSchema,
  TodoStatusSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoIdSchema,
  type Todo,
  type TodoStatus,
  type CreateTodoInput,
  type UpdateTodoInput,
} from '../modules/todos'
export {
  NotificationSchema,
  NotificationTypeSchema,
  CreateNotificationSchema,
  NotificationListQuerySchema,
  SSEEventSchema,
  AppSSEProtocolSchema,
  type AppNotification,
  type NotificationType,
  type CreateNotificationInput,
  type NotificationListQuery,
  type SSEEvent,
  type AppSSEProtocol,
} from '../modules/notifications'

/**
 * Unified schema exports
 *
 * Schema Organization Strategy:
 *
 * 1. Each module has its own schema file (todos.ts, notifications.ts)
 *    - Module-specific schemas live alongside the module
 *    - Easy to find and maintain
 *
 * 2. Common schemas (API response, pagination, etc.) in common.ts
 *    - Shared across all modules
 *
 * 3. This index.ts re-exports everything for convenient imports
 *
 * Usage:
 * ```ts
 * // Import from unified entry (recommended for client)
 * import { TodoSchema, NotificationSchema, type Todo, type Notification } from '@shared/schemas';
 *
 * // Or import from module-specific file (for server modules)
 * import { TodoSchema, type Todo } from '@shared/schemas/todos';
 * ```
 */

// Common schemas
export {
  ApiSuccessSchema,
  ApiErrorSchema,
  ApiResponseSchema,
  type ApiSuccess,
  type ApiError,
  type ApiResponse,
} from './common'

// Todo module schemas
export {
  TodoStatusSchema,
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoIdSchema,
  type TodoStatus,
  type Todo,
  type CreateTodoInput,
  type UpdateTodoInput,
} from './todos'

// Notification module schemas
export {
  NotificationTypeSchema,
  NotificationSchema,
  CreateNotificationSchema,
  NotificationListQuerySchema,
  SSEEventSchema,
  AppSSEProtocolSchema,
  type NotificationType,
  type AppNotification,
  type CreateNotificationInput,
  type NotificationListQuery,
  type SSEEvent,
  type AppSSEProtocol,
} from './notifications'

// WebSocket module schemas
export {
  WSMessageTypeSchema,
  WSMessageSchema,
  WSEchoPayloadSchema,
  WSNotificationPayloadSchema,
  type WSMessageType,
  type WSMessage,
  type WSEchoPayload,
  type WSNotificationPayload,
} from './websocket'

// WebSocket protocol (for GhostWSClient type inference)
export {
  AppWSProtocolSchema,
  WSRpcRequestSchema,
  WSRpcResponseSchema,
  WSEventMessageSchema,
  WSMessageSchema as WSProtocolMessageSchema,
  type AppWSProtocol,
  type WSRpcRequest,
  type WSRpcResponse,
  type WSEventMessage,
  type WSMessage as WSProtocolMessage,
} from './ws-protocol'

// Re-export global types for convenience
export type { WSClient, WSProtocol, SSEProtocol, SSEClient, WSStatus }

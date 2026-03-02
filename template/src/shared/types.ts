/**
 * Shared types for Todo application
 * Re-exports types from schemas for backward compatibility
 *
 * Recommended: Import directly from '@shared/schemas' for both types and validation
 * This file exists for convenience and backward compatibility
 */

export type {
  // Common
  ApiSuccess,
  ApiError,
  ApiResponse,
  // Todos
  TodoStatus,
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  // Notifications
  NotificationType,
  AppNotification,
  CreateNotificationInput,
  NotificationListQuery,
  SSEEvent,
} from './schemas';

// Re-export schemas for convenience (useful for form validation on client)
export {
  // Common
  ApiSuccessSchema,
  ApiErrorSchema,
  ApiResponseSchema,
  // Todos
  TodoStatusSchema,
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoIdSchema,
  // Notifications
  NotificationTypeSchema,
  NotificationSchema,
  CreateNotificationSchema,
  NotificationListQuerySchema,
  SSEEventSchema,
} from './schemas';

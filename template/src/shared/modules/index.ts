// @module-start:chat
export { ChatProtocolSchema, type ChatProtocol } from './chat'
// @module-end:chat
// @module-start:agent
export {
  MessageRoleSchema,
  ChatMessageSchema,
  AgentSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  SendMessageSchema,
  GetMessagesSchema,
  PiTextDeltaEventSchema,
  PiThinkingDeltaEventSchema,
  PiToolStartEventSchema,
  PiToolEndEventSchema,
  PiAgentStartEventSchema,
  PiAgentEndEventSchema,
  ChatSSEProtocolSchema,
  type MessageRole,
  type ChatMessage,
  type Agent,
  type CreateAgentInput,
  type UpdateAgentInput,
  type SendMessageInput,
  type GetMessagesInput,
  type PiTextDeltaEvent,
  type PiThinkingDeltaEvent,
  type PiToolStartEvent,
  type PiToolEndEvent,
  type PiAgentStartEvent,
  type PiAgentEndEvent,
  type ChatSSEProtocol,
} from './agent'
// @module-end:agent
// @module-start:todos
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
} from './todos'
// @module-end:todos
// @module-start:file
export {
  FileDownloadSchema,
  PrivateFileQuerySchema,
  PublicFileUrlSchema,
  PrivateFileUrlSchema,
  GenerateUrlRequestSchema,
  FileUrlResponseSchema,
  EmptySchema,
} from './files'
// @module-end:file
// @module-start:notifications
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
} from './notifications'
// @module-end:notifications
// @module-start:ops
export {
  SystemStatsSchema,
  HealthCheckSchema,
  RecentActivityItemSchema,
  RecentActivitySchema,
  AuthUserSchema,
  ClearTodosResultSchema,
  type SystemStats,
  type HealthCheck,
  type RecentActivityItem,
  type AuthUserResponse,
  type ClearTodosResult,
} from './ops'
// @module-end:ops

// Re-export from platform layer
// @module-start:permission
export {
  RoleEnum,
  RoleInfoSchema,
  PermissionInfoSchema,
  UserPermissionsSchema,
  RoleListSchema,
  PermissionListSchema,
  Role,
  Permission,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  PERMISSION_LABELS,
  PERMISSION_CATEGORIES,
  getPermissionsByRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  PERMISSION_DEPENDENCIES,
  validatePermissionDependencies,
  getRequiredPermissions,
  type RoleType,
  type RoleInfo,
  type PermissionInfo,
  type UserPermissions,
} from '@platform/shared/permission'

export {
  RESOURCE_TYPES,
  ACTION_TYPES,
  RESOURCE_LABELS,
  ACTION_LABELS,
  ACTION_COLORS,
  PATH_TO_RESOURCE_TYPE,
  ResourceTypeSchema,
  ActionTypeSchema,
  AuditLogSchema,
  type ResourceType,
  type ActionType,
  type AuditLogType,
} from '@platform/shared/audit'
// @module-end:permission

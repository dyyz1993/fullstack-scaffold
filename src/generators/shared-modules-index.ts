import type { ResolvedPreset } from "./template-generator";

const MODULE_EXPORTS: Record<
  string,
  { namedExports: string[]; hasTypeOnly?: boolean }
> = {
  chat: {
    namedExports: ["ChatProtocolSchema", "type ChatProtocol"],
  },
  todos: {
    namedExports: [
      "TodoSchema",
      "TodoStatusSchema",
      "CreateTodoSchema",
      "UpdateTodoSchema",
      "TodoIdSchema",
      "type Todo",
      "type TodoStatus",
      "type CreateTodoInput",
      "type UpdateTodoInput",
    ],
  },
  files: {
    namedExports: [
      "FileDownloadSchema",
      "PrivateFileQuerySchema",
      "PublicFileUrlSchema",
      "PrivateFileUrlSchema",
      "GenerateUrlRequestSchema",
      "FileUrlResponseSchema",
      "EmptySchema",
    ],
  },
  notifications: {
    namedExports: [
      "NotificationSchema",
      "NotificationTypeSchema",
      "CreateNotificationSchema",
      "NotificationListQuerySchema",
      "SSEEventSchema",
      "AppSSEProtocolSchema",
      "type AppNotification",
      "type NotificationType",
      "type CreateNotificationInput",
      "type NotificationListQuery",
      "type SSEEvent",
      "type AppSSEProtocol",
    ],
  },
  admin: {
    namedExports: [
      "SystemStatsSchema",
      "HealthCheckSchema",
      "RecentActivityItemSchema",
      "RecentActivitySchema",
      "AuthUserSchema",
      "ClearTodosResultSchema",
      "type SystemStats",
      "type HealthCheck",
      "type RecentActivityItem",
      "type AuthUserResponse",
      "type ClearTodosResult",
    ],
  },
  permission: {
    namedExports: [
      "RoleEnum",
      "RoleInfoSchema",
      "PermissionInfoSchema",
      "UserPermissionsSchema",
      "RoleListSchema",
      "PermissionListSchema",
      "Role",
      "Permission",
      "ROLE_PERMISSIONS",
      "ROLE_LABELS",
      "PERMISSION_LABELS",
      "PERMISSION_CATEGORIES",
      "getPermissionsByRole",
      "hasPermission",
      "hasAnyPermission",
      "hasAllPermissions",
      "type RoleType",
      "type RoleInfo",
      "type PermissionInfo",
      "type UserPermissions",
    ],
  },
};

export function generateSharedModulesIndex(resolved: ResolvedPreset): string {
  const lines: string[] = [];

  const moduleOrder = [
    "chat",
    "todos",
    "files",
    "notifications",
    "admin",
    "permission",
  ];

  for (const moduleName of moduleOrder) {
    if (!resolved.modules.has(moduleName)) continue;

    const exports = MODULE_EXPORTS[moduleName];
    if (!exports) continue;

    lines.push(
      `export {\n  ${exports.namedExports.join(",\n  ")},\n} from './${moduleName}'`,
    );
  }

  return lines.join("\n") + "\n";
}

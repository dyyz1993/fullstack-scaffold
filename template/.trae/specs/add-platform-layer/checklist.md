# Checklist

## 目录结构

- [x] `src/platform/server/module-permission/` 目录已创建
- [x] `src/platform/server/module-auth/` 目录已创建
- [x] `src/platform/server/module-notification/` 目录已创建
- [x] `src/platform/server/module-file/` 目录已创建
- [x] `src/platform/admin/components/` 目录已创建
- [x] `src/platform/admin/hooks/` 目录已创建
- [x] `src/platform/shared/permission/` 目录已创建
- [x] `src/platform/shared/audit/` 目录已创建
- [x] `src/platform/shared/auth/` 目录已创建
- [x] `src/platform/shared/notification/` 目录已创建
- [x] `src/platform/shared/file/` 目录已创建

## 路径别名配置

- [x] `tsconfig.json` 包含 `@platform/server/*` 别名
- [x] `tsconfig.json` 包含 `@platform/admin/*` 别名
- [x] `tsconfig.json` 包含 `@platform/shared/*` 别名
- [x] `vite.config.ts` 包含 `@platform/*` 别名
- [x] `vitest.config.ts` 包含 `@platform/*` 别名

## 平台共享类型迁移

- [x] `src/platform/shared/permission/permissions.ts` 包含 Role 和 Permission 枚举
- [x] `src/platform/shared/permission/schemas.ts` 包含 Zod schemas
- [x] `src/platform/shared/permission/index.ts` 正确导出所有类型
- [x] `src/platform/shared/audit/constants.ts` 包含 RESOURCE_TYPES 和 ACTION_TYPES
- [x] `src/platform/shared/audit/schemas.ts` 包含 AuditLogSchema
- [x] `src/platform/shared/audit/index.ts` 正确导出所有类型
- [x] `src/platform/shared/auth/schemas.ts` 包含 AuthUserSchema 和 LoginRequestSchema
- [x] `src/platform/shared/auth/types.ts` 包含 AuthUser 类型
- [x] `src/platform/shared/auth/index.ts` 正确导出所有类型
- [x] `src/platform/shared/notification/schemas.ts` 包含 NotificationSchema
- [x] `src/platform/shared/notification/index.ts` 正确导出所有类型
- [x] `src/platform/shared/file/schemas.ts` 包含 FileDownloadSchema
- [x] `src/platform/shared/file/index.ts` 正确导出所有类型

## 平台服务端模块迁移

- [x] `src/platform/server/module-permission/services/permission-service.ts` 包含静态配置
- [x] `src/platform/server/module-permission/services/permission-service-impl.ts` 包含数据库操作
- [x] `src/platform/server/module-permission/services/role-service.ts` 包含角色服务
- [x] `src/platform/server/module-permission/services/audit-log-service.ts` 包含审计日志服务
- [x] `src/platform/server/module-permission/routes/permission-routes.ts` 使用 `@platform/shared/permission`
- [x] `src/platform/server/module-permission/routes/role-routes.ts` 使用 `@platform/shared/permission`
- [x] `src/platform/server/module-permission/routes/audit-log-routes.ts` 使用 `@platform/shared/audit`
- [x] `src/platform/server/module-permission/index.ts` 正确导出所有模块
- [x] `src/platform/server/module-auth/services/auth-service.ts` 包含认证服务
- [x] `src/platform/server/module-auth/routes/auth-routes.ts` 使用 `@platform/shared/auth`
- [x] `src/platform/server/module-auth/index.ts` 正确导出所有模块
- [x] `src/platform/server/module-notification/services/notification-service.ts` 包含通知服务
- [x] `src/platform/server/module-notification/routes/notification-routes.ts` 使用 `@platform/shared/notification`
- [x] `src/platform/server/module-notification/index.ts` 正确导出所有模块
- [x] `src/platform/server/module-file/routes/file-routes.ts` 使用 `@platform/shared/file`
- [x] `src/platform/server/module-file/index.ts` 正确导出所有模块

## 管理后台平台组件迁移

- [x] `src/platform/admin/components/PermissionGuard.tsx` 使用 `@platform/shared/permission`
- [x] `src/platform/admin/components/ProtectedRoute.tsx` 使用 `@platform/shared/permission`
- [x] `src/platform/admin/hooks/usePermissions.ts` 使用 `@platform/shared/permission`
- [x] `src/platform/admin/hooks/useAuditLogs.ts` 使用 `@platform/shared/audit`
- [x] `src/platform/admin/hooks/useRoles.ts` 存在并可用
- [x] `src/platform/admin/index.ts` 正确导出所有组件和 hooks

## 向后兼容

- [x] `src/shared/modules/permission/index.ts` 重新导出 `@platform/shared/permission`
- [x] `src/shared/modules/audit/index.ts` 重新导出 `@platform/shared/audit`
- [x] `src/shared/constants/index.ts` 重新导出 `@platform/shared/audit/constants`

## 验证

- [x] `npm run typecheck` 通过
- [x] `npm run build` 成功

# Tasks

- [x] Task 1: 创建 platform 目录结构
  - [x] SubTask 1.1: 创建 `src/platform/server/module-permission/` 目录
  - [x] SubTask 1.2: 创建 `src/platform/admin/components/` 目录
  - [x] SubTask 1.3: 创建 `src/platform/admin/hooks/` 目录
  - [x] SubTask 1.4: 创建 `src/platform/shared/permission/` 目录
  - [x] SubTask 1.5: 创建 `src/platform/shared/audit/` 目录

- [x] Task 2: 更新路径别名配置
  - [x] SubTask 2.1: 更新 `tsconfig.json` 添加 `@platform/*` 别名
  - [x] SubTask 2.2: 更新 `vite.config.ts` 添加 `@platform/*` 别名
  - [x] SubTask 2.3: 更新 `vitest.config.ts` 添加 `@platform/*` 别名

- [x] Task 3: 迁移平台共享类型
  - [x] SubTask 3.1: 迁移 `permissions.ts` 到 `src/platform/shared/permission/`
  - [x] SubTask 3.2: 迁移 `schemas.ts` 到 `src/platform/shared/permission/`
  - [x] SubTask 3.3: 迁移 `types.ts` 到 `src/platform/shared/permission/`
  - [x] SubTask 3.4: 创建 `src/platform/shared/permission/index.ts` 导出文件
  - [x] SubTask 3.5: 迁移审计日志常量到 `src/platform/shared/audit/constants.ts`
  - [x] SubTask 3.6: 迁移审计日志 schemas 到 `src/platform/shared/audit/schemas.ts`
  - [x] SubTask 3.7: 创建 `src/platform/shared/audit/index.ts` 导出文件

- [x] Task 4: 迁移平台服务端模块
  - [x] SubTask 4.1: 迁移 `permission-service.ts` 到 `src/platform/server/module-permission/services/`
  - [x] SubTask 4.2: 迁移 `permission-service-impl.ts` 到 `src/platform/server/module-permission/services/`
  - [x] SubTask 4.3: 迁移 `role-service.ts` 到 `src/platform/server/module-permission/services/`
  - [x] SubTask 4.4: 迁移 `audit-log-service.ts` 到 `src/platform/server/module-permission/services/`
  - [x] SubTask 4.5: 迁移 `permission-routes.ts` 到 `src/platform/server/module-permission/routes/`
  - [x] SubTask 4.6: 迁移 `role-routes.ts` 到 `src/platform/server/module-permission/routes/`
  - [x] SubTask 4.7: 迁移 `audit-log-routes.ts` 到 `src/platform/server/module-permission/routes/`
  - [x] SubTask 4.8: 创建 `src/platform/server/module-permission/index.ts` 导出文件

- [x] Task 5: 迁移管理后台平台组件和 hooks
  - [x] SubTask 5.1: 迁移 `PermissionGuard.tsx` 到 `src/platform/admin/components/`
  - [x] SubTask 5.2: 迁移 `ProtectedRoute.tsx` 到 `src/platform/admin/components/`
  - [x] SubTask 5.3: 迁移 `usePermissions.ts` 到 `src/platform/admin/hooks/`
  - [x] SubTask 5.4: 迁移 `useAuditLogs.ts` 到 `src/platform/admin/hooks/`
  - [x] SubTask 5.5: 迁移 `useRoles.ts` 到 `src/platform/admin/hooks/`
  - [x] SubTask 5.6: 创建 `src/platform/admin/index.ts` 导出文件

- [x] Task 6: 设置向后兼容导出
  - [x] SubTask 6.1: 更新 `src/shared/modules/permission/index.ts` 重新导出 platform 内容
  - [x] SubTask 6.2: 更新 `src/shared/modules/audit/index.ts` 重新导出 platform 内容
  - [x] SubTask 6.3: 更新 `src/shared/constants/index.ts` 重新导出 platform 内容

- [x] Task 7: 迁移 auth 模块
  - [x] SubTask 7.1: 创建 `src/platform/shared/auth/schemas.ts`
  - [x] SubTask 7.2: 创建 `src/platform/shared/auth/types.ts`
  - [x] SubTask 7.3: 创建 `src/platform/server/module-auth/services/auth-service.ts`
  - [x] SubTask 7.4: 创建 `src/platform/server/module-auth/routes/auth-routes.ts`
  - [x] SubTask 7.5: 创建 `src/platform/server/module-auth/index.ts`

- [x] Task 8: 迁移 notification 模块
  - [x] SubTask 8.1: 创建 `src/platform/shared/notification/schemas.ts`
  - [x] SubTask 8.2: 创建 `src/platform/server/module-notification/services/notification-service.ts`
  - [x] SubTask 8.3: 创建 `src/platform/server/module-notification/routes/notification-routes.ts`
  - [x] SubTask 8.4: 创建 `src/platform/server/module-notification/index.ts`

- [x] Task 9: 迁移 file 模块
  - [x] SubTask 9.1: 创建 `src/platform/shared/file/schemas.ts`
  - [x] SubTask 9.2: 创建 `src/platform/server/module-file/routes/file-routes.ts`
  - [x] SubTask 9.3: 创建 `src/platform/server/module-file/index.ts`

- [x] Task 10: 验证构建和测试
  - [x] SubTask 10.1: 运行 `npm run typecheck` 验证类型检查
  - [x] SubTask 10.2: 运行 `npm run build` 验证构建

# Task Dependencies

- Task 2 依赖 Task 1（需要目录存在才能配置路径）
- Task 3、4、5 依赖 Task 2（需要路径别名配置完成）
- Task 6 依赖 Task 3、4、5（需要 platform 层文件存在）
- Task 7、8、9 可并行执行
- Task 10 依赖所有前置任务

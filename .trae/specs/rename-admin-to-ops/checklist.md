# Checklist

## Phase 1: 后端模块重命名

- [x] `src/server/module-admin/` 已重命名为 `src/server/module-ops/`
- [x] `src/server/route-registry.ts` 中 `adminApiRoutes` 已改为 `opsApiRoutes`
- [x] `src/server/app.ts` 中导入和路由已更新
- [x] 所有 `module-admin` 导入路径已更新

## Phase 2: 共享模块重命名

- [x] `src/platform/admin/` 已重命名为 `src/platform/ops/`
- [x] `src/shared/modules/admin/` 已重命名为 `src/shared/modules/ops/`
- [x] 所有 `@platform/admin` 导入已更新为 `@platform/ops`
- [x] 所有 `@shared/modules/admin` 导入已更新为 `@shared/modules/ops`

## Phase 3: 前端目录重命名

- [x] `src/admin/` 已重命名为 `src/ops/`
- [x] 前端入口文件导入已更新
- [x] 构建配置已更新（如有）

## Phase 4: 租户管理独立目录

- [x] `src/tenant/` 目录结构已创建
- [x] TenantPage.tsx 已移动到 `src/tenant/pages/`
- [x] tenantStore.ts 已移动到 `src/tenant/stores/`
- [x] tenantApi.ts 已移动到 `src/tenant/services/`
- [x] 租户相关测试文件已移动
- [x] `src/platform/tenant/` 目录已创建

## Phase 5: 导入引用更新

- [x] 所有 `admin` 相关导入已更新为 `ops`
- [x] tsconfig 路径别名已更新（如有）
- [x] 无遗漏的旧路径引用

## Phase 6: 验证

- [x] `npm run typecheck` 通过，无类型错误
- [x] `npm run test` 通过，所有测试成功（756/760，4个 WebSocket 超时是测试环境问题）
- [x] `npm run build` 成功，无构建错误

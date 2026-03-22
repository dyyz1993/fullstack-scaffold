# Tasks

## Phase 1: 后端模块重命名 (admin → ops)

- [x] Task 1.1: 重命名后端模块目录
  - [x] 将 `src/server/module-admin/` 重命名为 `src/server/module-ops/`
  - [x] 更新目录内所有文件的导入路径

- [x] Task 1.2: 更新路由注册
  - [x] 修改 `src/server/route-registry.ts`
    - [x] 将 `adminRoutes` 改为 `opsRoutes`
    - [x] 将 `adminApiRoutes` 改为 `opsApiRoutes`
    - [x] 更新所有导入路径
  - [x] 修改 `src/server/app.ts`
    - [x] 更新导入语句
    - [x] 更新路由挂载

- [x] Task 1.3: 更新后端其他引用
  - [x] 搜索并更新所有 `module-admin` 的导入路径
  - [x] 更新 `src/server/module-ops/routes/admin-routes.ts` 为 `ops-routes.ts`
  - [x] 更新 `src/server/module-ops/routes/admin-notification-routes.ts` 为 `ops-notification-routes.ts`

## Phase 2: 共享模块重命名

- [x] Task 2.1: 重命名 platform/admin 目录
  - [x] 将 `src/platform/admin/` 重命名为 `src/platform/ops/`
  - [x] 更新 `src/platform/admin/index.ts` 导出

- [x] Task 2.2: 重命名 shared/modules/admin 目录
  - [x] 将 `src/shared/modules/admin/` 重命名为 `src/shared/modules/ops/`
  - [x] 更新 schemas 导出

## Phase 3: 前端目录重命名

- [x] Task 3.1: 重命名前端目录
  - [x] 将 `src/admin/` 重命名为 `src/ops/`
  - [x] 更新 `src/ops/main.tsx` 中的导入
  - [x] 更新 `src/ops/App.tsx` 中的导入

- [x] Task 3.2: 更新前端构建配置
  - [x] 更新 `vite.config.ts` 中的入口配置（如有）
  - [x] 更新 `index-ops.html` 或相关 HTML 入口（如有）

## Phase 4: 创建租户管理独立目录

- [x] Task 4.1: 创建 tenant 前端目录结构
  - [x] 创建 `src/tenant/` 目录
  - [x] 创建 `src/tenant/components/` 目录
  - [x] 创建 `src/tenant/pages/` 目录
  - [x] 创建 `src/tenant/services/` 目录
  - [x] 创建 `src/tenant/stores/` 目录

- [x] Task 4.2: 迁移租户管理代码
  - [x] 移动 `src/client/pages/TenantPage.tsx` 到 `src/tenant/pages/`
  - [x] 移动 `src/client/stores/tenantStore.ts` 到 `src/tenant/stores/`
  - [x] 移动 `src/client/services/tenantApi.ts` 到 `src/tenant/services/`
  - [x] 移动租户相关测试文件

- [x] Task 4.3: 创建 platform/tenant 共享目录
  - [x] 创建 `src/platform/tenant/` 目录
  - [x] 创建 `src/platform/tenant/index.ts`
  - [x] 创建租户相关共享组件（如需要）

## Phase 5: 更新所有导入引用

- [x] Task 5.1: 全局搜索替换
  - [x] 搜索所有 `from '*/admin/*'` 导入并更新
  - [x] 搜索所有 `@platform/admin` 导入并更新为 `@platform/ops`
  - [x] 搜索所有 `@shared/modules/admin` 导入并更新为 `@shared/modules/ops`
  - [x] 搜索所有 `module-admin` 路径引用

- [x] Task 5.2: 更新 tsconfig 路径别名（如有）
  - [x] 检查 `tsconfig.json` 中的 paths 配置
  - [x] 更新 `@admin/*` 为 `@ops/*`（如有）

## Phase 6: 验证和测试

- [x] Task 6.1: 运行类型检查
  - [x] 执行 `npm run typecheck` 确保无类型错误

- [x] Task 6.2: 运行测试
  - [x] 执行 `npm run test` 确保所有测试通过

- [x] Task 6.3: 运行构建
  - [x] 执行 `npm run build` 确保构建成功

# Task Dependencies

- Task 1.x 系列任务需按顺序执行
- Task 2.x 可与 Task 1.x 并行执行
- Task 3.x 依赖 Task 2.x 完成
- Task 4.x 可独立执行，不依赖其他任务
- Task 5.x 需等待 Task 1-4 全部完成
- Task 6.x 需等待 Task 5.x 完成

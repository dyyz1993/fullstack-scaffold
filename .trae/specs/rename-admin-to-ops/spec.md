# 目录结构重构 Spec

## Why

当前项目中 `admin` 命名不够明确，无法清晰区分"运营后台"和"用户端管理"的职责边界。需要将命名调整为 `ops`（运营），并分离租户管理功能，使架构更加清晰。

## What Changes

- 将 `admin` 相关命名统一改为 `ops`（运营后台）
- 从 `client` 中分离出租户管理功能到独立的 `tenant` 目录
- 调整路由命名和注册逻辑
- 更新所有相关引用和导入路径

### **BREAKING** 变更

- `adminApiRoutes` → `opsApiRoutes`
- `src/admin/` → `src/ops/`
- `src/server/module-admin/` → `src/server/module-ops/`
- `src/platform/admin/` → `src/platform/ops/`
- `src/shared/modules/admin/` → `src/shared/modules/ops/`

## Impact

- Affected code:
  - `src/admin/` 整个目录
  - `src/server/module-admin/` 整个目录
  - `src/platform/admin/` 整个目录
  - `src/shared/modules/admin/` 整个目录
  - `src/server/route-registry.ts`
  - `src/server/app.ts`
  - 所有引用 `admin` 的导入语句

## ADDED Requirements

### Requirement: 运营后台命名规范

系统 SHALL 使用 `ops` 作为运营后台的统一命名标识。

#### Scenario: 目录命名

- **WHEN** 开发者查看项目目录结构
- **THEN** 运营后台相关目录使用 `ops` 命名（如 `src/ops/`, `module-ops/`）

#### Scenario: 路由命名

- **WHEN** 开发者查看路由注册
- **THEN** 运营后台路由使用 `opsApiRoutes` 命名

### Requirement: 租户管理独立目录

系统 SHALL 提供独立的租户管理前端目录 `src/tenant/`。

#### Scenario: 租户管理页面分离

- **WHEN** 用户访问租户管理功能
- **THEN** 相关代码位于 `src/tenant/` 目录下

#### Scenario: 租户管理共享组件

- **WHEN** 开发者需要租户管理相关的共享组件
- **THEN** 组件位于 `src/platform/tenant/` 目录下

### Requirement: 清晰的架构分层

系统 SHALL 按以下分层组织代码：

| 层级     | 目录          | 用途               |
| -------- | ------------- | ------------------ |
| 用户端   | `src/client/` | 普通用户的日常操作 |
| 租户管理 | `src/tenant/` | 租户管理员操作     |
| 运营后台 | `src/ops/`    | 平台运营人员操作   |

## MODIFIED Requirements

### Requirement: 路由注册

原 `route-registry.ts` 中的路由注册 SHALL 更新为：

```typescript
// 用户端路由 - 普通用户
export const clientApiRoutes = new OpenAPIHono()
  .route("/api", todosRoutes)
  .route("/api", chatRoutes)
  .route("/api", notificationRoutes);

// 租户管理路由 - 租户管理员
export const tenantApiRoutes = new OpenAPIHono().route(
  "/api/tenant",
  tenantRoutes,
);

// 运营后台路由 - 平台运营
export const opsApiRoutes = new OpenAPIHono()
  .route("/api/ops", userManagementRoutes)
  .route("/api/ops", tenantAuditRoutes);
// ... 其他运营路由
```

## REMOVED Requirements

### Requirement: admin 命名

**Reason**: 命名不够明确，无法区分运营后台和租户管理
**Migration**: 所有 `admin` 命名迁移至 `ops` 或 `tenant`

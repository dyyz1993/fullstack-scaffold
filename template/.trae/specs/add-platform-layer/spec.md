# Platform Layer 重构 Spec

## Why

当前项目的管理后台和用户端存在大量重复的底座代码（权限系统、审计日志、认证等），需要将这些通用功能抽象到独立的 platform 层，以提高代码复用性和可维护性。

## What Changes

- 新增 `src/platform/` 目录，与 `admin/`、`client/`、`server/`、`shared/` 平级
- 将权限系统（permission）、审计日志（audit）迁移到 platform 层
- 更新路径别名配置，支持 `@platform/server/*`、`@platform/admin/*`、`@platform/shared/*`
- 保持向后兼容，旧路径通过重新导出指向新路径

## Impact

- Affected specs: 权限系统、审计日志
- Affected code:
  - `src/shared/modules/permission/` → `src/platform/shared/permission/`
  - `src/shared/modules/audit/` → `src/platform/shared/audit/`
  - `src/shared/constants/` → `src/platform/shared/audit/constants.ts`
  - `src/server/module-permission/` → `src/platform/server/module-permission/`
  - `src/admin/components/PermissionGuard.tsx` → `src/platform/admin/components/`
  - `src/admin/hooks/usePermissions.ts` → `src/platform/admin/hooks/`

## ADDED Requirements

### Requirement: Platform 层目录结构

系统应提供独立的 platform 层，包含服务端模块、前端组件和共享类型。

#### Scenario: 目录结构创建

- **WHEN** 开发者查看 `src/platform/` 目录
- **THEN** 应看到以下子目录：
  - `server/` - 平台服务端模块
  - `admin/` - 管理后台平台组件
  - `client/` - 用户端平台组件（预留）
  - `shared/` - 平台共享类型

### Requirement: 路径别名配置

系统应支持 `@platform/*` 路径别名。

#### Scenario: TypeScript 路径解析

- **WHEN** 开发者使用 `import { Permission } from '@platform/shared/permission'`
- **THEN** TypeScript 应正确解析到 `src/platform/shared/permission/index.ts`

#### Scenario: Vite 路径解析

- **WHEN** 开发者使用 `import { PermissionGuard } from '@platform/admin'`
- **THEN** Vite 应正确解析到 `src/platform/admin/index.ts`

### Requirement: 向后兼容

系统应保持旧路径的向后兼容性。

#### Scenario: 旧路径导入

- **WHEN** 开发者使用 `import { Permission } from '@shared/modules/permission'`
- **THEN** 应正确导出 `Permission` 类型

## MODIFIED Requirements

### Requirement: 权限类型定义位置

权限相关的类型定义应从 `src/shared/modules/permission/` 迁移到 `src/platform/shared/permission/`。

**原位置**: `src/shared/modules/permission/`
**新位置**: `src/platform/shared/permission/`

### Requirement: 审计日志类型定义位置

审计日志相关的类型定义应从 `src/shared/modules/audit/` 迁移到 `src/platform/shared/audit/`。

**原位置**: `src/shared/modules/audit/`
**新位置**: `src/platform/shared/audit/`

## REMOVED Requirements

### Requirement: 无移除的需求

本次重构不涉及功能移除，仅做代码迁移和重组。

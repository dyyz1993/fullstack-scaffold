# 目录架构优化计划

## 一、现状分析

### 1.1 当前目录结构

```
src/
├── client/                    # 用户前台（Ant Design + React Router）
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── stores/
│
├── ops/                      # 运营后台（Ant Design + React Router）
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── layouts/
│   ├── services/
│   └── stores/
│
├── tenant/                   # 租户管理（React Router）
│   ├── pages/
│   ├── services/
│   └── stores/
│
├── platform/                 # 平台共享层（问题所在）
│   ├── ops/                 # ⚠️ 与 src/ops 重复
│   │   ├── components/     # PermissionGuard、ProtectedRoute
│   │   ├── hooks/          # usePermissions、useRoles
│   │   └── index.ts
│   ├── server/              # ⚠️ 与 src/server/module-* 重复
│   │   ├── module-auth/    # 认证服务
│   │   ├── module-file/    # 文件服务
│   │   ├── module-notification/  # 通知服务
│   │   └── module-permission/   # 权限服务
│   ├── shared/              # ✅ 合理的共享层
│   │   ├── audit/          # 审计日志常量
│   │   ├── auth/          # 认证类型
│   │   ├── permission/    # 权限类型
│   │   └── ...
│   └── tenant/             # 租户共享
│
├── server/                   # 服务端
│   ├── module-todos/
│   ├── module-chat/
│   ├── module-notifications/
│   ├── module-order/
│   ├── module-ticket/
│   ├── module-dispute/
│   ├── module-content/
│   ├── module-captcha/
│   ├── module-file/
│   ├── module-permission/  # ⚠️ 与 platform/server/module-permission 重复
│   ├── module-ops/        # ⚠️ 与 src/ops 概念重叠
│   ├── module-tenant/     # ⚠️ 与 src/tenant 概念重叠
│   ├── middleware/
│   ├── db/
│   └── route-registry.ts
│
└── shared/                   # 共享 schemas
    └── modules/
        ├── ops/
        ├── tenant/
        └── ...
```

### 1.2 核心问题

| 问题       | 说明                                                                     | 影响        |
| -------- | ---------------------------------------------------------------------- | --------- |
| **概念重叠** | `src/ops` 和 `src/server/module-ops` 都叫 ops                             | 困惑、职责不清   |
| **组件重复** | `platform/ops/components/` 和 `src/ops/components/`                     | 代码重复、维护成本 |
| **服务重复** | `platform/server/module-permission/` 和 `src/server/module-permission/` | 需要同步两份代码  |
| **命名混乱** | `client/ops/tenant` vs `server/module-ops`                             | 新开发者难以理解  |

### 1.3 使用场景分析

#### 场景 1：添加一个新页面到运营后台

**当前流程**：

1. 在 `src/ops/pages/` 创建页面
2. 发现 `platform/ops/hooks/usePermissions.ts` 有权限 hook
3. 但 `src/ops/hooks/` 也有 `usePermissions.ts`
4. 需要确认用哪个，哪个是最新的

#### 场景 2：修改权限服务

**当前流程**：

1. 权限服务在 `src/server/module-permission/services/` 和 `src/platform/server/module-permission/` 各有一份
2. 不确定修改哪边
3. 可能需要同步修改

#### 场景 3：新开发者理解项目结构

**困惑点**：

* `src/ops` 和 `src/server/module-ops` 区别是什么？

* `src/client` 和 `src/tenant` 都是 React 应用，区别是什么？

* `platform/` 目录是干什么的？

***

## 二、优化方案

### 2.1 重构后的目录结构

```
src/
├── apps/                      # 应用层（替代 client/ops/tenant）
│   ├── web/                  # 用户前台（React + Tailwind）
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── App.tsx
│   │
│   ├── ops/                  # 运营后台（React + Ant Design）
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── layouts/
│   │   └── App.tsx
│   │
│   └── admin/                # ⚠️ 这个要不要？看需求
│       └── ...
│
├── packages/                  # 共享包（替代 platform/）
│   ├── ui/                   # 共享 UI 组件
│   │   ├── Button/
│   │   ├── Table/
│   │   ├── Modal/
│   │   └── index.ts
│   │
│   ├── hooks/                # 共享 Hooks
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   ├── useTenant.ts
│   │   └── index.ts
│   │
│   ├── utils/               # 共享工具
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   │
│   └── types/               # 共享类型（替代 platform/shared/）
│       ├── auth/
│       ├── permission/
│       ├── audit/
│       └── index.ts
│
├── server/                   # 服务端（保持相对稳定）
│   ├── modules/             # 业务模块（统一命名）
│   │   ├── auth/           # 认证模块
│   │   ├── todo/           # Todo 模块
│   │   ├── chat/           # 聊天模块
│   │   ├── order/          # 订单模块
│   │   ├── ticket/         # 工单模块
│   │   ├── content/         # 内容模块
│   │   ├── tenant/         # 租户模块
│   │   └── ...
│   │
│   ├── routes/              # 路由统一入口（新增）
│   │   ├── index.ts        # 导出所有路由
│   │   └── health.ts       # 健康检查
│   │
│   ├── middleware/         # 中间件
│   │   ├── auth.ts
│   │   ├── permission.ts
│   │   ├── audit.ts
│   │   └── cors.ts
│   │
│   ├── db/                 # 数据库
│   │   ├── schema/         # Drizzle schemas
│   │   ├── migrations/     # 迁移文件
│   │   └── seeds/          # 种子数据
│   │
│   └── app.ts              # 主应用入口
│
└── shared/                   # 共享类型定义（保持）
    ├── api/                 # API 请求/响应类型
    ├── schemas/             # Zod schemas
    └── constants/           # 常量
```

### 2.2 命名规范

| 旧名称                   | 新名称                    | 说明         |
| --------------------- | ---------------------- | ---------- |
| `src/client`          | `src/apps/web`         | 用户前台       |
| `src/ops`             | `src/apps/ops`         | 运营后台       |
| `src/tenant`          | `src/apps/tenant`      | 租户管理（如果独立） |
| `src/platform/*`      | `src/packages/*`       | 共享包        |
| `src/server/module-*` | `src/server/modules/*` | 服务端模块      |

### 2.3 使用场景对比

#### 场景 1：添加新页面到运营后台

**重构后**：

1. 在 `src/apps/ops/pages/` 创建页面
2. 使用 `src/packages/hooks/usePermissions.ts` 获取权限
3. 唯一确定的位置，无歧义

#### 场景 2：修改权限服务

**重构后**：

1. 只有一个 `src/server/modules/permission/`
2. 直接修改，无需同步

#### 场景 3：新开发者理解项目

**重构后**：

* `apps/` - 可运行的应用程序

* `packages/` - 被 apps 引用的共享代码

* `server/` - 后端服务

* `shared/` - 类型定义

***

## 三、重构步骤

### Phase 1: 创建新目录结构（不破坏现有代码）

**Step 1.1**: 创建 `src/apps/` 目录结构

```
src/apps/
├── web/          # 复制 src/client
├── ops/          # 复制 src/ops
└── admin/        # 未来可能的管理后台
```

**Step 1.2**: 创建 `src/packages/` 目录结构

```
src/packages/
├── ui/           # 从 platform/ 迁移共享组件
├── hooks/        # 从 platform/ 迁移 hooks
├── utils/        # 新建
└── types/        # 从 platform/shared/ 迁移
```

### Phase 2: 迁移代码

**Step 2.1**: 迁移 `platform/ops/components/` 到 `packages/ui/ops/`

* PermissionGuard

* ProtectedRoute

**Step 2.2**: 迁移 `platform/ops/hooks/` 到 `packages/hooks/`

* usePermissions.ts

* useRoles.ts

* useAuditLogs.ts

**Step 2.3**: 迁移 `platform/shared/` 到 `packages/types/`

**Step 2.4**: 清理 `src/server/` 中的重复模块

* 保留 `src/server/modules/` 统一管理

* 删除 `src/server/module-*`（迁移到 modules/）

### Phase 3: 更新引用

**Step 3.1**: 更新所有 `@platform/*` 导入为 `@packages/*`

**Step 3.2**: 更新所有 `src/client`、`src/ops`、`src/tenant` 导入

**Step 3.3**: 更新 vite.config.ts 中的路径别名

### Phase 4: 清理和验证

**Step 4.1**: 删除旧的重复目录

**Step 4.2**: 运行测试确保功能正常

**Step 4.3**: 运行类型检查

**Step 4.4**: 更新文档

***

## 四、预期效果

### 4.1 结构清晰

| 目录               | 职责   | 示例                      |
| ---------------- | ---- | ----------------------- |
| `apps/web`       | 用户前台 | Todo、通知、聊天              |
| `apps/ops`       | 运营后台 | 用户、订单、工单管理              |
| `packages/ui`    | 共享组件 | Button、Table、Modal      |
| `packages/hooks` | 共享逻辑 | useAuth、usePermissions  |
| `packages/types` | 共享类型 | User、Role、Permission    |
| `server/modules` | 业务逻辑 | TodoService、ChatService |
| `shared`         | 类型定义 | API Schemas             |

### 4.2 消除歧义

* 不再有 `module-ops` vs `ops` 的困惑

* 不再有 `platform/` vs `src/` 的选择困难

* 每一个功能只有一个位置

### 4.3 便于扩展

* 新增一个应用 → 在 `apps/` 下添加

* 新增共享组件 → 在 `packages/` 下添加

* 新增业务模块 → 在 `server/modules/` 下添加

***

## 五、风险和注意事项

| 风险         | 缓解措施                   |
| ---------- | ---------------------- |
| 重构过程中代码不一致 | Phase by Phase 执行，每步验证 |
| 大量文件需要更新导入 | 使用全局搜索替换               |
| 可能引入 bug   | 充分的测试覆盖                |
| 影响开发进度     | 分阶段平滑迁移                |

***

## 六、不纳入本次重构的范围

1. **Monorepo 改造**（需要 pnpm workspaces）
2. **服务端模块拆分微服务**（当前规模不需要）
3. **数据库迁移**（保持现有 schema）
4. **测试框架更换**（当前 Vitest 够用）


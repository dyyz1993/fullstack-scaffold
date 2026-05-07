# 权限管理系统优化方案

## 一、当前架构分析

### 1. 数据库层

| 表名 | 用途 | 文件位置 |
|------|------|----------|
| `permissions` | 权限定义 | [permissions.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/db/schema/permissions.ts) |
| `roles` | 角色定义 | [roles.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/db/schema/roles.ts) |
| `role_permissions` | 角色-权限关联 | [role-permissions.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/db/schema/role-permissions.ts) |
| `user_roles` | 用户-角色关联 | [user-roles.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/db/schema/user-roles.ts) |

### 2. 后端服务层

| 服务 | 用途 | 文件位置 |
|------|------|----------|
| `PermissionService` | 权限数据库操作 | [permission-service-impl.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-permission/services/permission-service-impl.ts) |
| `RoleService` | 角色数据库操作 | [role-service.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-permission/services/role-service.ts) |
| `permission-service.ts` | 静态配置（菜单、页面权限） | [permission-service.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/module-permission/services/permission-service.ts) |

### 3. 中间件层

| 中间件 | 用途 | 文件位置 |
|------|------|----------|
| `authMiddleware` | 认证 + 权限检查 | [auth.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/middleware/auth.ts) |
| `permissionMiddleware` | 路由权限检查 | [permission.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/server/middleware/permission.ts) |

### 4. 前端层

| 组件/Hook | 用途 | 文件位置 |
|------|------|----------|
| `PermissionProvider` | 权限 Context | [usePermissions.tsx](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/admin/hooks/usePermissions.tsx) |
| `PermissionGuard` | 权限守卫组件 | [PermissionGuard.tsx](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/admin/components/PermissionGuard.tsx) |
| `Sidebar` | 菜单渲染（前端过滤） | [Sidebar.tsx](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/admin/layouts/Sidebar.tsx) |
| `useConfig` | 配置获取 Hooks | [useConfig.ts](file:///Users/xuyingzhou/Project/create-biomimic-app/template/src/admin/hooks/useConfig.ts) |

---

## 二、存在的问题

### 问题 1：菜单配置是静态的

**现状**：
```typescript
// permission-service.ts - 菜单配置硬编码
const MENU_CONFIG: MenuItem[] = [
  { path: '/dashboard', label: '仪表盘', icon: 'LayoutDashboard', permissions: [] },
  // ...
]
```

**问题**：
- 菜单配置写死在代码里
- 前端获取的是完整菜单，然后在前端过滤
- 无法动态配置菜单

### 问题 2：权限获取分散

**现状**：
- `usePermissions` 获取用户权限
- `useMenuConfig` 获取菜单配置
- `usePagePermissions` 获取页面权限
- 每个都是独立的请求

**问题**：
- 多次请求，效率低
- 初始化顺序不确定
- 没有统一的权限初始化入口

### 问题 3：前端测试缺失

**现状**：
- ✅ 后端服务层测试
- ✅ 后端中间件测试
- ✅ 后端路由测试
- ❌ 前端权限 Hooks 测试
- ❌ 前端权限组件测试
- ❌ 菜单权限过滤测试

### 问题 4：测试用户硬编码

**现状**：
```typescript
// permission-service-impl.ts
async hasPermission(_userId: string, permissionCode: string): Promise<boolean> {
  if (_userId.startsWith('test-super-admin-') || _userId === 'super-admin-1') {
    return true
  }
  if (_userId.startsWith('test-customer-service-') || _userId === 'customer-service-1') {
    // ...
  }
  // ...
}
```

**问题**：
- 生产代码中包含测试逻辑
- 测试用户应该通过数据库配置

### 问题 5：权限检查不一致

**现状**：
- 后端有两套权限检查：`authMiddleware` 和 `permissionMiddleware`
- 前端菜单过滤是在前端做的
- 菜单配置是静态的，没有服务端过滤

---

## 三、优化方案

### 方案概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户登录                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  服务端返回 JWT Token                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  前端调用统一接口：                                                │
│  GET /api/permissions/init                                       │
│  返回：                                                          │
│  - 用户权限列表                                                   │
│  - 过滤后的菜单配置                                               │
│  - 页面权限配置                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  渲染阶段：                                                       │
│  1. Sidebar 直接渲染服务端返回的菜单                               │
│  2. 页面内按钮使用 Can/PermissionGuard 控制显示                    │
│  3. API 请求由后端中间件二次校验                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、实施步骤

### 阶段一：后端优化

#### 步骤 1.1：新增服务端动态菜单接口

**文件**：`src/server/module-permission/services/permission-service-impl.ts`

**新增方法**：
```typescript
async getUserMenuConfig(userId: string, roleCode?: string): Promise<MenuItem[]>
```

**功能**：
- 根据用户权限过滤菜单
- 处理子菜单权限过滤
- 返回用户可见的菜单配置

#### 步骤 1.2：新增统一权限初始化接口

**文件**：`src/server/module-permission/routes/permission-routes.ts`

**新增路由**：
```typescript
GET /api/permissions/init
```

**返回数据**：
```typescript
{
  permissions: Permission[],      // 用户权限列表
  menuConfig: MenuItem[],         // 过滤后的菜单
  pagePermissions: PagePermissionConfig[],  // 页面权限配置
  role: Role,                     // 用户角色
}
```

#### 步骤 1.3：清理测试用户硬编码

**文件**：`src/server/module-permission/services/permission-service-impl.ts`

**修改**：
- 移除 `hasPermission` 方法中的测试用户硬编码
- 统一通过数据库查询用户权限

---

### 阶段二：前端优化

#### 步骤 2.1：创建统一权限初始化 Hook

**文件**：`src/admin/hooks/usePermissionInit.ts`（新建）

**功能**：
- 调用 `/api/permissions/init` 获取所有权限数据
- 统一管理权限状态
- 提供权限检查方法

#### 步骤 2.2：简化 Sidebar 组件

**文件**：`src/admin/layouts/Sidebar.tsx`

**修改**：
- 移除前端菜单过滤逻辑
- 直接渲染服务端返回的菜单

#### 步骤 2.3：优化 usePermissions Hook

**文件**：`src/admin/hooks/usePermissions.tsx`

**修改**：
- 使用统一初始化接口
- 简化权限获取逻辑

---

### 阶段三：测试补充

#### 步骤 3.1：前端权限 Hooks 测试

**文件**：`src/admin/hooks/__tests__/usePermissions.test.tsx`（新建）

**测试内容**：
- 权限获取
- 权限检查方法
- Context 提供的值

#### 步骤 3.2：前端权限组件测试

**文件**：`src/admin/components/__tests__/PermissionGuard.test.tsx`（新建）

**测试内容**：
- PermissionGuard 渲染逻辑
- Can/Cannot 组件
- fallback 处理

#### 步骤 3.3：菜单权限过滤测试

**文件**：`src/admin/layouts/__tests__/Sidebar.test.tsx`（新建）

**测试内容**：
- 菜单渲染
- 权限过滤

#### 步骤 3.4：后端新接口测试

**文件**：`src/server/module-permission/__tests__/permission-routes.test.ts`

**新增测试**：
- `/api/permissions/init` 接口测试
- `/api/permissions/my-menu` 接口测试

---

## 五、文件变更清单

### 新建文件

| 文件路径 | 用途 |
|----------|------|
| `src/admin/hooks/usePermissionInit.ts` | 统一权限初始化 Hook |
| `src/admin/hooks/__tests__/usePermissions.test.tsx` | 权限 Hooks 测试 |
| `src/admin/components/__tests__/PermissionGuard.test.tsx` | 权限组件测试 |
| `src/admin/layouts/__tests__/Sidebar.test.tsx` | 菜单测试 |

### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/server/module-permission/services/permission-service-impl.ts` | 新增 `getUserMenuConfig` 方法，清理硬编码 |
| `src/server/module-permission/routes/permission-routes.ts` | 新增 `/api/permissions/init` 和 `/api/permissions/my-menu` 路由 |
| `src/admin/hooks/usePermissions.tsx` | 使用统一初始化接口 |
| `src/admin/layouts/Sidebar.tsx` | 简化菜单渲染逻辑 |
| `src/admin/hooks/useConfig.ts` | 简化配置获取 |
| `src/server/module-permission/__tests__/permission-routes.test.ts` | 新增接口测试 |

---

## 六、API 变更

### 新增接口

#### 1. GET /api/permissions/init

**描述**：统一权限初始化接口

**认证**：需要

**返回**：
```json
{
  "success": true,
  "data": {
    "permissions": ["user:view", "user:edit"],
    "menuConfig": [
      { "path": "/dashboard", "label": "仪表盘", "icon": "LayoutDashboard", "permissions": [] },
      { "path": "/users", "label": "用户管理", "icon": "Users", "permissions": ["user:view"] }
    ],
    "pagePermissions": [...],
    "role": "customer_service"
  }
}
```

#### 2. GET /api/permissions/my-menu

**描述**：获取当前用户的菜单配置（已过滤）

**认证**：需要

**返回**：
```json
{
  "success": true,
  "data": [
    { "path": "/dashboard", "label": "仪表盘", "icon": "LayoutDashboard", "permissions": [] },
    { "path": "/users", "label": "用户管理", "icon": "Users", "permissions": ["user:view"] }
  ]
}
```

---

## 七、预期效果

### 优化前

```
前端请求流程：
1. GET /api/permissions/me        → 获取用户权限
2. GET /api/permissions/menu-config → 获取完整菜单（静态）
3. GET /api/permissions/page-permissions → 获取页面权限
4. 前端过滤菜单（基于权限）
```

### 优化后

```
前端请求流程：
1. GET /api/permissions/init → 一次性获取所有权限数据
2. 直接渲染服务端返回的菜单（已过滤）
```

### 优势

1. **减少请求次数**：从 3 次请求减少到 1 次
2. **服务端权限控制**：菜单过滤在服务端完成，更安全
3. **统一初始化**：权限数据一次性获取，避免竞态条件
4. **测试完善**：前后端测试覆盖完整
5. **代码清理**：移除硬编码的测试用户逻辑

---

## 八、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 接口变更影响现有功能 | 中 | 保留旧接口，新增接口，渐进迁移 |
| 测试覆盖不足 | 低 | 先补充测试，再修改代码 |
| 性能影响 | 低 | 新接口可缓存，减少数据库查询 |

---

## 九、实施顺序

1. **第一步**：后端新增接口（不影响现有功能）
2. **第二步**：补充前端测试
3. **第三步**：前端使用新接口
4. **第四步**：清理旧代码和硬编码
5. **第五步**：验证和回归测试

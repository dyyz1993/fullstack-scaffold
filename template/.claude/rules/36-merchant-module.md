# Merchant 模块开发规范

## 🎯 核心原则

Merchant 模块是一个**独立的商户管理后台**，与主应用 (client) 和管理后台 (admin) 完全分离，有自己的入口、布局和路由。

**重要**: Merchant 模块位于 `src/merchant/`，与 `src/client/`（用户前台）和 `src/admin/`（管理后台）平级，实现三端完全隔离。

**技术栈**: Merchant 模块使用 **Ant Design** 作为 UI 组件库。

## 📁 目录结构

```
src/merchant/
├── components/                 # 商户专用组件
│   ├── MerchantGuard.tsx       # 认证守卫
│   ├── ProductCard.tsx         # 产品卡片
│   ├── OrderTable.tsx          # 订单表格
│   └── index.ts                # 统一导出
│
├── layouts/                    # 布局组件
│   ├── Layout.tsx              # 主布局
│   ├── Sidebar.tsx             # 侧边栏
│   └── Header.tsx              # 顶部导航
│
├── pages/                      # 商户页面
│   ├── LoginPage.tsx           # 登录页
│   ├── DashboardPage.tsx       # 仪表盘（首页）
│   ├── ProductsPage.tsx        # 产品管理
│   ├── OrdersPage.tsx          # 订单管理
│   ├── DisputesPage.tsx        # 争议管理
│   └── SettingsPage.tsx        # 店铺设置
│
├── stores/                     # 状态管理
│   └── merchantStore.ts        # 商户状态（Zustand）
│
├── App.tsx                     # 入口（路由配置）
└── main.tsx                    # 启动文件
```

## 🏗️ 三入口架构

| 入口     | 文件                    | HTML            | 访问路径      | 用途     |
| -------- | ----------------------- | --------------- | ------------- | -------- |
| 用户前台 | `src/client/main.tsx`   | `index.html`    | `/`           | 用户前台 |
| 管理后台 | `src/admin/main.tsx`    | `admin.html`    | `/admin/*`    | 管理后台 |
| 商户后台 | `src/merchant/main.tsx` | `merchant.html` | `/merchant/*` | 商户后台 |

## 🎨 UI 组件库

Merchant 模块使用 **Ant Design** 组件库（与管理后台一致）。

## 🔐 认证流程

### MerchantGuard

所有受保护路由被 `MerchantGuard` 包裹，未认证用户重定向到 `/merchant/login`。

```typescript
// src/merchant/components/MerchantGuard.tsx
if (!isAuthenticated || !merchant) {
  return <Navigate to="/login" replace />
}
```

### 登录流程

```
用户访问 /merchant/*
  → MerchantGuard 检查 isAuthenticated
  → 未认证 → 重定向到 /merchant/login
  → LoginPage 调用 useMerchantStore.login()
  → login() 通过 apiClient.api.merchant.login.$post() 发起请求
  → 成功后 navigate('/dashboard')
```

## 📡 API 调用规范

### 禁止直接使用 fetch

```typescript
// ❌ 禁止 - 直接使用 fetch
const response = await fetch('/api/merchant/products')

// ✅ 正确 - 使用 apiClient
import { apiClient } from '@client/services/apiClient'

// @ts-expect-error - Hono type inference depth limit in full template
const response = await apiClient.api.merchant.products.$get()
const result = await response.json()
if (result.success === true && result.data) { ... }
```

### Store 模式

商户页面应通过 `useMerchantStore` 进行状态管理和 API 调用，保持数据流一致。

## 🚫 禁止事项

### 1. 禁止混用其他端组件

```typescript
// ❌ 错误 - Merchant 使用用户前台组件
import { Navigation } from '@client/components/Navigation'

// ❌ 错误 - Merchant 使用管理后台组件
import { AdminSidebar } from '@admin/layouts/Sidebar'

// ✅ 正确 - Merchant 使用自己的组件
import { Sidebar } from './layouts/Sidebar'
```

### 2. 禁止共享状态

```typescript
// ❌ 错误 - 使用用户前台 Store
import { useTodoStore } from '@client/stores/todoStore'

// ❌ 错误 - 使用管理后台 Store
import { useAdminStore } from '@admin/stores/adminStore'

// ✅ 正确 - 使用商户自己的 Store
import { useMerchantStore } from './stores/merchantStore'
```

### 3. 禁止在 App.tsx 中定义布局

```typescript
// ❌ 错误 - App.tsx 包含布局逻辑
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex h-screen">
        <Sidebar />
        <main>
          <Routes>...</Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

// ✅ 正确 - App.tsx 只负责路由
export const App: React.FC = () => {
  return (
    <BrowserRouter basename="/merchant">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <MerchantGuard>
              <Layout>
                <Routes>...</Routes>
              </Layout>
            </MerchantGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
```

## 📚 相关文档

- [Client Service 规范](./31-client-services.md) - API 客户端使用规范
- [Admin 模块规范](./40-admin-module.md) - 管理后台规范（类似架构参考）
- [Shared Types 规范](./40-shared-types.md) - 共享类型定义

# 模块化路由类型系统设计方案（最终实施版）

## 一、核心改动

### 改动点 1：使用 `basePath('/api')`

在 `app.ts``routes.ts` 中使用 `basePath('/api')` 替代每个路由都写 `/api`：

```typescript
// 改动前
app
  .route('/api', todosRoutes)
  .route('/api', usersRoutes)
  .route('/api', ordersRoutes)

// 改动后
app
  .basePath('/api')
  .route('/todos', todosRoutes)
  .route('/users', usersRoutes)
  .route('/orders', ordersRoutes)
```

```typescript
// 改动前
app
  .route('/api', todosRoutes)
  .route('/api', usersRoutes)
  .route('/api', ordersRoutes)

// 改动后
const routes = new OpenAPIHono()
  .basePath('/api')
  .route('/todos', todosRoutes)
  .route('/users', usersRoutes)
  .route('/orders', ordersRoutes)
```

### 改动点 2：导出 `Routes` 类型

从 `routes.ts` 或 `app.ts` 导出类型给客户端使用：

```typescript
// 导出类型
export type Routes = ReturnType<typeof createRoutes>
```

```typescript
export type Routes = typeof routes
```

***

## 二、实施步骤

### 步骤 1：创建 `src/server/routes.ts`

将路由挂载逻辑从 `app.ts` 提取到 `routes.ts`：

```typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { apiRoutes } from './module-todos/routes/todos-routes'
import { permissionRoutes } from './module-permission/routes/permission-routes'
import { roleRoutes } from './module-permission/routes/role-routes'
// ... 其他导入

export function createRoutes() {
  return new OpenAPIHono()
    .basePath('/api')
    .route('/todos', apiRoutes)
    .route('/permissions', permissionRoutes)
    .route('/roles', roleRoutes)
    // ... 其他路由
}

export type Routes = ReturnType<typeof createRoutes>
export const routes = createRoutes()
```

```typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { apiRoutes } from './module-todos/routes/todos-routes'
import { permissionRoutes } from './module-permission/routes/permission-routes'
import { roleRoutes } from './module-permission/routes/role-routes'
import { auditLogRoutes } from './module-permission/routes/audit-log-routes'
import { notificationRoutes } from './module-notifications/routes/notification-routes'
import { chatRoutes } from './module-chat/routes/chat-routes'
import { adminRoutes } from './module-admin/routes/admin-routes'
import { captchaRoutes } from './module-captcha/routes/captcha-routes'
import { orderRoutes } from './module-order/routes/order-routes'
import { ticketRoutes } from './module-ticket/routes/ticket-routes'
import { disputeRoutes } from './module-dispute/routes/dispute-routes'
import { contentRoutes } from './module-content/routes/content-routes'
import { fileRoutes } from './module-file/routes/file-routes'

export const routes = new OpenAPIHono()
  .basePath('/api')
  .route('/todos', apiRoutes)
  .route('/permissions', permissionRoutes)
  .route('/roles', roleRoutes)
  .route('/audit-logs', auditLogRoutes)
  .route('/notifications', notificationRoutes)
  .route('/chat', chatRoutes)
  .route('/admin', adminRoutes)
  .route('/captcha', captchaRoutes)
  .route('/orders', orderRoutes)
  .route('/tickets', ticketRoutes)
  .route('/disputes', disputeRoutes)
  .route('/content', contentRoutes)
  .route('/files', fileRoutes)

export type Routes = typeof routes
```

### 步骤 2：更新 `app.ts`

使用 `routes.ts` 导出的路由：

```typescript
import { routes } from './routes'

export function createApp() {
  const app = new OpenAPIHono()
    .use('*', middleware)
    .route('/', routes)  // 挂载路由
    .onError(globalErrorHandler)
  
  return app
}
```

```typescript
import { routes } from './routes'

export function createApp() {
  const app = new OpenAPIHono()
    .use('*', errorHandlerMiddleware())
    .use('*', loggerMiddleware())
    .use('*', corsMiddleware())
    .use('*', realtimeEnvMiddleware())
    .use('/api/*', auditLogMiddleware())
    .use('/api/admin/*', captchaMiddleware({ maxRequests: 20, windowMs: 60000 }))
    .route('/', routes)  // 挂载路由
    .get('/health', c => c.json({ status: 'ok' }))
    .onError(globalErrorHandler)

  return app
}

export type AppType = ReturnType<typeof createApp>
```

### 步骤 3：更新客户端

导入 `Routes` 类型：

```typescript
import type { Routes } from '@server/routes'
export const apiClient = hc<Routes>(baseUrl)

// 使用
apiClient.todos.$get()  // GET /api/todos ✅
```

```typescript
import type { Routes } from '@server/routes'
export const apiClient = hc<Routes>(baseUrl)

// 使用（需要 api 层级）
apiClient.api.todos.$get()         // GET /api/todos ✅
apiClient.api.users[':id'].$get()  // GET /api/users/:id ✅
```

***

## 三、预期效果

### 服务端

```typescript
// routes.ts - 一个文件管理所有路由
export const routes = new OpenAPIHono()
  .basePath('/api')
  .route('/todos', todosRoutes)
  .route('/users', usersRoutes)
  // ...

export type Routes = typeof routes
```

### 客户端

```typescript
// apiClient.ts - 直接导入类型
import type { Routes } from '@server/routes'
export const apiClient = hc<Routes>(baseUrl)

// 使用（需要 api 层级）
apiClient.api.todos.$get()         // GET /api/todos ✅
apiClient.api.users[':id'].$get()  // GET /api/users/:id ✅
```

***

## 四、优势

1. **路径简化**：服务端不需要在每个路由都写 `/api`
2. **类型简化类型集中**：客户端直接导入 `Routes` 类型从单独文件导出，缓解嵌套过深问题
3. **调用简化**：客户端调用时不需要 `api` 层级
4. **易于维护**：新增模块只需在 `routes.ts` 添加一行

```typescript
// 客户端使用
apiClient.todos.$get()         // GET /api/todos ✅
apiClient.users[':id'].$get()  // GET /api/users/:id ✅
```

